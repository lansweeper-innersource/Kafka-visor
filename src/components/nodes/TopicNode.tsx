import { memo, useCallback } from 'react'
import { Handle, Position, NodeToolbar, type NodeProps } from '@xyflow/react'
import type { TopicNodeData } from '../../lib/graph-builder'
import { useZoomLevel } from '../../lib/use-zoom-level'

function TopicNodeComponent({ data, selected }: NodeProps) {
  const d = data as TopicNodeData
  const { showDetail } = useZoomLevel()

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(d.label)
  }, [d.label])

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
        </div>
      </NodeToolbar>

      <div
        className={`bg-gray-900 text-white rounded-full px-4 py-2 border-2 shadow-lg min-w-[140px] text-center transition-colors ${
          selected ? 'border-white ring-2 ring-blue-400' : 'border-gray-600'
        }`}
      >
        <Handle type="target" position={Position.Left} className="!bg-green-500 !w-2 !h-2" />
        <div className="text-xs font-bold truncate max-w-[200px]" title={d.label}>
          {d.label}
        </div>
        {showDetail && (
          <div className="text-[10px] text-gray-400 mt-0.5">
            <span className="text-green-400">{d.producerCount}P</span>
            {' / '}
            <span className="text-blue-400">{d.consumerCount}C</span>
            {' / '}
            <span className="text-gray-300">{d.teamCount}T</span>
          </div>
        )}
        <Handle type="source" position={Position.Right} className="!bg-blue-500 !w-2 !h-2" />
      </div>
    </>
  )
}

export const TopicNode = memo(TopicNodeComponent)
