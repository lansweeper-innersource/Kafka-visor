// Map between topology.json fields and Argo CD entities defined in
// lansweeper-apps-catalog (apps/templates/appset.tpl.yaml).
//
// In the catalog Helm template:
//   - source.repoURL = github.com/Lansweeper/<domain>-deployments
//   - destination.namespace = <appSetName>
//   - ApplicationSet name   = <appSetName>
//
// In topology.json:
//   - service.repository = "<domain>-deployments"
//   - service.namespace  = "<appSetName>"
//
// Verified 146/146 services match this mapping against the catalog.

export interface ArgoRefSource {
  repository?: string
  namespace?: string
}

export function getArgoDomain(svc: ArgoRefSource): string | null {
  if (!svc.repository) return null
  const stripped = svc.repository.replace(/-deployments$/, '')
  return stripped === svc.repository ? null : stripped
}

export function getArgoAppSet(svc: ArgoRefSource): string | null {
  return svc.namespace ?? null
}
