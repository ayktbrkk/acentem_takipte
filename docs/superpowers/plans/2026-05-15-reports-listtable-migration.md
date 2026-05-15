# Reports ListTable Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Reports page custom `<table>` to shared `ListTable` component, extending ListTable with sort, custom formatter, group-header rows, and preview-column capabilities.

**Architecture:** Extend `ListTable.vue` with opt-in props (`sortColumn`, `sortDirection`, `visibleColumns`, `showPreview`) and column-def properties (`sortable`, `format`). Sort operates in two modes: controlled (parent manages, used by Reports) and uncontrolled (ListTable manages internally). Group headers use `_isGroupHeader` row flag. Preview column mirrors existing `clickable` pattern.

**Tech Stack:** Vue 3 + Composition API, Vitest, Frappe UI

---

### Task 0: Read spec and current code

- [ ] **Step 1: Read design spec**

Read `docs/superpowers/specs/2026-05-15-reports-listtable-migration.md`

- [ ] **Step 2: Read current ListTable.vue and ListTable.test.js**

Read `frontend/src/components/ui/ListTable.vue`
Read `frontend/src/components/ui/ListTable.test.js`

- [ ] **Step 3: Read ReportsTableSection.vue**

Read `frontend/src/components/reports/ReportsTableSection.vue`

- [ ] **Step 4: Read Reports.vue (relevant parts)**

Read `frontend/src/pages/Reports.vue`

- [ ] **Step 5: Read useReportsTableData.js (relevant parts)**

Read `frontend/src/composables/useReportsTableData.js`

---

### Task 1: ListTable — Add `format` column def + default cell rendering

**Files:**
- Modify: `frontend/src/components/ui/ListTable.vue`
- Modify: `frontend/src/components/ui/ListTable.test.js`

- [ ] **Step 1: Write failing test for `format` function on column def**

Add to `ListTable.test.js`:

```js
it("renders using custom format function when provided", () => {
  const wrapper = mount(ListTable, {
    props: {
      ...baseProps,
      columns: [
        { key: "name", label: "Name", format: (val) => val.toUpperCase() },
      ],
      rows: [{ name: "hello" }],
    },
  });
  expect(wrapper.text()).toContain("HELLO");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/ListTable.test.js --reporter=verbose`
Expected: FAIL — "renders using custom format function when provided"

- [ ] **Step 3: Implement `format` support in ListTable.vue**

In the `<td>` rendering loop, before the `type` checks, add:

```vue
<template v-if="col.format">
  {{ col.format(row[col.key], row) }}
</template>
```

This must come before the `type` checks so `format` takes precedence.

- [ ] **Step 4: Implement default cell rendering (no type, no format)**

After all `type` checks, add an `else` block:

```vue
<span v-else class="text-[13px] text-slate-900">
  {{ row[col.key] != null ? row[col.key] : '-' }}
</span>
```

- [ ] **Step 5: Write failing test for default rendering**

```js
it("renders raw value when no type and no format", () => {
  const wrapper = mount(ListTable, {
    props: {
      ...baseProps,
      columns: [{ key: "foo", label: "Foo" }],
      rows: [{ foo: "bar" }],
    },
  });
  expect(wrapper.text()).toContain("bar");
});

it("renders dash for null value when no type and no format", () => {
  const wrapper = mount(ListTable, {
    props: {
      ...baseProps,
      columns: [{ key: "foo", label: "Foo" }],
      rows: [{ foo: null }],
    },
  });
  expect(wrapper.text()).toContain("-");
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/ui/ListTable.test.js --reporter=verbose`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ui/ListTable.vue frontend/src/components/ui/ListTable.test.js
git commit -m "feat(ListTable): add format column def and default cell rendering"
```

---

### Task 2: ListTable — Add `visibleColumns` prop

**Files:**
- Modify: `frontend/src/components/ui/ListTable.vue`
- Modify: `frontend/src/components/ui/ListTable.test.js`

- [ ] **Step 1: Write failing test for `visibleColumns` prop**

```js
it("filters columns when visibleColumns prop is provided", () => {
  const wrapper = mount(ListTable, {
    props: {
      ...baseProps,
      columns: [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
        { key: "c", label: "C" },
      ],
      visibleColumns: ["a", "c"],
      rows: [{ a: "1", b: "2", c: "3" }],
    },
  });
  expect(wrapper.text()).toContain("1");
  expect(wrapper.text()).not.toContain("2");
  expect(wrapper.text()).toContain("3");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/ListTable.test.js --reporter=verbose`
Expected: FAIL

- [ ] **Step 3: Add `visibleColumns` prop**

```js
visibleColumns: { type: Array, default: null },
```

- [ ] **Step 4: Create `effectiveColumns` computed**

Replace direct `columns` usage in the template with `effectiveColumns`:

```js
const effectiveColumns = computed(() => {
  if (!props.visibleColumns || !props.visibleColumns.length) return props.columns;
  return props.columns.filter((col) => props.visibleColumns.includes(col.key));
});
```

- [ ] **Step 5: Update template to use `effectiveColumns` instead of `columns`**

Replace `v-for="col in columns"` with `v-for="col in effectiveColumns"` in both `<thead>` and `<tbody>`.

Also update the colspan calculation: `:colspan="effectiveColumns.length + ..."`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/ui/ListTable.test.js --reporter=verbose`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ui/ListTable.vue frontend/src/components/ui/ListTable.test.js
git commit -m "feat(ListTable): add visibleColumns prop for column filtering"
```

---

### Task 3: ListTable — Add sort support

**Files:**
- Modify: `frontend/src/components/ui/ListTable.vue`
- Modify: `frontend/src/components/ui/ListTable.test.js`

- [ ] **Step 1: Write failing test for uncontrolled sort (internal)**

```js
it("sorts rows internally when sortColumn is not provided and column is sortable", async () => {
  const wrapper = mount(ListTable, {
    props: {
      ...baseProps,
      columns: [
        { key: "name", label: "Name", sortable: true },
      ],
      rows: [{ name: "beta" }, { name: "alpha" }, { name: "gamma" }],
    },
    global: { stubs: { StatusBadge: true } },
  });
  // Default order: beta, alpha, gamma
  const cells = wrapper.findAll("td");
  expect(cells[0].text()).toBe("beta");
  // Click header to sort asc
  await wrapper.find("th button").trigger("click");
  const cellsAsc = wrapper.findAll("td");
  expect(cellsAsc[0].text()).toBe("alpha");
  // Click again to sort desc
  await wrapper.find("th button").trigger("click");
  const cellsDesc = wrapper.findAll("td");
  expect(cellsDesc[0].text()).toBe("gamma");
});
```

- [ ] **Step 2: Write failing test for controlled sort mode**

```js
it("emits sort events in controlled mode when sortColumn prop is set", async () => {
  const wrapper = mount(ListTable, {
    props: {
      ...baseProps,
      columns: [
        { key: "name", label: "Name", sortable: true },
      ],
      rows: [{ name: "beta" }, { name: "alpha" }],
      sortColumn: "name",
      sortDirection: "",
    },
    global: { stubs: { StatusBadge: true } },
  });
  // Click to sort asc
  await wrapper.find("th button").trigger("click");
  expect(wrapper.emitted("update:sortDirection")[0]).toEqual(["asc"]);
  // Click to sort desc
  await wrapper.find("th button").trigger("click");
  expect(wrapper.emitted("update:sortDirection")[1]).toEqual(["desc"]);
});
```

- [ ] **Step 3: Write failing test for sort indicator**

```js
it("shows sort indicator when column is sorted", () => {
  const wrapper = mount(ListTable, {
    props: {
      ...baseProps,
      columns: [
        { key: "name", label: "Name", sortable: true },
      ],
      rows: [{ name: "alpha" }],
      sortColumn: "name",
      sortDirection: "asc",
    },
    global: { stubs: { StatusBadge: true } },
  });
  expect(wrapper.find("th").text()).toContain("▲");
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run src/components/ui/ListTable.test.js --reporter=verbose`
Expected: FAIL (3 fail)

- [ ] **Step 5: Add sort props and events**

```js
sortColumn: { type: String, default: "" },
sortDirection: { type: String, default: "" },
```

Add to emits:
```js
defineEmits(["row-click", "update:sortColumn", "update:sortDirection", "preview-click"]);
```

- [ ] **Step 6: Create `isControlledSort` computed and sort state**

```js
const isControlledSort = computed(() => props.sortColumn !== undefined && props.sortColumn !== "");
const internalSortColumn = ref("");
const internalSortDirection = ref("");

const activeSortColumn = computed(() => isControlledSort.value ? props.sortColumn : internalSortColumn.value);
const activeSortDirection = computed(() => isControlledSort.value ? props.sortDirection : internalSortDirection.value);
```

- [ ] **Step 7: Make header sortable clickable**

Replace the current `<th>` content:

```html
<th
  v-for="col in effectiveColumns"
  :key="col.key"
  :style="col.width ? `width: ${col.width}` : ''"
  :class="[
    'px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider text-slate-400',
    col.align === 'right' && 'text-right',
    col.align === 'center' && 'text-center',
  ]"
>
  <button
    v-if="col.sortable"
    type="button"
    class="inline-flex w-full items-center justify-between gap-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-600"
    @click="onSortClick(col.key)"
  >
    <span>{{ formatHeaderLabel(col.label) }}</span>
    <span v-if="activeSortColumn === col.key" class="text-[10px] text-slate-400">
      {{ activeSortDirection === 'asc' ? '▲' : '▼' }}
    </span>
  </button>
  <span v-else>{{ formatHeaderLabel(col.label) }}</span>
</th>
```

- [ ] **Step 8: Implement `onSortClick` function**

```js
function onSortClick(column) {
  if (isControlledSort.value) {
    // Controlled mode: emit events, parent handles sort
    const nextDir = nextSortDirection(props.sortColumn === column ? props.sortDirection : "");
    if (props.sortColumn !== column) {
      emit("update:sortColumn", column);
      emit("update:sortDirection", "asc");
    } else {
      emit("update:sortDirection", nextDir);
    }
  } else {
    // Uncontrolled mode: sort internally
    const nextDir = nextSortDirection(internalSortColumn.value === column ? internalSortDirection.value : "");
    if (internalSortColumn.value !== column) {
      internalSortColumn.value = column;
      internalSortDirection.value = "asc";
    } else {
      internalSortDirection.value = nextDir;
    }
  }
}

function nextSortDirection(current) {
  if (current === "" || current === "desc") return "asc";
  if (current === "asc") return "desc";
  return "asc";
}
```

- [ ] **Step 9: Implement internal sort on rows**

Create a `sortedRows` computed that applies internal sort when in uncontrolled mode:

```js
const sortedRows = computed(() => {
  if (!props.rows || !props.rows.length) return props.rows;
  if (isControlledSort.value) return props.rows;
  if (!internalSortColumn.value || !internalSortDirection.value) return props.rows;

  const col = internalSortColumn.value;
  const dir = internalSortDirection.value === "asc" ? 1 : -1;
  return [...props.rows].sort((a, b) => {
    const aVal = a[col];
    const bVal = b[col];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === "number" && typeof bVal === "number") {
      return (aVal - bVal) * dir;
    }
    return String(aVal).localeCompare(String(bVal)) * dir;
  });
});
```

- [ ] **Step 10: Fix the colspan calculation for group headers**

The group header colspan should account for the number of effective columns:

```html
<td :colspan="effectiveColumns.length + (showPreview ? 1 : 0) + (clickable ? 1 : 0)">
```

This will be done in Task 4 but note the calculation here.

- [ ] **Step 11: Use `sortedRows` in template**

Replace `<tr v-for="row in rows"` with `<tr v-for="row in sortedRows"`.

- [ ] **Step 12: Run tests to verify they pass**

Run: `npx vitest run src/components/ui/ListTable.test.js --reporter=verbose`
Expected: PASS

- [ ] **Step 13: Commit**

```bash
git add frontend/src/components/ui/ListTable.vue frontend/src/components/ui/ListTable.test.js
git commit -m "feat(ListTable): add sort support (controlled + uncontrolled)"
```

---

### Task 4: ListTable — Add group-header row rendering

**Files:**
- Modify: `frontend/src/components/ui/ListTable.vue`
- Modify: `frontend/src/components/ui/ListTable.test.js`

- [ ] **Step 1: Write failing test for group header row**

```js
it("renders group header rows with merged colspan", () => {
  const wrapper = mount(ListTable, {
    props: {
      ...baseProps,
      columns: [
        { key: "name", label: "Name" },
        { key: "value", label: "Value" },
      ],
      rows: [
        { _isGroupHeader: true, _groupTitle: "Group: A (2)", value: 100 },
        { name: "a1", value: 50 },
        { name: "a2", value: 50 },
        { _isGroupHeader: true, _groupTitle: "Group: B (1)", value: 200 },
        { name: "b1", value: 200 },
      ],
    },
    global: { stubs: { StatusBadge: true } },
  });
  expect(wrapper.text()).toContain("Group: A (2)");
  expect(wrapper.text()).toContain("Group: B (1)");
  expect(wrapper.text()).toContain("a1");
  expect(wrapper.text()).toContain("b1");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/ListTable.test.js --reporter=verbose`
Expected: FAIL

- [ ] **Step 3: Add group-header template before normal rows**

In `<tbody>`, add this before the normal `<tr v-for="row in sortedRows">`:

```html
<template v-for="row in sortedRows" :key="row.name ?? row.id">
  <tr v-if="row._isGroupHeader" class="bg-slate-100/80 border-y border-slate-200">
    <td
      :colspan="effectiveColumns.length + (showPreview ? 1 : 0) + (clickable ? 1 : 0)"
      class="px-4 py-2"
    >
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-slate-800 uppercase tracking-wide">
          {{ row._groupTitle }}
        </span>
      </div>
    </td>
  </tr>
  <tr
    v-else
    :key="row.name ?? row.id"
    :class="[
      'cursor-pointer border-b border-gray-100 transition-colors duration-100 last:border-0',
      row._urgency || 'hover:bg-gray-50',
    ]"
    @click="$emit('row-click', row)"
  >
    ...
  </tr>
</template>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/ui/ListTable.test.js --reporter=verbose`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/ListTable.vue frontend/src/components/ui/ListTable.test.js
git commit -m "feat(ListTable): add group-header row rendering via _isGroupHeader flag"
```

---

### Task 5: ListTable — Add preview column

**Files:**
- Modify: `frontend/src/components/ui/ListTable.vue`
- Modify: `frontend/src/components/ui/ListTable.test.js`

- [ ] **Step 1: Write failing test for preview column**

```js
it("shows preview button when showPreview is true", async () => {
  const wrapper = mount(ListTable, {
    props: {
      ...baseProps,
      columns: [{ key: "name", label: "Name" }],
      rows: [{ name: "test", id: "1" }],
      showPreview: true,
    },
    global: { stubs: { StatusBadge: true } },
  });
  expect(wrapper.find('svg').exists()).toBe(true);
});

it("emits preview-click when preview button clicked", async () => {
  const wrapper = mount(ListTable, {
    props: {
      ...baseProps,
      columns: [{ key: "name", label: "Name" }],
      rows: [{ name: "test", id: "1" }],
      showPreview: true,
    },
    global: { stubs: { StatusBadge: true } },
  });
  await wrapper.find('button[title="Preview"]').trigger("click");
  expect(wrapper.emitted("preview-click")).toBeTruthy();
  expect(wrapper.emitted("preview-click")[0][0]).toEqual({ name: "test", id: "1" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/ListTable.test.js --reporter=verbose`
Expected: FAIL

- [ ] **Step 3: Add `showPreview` prop and implement preview column**

```js
showPreview: { type: Boolean, default: false },
```

Add preview `<th>` in `<thead>` after the columns loop:

```html
<th v-if="showPreview" class="w-10 bg-gray-50 px-4 py-2.5"></th>
```

Add preview `<td>` in each `<tr>`:

```html
<td v-if="showPreview" class="w-10 px-4 py-3 text-right">
  <button
    type="button"
    class="rounded-full p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-brand-600"
    :title="'Preview'"
    @click.stop="$emit('preview-click', row)"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  </button>
</td>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/ui/ListTable.test.js --reporter=verbose`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/ListTable.vue frontend/src/components/ui/ListTable.test.js
git commit -m "feat(ListTable): add showPreview prop with preview button column"
```

---

### Task 6: ReportsTableSection — Migrate to ListTable

**Files:**
- Rewrite: `frontend/src/components/reports/ReportsTableSection.vue`
- Modify: `frontend/src/composables/useReportsTableData.js` (remove dead functions)
- Modify: `frontend/src/pages/Reports.vue` (wiring)

- [ ] **Step 1: Update ReportsTableSection.vue — import and convert column defs**

Replace the entire template and script. New structure:

```vue
<template>
  <SectionPanel
    :title="activeReportLabel"
    :count="sortedRows.length"
    :meta="branchScopeLabel"
    panel-class="surface-card rounded-2xl p-5"
  >
    <!-- Column pills (unchanged) -->
    <div class="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500">
      <span>{{ t("columns") }}: {{ columnsSummaryLabel }}</span>
      <span v-if="exportLoading">{{ t("exporting") }}</span>
    </div>

    <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <p class="text-xs text-slate-600">{{ t("columnHint") }}</p>
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
            {{ columnsSummaryLabel }}
          </span>
          <ActionButton variant="secondary" size="sm" @click="onShowAllColumns">
            {{ t("showAllColumns") }}
          </ActionButton>
        </div>
      </div>
      <!-- column pills (unchanged) -->
      <div class="mt-3 rounded-xl border border-slate-200 bg-white/90 p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{{ t("columns") }}</p>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {{ columnsSummaryLabel }}
          </span>
        </div>
        <div class="mt-2 max-h-40 overflow-y-auto flex flex-wrap gap-2">
          <button
            v-for="column in columns"
            :key="`all-${column}`"
            type="button"
            :class="isColumnVisible(column)
              ? 'inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-brand-700 transition hover:bg-sky-100'
              : 'inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100'"
            @click="onToggleColumn(column)"
          >
            {{ getColumnLabel(column) }}
          </button>
        </div>
      </div>

      <!-- Group-by pills (unchanged) -->
      <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700">{{ t("groupBy") || 'Group By' }}</p>
          <span v-if="groupByColumn" class="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            {{ getColumnLabel(groupByColumn) }}
          </span>
        </div>
        <div class="mt-2 flex flex-wrap gap-2">
          <button
            v-for="column in Array.from(groupableColumns)"
            :key="`group-${column}`"
            type="button"
            :class="groupByColumn === column
              ? 'inline-flex items-center rounded-full border border-amber-400 bg-amber-200 px-2.5 py-1 text-xs font-bold text-amber-900 transition'
              : 'inline-flex items-center rounded-full border border-amber-100 bg-white px-2.5 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100'"
            @click="$emit('on-group-by-change', column)"
          >
            {{ getColumnLabel(column) }}
          </button>
        </div>
      </div>
    </div>

    <!-- Error state using EmptyState -->
    <EmptyState
      v-if="error"
      class="mt-4"
      :title="t('loadErrorTitle')"
      :description="error"
    />

    <!-- Empty state -->
    <EmptyState
      v-else-if="!loading && sortedRows.length === 0"
      class="mt-4"
      :title="t('emptyTitle')"
      :description="t('emptyDescription')"
    />

    <!-- ListTable -->
    <div v-else-if="!loading" class="mt-4">
      <ListTable
        :columns="columnDefs"
        :rows="sortedRows"
        :loading="false"
        :sort-column="sortColumn"
        :sort-direction="sortDirection"
        :visible-columns="visibleColumnKeys.length ? visibleColumnKeys : null"
        :show-preview="true"
        @update:sort-column="$emit('update:sort-column', $event)"
        @update:sort-direction="$emit('update:sort-direction', $event)"
        @preview-click="$emit('on-preview-click', $event)"
      />
    </div>
  </SectionPanel>
</template>
```

- [ ] **Step 2: Compute columnDefs from visibleColumnKeys**

In the script section, add:

```js
const columnDefs = computed(() => {
  const cols = columns.value || [];
  return cols.map((key) => ({
    key,
    label: getColumnLabel(key),
    sortable: true,
    format: (value, row) => formatCellValue(key, value, row),
  }));
});
```

- [ ] **Step 3: Update Props — remove unused, add sort/preview props**

Change the prop definitions. Remove: `isColumnVisible`, `onToggleColumn`, `onShowAllColumns`, `getColumnLabel`, `onToggleSort`, `getSortIndicator`, `formatCellValue`, `isRowClickable`, `onRowClick`, `groupByColumn`, `groupableColumns`.

Add: `sortColumn`, `sortDirection`, `columns`, `visibleColumnKeys`, `isColumnVisible`, `onToggleColumn`, `onShowAllColumns`, `getColumnLabel`, `formatCellValue`, `groupByColumn`, `groupableColumns`.

Keep: `activeReportLabel`, `branchScopeLabel`, `columnsSummaryLabel`, `sortedRows`, `loading`, `error`, `exportLoading`, `t`.

- [ ] **Step 4: Update emits — remove table-specific, add sort/preview**

```js
defineEmits(["on-preview-click", "on-group-by-change", "update:sort-column", "update:sort-direction"]);
```

- [ ] **Step 5: Add EmptyState import**

```js
import EmptyState from "../app-shell/EmptyState.vue";
```

ListTable import will be in Reports.vue since it renders through the wrapper.

Wait, actually ListTable needs to be imported in ReportsTableSection.vue:

```js
import EmptyState from "../app-shell/EmptyState.vue";
import ListTable from "../ui/ListTable.vue";
import ActionButton from "../app-shell/ActionButton.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
```

- [ ] **Step 6: Run existing Reports tests to confirm the ReportsTableSection change works with updated props**

Run: `npx vitest run src/pages/Reports.test.js --reporter=verbose`
Expected: FAIL (Reports.vue still passes old props that no longer exist)

- [ ] **Step 7: Update Reports.vue — pass new props and handle new events**

In Reports.vue, update the ReportsTableSection usage:

```vue
<ReportsTableSection
  :active-report-label="activeReportLabel"
  :branch-scope-label="branchScopeLabel"
  :columns-summary-label="columnsSummaryLabel"
  :columns="columns"
  :visible-column-keys="visibleColumnKeys"
  :sorted-rows="sortedRows"
  :loading="loading"
  :error="error"
  :export-loading="exportLoading"
  :is-column-visible="isColumnVisible"
  :on-toggle-column="toggleColumn"
  :on-show-all-columns="showAllColumns"
  :get-column-label="getColumnLabel"
  :format-cell-value="formatCellValue"
  :t="t"
  :sort-column="sortState.column"
  :sort-direction="sortState.direction"
  :group-by-column="groupByColumn"
  :groupable-columns="groupableColumns"
  @on-preview-click="openPreview"
  @on-group-by-change="toggleGroupBy"
  @update:sort-column="sortState.column = $event"
  @update:sort-direction="sortState.direction = $event"
/>
```

- [ ] **Step 8: Run tests again**

Run: `npx vitest run src/pages/Reports.test.js --reporter=verbose`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/reports/ReportsTableSection.vue frontend/src/pages/Reports.vue
git commit -m "feat(Reports): migrate ReportsTableSection to use extended ListTable"
```

---

### Task 7: Cleanup — Remove dead functions from useReportsTableData

**Files:**
- Modify: `frontend/src/composables/useReportsTableData.js`

- [ ] **Step 1: Remove `toggleSort` function**

Delete the entire `toggleSort` function from `useReportsTableData.js`.

- [ ] **Step 2: Remove `getSortIndicator` function**

Delete the entire `getSortIndicator` function.

- [ ] **Step 3: Remove `isColumnVisible` function**

Delete the entire `isColumnVisible` function.

- [ ] **Step 4: Remove `showAllColumns` function**

Delete the entire `showAllColumns` function.

Wait — these functions are still used by the Reports page for the column pills above the table:
- `isColumnVisible` is used in ReportsTableSection column pills
- `showAllColumns` is used in ReportsTableSection "Show All" button
- `toggleColumn` is used in ReportsTableSection column pills

So these should NOT be removed. Only `toggleSort` and `getSortIndicator` are replaced by ListTable.

- [ ] **Step 5: Remove `toggleSort` and `getSortIndicator` from the return object**

In the return statement, remove `toggleSort` and `getSortIndicator`.

- [ ] **Step 6: Remove `toggleSort` and `getSortIndicator` from the destructuring in Reports.vue**

In `Reports.vue`, update the destructuring:

```js
const {
  visibleColumns,
  columnsSummaryLabel,
  heroSummaryCells,
  summaryItems,
  comparisonSummaryItems,
  sortedRows,
  groupableColumns,
  toggleGroupBy,
  getColumnLabel,
  formatCellValue,
  isColumnVisible,
  toggleColumn,
  showAllColumns,
  formatComparisonDelta,
} = reportTableData;
```

(Remove `toggleSort` and `getSortIndicator` from the destructuring)

- [ ] **Step 7: Run tests to verify**

Run: `npx vitest run src/composables/useReportsTableData.test.js --reporter=verbose`
Expected: PASS

Run: `npx vitest run src/pages/Reports.test.js --reporter=verbose`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add frontend/src/composables/useReportsTableData.js frontend/src/pages/Reports.vue
git commit -m "refactor(Reports): remove toggleSort, getSortIndicator (replaced by ListTable)"
```

---

### Task 8: Update Reports tests

**Files:**
- Modify: `frontend/src/pages/Reports.test.js`

- [ ] **Step 1: Find and fix tests that reference the custom table DOM**

Run the Reports tests and identify any failures:

```bash
cd frontend && npx vitest run src/pages/Reports.test.js --reporter=verbose
```

- [ ] **Step 2: Fix test "persists column visibility changes to localStorage only"**

This test toggles a column and checks localStorage + URL. Since the column toggle now affects `visibleColumnKeys` which is passed to ListTable, the test should still pass. If the test fails because it looks for specific DOM elements that changed, update the selectors.

Current test toggles a column pill (rounded-full button with text "Poliçe"). The pills still exist. This should pass.

- [ ] **Step 3: Fix any tests that check header rows or sort indicator text**

Remove assertions like `expect(headerText).toContain("▲")` if they relied on ReportsTableSection's custom sort indicator. The sort indicator is now in ListTable.

- [ ] **Step 4: Run tests to confirm all pass**

```bash
cd frontend && npx vitest run src/pages/Reports.test.js --reporter=verbose
```

Expected: 18/18 PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Reports.test.js
git commit -m "test(Reports): update tests for ListTable migration"
```

---

### Task 9: Build, lint, typecheck

- [ ] **Step 1: Run full test suite**

```bash
cd frontend && npx vitest run --reporter=verbose
```

Expected: all tests pass

- [ ] **Step 2: Run typecheck**

```bash
cd frontend && npm run typecheck
```

- [ ] **Step 3: Run build**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Fix any issues found**

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: lint and build fixes after ListTable migration"
```

---

### Task 10: Deploy to local WSL

- [ ] **Step 1: Extract build to WSL bench apps directory**

```bash
# From frontend directory, already built
wsl -d Ubuntu-24.04 -- bash -c "cd ~/frappe-bench/apps/acentem_takipte/acentem_takipte/public/frontend && rm -rf .vite assets index.html && tar -xzf /tmp/frontend_build.tar.gz"
```

- [ ] **Step 2: Clear cache**

```bash
wsl -d Ubuntu-24.04 -- bash -c "cd ~/frappe-bench && bench --site at.localhost clear-cache"
```

- [ ] **Step 3: Verify locally**

Open `http://at.localhost:8000/at/reports` and confirm the page works.

---

### Task 11: Deploy to production

- [ ] **Step 1: Tar built assets**

```bash
Set-Location -LiteralPath "C:\Users\Aykut\Documents\GitHub\acentem_takipte\acentem_takipte\public\frontend"
tar -czf "$env:TEMP\frontend_build.tar.gz" .
```

- [ ] **Step 2: SCP to server**

```bash
scp -i "C:\Users\Aykut\.ssh\id_ed25519" "$env:TEMP\frontend_build.tar.gz" root@77.42.72.44:/tmp/
```

- [ ] **Step 3: Copy and extract in both containers**

```bash
ssh -i "C:\Users\Aykut\.ssh\id_ed25519" root@77.42.72.44 \
  "docker cp /tmp/frontend_build.tar.gz frontend-...:/tmp/ && \
   docker exec -u root frontend-... bash -c '...tar -xzf...' && \
   docker cp /tmp/frontend_build.tar.gz backend-...:/tmp/ && \
   docker exec -u root backend-... bash -c '...tar -xzf...' && \
   rm /tmp/frontend_build.tar.gz"
```

- [ ] **Step 4: Clear cache**

```bash
ssh -i "C:\Users\Aykut\.ssh\id_ed25519" root@77.42.72.44 \
  "docker exec backend-... bash -c 'cd ~/frappe-bench && bench --site kipsigorta.acentemtakipte.com clear-cache'"
```

- [ ] **Step 5: Verify production**

Open `https://kipsigorta.acentemtakipte.com/at/reports` and confirm.
