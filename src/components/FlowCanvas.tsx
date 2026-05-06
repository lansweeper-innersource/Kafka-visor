import { useCallback, useEffect, useRef } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  MarkerType,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type DefaultEdgeOptions,
} from '@xyflow/react'
import { TopicNode } from './nodes/TopicNode'
import { ServiceNode } from './nodes/ServiceNode'
import { useElkLayout } from '../lib/use-elk-layout'
import type { TopologyData } from '../types'
import { buildGraph, filterByTeams } from '../lib/graph-builder'

// CRITICAL: Define outside component to prevent remounts
const nodeTypes = {
  topic: TopicNode,
  service: ServiceNode,
}

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
}

interface FlowCanvasProps {
  topology: TopologyData
  selectedTeams: Set<string>
  onNodeClick: (node: Node) => void
}

export function FlowCanvas({ topology, selectedTeams, onNodeClick }: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const layoutNodes = useElkLayout()
  const layoutDone = useRef(false)
  const prevTeamsRef = useRef<string>('')

  // Build and filter graph when teams change
  useEffect(() => {
    const teamsKey = [...selectedTeams].sort().join(',')
    if (teamsKey === prevTeamsRef.current && layoutDone.current) return
    prevTeamsRef.current = teamsKey

    const { nodes: rawNodes, edges: rawEdges } = buildGraph(topology)

    // Style edges
    const styledEdges = rawEdges.map(e => ({
      ...e,
      style: {
        stroke: e.data?.type === 'producer' ? '#22C55E' : '#3B82F6',
        strokeWidth: 1.5,
        strokeDasharray: e.data?.type === 'consumer' ? '5 5' : undefined,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: e.data?.type === 'producer' ? '#22C55E' : '#3B82F6',
        width: 15,
        height: 15,
      },
    }))

    const filtered = filterByTeams(rawNodes, styledEdges, selectedTeams)

    setNodes(filtered.nodes)
    setEdges(filtered.edges)

    // Layout after a tick so nodes are measured
    if (selectedTeams.size > 0) {
      layoutDone.current = false
      setTimeout(() => {
        layoutNodes(filtered.nodes, filtered.edges).then(() => {
          layoutDone.current = true
        })
      }, 50)
    }
  }, [topology, selectedTeams, setNodes, setEdges, layoutNodes])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick(node)
    },
    [onNodeClick]
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange as OnNodesChange<Node>}
      onEdgesChange={onEdgesChange as OnEdgesChange<Edge>}
      onNodeClick={handleNodeClick}
      nodeTypes={nodeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      onlyRenderVisibleElements
      fitView
      proOptions={{ hideAttribution: true }}
      minZoom={0.05}
      maxZoom={2}
    >
      <Controls position="bottom-right" />
      <MiniMap
        position="bottom-left"
        nodeColor={(node) => {
          if (node.type === 'topic') return '#1F2937'
          return (node.data as { teamColor?: string }).teamColor ?? '#6B7280'
        }}
        maskColor="rgba(0,0,0,0.1)"
        className="!bg-gray-50 !border-gray-200"
      />
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
    </ReactFlow>
  )
}
