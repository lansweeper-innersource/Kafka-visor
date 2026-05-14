# Plan: Flow Editor

## Goal

Visual flow editor reusing existing React Flow infra. No new deps, no backend.

## Tasks

- [ ] 1. Edit mode in FlowCanvas — `isEditing` prop enables onConnect, delete, connectionMode loose
- [ ] 2. Node palette — searchable sidebar (services + topics + ad-hoc scanner/db/flowRef), drag-to-canvas
- [ ] 3. Edge type picker — small popover on edge create/click (type + label)
- [ ] 4. Flow metadata — inline id/name/description in banner
- [ ] 5. Export — serialize canvas → FlowDefinition JSON → clipboard/download
- [ ] 6. "New Flow" + "Edit Flow" buttons wired in App.tsx

## New files

- `src/components/NodePalette.tsx` — drag palette
- `src/components/EdgeTypeModal.tsx` — type picker popover
- `src/lib/flow-serializer.ts` — canvas → FlowDefinition

## Modified files

- `src/App.tsx` — editing state, buttons, palette wiring
- `src/components/FlowCanvas.tsx` — isEditing prop, onConnect, drop handler
