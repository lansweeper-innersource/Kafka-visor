import { describe, it, expect } from 'vitest'
import { getArgoDomain, getArgoAppSet } from './argo'

describe('getArgoDomain', () => {
  it('strips -deployments suffix from repository', () => {
    expect(getArgoDomain({ repository: 'scanning-deployments' })).toBe('scanning')
    expect(getArgoDomain({ repository: 'backoffice-deployments' })).toBe('backoffice')
  })

  it('returns null when repository has no -deployments suffix', () => {
    expect(getArgoDomain({ repository: 'some-other-repo' })).toBeNull()
  })

  it('returns null when repository is missing', () => {
    expect(getArgoDomain({})).toBeNull()
  })
})

describe('getArgoAppSet', () => {
  it('returns the namespace verbatim (== appSetName per catalog template)', () => {
    expect(getArgoAppSet({ namespace: 'install-status' })).toBe('install-status')
    expect(getArgoAppSet({ namespace: 'backoffice-consumer' })).toBe('backoffice-consumer')
  })

  it('returns null when namespace is missing', () => {
    expect(getArgoAppSet({})).toBeNull()
  })
})
