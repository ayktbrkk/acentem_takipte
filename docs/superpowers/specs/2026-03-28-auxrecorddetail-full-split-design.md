# AuxRecordDetail Full Split Design

## Goal

Split `frontend/src/pages/AuxRecordDetail.vue` into smaller composables and presentational blocks so the page becomes a thin shell while keeping the current detail, action, and quick-edit behavior intact.

## Recommended Approach

Use a combined `logic + UI` split:

- `useAuxRecordDetailRuntime` for data loading, record context, and page-level action wiring.
- `useAuxRecordDetailSummary` for hero/state summary and top-level derived values.
- `useAuxRecordDetailActions` for lifecycle actions, quick edit, desk/panel navigation, and communication context navigation.
- Small UI components for the topbar, hero strip, detail tabs, sidebar summary, and action groups.

This is the best trade-off because `AuxRecordDetail` currently mixes detail display, lifecycle actions, and multiple context-specific action buttons in a single page file.

## Boundaries

### Logic

- Record loading and normalized state live in a runtime composable.
- Summary text, status badges, and derived helper lists live in a summary composable.
- Action helpers for lifecycle transitions, quick edit, desk navigation, and communication navigation live in a separate actions composable.

### UI

- Top bar and action buttons are rendered by a dedicated component.
- Hero summary cells are rendered by a dedicated component.
- Main detail tabs and grouped fields remain template-driven but use smaller, focused helper inputs from the composables.
- Sidebar state and badges stay presentation-only.

## Acceptance Criteria

- `AuxRecordDetail.vue` keeps the same visible behavior and actions.
- The page shell no longer contains the bulk of the lifecycle and summary logic.
- The refactor is considered complete only when the focused page test and build both pass.

## Verification

- `npm run test:unit -- --run src/pages/AuxRecordDetail.test.js`
- `npm run build`

