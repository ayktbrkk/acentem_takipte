# AuxRecordDetail Full Split Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish splitting `AuxRecordDetail.vue` into small runtime/composable boundaries and presentational components without changing behavior.

**Architecture:** Keep the page as a thin shell that wires a record runtime, summary derivations, action handlers, and dialog state into small UI components. Preserve the existing aux-detail registry behavior, quick-edit flow, lifecycle actions, and routing semantics while tightening the remaining helper logic and testing the page end-to-end.

**Tech Stack:** Vue 3, Composition API, `frappe-ui`, Pinia, Vitest, Playwright.

---

### Chunk 1: Audit and finish logic boundaries

**Files:**
- Modify: `frontend/src/pages/AuxRecordDetail.vue`
- Modify: `frontend/src/composables/useAuxRecordDetailRuntime.js`
- Modify: `frontend/src/composables/useAuxRecordDetailSummary.js`
- Modify: `frontend/src/composables/useAuxRecordDetailActions.js`
- Create: `frontend/src/composables/useAuxRecordDetailQuickDialogs.js`
- Test: `frontend/src/pages/AuxRecordDetail.test.js`
- Test: `frontend/src/composables/useAuxRecordDetailRuntime.test.js`
- Test: `frontend/src/composables/useAuxRecordDetailSummary.test.js`
- Test: `frontend/src/composables/useAuxRecordDetailActions.test.js`
- Test: `frontend/src/composables/useAuxRecordDetailQuickDialogs.test.js`

- [ ] **Step 1: Capture the current failing/remaining helper surface in tests**

```js
it('keeps aux detail loading, lifecycle and quick-edit behavior intact', async () => {
  // mount page with the current registry-driven stub resources
  // assert the topbar, hero, tabs and quick-edit dialog bindings still exist
  // assert load/reload and quick-edit option hydration are triggered
})
```

- [ ] **Step 2: Run the targeted tests and observe the current baseline**

Run: `npm run test:unit -- --run src/pages/AuxRecordDetail.test.js src/composables/useAuxRecordDetailRuntime.test.js src/composables/useAuxRecordDetailSummary.test.js src/composables/useAuxRecordDetailActions.test.js src/composables/useAuxRecordDetailQuickDialogs.test.js`
Expected: one or more failures highlighting the remaining helper boundary gaps.

- [ ] **Step 3: Move any remaining page-scope helper logic into the runtime/summary/actions/dialog composables**

```js
// keep the page shell only for wiring and tiny local copy strings
// all stateful helper logic should live in composables
```

- [ ] **Step 4: Re-run the targeted tests until they pass**

Run: `npm run test:unit -- --run src/pages/AuxRecordDetail.test.js src/composables/useAuxRecordDetailRuntime.test.js src/composables/useAuxRecordDetailSummary.test.js src/composables/useAuxRecordDetailActions.test.js src/composables/useAuxRecordDetailQuickDialogs.test.js`
Expected: PASS.

### Chunk 2: Finish the UI split

**Files:**
- Create/Modify: `frontend/src/components/aux-record-detail/AuxRecordDetailTopbar.vue`
- Create/Modify: `frontend/src/components/aux-record-detail/AuxRecordDetailHero.vue`
- Create/Modify: `frontend/src/components/aux-record-detail/AuxRecordDetailTabs.vue`
- Create/Modify: `frontend/src/components/aux-record-detail/AuxRecordDetailMainContent.vue`
- Create/Modify: `frontend/src/components/aux-record-detail/AuxRecordDetailSidebar.vue`
- Create/Modify: `frontend/src/components/aux-record-detail/AuxRecordDetailQuickDialogs.vue`
- Modify: `frontend/src/pages/AuxRecordDetail.vue`
- Test: `frontend/src/pages/AuxRecordDetail.test.js`

- [ ] **Step 1: Write focused wrapper/component smoke tests**

```js
it('renders the aux record shell sections through wrappers', async () => {
  // assert topbar, hero, tabs, main content, sidebar, and dialog shell render
})
```

- [ ] **Step 2: Run the page test and confirm UI stubs still match**

Run: `npm run test:unit -- --run src/pages/AuxRecordDetail.test.js`
Expected: PASS.

- [ ] **Step 3: Remove any leftover template chunks from the page**

```vue
<!-- page should only import and wire the shell components -->
```

- [ ] **Step 4: Re-run build after the UI split**

Run: `npm run build`
Expected: PASS.

### Chunk 3: Live verification and tracker cleanup

**Files:**
- Modify: `BUYUK_EKRAN_REFACTOR_TAKIP.md`
- Modify: `frontend/src/pages/AuxRecordDetail.test.js` if a regression assertion needs to be locked in

- [ ] **Step 1: Verify live page behavior with Playwright**

Run: `http://at.localhost:8000/at/aux-records/...` (use a known valid aux record route from the app)
Expected: page renders, no console errors, topbar/hero/sidebar/tabs appear.

- [ ] **Step 2: Update the tracking row to Tamamlandı**

```md
| 3 | `AuxRecordDetail.vue` | `Tamamlandı` | Runtime, summary, actions and quick-dialog boundaries plus UI wrappers are split; page shell only wires the pieces | - | Detail sayfası composable/component sınırlarında ayrışmış olur | `npm run test:unit -- --run src/pages/AuxRecordDetail.test.js` + `npm run build` |
```

- [ ] **Step 3: Commit the completed split**

```bash
git add frontend/src/pages/AuxRecordDetail.vue frontend/src/composables/useAuxRecordDetail*.js frontend/src/components/aux-record-detail/*.vue BUYUK_EKRAN_REFACTOR_TAKIP.md frontend/src/pages/AuxRecordDetail.test.js
git commit -m "Split AuxRecordDetail into composables and sections"
```

### Acceptance Criteria

- `AuxRecordDetail.vue` is a thin shell.
- Runtime, summary, actions, and quick-dialog logic live in composables.
- Topbar, hero, tabs, main content, sidebar, and dialog wrappers are present.
- Record load, lifecycle actions, and quick edit behavior remain intact.
- Page tests and build pass.
- Tracking row is updated to `Tamamlandı`.

### Verification Gates

- `npm run test:unit -- --run src/pages/AuxRecordDetail.test.js src/composables/useAuxRecordDetailRuntime.test.js src/composables/useAuxRecordDetailSummary.test.js src/composables/useAuxRecordDetailActions.test.js src/composables/useAuxRecordDetailQuickDialogs.test.js`
- `npm run build`
- Playwright smoke against a valid aux record route on `at.localhost:8000`
- `git diff --check`
