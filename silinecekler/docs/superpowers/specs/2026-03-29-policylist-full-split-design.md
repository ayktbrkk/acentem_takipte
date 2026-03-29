# PolicyList Full Split Design

## Context

`frontend/src/pages/PolicyList.vue` is a large policy listing page that currently mixes:
- filter state and preset management
- list pagination and export actions
- quick policy dialog orchestration
- row navigation and detail entrypoints
- table data derivation and summary metrics
- UI rendering for the toolbar, metrics, filters, table, and dialog

The page is already conceptually a workbench, so the refactor should preserve behavior while splitting responsibilities into focused units that are easy to test.

## Goals

- Reduce `PolicyList.vue` to a thin page shell.
- Separate user intent state from derived table data.
- Isolate quick policy flow from list rendering.
- Split the visible UI into focused components with clear props and events.
- Keep current routes, presets, exports, and quick-create behavior intact.

## Non-goals

- No new policy business logic.
- No changes to policy filtering semantics.
- No API contract changes.
- No redesign of the current UX.

## Proposed Architecture

### Logic boundaries

1. `usePolicyListFilters`
   - Owns the preset key, custom preset storage, advanced filter state, and local status/branch filters.
   - Exposes active filter count and preset options.

2. `usePolicyListRuntime`
   - Owns list refresh, pagination, export, route sync, and office-branch lookup payload helpers.
   - Keeps network-facing list orchestration in one place.

3. `usePolicyListQuickPolicy`
   - Owns the quick policy dialog state, source-offer handling, and submit/cancel flow.
   - Bridges policy list actions to the existing quick policy runtime.

4. `usePolicyListTableData`
   - Owns filtered rows, visible rows, row counts, and summary metrics used by the page.
   - Returns data only, not UI behavior.

5. `usePolicyListActions`
   - Owns row-level navigation and other policy-specific entry actions.
   - Keeps table click handlers and page navigation separate from data derivation.

### UI boundaries

1. `PolicyListActionBar`
   - Refresh, export, and new policy actions.

2. `PolicyListMetricsPanel`
   - Total, active, pending, and total premium summary cards.

3. `PolicyListFilterSection`
   - Search, preset menu, advanced filters, refresh/reset controls, and mobile summary.

4. `PolicyListTableSection`
   - Table rendering, loading/empty/error states, and pagination controls.

5. `PolicyListQuickPolicyDialog`
   - Wrapper around the existing `PolicyForm` dialog shell.

### Page shell

`PolicyList.vue` becomes the composition layer:
- wires props to the UI components
- wires events back to composables
- owns only minimal template glue

## Data Flow

1. User edits filters or presets in `PolicyListFilterSection`.
2. `usePolicyListFilters` updates the filter state.
3. `usePolicyListRuntime` rebuilds the fetch/query payload as needed and refreshes the list.
4. `usePolicyListTableData` derives the table rows and summary figures from the current store/runtime state.
5. `PolicyListTableSection` renders the table and emits row navigation events.
6. `usePolicyListQuickPolicy` controls dialog visibility and submission.
7. `PolicyListQuickPolicyDialog` renders the form shell and submits through the composable.

## Error Handling

- Preserve the current error banner behavior for list fetch failures.
- Quick policy failures remain surfaced in the dialog shell.
- Export failures continue to use the existing list export helper behavior.
- No new silent failure paths should be introduced.

## Testing Strategy

### Unit tests

- `usePolicyListFilters.test.js`
- `usePolicyListRuntime.test.js`
- `usePolicyListTableData.test.js`
- `usePolicyListQuickPolicy.test.js`
- `usePolicyListActions.test.js`

### Page/component tests

- `src/pages/PolicyList.test.js`
- Any focused component tests for the new UI wrappers

### Verification gates

- `npm run test:unit -- --run src/pages/PolicyList.test.js`
- `npm run build`
- `git diff --check`

## Acceptance Criteria

- `PolicyList.vue` is reduced to a thin shell.
- All five logic boundaries exist and are used by the page.
- All five UI boundaries exist and are wired to the page.
- List filtering, preset management, pagination, export, row navigation, and quick policy creation behave as before.
- Tests and build pass.

## Implementation Order

1. Extract `usePolicyListFilters`.
2. Extract `usePolicyListRuntime`.
3. Extract `usePolicyListTableData`.
4. Extract `usePolicyListQuickPolicy`.
5. Extract `usePolicyListActions`.
6. Split the UI into `ActionBar`, `MetricsPanel`, `FilterSection`, `TableSection`, and `QuickPolicyDialog`.
7. Run verification and update the tracking document.

