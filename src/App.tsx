import { useState, useCallback, useRef, useMemo } from 'react'
import { ReactFlowProvider, useReactFlow, type Node } from '@xyflow/react'
import { FlowCanvas } from './components/FlowCanvas'
import { TeamFilter } from './components/TeamFilter'
import { DetailPanel } from './components/DetailPanel'
import { SearchBar, type SearchResult } from './components/SearchBar'
import { ContextMenu, type ContextMenuState } from './components/ContextMenu'
import { NodePalette } from './components/NodePalette'
import { EdgeTypeModal, type EdgeEditState } from './components/EdgeTypeModal'
import { useDownloadImage } from './lib/use-download-image'
import { buildGraph } from './lib/graph-builder'
import { serializeFlow } from './lib/flow-serializer'
import { getInteractionStyle } from './lib/flow-colors'
import type { TopologyData, FlowDefinition, InteractionType } from './types'
import topologyData from './data/topology.json'
import { flows as builtInFlows } from './data/load-flows'
import './index.css'

const topology = topologyData as TopologyData

function NewFlowModal({ onCreate, onCancel }: { onCreate: (id: string, name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="bg-white rounded-lg shadow-xl p-5 w-96" onClick={e => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-gray-800 mb-3">New Flow</h2>
        <label className="block text-xs text-gray-600 mb-1">Flow name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Asset Data Path — Discovery"
          className="w-full text-sm px-3 py-1.5 border border-gray-300 rounded mb-1 focus:outline-none focus:border-blue-400"
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) onCreate(id, name.trim()) }}
        />
        <div className="text-[10px] text-gray-400 mb-4">
          File: <span className="font-mono">{id || '...'}.json</span>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="text-xs px-3 py-1 rounded text-gray-500 hover:bg-gray-100">Cancel</button>
          <button
            onClick={() => name.trim() && onCreate(id, name.trim())}
            disabled={!name.trim()}
            className="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

function FlowDescription({ description }: { description: string }) {
  const [expanded, setExpanded] = useState(false)
  if (!description) return null
  if (description.length <= 100) {
    return <span className="text-xs text-purple-600">{description}</span>
  }
  return (
    <div className="flex items-baseline gap-2 min-w-0">
      <span className={`text-xs text-purple-600 ${expanded ? 'whitespace-normal' : 'truncate max-w-xl'}`}>
        {description}
      </span>
      <button
        onClick={() => setExpanded(v => !v)}
        className="text-[11px] text-purple-500 hover:text-purple-700 underline flex-shrink-0"
      >
        {expanded ? 'less' : 'more'}
      </button>
    </div>
  )
}

function AppInner() {
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [activeFlow, setActiveFlow] = useState<FlowDefinition | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [edgeEdit, setEdgeEdit] = useState<EdgeEditState | null>(null)
  const [flowMeta, setFlowMeta] = useState({ id: '', name: '', description: '' })
  const [loadedFlows, setLoadedFlows] = useState<FlowDefinition[]>([])

  const flows = useMemo(
    () => [...builtInFlows, ...loadedFlows.filter(lf => !builtInFlows.some(bf => bf.id === lf.id))],
    [loadedFlows]
  )
  const focusCounter = useRef(0)
  const downloadImage = useDownloadImage()
  const { getNodes, getEdges, setEdges } = useReactFlow()

  const highlightNodeId = selectedNode?.id ?? null

  const handleToggleTeam = useCallback((team: string) => {
    setSelectedTeams(prev => {
      const next = new Set(prev)
      if (next.has(team)) next.delete(team)
      else next.add(team)
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedTeams(new Set(Object.keys(topology.teams)))
  }, [])

  const handleSelectNone = useCallback(() => {
    setSelectedTeams(new Set())
    setSelectedNode(null)
  }, [])

  const handleNodeClick = useCallback((node: Node | null) => {
    // Purely visual / interactive nodes don't have a detail panel.
    if (node && (node.type === 'stickyNote' || node.type === 'flowRef')) {
      setSelectedNode(null)
      return
    }
    setSelectedNode(node)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedNode(null)
  }, [])

  const navigateToNode = useCallback((id: string, type: 'topic' | 'service') => {
    // If in flow mode, exit first
    if (activeFlow) {
      setActiveFlow(null)
    }

    const nodeId = `${type}:${id}`

    if (type === 'service') {
      const svc = topology.services[id]
      if (svc) {
        setSelectedTeams(prev => {
          if (prev.has(svc.team)) return prev
          const next = new Set(prev)
          next.add(svc.team)
          return next
        })
      }
    } else {
      const topic = topology.topics[id]
      if (topic) {
        const touchingTeams = new Set<string>()
        for (const svcId of [...topic.consumers, ...topic.producers]) {
          const svc = topology.services[svcId]
          if (svc) touchingTeams.add(svc.team)
        }
        setSelectedTeams(prev => {
          const next = new Set(prev)
          for (const t of touchingTeams) next.add(t)
          return next
        })
      }
    }

    const { nodes } = buildGraph(topology)
    const targetNode = nodes.find(n => n.id === nodeId)
    if (targetNode) setSelectedNode(targetNode)

    focusCounter.current++
    setFocusNodeId(`${nodeId}::${focusCounter.current}`)
  }, [activeFlow])

  const handleOpenFlow = useCallback((flowId: string) => {
    const flow = flows.find(f => f.id === flowId)
    if (flow) {
      setActiveFlow(flow)
      setSelectedNode(null)
    }
  }, [flows])

  const handleSearchSelect = useCallback((result: SearchResult) => {
    if (result.type === 'flow') {
      handleOpenFlow(result.id)
      return
    }
    navigateToNode(result.id, result.type)
  }, [navigateToNode, handleOpenFlow])

  const handleExitFlowMode = useCallback(() => {
    setActiveFlow(null)
    setSelectedNode(null)
  }, [])

  const handleFilterToTeam = useCallback((team: string) => {
    setSelectedTeams(new Set([team]))
  }, [])

  const handleContextMenuShowDetails = useCallback((node: Node) => {
    setSelectedNode(node)
  }, [])

  // --- Flow editing ---
  const [showNewFlowModal, setShowNewFlowModal] = useState(false)

  const handleNewFlow = useCallback(() => {
    setShowNewFlowModal(true)
  }, [])

  const handleCreateFlow = useCallback((id: string, name: string) => {
    setShowNewFlowModal(false)
    setFlowMeta({ id, name, description: '' })
    setActiveFlow({ id, name, description: '', nodes: [], edges: [] })
    setIsEditing(true)
    setSelectedNode(null)
  }, [])

  const handleEditFlow = useCallback(() => {
    if (!activeFlow) return
    setFlowMeta({ id: activeFlow.id, name: activeFlow.name, description: activeFlow.description })
    setIsEditing(true)
  }, [activeFlow])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEdgeEdit(null)
    if (!activeFlow?.nodes.length) {
      setActiveFlow(null)
    }
  }, [activeFlow])

  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  const handleSaveFlow = useCallback(async () => {
    const nodes = getNodes()
    const edges = getEdges()
    const flow = serializeFlow(nodes, edges, flowMeta)

    try {
      const res = await fetch('/api/save-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flow, null, 2),
      })
      if (!res.ok) throw new Error('save failed')
      setSaveStatus(`Saved to src/data/flows/${flow.id}.json`)
    } catch {
      // Fallback: browser download
      const json = JSON.stringify(flow, null, 2) + '\n'
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${flowMeta.id || 'flow'}.json`
      a.click()
      URL.revokeObjectURL(url)
      setSaveStatus('Downloaded (dev server not available)')
    }

    // Update in-memory state so the flow reflects changes without reload
    setActiveFlow(flow)
    setLoadedFlows(prev => [...prev.filter(f => f.id !== flow.id), flow])
    setIsEditing(false)

    setTimeout(() => setSaveStatus(null), 3000)
  }, [getNodes, getEdges, flowMeta])

  const handleLoadFlow = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        const flow = JSON.parse(reader.result as string) as FlowDefinition
        setLoadedFlows(prev => [...prev.filter(f => f.id !== flow.id), flow])
        setActiveFlow(flow)
        setFlowMeta({ id: flow.id, name: flow.name, description: flow.description })
        setSelectedNode(null)
      }
      reader.readAsText(file)
    }
    input.click()
  }, [])

  const handleEdgeSave = useCallback((edgeId: string, type: InteractionType, label: string, stepNumber: number) => {
    const style = getInteractionStyle(type)
    setEdges(eds => eds.map(e => {
      if (e.id !== edgeId) return e
      return {
        ...e,
        data: { ...e.data, interactionType: type, label, stepNumber },
        style: { stroke: style.stroke, strokeWidth: 2.5 },
        markerEnd: { type: 'arrowclosed' as const, color: style.stroke, width: 16, height: 16 },
      }
    }))
    setEdgeEdit(null)
  }, [setEdges])

  const cleanFocusNodeId = focusNodeId?.split('::')[0] ?? null

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-gray-800">Kafka Visor</h1>
          {activeFlow ? (
            <span className="text-xs text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded">
              Flow: {activeFlow.name}
            </span>
          ) : (
            <span className="text-xs text-gray-400">Topology Map</span>
          )}
        </div>

        <SearchBar topology={topology} flows={flows} onSelect={handleSearchSelect} />

        <div className="flex items-center gap-4 text-xs text-gray-500">
          {!activeFlow && (
            <>
              <span>{topology.metadata.totalTopics} topics</span>
              <span>{topology.metadata.totalServices} services</span>
              <span>{topology.metadata.totalTeams} teams</span>
            </>
          )}
          {!isEditing && (
            <>
              <button
                onClick={handleNewFlow}
                className="px-2 py-1 rounded bg-green-100 hover:bg-green-200 text-green-700 font-semibold"
              >
                + New Flow
              </button>
              <button
                onClick={handleLoadFlow}
                className="px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700"
              >
                Load Flow
              </button>
            </>
          )}
          <button
            onClick={downloadImage}
            className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600"
            title="Download as PNG"
          >
            Export PNG
          </button>
        </div>
      </header>

      {/* Flow mode banner OR Legend */}
      {activeFlow ? (
        <div className={`border-b px-4 py-2 flex items-center justify-between flex-shrink-0 ${isEditing ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'}`}>
          <div className="flex items-center gap-3">
            {!isEditing && (
              <button
                onClick={handleExitFlowMode}
                className="text-xs text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1"
              >
                ← Back to topology
              </button>
            )}
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={flowMeta.id}
                  onChange={e => setFlowMeta(m => ({ ...m, id: e.target.value }))}
                  placeholder="flow-id"
                  className="text-xs px-2 py-0.5 border border-green-300 rounded w-32 focus:outline-none focus:border-green-500"
                />
                <input
                  type="text"
                  value={flowMeta.name}
                  onChange={e => setFlowMeta(m => ({ ...m, name: e.target.value }))}
                  placeholder="Flow Name"
                  className="text-xs px-2 py-0.5 border border-green-300 rounded w-48 focus:outline-none focus:border-green-500"
                />
                <input
                  type="text"
                  value={flowMeta.description}
                  onChange={e => setFlowMeta(m => ({ ...m, description: e.target.value }))}
                  placeholder="Description..."
                  className="text-xs px-2 py-0.5 border border-green-300 rounded w-64 focus:outline-none focus:border-green-500"
                />
              </div>
            ) : (
              <FlowDescription key={activeFlow.id} description={activeFlow.description} />
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveFlow}
                  className="text-[11px] px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 font-semibold"
                  title="Save to src/data/flows/"
                >
                  Save Flow
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="text-[11px] px-2 py-1 rounded text-gray-600 hover:bg-gray-200"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleEditFlow}
                  className="text-[11px] px-2 py-1 rounded bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold"
                >
                  Edit Flow
                </button>
                <div className="flex items-center gap-4 text-[11px] text-purple-500">
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-0.5 bg-green-500 inline-block" /> kafka
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-0.5 bg-purple-500 inline-block" /> grpc
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-0.5 bg-orange-500 inline-block" /> https
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-4 h-0.5 bg-amber-500 inline-block" /> db
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white border-b border-gray-100 px-4 py-1.5 flex items-center gap-6 text-[11px] text-gray-500 flex-shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-green-500 inline-block" />
            Producer (solid)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 border-t-2 border-dashed border-blue-500 inline-block" />
            Consumer (dashed)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-gray-900 rounded-full inline-block" />
            Topic
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-white border-l-4 border-blue-500 inline-block" />
            Service
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-700 text-white">F</span>
            Workflow / Flow
            <span className="text-gray-400 ml-1">— search to open ({flows.length} available)</span>
          </span>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {isEditing ? (
          <NodePalette topology={topology} />
        ) : !activeFlow ? (
          <TeamFilter
            topology={topology}
            selectedTeams={selectedTeams}
            onToggleTeam={handleToggleTeam}
            onSelectAll={handleSelectAll}
            onSelectNone={handleSelectNone}
          />
        ) : null}

        <div className="flex-1 relative">
          <FlowCanvas
            topology={topology}
            selectedTeams={selectedTeams}
            onNodeClick={handleNodeClick}
            focusNodeId={cleanFocusNodeId}
            highlightNodeId={highlightNodeId}
            onContextMenu={setContextMenu}
            activeFlow={activeFlow}
            flows={flows}
            onFlowNavigate={handleOpenFlow}
            isEditing={isEditing}
            onEdgeEdit={setEdgeEdit}
          />

          {contextMenu && (
            <ContextMenu
              menu={contextMenu}
              onClose={() => setContextMenu(null)}
              onFilterToTeam={handleFilterToTeam}
              onShowDetails={handleContextMenuShowDetails}
            />
          )}

          {edgeEdit && (
            <EdgeTypeModal
              state={edgeEdit}
              onSave={handleEdgeSave}
              onCancel={() => setEdgeEdit(null)}
            />
          )}
        </div>

        <DetailPanel
          node={selectedNode}
          topology={topology}
          flows={flows}
          onClose={handleCloseDetail}
          onNavigate={navigateToNode}
          onOpenFlow={handleOpenFlow}
          isFlowMode={!!activeFlow}
        />
      </div>

      {/* New Flow modal */}
      {showNewFlowModal && <NewFlowModal onCreate={handleCreateFlow} onCancel={() => setShowNewFlowModal(false)} />}

      {/* Save status toast */}
      {saveStatus && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-4 py-2 rounded-lg shadow-lg z-50">
          {saveStatus}
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  )
}

export default App
