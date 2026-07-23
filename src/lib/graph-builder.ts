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
  type: 'producer' | 'consumer'
  [key: string]: unknown
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

/** Blast radius: all services reachable through shared topics from a given service */
export function getBlastRadius(serviceId: string, topology: TopologyData): {
  affectedServices: string[]
  sharedTopics: string[]
} {
  const service = topology.services[serviceId]
  if (!service) return { affectedServices: [], sharedTopics: [] }

  const touchedTopics = [...service.produces, ...service.consumes]
  const affectedSet = new Set<string>()

  for (const topicId of touchedTopics) {
    const topic = topology.topics[topicId]
    if (!topic) continue
    for (const svcId of [...topic.consumers, ...topic.producers]) {
      if (svcId !== serviceId) affectedSet.add(svcId)
    }
  }

  return {
    affectedServices: [...affectedSet],
    sharedTopics: touchedTopics,
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

  // Find topics connected to visible services
  const visibleTopicIds = new Set<string>()
  for (const edge of edges) {
    if (visibleServiceIds.has(edge.source) || visibleServiceIds.has(edge.target)) {
      const topicId = edge.source.startsWith('topic:') ? edge.source : edge.target
      visibleTopicIds.add(topicId)
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
