import { useState, useCallback, useEffect, useRef } from 'react'
import type { InteractionType, FlowNodeType } from '../types'
import { getInteractionStyle } from '../lib/flow-colors'

const ALL_EDGE_TYPES: InteractionType[] = ['kafka', 'grpc', 'https', 'db', 'internal', 'sqs', 'unknown']

type NodeKind = 'service' | 'topic' | 'scanner' | 'database' | 'flowRef' | 'asset' | 'component'

/** Returns valid edge types for a given source→target node type pair */
export function getValidEdgeTypes(sourceType?: FlowNodeType, targetType?: FlowNodeType): InteractionType[] {
  if (!sourceType || !targetType) return ALL_EDGE_TYPES

  const s = sourceType as NodeKind
  const t = targetType as NodeKind

  // service ↔ topic = kafka only
  if ((s === 'service' && t === 'topic') || (s === 'topic' && t === 'service')) return ['kafka']
  // service → service = direct communication
  if (s === 'service' && t === 'service') return ['grpc', 'https', 'internal']
  // service → database
  if (s === 'service' && t === 'database') return ['db']
  // scanner → service or service → scanner
  if ((s === 'scanner' && t === 'service') || (s === 'service' && t === 'scanner')) return ['grpc', 'https']
  // scanner → topic (possible via proxy but unusual)
  if (s === 'scanner' && t === 'topic') return ['kafka']
  // components are in-process logical units; they can only interact with services, scanners,
  // other components or assets. Topics, databases and flowRefs are addressed at the host-service level.
  if (s === 'component' || t === 'component') {
    const other = s === 'component' ? t : s
    if (other === 'topic' || other === 'database' || other === 'flowRef') return []
    return ['internal', 'grpc', 'https']
  }
  // asset as data entity: produced/consumed by services, carried by topics
  if ((s === 'service' && t === 'asset') || (s === 'asset' && t === 'service')) return ['internal', 'grpc']
  if ((s === 'topic' && t === 'asset') || (s === 'asset' && t === 'topic')) return ['kafka']
  if (s === 'asset' && t === 'database') return ['db']
  if (s === 'asset' && t === 'asset') return ['internal']

  return ALL_EDGE_TYPES
}

export interface EdgeEditState {
  edgeId: string
  type: InteractionType
  label: string
  stepNumber: number
  x: number
  y: number
  sourceType?: FlowNodeType
  targetType?: FlowNodeType
}

interface EdgeTypeModalProps {
  state: EdgeEditState
  onSave: (edgeId: string, type: InteractionType, label: string, stepNumber: number) => void
  onCancel: () => void
}

export function EdgeTypeModal({ state, onSave, onCancel }: EdgeTypeModalProps) {
  const validTypes = getValidEdgeTypes(state.sourceType, state.targetType)
  const noValid = validTypes.length === 0
  const [type, setType] = useState<InteractionType>(
    noValid ? state.type : (validTypes.includes(state.type) ? state.type : validTypes[0])
  )
  const [label, setLabel] = useState(state.label)
  const [stepNumber, setStepNumber] = useState(state.stepNumber)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter' && !noValid) onSave(state.edgeId, type, label, stepNumber)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onCancel, onSave, state.edgeId, type, label, stepNumber, noValid])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) onCancel()
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [onCancel])

  const handleSave = useCallback(() => {
    onSave(state.edgeId, type, label, stepNumber)
  }, [onSave, state.edgeId, type, label, stepNumber])

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-56"
      style={{ left: state.x, top: state.y }}
    >
      <div className="text-xs font-semibold text-gray-600 mb-2">Edge Type</div>
      {noValid ? (
        <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-2 leading-snug">
          This edge isn't allowed by the model. A component cannot connect directly to a topic, database or flow reference — route the edge through its host service instead.
        </div>
      ) : (
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
      )}
      <input
        type="text"
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder="Edge label (optional)"
        className="w-full text-xs px-2 py-1 border border-gray-200 rounded mb-2 focus:outline-none focus:border-blue-400"
        autoFocus
      />
      <div className="flex items-center gap-2 mb-2">
        <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide flex-shrink-0">Step #</label>
        <input
          type="number"
          min={1}
          value={stepNumber}
          onChange={e => setStepNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-16 text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:border-blue-400"
        />
        <span className="text-[10px] text-gray-400">order in the flow</span>
      </div>
      <div className="flex justify-end gap-1">
        <button onClick={onCancel} className="text-[10px] px-2 py-1 rounded text-gray-500 hover:bg-gray-100">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={noValid}
          className={`text-[10px] px-2 py-1 rounded text-white ${noValid ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
        >
          OK
        </button>
      </div>
    </div>
  )
}
