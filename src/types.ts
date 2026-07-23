export interface Team {
  name: string
  color: string
  fullName: string
}

export type MessageFormat = 'avro' | 'proto' | 'json'

export interface TopicMessage {
  name: string
  format: MessageFormat
  description?: string
  /** Subset of the topic's producers that emit this specific message. Omit if all do. */
  producers?: string[]
  /** Subset of the topic's consumers that read this specific message. Omit if all do. */
  consumers?: string[]
  schemaUrl?: string
}

export interface Topic {
  id: string
  consumers: string[]
  producers: string[]
  consumerCount: number
  producerCount: number
  teamCount: number
  messages?: TopicMessage[]
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
  deploymentType: 'Deployment' | 'CronJob' | 'CronWorkflow' | 'ScaledJob' | 'WorkflowTemplate' | 'Unknown'
  githubUrl?: string
  sourceRepos?: SourceRepo[]
  grpcCalls?: string[]
  redisPubSub?: string[]
  databases?: string[]
  /** APIs this service exposes, from the dev-portal catalog (e.g. svc.system_port). */
  providesApis?: string[]
  /** APIs this service calls, from the dev-portal catalog (service→service deps). */
  consumesApis?: string[]
  description?: string
  serviceGroup?: string
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
export type InteractionType = 'kafka' | 'grpc' | 'https' | 'db' | 'internal' | 'sqs' | 'unknown'
export type FlowNodeType = 'service' | 'topic' | 'scanner' | 'database' | 'workflow' | 'flowRef' | 'stickyNote' | 'asset' | 'component'

export interface Annotation {
  text: string
  author?: string
  date?: string
  severity?: 'info' | 'warning' | 'critical'
}

export type ScannerVariant = 'onprem' | 'vnext'

export interface FlowNodeDef {
  id: string
  type: FlowNodeType
  label?: string
  position: [number, number]
  annotations?: Annotation[]
  /** For flowRef nodes: the id of the target flow */
  flowId?: string
  /** For scanner nodes: on-prem vs vnext */
  variant?: ScannerVariant
  /** For stickyNote nodes */
  text?: string
  /** For database nodes: extra detail (e.g. collection name) */
  detail?: string
  /** For component nodes: name of the service that owns this component */
  parentService?: string
}

export interface FlowEdgeDef {
  source: number  // index into nodes array
  target: number
  type: InteractionType
  label?: string
  annotations?: Annotation[]
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
