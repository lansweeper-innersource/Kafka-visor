export interface Team {
  name: string
  color: string
  fullName: string
}

export interface Topic {
  id: string
  consumers: string[]
  producers: string[]
  consumerCount: number
  producerCount: number
  teamCount: number
}

export interface SourceRepo {
  name: string
  url: string
}

export interface Service {
  id: string
  team: string
  repository: string
  namespace: string
  produces: string[]
  consumes: string[]
  runningInCluster: boolean
  deploymentType: 'Deployment' | 'CronJob' | 'ScaledJob' | 'WorkflowTemplate' | 'Unknown'
  githubUrl?: string
  sourceRepos?: SourceRepo[]
  grpcCalls?: string[]
  databases?: string[]
}

export interface TopologyData {
  teams: Record<string, Team>
  topics: Record<string, Topic>
  services: Record<string, Service>
  metadata: {
    dataCollectionDate: string
    totalTopics: number
    totalServices: number
    totalTeams: number
  }
}

// Flow Mode types
export type InteractionType = 'kafka' | 'grpc' | 'https' | 'protobuf' | 'db' | 'internal' | 'sensor'
export type FlowNodeType = 'service' | 'topic' | 'scanner' | 'database'

export interface FlowNodeDef {
  id: string
  type: FlowNodeType
  label?: string
  position: [number, number]
}

export interface FlowEdgeDef {
  source: number  // index into nodes array
  target: number
  type: InteractionType
  label?: string
}

export interface FlowDefinition {
  id: string
  name: string
  description: string
  nodes: FlowNodeDef[]
  edges: FlowEdgeDef[]
}

export const TEAM_COLORS: Record<string, string> = {
  'cloud-1': '#3B82F6',
  'cloud-2': '#8B5CF6',
  'cloud-asset-and-visualisation': '#14B8A6',
  'cloud-data-pipeline-and-scanning': '#F97316',
  'cloud-enrichment': '#EC4899',
  'cloud-front-end': '#CA8A04',
  'cloud-integrations': '#10B981',
  'data-core': '#EF4444',
  'discovery-engineering': '#6366F1',
}
