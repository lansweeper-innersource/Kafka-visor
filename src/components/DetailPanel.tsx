import { useState } from 'react'
import type { Node } from '@xyflow/react'
import type { TopicNodeData, ServiceNodeData } from '../lib/graph-builder'
import { getBlastRadius, buildApiProviderIndex, resolveApiProvider, getApiCallers } from '../lib/graph-builder'
import { getArgoAppSet, getArgoDomain } from '../lib/argo'
import type { TopologyData, FlowDefinition, TopicMessage } from '../types'

interface DetailPanelProps {
  node: Node | null
  topology: TopologyData
  flows: FlowDefinition[]
  onClose: () => void
  onNavigate: (nodeId: string, type: 'topic' | 'service') => void
  onOpenFlow: (flowId: string) => void
  isFlowMode?: boolean
}


export function DetailPanel({ node, topology, flows, onClose, onNavigate, onOpenFlow, isFlowMode }: DetailPanelProps) {
  if (!node) return null

  const nodeType = node.type

  const data = node.data

  const typeLabel = nodeType === 'topic' ? 'Topic'
    : nodeType === 'scanner' ? 'Scanner'
    : nodeType === 'database' ? 'Database'
    : nodeType === 'component' ? 'Component'
    : nodeType === 'asset' ? 'Asset'
    : nodeType === 'workflow' ? 'Workflow'
    : 'Service'

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto flex-shrink-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-700">
          {typeLabel} Details
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          x
        </button>
      </div>

      {nodeType === 'topic' && (
        <TopicDetails
          data={data as TopicNodeData}
          topology={topology}
          flows={flows}
          onNavigate={onNavigate}
          onOpenFlow={onOpenFlow}
        />
      )}
      {nodeType === 'service' && (
        <ServiceDetails
          data={data as ServiceNodeData}
          topology={topology}
          flows={flows}
          onNavigate={onNavigate}
          onOpenFlow={onOpenFlow}
        />
      )}
      {nodeType === 'scanner' && (
        <ScannerDetails label={data.label as string} variant={data.variant as string | undefined} />
      )}
      {nodeType === 'database' && (
        <div className="text-xs font-mono font-bold text-gray-800">{String(data.label)}</div>
      )}
      {nodeType === 'component' && (
        <div className="space-y-2">
          <div className="text-xs font-mono font-bold text-gray-800">{String(data.label)}</div>
          {data.parentService ? (
            <div className="text-[11px] text-gray-500">
              <span className="font-semibold">In service:</span>{' '}
              <span className="font-mono">{String(data.parentService)}</span>
            </div>
          ) : null}
        </div>
      )}
      {nodeType === 'asset' && (
        <div className="space-y-2">
          <div className="text-xs font-mono font-bold text-gray-800">{String(data.label)}</div>
          {data.detail ? (
            <div className="text-[11px] text-gray-500">{String(data.detail)}</div>
          ) : null}
        </div>
      )}

      {/* Annotations (flow mode) */}
      {isFlowMode && Array.isArray(data.annotations) && (
        <div className="mt-4 space-y-1">
          <div className="text-xs font-semibold text-gray-600">Annotations</div>
          {(data.annotations as { text: string; severity?: string }[]).map((a, i) => (
            <div
              key={i}
              className={`text-[11px] px-2 py-1.5 rounded leading-snug ${
                a.severity === 'critical' ? 'bg-red-50 text-red-800'
                : a.severity === 'warning' ? 'bg-amber-50 text-amber-800'
                : 'bg-blue-50 text-blue-800'
              }`}
            >
              {a.text}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ScannerDetails({ label, variant }: { label: string; variant?: string }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-mono font-bold text-gray-800">{label}</div>
      {variant && (
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${variant === 'vnext' ? 'bg-teal-400' : 'bg-orange-400'}`} />
          <span className="text-xs text-gray-600">{variant === 'vnext' ? 'vNext' : 'On-Prem'}</span>
        </div>
      )}
    </div>
  )
}

function flowsContaining(nodeId: string, flows: FlowDefinition[]): FlowDefinition[] {
  return flows.filter(f => f.nodes.some(n => n.id === nodeId))
}

function FlowsSection({ flows, onOpenFlow }: { flows: FlowDefinition[]; onOpenFlow: (id: string) => void }) {
  if (flows.length === 0) return null
  return (
    <div>
      <div className="text-xs font-semibold text-purple-700 mb-1 flex items-center gap-1.5">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-700 text-white">F</span>
        Appears in {flows.length} workflow{flows.length > 1 ? 's' : ''}
      </div>
      <div className="space-y-1">
        {flows.map(f => (
          <button
            key={f.id}
            onClick={() => onOpenFlow(f.id)}
            className="w-full text-left text-[11px] px-2 py-1.5 rounded bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 flex items-center gap-1.5"
            title={f.description}
          >
            <span className="font-bold flex-shrink-0">F</span>
            <span className="truncate">{f.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const FORMAT_STYLES: Record<TopicMessage['format'], { bg: string; text: string; label: string }> = {
  avro: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'AVRO' },
  proto: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'PROTO' },
  json: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'JSON' },
}

function MessagesSection({ messages }: { messages?: TopicMessage[] }) {
  if (!messages || messages.length === 0) return null
  return (
    <div>
      <div className="text-xs font-semibold text-gray-700 mb-1">
        Messages ({messages.length})
      </div>
      <div className="space-y-1.5">
        {messages.map((m, i) => {
          const fmt = FORMAT_STYLES[m.format]
          return (
            <div key={`${m.name}-${i}`} className="border border-gray-200 rounded p-2 bg-gray-50">
              <div className="flex items-start gap-1.5">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${fmt.bg} ${fmt.text} flex-shrink-0 mt-0.5`}>
                  {fmt.label}
                </span>
                <div className="font-mono text-[11px] text-gray-800 break-all leading-snug">
                  {m.name}
                </div>
              </div>
              {m.description && (
                <div className="text-[11px] text-gray-600 mt-1 leading-snug">{m.description}</div>
              )}
              {m.producers && m.producers.length > 0 && (
                <div className="text-[10px] text-green-700 mt-1 font-mono">
                  emits: {m.producers.join(', ')}
                </div>
              )}
              {m.consumers && m.consumers.length > 0 && (
                <div className="text-[10px] text-blue-700 mt-0.5 font-mono">
                  reads: {m.consumers.join(', ')}
                </div>
              )}
              {m.schemaUrl && (
                <a
                  href={m.schemaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-blue-600 hover:underline mt-1 inline-block"
                >
                  schema →
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TopicDetails({
  data,
  topology,
  flows,
  onNavigate,
  onOpenFlow,
}: {
  data: TopicNodeData
  topology: TopologyData
  flows: FlowDefinition[]
  onNavigate: (nodeId: string, type: 'topic' | 'service') => void
  onOpenFlow: (flowId: string) => void
}) {
  const topologyId = (data.topologyId as string) ?? data.label
  const topic = topology.topics[topologyId]
  if (!topic) return null

  const inFlows = flowsContaining(topologyId, flows)

  return (
    <div className="space-y-4">
      <div className="text-xs font-mono font-bold text-gray-800 break-all">{topologyId}</div>
      {data.label !== topologyId && (
        <div className="text-[11px] text-gray-500 mt-0.5">{data.label}</div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Producers" value={data.producerCount} color="text-green-600" />
        <Stat label="Consumers" value={data.consumerCount} color="text-blue-600" />
        <Stat label="Teams" value={data.teamCount} color="text-gray-600" />
      </div>

      <FlowsSection flows={inFlows} onOpenFlow={onOpenFlow} />

      <MessagesSection messages={topic.messages} />

      <ClickableServiceList
        title="Producers"
        services={topic.producers}
        topology={topology}
        color="text-green-600"
        onNavigate={onNavigate}
      />
      <ClickableServiceList
        title="Consumers"
        services={topic.consumers}
        topology={topology}
        color="text-blue-600"
        onNavigate={onNavigate}
      />
    </div>
  )
}

function ServiceDetails({
  data,
  topology,
  flows,
  onNavigate,
  onOpenFlow,
}: {
  data: ServiceNodeData
  topology: TopologyData
  flows: FlowDefinition[]
  onNavigate: (nodeId: string, type: 'topic' | 'service') => void
  onOpenFlow: (flowId: string) => void
}) {
  const topologyId = (data.topologyId as string) ?? data.label
  const blast = getBlastRadius(topologyId, topology)
  const inFlows = flowsContaining(topologyId, flows)
  const apiIndex = buildApiProviderIndex(topology)
  const apiCallers = getApiCallers(topologyId, topology, apiIndex)

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-mono font-bold text-gray-800">{topologyId}</div>
        {data.label !== topologyId && data.label !== data.description && (
          <div className="text-[11px] text-gray-500 mt-0.5">{data.label}</div>
        )}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.teamColor }} />
          <span className="text-xs text-gray-600">{data.team}</span>
          {data.teamColor && (
            <span className="text-[10px] text-gray-400">
              {topology.teams[data.team as string]?.fullName ?? ''}
            </span>
          )}
        </div>
        {data.description && (
          <div className="text-[11px] text-gray-500 mt-1.5 leading-snug">{data.description}</div>
        )}
      </div>

      <div className="space-y-1 text-xs">
        <InfoRow label="Namespace" value={data.namespace} />
        <InfoRow label="Type" value={data.deploymentType} />
        <InfoRow
          label="Status"
          value={data.runningInCluster ? 'Running' : 'Not found'}
          valueClass={data.runningInCluster ? 'text-green-600' : 'text-amber-600'}
        />
      </div>

      <ArgoSection
        appSet={getArgoAppSet(data)}
        domain={getArgoDomain(data)}
      />

      <FlowsSection flows={inFlows} onOpenFlow={onOpenFlow} />

      {/* GitHub Links */}
      <div className="space-y-1">
        {data.sourceRepos && data.sourceRepos.length > 0 && (
          <div className="text-xs">
            <span className="text-gray-500">Source: </span>
            {data.sourceRepos.map((r, i) => (
              <span key={r.name}>
                {i > 0 && ', '}
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono">
                  {r.name}
                </a>
              </span>
            ))}
          </div>
        )}
        {data.githubUrl && (
          <div className="text-xs">
            <span className="text-gray-500">Deploy: </span>
            <a href={data.githubUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono">
              {data.repository}
            </a>
          </div>
        )}
      </div>

      {/* Same source repo */}
      {data.sourceSiblings && (data.sourceSiblings as string[]).length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-600 mb-1">
            Same source <span className="font-mono text-gray-400">({data.sourceRepoName as string})</span>
          </div>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {(data.sourceSiblings as string[]).map(svcId => {
              const svc = topology.services[svcId]
              return (
                <button
                  key={svcId}
                  onClick={() => onNavigate(svcId, 'service')}
                  className="text-[11px] font-mono text-gray-700 hover:text-blue-600 hover:underline flex items-center gap-1.5 py-0.5 w-full text-left"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: svc ? topology.teams[svc.team]?.color : '#6B7280' }}
                  />
                  {svcId}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Blast Radius */}
      <div className="bg-red-50 border border-red-100 rounded-lg p-3">
        <div className="text-xs font-semibold text-red-700 mb-1">Blast Radius</div>
        <div className="text-[11px] text-red-600">
          {blast.affectedServices.length} services affected via {blast.sharedTopics.length} topics
          {blast.apiConnections.length > 0 && ` and ${blast.apiConnections.length} API calls`}
        </div>
        {blast.affectedServices.length > 0 && (
          <div className="mt-2 space-y-0.5 max-h-32 overflow-y-auto">
            {blast.affectedServices.slice(0, 20).map(svcId => {
              const svc = topology.services[svcId]
              return (
                <button
                  key={svcId}
                  onClick={() => onNavigate(svcId, 'service')}
                  className="text-[10px] font-mono text-red-700 hover:text-red-900 hover:underline flex items-center gap-1 w-full text-left"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: svc ? topology.teams[svc.team]?.color : '#6B7280' }}
                  />
                  {svcId}
                </button>
              )
            })}
            {blast.affectedServices.length > 20 && (
              <div className="text-[10px] text-red-400">
                +{blast.affectedServices.length - 20} more
              </div>
            )}
          </div>
        )}
      </div>

      <ClickableTopicList
        title="Produces to"
        topics={data.produces}
        color="text-green-600"
        onNavigate={onNavigate}
      />
      <ClickableTopicList
        title="Consumes from"
        topics={data.consumes}
        color="text-blue-600"
        onNavigate={onNavigate}
      />

      {/* gRPC dependencies */}
      {data.grpcCalls && data.grpcCalls.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-purple-600 mb-1">
            gRPC calls ({data.grpcCalls.length})
          </div>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {data.grpcCalls.map(callee => (
              <div key={callee} className="text-[11px] font-mono text-gray-600 py-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                {callee}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provided APIs (dev-portal catalog) */}
      {data.providesApis && data.providesApis.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-sky-600 mb-1">
            Provides APIs ({data.providesApis.length})
          </div>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {data.providesApis.map(api => (
              <div key={api} className="text-[11px] font-mono text-gray-600 py-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                {api}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consumed APIs (dev-portal catalog) */}
      {data.consumesApis && data.consumesApis.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-indigo-600 mb-1">
            Consumes APIs → ({data.consumesApis.length})
          </div>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {data.consumesApis.map(api => {
              const provider = resolveApiProvider(api, apiIndex, topology)
              if (provider) {
                return (
                  <button
                    key={api}
                    onClick={() => onNavigate(provider, 'service')}
                    title={api}
                    className="text-[11px] font-mono text-indigo-700 hover:text-indigo-900 hover:underline py-0.5 flex items-center gap-1.5 w-full text-left"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                    {provider}
                  </button>
                )
              }
              return (
                <div key={api} className="text-[11px] font-mono text-gray-500 py-0.5 flex items-center gap-1.5" title="external / not in topology">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                  {api}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Inbound API callers (dev-portal catalog) */}
      {apiCallers.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-indigo-600 mb-1">
            Called by ← ({apiCallers.length})
          </div>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {apiCallers.map(caller => (
              <button
                key={caller}
                onClick={() => onNavigate(caller, 'service')}
                className="text-[11px] font-mono text-indigo-700 hover:text-indigo-900 hover:underline py-0.5 flex items-center gap-1.5 w-full text-left"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                {caller}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Redis pub/sub dependencies */}
      {data.redisPubSub && data.redisPubSub.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-rose-600 mb-1">
            Redis pub/sub → ({data.redisPubSub.length})
          </div>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {data.redisPubSub.map(subscriber => (
              <div key={subscriber} className="text-[11px] font-mono text-gray-600 py-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                {subscriber}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Database connections */}
      {data.databases && data.databases.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-amber-600 mb-1">
            Databases ({data.databases.length})
          </div>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {data.databases.map(db => (
              <div key={db} className="text-[11px] font-mono text-gray-600 py-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-sm bg-amber-400 flex-shrink-0" />
                {db}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ArgoSection({ appSet, domain }: { appSet: string | null; domain: string | null }) {
  const [copied, setCopied] = useState(false)
  if (!appSet && !domain) return null

  const handleCopy = async () => {
    if (!appSet) return
    await navigator.clipboard.writeText(appSet)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="bg-sky-50 border border-sky-100 rounded-lg p-3 space-y-1.5">
      <div className="text-xs font-semibold text-sky-700">Argo CD</div>
      {appSet && (
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-sky-900 min-w-0">
            <span className="text-sky-600">ApplicationSet: </span>
            <span className="font-mono font-bold break-all">{appSet}</span>
          </div>
          <button
            onClick={handleCopy}
            className="text-[10px] px-2 py-0.5 rounded bg-sky-100 hover:bg-sky-200 text-sky-700 font-medium flex-shrink-0"
            title="Copy ApplicationSet name"
          >
            {copied ? 'copied' : 'copy'}
          </button>
        </div>
      )}
      {domain && (
        <div className="text-[11px] text-sky-900">
          <span className="text-sky-600">Domain: </span>
          <span className="font-mono">{domain}</span>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-50 rounded p-2">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  )
}

function InfoRow({
  label,
  value,
  valueClass = 'text-gray-800',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-mono ${valueClass}`}>{value}</span>
    </div>
  )
}

function ClickableServiceList({
  title,
  services,
  topology,
  color,
  onNavigate,
}: {
  title: string
  services: string[]
  topology: TopologyData
  color: string
  onNavigate: (nodeId: string, type: 'topic' | 'service') => void
}) {
  if (services.length === 0) return null
  return (
    <div>
      <div className={`text-xs font-semibold ${color} mb-1`}>
        {title} ({services.length})
      </div>
      <div className="space-y-0.5 max-h-40 overflow-y-auto">
        {services.map(svcId => {
          const svc = topology.services[svcId]
          return (
            <button
              key={svcId}
              onClick={() => onNavigate(svcId, 'service')}
              className="text-[11px] font-mono text-gray-700 hover:text-blue-600 hover:underline flex items-center gap-1.5 py-0.5 w-full text-left"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: svc ? topology.teams[svc.team]?.color : '#6B7280' }}
              />
              {svcId}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ClickableTopicList({
  title,
  topics,
  color,
  onNavigate,
}: {
  title: string
  topics: string[]
  color: string
  onNavigate: (nodeId: string, type: 'topic' | 'service') => void
}) {
  if (topics.length === 0) return null
  return (
    <div>
      <div className={`text-xs font-semibold ${color} mb-1`}>
        {title} ({topics.length})
      </div>
      <div className="space-y-0.5 max-h-40 overflow-y-auto">
        {topics.map(topicId => (
          <button
            key={topicId}
            onClick={() => onNavigate(topicId, 'topic')}
            className="text-[11px] font-mono text-gray-700 hover:text-blue-600 hover:underline py-0.5 w-full text-left"
          >
            {topicId}
          </button>
        ))}
      </div>
    </div>
  )
}
