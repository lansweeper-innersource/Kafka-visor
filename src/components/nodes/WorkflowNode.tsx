import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

function WorkflowNodeComponent({ data, selected }: NodeProps) {
  const label = data.label as string

  return (
    <div
      className={`bg-rose-50 text-rose-800 rounded-lg px-4 py-2.5 border-2 border-dashed shadow-sm min-w-[120px] text-center transition-colors ${
        selected ? 'border-blue-400 ring-2 ring-blue-300' : 'border-rose-300'
      }`}
    >
      <div className="text-[10px] text-rose-500 uppercase tracking-wider mb-0.5">workflow</div>
      <div className="text-xs font-semibold">{label}</div>
      <Handle type="target" position={Position.Left} className="!bg-rose-400 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-rose-400 !w-2 !h-2" />
    </div>
  )
}

export const WorkflowNode = memo(WorkflowNodeComponent)
