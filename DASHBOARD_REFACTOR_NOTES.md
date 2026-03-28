# Dashboard Refactor Notes

## Current checkpoint

- `useDashboardFormatters` split is in place.
- `useDashboardOrchestration` now owns reload, tab, route, and page navigation helpers.
- Dashboard initial resource params now use separate bootstrap helpers so setup order stays safe.
- `useDashboardPreviewPager` now owns preview pagination state and paging helpers.
- `useDashboardPreviewData` now owns preview row sources and collection/reconciliation metrics.
- `useDashboardItemActions` now owns the dashboard item/action handlers.
- `useDashboardLeadDialog` now owns lead dialog open/reset helpers.
- `useDashboardLeadState` now owns the lead dialog state refs/reactive.
- `useDashboardLeadSubmission` now owns lead submit/validation flow.
- `useDashboardStatus` now owns tab, loading, and access helpers.
- `useDashboardSummary` now owns dashboard meta, trend, cards, and summary metrics helpers.
- `useDashboardTabHelpers` now owns renewal/follow-up/activity tab helper lists.
- `useDashboardVisibleRange` now owns the selected-range display string.
- `dashboardHelpers` now owns the remaining shared bootstrap and permission helpers.
- `openPreviewList` is now part of orchestration helpers too.
- `useDashboardFacts` now owns the remaining quick stat, summary, and fact builders.
- `Dashboard.vue` initialization order is fixed so `useDashboardSales` no longer trips over TDZ.
- Dashboard test and build both pass.

## Continue from here

Next safe cleanup for Dashboard:

1. Consider trimming any leftover no-op aliases or pass-through refs
   - anything that only mirrors another computed value without adding logic

## Verification status

- `src/pages/Dashboard.test.js`: passing
- `npm run build`: passing
