import { useState, useMemo, useRef, useEffect } from 'react'
import type { TopologyData, FlowDefinition } from '../types'

interface SearchResult {
  id: string
  type: 'topic' | 'service' | 'flow'
  label: string
  detail: string
}

interface SearchBarProps {
  topology: TopologyData
  flows: FlowDefinition[]
  onSelect: (result: SearchResult) => void
}

export type { SearchResult }

export function SearchBar({ topology, flows, onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    if (query.length < 2) return []
    const q = query.toLowerCase()
    const matches: SearchResult[] = []

    // Flows first
    for (const flow of flows) {
      if (flow.name.toLowerCase().includes(q) || flow.id.toLowerCase().includes(q)) {
        matches.push({
          id: flow.id,
          type: 'flow',
          label: flow.name,
          detail: `${flow.nodes.length} nodes — ${flow.description}`,
        })
      }
    }

    for (const topic of Object.values(topology.topics)) {
      if (topic.id.toLowerCase().includes(q)) {
        matches.push({
          id: topic.id,
          type: 'topic',
          label: topic.id,
          detail: `${topic.producerCount}P / ${topic.consumerCount}C / ${topic.teamCount} teams`,
        })
      }
    }

    for (const svc of Object.values(topology.services)) {
      if (svc.id.toLowerCase().includes(q)) {
        matches.push({
          id: svc.id,
          type: 'service',
          label: svc.id,
          detail: `${svc.team} - ${svc.produces.length}P / ${svc.consumes.length}C`,
        })
      }
    }

    return matches.slice(0, 15)
  }, [query, topology])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as HTMLElement)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Keyboard shortcut: Ctrl+K / Cmd+K to focus
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-3 py-1.5">
        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search topics or services... (Ctrl+K)"
          className="bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none w-64"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setIsOpen(false) }}
            className="text-gray-400 hover:text-gray-600 text-xs"
          >
            x
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto">
          {results.map(r => (
            <button
              key={`${r.type}:${r.id}`}
              onClick={() => {
                onSelect(r)
                setQuery('')
                setIsOpen(false)
              }}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50 last:border-0"
            >
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  r.type === 'flow'
                    ? 'bg-purple-700 text-white'
                    : r.type === 'topic'
                    ? 'bg-gray-900 text-white'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {r.type === 'flow' ? 'F' : r.type === 'topic' ? 'T' : 'S'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-gray-800 truncate">{r.label}</div>
                <div className="text-[10px] text-gray-400">{r.detail}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 mt-1 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-3 text-xs text-gray-400 text-center">
          No results for "{query}"
        </div>
      )}
    </div>
  )
}
