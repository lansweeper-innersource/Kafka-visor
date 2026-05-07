/**
 * Enrich topology.json with data from Quill (code intelligence DB).
 * Maps deployment repos to GitHub URLs and source code repos.
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { TopologyData } from '../src/types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const TOPOLOGY_PATH = resolve(__dirname, '../src/data/topology.json')

// GitHub URL mapping: repo name -> GitHub URL
// Extracted from Quill repos table
const GITHUB_URLS: Record<string, string> = {
  'analytics-deployments': 'https://github.com/Lansweeper/analytics-deployments',
  'audit-deployments': 'https://github.com/Lansweeper/audit-deployments',
  'backoffice-deployments': 'https://github.com/Lansweeper/backoffice-deployments',
  'businesstools-deployments': 'https://github.com/Lansweeper/businesstools-deployments',
  'datacore-deployments': 'https://github.com/Lansweeper/datacore-deployments',
  'diagrams-deployments': 'https://github.com/Lansweeper/diagrams-deployments',
  'edge-deployments': 'https://github.com/Lansweeper/edge-deployments',
  'enriching-deployments': 'https://github.com/Lansweeper/enriching-deployments',
  'integrations-deployments': 'https://github.com/Lansweeper/integrations-deployments',
  'inventory-deployments': 'https://github.com/Lansweeper/inventory-deployments',
  'scanning-deployments': 'https://github.com/Lansweeper/scanning-deployments',
  'tenancy-deployments': 'https://github.com/Lansweeper/tenancy-deployments',
  'tracking-deployments': 'https://github.com/Lansweeper/tracking-deployments',
  'webapp-deployments': 'https://github.com/Lansweeper/webapp-deployments',
  'lakehouse-deployments': 'https://github.com/Lansweeper/lakehouse-deployments',
}

// Source code repos: service name -> source repo(s) with GitHub URLs
// Derived from pipeline_evidence EVENT_PUBLISH/EVENT_SUBSCRIBE
const SERVICE_SOURCE_REPOS: Record<string, { name: string; url: string }[]> = {
  'lec-asset-api': [{ name: 'LECAssetsAPI', url: 'https://github.com/Lansweeper/LECAssetsAPI' }],
  'lec-asset-be': [{ name: 'LECAssetsBE', url: 'https://github.com/Lansweeper/LECAssetsBE' }],
  'asset-operations-consumer': [{ name: 'AssetOperationsConsumer', url: 'https://github.com/Lansweeper/AssetOperationsConsumer' }],
  'asset-sync-status-consumer': [{ name: 'AssetSyncStatus', url: 'https://github.com/Lansweeper/AssetSyncStatus' }],
  'asset-sync-status-tracking-consumer': [{ name: 'AssetSyncStatus', url: 'https://github.com/Lansweeper/AssetSyncStatus' }],
  'lec-duplicated-assets-consumer': [{ name: 'LECDuplicatedAssetsConsumer', url: 'https://github.com/Lansweeper/LECDuplicatedAssetsConsumer' }],
  'lec-multitenant-api': [{ name: 'LECMultitenant', url: 'https://github.com/Lansweeper/LECMultitenant' }],
  'lec-multitenant-consumer': [{ name: 'LECMultitenant', url: 'https://github.com/Lansweeper/LECMultitenant' }],
  'lec-tracking-api': [{ name: 'LECTracking', url: 'https://github.com/Lansweeper/LECTracking' }],
  'lec-tracking-consumer': [{ name: 'LECTracking', url: 'https://github.com/Lansweeper/LECTracking' }],
  'lec-notifications-api': [{ name: 'LECNotifications', url: 'https://github.com/Lansweeper/LECNotifications' }],
  'lec-notifications-consumer': [{ name: 'LECNotifications', url: 'https://github.com/Lansweeper/LECNotifications' }],
  'lec-licensing-api': [{ name: 'LECLicensing', url: 'https://github.com/Lansweeper/LECLicensing' }],
  'lec-licensing-consumer': [{ name: 'LECLicensing', url: 'https://github.com/Lansweeper/LECLicensing' }],
  'lec-permissions-consumer': [{ name: 'LECPermissions', url: 'https://github.com/Lansweeper/LECPermissions' }],
  'lec-backoffice-consumer': [{ name: 'LECBackofficeConsumer', url: 'https://github.com/Lansweeper/LECBackofficeConsumer' }],
  'lec-analytics-api': [{ name: 'LECLuzmoPlugin', url: 'https://github.com/Lansweeper/LECLuzmoPlugin' }],
  'lec-analytics-assets-consumer-v2': [{ name: 'LECAnalyticsAssetsConsumerV2', url: 'https://github.com/Lansweeper/LECAnalyticsAssetsConsumerV2' }],
  'lec-boards-consumer': [{ name: 'LECBoardsConsumer', url: 'https://github.com/Lansweeper/LECBoardsConsumer' }],
  'lec-boards-api': [{ name: 'LECBoardsAPI', url: 'https://github.com/Lansweeper/LECBoardsAPI' }],
  'lec-reports-api': [{ name: 'LECReportsAPI', url: 'https://github.com/Lansweeper/LECReportsAPI' }],
  'lec-reports-executor': [{ name: 'LECReportsExecutor', url: 'https://github.com/Lansweeper/LECReportsExecutor' }],
  'lec-event-logs-api': [{ name: 'LECBoardsAPI', url: 'https://github.com/Lansweeper/LECBoardsAPI' }],
  'lec-diagrams-api': [{ name: 'LECDiagramsExecutor', url: 'https://github.com/Lansweeper/LECDiagramsExecutor' }],
  'cloud-scanning-api': [{ name: 'LECCloudScanningAPI', url: 'https://github.com/Lansweeper/LECCloudScanningAPI' }],
  'cloud-scanning-api-consumer': [{ name: 'LECCloudScanningAPI', url: 'https://github.com/Lansweeper/LECCloudScanningAPI' }],
  'lec-scanning-api': [{ name: 'LECScanningAPI', url: 'https://github.com/Lansweeper/LECScanningAPI' }],
  'lec-scanning-consumer': [{ name: 'LECScanningAPI', url: 'https://github.com/Lansweeper/LECScanningAPI' }],
  'lec-scanningconfig-api': [{ name: 'LECScanningConfig', url: 'https://github.com/Lansweeper/LECScanningConfig' }],
  'lec-scanningconfig-consumer': [{ name: 'LECScanningConfig', url: 'https://github.com/Lansweeper/LECScanningConfig' }],
  'lec-adapter-consumer-asset': [{ name: 'LECAdapterAPI', url: 'https://github.com/Lansweeper/LECAdapterAPI' }],
  'lec-adapter-consumer-ug': [{ name: 'LECAdapterAPI', url: 'https://github.com/Lansweeper/LECAdapterAPI' }],
  'lec-edge-command-api': [{ name: 'EdgeCommandAPI', url: 'https://github.com/Lansweeper/EdgeCommandAPI' }],
  'lec-edge-manager': [{ name: 'LECEdgeManager', url: 'https://github.com/Lansweeper/LECEdgeManager' }],
  'lec-syncer-api': [{ name: 'LECSyncerAPI', url: 'https://github.com/Lansweeper/LECSyncerAPI' }],
  'lec-syncer-api-v2': [{ name: 'LECSyncerAPIv2', url: 'https://github.com/Lansweeper/LECSyncerAPIv2' }],
  'syncer-status-api': [{ name: 'LECSyncerStatusAPI', url: 'https://github.com/Lansweeper/LECSyncerStatusAPI' }],
  'install-status-api': [{ name: 'InstallStatus', url: 'https://github.com/Lansweeper/InstallStatus' }],
  'install-status-consumer': [{ name: 'InstallStatus', url: 'https://github.com/Lansweeper/InstallStatus' }],
  'hard-soft-limits': [{ name: 'HardSoftLimits', url: 'https://github.com/Lansweeper/HardSoftLimits' }],
  'public-broker': [{ name: 'edge-deployments', url: 'https://github.com/Lansweeper/edge-deployments' }],
  'lec-gateway-api': [{ name: 'LECGatewayAPI', url: 'https://github.com/Lansweeper/LECGatewayAPI' }],
  'lec-gateway-subscriptions': [{ name: 'LECGatewayAPI', url: 'https://github.com/Lansweeper/LECGatewayAPI' }],
  'lec-integrations-assets-api': [{ name: 'LECIntegrationsAssetsAPI', url: 'https://github.com/Lansweeper/LECIntegrationsAssetsAPI' }],
  'lec-integrations-exporter-api-v2': [{ name: 'LECIntegrationsExporterAPI', url: 'https://github.com/Lansweeper/LECIntegrationsExporterAPI' }],
  'lec-integrations-webhooks-api': [{ name: 'LECIntegrationsWebhooksAPI', url: 'https://github.com/Lansweeper/LECIntegrationsWebhooksAPI' }],
  'lec-integrations-webhooks-checker-consumer': [{ name: 'LECIntegrationsWebhooksCheckerConsumer', url: 'https://github.com/Lansweeper/LECIntegrationsWebhooksCheckerConsumer' }],
  'lec-integrations-webhooks-notifier-consumer-v2': [{ name: 'LECIntegrationsWebhooksNotifierConsumerV2', url: 'https://github.com/Lansweeper/LECIntegrationsWebhooksNotifierConsumerV2' }],
  'lec-integrations-reports-api': [{ name: 'LECIntegrationsReportsAPI', url: 'https://github.com/Lansweeper/LECIntegrationsReportsAPI' }],
  'lec-prismatic-api': [{ name: 'LECPrismaticAPI', url: 'https://github.com/Lansweeper/LECPrismaticAPI' }],
  'lec-prismatic-consumer': [{ name: 'LECPrismaticAPI', url: 'https://github.com/Lansweeper/LECPrismaticAPI' }],
  'acme-data-exporter-consumer': [{ name: 'acme-data-exporter', url: 'https://github.com/Lansweeper/acme-data-exporter' }],
  'lec-data-core-processor-asset': [{ name: 'LECDataCore', url: 'https://github.com/Lansweeper/LECDataCore' }],
  'lec-data-core-processor-multitenant': [{ name: 'LECDataCore', url: 'https://github.com/Lansweeper/LECDataCore' }],
  'lec-data-core-processor-deconcile': [{ name: 'LECDataCore', url: 'https://github.com/Lansweeper/LECDataCore' }],
  'lec-data-core-processor-classic-asset': [{ name: 'LECDataCore', url: 'https://github.com/Lansweeper/LECDataCore' }],
  'lec-data-core-processor-cloud-asset': [{ name: 'LECDataCore', url: 'https://github.com/Lansweeper/LECDataCore' }],
  'lec-data-core-processor-traffic-asset': [{ name: 'LECDataCore', url: 'https://github.com/Lansweeper/LECDataCore' }],
  'lec-data-core-processor-asset-context': [{ name: 'LECDataCore', url: 'https://github.com/Lansweeper/LECDataCore' }],
  'lec-data-core-processor-api-scan-asset': [{ name: 'LECDataCore', url: 'https://github.com/Lansweeper/LECDataCore' }],
  'lec-data-core-admin': [{ name: 'LECDataCore', url: 'https://github.com/Lansweeper/LECDataCore' }],
  'lec-data-core-inbound-api': [{ name: 'LECDataCore', url: 'https://github.com/Lansweeper/LECDataCore' }],
  'lec-data-core-integrity': [{ name: 'LECDataCore', url: 'https://github.com/Lansweeper/LECDataCore' }],
  'audit-trails-consumer-go': [{ name: 'audit-deployments', url: 'https://github.com/Lansweeper/audit-deployments' }],
  'assets-enriching': [{ name: 'enriching-deployments', url: 'https://github.com/Lansweeper/enriching-deployments' }],
  'users-enriching': [{ name: 'enriching-deployments', url: 'https://github.com/Lansweeper/enriching-deployments' }],
  'vulnerabilities-engine-enriching-go': [{ name: 'enriching-deployments', url: 'https://github.com/Lansweeper/enriching-deployments' }],
  'discovery-config-api': [{ name: 'discovery-config-api', url: 'https://github.com/Lansweeper/discovery-config-api' }],
  'discovery-syncer-api': [{ name: 'discovery-syncer-api', url: 'https://github.com/Lansweeper/discovery-syncer-api' }],
  'lec-msmp-api': [{ name: 'LECMspApi', url: 'https://github.com/Lansweeper/LECMspApi' }],
}

function enrichWithQuill(topology: TopologyData): TopologyData {
  let enriched = 0

  for (const service of Object.values(topology.services)) {
    // Add deployment repo GitHub URL
    const deployUrl = GITHUB_URLS[service.repository]
    if (deployUrl) {
      ;(service as Record<string, unknown>).githubUrl = deployUrl
    }

    // Add source code repos
    const sourceRepos = SERVICE_SOURCE_REPOS[service.id]
    if (sourceRepos) {
      ;(service as Record<string, unknown>).sourceRepos = sourceRepos
      enriched++
    }
  }

  return topology
}

// CLI
if (process.argv[1]?.includes('enrich-quill')) {
  const topology: TopologyData = JSON.parse(readFileSync(TOPOLOGY_PATH, 'utf-8'))
  const enriched = enrichWithQuill(topology)
  writeFileSync(TOPOLOGY_PATH, JSON.stringify(enriched, null, 2))

  const withSource = Object.values(enriched.services).filter(
    (s) => (s as Record<string, unknown>).sourceRepos
  ).length
  const withGithub = Object.values(enriched.services).filter(
    (s) => (s as Record<string, unknown>).githubUrl
  ).length

  console.log('Enriched with Quill data:')
  console.log(`  Services with GitHub URL: ${withGithub}/142`)
  console.log(`  Services with source repo: ${withSource}/142`)
}
