import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { ServiceNodeData } from '../../lib/graph-builder'

function ServiceNodeComponent({ data }: NodeProps) {
  const d = data as ServiceNodeData
  return (
    <div
      className="bg-white rounded-lg px-3 py-1.5 shadow-md min-w-[120px] text-center"
      style={{ borderLeft: `4px solid ${d.teamColor}` }}
    >
      <Handle type="target" position={Position.Left} className="!bg-blue-500 !w-2 !h-2" />
      <div className="text-xs font-semibold text-gray-800 truncate max-w-[180px]" title={d.label}>
        {d.label}
      </div>
      <div className="text-[10px] text-gray-500">
        {d.team}
        {!d.runningInCluster && (
          <span className="ml-1 text-amber-600" title="Not found in cluster">
            ⚠
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-green-500 !w-2 !h-2" />
    </div>
  )
}

export const ServiceNode = memo(ServiceNodeComponent)
