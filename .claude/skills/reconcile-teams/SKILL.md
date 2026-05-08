---
name: reconcile-teams
description: Verify and correct the team assignments in src/data/topology.json against the canonical Lansweeper apps-catalog. Use when adding services, suspecting team drift, or as a periodic audit. Detects which services have a `team` field that disagrees with `lansweeper-apps-catalog/apps/domains/*.yaml` ownership and offers to apply corrections.
---

# reconcile-teams

Audit the `team` field of every service in `src/data/topology.json` against the canonical owner declared in the `lansweeper-apps-catalog` repo (per-domain yaml under `apps/domains/`).

## When to invoke

- After adding a new service to topology.json (catch typos in `team` early)
- When a service moves between teams (catalog updated, topology hasn't)
- As a periodic audit to detect drift
- When the user reports a service appearing under the wrong team color in the UI

## Required tools

- `mcp__quill__query` to enumerate `apps/domains/*.yaml` files
- `mcp__quill__get_file` to read each domain yaml (already indexed in Quill, repo: `lansweeper-apps-catalog`)
- `Bash` + `jq` for the comparison
- `Edit` to apply corrections

## Procedure

### 1. Pull all domain yamls from the catalog

Single Quill query gets every `apps/domains/<x>.yaml` chunk:

```sql
SELECT filename, text
FROM lansweeperrepos__repo_embeddings
WHERE repo = 'lansweeper-apps-catalog'
  AND filename ~ 'apps/domains/[a-z]+\.yaml$'
  AND filename NOT LIKE '%values.schema%'
ORDER BY filename
```

Some domains are split across multiple chunks (devtools, edge, hivemind, integrations, lakehouse, tenancy). Concatenate by filename before parsing.

### 2. Build the catalog map

Parse the yaml content into a flat `{deployment_name: owner_string}` map. Each top-level key is a deployment, each entry has an `owner: "<Team Display Name>"` field.

Skip non-team owners (e.g. individual usernames in lakehouse / hivemind / devtools). Focus on the ones that map to topology teams:

| Catalog owner string | topology team id |
|---|---|
| Cloud 1 | cloud-1 |
| Cloud 2 | cloud-2 |
| Cloud Enrichment | cloud-enrichment |
| Cloud Data Pipeline And Scanning | cloud-data-pipeline-and-scanning |
| Cloud Asset And Visualisation | cloud-asset-and-visualisation |
| Cloud Integrations | cloud-integrations |
| Cloud Front End | cloud-front-end |
| Data Core | data-core |
| Discovery Engineering | discovery-engineering |
| Asset Cortex | asset-cortex (if present) |

If you encounter a new team string, ask the user whether to add it to `topology.json.teams` before proceeding.

### 3. Detect mismatches

The mapping deployment_name → topology service is via the `namespace` field. Every service in topology.json has a `namespace` and that string equals the catalog deployment name (this invariant has held for all 142 services).

```bash
jq -n --slurpfile cat /tmp/catalog-owners.json \
      --slurpfile tm /tmp/team-map.json \
      --slurpfile topo src/data/topology.json '
  $topo[0].services
  | to_entries
  | map(select(.value.namespace != null))
  | map({
      service_id: .key,
      namespace: .value.namespace,
      current_team: .value.team,
      catalog_owner: ($cat[0][.value.namespace] // null),
      expected_team: ($tm[0][$cat[0][.value.namespace] // ""] // null)
    })
  | map(select(.expected_team != null and .current_team != .expected_team))
  | sort_by(.service_id)
'
```

### 4. Report and confirm

Show the user the list of mismatches in a table:

```
service_id              namespace      current → expected         catalog_owner
---                     ---            ---                        ---
lec-gateway-api         web-gateway    cloud-front-end → cloud-enrichment   Cloud Enrichment
```

**Always confirm before applying corrections.** A namespace can legitimately be shared by services owned by different teams in rare cases — defer to the user when in doubt.

### 5. Apply

Use `Edit` on each affected service block. Match enough surrounding context (`"id": ...`, `"repository": ...`) so the `team` line is unambiguous.

### 6. Verify

Run `npm test` (21 tests should pass) and `jq -e . src/data/topology.json` to confirm no JSON corruption.

## Edge cases

- **namespace == null**: Some services in topology may lack a namespace. Skip them and report so the user can fill in manually.
- **catalog deployment not in topology**: The catalog has ~84 deployments, topology has ~142 services (a deployment can produce multiple services like `lec-asset-api-*` workloads). All map back via the same namespace, so this is expected — not a problem.
- **catalog owner string maps to no topology team**: e.g. "redjack", "datascience", "Datanauts". Surface to user; either add the team to topology or skip the affected services.
- **multiple services share a namespace with different current teams**: Report all of them at once; usually they should all match the catalog owner.

## Non-goals

This skill does NOT touch consumes/produces/grpcCalls/databases/topic counts. Those require per-service evidence (see `inventory-deployments/<ns>/values.yaml` `topics:` block) and are out of scope for a team-only reconciliation.
