# AuxRecordDetail Full Split Design

## Context

`frontend/src/pages/AuxRecordDetail.vue` is a large detail screen that currently mixes:
- record loading and route resolution
- quick edit / quick assignment dialog orchestration
- lifecycle action handling
- related-record lookups
- detail tab state and view-specific rendering
- summary / sidebar / activity derivations
- topbar, hero, tabs, main content, sidebar, and dialog UI

The page already behaves like a record workspace, so the goal is to keep the UX intact while splitting responsibilities into focused units that are easy to test and reason about.

## Goals

- Reduce `AuxRecordDetail.vue` to a thin page shell.
- Separate loading/route/state orchestration from view-only derived data.
- Isolate quick edit and lifecycle actions from the main page template.
- Split the visible UI into focused components with clear props and events.
- Keep the current routes, permission checks, and dialog behavior intact.

## Non-goals

- No new business rules for Aux records.
- No changes to lifecycle semantics.
- No API contract changes.
- No redesign of the current detail UX.

## Proposed Architecture

### Logic boundaries

1. `useAuxRecordDetailRuntime`
   - Owns the current record resource, route resolution, loading, empty/error state, and reload behavior.
   - Keeps the page’s fetch/orchestration logic in one place.

2. `useAuxRecordDetailSummary`
   - Owns record summary, hero cells, activity/related-record derivations, and text/field display helpers.
   - Returns data-only computed values for the UI.

3. `useAuxRecordDetailActions`
   - Owns lifecycle actions, panel navigation, desk navigation, and communication context routing.
   - Keeps mutation and navigation entrypoints separate from view rendering.

4. `useAuxRecordDetailQuickDialogs`
   - Owns quick-edit/quick-assignment dialog state, source option loading, and submit/cancel flow.
   - Bridges the page to the existing quick-create/aux-edit flow.

### UI boundaries

1. `AuxRecordDetailTopbar`
   - Breadcrumb, title, badges, copy tags, and action buttons.

2. `AuxRecordDetailHero`
   - Summary strip / hero metrics.

3. `AuxRecordDetailTabs`
   - Detail tab switcher and active tab control.

4. `AuxRecordDetailMainContent`
   - Main sections for fields, related items, activity, and text blocks.

5. `AuxRecordDetailSidebar`
   - State summary, quick facts, and contextual metadata panels.

6. `AuxRecordDetailQuickDialogs`
   - Shell wrapper for the quick edit / assignment dialog flow.

### Page shell

`AuxRecordDetail.vue` becomes the composition layer:
- wires props to the UI components
- wires events back to composables
- owns only minimal template glue

## Data Flow

1. The route and config determine the active aux record doctype.
2. `useAuxRecordDetailRuntime` loads the record and exposes loading/error/empty state.
3. `useAuxRecordDetailSummary` derives hero cells, activity cards, related cards, and field groups.
4. `useAuxRecordDetailActions` exposes topbar and card actions such as open panel, open communication context, and lifecycle mutations.
5. `useAuxRecordDetailQuickDialogs` controls quick-edit / quick-assignment state and submission.
6. `AuxRecordDetailTopbar`, `Hero`, `Tabs`, `MainContent`, `Sidebar`, and `QuickDialogs` render the view and emit user intent back to the page shell.

## Error Handling

- Preserve the current empty/loading/error states for the record load.
- Quick dialog failures remain surfaced in the dialog shell.
- Lifecycle failures continue to show the current inline/error-banner behavior.
- Navigation helpers should remain fail-safe and never block the page render.

## Testing Strategy

### Unit tests

- `useAuxRecordDetailRuntime.test.js`
- `useAuxRecordDetailSummary.test.js`
- `useAuxRecordDetailActions.test.js`
- `useAuxRecordDetailQuickDialogs.test.js`

### Page/component tests

- `src/pages/AuxRecordDetail.test.js`
- Focused tests for the new topbar/hero/sidebar/dialog wrappers if needed

### Verification gates

- `npm run test:unit -- --run src/pages/AuxRecordDetail.test.js`
- `npm run build`
- `git diff --check`

## Acceptance Criteria

- `AuxRecordDetail.vue` is reduced to a thin shell.
- All four logic boundaries exist and are used by the page.
- All six UI boundaries exist and are wired to the page.
- Record loading, quick-edit, lifecycle actions, related-item navigation, and tab behavior remain unchanged.
- Tests and build pass.

## Implementation Order

1. Extract `useAuxRecordDetailRuntime`.
2. Extract `useAuxRecordDetailSummary`.
3. Extract `useAuxRecordDetailActions`.
4. Extract `useAuxRecordDetailQuickDialogs`.
5. Split the UI into `Topbar`, `Hero`, `Tabs`, `MainContent`, `Sidebar`, and `QuickDialogs`.
6. Run verification and update the tracking document.
