import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

function ScannerNodeComponent({ data, selected }: NodeProps) {
  const label = data.label as string
  return (
    <div
      className={`bg-gray-100 text-gray-700 rounded-lg px-4 py-2.5 border-2 border-dashed shadow-sm min-w-[120px] text-center transition-colors ${
        selected ? 'border-blue-400 ring-2 ring-blue-300' : 'border-gray-400'
      }`}
    >
      <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">scanner</div>
      <div className="text-xs font-semibold">{label}</div>
      <Handle type="source" position={Position.Right} className="!bg-gray-400 !w-2 !h-2" />
    </div>
  )
}

export const ScannerNode = memo(ScannerNodeComponent)
