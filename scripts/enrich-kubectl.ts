import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import type { TopologyData } from '../src/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const TOPOLOGY_PATH = resolve(__dirname, '../src/data/topology.json')

interface ClusterResource {
  namespace: string
  name: string
  kind: 'Deployment' | 'CronJob'
}

function getClusterResources(): ClusterResource[] {
  const resources: ClusterResource[] = []

  const deployments = execSync('kubectl get deployments --all-namespaces --no-headers 2>/dev/null', { encoding: 'utf-8' })
  for (const line of deployments.trim().split('\n')) {
    const parts = line.trim().split(/\s+/)
    if (parts.length >= 2) {
      resources.push({ namespace: parts[0], name: parts[1], kind: 'Deployment' })
    }
  }

  const cronjobs = execSync('kubectl get cronjobs --all-namespaces --no-headers 2>/dev/null', { encoding: 'utf-8' })
  for (const line of cronjobs.trim().split('\n')) {
    const parts = line.trim().split(/\s+/)
    if (parts.length >= 2) {
      resources.push({ namespace: parts[0], name: parts[1], kind: 'CronJob' })
    }
  }

  return resources
}

function enrichTopology(topology: TopologyData, resources: ClusterResource[]): TopologyData {
  // Build lookup: deployment name -> resource
  const byName = new Map<string, ClusterResource>()
  // Also build namespace/name compound key
  const byNsName = new Map<string, ClusterResource>()
  for (const r of resources) {
    byName.set(r.name, r)
    byNsName.set(`${r.namespace}/${r.name}`, r)
  }

  let matched = 0
  let unmatched = 0

  for (const service of Object.values(topology.services)) {
    // Try exact name match first
    let resource = byName.get(service.id)
    // Then try namespace/name match
    if (!resource && service.namespace) {
      resource = byNsName.get(`${service.namespace}/${service.id}`)
    }

    if (resource) {
      service.runningInCluster = true
      service.deploymentType = resource.kind
      matched++
    } else {
      service.runningInCluster = false
      service.deploymentType = 'Unknown'
      unmatched++
    }
  }

  return topology
}

// CLI entrypoint
if (process.argv[1]?.includes('enrich-kubectl')) {
  const topology: TopologyData = JSON.parse(readFileSync(TOPOLOGY_PATH, 'utf-8'))
  const resources = getClusterResources()

  const enriched = enrichTopology(topology, resources)
  writeFileSync(TOPOLOGY_PATH, JSON.stringify(enriched, null, 2))

  const matched = Object.values(enriched.services).filter(s => s.runningInCluster).length
  const total = Object.values(enriched.services).length

  console.log(`Enriched topology with kubectl data:`)
  console.log(`  Running in cluster: ${matched}/${total}`)
  console.log(`  Not found: ${total - matched}`)
}

export { enrichTopology, type ClusterResource }
