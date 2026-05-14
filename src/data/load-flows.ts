import type { FlowDefinition } from '../types'

const flowModules = import.meta.glob<FlowDefinition>('./flows/*.json', { eager: true, import: 'default' })

export const flows: FlowDefinition[] = Object.values(flowModules)
  .sort((a, b) => a.name.localeCompare(b.name))
