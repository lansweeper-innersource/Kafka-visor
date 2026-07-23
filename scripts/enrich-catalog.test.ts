import { describe, it, expect } from 'vitest'
import { parseCatalogYaml, enrichWithCatalog } from './enrich-catalog'
import type { Service, TopologyData } from '../src/types'

const SAMPLE_CATALOG = `---
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: syncer-status-api
  description: syncer-status-api
spec:
  type: service
  lifecycle: stable
  owner: cloud-data-pipeline-and-scanning
  system: syncer-status
  providesApis:
    - syncer-status-api.syncer-status_80
  consumesApis:
    - lec-multitenant-api.multitenant_50051
  dependsOn:
    - resource:public.edge.install-status.event
---
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: syncer-status-api.syncer-status_80
  description: syncer-status-api.syncer-status_80
spec:
  type: grpc
  lifecycle: stable
  owner: cloud-data-pipeline-and-scanning
  system: syncer-status
  definition: '{}'
`

function makeService(overrides: Partial<Service> & Pick<Service, 'id'>): Service {
  return {
    team: 'cloud-data-pipeline-and-scanning',
    repository: 'edge-deployments',
    namespace: 'syncer-status',
    produces: [],
    consumes: [],
    runningInCluster: true,
    deploymentType: 'Deployment',
    ...overrides,
  }
}

function makeTopology(services: Service[]): TopologyData {
  return {
    teams: {},
    topics: {},
    services: Object.fromEntries(services.map(s => [s.id, s])),
    metadata: { dataCollectionDate: '', totalTopics: 0, totalServices: services.length, totalTeams: 0 },
  }
}

describe('parseCatalogYaml', () => {
  it('parses every document in a multi-doc catalog file', () => {
    const docs = parseCatalogYaml(SAMPLE_CATALOG)
    expect(docs.map(d => d.kind)).toEqual(['Component', 'API'])
  })

  it('ignores empty documents', () => {
    expect(parseCatalogYaml('---\n---\n')).toEqual([])
  })
})

describe('enrichWithCatalog', () => {
  it('populates providesApis and consumesApis by joining Component.name to Service.id', () => {
    const topology = makeTopology([makeService({ id: 'syncer-status-api' })])
    const { topology: enriched, matched } = enrichWithCatalog(topology, parseCatalogYaml(SAMPLE_CATALOG))

    expect(matched).toBe(1)
    expect(enriched.services['syncer-status-api'].providesApis).toEqual(['syncer-status-api.syncer-status_80'])
    expect(enriched.services['syncer-status-api'].consumesApis).toEqual(['lec-multitenant-api.multitenant_50051'])
  })

  it('does not overwrite manually curated fields', () => {
    const curated = makeService({
      id: 'syncer-status-api',
      produces: ['public.edge.install-status.event'],
      consumes: [],
      databases: ['redis-shared'],
      grpcCalls: ['some-grpc-target'],
      redisPubSub: ['install-status-subscriptions'],
    })
    const topology = makeTopology([curated])
    const { topology: enriched } = enrichWithCatalog(topology, parseCatalogYaml(SAMPLE_CATALOG))

    const svc = enriched.services['syncer-status-api']
    expect(svc.produces).toEqual(['public.edge.install-status.event'])
    expect(svc.consumes).toEqual([])
    expect(svc.databases).toEqual(['redis-shared'])
    expect(svc.grpcCalls).toEqual(['some-grpc-target'])
    expect(svc.redisPubSub).toEqual(['install-status-subscriptions'])
  })

  it('skips catalog components with no matching service', () => {
    const topology = makeTopology([makeService({ id: 'unrelated-service' })])
    const { matched } = enrichWithCatalog(topology, parseCatalogYaml(SAMPLE_CATALOG))
    expect(matched).toBe(0)
    expect(topology.services['unrelated-service'].providesApis).toBeUndefined()
  })

  it('reports owner discrepancies without mutating the service team', () => {
    const topology = makeTopology([makeService({ id: 'syncer-status-api', team: 'wrong-team' })])
    const { discrepancies, topology: enriched } = enrichWithCatalog(topology, parseCatalogYaml(SAMPLE_CATALOG))

    expect(enriched.services['syncer-status-api'].team).toBe('wrong-team')
    expect(discrepancies).toEqual([
      { service: 'syncer-status-api', field: 'owner', catalog: 'cloud-data-pipeline-and-scanning', topology: 'wrong-team' },
    ])
  })
})
