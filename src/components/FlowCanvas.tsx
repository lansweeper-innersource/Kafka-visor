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
  useReactFlow,
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
import { buildGraph, filterByTeams, getNeighborIds } from '../lib/graph-builder'

// CRITICAL: Define outside component to prevent remounts
const nodeTypes = {
  topic: TopicNode,
  service: ServiceNode,
}

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
}

const PRODUCER_COLOR = '#22C55E'
const CONSUMER_COLOR = '#3B82F6'
const DIM_OPACITY = 0.15

function styleEdge(e: Edge): Edge {
  const isProducer = e.data?.type === 'producer'
  return {
    ...e,
    style: {
      stroke: isProducer ? PRODUCER_COLOR : CONSUMER_COLOR,
      strokeWidth: 1.5,
      strokeDasharray: isProducer ? undefined : '5 5',
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: isProducer ? PRODUCER_COLOR : CONSUMER_COLOR,
      width: 15,
      height: 15,
    },
  }
}

interface FlowCanvasProps {
  topology: TopologyData
  selectedTeams: Set<string>
  onNodeClick: (node: Node) => void
  focusNodeId: string | null
  highlightNodeId: string | null
}

export function FlowCanvas({
  topology,
  selectedTeams,
  onNodeClick,
  focusNodeId,
  highlightNodeId,
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const layoutNodes = useElkLayout()
  const { setCenter, getNodes } = useReactFlow()
  const layoutDone = useRef(false)
  const prevTeamsRef = useRef<string>('')
  const prevFocusRef = useRef<string | null>(null)
  const baseNodesRef = useRef<Node[]>([])
  const baseEdgesRef = useRef<Edge[]>([])

  // Build and filter graph when teams change
  useEffect(() => {
    const teamsKey = [...selectedTeams].sort().join(',')
    if (teamsKey === prevTeamsRef.current && layoutDone.current) return
    prevTeamsRef.current = teamsKey

    const { nodes: rawNodes, edges: rawEdges } = buildGraph(topology)
    const styledEdges = rawEdges.map(styleEdge)
    const filtered = filterByTeams(rawNodes, styledEdges, selectedTeams)

    baseNodesRef.current = filtered.nodes
    baseEdgesRef.current = filtered.edges
    setNodes(filtered.nodes)
    setEdges(filtered.edges)

    if (selectedTeams.size > 0) {
      layoutDone.current = false
      setTimeout(() => {
        layoutNodes(filtered.nodes, filtered.edges).then(() => {
          layoutDone.current = true
        })
      }, 50)
    }
  }, [topology, selectedTeams, setNodes, setEdges, layoutNodes])

  // Neighbor highlight: dim non-connected nodes when one is selected
  useEffect(() => {
    const base = baseNodesRef.current
    const baseEdges = baseEdgesRef.current
    if (base.length === 0) return

    if (!highlightNodeId) {
      // Restore full opacity
      setNodes(nds =>
        nds.map(n => ({
          ...n,
          style: { ...n.style, opacity: undefined },
        }))
      )
      setEdges(eds =>
        eds.map(e => ({
          ...e,
          style: { ...e.style, opacity: undefined },
        }))
      )
      return
    }

    const neighborIds = getNeighborIds(highlightNodeId, baseEdges)
    neighborIds.add(highlightNodeId)

    setNodes(nds =>
      nds.map(n => ({
        ...n,
        style: {
          ...n.style,
          opacity: n.hidden ? undefined : neighborIds.has(n.id) ? 1 : DIM_OPACITY,
        },
      }))
    )

    setEdges(eds =>
      eds.map(e => {
        const connected =
          e.source === highlightNodeId || e.target === highlightNodeId
        return {
          ...e,
          style: {
            ...e.style,
            opacity: e.hidden ? undefined : connected ? 1 : DIM_OPACITY,
          },
          animated: connected,
        }
      })
    )
  }, [highlightNodeId, setNodes, setEdges])

  // Focus on a specific node when focusNodeId changes
  useEffect(() => {
    if (!focusNodeId || focusNodeId === prevFocusRef.current) return
    prevFocusRef.current = focusNodeId

    const timer = setTimeout(() => {
      const currentNodes = getNodes()
      const target = currentNodes.find(n => n.id === focusNodeId)
      if (target && !target.hidden) {
        const x = target.position.x + (target.measured?.width ?? 160) / 2
        const y = target.position.y + (target.measured?.height ?? 50) / 2
        setCenter(x, y, { zoom: 1.2, duration: 500 })
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [focusNodeId, getNodes, setCenter])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick(node)
    },
    [onNodeClick]
  )

  const handlePaneClick = useCallback(() => {
    onNodeClick(null as unknown as Node)
  }, [onNodeClick])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange as OnNodesChange<Node>}
      onEdgesChange={onEdgesChange as OnEdgesChange<Edge>}
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
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
