import { useState, useCallback, type DragEvent } from 'react'
import type { TopologyData, FlowNodeType, ScannerVariant } from '../types'

interface NodePaletteProps {
  topology: TopologyData
}

interface PaletteItem {
  id: string
  type: FlowNodeType
  label: string
  category: 'service' | 'topic' | 'other'
}

interface AdHocType {
  type: FlowNodeType
  label: string
  variant?: ScannerVariant
}

const AD_HOC_TYPES: AdHocType[] = [
  { type: 'scanner', label: 'Scanner (on-prem)', variant: 'onprem' },
  { type: 'scanner', label: 'Scanner (vnext)', variant: 'vnext' },
  { type: 'scanner', label: 'Scanner (generic)' },
  { type: 'database', label: 'Database' },
  { type: 'asset', label: 'Asset' },
  { type: 'component', label: 'Component (in-service)' },
  { type: 'workflow', label: 'Workflow' },
  { type: 'stickyNote', label: 'Sticky Note' },
  { type: 'flowRef', label: 'Flow Reference' },
]

export function NodePalette({ topology }: NodePaletteProps) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'service' | 'topic' | 'database' | 'other'>('service')

  const items: PaletteItem[] = (() => {
    const result: PaletteItem[] = []
    if (tab === 'service') {
      for (const [id, svc] of Object.entries(topology.services)) {
        result.push({ id, type: 'service', label: svc.description ?? id, category: 'service' })
      }
    } else if (tab === 'topic') {
      for (const id of Object.keys(topology.topics)) {
        result.push({ id, type: 'topic', label: id, category: 'topic' })
      }
    } else if (tab === 'database') {
      const dbSet = new Set<string>()
      for (const svc of Object.values(topology.services)) {
        for (const db of svc.databases ?? []) dbSet.add(db)
      }
      for (const db of [...dbSet].sort()) {
        result.push({ id: db, type: 'database', label: db, category: 'other' })
      }
    }
    result.sort((a, b) => a.id.localeCompare(b.id))
    return result
  })()

  const filtered = search
    ? items.filter(it => it.id.toLowerCase().includes(search.toLowerCase()) || it.label.toLowerCase().includes(search.toLowerCase()))
    : items

  const onDragStart = useCallback((e: DragEvent, item: { id: string; type: FlowNodeType; label: string; variant?: ScannerVariant }) => {
    e.dataTransfer.setData('application/kafka-visor-node', JSON.stringify(item))
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  return (
    <div className="w-60 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="text-xs font-semibold text-gray-600 mb-1.5">Node Palette</div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:border-blue-400"
        />
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {(['service', 'topic', 'database', 'other'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-[10px] px-2 py-0.5 rounded ${tab === t ? 'bg-blue-100 text-blue-700 font-semibold' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {t === 'other' ? 'Other' : t === 'service' ? 'Services' : t === 'database' ? 'DBs' : 'Topics'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'other' ? (
          <div className="p-2 space-y-1">
            {AD_HOC_TYPES.map(({ type, label, variant }) => (
              <div
                key={`${type}-${variant ?? 'default'}`}
                draggable
                onDragStart={e => onDragStart(e, { id: type, type, label, variant })}
                className="text-xs px-2 py-1.5 rounded border border-dashed border-gray-300 cursor-grab hover:bg-gray-50 text-gray-600"
              >
                {label}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-1">
            {filtered.map(item => (
              <div
                key={item.id}
                draggable
                onDragStart={e => onDragStart(e, { id: item.id, type: item.type, label: item.label })}
                className="text-[11px] px-2 py-1 rounded cursor-grab hover:bg-blue-50 truncate text-gray-700"
                title={item.id}
              >
                {item.id}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-xs text-gray-400 px-2 py-4 text-center">No matches</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
