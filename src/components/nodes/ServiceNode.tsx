import { memo, useCallback } from 'react'
import { Handle, Position, NodeToolbar, type NodeProps } from '@xyflow/react'
import type { ServiceNodeData } from '../../lib/graph-builder'
import { useZoomLevel } from '../../lib/use-zoom-level'

const KIND_BADGE: Record<string, { label: string; class: string }> = {
  CronJob:          { label: 'cron',     class: 'bg-violet-100 text-violet-700' },
  CronWorkflow:     { label: 'cron-wf',  class: 'bg-violet-100 text-violet-700' },
  ScaledJob:        { label: 'scaled',   class: 'bg-cyan-100 text-cyan-700' },
  WorkflowTemplate: { label: 'wf-tpl',   class: 'bg-rose-100 text-rose-700' },
  Rollout:          { label: 'rollout',  class: 'bg-sky-100 text-sky-700' },
}

const WORKFLOW_DEPLOYMENT_TYPES = new Set(['WorkflowTemplate', 'CronWorkflow'])

function isWorkflowService(d: ServiceNodeData): boolean {
  return WORKFLOW_DEPLOYMENT_TYPES.has(d.deploymentType) || /workflow/i.test(d.label)
}

function ServiceNodeComponent({ data, selected }: NodeProps) {
  const d = data as ServiceNodeData
  const { showDetail } = useZoomLevel()
  const workflow = isWorkflowService(d)
  const badge = workflow && !KIND_BADGE[d.deploymentType]
    ? { label: 'workflow', class: 'bg-rose-100 text-rose-700' }
    : KIND_BADGE[d.deploymentType]

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
        className={`rounded-lg px-3 py-1.5 shadow-md min-w-[120px] text-center transition-all ${
          workflow ? 'bg-rose-50 border-2 border-dashed border-rose-300' : 'bg-white'
        } ${selected ? 'ring-2 ring-blue-400' : ''} ${!workflow && badge ? 'border-dashed' : ''}`}
        style={workflow ? undefined : { borderLeft: `4px solid ${d.teamColor}` }}
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
          <>
            <div className="text-[10px] text-gray-500">
              {d.serviceGroup ? (
                <span className="text-orange-600" title={`Shared image: ${d.serviceGroup}`}>
                  via {d.sourceRepos?.[0]?.name ?? d.serviceGroup}
                </span>
              ) : (
                d.team
              )}
              {!d.runningInCluster && (
                <span className="ml-1 text-amber-600" title="Not found in cluster">
                  ⚠
                </span>
              )}
            </div>
            {d.sourceSiblings && d.sourceSiblings.length > 0 && (
              <div className="text-[9px] text-gray-400 mt-0.5" title={`${d.sourceSiblings.length} other service${d.sourceSiblings.length > 1 ? 's' : ''} from ${d.sourceRepoName}`}>
                {d.sourceRepoName} <span className="text-gray-300">+{d.sourceSiblings.length}</span>
              </div>
            )}
          </>
        )}

        <Handle type="source" position={Position.Right} className="!bg-green-500 !w-2 !h-2" />
      </div>
    </>
  )
}

export const ServiceNode = memo(ServiceNodeComponent)
