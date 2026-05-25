import { memo, useCallback, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

function AssetNodeComponent({ data, selected }: NodeProps) {
  const label = data.label as string
  const detail = data.detail as string | undefined
  const onUpdateDetail = data.onUpdateDetail as ((detail: string) => void) | undefined
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(detail ?? '')

  const handleDoubleClick = useCallback(() => {
    if (!onUpdateDetail) return
    setDraft(detail ?? '')
    setEditing(true)
  }, [detail, onUpdateDetail])

  const handleBlur = useCallback(() => {
    setEditing(false)
    onUpdateDetail?.(draft)
  }, [draft, onUpdateDetail])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditing(false)
      setDraft(detail ?? '')
    }
  }, [detail])

  return (
    <div
      className={`bg-cyan-50 text-cyan-800 rounded-lg px-4 py-2.5 border-2 shadow-sm min-w-[100px] text-center transition-colors ${
        selected ? 'border-blue-400 ring-2 ring-blue-300' : 'border-cyan-300'
      }`}
      onDoubleClick={handleDoubleClick}
    >
      <div className="text-[10px] text-cyan-500 uppercase tracking-wider mb-0.5">asset</div>
      <div className="text-xs font-semibold">{label}</div>
      {editing ? (
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          placeholder="e.g. shape, schema, version"
          className="mt-1 w-full bg-transparent text-[10px] text-cyan-700 outline-none border-b border-cyan-300 text-center nodrag"
        />
      ) : detail ? (
        <div className="text-[10px] text-cyan-600 mt-0.5">{detail}</div>
      ) : null}
      <Handle type="target" position={Position.Left} className="!bg-cyan-400 !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-cyan-400 !w-2 !h-2" />
    </div>
  )
}

export const AssetNode = memo(AssetNodeComponent)
