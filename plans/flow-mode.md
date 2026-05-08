# Implementation Plan: Flow Mode — Curated Business Process Visualization

**Created:** 2026-05-08
**Status:** Draft
**Estimated Effort:** M (Medium)

## Summary

Add "Flow Mode" to kafka-visor — a way to visualize curated end-to-end business processes as mini-graphs. When a user selects a flow from search, the canvas swaps the topology for a dedicated flow view with manual node positioning, step-numbered edges, interaction-type badges, and new node types for on-prem scanners and databases. Existing service/topic nodes are reused with their current visual style.

## Research Findings

### React Flow v12 Patterns (from agent research)
- **Mode switching**: snapshot topology nodes/edges in refs, swap in flow nodes via `setNodes`/`setEdges`, restore on exit
- **EdgeLabelRenderer**: portal for HTML labels on edges — `getSmoothStepPath()` returns `[path, labelX, labelY]`
- **Manual layout**: for 5-15 nodes, compute positions directly (no ELK needed)
- **nodeTypes/edgeTypes**: must be defined outside component to prevent remounts
- **animateMotion**: `<animateMotion>` + `<mpath href="#edgeId">` for dot animation along edges

### Quill Data (from pipeline_evidence)
- Scanning flow traced: Edge Agent → public-broker → DataCore → Adapter → enriching → analytics → ClickHouse
- gRPC calls: adapter→data-core-inbound, public-broker→multitenant, analytics→luzmo-plugin
- DB connections: ClickHouse (analytics), MongoDB (asset-consumer, public-broker), Redis (shared)
- Scanner entities: Lansweeper.IT (IT Agent), On-Prem Classic, HUB — call config-api, syncer-api via gRPC

### Codebase Patterns
- Node types are `React.memo`-wrapped components defined outside FlowCanvas
- `useElkLayout` hook pattern for layout — flow mode skips this entirely
- `buildGraph()` in graph-builder.ts builds nodes/edges from topology — flow-builder.ts mirrors this pattern
- SearchBar already has `type: 'topic' | 'service'` — extending with `'flow'` is natural

## Questions to Resolve

### Critical (P1 - Blockers)
None — approach is confirmed.

### Important (P2 - Affects implementation)
1. **Flow definitions source**: Manual `flows.json` curated by teams. Start with 1 flow (scanning-flow-vnext from Boss's diagram). More flows added incrementally.

## Implementation Order (TDD)

### Step 1: Types + Flow Colors
- **Test:** `src/lib/flow-colors.test.ts` - getInteractionStyle returns correct colors for each type
- **Implement:**
  - `src/types.ts` — add `FlowDefinition`, `FlowNode`, `FlowEdge` types
  - `src/lib/flow-colors.ts` — `INTERACTION_COLORS` map + `getInteractionStyle(type)`
- **Validation:** Tests pass

### Step 2: Flow Builder
- **Test:** `src/lib/flow-builder.test.ts` - buildFlowNodes/buildFlowEdges create correct React Flow nodes and edges from a flow definition, with proper positions, node types, and edge data
- **Implement:** `src/lib/flow-builder.ts`
  - `buildFlowNodes(flow, topology)` — creates Node[] from flow definition. For service/topic nodes that exist in topology, enriches with team color and metadata. For scanner/database nodes, creates with flow-specific data.
  - `buildFlowEdges(flow)` — creates Edge[] with step numbers, interaction types, colors
- **Depends on:** Step 1
- **Validation:** Tests pass

### Step 3: New Node Components (ScannerNode + DatabaseNode)
- **Implement:**
  - `src/components/nodes/ScannerNode.tsx` — dashed border, gray bg, antenna/radar icon, `React.memo`
  - `src/components/nodes/DatabaseNode.tsx` — amber accent, cylinder shape, `React.memo`
- **Depends on:** Step 1
- **Validation:** TypeScript compiles

### Step 4: FlowEdge Component
- **Implement:** `src/components/edges/FlowEdge.tsx`
  - Uses `getSmoothStepPath` for path + label coordinates
  - `BaseEdge` with stroke color from `getInteractionStyle(data.interactionType)`
  - `EdgeLabelRenderer` for:
    - Step number badge (dark circle, white text)
    - Interaction type label below (colored pill)
  - Optional `animateMotion` dot along edge path
- **Depends on:** Step 1
- **Validation:** TypeScript compiles

### Step 5: Flow Data (flows.json)
- **Implement:** `src/data/flows.json` — scanning-flow-vnext definition based on Boss's diagram:
  - Discovery path: IT Agent → HUB → Discovery → DataCore ETL → Kafka topics → AdapterAPI
  - Classic path: On-Prem → Classic → SyncerAPIv2
  - Convergence: → public.edge.asset.event → AssetConsumer → MongoDB
  - Manual x,y positions matching the diagram layout
- **Depends on:** Step 1 (types)
- **Validation:** JSON is valid, matches type definition

### Step 6: SearchBar — Flow Results
- **Implement:** Update `src/components/SearchBar.tsx`
  - Import flows.json
  - Add flow results with type `'flow'` and badge "F" (dark purple bg)
  - Update `SearchResult` type to include `'flow'`
- **Depends on:** Step 5
- **Validation:** TypeScript compiles, flows appear in search

### Step 7: FlowCanvas — Mode Switching
- **Implement:** Update `src/components/FlowCanvas.tsx`
  - Add `activeFlow: FlowDefinition | null` prop
  - Register new nodeTypes: `scanner: ScannerNode`, `database: DatabaseNode`
  - Register new edgeTypes: `flow: FlowEdge`
  - On `activeFlow` change:
    - Snapshot current topology nodes/edges to `topologyNodesRef`/`topologyEdgesRef`
    - Call `buildFlowNodes(activeFlow, topology)` + `buildFlowEdges(activeFlow)`
    - `setNodes(flowNodes)` + `setEdges(flowEdges)`
    - `fitView({ duration: 400, padding: 0.2 })`
  - On `activeFlow = null`:
    - Restore from refs
    - Re-trigger topology layout
- **Depends on:** Steps 2, 3, 4
- **Validation:** TypeScript compiles

### Step 8: App.tsx — Wire Flow Mode
- **Implement:** Update `src/App.tsx`
  - Add `activeFlow` state
  - `handleSearchSelect` — if result.type === 'flow', set activeFlow
  - Show "← Back to topology" banner when in flow mode (replaces team filter)
  - Show flow name + description in header
  - "Back" button clears activeFlow
  - Detail panel still works for service/topic nodes in flow mode
- **Depends on:** Steps 6, 7
- **Validation:** Full app works — search flow → flow mode → back to topology

### Final: Polish & Verification
- [ ] Search "scanning" → flow appears, select it → flow view renders
- [ ] All node types render correctly (scanner=dashed, database=amber, service=team color, topic=dark pill)
- [ ] Step numbers visible on edges
- [ ] Interaction type badges visible (kafka=green, grpc=purple, https=orange, db=amber)
- [ ] Click service node in flow → detail panel shows topology data
- [ ] "Back to topology" returns to previous view
- [ ] All existing tests still pass
- [ ] `npm run build` succeeds
- **Validation:** Lint clean, all tests pass

## Interaction Color Reference

| Type | Stroke | Badge BG | Badge Text |
|------|--------|----------|------------|
| kafka | `#22C55E` | `#14532D` | white |
| grpc | `#A855F7` | `#581C87` | white |
| https | `#F97316` | `#7C2D12` | white |
| protobuf | `#F97316` | `#7C2D12` | white |
| db | `#F59E0B` | `#78350F` | white |
| internal | `#6B7280` | `#374151` | white |
| sensor | `#6B7280` | `#374151` | white |

## Acceptance Criteria

- [ ] Search for "scanning" → "Scanning Flow vNext" appears as type F result
- [ ] Selecting flow swaps canvas to flow view with correct node layout
- [ ] Discovery + Classic paths visible with convergence at asset.event topic
- [ ] Scanner nodes (IT Agent, On-Prem, HUB) render with distinct dashed style
- [ ] Database node (MongoDB) renders with amber cylinder style
- [ ] Step numbers on edges (1-N) clearly show sequence
- [ ] Interaction type badges (kafka, grpc, https, db) color-coded
- [ ] Clicking a service node opens detail panel with full topology data
- [ ] "Back to topology" restores the Kafka topology view
- [ ] No visual changes to existing topology mode
- [ ] All 21+ existing tests still pass
- [ ] `npm run build` succeeds

## Performance Considerations

- Flow mode has 5-15 nodes (trivial for React Flow)
- No ELK computation needed — manual positions
- Topology snapshot/restore is O(n) array copy via refs
- nodeTypes/edgeTypes defined outside component — no remount risk

## Related Files

### New files
```
src/data/flows.json
src/lib/flow-builder.ts
src/lib/flow-builder.test.ts
src/lib/flow-colors.ts
src/lib/flow-colors.test.ts
src/components/edges/FlowEdge.tsx
src/components/nodes/ScannerNode.tsx
src/components/nodes/DatabaseNode.tsx
```

### Modified files
```
src/types.ts
src/App.tsx
src/components/FlowCanvas.tsx
src/components/SearchBar.tsx
```

---

## Next Steps

When ready to implement, run:
- `/wiz:work plans/flow-mode.md` - Execute the plan
- `/wiz:deepen-plan` - Get more detail on specific sections
