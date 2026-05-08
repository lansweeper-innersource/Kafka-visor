import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

function DatabaseNodeComponent({ data, selected }: NodeProps) {
  const label = data.label as string
  return (
    <div
      className={`bg-amber-50 text-amber-800 rounded-lg px-4 py-2.5 border-2 shadow-sm min-w-[100px] text-center transition-colors ${
        selected ? 'border-blue-400 ring-2 ring-blue-300' : 'border-amber-300'
      }`}
    >
      <div className="text-[10px] text-amber-500 uppercase tracking-wider mb-0.5">database</div>
      <div className="text-xs font-semibold">{label}</div>
      <Handle type="target" position={Position.Left} className="!bg-amber-400 !w-2 !h-2" />
    </div>
  )
}

export const DatabaseNode = memo(DatabaseNodeComponent)
