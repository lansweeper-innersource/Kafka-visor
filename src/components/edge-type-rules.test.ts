import { describe, it, expect } from 'vitest'
import { getValidEdgeTypes } from './EdgeTypeModal'

describe('getValidEdgeTypes', () => {
  it('service → topic = kafka only', () => {
    expect(getValidEdgeTypes('service', 'topic')).toEqual(['kafka'])
  })

  it('topic → service = kafka only', () => {
    expect(getValidEdgeTypes('topic', 'service')).toEqual(['kafka'])
  })

  it('service → service = direct communication', () => {
    expect(getValidEdgeTypes('service', 'service')).toEqual(['grpc', 'https', 'protobuf', 'internal'])
  })

  it('service → database = db only', () => {
    expect(getValidEdgeTypes('service', 'database')).toEqual(['db'])
  })

  it('scanner → service includes sensor and direct', () => {
    expect(getValidEdgeTypes('scanner', 'service')).toEqual(['grpc', 'https', 'sensor'])
  })

  it('service → scanner includes direct communication', () => {
    expect(getValidEdgeTypes('service', 'scanner')).toEqual(['grpc', 'https', 'sensor'])
  })

  it('returns all types when node types unknown', () => {
    expect(getValidEdgeTypes(undefined, undefined)).toHaveLength(7)
  })
})
