import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { TopicNodeData } from '../../lib/graph-builder'

function TopicNodeComponent({ data }: NodeProps) {
  const d = data as TopicNodeData
  return (
    <div className="bg-gray-900 text-white rounded-full px-4 py-2 border-2 border-gray-600 shadow-lg min-w-[140px] text-center">
      <Handle type="target" position={Position.Left} className="!bg-green-500 !w-2 !h-2" />
      <div className="text-xs font-bold truncate max-w-[200px]" title={d.label}>
        {d.label}
      </div>
      <div className="text-[10px] text-gray-400 mt-0.5">
        <span className="text-green-400">{d.producerCount}P</span>
        {' / '}
        <span className="text-blue-400">{d.consumerCount}C</span>
        {' / '}
        <span className="text-gray-300">{d.teamCount}T</span>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-blue-500 !w-2 !h-2" />
    </div>
  )
}

export const TopicNode = memo(TopicNodeComponent)
