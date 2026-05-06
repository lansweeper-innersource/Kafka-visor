import { describe, it, expect } from 'vitest'
import { parseStep2Markdown } from './extract-topology'

const SAMPLE_MARKDOWN = `# STEP 2: Kafka Topics Per Service

---

## @Lansweeper/cloud-1

**Number of services**: 2

---

### Service: \`svc-alpha\`

**Repository**: \`alpha-deployments\`
**Namespace**: \`alpha\`
**Topics found**: 2

| Topic                              | Consumer | Producer | Verified | Misconfiguration | Notes |
|------------------------------------|----------|----------|----------|------------------|-------|
| \`public.event.multitenant\`        | [x]      | [ ]      | [ ]      | [ ]              |       |
| \`public.event.tracking\`           | [ ]      | [x]      | [ ]      | [ ]              |       |

#### Missing Topics

| Topic | Consumer | Producer | Verified | Notes |
|-------|----------|----------|----------|-------|
|       | [ ]      | [ ]      | [ ]      |       |

---

### Service: \`svc-beta\`

**Repository**: \`beta-deployments\`
**Namespace**: \`beta\`
**Topics found**: 1

| Topic                              | Consumer | Producer | Verified | Misconfiguration | Notes |
|------------------------------------|----------|----------|----------|------------------|-------|
| \`public.event.multitenant\`        | [ ]      | [x]      | [ ]      | [ ]              |       |

#### Missing Topics

| Topic | Consumer | Producer | Verified | Notes |
|-------|----------|----------|----------|-------|
|       | [ ]      | [ ]      | [ ]      |       |

---

## @Lansweeper/cloud-2

**Number of services**: 1

---

### Service: \`svc-gamma\`

**Repository**: \`gamma-deployments\`
**Namespace**: \`gamma\`
**Topics found**: 2

| Topic                              | Consumer | Producer | Verified | Misconfiguration | Notes |
|------------------------------------|----------|----------|----------|------------------|-------|
| \`public.event.multitenant\`        | [x]      | [ ]      | [ ]      | [ ]              |       |
| \`public.event.tracking\`           | [x]      | [ ]      | [ ]      | [ ]              |       |

#### Missing Topics

| Topic | Consumer | Producer | Verified | Notes |
|-------|----------|----------|----------|-------|
|       | [ ]      | [ ]      | [ ]      |       |

---
`

describe('parseStep2Markdown', () => {
  const result = parseStep2Markdown(SAMPLE_MARKDOWN)

  it('extracts all teams', () => {
    expect(Object.keys(result.teams)).toEqual(['cloud-1', 'cloud-2'])
    expect(result.teams['cloud-1'].fullName).toBe('@Lansweeper/cloud-1')
  })

  it('extracts all services with correct metadata', () => {
    expect(Object.keys(result.services)).toHaveLength(3)

    const alpha = result.services['svc-alpha']
    expect(alpha.team).toBe('cloud-1')
    expect(alpha.repository).toBe('alpha-deployments')
    expect(alpha.namespace).toBe('alpha')
  })

  it('extracts consumer relationships', () => {
    const alpha = result.services['svc-alpha']
    expect(alpha.consumes).toEqual(['public.event.multitenant'])
    expect(alpha.produces).toEqual(['public.event.tracking'])
  })

  it('builds topic entries with correct producer/consumer lists', () => {
    const mt = result.topics['public.event.multitenant']
    expect(mt.consumers).toContain('svc-alpha')
    expect(mt.consumers).toContain('svc-gamma')
    expect(mt.producers).toContain('svc-beta')
    expect(mt.consumerCount).toBe(2)
    expect(mt.producerCount).toBe(1)
  })

  it('calculates teamCount per topic', () => {
    const mt = result.topics['public.event.multitenant']
    expect(mt.teamCount).toBe(2) // cloud-1 and cloud-2 both touch this topic

    const tr = result.topics['public.event.tracking']
    expect(tr.teamCount).toBe(2) // cloud-1 produces, cloud-2 consumes
  })

  it('sets correct metadata', () => {
    expect(result.metadata.totalTopics).toBe(2)
    expect(result.metadata.totalServices).toBe(3)
    expect(result.metadata.totalTeams).toBe(2)
  })

  it('only includes active topics (at least 1 consumer or producer)', () => {
    for (const topic of Object.values(result.topics)) {
      expect(topic.consumerCount + topic.producerCount).toBeGreaterThan(0)
    }
  })
})
