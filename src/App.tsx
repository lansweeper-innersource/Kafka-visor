import { useState, useCallback } from 'react'
import { ReactFlowProvider, type Node } from '@xyflow/react'
import { FlowCanvas } from './components/FlowCanvas'
import { TeamFilter } from './components/TeamFilter'
import { DetailPanel } from './components/DetailPanel'
import type { TopologyData } from './types'
import topologyData from './data/topology.json'
import './index.css'

const topology = topologyData as TopologyData

function App() {
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set())
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  const handleToggleTeam = useCallback((team: string) => {
    setSelectedTeams(prev => {
      const next = new Set(prev)
      if (next.has(team)) {
        next.delete(team)
      } else {
        next.add(team)
      }
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

  const handleNodeClick = useCallback((node: Node) => {
    setSelectedNode(node)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedNode(null)
  }, [])

  return (
    <ReactFlowProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-800">Kafka Visor</h1>
            <span className="text-xs text-gray-400">Topology Map</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{topology.metadata.totalTopics} topics</span>
            <span>{topology.metadata.totalServices} services</span>
            <span>{topology.metadata.totalTeams} teams</span>
            <span className="text-gray-400">Data: {topology.metadata.dataCollectionDate}</span>
          </div>
        </header>

        {/* Legend */}
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
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          <TeamFilter
            topology={topology}
            selectedTeams={selectedTeams}
            onToggleTeam={handleToggleTeam}
            onSelectAll={handleSelectAll}
            onSelectNone={handleSelectNone}
          />

          <div className="flex-1">
            <FlowCanvas
              topology={topology}
              selectedTeams={selectedTeams}
              onNodeClick={handleNodeClick}
            />
          </div>

          <DetailPanel
            node={selectedNode}
            topology={topology}
            onClose={handleCloseDetail}
          />
        </div>
      </div>
    </ReactFlowProvider>
  )
}

export default App
