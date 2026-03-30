# Reports Refactor Notes

## Current checkpoint

- Shared report catalog / column label / filter config moved into `frontend/src/composables/reportsConfig.js`.
- `useReportsFilters`, `useReportsTableData`, `useReportsRowActions`, `useReportsRuntime`, and `useReportsViewState` are now wired into `Reports.vue`.
- The main results/table block has been extracted into `frontend/src/components/reports/ReportsTableSection.vue`.
- The filter panel has been extracted into `frontend/src/components/reports/ReportsFilterSection.vue`.
- The comparison summary panel has been extracted into `frontend/src/components/reports/ReportsComparisonSection.vue`.
- The scheduled reports section has been extracted into `frontend/src/components/reports/ReportsScheduledSection.vue`.
- `ScheduledReportsManager` now keeps its own schedule-specific filter config, while the shared `reportCatalog` data is centralized.
- `Reports.vue` is now a thinner shell; the remaining work is mostly file cleanup and any follow-up view-state polishing.

## Continue from here

Next safe cleanup for Reports:

1. If needed, do a final cleanup pass on `Reports.vue`
   - remove any now-redundant imports or aliases
   - keep the shell lean and readable

## Verification status

- `src/composables/useReportsFilters.test.js`: passing
- `src/composables/useReportsTableData.test.js`: passing
- `src/composables/useReportsRowActions.test.js`: passing
- `src/pages/Reports.test.js`: passing
- `npm run build`: passing
