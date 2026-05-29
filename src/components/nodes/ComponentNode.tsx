import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

function ComponentNodeComponent({ data, selected }: NodeProps) {
  const label = data.label as string
  const parentService = data.parentService as string | undefined

  return (
    <div
      className={`bg-gray-50 text-gray-700 rounded px-2.5 py-1.5 border border-dashed shadow-none min-w-[80px] text-center transition-colors ${
        selected ? 'border-blue-400 ring-2 ring-blue-300' : 'border-gray-400'
      }`}
    >
      <div className="text-[9px] text-gray-400 uppercase tracking-wider">component</div>
      <div className="text-[11px] font-medium leading-tight">{label}</div>
      {parentService ? (
        <div className="text-[9px] text-gray-400 mt-0.5 italic">in {parentService}</div>
      ) : null}
      <Handle type="target" position={Position.Left} className="!bg-gray-400 !w-1.5 !h-1.5" />
      <Handle type="source" position={Position.Right} className="!bg-gray-400 !w-1.5 !h-1.5" />
    </div>
  )
}

export const ComponentNode = memo(ComponentNodeComponent)
