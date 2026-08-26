# kafka-visor

Interactive topology visualizer for Lansweeper's services, Kafka topics and API call graph. Renders a service/topic dependency graph (React Flow) built from a static, pre-extracted `topology.json` catalog — no backend, no live scanning.

## Features

- **Topology graph** — services, Kafka topics, producer/consumer edges, and synchronous service→service API edges (resolved from the dev-portal catalog's `providesApis`/`consumesApis`).
- **Team filtering** — show/hide the graph by owning team.
- **Detail panel** — per-node info: blast radius, inbound/outbound API dependents, gRPC calls, Redis pub/sub, databases, Argo CD links, source repos.
- **Search & navigate** — jump to any service or topic; click through call-graph relationships.
- **Flow Mode** — curated, manually-laid-out mini-diagrams of specific business processes (e.g. an asset-scanning pipeline), editable in the UI and saved back to `src/data/flows/*.json` via a dev-only Vite middleware (not available in the production build).

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server (with HMR and the flow-save API middleware) |
| `npm run build` | Typecheck (`tsc -b`) and produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |

## Data pipeline

The graph is driven entirely by `src/data/topology.json`, a static snapshot rebuilt from several sources (not run automatically — requires access to internal Lansweeper systems):

| Command | Source | Produces |
|---|---|---|
| `npm run extract` | Kafka migration doc (`engineering-docs`) | Base `topology.json`: teams, services, topics, producer/consumer edges |
| `npm run enrich` | `kubectl` (live cluster) | `runningInCluster` / `deploymentType` per service |
| `npm run enrich:quill` | Quill (internal code intelligence) | gRPC calls, Redis pub/sub, database connections |
| `npm run enrich:catalog` | `lansweeper-apps-catalog` | `providesApis` / `consumesApis` service→service dependencies; flags team-ownership discrepancies (fixed separately via the `reconcile-teams` skill) |
| `npm run data` | all of the above, in order | Full rebuild |

Flow definitions (`src/data/flows/*.json`) are curated separately and not part of this pipeline.

## Project structure

```
src/
  components/    React components (FlowCanvas, DetailPanel, SearchBar, node types, ...)
  lib/            Graph construction, blast-radius/API resolution, flow builder, layout
  data/           topology.json + curated flows/
  types.ts        Shared domain types (TopologyData, Service, Topic, ...)
scripts/          Data extraction/enrichment CLIs (see Data pipeline above)
```

## Continuous Integration

CircleCI (`.circleci/config.yml`) runs on every push: lint, typecheck + production build, and the Vitest suite, as independent parallel jobs.

## Tech stack

React 18 · TypeScript · Vite · [@xyflow/react](https://reactflow.dev/) (graph rendering) · ELK.js (auto-layout) · Tailwind CSS · Vitest
