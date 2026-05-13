import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface FlowRefNodeData {
  label: string
  flowId: string
  [key: string]: unknown
}

function FlowRefNodeComponent({ data }: NodeProps) {
  const d = data as FlowRefNodeData

  return (
    <div
      className="bg-purple-700 text-white rounded-lg px-3 py-2 shadow-md min-w-[120px] text-center cursor-pointer hover:bg-purple-600 transition-colors border-2 border-purple-400 border-dashed"
      title={`Go to flow: ${d.label}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-purple-300 !w-2 !h-2" />

      <div className="text-[9px] font-bold uppercase tracking-wider text-purple-200 mb-0.5">
        continues in
      </div>
      <div className="text-xs font-semibold truncate max-w-[180px]">
        {d.label}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-purple-300 !w-2 !h-2" />
    </div>
  )
}

export const FlowRefNode = memo(FlowRefNodeComponent)
