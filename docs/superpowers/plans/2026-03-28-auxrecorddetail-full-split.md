# AuxRecordDetail Full Split Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `frontend/src/pages/AuxRecordDetail.vue` into focused composables and presentational components so the page becomes a thin shell while preserving current lifecycle actions, quick edit, and detail rendering behavior.

**Architecture:** Keep the existing detail data flow and app stores as the source of truth, but move page-local orchestration, action handling, and derived view state into focused composables. Move the topbar, hero strip, detail tabs, sidebar summary, and action groups into small components that only render props and emit events. Keep lifecycle mutations and navigation in composables so the page only wires state, handlers, and slots together.

**Tech Stack:** Vue 3 `<script setup>`, Pinia stores, existing app-shell components, Vitest, Vite.

---

## Chunk 1: AuxRecordDetail logic boundaries

**Files:**
- Create: `frontend/src/composables/useAuxRecordDetailRuntime.js`
- Create: `frontend/src/composables/useAuxRecordDetailSummary.js`
- Create: `frontend/src/composables/useAuxRecordDetailActions.js`
- Modify: `frontend/src/pages/AuxRecordDetail.vue`
- Modify: `frontend/src/pages/AuxRecordDetail.test.js`

- [x] **Step 1: Write the failing test**

Update the page smoke test to cover the current detail page state, topbar actions, quick edit entrypoint, panel navigation, and lifecycle buttons after the split.

- [x] **Step 2: Run the test to verify the current baseline**

Run: `npm run test:unit -- --run src/pages/AuxRecordDetail.test.js`
Expected: PASS on current baseline before the split.

- [x] **Step 3: Extract the logic helpers**

Move record loading, normalized detail state, derived summary items, lifecycle action helpers, quick edit plumbing, and desk/panel navigation into the new composables. Keep the page shell responsible only for wiring and template slots.

- [x] **Step 4: Run unit and build verification**

Run: `npm run test:unit -- --run src/pages/AuxRecordDetail.test.js`
Run: `npm run build`
Expected: both pass with no page behavior regressions.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/AuxRecordDetail.vue frontend/src/pages/AuxRecordDetail.test.js frontend/src/composables/useAuxRecordDetailRuntime.js frontend/src/composables/useAuxRecordDetailSummary.js frontend/src/composables/useAuxRecordDetailActions.js
git commit -m "refactor: split AuxRecordDetail logic"
```

## Chunk 2: AuxRecordDetail presentational split

**Files:**
- Create: `frontend/src/components/aux-record-detail/AuxRecordDetailTopbar.vue`
- Create: `frontend/src/components/aux-record-detail/AuxRecordDetailHero.vue`
- Create: `frontend/src/components/aux-record-detail/AuxRecordDetailSidebar.vue`
- Create: `frontend/src/components/aux-record-detail/AuxRecordDetailSectionGroup.vue`
- Create: `frontend/src/components/aux-record-detail/AuxRecordDetailTabs.vue`
- Create: `frontend/src/components/aux-record-detail/AuxRecordDetailQuickEditDialog.vue`
- Modify: `frontend/src/pages/AuxRecordDetail.vue`

- [x] **Step 1: Write the failing test**

Update the page smoke test to assert the topbar, hero strip, tabs, sidebar summary, and quick edit dialog still render and trigger the same callbacks after UI extraction.

- [x] **Step 2: Run the test to verify the current baseline**

Run: `npm run test:unit -- --run src/pages/AuxRecordDetail.test.js`
Expected: PASS before component extraction.

- [x] **Step 3: Extract the UI sections**

Replace inline topbar, hero, sidebar, tabs, section group, and quick edit dialog markup with focused components that receive props and emit events only.

- [x] **Step 4: Run unit and build verification**

Run: `npm run test:unit -- --run src/pages/AuxRecordDetail.test.js`
Run: `npm run build`
Expected: both pass with no UI regressions.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/AuxRecordDetail.vue frontend/src/components/aux-record-detail
git commit -m "refactor: split AuxRecordDetail UI"
```

## Chunk 3: Tracker and cleanup

**Files:**
- Modify: `BUYUK_EKRAN_REFACTOR_TAKIP.md`
- Modify: `frontend/src/pages/AuxRecordDetail.vue`

- [x] **Step 1: Clean up page-scope leftovers**

Remove any stale helper functions or unused imports that remain after the split. Keep the shell minimal and avoid introducing new abstractions unless they replace real page logic.

- [ ] **Step 2: Update the tracker**

Mark `AuxRecordDetail.vue` as `Tamamlandı` only when logic, actions, and UI boundaries are all split and build/tests pass.

- [x] **Step 3: Run final verification**

Run: `npm run test:unit -- --run src/pages/AuxRecordDetail.test.js`
Run: `npm run build`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/AuxRecordDetail.vue BUYUK_EKRAN_REFACTOR_TAKIP.md
git commit -m "refactor: finish AuxRecordDetail split"
```

