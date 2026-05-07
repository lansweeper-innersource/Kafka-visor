import { useCallback, useEffect, useRef } from 'react'
import type { Node } from '@xyflow/react'
import type { ServiceNodeData } from '../lib/graph-builder'

export interface ContextMenuState {
  node: Node
  x: number
  y: number
}

interface ContextMenuProps {
  menu: ContextMenuState
  onClose: () => void
  onFilterToTeam: (team: string) => void
  onShowDetails: (node: Node) => void
}

export function ContextMenu({ menu, onClose, onFilterToTeam, onShowDetails }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { node, x, y } = menu

  const label = node.data.label as string
  const isService = node.type === 'service'
  const team = isService ? (node.data as ServiceNodeData).team : null

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(label)
    onClose()
  }, [label, onClose])

  const handleFilterTeam = useCallback(() => {
    if (team) onFilterToTeam(team)
    onClose()
  }, [team, onFilterToTeam, onClose])

  const handleDetails = useCallback(() => {
    onShowDetails(node)
    onClose()
  }, [node, onShowDetails, onClose])

  // Close on outside click or escape
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 min-w-[180px]"
      style={{ top: y, left: x }}
    >
      <div className="px-3 py-1.5 text-[10px] text-gray-400 font-mono truncate max-w-[220px] border-b border-gray-100">
        {label}
      </div>

      <MenuItem label="Copy name" onClick={handleCopy} />
      <MenuItem label="Show details" onClick={handleDetails} />

      {isService && team && (
        <MenuItem label={`Filter to ${team}`} onClick={handleFilterTeam} />
      )}
    </div>
  )
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
    >
      {label}
    </button>
  )
}
