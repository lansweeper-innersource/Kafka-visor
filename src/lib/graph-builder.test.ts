import { describe, it, expect } from 'vitest'
import { buildGraph, filterByTeams, getNeighborIds, getBlastRadius } from './graph-builder'
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

  it('creates api edges by resolving consumesApis to the providing service', () => {
    const apiEdges = edges.filter(e => e.data?.type === 'api')
    expect(apiEdges).toHaveLength(1)
    expect(apiEdges[0].source).toBe('service:svc-alpha')
    expect(apiEdges[0].target).toBe('service:svc-beta')
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

  it('returns empty for non-existent service', () => {
    const result = getBlastRadius('nonexistent', mockTopology)
    expect(result.affectedServices).toHaveLength(0)
    expect(result.sharedTopics).toHaveLength(0)
  })
})
