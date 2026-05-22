# Sidebar Page UI/i18n Audit - 2026-05-21

This audit tracks the `/at` sidebar surfaces against `docs/DESIGN_GUIDELINES.md` and `docs/UI_REVIEW_CHECKLIST.md`.

## Review Standard

- Visual baseline: policy list/detail surfaces.
- Design lens: one AT product family across header, toolbar, cards, tables, metrics, detail sidebars, spacing, radius, and action hierarchy.
- Insurance lens: Turkish and English copy must carry the same operational meaning with domain-correct insurance terminology.
- Engineering lens: route-backed sidebar links, symmetric TR/EN translation maps, shared components before local patterns, and explicit state handling.

## Sidebar Inventory

| Section | Sidebar page | Natural companion surfaces | Audit result |
| --- | --- | --- | --- |
| Overview | Dashboard | Dashboard drill-down routes | Uses AT dashboard components and localized copy. |
| Sales & Portfolio | Leads | Lead detail, quick create | Uses `WorkbenchPageLayout`, shared actions, localized lead copy. |
| Sales & Portfolio | Offers | Offer detail, conversion dialog | List pagination now uses `ActionButton` and localized accessible labels. |
| Sales & Portfolio | Policies | Policy detail, endorsement/document actions | Policy surfaces remain the visual baseline. |
| Sales & Portfolio | Customers | Customer detail, document actions, customer search | Uses shared tables/cards and localized customer terminology. |
| Operations | Claims | Claim detail, document/payment actions | Uses shared detail skeleton and domain status badges. |
| Operations | Payments | Payment detail, receipt/document actions | Uses shared detail skeleton and financial formatting surfaces. |
| Operations | Renewals | Renewal task detail | Uses shared actions and renewal status badges. |
| Operations | Reconciliation | Reconciliation detail, reconciliation items | Uses shared workbench/detail components and localized reconciliation terms. |
| Operations | Document Center | Document detail, quick upload | Uses aux workbench/detail configuration and localized document terminology. |
| Operations | Reports | Scheduled reports, chart/table sections | Chart fallback, chart action labels, column/group controls, and scheduled report actions were aligned. |
| Operations | Data Import | Import wizard | Uses workbench shell and translated import state copy. |
| Operations | Data Export | Export workbench | Uses workbench shell and translated export copy. |
| Communication & Follow-up | Communication Center | Draft/outbox/task actions | Uses communication translations and action/state copy. |
| Communication & Follow-up | Tasks | Task detail | Uses aux/workbench detail configuration and translated lifecycle states. |
| Communication & Follow-up | Notification Drafts | Draft detail | Uses notification status/channel translations. |
| Communication & Follow-up | Notification Outbox | Sent notification detail | Uses outbox lifecycle translations and recovery actions. |
| Master Data | Insurance Companies | Company detail | Uses master-data aux config and active/inactive terms. |
| Master Data | Branches | Branch detail | Uses master-data aux config and insurance branch terminology. |
| Master Data | Sales Entities | Sales entity detail | Uses master-data aux config and sales organization terminology. |
| Master Data | Notification Templates | Template editor | Uses editor/detail route with localized notification template copy. |
| Finance & Control | Break-Glass Request | Approval workflow | Uses shared shell and bilingual emergency-access terminology. |
| Finance & Control | Break-Glass Approvals | Approval action table | Uses shared shell and translated approval states. |
| Finance & Control | Accounting Entries | Accounting entry detail | Uses finance aux config and accounting terminology. |
| Finance & Control | Reconciliation Items | Reconciliation item detail | Uses finance aux config and reconciliation terminology. |
| Admin Settings | General Settings | Alert-channel tab | Uses workbench shell, section panels, and localized admin defaults. |
| Admin Settings | Alert Channel Settings | Slack/Telegram tests | Uses workbench shell and localized alert-channel copy. |

## Changes Applied

- Replaced offer list pagination raw `btn` controls with `ActionButton`, plus TR/EN accessible labels for previous/next page.
- Localized report chart fallback labels: `N/A` became `Belirtilmedi` / `Not provided`, and chart fallback title/action labels now come from `REPORTS_TRANSLATIONS`.
- Removed the reports table's English-only `Group By` fallback and added `aria-pressed` to column and grouping controls.
- Aligned scheduled report manager action hierarchy by moving create/edit/remove actions to `ActionButton`.
- Added accessible state to scheduled report list/calendar segmented controls and an accessible remove label for alert rows.
- Made the customer-search access-history request abort-aware so route changes do not leak stale fetch failures into the next sidebar page.
- Added stable ids, names, and accessible labels to the document upload modal fields, and moved modal actions to `ActionButton`.
- Prevented unsupported document-context calls from detail upload modals. Backend document upload references are limited to AT Customer, AT Policy, and AT Claim; unsupported detail pages now ask the user to select a valid document link instead of triggering a 417 context request.
- Removed the customer detail dependency on an automatic `Has Role` child-table request so the page no longer leaks 403 responses while still preserving role-filtered options when role data is already available in test/runtime state.
- Replaced remaining app-shell modal/footer raw button patterns in access request, global customer search, quick-create shell, and quick entry modal with `ActionButton` so sidebar companions keep the same visual action hierarchy.
- Removed remaining hardcoded request/search failure copy from `useAccessRequestForm` and `useGlobalCustomerSearch`, moved them to shared TR/EN translations, and aligned reports group fallback copy with `notProvided`.
- Standardized lead, offer, and policy document-open affordances to use localized accessible labels and the shared ghost `ActionButton`.
- Standardized customer-facing missing-data terminology: demographic/profile fallbacks now use `Belirtilmedi` / `Not provided`, while consent/status surfaces keep `Bilinmiyor` / `Unknown` as a real state value. Customer translations, policy-list fallbacks, quick-create select labels, and customer detail expectations were aligned to that split.
- Propagated the same missing-data wording to claim, lead, offer, policy, payment, reconciliation, and renewal translation maps, and replaced the legacy `ListTable` raw actions renderer with shared `ActionButton` controls.
- Replaced the remaining shared-table preview icon button with `ActionButton`, leaving only CSS utility definitions and no active legacy button usage in Vue runtime surfaces.
- Added `sidebarAudit.test.js` to lock sidebar route coverage, shell translation parity, and critical insurance terminology.

## Validation Evidence

- Static source audit covered `frontend/src/composables/useSidebarNavigation.js`, `frontend/src/router/index.js`, `frontend/src/config/auxWorkbench/registry.js`, sidebar translations, offer translations, report translations, and sidebar-owned page components.
- Automated guardrails were added for sidebar route backing, audited translation-map parity, and critical TR/EN insurance terms.
- Runtime visual QA was performed on `http://at.localhost:8000/at` with a local admin session after the frontend build.
- Offers was checked on desktop and narrow mobile viewport for sidebar rhythm, workbench header density, table/cards, responsive toolbar behavior, and localized pagination labels.
- Reports was checked on desktop and narrow mobile viewport for metrics, filters, table column controls, group-by controls, scheduled report actions, and narrow-layout clipping.
- Chrome DevTools initially surfaced form-field label/id issues in Reports filters; `ReportsFilterSection` and `FilterPresetMenu` now expose stable ids, names, labels, and accessible labels. Re-check returned no issue/error/warn messages and no unlabeled or unnamed form controls.
- Automated browser smoke visited 28 sidebar targets across desktop and narrow mobile viewports. A stale access-history fetch from `/customer-search` was found during the mobile `/claims` transition, fixed in `useCustomerSearchPage`, rebuilt, and rechecked with no console messages.
- Detail/upload/editor browser smoke visited 19 natural companion routes across desktop and narrow mobile viewports: lead, offer, policy, customer, claim, payment, renewal, reconciliation, task, notification draft/outbox, master-data details, finance/control details, document detail, and quick document upload. Final re-check covered 38 openings with no render failures, console issues, failed non-asset responses, or unlabeled/unnamed form controls.
- Follow-up standardization pass:
  - `vitest run AccessRequestForm GlobalCustomerSearch OfferDetail LeadDetail PolicyDetail useReportsTableData` passed: 7 files, 28 tests.
  - `vitest run AccessRequestForm GlobalCustomerSearch QuickCreateDialogShell OfferDetail LeadDetail PolicyDetail useReportsTableData` passed: 8 files, 30 tests.
  - `npm run lint`, `npm run typecheck`, and `npm run build` passed after the app-shell/action parity changes.
- Terminology normalization pass:
  - `vitest run CustomerDetail CustomerList usePolicyListTableData quickCreateCoverage quickCreateDomainSplit QuickCreateManagedDialog` passed: 6 files, 18 tests.
  - `npm run lint` and `npm run typecheck` passed after the customer/quick-create/status terminology changes.
- Translation parity and table-action pass:
  - `vitest run ListTable CustomerDetail CustomerList usePolicyListTableData ClaimsBoardRuntime PaymentsBoardSummary PaymentsBoardRuntime RenewalsBoardRuntime` passed: 4 files, 25 tests.
  - `npm run lint`, `npm run typecheck`, and `npm run build` passed after the domain translation and shared table action changes.
- Authenticated runtime smoke via local Playwright fallback credentials (`Administrator` / `admin`) on `http://at.localhost:8000`:
  - `/at/dashboard` validated in `tr` and `en`; titles resolved to `Pano | Acentem Takipte` and `Dashboard | Acentem Takipte`, document `lang` switched correctly, and console error/warn output was empty.
  - `/at/customers` validated in `tr` and `en`; titles resolved to `Müşteriler | Acentem Takipte` and `Customers | Acentem Takipte`, document `lang` switched correctly, and console error/warn output was empty.
  - Full authenticated sidebar coverage then passed for `28` routes in both locales (`56` openings total): `failedCount: 0`, `failed: []`.
  - The Codex browser tool and Windows `Invoke-WebRequest` did not resolve `at.localhost` consistently in this session, but shell-level Playwright on the same machine verified the authenticated runtime successfully against `http://at.localhost:8000`.
