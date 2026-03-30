# Reports Logic Split Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `Reports.vue` into smaller composables for report state, route sync, data loading, exports, and scheduled report orchestration without changing public page behavior.

**Architecture:** Keep `Reports.vue` as the composition shell and move logic into a small reports composable stack. Separate responsibilities by data flow: catalog/filter state, report loading/export/route sync, and scheduled report actions. Preserve the existing route contract, report catalog keys, and scheduled reports UI, so wrapper pages like `PremiumReport.vue` continue to work unchanged.

**Tech Stack:** Vue 3 Composition API, Vue Router 4, `frappe-ui` resources, Vitest, Vue Test Utils.

---

## Chunk 1: Extract report catalog and filter state

**Files:**
- Create: `frontend/src/composables/reports/catalog.js`
- Create: `frontend/src/composables/reports/state.js`
- Modify: `frontend/src/pages/Reports.vue`
- Test: `frontend/src/pages/Reports.test.js`

- [x] **Step 1: Write the failing test**

Add a focused test that mounts `Reports.vue`, changes the selected report key, and verifies the page still renders the new report label and filter section state.

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/Reports.test.js`
Expected: fail until the report catalog and filter state are extracted and wired back in.

- [x] **Step 3: Write minimal implementation**

Move the static report catalog, report filter config, column migration map, and initial filter/default state into `frontend/src/composables/reports/catalog.js` and `frontend/src/composables/reports/state.js`. Keep the page API identical by importing the new composables back into `Reports.vue`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/Reports.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/composables/reports/catalog.js frontend/src/composables/reports/state.js frontend/src/pages/Reports.vue frontend/src/pages/Reports.test.js
git commit -m "refactor: split reports catalog and state"
```

## Chunk 2: Extract report loading, export, and route sync

**Files:**
- Create: `frontend/src/composables/reports/runtime.js`
- Modify: `frontend/src/pages/Reports.vue`
- Test: `frontend/src/pages/Reports.test.js`

- [x] **Step 1: Write the failing test**

Add focused assertions for:
- route query sync for `report`, `report_cols`, `report_sort`, and `report_dir`
- loading a report after changing dates or preset selection
- exporting the current report in `pdf` and `xlsx` formats

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pages/Reports.test.js`
Expected: fail until the runtime logic is moved into a composable.

- [x] **Step 3: Write minimal implementation**

Move report fetch, debounce, export, column visibility, sort state, route sync, and preset hydration/save behavior into `frontend/src/composables/reports/runtime.js`. Keep the page wiring thin and pass in the existing resources and stores.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pages/Reports.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/composables/reports/runtime.js frontend/src/pages/Reports.vue frontend/src/pages/Reports.test.js
git commit -m "refactor: move reports runtime logic into composable"
```

## Chunk 3: Extract scheduled reports orchestration

**Files:**
- Create: `frontend/src/composables/reports/scheduled.js`
- Modify: `frontend/src/components/reports/ScheduledReportsManager.vue`
- Modify: `frontend/src/pages/Reports.vue`
- Test: `frontend/src/components/reports/ScheduledReportsManager.test.js`
- Test: `frontend/src/pages/Reports.test.js`

- [x] **Step 1: Write the failing test**

Add coverage for scheduled report load/save/remove/run behaviors from the page and manager integration.

- [x] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/reports/ScheduledReportsManager.test.js src/pages/Reports.test.js`
Expected: fail until scheduled report orchestration is moved out of the page.

- [x] **Step 3: Write minimal implementation**

Move scheduled report config loading, running, saving, deleting, and error handling into `frontend/src/composables/reports/scheduled.js`. Keep the manager component presentational and wire it to the new composable from `Reports.vue`.

- [x] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/reports/ScheduledReportsManager.test.js src/pages/Reports.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/composables/reports/scheduled.js frontend/src/components/reports/ScheduledReportsManager.vue frontend/src/pages/Reports.vue frontend/src/components/reports/ScheduledReportsManager.test.js frontend/src/pages/Reports.test.js
git commit -m "refactor: extract scheduled reports orchestration"
```

## Chunk 4: Verify and update tracker

**Files:**
- Modify: `REFACTOR_TAKIP.md`

- [x] **Step 1: Run focused regression checks**

Run:
- `npx vitest run src/pages/Reports.test.js`
- `npx vitest run src/components/reports/ScheduledReportsManager.test.js`
- `npm run build`

Expected: all pass.

- [x] **Step 2: Update tracker**

Mark the Reports refactor items complete in `REFACTOR_TAKIP.md` and keep the summary counts in sync.

- [ ] **Step 3: Commit**

```bash
git add REFACTOR_TAKIP.md
git commit -m "docs: update reports refactor tracker"
```
