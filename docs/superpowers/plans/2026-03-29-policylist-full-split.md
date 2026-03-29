# PolicyList Full Split Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `PolicyList.vue` into focused composables and UI sections while preserving policy filtering, presets, quick policy creation, export, pagination, and detail navigation behavior.

**Architecture:** Keep `PolicyList.vue` as a thin shell that wires composables into presentational components. Separate filter state, remote preset sync, runtime/list orchestration, quick policy flow, table data derivation, and row actions into small composables. `usePolicyListPresetSync` owns the remote hydrate/persist path for filter presets. Render the page through dedicated UI sections for actions, metrics, filters, table, and quick policy dialog.

**Tech Stack:** Vue 3 `<script setup>`, Composition API, `frappe-ui`, existing policy store/runtime helpers, Vitest.

---

## Chunk 1: Extract filter state and remote preset sync

**Files:**
- Create: `frontend/src/composables/usePolicyListFilters.js`
- Create: `frontend/src/composables/usePolicyListPresetSync.js`
- Create: `frontend/src/composables/usePolicyListFilters.test.js`
- Create: `frontend/src/composables/usePolicyListPresetSync.test.js`
- Modify: `frontend/src/pages/PolicyList.vue`
- Modify: `frontend/src/pages/PolicyList.test.js`

- [x] **Step 1: Write the failing test**

```js
// usePolicyListFilters.test.js
// Assert preset key hydration, custom preset persistence, remote preset sync, and active filter count behavior.
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test:unit -- --run src/composables/usePolicyListFilters.test.js src/composables/usePolicyListPresetSync.test.js`
Expected: FAIL because the composables do not exist yet.

- [x] **Step 3: Write minimal implementation**

```js
// Extract preset state, custom preset list, local status/branch filters into `usePolicyListFilters`.
// Extract server preset hydrate/persist into `usePolicyListPresetSync`.
// Keep the page API identical to the current template bindings.
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test:unit -- --run src/composables/usePolicyListFilters.test.js src/composables/usePolicyListPresetSync.test.js`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add frontend/src/composables/usePolicyListFilters.js frontend/src/composables/usePolicyListPresetSync.js frontend/src/composables/usePolicyListFilters.test.js frontend/src/composables/usePolicyListPresetSync.test.js frontend/src/pages/PolicyList.vue frontend/src/pages/PolicyList.test.js
git commit -m "refactor: extract PolicyList filter state"
```

## Chunk 2: Extract runtime, table data, and actions

**Files:**
- Create: `frontend/src/composables/usePolicyListRuntime.js`
- Create: `frontend/src/composables/usePolicyListTableData.js`
- Create: `frontend/src/composables/usePolicyListActions.js`
- Create: `frontend/src/composables/usePolicyListRuntime.test.js`
- Create: `frontend/src/composables/usePolicyListTableData.test.js`
- Create: `frontend/src/composables/usePolicyListActions.test.js`
- Modify: `frontend/src/pages/PolicyList.vue`
- Modify: `frontend/src/pages/PolicyList.test.js`

- [x] **Step 1: Write the failing tests**

```js
// Runtime: list refresh, pagination, export, office branch lookup payload.
// Table data: filtered rows, visible rows, counts, and summary metrics.
// Actions: detail navigation and row-level helpers.
```

- [x] **Step 2: Run tests to verify they fail**

Run:
`cd frontend && npm run test:unit -- --run src/composables/usePolicyListRuntime.test.js src/composables/usePolicyListTableData.test.js src/composables/usePolicyListActions.test.js`

Expected: FAIL because the composables do not exist yet.

- [x] **Step 3: Write minimal implementation**

```js
// Move list refresh, export, route sync, and query builder helpers into runtime.
// Move row filtering, paged rows, and summary metrics into table data.
// Move open detail and other policy entry actions into actions.
```

- [x] **Step 4: Run tests to verify they pass**

Run:
`cd frontend && npm run test:unit -- --run src/composables/usePolicyListRuntime.test.js src/composables/usePolicyListTableData.test.js src/composables/usePolicyListActions.test.js`

Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add frontend/src/composables/usePolicyListRuntime.js frontend/src/composables/usePolicyListTableData.js frontend/src/composables/usePolicyListActions.js frontend/src/composables/usePolicyListRuntime.test.js frontend/src/composables/usePolicyListTableData.test.js frontend/src/composables/usePolicyListActions.test.js frontend/src/pages/PolicyList.vue frontend/src/pages/PolicyList.test.js
git commit -m "refactor: extract PolicyList runtime and table logic"
```

## Chunk 3: Extract quick policy flow

**Files:**
- Create: `frontend/src/composables/usePolicyListQuickPolicy.js`
- Create: `frontend/src/composables/usePolicyListQuickPolicy.test.js`
- Modify: `frontend/src/pages/PolicyList.vue`
- Modify: `frontend/src/pages/PolicyList.test.js`

- [x] **Step 1: Write the failing test**

```js
// Assert dialog visibility, source-offer handling, cancel/reset, and submit hooks.
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm run test:unit -- --run src/composables/usePolicyListQuickPolicy.test.js`
Expected: FAIL because the composable does not exist yet.

- [x] **Step 3: Write minimal implementation**

```js
// Delegate to the existing quick policy runtime, but keep PolicyList-specific dialog state here.
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm run test:unit -- --run src/composables/usePolicyListQuickPolicy.test.js`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add frontend/src/composables/usePolicyListQuickPolicy.js frontend/src/composables/usePolicyListQuickPolicy.test.js frontend/src/pages/PolicyList.vue frontend/src/pages/PolicyList.test.js
git commit -m "refactor: extract PolicyList quick policy flow"
```

## Chunk 4: Split the UI into focused sections

**Files:**
- Create: `frontend/src/components/policy-list/PolicyListActionBar.vue`
- Create: `frontend/src/components/policy-list/PolicyListMetricsPanel.vue`
- Create: `frontend/src/components/policy-list/PolicyListFilterSection.vue`
- Create: `frontend/src/components/policy-list/PolicyListTableSection.vue`
- Create: `frontend/src/components/policy-list/PolicyListQuickPolicyDialog.vue`
- Modify: `frontend/src/pages/PolicyList.vue`
- Modify: `frontend/src/pages/PolicyList.test.js`

- [x] **Step 1: Write the failing page/component tests**

```js
// Assert the page still renders the action bar, metrics, filters, table, and quick policy dialog.
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm run test:unit -- --run src/pages/PolicyList.test.js`
Expected: FAIL until the page shell is rewired.

- [x] **Step 3: Write minimal implementation**

```vue
<!-- Replace inline template blocks with focused components. Keep props and emits explicit. -->
```

- [x] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm run test:unit -- --run src/pages/PolicyList.test.js`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add frontend/src/components/policy-list frontend/src/pages/PolicyList.vue frontend/src/pages/PolicyList.test.js
git commit -m "refactor: split PolicyList UI into sections"
```

## Chunk 5: Final verification and tracker update

**Files:**
- Modify: `frontend/src/pages/PolicyList.test.js`
- Modify: `BUYUK_EKRAN_REFACTOR_TAKIP.md`
- Modify: `docs/superpowers/plans/2026-03-29-policylist-full-split.md` if any scope changes were needed during implementation

- [x] **Step 1: Run the focused tests**

Run:
`cd frontend && npm run test:unit -- --run src/composables/usePolicyListFilters.test.js src/composables/usePolicyListPresetSync.test.js src/composables/usePolicyListRuntime.test.js src/composables/usePolicyListTableData.test.js src/composables/usePolicyListActions.test.js src/composables/usePolicyListQuickPolicy.test.js src/pages/PolicyList.test.js`

Expected: PASS.

- [x] **Step 2: Run the build**

Run: `cd frontend && npm run build`
Expected: PASS.

- [x] **Step 3: Run diff hygiene**

Run: `git diff --check`
Expected: PASS with no new whitespace errors.

- [x] **Step 4: Update the tracker**

```md
Mark `PolicyList` as complete in `BUYUK_EKRAN_REFACTOR_TAKIP.md`.
```

- [x] **Step 5: Commit**

```bash
git add BUYUK_EKRAN_REFACTOR_TAKIP.md docs/superpowers/plans/2026-03-29-policylist-full-split.md
git commit -m "docs: finalize PolicyList split plan"
```
