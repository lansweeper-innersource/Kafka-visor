import { memo, useCallback } from 'react'
import { Handle, Position, NodeToolbar, type NodeProps } from '@xyflow/react'
import type { ServiceNodeData } from '../../lib/graph-builder'
import { useZoomLevel } from '../../lib/use-zoom-level'

function ServiceNodeComponent({ data, selected }: NodeProps) {
  const d = data as ServiceNodeData
  const { showDetail } = useZoomLevel()

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
            Copy namespace
          </button>
        </div>
      </NodeToolbar>

      <div
        className={`bg-white rounded-lg px-3 py-1.5 shadow-md min-w-[120px] text-center transition-all ${
          selected ? 'ring-2 ring-blue-400' : ''
        }`}
        style={{ borderLeft: `4px solid ${d.teamColor}` }}
      >
        <Handle type="target" position={Position.Left} className="!bg-blue-500 !w-2 !h-2" />
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
