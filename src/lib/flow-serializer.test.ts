import { describe, it, expect } from 'vitest'
import type { Node, Edge } from '@xyflow/react'
import { serializeFlow } from './flow-serializer'

describe('serializeFlow', () => {
  it('converts canvas nodes and edges back to FlowDefinition', () => {
    const nodes: Node[] = [
      {
        id: 'flow-0:my-service',
        type: 'service',
        position: { x: 100, y: 200 },
        data: { label: 'My Service' },
      },
      {
        id: 'flow-1:my-topic',
        type: 'topic',
        position: { x: 300, y: 400 },
        data: { label: 'my-topic' },
      },
    ]

    const edges: Edge[] = [
      {
        id: 'flow-edge-0',
        source: 'flow-0:my-service',
        target: 'flow-1:my-topic',
        type: 'flow',
        data: { interactionType: 'kafka', label: 'produces' },
      },
    ]

    const result = serializeFlow(nodes, edges, {
      id: 'test-flow',
      name: 'Test Flow',
      description: 'A test flow',
    })

    expect(result).toEqual({
      id: 'test-flow',
      name: 'Test Flow',
      description: 'A test flow',
      nodes: [
        { id: 'my-service', type: 'service', label: 'My Service', position: [100, 200] },
        { id: 'my-topic', type: 'topic', label: 'my-topic', position: [300, 400] },
      ],
      edges: [
        { source: 0, target: 1, type: 'kafka', label: 'produces' },
      ],
    })
  })

  it('handles edges without labels', () => {
    const nodes: Node[] = [
      { id: 'flow-0:a', type: 'service', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'flow-1:b', type: 'topic', position: { x: 100, y: 0 }, data: { label: 'B' } },
    ]

    const edges: Edge[] = [
      {
        id: 'flow-edge-0',
        source: 'flow-0:a',
        target: 'flow-1:b',
        type: 'flow',
        data: { interactionType: 'grpc' },
      },
    ]

    const result = serializeFlow(nodes, edges, { id: 'x', name: 'X', description: '' })
    expect(result.edges[0]).toEqual({ source: 0, target: 1, type: 'grpc' })
  })

  it('handles nodes with annotations', () => {
    const nodes: Node[] = [
      {
        id: 'flow-0:svc',
        type: 'service',
        position: { x: 50, y: 75 },
        data: { label: 'Svc', annotations: [{ text: 'Important note', severity: 'warning' }] },
      },
    ]

    const result = serializeFlow(nodes, [], { id: 'x', name: 'X', description: '' })
    expect(result.nodes[0].annotations).toEqual([{ text: 'Important note', severity: 'warning' }])
  })

  it('handles flowRef nodes with flowId', () => {
    const nodes: Node[] = [
      {
        id: 'flow-0:ref',
        type: 'flowRef',
        position: { x: 0, y: 0 },
        data: { label: 'Other Flow', flowId: 'other-flow' },
      },
    ]

    const result = serializeFlow(nodes, [], { id: 'x', name: 'X', description: '' })
    expect(result.nodes[0]).toEqual({
      id: 'ref',
      type: 'flowRef',
      label: 'Other Flow',
      position: [0, 0],
      flowId: 'other-flow',
    })
  })

  it('rounds positions to integers', () => {
    const nodes: Node[] = [
      { id: 'flow-0:a', type: 'service', position: { x: 100.7, y: 200.3 }, data: { label: 'A' } },
    ]

    const result = serializeFlow(nodes, [], { id: 'x', name: 'X', description: '' })
    expect(result.nodes[0].position).toEqual([101, 200])
  })

  it('maps edge source/target correctly with multiple nodes', () => {
    const nodes: Node[] = [
      { id: 'flow-0:a', type: 'scanner', position: { x: 0, y: 0 }, data: { label: 'A' } },
      { id: 'flow-1:b', type: 'service', position: { x: 100, y: 0 }, data: { label: 'B' } },
      { id: 'flow-2:c', type: 'topic', position: { x: 200, y: 0 }, data: { label: 'C' } },
    ]

    const edges: Edge[] = [
      {
        id: 'e0',
        source: 'flow-0:a',
        target: 'flow-1:b',
        type: 'flow',
        data: { interactionType: 'sensor' },
      },
      {
        id: 'e1',
        source: 'flow-1:b',
        target: 'flow-2:c',
        type: 'flow',
        data: { interactionType: 'kafka', label: 'publishes' },
      },
    ]

    const result = serializeFlow(nodes, edges, { id: 'x', name: 'X', description: '' })
    expect(result.edges).toEqual([
      { source: 0, target: 1, type: 'sensor' },
      { source: 1, target: 2, type: 'kafka', label: 'publishes' },
    ])
  })
})
