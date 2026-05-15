import { memo, useCallback, useState } from 'react'
import type { NodeProps } from '@xyflow/react'

function StickyNoteNodeComponent({ data, selected }: NodeProps) {
  const text = data.text as string
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)
  const onUpdate = data.onUpdate as ((text: string) => void) | undefined

  const handleDoubleClick = useCallback(() => {
    setDraft(text)
    setEditing(true)
  }, [text])

  const handleBlur = useCallback(() => {
    setEditing(false)
    onUpdate?.(draft)
  }, [draft, onUpdate])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditing(false)
      setDraft(text)
    }
  }, [text])

  return (
    <div
      className={`bg-yellow-100 rounded px-3 py-2 shadow-sm min-w-[120px] border border-yellow-300 transition-all ${
        selected ? 'ring-2 ring-blue-400' : ''
      }`}
      onDoubleClick={handleDoubleClick}
    >
      {editing ? (
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full bg-transparent text-[11px] text-yellow-900 resize outline-none min-h-[40px] min-w-[100px] nodrag"
          rows={3}
        />
      ) : (
        <div className="text-[11px] text-yellow-900 whitespace-pre-wrap leading-snug min-h-[20px]">
          {text || 'Double-click to edit...'}
        </div>
      )}
    </div>
  )
}

export const StickyNoteNode = memo(StickyNoteNodeComponent)
