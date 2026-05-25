import { useState, useCallback, useEffect, useRef } from 'react'
import type { InteractionType, FlowNodeType } from '../types'
import { getInteractionStyle } from '../lib/flow-colors'

const ALL_EDGE_TYPES: InteractionType[] = ['kafka', 'grpc', 'https', 'protobuf', 'db', 'internal', 'sensor', 'sqs', 'unknown']

type NodeKind = 'service' | 'topic' | 'scanner' | 'database' | 'flowRef' | 'asset'

/** Returns valid edge types for a given source→target node type pair */
export function getValidEdgeTypes(sourceType?: FlowNodeType, targetType?: FlowNodeType): InteractionType[] {
  if (!sourceType || !targetType) return ALL_EDGE_TYPES

  const s = sourceType as NodeKind
  const t = targetType as NodeKind

  // service ↔ topic = kafka only
  if ((s === 'service' && t === 'topic') || (s === 'topic' && t === 'service')) return ['kafka']
  // service → service = direct communication
  if (s === 'service' && t === 'service') return ['grpc', 'https', 'protobuf', 'internal']
  // service → database
  if (s === 'service' && t === 'database') return ['db']
  // scanner → service or service → scanner
  if ((s === 'scanner' && t === 'service') || (s === 'service' && t === 'scanner')) return ['grpc', 'https', 'sensor']
  // scanner → topic (possible via proxy but unusual)
  if (s === 'scanner' && t === 'topic') return ['kafka', 'sensor']
  // asset as data entity: produced/consumed by services, carried by topics
  if ((s === 'service' && t === 'asset') || (s === 'asset' && t === 'service')) return ['internal', 'protobuf', 'grpc']
  if ((s === 'topic' && t === 'asset') || (s === 'asset' && t === 'topic')) return ['kafka']
  if (s === 'asset' && t === 'database') return ['db']
  if (s === 'asset' && t === 'asset') return ['internal', 'protobuf']

  return ALL_EDGE_TYPES
}

export interface EdgeEditState {
  edgeId: string
  type: InteractionType
  label: string
  x: number
  y: number
  sourceType?: FlowNodeType
  targetType?: FlowNodeType
}

interface EdgeTypeModalProps {
  state: EdgeEditState
  onSave: (edgeId: string, type: InteractionType, label: string) => void
  onCancel: () => void
}

export function EdgeTypeModal({ state, onSave, onCancel }: EdgeTypeModalProps) {
  const validTypes = getValidEdgeTypes(state.sourceType, state.targetType)
  const [type, setType] = useState<InteractionType>(validTypes.includes(state.type) ? state.type : validTypes[0])
  const [label, setLabel] = useState(state.label)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onSave(state.edgeId, type, label)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel, onSave, state.edgeId, type, label])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) onCancel()
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [onCancel])

  const handleSave = useCallback(() => {
    onSave(state.edgeId, type, label)
  }, [onSave, state.edgeId, type, label])

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-56"
      style={{ left: state.x, top: state.y }}
    >
      <div className="text-xs font-semibold text-gray-600 mb-2">Edge Type</div>
      <div className="flex flex-wrap gap-1 mb-2">
        {validTypes.map(t => {
          const style = getInteractionStyle(t)
          return (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${type === t ? 'ring-2 ring-blue-400' : ''}`}
              style={{ backgroundColor: style.badgeBg, color: style.badgeText }}
            >
              {t}
            </button>
          )
        })}
      </div>
      <input
        type="text"
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder="Edge label (optional)"
        className="w-full text-xs px-2 py-1 border border-gray-200 rounded mb-2 focus:outline-none focus:border-blue-400"
        autoFocus
      />
      <div className="flex justify-end gap-1">
        <button onClick={onCancel} className="text-[10px] px-2 py-1 rounded text-gray-500 hover:bg-gray-100">
          Cancel
        </button>
        <button onClick={handleSave} className="text-[10px] px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600">
          OK
        </button>
      </div>
    </div>
  )
}
