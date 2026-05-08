import type { Node } from '@xyflow/react'
import type { TopicNodeData, ServiceNodeData } from '../lib/graph-builder'
import { getBlastRadius } from '../lib/graph-builder'
import type { TopologyData } from '../types'

interface DetailPanelProps {
  node: Node | null
  topology: TopologyData
  onClose: () => void
  onNavigate: (nodeId: string, type: 'topic' | 'service') => void
}

export function DetailPanel({ node, topology, onClose, onNavigate }: DetailPanelProps) {
  if (!node) return null

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto flex-shrink-0">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-700">
          {node.type === 'topic' ? 'Topic' : 'Service'} Details
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          x
        </button>
      </div>

      {node.type === 'topic' && (
        <TopicDetails data={node.data as TopicNodeData} topology={topology} onNavigate={onNavigate} />
      )}
      {node.type === 'service' && (
        <ServiceDetails data={node.data as ServiceNodeData} topology={topology} onNavigate={onNavigate} />
      )}
    </div>
  )
}

function TopicDetails({
  data,
  topology,
  onNavigate,
}: {
  data: TopicNodeData
  topology: TopologyData
  onNavigate: (nodeId: string, type: 'topic' | 'service') => void
}) {
  const topic = topology.topics[data.label]
  if (!topic) return null

  return (
    <div className="space-y-4">
      <div className="text-xs font-mono font-bold text-gray-800 break-all">{data.label}</div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Producers" value={data.producerCount} color="text-green-600" />
        <Stat label="Consumers" value={data.consumerCount} color="text-blue-600" />
        <Stat label="Teams" value={data.teamCount} color="text-gray-600" />
      </div>

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
  onNavigate,
}: {
  data: ServiceNodeData
  topology: TopologyData
  onNavigate: (nodeId: string, type: 'topic' | 'service') => void
}) {
  const blast = getBlastRadius(data.label, topology)

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-mono font-bold text-gray-800">{data.label}</div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.teamColor }} />
          <span className="text-xs text-gray-600">{data.team}</span>
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

      {/* Blast Radius */}
      <div className="bg-red-50 border border-red-100 rounded-lg p-3">
        <div className="text-xs font-semibold text-red-700 mb-1">Blast Radius</div>
        <div className="text-[11px] text-red-600">
          {blast.affectedServices.length} services affected via {blast.sharedTopics.length} topics
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
