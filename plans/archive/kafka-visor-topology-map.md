# Implementation Plan: Kafka Visor - Topology Map

**Created:** 2026-05-06
**Status:** Complete
**Estimated Effort:** M (Medium)

## Summary

Build a React SPA that visualizes Lansweeper's Kafka topology: topics as central hub nodes connected to service nodes via directed edges (producer -> topic -> consumer). Services are color-coded by team (9 teams). The data is extracted from the engineering-docs markdown files into a static JSON, enriched with kubectl cluster data. The visualization uses React Flow v12 (`@xyflow/react`) with ELKjs for auto-layout.

## Research Findings

### Source Data Format (STEP_2_TOPICS_PER_SERVICE.md)

The primary data source is structured as:
- **Team sections**: `## @Lansweeper/{team-name}` headers group services
- **Service blocks**: Each contains:
  - Service name, Repository, Namespace
  - Markdown table: `| Topic | Consumer | Producer | Verified | Misconfiguration | Notes |`
  - Checkboxes: `[x]` = yes, `[ ]` = no
- **142 services** across 9 teams, **54 active topics**

### Topics Summary (STEP_4_TOPICS_SUMMARY.md)

- 104 total topics, 54 with active consumers/producers
- Summary table with: Consumers count, Producers count, Total Services, Consumer Groups, Teams count
- Special sections: consumers-without-producers (5), producers-without-consumers (15), orphaned (50)

### kubectl Enrichment (staging cluster)

- 152 namespaces with running deployments
- Deployments list cross-referenceable with documented services
- Two MSK clusters: `lsstgeuw1appmsk` (current) and `lsstgeuw1coremskexpres` (migration target)
- CronJobs and ScaledJobs also present

### React Flow v12 Architecture

- **Package**: `@xyflow/react` (v12.6.0+, rebranded from `reactflow`)
- **Custom nodes**: TopicNode (hexagonal/pill shape) and ServiceNode (rounded rectangle), defined outside component tree to prevent remounts
- **ELKjs layout**: `elkjs` for async auto-layout (dagre is deprecated). Algorithm: `layered`, direction: `RIGHT`
- **v12 specifics**: Use `node.measured.width/height` for layout, `useStore` with `useShallow` for perf, `onlyRenderVisibleElements` for viewport culling
- **Edge types**: Animated edges with different colors for producer (green) vs consumer (blue) flows
- **Filtering**: Toggle `hidden` property on nodes/edges (don't remove from array)

## Questions to Resolve

### Critical (P1 - Blockers)

None — requirements are clear.

### Important (P2 - Affects implementation)

1. **Production vs Staging data?** The markdown docs reference production (prd-euw1). kubectl is pointing to staging. The JSON will be parsed from the markdown (production data). kubectl enrichment will use staging to confirm service existence. This is fine for a topology map.

## Implementation Order (TDD)

### Step 1: Data Extraction Script

**Goal**: Parse STEP_2 markdown into a structured JSON file.

- **Test:** `scripts/extract-topology.test.ts` - Test markdown parser extracts correct topics, services, teams, and producer/consumer relationships from sample markdown
- **Implement:** `scripts/extract-topology.ts` - Node.js script that:
  1. Reads `STEP_2_TOPICS_PER_SERVICE.md`
  2. Parses team sections, service blocks, topic tables
  3. Extracts consumer/producer checkboxes
  4. Filters to only active topics (has at least 1 consumer OR 1 producer)
  5. Outputs `src/data/topology.json`
- **JSON Schema:**
  ```json
  {
    "teams": {
      "cloud-1": { "name": "cloud-1", "color": "#3B82F6", "fullName": "@Lansweeper/cloud-1" }
    },
    "topics": {
      "public.event.multitenant": {
        "id": "public.event.multitenant",
        "consumers": ["lec-backoffice-consumer", "..."],
        "producers": ["lec-multitenant-api", "..."],
        "consumerCount": 23,
        "producerCount": 23,
        "teamCount": 5
      }
    },
    "services": {
      "lec-backoffice-consumer": {
        "id": "lec-backoffice-consumer",
        "team": "cloud-1",
        "repository": "backoffice-deployments",
        "namespace": "backoffice-consumer",
        "produces": ["public.event.licensing", "scannerproxy.event.licensing"],
        "consumes": ["public.edge.install-status.event", "public.event.multitenant"],
        "runningInCluster": true
      }
    },
    "metadata": {
      "dataCollectionDate": "2026-04-19",
      "totalTopics": 54,
      "totalServices": 142,
      "totalTeams": 9
    }
  }
  ```
- **Validation:** Script runs, JSON is valid, counts match documented totals

### Step 2: kubectl Enrichment Script

**Goal**: Cross-reference JSON services with actual cluster deployments.

- **Test:** `scripts/enrich-kubectl.test.ts` - Test enrichment logic matches deployment names to service names
- **Implement:** `scripts/enrich-kubectl.ts` - Script that:
  1. Runs `kubectl get deployments --all-namespaces` 
  2. Matches namespace/deployment to services in topology.json
  3. Adds `runningInCluster: true/false` flag
  4. Adds `deploymentType: "Deployment" | "CronJob" | "ScaledJob" | "Unknown"`
  5. Writes enriched `src/data/topology.json`
- **Validation:** Enriched JSON has `runningInCluster` for all services

### Step 3: Project Setup (Vite + React + TypeScript + React Flow)

**Goal**: Scaffold the SPA project.

- **Implement:** Initialize project:
  ```
  npm create vite@latest . -- --template react-ts
  npm install @xyflow/react elkjs
  npm install -D tailwindcss @tailwindcss/vite
  ```
- **Files:**
  - `vite.config.ts` - Vite config with Tailwind plugin
  - `src/App.tsx` - Main app shell
  - `src/main.tsx` - Entry point
  - `src/index.css` - Tailwind v4 CSS-only config (`@import "tailwindcss"` + `@xyflow/react/dist/style.css` in `@layer base`). No `tailwind.config.js` needed in v4.
- **Validation:** `npm run dev` shows blank React app with React Flow canvas

### Step 4: Graph Data Transformation Layer

**Goal**: Transform topology.json into React Flow nodes and edges.

- **Test:** `src/lib/graph-builder.test.ts` - Test that:
  - Topic nodes are created for each active topic
  - Service nodes are created for each service
  - Producer edges go from service -> topic (green)
  - Consumer edges go from topic -> service (blue)
  - Node positions are computed by ELKjs (async, layered algorithm)
  - Filtering by team returns only relevant nodes/edges
- **Implement:** `src/lib/graph-builder.ts` - Functions:
  - `buildGraph(topology, filters)` -> `{ nodes: Node[], edges: Edge[] }`
  - `layoutGraph(nodes, edges)` -> positioned nodes using dagre
  - `filterByTeam(topology, teamIds)` -> filtered topology
- **Validation:** Unit tests pass, output matches React Flow node/edge format

### Step 5: Custom Nodes

**Goal**: Visual node components for topics and services.

- **Test:** `src/components/nodes/TopicNode.test.tsx` - Renders topic name, consumer/producer counts
- **Test:** `src/components/nodes/ServiceNode.test.tsx` - Renders service name with team color
- **Implement:**
  - `src/components/nodes/TopicNode.tsx` - Pill/hexagonal shape, dark background, shows topic name + stats
  - `src/components/nodes/ServiceNode.tsx` - Rounded rectangle, team-colored border/background, shows service name
- **Validation:** Components render correctly with mock data

### Step 6: Main Flow Canvas

**Goal**: React Flow canvas with all nodes and edges rendered.

- **Test:** `src/components/FlowCanvas.test.tsx` - Renders React Flow with nodes and edges
- **Implement:** `src/components/FlowCanvas.tsx` - Main component:
  - Loads topology.json
  - Calls `buildGraph()` to transform data
  - Renders `<ReactFlow>` with custom node types, minimap, controls
  - Animated edges with arrows indicating direction
  - Producer edges: green, dashed animation flowing toward topic
  - Consumer edges: blue, dashed animation flowing away from topic
- **Validation:** Graph renders with all nodes and edges, zoom/pan/drag works

### Step 7: Team Filter Panel

**Goal**: Sidebar to filter visible services by team.

- **Test:** `src/components/TeamFilter.test.tsx` - Toggle teams on/off, callback fires
- **Implement:** `src/components/TeamFilter.tsx` - Panel with:
  - Team checkboxes with team colors
  - "All" / "None" toggle
  - Service count per team
  - When unchecked, hide team's services and their edges (toggle `hidden` property, don't remove from array)
  - Default: no teams selected, prompt user to pick teams (196 nodes at once is overwhelming)
- **Validation:** Toggling teams shows/hides correct nodes

### Step 8: Node Detail Panel

**Goal**: Click a node to see details in a side panel.

- **Test:** `src/components/DetailPanel.test.tsx` - Shows correct details for topic vs service nodes
- **Implement:** `src/components/DetailPanel.tsx` - Slide-out panel:
  - **For topic**: name, consumer count, producer count, list of consumers (colored by team), list of producers (colored by team), team count
  - **For service**: name, team, repository, namespace, running status, list of topics consumed, list of topics produced
- **Validation:** Click node -> panel shows correct data

### Step 9: Team Color Legend & Layout

**Goal**: Final app layout with header, legend, canvas, panels.

- **Implement:** `src/App.tsx` - Wire everything together:
  - Header: "Kafka Visor" title + metadata (date, counts)
  - Left: Team filter panel
  - Center: React Flow canvas
  - Right: Detail panel (conditional)
  - Bottom: Team color legend
- **Validation:** Full app works end-to-end

### Final: Polish & Documentation

- [ ] Verify all 54 active topics render
- [ ] Verify all services render with correct team colors  
- [ ] Verify producer/consumer edge distinction is clear
- [ ] Verify filter by team works correctly
- [ ] Verify detail panel shows complete info
- [ ] Add `npm run extract` script to regenerate JSON
- [ ] Remove TODOs
- **Validation:** Lint clean, all tests pass, `npm run build` succeeds

## Team Color Palette

| Team | Color | Hex |
|------|-------|-----|
| cloud-1 | Blue | `#3B82F6` |
| cloud-2 | Purple | `#8B5CF6` |
| cloud-asset-and-visualisation | Teal | `#14B8A6` |
| cloud-data-pipeline-and-scanning | Orange | `#F97316` |
| cloud-enrichment | Pink | `#EC4899` |
| cloud-front-end | Amber | `#CA8A04` |
| cloud-integrations | Emerald | `#10B981` |
| data-core | Red | `#EF4444` |
| discovery-engineering | Indigo | `#6366F1` |

## Edge Visual Convention

| Type | Color | Style | Arrow |
|------|-------|-------|-------|
| Producer -> Topic | Green `#22C55E` | Solid, animated | Arrow at topic end |
| Topic -> Consumer | Blue `#3B82F6` | Dashed, animated | Arrow at consumer end |

*Solid vs dashed distinction ensures colorblind accessibility beyond color alone.*

## Acceptance Criteria

- [ ] All 54 active topics visible as hub nodes
- [ ] All services visible as nodes, colored by team
- [ ] Edges clearly distinguish producer vs consumer direction
- [ ] Click any node to see details
- [ ] Filter by team shows/hides relevant nodes
- [ ] Zoom, pan, drag all functional
- [ ] Static JSON regenerable via script from markdown source
- [ ] kubectl enrichment adds `runningInCluster` status
- [ ] `npm run build` produces a deployable SPA

## Security Considerations

- Internal tool only, no auth needed for v1
- No sensitive data in the JSON (only service names, topics, teams)
- kubectl data only used at build time, not at runtime

## Performance Considerations

- ~54 topic nodes + ~142 service nodes = ~196 nodes total
- Estimated ~400-600 edges
- Well within React Flow's performance limits (handles 1000+ nodes)
- ELKjs layout is async but <200ms for this size
- Use `onlyRenderVisibleElements` for viewport culling
- Define `nodeTypes`/`edgeTypes` outside component tree (v12 critical perf pattern)
- Memo custom node components with `React.memo`

## Related Files

```
kafka-visor/
  scripts/
    extract-topology.ts        # Parse markdown -> JSON
    extract-topology.test.ts
    enrich-kubectl.ts          # kubectl enrichment
    enrich-kubectl.test.ts
  src/
    data/
      topology.json            # Static data file
    lib/
      graph-builder.ts         # Transform JSON -> React Flow nodes/edges
      graph-builder.test.ts
    components/
      nodes/
        TopicNode.tsx
        TopicNode.test.tsx
        ServiceNode.tsx
        ServiceNode.test.tsx
      FlowCanvas.tsx
      FlowCanvas.test.tsx
      TeamFilter.tsx
      TeamFilter.test.tsx
      DetailPanel.tsx
      DetailPanel.test.tsx
    App.tsx
    main.tsx
    index.css
  package.json
  vite.config.ts
  tsconfig.json
  (no tailwind.config.js — Tailwind v4 uses CSS-only config)
```

---

## Next Steps

When ready to implement, run:
- `/wiz:work plans/kafka-visor-topology-map.md` - Execute the plan
- `/wiz:deepen-plan` - Get more detail on specific sections
- `/wiz:brainstorming` - discuss the plan details
