# Dashboard → WorkbenchPageLayout Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Dashboard's custom `<section class="page-shell">` shell with the shared `WorkbenchPageLayout` component, achieving DG 3.1 and DG 5.1 compliance.

**Architecture:** Dashboard's `DashboardHeader` component remains unchanged. The outer `<section class="page-shell">` wrapper is replaced with `<WorkbenchPageLayout>` which provides the same root HTML element plus standard header/metrics/actions/default slot structure. DashboardHeader content renders in the `#topbar` slot, metrics/loading skeleton in `#metrics`, and tab content in the default slot.

**Tech Stack:** Vue 3, Tailwind CSS, Vitest

**Risk Level:** MEDIUM — Dashboard is the most-visited page. Changes are structural (slot mapping) not functional. No business logic changes. Rollback: revert to `<section class="page-shell">`.

---

## Scope

Two files modified, one test file verified:

| File | Change |
|------|--------|
| `frontend/src/pages/Dashboard.vue:1-2` | `<section class="page-shell">` → `<WorkbenchPageLayout>` |
| `frontend/src/pages/Dashboard.vue:2-22` | `DashboardHeader` wraps in `#topbar` slot |
| `frontend/src/pages/Dashboard.vue:34-49` | Metric cards wrap in `#metrics` slot |
| `frontend/src/pages/Dashboard.vue:22` | Closing `</section>` → `</WorkbenchPageLayout>` |
| `frontend/src/pages/Dashboard.vue` (script) | Import `WorkbenchPageLayout` |
| `frontend/src/pages/Dashboard.vue:992` | Verify closing tag |

Existing test: `frontend/src/composables/__tests__/useDashboardFacts.test.js` — verify pass after migration.

---

### Task 1: Import WorkbenchPageLayout

**Files:**
- Modify: `frontend/src/pages/Dashboard.vue` (script section, imports area)

- [ ] **Step 1: Add the import**

Find the imports area in the `<script setup>` section of Dashboard.vue. The existing imports include `DashboardHeader`, `SaaSMetricCard`, etc. Add:

```javascript
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run build` from `frontend/`
Expected: SUCCESS (component is imported but not yet used in template — no error)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.vue
git commit -m "chore: add WorkbenchPageLayout import to Dashboard"
```

---

### Task 2: Replace shell with WorkbenchPageLayout and map slots

**Files:**
- Modify: `frontend/src/pages/Dashboard.vue:1-22` (template opening)
- Modify: `frontend/src/pages/Dashboard.vue:990-992` (template closing)

- [ ] **Step 1: Replace the opening tag and map DashboardHeader into #topbar slot**

BEFORE (current lines 1-22):
```html
<template>
  <section class="page-shell space-y-4 lg:space-y-5">
    <DashboardHeader
      :active-dashboard-tab="activeDashboardTab"
      :dashboard-tabs="dashboardTabs"
      :hero-subtitle="dashboardHeroSubtitle"
      :hero-tag="t('heroTag')"
      :hero-title="dashboardHeroTitle"
      :new-lead-label="t('newLead')"
      :range-label="rangeLabel"
      :range-label-text="t('rangeLabel')"
      :range-options="rangeOptions"
      :refresh-label="t('refresh')"
      :selected-range="selectedRange"
      :show-new-lead-action="showNewLeadAction"
      :visible-range="visibleRange"
      @apply-range="applyRange"
      @new-lead="openLeadDialog"
      @reload="reloadData"
      @set-dashboard-tab="setDashboardTab"
    />
```

AFTER:
```html
<template>
  <WorkbenchPageLayout
    :show-record-count="false"
  >
    <template #topbar>
      <DashboardHeader
        :active-dashboard-tab="activeDashboardTab"
        :dashboard-tabs="dashboardTabs"
        :hero-subtitle="dashboardHeroSubtitle"
        :hero-tag="t('heroTag')"
        :hero-title="dashboardHeroTitle"
        :new-lead-label="t('newLead')"
        :range-label="rangeLabel"
        :range-label-text="t('rangeLabel')"
        :range-options="rangeOptions"
        :refresh-label="t('refresh')"
        :selected-range="selectedRange"
        :show-new-lead-action="showNewLeadAction"
        :visible-range="visibleRange"
        @apply-range="applyRange"
        @new-lead="openLeadDialog"
        @reload="reloadData"
        @set-dashboard-tab="setDashboardTab"
      />
    </template>
```

Note: WorkbenchPageLayout renders its own `<section class="page-shell space-y-4">` wrapper. The DashboardHeader inside `#topbar` slot REPLACES the default breadcrumb/title/subtitle header, which is correct — DashboardHeader already provides its own hero-style header.

`showRecordCount` is set to `false` because DashboardHeader has its own range indicator.

- [ ] **Step 2: Wrap metrics in #metrics slot**

BEFORE (current lines 34-49):
```html
    <!-- audit(perf/P-04): Skeleton loader hides the blank white screen while KPIs load -->
    <SkeletonLoader
      v-if="dashboardLoading && !visibleQuickStatCards.length"
      variant="card"
      :count="4"
    />
    <div v-else class="grid gap-3 md:gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardStatCard
        v-for="card in visibleQuickStatCards"
        :key="card.key"
        :title="card.title"
        :value="card.value"
        :icon="card.icon"
        :t="t"
      />
    </div>
```

AFTER:
```html
    <template #metrics>
      <SkeletonLoader
        v-if="dashboardLoading && !visibleQuickStatCards.length"
        variant="card"
        :count="4"
      />
      <div v-else class="grid gap-3 md:gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          v-for="card in visibleQuickStatCards"
          :key="card.key"
          :title="card.title"
          :value="card.value"
          :icon="card.icon"
          :t="t"
        />
      </div>
    </template>
```

- [ ] **Step 3: Replace closing tag**

BEFORE: Find the closing `</section>` at the bottom of the template (around line 990-992):
```html
  </section>
</template>
```

AFTER:
```html
  </WorkbenchPageLayout>
</template>
```

- [ ] **Step 4: Verify template structure**

Check there are exactly 3 slot wrappers in the template:
1. `#topbar` wrapping DashboardHeader
2. `#metrics` wrapping DashboardStatCard loading/cards
3. Default slot (implicit) wrapping all remaining content (access message, analytics row, tab content, lead dialog)

- [ ] **Step 5: Run lint and tests**

Run: `npm run lint` from `frontend/`
Expected: PASS (no errors)

Run: `npm run test:unit` from `frontend/`
Expected: All tests pass

- [ ] **Step 6: Run build**

Run: `npm run build` from `frontend/`
Expected: SUCCESS (green build, no warnings related to Dashboard)

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Dashboard.vue
git commit -m "refactor: Dashboard page-shell → WorkbenchPageLayout

Replace custom <section class='page-shell'> wrapper with the shared
WorkbenchPageLayout component (DG 3.1, DG 5.1 compliance).

DashboardHeader renders in #topbar slot (replaces default header).
Metric cards render in #metrics slot.
Tab content renders in default slot.

No business logic changes. DashboardHeader unchanged.
ShowRecordCount disabled (DashboardHeader handles its own range display)."
```

---

### Task 3: Visual verification checklist

- [ ] **Step 1: Verify the hero header still renders correctly**
  - The DashboardHeader gradient background, blur decorations, hero tag/title/subtitle, range pills, and buttons should look identical

- [ ] **Step 2: Verify metric cards still render correctly**
  - The 4-column stat card grid with skeleton loading should look identical

- [ ] **Step 3: Verify tab content still renders correctly**
  - Switching between Dashboard tabs (overview, sales, collections, renewals) should work identically

- [ ] **Step 4: Verify responsive behavior**
  - Mobile viewport should show stacked layout identically
  - Desktop should show the same grid layout

- [ ] **Step 5: Verify access message banner**
  - If `dashboardAccessMessage` is set, the banner should render with AT semantic colors

---

### Task 4: Deploy and smoke test

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

- [ ] **Step 2: Wait for GHCR workflow**
  - Monitor: https://github.com/ayktbrkk/acentem_takipte/actions

- [ ] **Step 3: Deploy to production**

```powershell
pwsh -File scripts/deploy_prod_coolify_ghcr.ps1 -SkipAuthenticatedSmokeTest
```

- [ ] **Step 4: Smoke test**

```powershell
Invoke-WebRequest -UseBasicParsing -Uri "https://kipsigorta.acentemtakipte.com/api/method/ping"
Invoke-WebRequest -UseBasicParsing -Uri "https://kipsigorta.acentemtakipte.com/at/dashboard"
```

Expected: Both return 200.

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| DashboardHeader slot positioning differs | WorkbenchPageLayout's `#topbar` slot REPLACES the default header area — DashboardHeader renders in full width at top |
| `space-y-4 lg:space-y-5` lost | WorkbenchPageLayout uses `space-y-4`. The `lg:space-y-5` responsive override is subtle and visually acceptable |
| Missing `#metrics` section wrapper affects analytics row spacing | The `#metrics` section in WorkbenchPageLayout has `v-if="$slots.metrics"` wrapper which adds `<section>` — minimal spacing impact |
| Default slot content order changes | All content after `#metrics` slot goes into the default slot in order — identical to current |
