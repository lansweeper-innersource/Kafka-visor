import type { Node, Edge } from '@xyflow/react'
import type { TopologyData } from '../types'

export interface TopicNodeData {
  label: string
  consumerCount: number
  producerCount: number
  teamCount: number
  [key: string]: unknown
}

export interface ServiceNodeData {
  label: string
  team: string
  teamColor: string
  repository: string
  namespace: string
  runningInCluster: boolean
  deploymentType: string
  produces: string[]
  consumes: string[]
  githubUrl?: string
  sourceRepos?: { name: string; url: string }[]
  grpcCalls?: string[]
  redisPubSub?: string[]
  providesApis?: string[]
  consumesApis?: string[]
  databases?: string[]
  description?: string
  serviceGroup?: string
  sourceSiblings?: string[]
  sourceRepoName?: string
  [key: string]: unknown
}

export interface EdgeData {
  type: 'producer' | 'consumer' | 'api'
  [key: string]: unknown
}

/** Index every providesApi string to the service that exposes it. */
export function buildApiProviderIndex(topology: TopologyData): Map<string, string> {
  const index = new Map<string, string>()
  for (const service of Object.values(topology.services)) {
    for (const api of service.providesApis ?? []) {
      index.set(api, service.id)
    }
  }
  return index
}

/**
 * Resolve a consumesApis entry (`serviceName.namespace_port`) to the providing
 * service id. Prefers an exact providesApi match; falls back to the bare service
 * name (the part before the first dot) when it is itself a known service id — this
 * recovers providers whose Kubernetes Service was never captured in the catalog.
 */
export function resolveApiProvider(
  api: string,
  index: Map<string, string>,
  topology: TopologyData
): string | undefined {
  const exact = index.get(api)
  if (exact) return exact
  const serviceName = api.split('.')[0]
  return topology.services[serviceName] ? serviceName : undefined
}

/** Services that call the given service via a resolved consumesApis dependency. */
export function getApiCallers(
  serviceId: string,
  topology: TopologyData,
  index: Map<string, string> = buildApiProviderIndex(topology)
): string[] {
  if (!topology.services[serviceId]) return []
  const callers: string[] = []
  for (const other of Object.values(topology.services)) {
    if (other.id === serviceId) continue
    for (const api of other.consumesApis ?? []) {
      if (resolveApiProvider(api, index, topology) === serviceId) {
        callers.push(other.id)
        break
      }
    }
  }
  return callers
}

export function buildGraph(topology: TopologyData): {
  nodes: Node[]
  edges: Edge[]
} {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Create topic nodes
  for (const topic of Object.values(topology.topics)) {
    nodes.push({
      id: `topic:${topic.id}`,
      type: 'topic',
      position: { x: 0, y: 0 },
      data: {
        label: topic.id,
        consumerCount: topic.consumerCount,
        producerCount: topic.producerCount,
        teamCount: topic.teamCount,
      } satisfies TopicNodeData,
    })
  }

  // Build source repo → sibling map (services sharing the same source code)
  const sourceToServices = new Map<string, string[]>()
  for (const service of Object.values(topology.services)) {
    for (const sr of service.sourceRepos ?? []) {
      const list = sourceToServices.get(sr.name) ?? []
      list.push(service.id)
      sourceToServices.set(sr.name, list)
    }
  }

  // Create service nodes
  for (const service of Object.values(topology.services)) {
    const team = topology.teams[service.team]
    const primarySource = service.sourceRepos?.[0]?.name
    const siblings = primarySource
      ? (sourceToServices.get(primarySource) ?? []).filter(id => id !== service.id)
      : []
    nodes.push({
      id: `service:${service.id}`,
      type: 'service',
      position: { x: 0, y: 0 },
      data: {
        label: service.id,
        team: service.team,
        teamColor: team?.color ?? '#6B7280',
        repository: service.repository,
        namespace: service.namespace,
        runningInCluster: service.runningInCluster,
        deploymentType: service.deploymentType,
        produces: service.produces,
        consumes: service.consumes,
        githubUrl: service.githubUrl,
        sourceRepos: service.sourceRepos,
        grpcCalls: service.grpcCalls,
        redisPubSub: service.redisPubSub,
        providesApis: service.providesApis,
        consumesApis: service.consumesApis,
        databases: service.databases,
        description: service.description,
        serviceGroup: service.serviceGroup,
        sourceSiblings: siblings,
        sourceRepoName: primarySource,
      } satisfies ServiceNodeData,
    })
  }

  // Create edges
  for (const topic of Object.values(topology.topics)) {
    // Producer edges: service -> topic
    for (const producerId of topic.producers) {
      edges.push({
        id: `producer:${producerId}:${topic.id}`,
        source: `service:${producerId}`,
        target: `topic:${topic.id}`,
        data: { type: 'producer' } satisfies EdgeData,
      })
    }

    // Consumer edges: topic -> service
    for (const consumerId of topic.consumers) {
      edges.push({
        id: `consumer:${topic.id}:${consumerId}`,
        source: `topic:${topic.id}`,
        target: `service:${consumerId}`,
        data: { type: 'consumer' } satisfies EdgeData,
      })
    }
  }

  // Synchronous service→service API edges: resolve each consumesApis entry to the
  // service that providesApis it (dev-portal catalog call graph). Deduped; self and
  // unresolved calls are skipped.
  const apiProvider = buildApiProviderIndex(topology)
  const seenApiEdges = new Set<string>()
  for (const service of Object.values(topology.services)) {
    for (const api of service.consumesApis ?? []) {
      const providerId = resolveApiProvider(api, apiProvider, topology)
      if (!providerId || providerId === service.id) continue
      const key = `${service.id}->${providerId}`
      if (seenApiEdges.has(key)) continue
      seenApiEdges.add(key)
      edges.push({
        id: `api:${service.id}:${providerId}`,
        source: `service:${service.id}`,
        target: `service:${providerId}`,
        data: { type: 'api' } satisfies EdgeData,
      })
    }
  }

  return { nodes, edges }
}

/** Returns the set of node IDs directly connected to the given node via edges */
export function getNeighborIds(nodeId: string, edges: Edge[]): Set<string> {
  const neighbors = new Set<string>()
  for (const edge of edges) {
    if (edge.source === nodeId) neighbors.add(edge.target)
    if (edge.target === nodeId) neighbors.add(edge.source)
  }
  return neighbors
}

/**
 * Blast radius: every service reachable from the given one, both through shared
 * Kafka topics and through synchronous API calls (services it calls and services
 * that call it).
 */
export function getBlastRadius(
  serviceId: string,
  topology: TopologyData,
  index: Map<string, string> = buildApiProviderIndex(topology)
): {
  affectedServices: string[]
  sharedTopics: string[]
  apiConnections: string[]
  apiCallers: string[]
} {
  const service = topology.services[serviceId]
  if (!service) {
    return { affectedServices: [], sharedTopics: [], apiConnections: [], apiCallers: [] }
  }

  const touchedTopics = [...service.produces, ...service.consumes]
  const topicPeers = new Set<string>()
  for (const topicId of touchedTopics) {
    const topic = topology.topics[topicId]
    if (!topic) continue
    for (const svcId of [...topic.consumers, ...topic.producers]) {
      if (svcId !== serviceId) topicPeers.add(svcId)
    }
  }

  // Synchronous call peers: providers this service calls (outbound) and consumers
  // that call this service's APIs (inbound).
  const apiPeers = new Set<string>()
  for (const api of service.consumesApis ?? []) {
    const provider = resolveApiProvider(api, index, topology)
    if (provider && provider !== serviceId) apiPeers.add(provider)
  }
  const apiCallers = getApiCallers(serviceId, topology, index)
  for (const caller of apiCallers) {
    apiPeers.add(caller)
  }

  return {
    affectedServices: [...new Set([...topicPeers, ...apiPeers])],
    sharedTopics: touchedTopics,
    apiConnections: [...apiPeers],
    apiCallers,
  }
}

export function filterByTeams(
  nodes: Node[],
  edges: Edge[],
  selectedTeams: Set<string>
): { nodes: Node[]; edges: Edge[] } {
  if (selectedTeams.size === 0) {
    return {
      nodes: nodes.map(n => ({ ...n, hidden: true })),
      edges: edges.map(e => ({ ...e, hidden: true })),
    }
  }

  // Determine which service nodes are visible
  const visibleServiceIds = new Set<string>()
  for (const node of nodes) {
    if (node.type === 'service' && selectedTeams.has(node.data.team as string)) {
      visibleServiceIds.add(node.id)
    }
  }

  // Find topics connected to visible services. Only topic-touching edges
  // contribute here; service→service api edges are handled by the final
  // both-endpoints-visible check below.
  const visibleTopicIds = new Set<string>()
  for (const edge of edges) {
    const sourceIsTopic = edge.source.startsWith('topic:')
    const targetIsTopic = edge.target.startsWith('topic:')
    if (!sourceIsTopic && !targetIsTopic) continue
    if (visibleServiceIds.has(edge.source) || visibleServiceIds.has(edge.target)) {
      visibleTopicIds.add(sourceIsTopic ? edge.source : edge.target)
    }
  }

  // Build final node visibility
  const filteredNodes = nodes.map(n => {
    if (n.type === 'service') {
      return { ...n, hidden: !visibleServiceIds.has(n.id) }
    }
    if (n.type === 'topic') {
      return { ...n, hidden: !visibleTopicIds.has(n.id) }
    }
    return n
  })

  // Edges are visible only if both source and target are visible
  const allVisible = new Set([...visibleServiceIds, ...visibleTopicIds])
  const filteredEdges = edges.map(e => ({
    ...e,
    hidden: !allVisible.has(e.source) || !allVisible.has(e.target),
  }))

  return { nodes: filteredNodes, edges: filteredEdges }
}
