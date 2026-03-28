# CommunicationCenter Full Split Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `CommunicationCenter.vue` into small composables and presentational components so the page becomes a thin shell while preserving current behavior.

**Architecture:** Keep the existing communication store as the source of truth for snapshot data, but move page-local orchestration, action handling, and view-state derivations into focused composables. Move the toolbar, metrics, filters, context banner, outbox table, draft grid, and dialogs into small components that only render props and emit events. Keep route intent handling and snapshot dispatch logic in composables so the page only wires state, handlers, and slots together.

**Tech Stack:** Vue 3 `<script setup>`, Pinia store, Frappe `createResource`, existing app-shell components, Vitest, Vite.

---

## Chunk 1: CommunicationCenter composable boundaries

**Files:**
- Create: `frontend/src/composables/communicationCenter/state.js`
- Create: `frontend/src/composables/communicationCenter/runtime.js`
- Create: `frontend/src/composables/communicationCenter/actions.js`
- Create: `frontend/src/composables/communicationCenter/quickDialogs.js`
- Modify: `frontend/src/pages/CommunicationCenter.vue`

- [x] **Step 1: Write the failing test**

Add or adjust a focused page smoke test that asserts the page still renders the same actions, metrics, filters, outbox, drafts, and dialogs after the split.

- [x] **Step 2: Run the test to verify the current baseline**

Run: `npm run test:unit -- --run src/pages/CommunicationCenter.test.js`
Expected: PASS on current baseline before the split.

- [x] **Step 3: Extract the state/runtime helpers**

Move computed state, route/query sync, preset handling, snapshot reload, dispatch-cycle orchestration, and error/loading state into the new composables. Keep the page shell responsible only for wiring and template slots.

- [x] **Step 4: Run unit and build verification**

Run: `npm run test:unit -- --run src/pages/CommunicationCenter.test.js`
Run: `npm run build`
Expected: both pass with no page behavior regressions.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/CommunicationCenter.vue frontend/src/composables/communicationCenter
git commit -m "refactor: split CommunicationCenter logic"
```

## Chunk 2: CommunicationCenter presentational split

**Files:**
- Create: `frontend/src/components/communication-center/CommunicationCenterActionBar.vue`
- Create: `frontend/src/components/communication-center/CommunicationCenterMetricsPanel.vue`
- Create: `frontend/src/components/communication-center/CommunicationCenterFilterSection.vue`
- Create: `frontend/src/components/communication-center/CommunicationCenterContextBanner.vue`
- Create: `frontend/src/components/communication-center/CommunicationCenterOutboxTable.vue`
- Create: `frontend/src/components/communication-center/CommunicationCenterDraftGrid.vue`
- Create: `frontend/src/components/communication-center/CommunicationCenterDialogs.vue`
- Modify: `frontend/src/pages/CommunicationCenter.vue`

- [x] **Step 1: Write the failing test**

Update the page smoke test to cover the new component boundaries by asserting the same buttons, metrics, tables, and dialogs still exist and trigger the same callbacks.

- [x] **Step 2: Run the test to verify the current baseline**

Run: `npm run test:unit -- --run src/pages/CommunicationCenter.test.js`
Expected: PASS before component extraction.

- [x] **Step 3: Extract the UI sections**

Replace inline toolbar, metrics, filter, context banner, outbox table, draft grid, and dialog markup with focused components that receive props and emit events only.

- [x] **Step 4: Run unit and build verification**

Run: `npm run test:unit -- --run src/pages/CommunicationCenter.test.js`
Run: `npm run build`
Expected: both pass with no UI regressions.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/CommunicationCenter.vue frontend/src/components/communication-center
git commit -m "refactor: split CommunicationCenter UI"
```

## Chunk 3: Tracker and cleanup

**Files:**
- Modify: `BUYUK_EKRAN_REFACTOR_TAKIP.md`
- Modify: `frontend/src/pages/CommunicationCenter.vue`

- [x] **Step 1: Clean up page-scope leftovers**

Remove any stale helper functions or unused imports that remain after the split. Keep the shell minimal and avoid introducing new abstractions unless they replace real page logic.

- [x] **Step 2: Update the tracker**

Mark `CommunicationCenter.vue` as `Tamamlandı` only when logic, actions, and UI boundaries are all split and build/tests pass.

- [x] **Step 3: Run final verification**

Run: `npm run test:unit -- --run src/pages/CommunicationCenter.test.js`
Run: `npm run build`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/CommunicationCenter.vue BUYUK_EKRAN_REFACTOR_TAKIP.md
git commit -m "refactor: finish CommunicationCenter split"
```
