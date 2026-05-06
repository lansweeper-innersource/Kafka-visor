import { useCallback } from 'react'
import { useReactFlow, type Node, type Edge } from '@xyflow/react'
import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js'

const elk = new ELK()

const ELK_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '120',
  'elk.spacing.nodeNode': '40',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.edgeRouting': 'SPLINES',
}

const DEFAULT_WIDTH = 160
const DEFAULT_HEIGHT = 50

export function useElkLayout() {
  const { setNodes, fitView } = useReactFlow()

  const layoutNodes = useCallback(
    async (nodes: Node[], edges: Edge[]) => {
      const visibleNodes = nodes.filter(n => !n.hidden)
      const visibleNodeIds = new Set(visibleNodes.map(n => n.id))
      const visibleEdges = edges.filter(
        e => !e.hidden && visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
      )

      if (visibleNodes.length === 0) return nodes

      const elkGraph: ElkNode = {
        id: 'root',
        layoutOptions: ELK_OPTIONS,
        children: visibleNodes.map(node => ({
          id: node.id,
          width: node.measured?.width ?? DEFAULT_WIDTH,
          height: node.measured?.height ?? DEFAULT_HEIGHT,
        })),
        edges: visibleEdges.map(edge => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        })),
      }

      const layouted = await elk.layout(elkGraph)

      const positionMap = new Map<string, { x: number; y: number }>()
      for (const child of layouted.children ?? []) {
        positionMap.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 })
      }

      const updatedNodes = nodes.map(node => {
        const pos = positionMap.get(node.id)
        if (pos) {
          return { ...node, position: pos }
        }
        return node
      })

      setNodes(updatedNodes)
      requestAnimationFrame(() => fitView({ padding: 0.1, duration: 300 }))

      return updatedNodes
    },
    [setNodes, fitView]
  )

  return layoutNodes
}
