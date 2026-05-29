import { MarkerType, type Node, type Edge } from '@xyflow/react'
import type { FlowDefinition, TopologyData } from '../types'
import { getInteractionStyle } from './flow-colors'

export function buildFlowNodes(flow: FlowDefinition, topology: TopologyData): Node[] {
  return flow.nodes.map((nodeDef, i) => {
    const baseId = nodeDef.id
    const position = { x: nodeDef.position[0], y: nodeDef.position[1] }

    if (nodeDef.type === 'service') {
      const svc = topology.services[baseId]
      const team = svc ? topology.teams[svc.team] : null
      return {
        id: `flow-${i}:${baseId}`,
        type: 'service',
        position,
        draggable: true,
        data: {
          label: nodeDef.label ?? baseId,
          topologyId: baseId,
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
          grpcCalls: svc?.grpcCalls,
          databases: svc?.databases,
          description: svc?.description,
          annotations: nodeDef.annotations,
        },
      }
    }

    if (nodeDef.type === 'topic') {
      const topic = topology.topics[baseId]
      return {
        id: `flow-${i}:${baseId}`,
        type: 'topic',
        position,
        draggable: true,
        data: {
          label: nodeDef.label ?? baseId,
          topologyId: baseId,
          consumerCount: topic?.consumerCount ?? 0,
          producerCount: topic?.producerCount ?? 0,
          teamCount: topic?.teamCount ?? 0,
          annotations: nodeDef.annotations,
        },
      }
    }

    if (nodeDef.type === 'flowRef') {
      return {
        id: `flow-${i}:${baseId}`,
        type: 'flowRef',
        position,
        draggable: true,
        data: {
          label: nodeDef.label ?? nodeDef.flowId ?? baseId,
          flowId: nodeDef.flowId ?? baseId,
          annotations: nodeDef.annotations,
        },
      }
    }

    if (nodeDef.type === 'stickyNote') {
      return {
        id: `flow-${i}:${baseId}`,
        type: 'stickyNote',
        position,
        draggable: true,
        data: {
          label: '',
          text: nodeDef.text ?? '',
        },
      }
    }

    // scanner, database, workflow, asset, or component
    return {
      id: `flow-${i}:${baseId}`,
      type: nodeDef.type,
      position,
      draggable: true,
      data: {
        label: nodeDef.label ?? baseId,
        annotations: nodeDef.annotations,
        ...(nodeDef.variant ? { variant: nodeDef.variant } : {}),
        ...(nodeDef.detail ? { detail: nodeDef.detail } : {}),
        ...(nodeDef.parentService ? { parentService: nodeDef.parentService } : {}),
      },
    }
  })
}

export function buildFlowEdges(flow: FlowDefinition): Edge[] {
  return flow.edges.map((edgeDef, i) => {
    const sourceNode = flow.nodes[edgeDef.source]
    const targetNode = flow.nodes[edgeDef.target]
    const style = getInteractionStyle(edgeDef.type)

    return {
      id: `flow-edge-${i}`,
      source: `flow-${edgeDef.source}:${sourceNode.id}`,
      target: `flow-${edgeDef.target}:${targetNode.id}`,
      type: 'flow',
      animated: true,
      data: {
        stepNumber: i + 1,
        interactionType: edgeDef.type,
        label: edgeDef.label,
        annotations: edgeDef.annotations,
      },
      style: { stroke: style.stroke, strokeWidth: 2.5 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: style.stroke,
        width: 16,
        height: 16,
      },
    }
  })
}
