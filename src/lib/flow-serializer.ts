import type { Node, Edge } from '@xyflow/react'
import type { FlowDefinition, FlowNodeDef, FlowEdgeDef, FlowNodeType, InteractionType, Annotation, ScannerVariant } from '../types'

interface FlowMetadata {
  id: string
  name: string
  description: string
}

/** Inverse of flow-builder: serialize canvas state back to FlowDefinition JSON */
export function serializeFlow(nodes: Node[], edges: Edge[], metadata: FlowMetadata): FlowDefinition {
  const nodeIdToIndex = new Map<string, number>()
  nodes.forEach((n, i) => nodeIdToIndex.set(n.id, i))

  const serializedNodes: FlowNodeDef[] = nodes.map(n => {
    const bareId = n.id.replace(/^flow-\d+:/, '')
    const label = n.data.label as string | undefined
    const annotations = n.data.annotations as Annotation[] | undefined
    const flowId = n.data.flowId as string | undefined
    const variant = n.data.variant as ScannerVariant | undefined

    const nodeDef: FlowNodeDef = {
      id: bareId,
      type: n.type as FlowNodeType,
      position: [Math.round(n.position.x), Math.round(n.position.y)],
    }

    if (label) nodeDef.label = label
    if (annotations?.length) nodeDef.annotations = annotations
    if (flowId) nodeDef.flowId = flowId
    if (variant) nodeDef.variant = variant

    return nodeDef
  })

  const serializedEdges: FlowEdgeDef[] = edges.map(e => {
    const sourceIdx = nodeIdToIndex.get(e.source)
    const targetIdx = nodeIdToIndex.get(e.target)

    const edgeDef: FlowEdgeDef = {
      source: sourceIdx ?? 0,
      target: targetIdx ?? 0,
      type: (e.data?.interactionType as InteractionType) ?? 'kafka',
    }

    const label = e.data?.label as string | undefined
    if (label) edgeDef.label = label

    return edgeDef
  })

  return {
    ...metadata,
    nodes: serializedNodes,
    edges: serializedEdges,
  }
}
