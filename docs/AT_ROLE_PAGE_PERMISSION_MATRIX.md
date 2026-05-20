# AT Role Page Permission Matrix

Last updated: 2026-05-20

This document captures the current repository-backed access contract for the `/at` SPA.
It is intended as the planning baseline for aligning page visibility, backing DocType access, and sub-capability rules.

## Source Of Truth

Use these files in this order when evaluating page visibility and permission intent:

1. `frontend/src/router/index.js`
2. `frontend/src/composables/useSidebarNavigation.js`
3. `acentem_takipte/acentem_takipte/setup_utils.py`
4. Backing runtime/composable or API module for the page
5. Supporting permission helpers such as `doctype/branch_permissions.py`

## Role Families

| Role | Current SPA landing | Intended visible page family | Backend permission expectation | Notes |
| --- | --- | --- | --- | --- |
| `AT Agent` | Operational SPA, not dashboard | Operational pages only | Needs operational DocType/API access for visible staff pages | Must not receive system-only surfaces |
| `AT Accountant` | Operational SPA, not dashboard | Same operational pages as `AT Agent` | Same operational permission target set as `AT Agent` | Differences should be action/data level, not route level, unless product changes the UI contract |
| `AT Manager` | Dashboard | Full operational pages plus dashboard | Same operational access as Agent/Accountant, plus dashboard-level visibility | Scheduled report management should stay separate unless intentionally broadened |
| `AT System Manager` | Desk/system-capable | Full operational pages plus all system-only pages | Full operational + system/admin permission set | Only AT-prefixed role clearly in the system plane |
| `System Manager` | Desk/system-capable | Same or broader than `AT System Manager` | Full system/admin access | Non-AT Frappe system role |
| `Administrator` | Desk/system-capable | Same or broader than `System Manager` | Full system/admin access | Treated as top-level admin |
| `AT User` | SPA-capable | No clear operational page family in current router/sidebar | Should not be used as the baseline for staff-facing pages | Current code routes it into SPA home but does not grant the main staff surfaces |
| `AT Customer` | SPA-capable | No clear staff-facing page family in current router/sidebar | Should not be used as the baseline for staff-facing pages | Same conclusion as `AT User` |

## Route Matrix

| Surface | Current route visibility | Backing doctype/api | Current permission strategy in repo | Planning contract |
| --- | --- | --- | --- | --- |
| `/dashboard` | `ROLE_MANAGER` | Mixed custom APIs plus direct reads on `AT Lead`, `AT Offer`, `AT Policy`, `AT Claim`, `AT Renewal Task` | Mixed: not a clean template for new page alignment | Keep manager/system only |
| `/leads` | `ROLE_ACCOUNTANT` | Direct `frappe.client.get_list` on `AT Lead` | Expected operational `Custom DocPerm` convergence via `setup_utils.py`; branch/sales-entity helper intent exists | Keep in operational family |
| `/offers` | `ROLE_ACCOUNTANT` | Direct list/detail reads on `AT Offer` plus related lookups | Expected operational `Custom DocPerm` convergence via `setup_utils.py`; branch/sales-entity helper intent exists | Keep in operational family |
| `/policies` | `ROLE_ACCOUNTANT` | Direct `frappe.client.get_list` and `get_count` on `AT Policy` | Best current example of visible operational direct-read page; setup convergence plus client-side branch filters | Keep in operational family |
| `/customers` | `ROLE_ACCOUNTANT` | Custom API `acentem_takipte.acentem_takipte.api.dashboard.get_customer_workbench_rows` | API-backed exception; not a pure raw-DocType template | Keep in operational family |
| `/claims` | `ROLE_ACCOUNTANT` | Direct `frappe.client.get_list` on `AT Claim` plus related direct reads | Expected operational `Custom DocPerm` convergence via `setup_utils.py` | Keep in operational family |
| `/payments` | `ROLE_ACCOUNTANT` | Direct `frappe.client.get_list` on `AT Payment` and `AT Payment Installment` | `AT Payment` fits the operational pattern; `AT Payment Installment` is currently outside the converged operational family | Keep in operational family; align `AT Payment Installment` to it |
| `/renewals` | `ROLE_ACCOUNTANT` | Direct `frappe.client.get_list` on `AT Renewal Task` plus policy/customer lookups | Expected operational `Custom DocPerm` convergence via `setup_utils.py` | Keep in operational family |
| `/communication` | `ROLE_ACCOUNTANT` | Custom API `api.communication.get_queue_snapshot` plus direct lookups on `AT Notification Template`, `AT Customer`, `AT Policy`, `AT Claim`, `AT Segment`, `AT Campaign` | Hybrid model: broad page visibility, narrower action permissions enforced by communication APIs | Keep in operational family; preserve narrower admin actions |
| `/reports` | `ROLE_ACCOUNTANT` | Custom report APIs per report catalog; scheduled config API is separate | Page visibility is broad; scheduled-report configuration is admin-only | Keep page in operational family; keep scheduling as narrower sub-capability |
| `/tasks` | `ROLE_ACCOUNTANT` | Generic aux runtime direct `frappe.client.get_list` and `get_count` on `AT Task` | Raw direct-read page, so it needs operational DocType convergence like other visible pages | Keep in operational family; align `AT Task` to it |
| `/at-documents` | `ROLE_ACCOUNTANT` | Generic aux runtime direct `frappe.client.get_list` and `get_count` on `AT Document` | Current repo still reflects an older `AT User`-centric access assumption | Keep in operational family; align `AT Document` to it |
| `/at-documents/upload` | `ROLE_ACCOUNTANT` | `api/documents.py` plus `AT Document` create semantics | Currently coupled to `AT Document` permission model | Keep in the same operational family as Document Registry |
| `/files` | Operational document-center surface | Direct reads on `File` plus linked-reference navigation | Part of broader document access model, but not the primary mismatch raised in the current failures | Review only after `AT Document` contract is stabilized |
| `/insurance-companies` | `ROLE_SYSTEM` | `AT Insurance Company` | System-only master-data surface | Keep system only |
| `/branches` | `ROLE_SYSTEM` | `AT Branch` | System-only master-data surface | Keep system only |
| `/sales-entities` | `ROLE_SYSTEM` | `AT Sales Entity` | System-only master-data surface | Keep system only |
| `/notification-templates` | `ROLE_SYSTEM` | `AT Notification Template` | System-only master-data surface | Keep system only |
| `/accounting-entries` | `ROLE_SYSTEM` | `AT Accounting Entry` | System-only finance/control surface | Keep system only |
| `/reconciliation-items` | `ROLE_SYSTEM` | `AT Reconciliation Item` | System-only finance/control surface | Keep system only |
| `/reconciliation` | `ROLE_SYSTEM` | Custom accounting/reconciliation APIs | System-only control surface | Keep system only |
| `/break-glass` and approvals | `ROLE_SYSTEM` | Break-glass APIs and doctypes | System-only governance surface | Keep system only |
| `/admin/*` | `ROLE_SYSTEM` | Admin settings APIs | System-only admin surface | Keep system only |

## Permission Target By Family

| Role family | Pages that should work | Backing access model |
| --- | --- | --- |
| Operational family: `AT Agent`, `AT Accountant`, `AT Manager` | Leads, Offers, Policies, Customers, Claims, Payments, Renewals, Communication, Tasks, Document Center, Reports | For direct-read pages, the backing DocType must be present in operational permission convergence in `setup_utils.py` or be replaced by a custom API with equivalent server-side checks |
| Manager extension: `AT Manager` | Everything in operational family plus dashboard | Route-level dashboard access only; do not assume this also grants admin-only sub-capabilities |
| System family: `AT System Manager`, `System Manager`, `Administrator` | Everything in operational family plus master data, reconciliation, break-glass, admin settings, scheduled-report configuration | Full system/admin permissions |
| Non-operational SPA roles: `AT User`, `AT Customer` | No current staff-facing page family in router/sidebar | Do not use as the permission anchor for operational staff pages |

## Current High-Priority Gaps

| Surface | Why it fails or drifts | Required fix direction |
| --- | --- | --- |
| `/payments` | `AT Payment Installment` is directly read but not aligned to the operational role family | Add it to the operational permission convergence model and keep scope restrictions |
| `/tasks` | `AT Task` is directly read through aux runtime but not aligned to the operational role family | Add it to the operational permission convergence model and keep scope restrictions |
| `/at-documents` | Page is visible to operational users, but `AT Document` still reflects an older `AT User`-centric model | Move `AT Document` to the operational role family and choose a server-side scope model |
| `/reports` scheduled configs | Page visibility is broad but the scheduled-config API is intentionally narrow | Keep split capability and stop broad-role frontend calls to the admin-only endpoint |

## Recommended Implementation Order

Apply changes in this order to minimize regressions and keep each validation step narrow.

### Step 1: Converge direct-read operational DocTypes

Primary files:

1. `acentem_takipte/acentem_takipte/setup_utils.py`
2. `acentem_takipte/acentem_takipte/doctype/branch_permissions.py`
3. `acentem_takipte/hooks.py`

Change scope:

1. Extend the operational permission convergence in `setup_utils.py` for `AT Payment Installment` and `AT Task` so the visible operational family can read the doctypes used by `/payments` and `/tasks`.
2. Verify that matching scope helpers already exist in `branch_permissions.py` and wire them at runtime if the app is not already registering them through hooks or controller-level permission methods.
3. Keep the route/sidebar contract unchanged in this step.

Why first:

1. `/payments` and `/tasks` are the cleanest mismatches because both pages already use the same direct `frappe.client.get_list/get_count` pattern as other working operational pages.
2. This gives a low-noise proof that the permission convergence model is correct before touching the more ambiguous document model.

Validation after Step 1:

1. Run the narrowest backend validation that exercises `ensure_role_permissions()`.
2. Confirm an `AT Agent` or `AT Accountant` can load `/at/payments` without `AT Payment Installment` permission errors.
3. Confirm the same operational role can load `/at/tasks` without `AT Task` permission errors.

### Step 2: Align `AT Document` to the operational family

Primary files:

1. `acentem_takipte/acentem_takipte/setup_utils.py`
2. `acentem_takipte/acentem_takipte/api/documents.py`
3. `acentem_takipte/acentem_takipte/doctype/at_document/at_document.py`
4. `acentem_takipte/hooks.py`
5. `frontend/src/config/auxWorkbench/registry.js`
6. `frontend/src/composables/useAuxWorkbenchRuntime.js`

Change scope:

1. Move `AT Document` away from the old `AT User`-centric assumption and align it with the operational family used by the visible document pages.
2. Decide where document scoping lives: DocType permission hooks, controller-level permission methods, or API-level filtering.
3. Keep `/at-documents` and `/at-documents/upload` on the same backend contract so list, count, and create flows do not drift.

Why second:

1. `AT Document` is both a role mismatch and a scope-model question, so it is higher risk than `AT Task` and `AT Payment Installment`.
2. Once the simpler direct-read mismatches are fixed, this step becomes the only remaining operational visibility inconsistency.

Validation after Step 2:

1. Confirm an operational role can load `/at/at-documents` without `AT Document` permission errors.
2. Confirm upload/create still respects the chosen scope restrictions.
3. Confirm `AT User` and `AT Customer` do not accidentally inherit staff-only document pages unless product explicitly wants that.

### Step 3: Preserve the reports split-capability model

Primary files:

1. `frontend/src/pages/Reports.vue`
2. `frontend/src/composables/useReportsFilters.js`
3. `frontend/src/composables/useReportsRuntime.js`
4. `acentem_takipte/acentem_takipte/api/reports.py`

Change scope:

1. Keep the reports page itself visible to the operational family.
2. Ensure scheduled report configuration loads only for the backend-authorized admin/system roles.
3. Remove or guard any unconditional frontend call path that reaches `get_scheduled_report_configs` for broader operational roles.

Why third:

1. This is a capability split, not a missing direct-read DocType permission.
2. It should be fixed only after the operational DocType baseline is stable, otherwise report-page noise can mask the true permission regressions.

Validation after Step 3:

1. Confirm an `AT Agent` or `AT Accountant` can open `/at/reports?report=policy_list` without the scheduled-config validation error.
2. Confirm `AT System Manager` or `System Manager` still sees the scheduling controls.
3. Confirm backend `get_scheduled_report_configs` authorization remains unchanged unless there is an explicit product decision to widen it.

### Step 4: Reconcile route visibility with runtime permission reality

Primary files:

1. `frontend/src/router/index.js`
2. `frontend/src/composables/useSidebarNavigation.js`
3. `acentem_takipte/acentem_takipte/api/session.py`

Change scope:

1. Revisit frontend visibility only if backend alignment exposes a genuine product mismatch.
2. Do not widen `AT User` or `AT Customer` into the staff-facing operational family unless there is a deliberate product rule change.
3. Keep the current route/sidebar contract as the default target.

Why fourth:

1. The current investigation found that visibility is mostly correct and backend convergence is the real drift.
2. Editing route visibility earlier would hide real permission defects instead of fixing them.

Validation after Step 4:

1. Compare sidebar visibility and actual page load behavior for `AT Agent`, `AT Accountant`, `AT Manager`, and `AT System Manager`.
2. Confirm there are no visible pages that still fail immediately on first load due to missing list/count permissions.

## Minimal File-By-File Execution Checklist

1. Update `acentem_takipte/acentem_takipte/setup_utils.py` first.
2. Wire or verify scope enforcement in `acentem_takipte/acentem_takipte/doctype/branch_permissions.py` and `acentem_takipte/hooks.py`.
3. Re-test `/payments` and `/tasks` before touching any other page.
4. Then align `AT Document` across `setup_utils.py`, `api/documents.py`, and `doctype/at_document/at_document.py`.
5. Re-test `/at-documents` and upload/create behavior before touching reports.
6. Then narrow the reports scheduled-config frontend call path in `frontend/src/pages/Reports.vue`, `frontend/src/composables/useReportsFilters.js`, and `frontend/src/composables/useReportsRuntime.js`.
7. Only after these succeed, decide whether any router/sidebar change is still necessary.

## Important Caveat

This matrix is repository-backed and highly reliable for code intent.
The only remaining drift source that cannot be proven from the workspace alone is live site-specific `Custom DocPerm` rows or manual database overrides already present in an environment.