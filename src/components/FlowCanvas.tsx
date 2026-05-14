import { useCallback, useEffect, useRef, type DragEvent } from 'react'
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  MarkerType,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type DefaultEdgeOptions,
  type Connection,
} from '@xyflow/react'
import { TopicNode } from './nodes/TopicNode'
import { ServiceNode } from './nodes/ServiceNode'
import { ScannerNode } from './nodes/ScannerNode'
import { DatabaseNode } from './nodes/DatabaseNode'
import { FlowRefNode } from './nodes/FlowRefNode'
import { FlowEdge } from './edges/FlowEdge'
import { useElkLayout } from '../lib/use-elk-layout'
import type { TopologyData, FlowDefinition, FlowNodeType } from '../types'
import { buildGraph, filterByTeams, getNeighborIds } from '../lib/graph-builder'
import { buildFlowNodes, buildFlowEdges } from '../lib/flow-builder'
import { getInteractionStyle } from '../lib/flow-colors'
import type { ContextMenuState } from './ContextMenu'
import type { EdgeEditState } from './EdgeTypeModal'

// CRITICAL: Define outside component to prevent remounts
const nodeTypes = {
  topic: TopicNode,
  service: ServiceNode,
  scanner: ScannerNode,
  database: DatabaseNode,
  flowRef: FlowRefNode,
}

const edgeTypes = {
  flow: FlowEdge,
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
  onNodeClick: (node: Node | null) => void
  focusNodeId: string | null
  highlightNodeId: string | null
  onContextMenu: (menu: ContextMenuState | null) => void
  activeFlow: FlowDefinition | null
  onFlowNavigate?: (flowId: string) => void
  isEditing?: boolean
  onEdgeEdit?: (state: EdgeEditState) => void
}

export function FlowCanvas({
  topology,
  selectedTeams,
  onNodeClick,
  focusNodeId,
  highlightNodeId,
  onContextMenu,
  activeFlow,
  onFlowNavigate,
  isEditing,
  onEdgeEdit,
}: FlowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const layoutNodes = useElkLayout()
  const { setCenter, getNodes, fitView, screenToFlowPosition } = useReactFlow()
  const layoutDone = useRef(false)
  const prevTeamsRef = useRef<string>('')
  const prevFocusRef = useRef<string | null>(null)
  const baseEdgesRef = useRef<Edge[]>([])
  const topologyNodesRef = useRef<Node[]>([])
  const topologyEdgesRef = useRef<Edge[]>([])
  const prevFlowRef = useRef<string | null>(null)

  // TOPOLOGY MODE: Build and filter graph when teams change
  useEffect(() => {
    if (activeFlow) return // skip in flow mode

    const teamsKey = [...selectedTeams].sort().join(',')
    if (teamsKey === prevTeamsRef.current && layoutDone.current) return
    prevTeamsRef.current = teamsKey

    const { nodes: rawNodes, edges: rawEdges } = buildGraph(topology)
    const styledEdges = rawEdges.map(styleEdge)
    const filtered = filterByTeams(rawNodes, styledEdges, selectedTeams)

    baseEdgesRef.current = filtered.edges
    topologyNodesRef.current = filtered.nodes
    topologyEdgesRef.current = filtered.edges
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
  }, [topology, selectedTeams, setNodes, setEdges, layoutNodes, activeFlow])

  // FLOW MODE: Swap in flow nodes/edges
  useEffect(() => {
    const flowId = activeFlow?.id ?? null
    if (flowId === prevFlowRef.current) return
    prevFlowRef.current = flowId

    if (activeFlow) {
      const flowNodes = buildFlowNodes(activeFlow, topology)
      const flowEdges = buildFlowEdges(activeFlow)
      setNodes(flowNodes)
      setEdges(flowEdges)
      setTimeout(() => fitView({ duration: 400, padding: 0.15 }), 100)
    } else {
      // Restore topology
      prevTeamsRef.current = '' // force rebuild
      layoutDone.current = false
    }
  }, [activeFlow, topology, setNodes, setEdges, fitView])

  // Neighbor highlight (topology mode only)
  useEffect(() => {
    if (activeFlow) return
    const baseEdges = baseEdgesRef.current
    if (baseEdges.length === 0) return

    if (!highlightNodeId) {
      setNodes(nds => nds.map(n => ({ ...n, style: { ...n.style, opacity: undefined } })))
      setEdges(eds => eds.map(e => ({ ...e, style: { ...e.style, opacity: undefined } })))
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
        const connected = e.source === highlightNodeId || e.target === highlightNodeId
        return {
          ...e,
          style: { ...e.style, opacity: e.hidden ? undefined : connected ? 1 : DIM_OPACITY },
          animated: connected,
        }
      })
    )
  }, [highlightNodeId, setNodes, setEdges, activeFlow])

  // Focus on a node
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
      onContextMenu(null)
      if (node.type === 'flowRef' && onFlowNavigate) {
        onFlowNavigate(node.data.flowId as string)
        return
      }
      onNodeClick(node)
    },
    [onNodeClick, onContextMenu, onFlowNavigate]
  )

  const handlePaneClick = useCallback(() => {
    onContextMenu(null)
    onNodeClick(null)
  }, [onNodeClick, onContextMenu])

  const handleContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault()
      onContextMenu({ node, x: event.clientX, y: event.clientY })
    },
    [onContextMenu]
  )

  // --- Editing handlers ---
  const nodeCounterRef = useRef(0)

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!isEditing) return
      const edgeId = `flow-edge-new-${Date.now()}`
      const defaultType = 'kafka'
      const style = getInteractionStyle(defaultType)
      const newEdge: Edge = {
        id: edgeId,
        source: connection.source,
        target: connection.target,
        type: 'flow',
        animated: true,
        data: { interactionType: defaultType, label: '', stepNumber: edges.length + 1 },
        style: { stroke: style.stroke, strokeWidth: 2.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke, width: 16, height: 16 },
      }
      setEdges(eds => [...eds, newEdge])

      // Open edge type picker
      if (onEdgeEdit) {
        onEdgeEdit({ edgeId, type: defaultType, label: '', x: 400, y: 300 })
      }
    },
    [isEditing, edges.length, setEdges, onEdgeEdit]
  )

  const handleEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      if (!isEditing || !onEdgeEdit) return
      onEdgeEdit({
        edgeId: edge.id,
        type: (edge.data?.interactionType as EdgeEditState['type']) ?? 'kafka',
        label: (edge.data?.label as string) ?? '',
        x: event.clientX,
        y: event.clientY,
      })
    },
    [isEditing, onEdgeEdit]
  )

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      const raw = event.dataTransfer.getData('application/kafka-visor-node')
      if (!raw) return

      const { id, type, label } = JSON.parse(raw) as { id: string; type: FlowNodeType; label: string }
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      const idx = nodeCounterRef.current++

      const nodeId = `flow-${idx}:${id}`
      let data: Record<string, unknown> = { label }

      if (type === 'service') {
        const svc = topology.services[id]
        const team = svc ? topology.teams[svc.team] : null
        data = {
          label: label || id,
          team: svc?.team ?? '',
          teamColor: team?.color ?? '#6B7280',
          repository: svc?.repository ?? '',
          namespace: svc?.namespace ?? '',
          runningInCluster: svc?.runningInCluster ?? false,
          deploymentType: svc?.deploymentType ?? 'Unknown',
          produces: svc?.produces ?? [],
          consumes: svc?.consumes ?? [],
          githubUrl: svc?.githubUrl,
          sourceRepos: svc?.sourceRepos,
          description: svc?.description,
        }
      } else if (type === 'topic') {
        const topic = topology.topics[id]
        data = {
          label: label || id,
          consumerCount: topic?.consumerCount ?? 0,
          producerCount: topic?.producerCount ?? 0,
          teamCount: topic?.teamCount ?? 0,
        }
      } else if (type === 'flowRef') {
        data = { label: label || 'Flow Ref', flowId: '' }
      }

      const newNode: Node = { id: nodeId, type, position, draggable: true, data }
      setNodes(nds => [...nds, newNode])
    },
    [topology, setNodes, screenToFlowPosition]
  )

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange as OnNodesChange<Node>}
      onEdgesChange={onEdgesChange as OnEdgesChange<Edge>}
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
      onNodeContextMenu={handleContextMenu}
      onConnect={isEditing ? handleConnect : undefined}
      onEdgeClick={isEditing ? handleEdgeClick : undefined}
      onDrop={isEditing ? handleDrop : undefined}
      onDragOver={isEditing ? handleDragOver : undefined}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      onlyRenderVisibleElements
      fitView
      proOptions={{ hideAttribution: true }}
      minZoom={0.05}
      maxZoom={2}
      connectionMode={isEditing ? ConnectionMode.Loose : undefined}
      nodesConnectable={isEditing}
      deleteKeyCode={isEditing ? 'Delete' : null}
    >
      <Controls position="bottom-right" />
      <MiniMap
        position="bottom-left"
        nodeColor={(node) => {
          if (node.type === 'topic') return '#1F2937'
          if (node.type === 'scanner') return '#9CA3AF'
          if (node.type === 'database') return '#F59E0B'
          return (node.data as { teamColor?: string }).teamColor ?? '#6B7280'
        }}
        maskColor="rgba(0,0,0,0.1)"
        className="!bg-gray-50 !border-gray-200"
      />
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
    </ReactFlow>
  )
}
