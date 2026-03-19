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
- CustomerDetail.vue, ClaimsBoard.vue, LeadList.vue: design system updates
- PolicyList.vue, OfferBoard.vue, CustomerList.vue: design system updates
- PaymentsBoard.vue, RenewalsBoard.vue, Reports.vue: full migration
- ReconciliationWorkbench.vue, CommunicationCenter.vue: full migration
- All pages now consistently use page-shell + detail-topbar + mini-metric pattern

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

echo.
echo Running: git push
git push origin copilot/worktree-2026-03-17T13-42-32
