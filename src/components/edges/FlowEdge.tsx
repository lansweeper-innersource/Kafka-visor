import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react'
import { getInteractionStyle } from '../../lib/flow-colors'

export function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  })

  const interactionType = (data?.interactionType as string) ?? ''
  const stepNumber = data?.stepNumber as number
  const edgeLabel = data?.label as string | undefined
  const annotations = data?.annotations as { text: string; severity?: string }[] | undefined
  const colors = getInteractionStyle(interactionType)

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />

      <EdgeLabelRenderer>
        {/* Step number badge */}
        <div
          className="nopan nodrag absolute flex items-center justify-center w-5 h-5 rounded-full text-white text-[9px] font-bold border-2 border-white shadow-md"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'none',
            backgroundColor: colors.badgeBg,
          }}
        >
          {stepNumber}
        </div>

        {/* Interaction type + optional label */}
        <div
          className="nopan nodrag absolute text-[8px] font-semibold px-1.5 py-0.5 rounded-sm uppercase tracking-wide"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${(labelY ?? 0) + 16}px)`,
            pointerEvents: 'none',
            backgroundColor: colors.badgeBg,
            color: colors.badgeText,
          }}
        >
          {edgeLabel ?? interactionType}
        </div>

        {/* Annotation indicator */}
        {annotations && annotations.length > 0 && (
          <div
            className="nopan nodrag absolute text-[8px] px-1.5 py-0.5 rounded-sm max-w-[160px] truncate"
            title={annotations.map(a => a.text).join('\n')}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${(labelY ?? 0) + 32}px)`,
              pointerEvents: 'auto',
              cursor: 'help',
              backgroundColor: annotations.some(a => a.severity === 'critical') ? '#FEE2E2'
                : annotations.some(a => a.severity === 'warning') ? '#FEF3C7' : '#EFF6FF',
              color: annotations.some(a => a.severity === 'critical') ? '#991B1B'
                : annotations.some(a => a.severity === 'warning') ? '#92400E' : '#1E40AF',
            }}
          >
            {annotations[0].text}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  )
}
