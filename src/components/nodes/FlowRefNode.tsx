import { memo, useCallback, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

interface FlowRefOption {
  id: string
  name: string
}

export interface FlowRefNodeData {
  label: string
  flowId: string
  flows?: FlowRefOption[]
  onUpdate?: (flowId: string) => void
  [key: string]: unknown
}

function FlowRefNodeComponent({ data }: NodeProps) {
  const d = data as FlowRefNodeData
  const editable = typeof d.onUpdate === 'function' && Array.isArray(d.flows)
  const [editing, setEditing] = useState(false)

  const handleDoubleClick = useCallback(() => {
    if (editable) setEditing(true)
  }, [editable])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    d.onUpdate?.(e.target.value)
    setEditing(false)
  }, [d])

  const unset = !d.flowId
  const title = editable
    ? 'Double-click to choose the target flow'
    : `Go to flow: ${d.label}`

  return (
    <div
      className={`rounded-lg px-3 py-2 shadow-md min-w-[140px] max-w-[220px] text-center cursor-pointer transition-colors border-2 border-dashed ${
        unset
          ? 'bg-gray-500 hover:bg-gray-400 border-gray-300 text-white'
          : 'bg-purple-700 hover:bg-purple-600 border-purple-400 text-white'
      }`}
      title={title}
      onDoubleClick={handleDoubleClick}
    >
      <Handle type="target" position={Position.Left} className="!bg-purple-300 !w-2 !h-2" />

      <div className="text-[9px] font-bold uppercase tracking-wider text-purple-200 mb-0.5">
        continues in
      </div>

      {editing ? (
        <select
          value={d.flowId}
          onChange={handleChange}
          onBlur={() => setEditing(false)}
          autoFocus
          className="nodrag w-full bg-white text-gray-900 text-xs rounded px-1 py-0.5 outline-none"
        >
          <option value="">— select a flow —</option>
          {d.flows?.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      ) : (
        <div className="text-xs font-semibold break-words">
          {unset ? (editable ? 'Double-click to set target' : 'No target flow') : d.label}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-purple-300 !w-2 !h-2" />
    </div>
  )
}

export const FlowRefNode = memo(FlowRefNodeComponent)
