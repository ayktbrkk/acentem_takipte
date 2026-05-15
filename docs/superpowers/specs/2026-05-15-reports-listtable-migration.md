# Reports ListTable Migration Design

Date: 2026-05-15
Status: Draft

## Goal

Migrate the Reports page custom `<table>` to use the shared `ListTable` component, extending `ListTable` with sort, custom cell formatting, group-header rows, and preview-button column — making these capabilities available to all pages.

## Motivation (Design Guidelines + Architecture)

| Guideline | Current Status | Target |
|---|---|---|
| §3.1 — Prefer `ListTable` for standard list experiences | Reports uses a custom `<table>` in `ReportsTableSection.vue` | Use `ListTable` |
| §6.5 — Shared component first | Custom table duplicates column rendering logic | Single shared table |
| §6.3 — Use `ActionButton` | 3 raw `<button>` in table (sort, pills) | ActionButton via ListTable |
| §7.3 — Error state design | Raw `qc-error-banner` CSS class | Shared EmptyState component |
| §8.4 — Domain-aware fallbacks | `"-"` string for null values | Localized fallback |
| §12 — Delivery checklist | Custom table doesn't inherit ListTable's existing compliance | Inherited automatically |

## Scope

### In Scope

- Extend `ListTable.vue` with 4 new capabilities
- Replace custom `<table>` in `ReportsTableSection.vue` with extended `ListTable`
- Update `Reports.vue` prop/event wiring
- Update all test files
- Remove dead `formatCellValue`, `toggleSort`, `getSortIndicator` from `useReportsTableData.js` (replaced by ListTable's built-in handling)

### Out of Scope

- Column visibility toggle pills (stay in `ReportsTableSection.vue` above ListTable)
- Group-by selector pills (stay in `ReportsTableSection.vue`)
- `useReportsViewState.js` localStorage/URL persistence (unchanged)
- `useReportsRuntime.js` data loading (unchanged)
- Reports comparison section, chart section, scheduled section (unchanged)

## ListTable Extensions

### New Column Definition Properties

```js
{
  key: "status",
  label: "Durum",           // existing
  type: "status",            // existing
  sortable: true,            // NEW — enables sort on header click
  format: (value, row) =>    // NEW — overrides cell rendering
    translateText(value, locale),
  cellClass: "..."           // existing
}
```

When `format` is provided, it takes precedence over `type`. When neither matches, falls back to `String(row[col.key])`.

### New Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `sortColumn` | String | `""` | Controlled sort column (v-model). Empty = no sort |
| `sortDirection` | String | `""` | Controlled sort direction (`"asc"` \| `"desc"`) |
| `visibleColumns` | Array | `null` | Column keys to show. `null` = all |
| `showPreview` | Boolean | `false` | Show eye-icon preview column |

### New Events

| Event | Payload | Description |
|---|---|---|
| `update:sortColumn` | `string` | Emitted when sortable header clicked |
| `update:sortDirection` | `string` | Emitted with new direction (`"asc"` \| `"desc"` \| `""`) |
| `preview-click` | `row` | Emitted when preview eye icon clicked |

### Sort Behavior

Two modes:

1. **Controlled mode** (`sortColumn` is a non-empty string):
   - Header click emits `update:sortColumn` / `update:sortDirection`
   - Component renders sort indicator ▲/▼ based on props
   - Parent is responsible for sorting rows
   - Used by: Reports page (sort persisted to URL/localStorage)

2. **Uncontrolled mode** (`sortColumn` is `""` or not provided):
   - Header click sorts rows internally with simple comparator
   - No events emitted
   - Used by: CustomerList, PolicyList, other pages

Controlled/uncontrolled is detected by `props.sortColumn !== undefined && props.sortColumn !== ""`.

### Sort Order Cycle

Each click on a sortable column header cycles: `none → asc → desc → none`.

When clicking a different column while one is already sorted: switch to that column, start at `asc`.

### Group-Header Row Rendering

When a row has `_isGroupHeader: true`, ListTable renders it as a merged `<td colspan>` with a distinct background (`bg-slate-100/80`):

```html
<tr v-if="row._isGroupHeader" class="bg-slate-100/80 border-y border-slate-200">
  <td :colspan="effectiveColumns.length + (showPreview ? 1 : 0) + (clickable ? 1 : 0)" class="px-4 py-2">
    <div class="flex items-center justify-between">
      <span class="text-xs font-bold text-slate-800 uppercase tracking-wide">
        {{ row._groupTitle }}
      </span>
      <!-- aggregate fields shown via col.format -->
    </div>
  </td>
</tr>
```

The group header content (`_groupTitle`, aggregate values) is pre-computed by `useReportsTableData.sortedRows` — ListTable just renders it.

### Preview Column

When `showPreview` is true, an extra `<th class="w-10">` and `<td>` are added (similar to existing `clickable` pattern), with an eye SVG icon:

```html
<td class="w-10 px-4 py-3 text-right">
  <button type="button" class="..." :title="t('preview')" @click.stop="$emit('preview-click', row)">
    <!-- eye icon SVG -->
  </button>
</td>
```

### Default Cell Rendering (when no `type` and no `format`)

Current ListTable: empty/nothing rendered for cells without `type`.

New behavior: render `String(row[col.key])` or `"-"` for null/undefined — consistent fallback.

## Reports Migration

### Column Definition Conversion

Current `ReportsTableSection.vue` passes column keys as strings and relies on `getColumnLabel` + `formatCellValue` functions passed as props:

```html
<th v-for="column in visibleColumns">
  {{ getColumnLabel(column) }}
</th>
<td>
  {{ formatCellValue(column, row[column]) }}
</td>
```

New approach: compute column definition objects from visibleColumnKeys:

```js
const columnDefs = computed(() =>
  (visibleColumns.value.length ? visibleColumns.value : columns.value).map(key => ({
    key,
    label: getColumnLabel(key),
    sortable: true,
    format: (value, row) => formatCellValue(key, value, row),
  }))
);
```

### Sort Wiring

Reports uses controlled mode:

```vue
<ListTable
  :sort-column="sortState.column"
  :sort-direction="sortState.direction"
  @update:sort-column="sortState.column = $event"
  @update:sort-direction="sortState.direction = $event"
/>
```

The existing watch in `Reports.vue` on `[visibleColumnKeys, sortState]` persists changes to localStorage/URL unchanged.

The existing `toggleSort()` and `getSortIndicator()` in `useReportsTableData.js` are removed — ListTable handles sort UI.

### Preview Wiring

```vue
<ListTable
  :show-preview="true"
  @preview-click="openPreview"
/>
```

### Visible Columns

```vue
<ListTable
  :visible-columns="visibleColumnKeys"
/>
```

When `visibleColumnKeys` is empty, `null` is passed (show all columns).

### Error State

Custom `qc-error-banner` CSS classes in `ReportsTableSection.vue` are replaced with `EmptyState` component:

```vue
<EmptyState
  v-if="error"
  :title="t('loadErrorTitle')"
  :description="error"
/>
```

### Removed from ReportsTableSection

- Entire `<table>`, `<thead>`, `<tbody>` block
- `isRowClickable`, `onRowClick` (handled by ListTable `clickable` prop; Reports doesn't use row-click navigation from the table itself since it uses preview instead)
- Preview button column (handled by ListTable `showPreview`)

### Removed from `useReportsTableData.js`

- `toggleSort(column)` — redundant with ListTable controlled sort
- `getSortIndicator(column)` — redundant with ListTable indicators
- `isColumnVisible(column)` — redundant with ListTable `visibleColumns` prop

Kept:
- `sortedRows` computed — still needed for grouping + aggregate logic
- `getColumnLabel(column)` — still needed for column pills + column defs
- `formatCellValue(column, value)` — still used as the `format` function in column defs
- `showAllColumns()`, `toggleColumn(column)` — still needed for column toggle pills
- `groupableColumns`, `toggleGroupBy(col)`, `groupByColumn` — still needed for group pills

## Test Updates

### `ListTable.test.js`

Add tests for:
- Sortable column click → emits `update:sortColumn` + `update:sortDirection`
- Sort direction cycle (none → asc → desc → none)
- Controlled mode (external props)
- Preview button click → emits `preview-click`
- Group header row rendering
- Custom `format` function on column def
- Cell fallback for no-type, no-format columns
- `visibleColumns` prop filtering

### `Reports.test.js`

Update:
- Column toggle test should verify column is hidden in ListTable
- Remove tests that check for custom table-specific DOM structure
- Add test for sort events propagating to router/localStorage

### `useReportsTableData.test.js`

No changes needed — sorting removal doesn't affect test coverage.

## File Change Summary

| File | Change Type | Impact |
|---|---|---|
| `frontend/src/components/ui/ListTable.vue` | Extend (+sort, format, group, preview) | All ListTable consumers benefit |
| `frontend/src/components/ui/ListTable.test.js` | Extend (new test cases) | — |
| `frontend/src/components/reports/ReportsTableSection.vue` | Rewrite (replace table with ListTable) | Reports page only |
| `frontend/src/pages/Reports.vue` | Minor (wiring changes) | Reports page only |
| `frontend/src/pages/Reports.test.js` | Update (adapt assertions) | — |
| `frontend/src/composables/useReportsTableData.js` | Remove 3 dead functions | — |

## Risk Assessment

| Risk | Mitigation |
|---|---|
| ListTable changes break other pages | Existing column types unchanged; sort/format are opt-in via column def; run full test suite |
| Group header detection conflicts with real row data (`_isGroupHeader` could collide) | Prefix with `_is` convention already used in reports; document as internal |
| Controlled/uncontrolled sort confusion | Default mode is uncontrolled (`sortColumn: ""`) — backward compatible |
| Reports page test coverage regression | Run all 26 reports tests before merge |
