import type { Node } from '@xyflow/react'
import type { TopicNodeData, ServiceNodeData } from '../lib/graph-builder'
import type { TopologyData } from '../types'

interface DetailPanelProps {
  node: Node | null
  topology: TopologyData
  onClose: () => void
}

export function DetailPanel({ node, topology, onClose }: DetailPanelProps) {
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

      {node.type === 'topic' && <TopicDetails data={node.data as TopicNodeData} topology={topology} />}
      {node.type === 'service' && <ServiceDetails data={node.data as ServiceNodeData} topology={topology} />}
    </div>
  )
}

function TopicDetails({ data, topology }: { data: TopicNodeData; topology: TopologyData }) {
  const topic = topology.topics[data.label]
  if (!topic) return null

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-mono font-bold text-gray-800 break-all">{data.label}</div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Producers" value={data.producerCount} color="text-green-600" />
        <Stat label="Consumers" value={data.consumerCount} color="text-blue-600" />
        <Stat label="Teams" value={data.teamCount} color="text-gray-600" />
      </div>

      <ServiceList
        title="Producers"
        services={topic.producers}
        topology={topology}
        color="text-green-600"
      />
      <ServiceList
        title="Consumers"
        services={topic.consumers}
        topology={topology}
        color="text-blue-600"
      />
    </div>
  )
}

function ServiceDetails({ data }: { data: ServiceNodeData; topology: TopologyData }) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-mono font-bold text-gray-800">{data.label}</div>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: data.teamColor }}
          />
          <span className="text-xs text-gray-600">{data.team}</span>
        </div>
      </div>

      <div className="space-y-1 text-xs">
        <InfoRow label="Repository" value={data.repository} />
        <InfoRow label="Namespace" value={data.namespace} />
        <InfoRow label="Type" value={data.deploymentType} />
        <InfoRow
          label="Status"
          value={data.runningInCluster ? 'Running' : 'Not found'}
          valueClass={data.runningInCluster ? 'text-green-600' : 'text-amber-600'}
        />
      </div>

      <TopicList title="Produces to" topics={data.produces} color="text-green-600" />
      <TopicList title="Consumes from" topics={data.consumes} color="text-blue-600" />
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

function ServiceList({
  title,
  services,
  topology,
  color,
}: {
  title: string
  services: string[]
  topology: TopologyData
  color: string
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
            <div
              key={svcId}
              className="text-[11px] font-mono text-gray-700 flex items-center gap-1.5 py-0.5"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: svc ? topology.teams[svc.team]?.color : '#6B7280' }}
              />
              {svcId}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TopicList({
  title,
  topics,
  color,
}: {
  title: string
  topics: string[]
  color: string
}) {
  if (topics.length === 0) return null
  return (
    <div>
      <div className={`text-xs font-semibold ${color} mb-1`}>
        {title} ({topics.length})
      </div>
      <div className="space-y-0.5 max-h-40 overflow-y-auto">
        {topics.map(topicId => (
          <div key={topicId} className="text-[11px] font-mono text-gray-700 py-0.5">
            {topicId}
          </div>
        ))}
      </div>
    </div>
  )
}
