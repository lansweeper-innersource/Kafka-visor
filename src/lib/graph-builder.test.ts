import { describe, it, expect } from 'vitest'
import { buildGraph, filterByTeams, getNeighborIds, getBlastRadius, getApiCallers } from './graph-builder'
import type { TopologyData } from '../types'

const mockTopology: TopologyData = {
  teams: {
    'team-a': { name: 'team-a', color: '#3B82F6', fullName: '@Lansweeper/team-a' },
    'team-b': { name: 'team-b', color: '#8B5CF6', fullName: '@Lansweeper/team-b' },
  },
  topics: {
    'public.event.foo': {
      id: 'public.event.foo',
      consumers: ['svc-alpha'],
      producers: ['svc-beta'],
      consumerCount: 1,
      producerCount: 1,
      teamCount: 2,
    },
    'public.event.bar': {
      id: 'public.event.bar',
      consumers: ['svc-beta'],
      producers: ['svc-alpha'],
      consumerCount: 1,
      producerCount: 1,
      teamCount: 1,
    },
  },
  services: {
    'svc-alpha': {
      id: 'svc-alpha',
      team: 'team-a',
      repository: 'alpha-repo',
      namespace: 'alpha-ns',
      produces: ['public.event.bar'],
      consumes: ['public.event.foo'],
      runningInCluster: true,
      deploymentType: 'Deployment',
      // consumes svc-beta's API (resolvable) plus an external one (unresolved)
      consumesApis: ['svc-beta.beta-ns_50051', 'external-svc.other_8080'],
    },
    'svc-beta': {
      id: 'svc-beta',
      team: 'team-b',
      repository: 'beta-repo',
      namespace: 'beta-ns',
      produces: ['public.event.foo'],
      consumes: ['public.event.bar'],
      runningInCluster: false,
      deploymentType: 'Unknown',
      providesApis: ['svc-beta.beta-ns_50051'],
      // svc-alpha exposes no providesApis, so this only resolves via the prefix fallback
      consumesApis: ['svc-alpha.alpha-ns_9999'],
    },
  },
  metadata: {
    dataCollectionDate: '2026-04-19',
    totalTopics: 2,
    totalServices: 2,
    totalTeams: 2,
  },
}

describe('buildGraph', () => {
  const { nodes, edges } = buildGraph(mockTopology)

  it('creates topic nodes for each topic', () => {
    const topicNodes = nodes.filter(n => n.type === 'topic')
    expect(topicNodes).toHaveLength(2)
    expect(topicNodes.map(n => n.id)).toContain('topic:public.event.foo')
  })

  it('creates service nodes for each service', () => {
    const serviceNodes = nodes.filter(n => n.type === 'service')
    expect(serviceNodes).toHaveLength(2)
    expect(serviceNodes.map(n => n.id)).toContain('service:svc-alpha')
  })

  it('creates producer edges (service -> topic)', () => {
    const producerEdges = edges.filter(e => e.data?.type === 'producer')
    expect(producerEdges.length).toBe(2)

    const betaToFoo = producerEdges.find(
      e => e.source === 'service:svc-beta' && e.target === 'topic:public.event.foo'
    )
    expect(betaToFoo).toBeDefined()
  })

  it('creates consumer edges (topic -> service)', () => {
    const consumerEdges = edges.filter(e => e.data?.type === 'consumer')
    expect(consumerEdges.length).toBe(2)

    const fooToAlpha = consumerEdges.find(
      e => e.source === 'topic:public.event.foo' && e.target === 'service:svc-alpha'
    )
    expect(fooToAlpha).toBeDefined()
  })

  it('topic nodes have correct data', () => {
    const foo = nodes.find(n => n.id === 'topic:public.event.foo')
    expect(foo?.data.label).toBe('public.event.foo')
    expect(foo?.data.consumerCount).toBe(1)
    expect(foo?.data.producerCount).toBe(1)
  })

  it('service nodes have correct data', () => {
    const alpha = nodes.find(n => n.id === 'service:svc-alpha')
    expect(alpha?.data.label).toBe('svc-alpha')
    expect(alpha?.data.team).toBe('team-a')
    expect(alpha?.data.teamColor).toBe('#3B82F6')
  })

  it('creates an api edge from an exact providesApi match', () => {
    const apiEdges = edges.filter(e => e.data?.type === 'api')
    const exact = apiEdges.find(e => e.source === 'service:svc-alpha' && e.target === 'service:svc-beta')
    expect(exact).toBeDefined()
  })

  it('resolves the provider by prefix fallback when no exact providesApi matches', () => {
    const apiEdges = edges.filter(e => e.data?.type === 'api')
    // svc-beta consumes 'svc-alpha.alpha-ns_9999'; svc-alpha has no providesApis,
    // so this only resolves via the prefix→service-id fallback
    const fallback = apiEdges.find(e => e.source === 'service:svc-beta' && e.target === 'service:svc-alpha')
    expect(fallback).toBeDefined()
  })

  it('does not create api edges for unresolved consumesApis', () => {
    const apiEdges = edges.filter(e => e.data?.type === 'api')
    // external-svc.other_8080 has no provider in topology → no edge
    expect(apiEdges.some(e => e.target.includes('external'))).toBe(false)
  })
})

describe('filterByTeams', () => {
  it('returns only nodes and edges for selected teams plus connected topics', () => {
    const { nodes, edges } = buildGraph(mockTopology)
    const filtered = filterByTeams(nodes, edges, new Set(['team-a']))

    const visibleServiceNodes = filtered.nodes.filter(n => n.type === 'service' && !n.hidden)
    expect(visibleServiceNodes).toHaveLength(1)
    expect(visibleServiceNodes[0].id).toBe('service:svc-alpha')
  })

  it('hides services from unselected teams', () => {
    const { nodes, edges } = buildGraph(mockTopology)
    const filtered = filterByTeams(nodes, edges, new Set(['team-a']))

    const beta = filtered.nodes.find(n => n.id === 'service:svc-beta')
    expect(beta?.hidden).toBe(true)
  })

  it('shows topics connected to visible services', () => {
    const { nodes, edges } = buildGraph(mockTopology)
    const filtered = filterByTeams(nodes, edges, new Set(['team-a']))

    const topicNodes = filtered.nodes.filter(n => n.type === 'topic' && !n.hidden)
    expect(topicNodes.length).toBeGreaterThan(0)
  })

  it('with empty teams set, hides all service nodes', () => {
    const { nodes, edges } = buildGraph(mockTopology)
    const filtered = filterByTeams(nodes, edges, new Set())

    const visibleServices = filtered.nodes.filter(n => n.type === 'service' && !n.hidden)
    expect(visibleServices).toHaveLength(0)
  })
})

describe('getNeighborIds', () => {
  const { edges } = buildGraph(mockTopology)

  it('finds neighbors of a topic node', () => {
    const neighbors = getNeighborIds('topic:public.event.foo', edges)
    expect(neighbors.has('service:svc-alpha')).toBe(true) // consumer
    expect(neighbors.has('service:svc-beta')).toBe(true)  // producer
  })

  it('finds neighbors of a service node', () => {
    const neighbors = getNeighborIds('service:svc-alpha', edges)
    expect(neighbors.has('topic:public.event.foo')).toBe(true) // consumes
    expect(neighbors.has('topic:public.event.bar')).toBe(true) // produces
  })
})

describe('getBlastRadius', () => {
  it('returns all services affected by a service through shared topics', () => {
    const result = getBlastRadius('svc-alpha', mockTopology)
    // svc-alpha touches foo (consumer) and bar (producer)
    // foo has svc-beta as producer, bar has svc-beta as consumer
    expect(result.affectedServices).toContain('svc-beta')
    expect(result.affectedServices).not.toContain('svc-alpha')
    expect(result.sharedTopics).toHaveLength(2)
  })

  it('includes synchronous API call peers in the blast radius', () => {
    const result = getBlastRadius('svc-alpha', mockTopology)
    // svc-alpha consumes svc-beta's API (outbound); svc-beta consumes svc-alpha's (inbound)
    expect(result.apiConnections).toContain('svc-beta')
    expect(result.affectedServices).toContain('svc-beta')
    expect(result.apiCallers).toEqual(['svc-beta'])
  })

  it('returns empty for non-existent service', () => {
    const result = getBlastRadius('nonexistent', mockTopology)
    expect(result.affectedServices).toHaveLength(0)
    expect(result.sharedTopics).toHaveLength(0)
    expect(result.apiCallers).toHaveLength(0)
  })

  it('uses an explicitly-provided index instead of rebuilding one', () => {
    // A hand-built index resolving a different consumesApis string than the
    // topology's own providesApis would, proving the arg is actually consulted.
    const customIndex = new Map([['svc-alpha.alpha-ns_9999', 'svc-beta']])
    const result = getBlastRadius('svc-beta', mockTopology, customIndex)
    expect(result.apiCallers).toContain('svc-alpha')
  })
})

describe('getApiCallers', () => {
  it('lists services that call the given service (exact and fallback resolution)', () => {
    // svc-alpha is called by svc-beta (via prefix fallback)
    expect(getApiCallers('svc-alpha', mockTopology)).toEqual(['svc-beta'])
    // svc-beta is called by svc-alpha (via exact providesApi match)
    expect(getApiCallers('svc-beta', mockTopology)).toEqual(['svc-alpha'])
  })

  it('returns empty for an unknown service id', () => {
    expect(getApiCallers('nonexistent', mockTopology)).toEqual([])
  })

  it('returns empty for a real service that nobody calls', () => {
    const topology: TopologyData = {
      ...mockTopology,
      services: {
        ...mockTopology.services,
        'svc-gamma': {
          id: 'svc-gamma',
          team: 'team-a',
          repository: 'gamma-repo',
          namespace: 'gamma-ns',
          produces: [],
          consumes: [],
          runningInCluster: true,
          deploymentType: 'Deployment',
        },
      },
    }
    expect(getApiCallers('svc-gamma', topology)).toEqual([])
  })

  it('lists a caller only once even when it calls via multiple consumesApis entries', () => {
    const topology: TopologyData = {
      ...mockTopology,
      services: {
        ...mockTopology.services,
        'svc-beta': {
          ...mockTopology.services['svc-beta'],
          // both entries resolve to svc-alpha via the prefix fallback
          consumesApis: ['svc-alpha.alpha-ns_9999', 'svc-alpha.alpha-ns_other'],
        },
      },
    }
    expect(getApiCallers('svc-alpha', topology)).toEqual(['svc-beta'])
  })

  it('aggregates multiple distinct callers of the same service', () => {
    const topology: TopologyData = {
      ...mockTopology,
      services: {
        ...mockTopology.services,
        'svc-gamma': {
          id: 'svc-gamma',
          team: 'team-a',
          repository: 'gamma-repo',
          namespace: 'gamma-ns',
          produces: [],
          consumes: [],
          runningInCluster: true,
          deploymentType: 'Deployment',
          consumesApis: ['svc-beta.beta-ns_50051'],
        },
      },
    }
    expect(getApiCallers('svc-beta', topology)).toEqual(['svc-alpha', 'svc-gamma'])
  })

  it('excludes a service that lists itself as a caller of its own API', () => {
    const topology: TopologyData = {
      ...mockTopology,
      services: {
        ...mockTopology.services,
        // strip svc-alpha's unrelated consumesApis so it can't count as a real caller
        'svc-alpha': { ...mockTopology.services['svc-alpha'], consumesApis: [] },
        'svc-beta': {
          ...mockTopology.services['svc-beta'],
          consumesApis: ['svc-beta.beta-ns_50051'],
        },
      },
    }
    expect(getApiCallers('svc-beta', topology)).toEqual([])
  })
})
