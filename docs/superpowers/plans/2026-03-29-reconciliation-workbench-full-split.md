# ReconciliationWorkbench Full Split Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `ReconciliationWorkbench.vue` into focused composables and presentational components while fixing the current data-flow and import/export edge cases so the page stays functional in production.

**Architecture:** Keep the existing accounting store as the source of truth for rows and metrics, but move page-local orchestration, preset/filter state, import-preview state, and row-action helpers into dedicated composables. Move the action bar, metrics summary, filter panel, import dialog, preview sections, and list/table render into small components that only receive props and emit events. Preserve the current route/query behavior and verify the live page in Playwright after each major chunk.

**Tech Stack:** Vue 3 `<script setup>`, Pinia stores, Frappe `createResource`, existing app-shell components, Vitest, Vite, Playwright.

---

## Chunk 1: Stabilize runtime and extract the data-flow boundaries

**Files:**
- Modify: `frontend/src/pages/ReconciliationWorkbench.vue`
- Modify: `frontend/src/composables/useReconciliationWorkbenchRuntime.js`
- Create: `frontend/src/composables/useReconciliationWorkbenchFilters.js`
- Create: `frontend/src/composables/useReconciliationWorkbenchImport.js`
- Create: `frontend/src/composables/useReconciliationWorkbenchSummary.js`
- Create: `frontend/src/composables/useReconciliationWorkbenchActions.js`
- Modify: `frontend/src/pages/ReconciliationWorkbench.test.js`

- [ ] **Step 1: Write the failing test**

Add or adjust a focused page smoke test that covers the current live symptoms and the expected stable behaviors:
- workbench metrics render
- import dialog opens and previews statement rows
- filter changes reload the row set
- bulk resolve / sync / reconcile actions remain wired

The test should also assert the page does not regress into the known empty/error state when the workbench payload is loaded.

- [ ] **Step 2: Run the test to verify the current baseline**

Run: `npm run test:unit -- --run src/pages/ReconciliationWorkbench.test.js`
Expected: PASS on the current baseline before the split.

- [ ] **Step 3: Extract the runtime boundaries**

Move these responsibilities out of `ReconciliationWorkbench.vue`:
- filter/preset state and active-count derivation
- statement import dialog state, preview, and submit flow
- reconciliation summary/metric derivation
- row-action helpers and source-panel navigation
- existing runtime orchestration for sync/reconcile/bulk actions

Keep the page shell responsible only for wiring the composables and passing state into the template.

- [ ] **Step 4: Run unit and build verification**

Run: `npm run test:unit -- --run src/pages/ReconciliationWorkbench.test.js`
Run: `npm run build`
Expected: both pass with no page behavior regressions.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ReconciliationWorkbench.vue frontend/src/composables/useReconciliationWorkbenchRuntime.js frontend/src/composables/useReconciliationWorkbenchFilters.js frontend/src/composables/useReconciliationWorkbenchImport.js frontend/src/composables/useReconciliationWorkbenchSummary.js frontend/src/composables/useReconciliationWorkbenchActions.js frontend/src/pages/ReconciliationWorkbench.test.js
git commit -m "refactor: split ReconciliationWorkbench runtime"
```

## Chunk 2: Presentational split

**Files:**
- Create: `frontend/src/components/reconciliation-workbench/ReconciliationWorkbenchActionBar.vue`
- Create: `frontend/src/components/reconciliation-workbench/ReconciliationWorkbenchMetricsPanel.vue`
- Create: `frontend/src/components/reconciliation-workbench/ReconciliationWorkbenchFilterSection.vue`
- Create: `frontend/src/components/reconciliation-workbench/ReconciliationWorkbenchImportDialog.vue`
- Create: `frontend/src/components/reconciliation-workbench/ReconciliationWorkbenchPreviewSections.vue`
- Create: `frontend/src/components/reconciliation-workbench/ReconciliationWorkbenchTableSection.vue`
- Modify: `frontend/src/pages/ReconciliationWorkbench.vue`

- [ ] **Step 1: Write the failing test**

Update the page smoke test to cover the new component boundaries by asserting the same buttons, metrics, import dialog, preview sections, and table rows still exist and still trigger the same callbacks.

- [ ] **Step 2: Run the test to verify the current baseline**

Run: `npm run test:unit -- --run src/pages/ReconciliationWorkbench.test.js`
Expected: PASS before component extraction.

- [ ] **Step 3: Extract the UI sections**

Replace inline toolbar, metrics, filter panel, import dialog, preview sections, and list/table markup with focused components that receive props and emit events only.

Ensure the live labels used by the current playbook remain intact:
- `Mutabakat Masası` / `Reconciliation Workbench`
- `Ekstre Önizleme`
- `Mutabakat Aksiyonu`
- preview section headings and table headings

- [ ] **Step 4: Run unit and build verification**

Run: `npm run test:unit -- --run src/pages/ReconciliationWorkbench.test.js`
Run: `npm run build`
Expected: both pass with no UI regressions.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ReconciliationWorkbench.vue frontend/src/components/reconciliation-workbench
git commit -m "refactor: split ReconciliationWorkbench UI"
```

## Chunk 3: Live verification and tracker cleanup

**Files:**
- Create: `frontend/tests/e2e/reconciliation-workbench-smoke.spec.js`
- Modify: `BUYUK_EKRAN_REFACTOR_TAKIP.md`
- Modify: `frontend/src/pages/ReconciliationWorkbench.vue`

- [ ] **Step 1: Write the live smoke test**

Add a Playwright smoke test that:
- authenticates against the current environment
- opens `/at/reconciliation`
- asserts the heading, metrics, filter toolbar, preview sections, and table are visible
- opens the import dialog and checks it renders
- verifies there are no console errors or failed responses during the flow

- [ ] **Step 2: Run the live smoke test**

Run: `npx playwright test frontend/tests/e2e/reconciliation-workbench-smoke.spec.js --reporter=line`
Expected: PASS against `at.localhost:8000`.

- [ ] **Step 3: Update the tracker**

Mark `ReconciliationWorkbench.vue` as `Tamamlandı` only when the runtime split, presentational split, and live smoke test all pass.

- [ ] **Step 4: Run final verification**

Run: `npm run test:unit -- --run src/pages/ReconciliationWorkbench.test.js`
Run: `npm run build`
Run: `npx playwright test frontend/tests/e2e/reconciliation-workbench-smoke.spec.js --reporter=line`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/tests/e2e/reconciliation-workbench-smoke.spec.js BUYUK_EKRAN_REFACTOR_TAKIP.md frontend/src/pages/ReconciliationWorkbench.vue
git commit -m "refactor: finish ReconciliationWorkbench split"
```
