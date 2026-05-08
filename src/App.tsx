import { useState, useCallback, useRef } from 'react'
import { ReactFlowProvider, type Node } from '@xyflow/react'
import { FlowCanvas } from './components/FlowCanvas'
import { TeamFilter } from './components/TeamFilter'
import { DetailPanel } from './components/DetailPanel'
import { SearchBar, type SearchResult } from './components/SearchBar'
import { ContextMenu, type ContextMenuState } from './components/ContextMenu'
import { useDownloadImage } from './lib/use-download-image'
import { buildGraph } from './lib/graph-builder'
import type { TopologyData, FlowDefinition } from './types'
import topologyData from './data/topology.json'
import flowsData from './data/flows.json'
import './index.css'

const topology = topologyData as TopologyData
const flows = flowsData as FlowDefinition[]

function AppInner() {
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [activeFlow, setActiveFlow] = useState<FlowDefinition | null>(null)
  const focusCounter = useRef(0)
  const downloadImage = useDownloadImage()

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
  }, [])

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
        <div className="bg-purple-50 border-b border-purple-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleExitFlowMode}
              className="text-xs text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1"
            >
              ← Back to topology
            </button>
            <span className="text-xs text-purple-600">{activeFlow.description}</span>
          </div>
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
        {!activeFlow && (
          <TeamFilter
            topology={topology}
            selectedTeams={selectedTeams}
            onToggleTeam={handleToggleTeam}
            onSelectAll={handleSelectAll}
            onSelectNone={handleSelectNone}
          />
        )}

        <div className="flex-1 relative">
          <FlowCanvas
            topology={topology}
            selectedTeams={selectedTeams}
            onNodeClick={handleNodeClick}
            focusNodeId={cleanFocusNodeId}
            highlightNodeId={highlightNodeId}
            onContextMenu={setContextMenu}
            activeFlow={activeFlow}
          />

          {contextMenu && (
            <ContextMenu
              menu={contextMenu}
              onClose={() => setContextMenu(null)}
              onFilterToTeam={handleFilterToTeam}
              onShowDetails={handleContextMenuShowDetails}
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
        />
      </div>
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
