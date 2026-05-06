import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { TEAM_COLORS, type TopologyData, type Service, type Topic, type Team } from '../src/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SOURCE_PATH = resolve(
  __dirname,
  '../../engineering-docs/docs/projects/kafka-migration/2025-q4-migration/follow-up/prd-euw1/phase_1/260419/STEP_2_TOPICS_PER_SERVICE.md'
)
const OUTPUT_PATH = resolve(__dirname, '../src/data/topology.json')

export function parseStep2Markdown(markdown: string): TopologyData {
  const teams: Record<string, Team> = {}
  const services: Record<string, Service> = {}
  const topicMap: Record<string, { consumers: Set<string>; producers: Set<string>; teams: Set<string> }> = {}

  let currentTeam = ''
  let currentService: Service | null = null
  let inMissingTopics = false

  const lines = markdown.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Match team header: ## @Lansweeper/cloud-1
    const teamMatch = line.match(/^## @Lansweeper\/(.+)$/)
    if (teamMatch) {
      const teamSlug = teamMatch[1].trim()
      currentTeam = teamSlug
      teams[teamSlug] = {
        name: teamSlug,
        color: TEAM_COLORS[teamSlug] || '#6B7280',
        fullName: `@Lansweeper/${teamSlug}`,
      }
      currentService = null
      inMissingTopics = false
      continue
    }

    // Match service header: ### Service: `svc-name`
    const serviceMatch = line.match(/^### Service: `(.+?)`/)
    if (serviceMatch) {
      const svcName = serviceMatch[1]
      currentService = {
        id: svcName,
        team: currentTeam,
        repository: '',
        namespace: '',
        produces: [],
        consumes: [],
        runningInCluster: false,
        deploymentType: 'Unknown',
      }
      services[svcName] = currentService
      inMissingTopics = false
      continue
    }

    if (!currentService) continue

    // Match metadata
    const repoMatch = line.match(/^\*\*Repository\*\*:\s*`(.+?)`/)
    if (repoMatch) {
      currentService.repository = repoMatch[1]
      continue
    }

    const nsMatch = line.match(/^\*\*Namespace\*\*:\s*`(.+?)`/)
    if (nsMatch) {
      currentService.namespace = nsMatch[1]
      continue
    }

    // Detect "Missing Topics" section — skip these rows
    if (line.match(/^####\s+Missing Topics/i)) {
      inMissingTopics = true
      continue
    }

    // Reset missing topics flag on next service/team header
    if (line.startsWith('### ') || line.startsWith('## ')) {
      inMissingTopics = false
    }

    if (inMissingTopics) continue

    // Match topic table row: | `topic.name` | [x] | [ ] | ...
    const rowMatch = line.match(
      /^\|\s*`([^`]+)`\s*\|\s*\[([ x])\]\s*\|\s*\[([ x])\]\s*\|/
    )
    if (rowMatch) {
      const topicName = rowMatch[1]
      const isConsumer = rowMatch[2] === 'x'
      const isProducer = rowMatch[3] === 'x'

      if (!topicMap[topicName]) {
        topicMap[topicName] = { consumers: new Set(), producers: new Set(), teams: new Set() }
      }

      if (isConsumer) {
        currentService.consumes.push(topicName)
        topicMap[topicName].consumers.add(currentService.id)
      }
      if (isProducer) {
        currentService.produces.push(topicName)
        topicMap[topicName].producers.add(currentService.id)
      }
      if (isConsumer || isProducer) {
        topicMap[topicName].teams.add(currentTeam)
      }
    }
  }

  // Build topics, filtering to only active ones
  const topics: Record<string, Topic> = {}
  for (const [id, data] of Object.entries(topicMap)) {
    if (data.consumers.size === 0 && data.producers.size === 0) continue
    topics[id] = {
      id,
      consumers: [...data.consumers],
      producers: [...data.producers],
      consumerCount: data.consumers.size,
      producerCount: data.producers.size,
      teamCount: data.teams.size,
    }
  }

  return {
    teams,
    topics,
    services,
    metadata: {
      dataCollectionDate: '2026-04-19',
      totalTopics: Object.keys(topics).length,
      totalServices: Object.keys(services).length,
      totalTeams: Object.keys(teams).length,
    },
  }
}

// CLI entrypoint
if (process.argv[1]?.includes('extract-topology')) {
  const markdown = readFileSync(SOURCE_PATH, 'utf-8')
  const topology = parseStep2Markdown(markdown)

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, JSON.stringify(topology, null, 2))

  console.log(`Extracted topology:`)
  console.log(`  Teams: ${topology.metadata.totalTeams}`)
  console.log(`  Services: ${topology.metadata.totalServices}`)
  console.log(`  Active Topics: ${topology.metadata.totalTopics}`)
  console.log(`  Written to: ${OUTPUT_PATH}`)
}
