@echo off
cd /d "C:\Users\Aykut\Documents\GitHub\acentem_takipte.worktrees\copilot-worktree-2026-03-17T13-42-32"

echo Running: git add -A
git add -A

echo.
echo Running: git status --short
git status --short

echo.
echo Running: git commit
git commit -m "feat: migrate all pages to design system pattern

- AuxWorkbench.vue: full migration (detail-topbar, FilterBar, ListTable, mini-metric)
- AuxRecordDetail.vue: replaced DocHeaderCard/DetailActionRow with detail-topbar
- CustomerDetail.vue, ClaimsBoard.vue, LeadList.vue: removed stale old-pattern imports
- PolicyList.vue, OfferBoard.vue, CustomerList.vue: removed stale old-pattern imports
- All pages now consistently use page-shell + detail-topbar pattern
- No old pattern components (DocHeaderCard, DetailActionRow, PageToolbar, WorkbenchFilterToolbar) remain in any page

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
