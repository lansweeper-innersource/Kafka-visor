import { memo, useCallback } from 'react'
import { Handle, Position, NodeToolbar, type NodeProps } from '@xyflow/react'
import type { ServiceNodeData } from '../../lib/graph-builder'
import { useZoomLevel } from '../../lib/use-zoom-level'

const KIND_BADGE: Record<string, { label: string; class: string }> = {
  CronJob:          { label: 'cron',     class: 'bg-violet-100 text-violet-700' },
  ScaledJob:        { label: 'scaled',   class: 'bg-cyan-100 text-cyan-700' },
  WorkflowTemplate: { label: 'wf-tpl',   class: 'bg-rose-100 text-rose-700' },
  Rollout:          { label: 'rollout',  class: 'bg-sky-100 text-sky-700' },
}

function ServiceNodeComponent({ data, selected }: NodeProps) {
  const d = data as ServiceNodeData
  const { showDetail } = useZoomLevel()
  const badge = KIND_BADGE[d.deploymentType]

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(d.label)
  }, [d.label])

  const handleCopyNamespace = useCallback(() => {
    navigator.clipboard.writeText(d.namespace)
  }, [d.namespace])

  return (
    <>
      <NodeToolbar isVisible={selected} position={Position.Top}>
        <div className="flex gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1">
          <button
            onClick={handleCopy}
            className="text-[10px] px-2 py-1 rounded hover:bg-gray-100 text-gray-700"
          >
            Copy name
          </button>
          <button
            onClick={handleCopyNamespace}
            className="text-[10px] px-2 py-1 rounded hover:bg-gray-100 text-gray-700"
          >
            Copy ns
          </button>
          {d.sourceRepos?.[0]?.url && (
            <a
              href={d.sourceRepos[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] px-2 py-1 rounded hover:bg-gray-100 text-blue-600 nodrag"
            >
              Code
            </a>
          )}
          {d.githubUrl && (
            <a
              href={d.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] px-2 py-1 rounded hover:bg-gray-100 text-blue-600 nodrag"
            >
              Deploy
            </a>
          )}
        </div>
      </NodeToolbar>

      <div
        className={`bg-white rounded-lg px-3 py-1.5 shadow-md min-w-[120px] text-center transition-all ${
          selected ? 'ring-2 ring-blue-400' : ''
        } ${badge ? 'border-dashed' : ''}`}
        style={{ borderLeft: `4px solid ${d.teamColor}` }}
      >
        <Handle type="target" position={Position.Left} className="!bg-blue-500 !w-2 !h-2" />

        {/* Deployment type badge for non-Deployment kinds */}
        {badge && showDetail && (
          <div className="mb-0.5">
            <span className={`text-[8px] font-bold uppercase px-1 py-0.5 rounded ${badge.class}`}>
              {badge.label}
            </span>
          </div>
        )}

        <div className="text-xs font-semibold text-gray-800 truncate max-w-[180px]" title={d.label}>
          {d.label}
        </div>

        {showDetail && (
          <div className="text-[10px] text-gray-500">
            {d.team}
            {!d.runningInCluster && (
              <span className="ml-1 text-amber-600" title="Not found in cluster">
                ⚠
              </span>
            )}
          </div>
        )}

        <Handle type="source" position={Position.Right} className="!bg-green-500 !w-2 !h-2" />
      </div>
    </>
  )
}

export const ServiceNode = memo(ServiceNodeComponent)
