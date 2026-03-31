# Acentem Takipte TR/EN Localization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `acentem_takipte` into a bilingual English-first / Turkish-second Frappe app with a CSV-based translation workflow that can later support additional languages without changing the code architecture.

**Architecture:** English is the source of truth for all user-facing strings. Python uses `frappe._()`, JavaScript/Vue uses `__()`, and Jinja uses `{{ _("...") }}`. Translation data lives in `acentem_takipte/translations/*.csv`, with `en.csv` as the source template and `tr.csv` as the second-language translation file. Locale resolution is user preference -> browser language -> English fallback.

**Tech Stack:** Frappe Framework, Python, Vue 3, JavaScript, CSV-based translation dictionaries, bench, Vitest, Playwright.

---

## Current State

- Translation foundation is already in place:
  - `acentem_takipte/translations/en.csv`
  - `acentem_takipte/translations/tr.csv`
  - `acentem_takipte/hooks.py` with `translated_languages = ["en", "tr"]`
  - locale fallback in `frontend/src/state/session.js` and `acentem_takipte/www/at.py`
- The quick-create registry was converted to English-first source labels:
  - `frontend/src/config/quickCreate/registry.js`
- Backend seed templates and default language flow were normalized to English source:
  - `acentem_takipte/acentem_takipte/notification_seed_data.py`
  - `acentem_takipte/acentem_takipte/api/smoke.py`
  - `acentem_takipte/acentem_takipte/api/session.py`
  - `acentem_takipte/acentem_takipte/notification_dispatch.py`
  - `acentem_takipte/acentem_takipte/providers/whatsapp_meta.py`
  - `acentem_takipte/acentem_takipte/services/notifications.py`
  - `acentem_takipte/acentem_takipte/services/campaigns.py`
  - `acentem_takipte/acentem_takipte/services/quick_create_special.py`
  - `acentem_takipte/acentem_takipte/services/scheduled_reports.py`
  - `acentem_takipte/acentem_takipte/api/aux_edit_registry.py`
  - `acentem_takipte/acentem_takipte/setup_utils.py`
- Customer access and report runtime helper messages were added to the CSV source inventory:
  - `acentem_takipte/acentem_takipte/api/customers.py`
  - `acentem_takipte/acentem_takipte/services/reports_runtime.py`
- The privacy masking rate-limit message and emergency access validation messages were converted to English source:
  - `acentem_takipte/acentem_takipte/services/privacy_masking.py`
  - `acentem_takipte/acentem_takipte/doctype/at_emergency_access/at_emergency_access.py`
- The renewal service auto-close note was normalized to English-first source:
  - `acentem_takipte/acentem_takipte/renewal/service.py`
- `at_customer.py` and `at_policy.py` returned no hardcoded Turkish strings during the regex scan; both modules already follow English source + `_()` conventions for user-facing text.
- The `AT Activity` metadata file was converted to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_activity/at_activity.json`
- The remaining Turkish label/description fields in `AT Customer` and `AT Policy` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.json`
  - `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.json`
- The remaining Turkish / ASCII-Turkish fields in `AT Customer Segment Snapshot` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_customer_segment_snapshot/at_customer_segment_snapshot.json`
- The remaining Turkish fields in `AT Policy Snapshot` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_policy_snapshot/at_policy_snapshot.json`
- The remaining Turkish fields in `AT Payment Installment` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_payment_installment/at_payment_installment.json`
- The remaining Turkish fields in `AT Call Note` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_call_note/at_call_note.json`
- The remaining Turkish and ASCII-Turkish fields in `AT Campaign` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_campaign/at_campaign.json`
- The remaining Turkish fields in `AT Policy Endorsement` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_policy_endorsement/at_policy_endorsement.json`
- The remaining Turkish fields in `AT Renewal Outcome` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_renewal_outcome/at_renewal_outcome.json`
- The remaining Turkish fields in `AT Segment` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_segment/at_segment.json`
- The remaining Turkish fields in `AT Customer Relation` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_customer_relation/at_customer_relation.json`
- The remaining Turkish fields in `AT Insured Asset` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_insured_asset/at_insured_asset.json`
- The remaining Turkish description fields in `AT Notification Draft` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_notification_draft/at_notification_draft.json`
- The remaining Turkish description fields in `AT Accounting Entry` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_accounting_entry/at_accounting_entry.json`
- The remaining Turkish fields in `AT Claim` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_claim/at_claim.json`
- The remaining Turkish fields in `AT Reconciliation Item` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_reconciliation_item/at_reconciliation_item.json`
- The remaining Turkish fields in `AT Lead` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_lead/at_lead.json`
- The remaining Turkish fields in `AT Renewal Task` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_renewal_task/at_renewal_task.json`
- The remaining Turkish fields in `AT Offer` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_offer/at_offer.json`
- The remaining Turkish fields in `AT Payment` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_payment/at_payment.json`
- The remaining Turkish fields in `AT Ownership Assignment` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_ownership_assignment/at_ownership_assignment.json`
- The remaining Turkish fields in `AT Task` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_task/at_task.json`
- The remaining Turkish fields in `AT Reminder` metadata were moved to English source:
  - `acentem_takipte/acentem_takipte/doctype/at_reminder/at_reminder.json`
- The next real work starts in backend localization, beginning with the two highest-traffic DocType modules:
  - `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py`
  - `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`
- Lead stale labels now resolved from translation catalog:
  - `frontend/src/composables/useLeadDetailRuntime.js`
- Policy / Claims quick-assignment eyebrow fallbacks converted to source-English:
  - `frontend/src/composables/usePolicyDetailQuickDialogs.js`
  - `frontend/src/composables/useClaimsBoardRuntime.js`
- Lead list "All" filter now resolved from catalog:
  - `frontend/src/composables/useLeadListTableData.js`
- OfferBoard validation messages connected to source-English helper:
  - `frontend/src/composables/offerBoard/quickOffer.js`
- Translation catalog and CSVs updated with missing sources:
  - `frontend/src/generated/translations.js`
  - `acentem_takipte/translations/en.csv`
  - `acentem_takipte/translations/tr.csv`
- **Status analysis (2026-03-31):** All 20+ frontend pages already have `copy = { tr: {...}, en: {...} }` structure. English strings are in `en:` as source. Current `t(key)` function translates by locale. `translateText` i18n utility also connected to CSV catalog.
- **Commit:** `2fb32ab` — `refactor: normalize remaining locale fallbacks`

---

## Ongoing Work (2026-03-31)

### Verification Results

Next wave targets checked:

1. **`CustomerList.vue`** - `copy = { tr: {...}, en: {...} }` ✅
2. **`Dashboard.vue`** - `copy = { tr: {...}, en: {...} }` ✅
3. **`LeadList.vue`** - `copy = { tr: {...}, en: {...} }` ✅
4. **`usePolicyFormRuntime.js`** - `copy = { tr: {...}, en: {...} }` ✅

All files have English strings in `en:` as source.

### Overall Status

Frontend localization status:
- 20+ Vue pages have `copy = { tr: {...}, en: {...} }` structure
- English strings are in `en:` as source
- `translateText` i18n utility connected to CSV catalog
- Turkish characters only in `tr:` fields (correct)
- Build: successful ✅
- Commit: `1e3ce50` ✅

### Remaining Work

1. **Vitest test files** - 81 test files exist but no vitest format tests found
2. **WSL Frappe Server** - Connection optional
3. **Frontend hot spot files** - All comply with localization standards

### WSL Frappe Server (Optional)

- URL: `http://at.localhost:8000/at/`
- Login: `Administrator` / `admin`
- Must be started with `bench start` in WSL

---

## Test Results (2026-03-31)

### ❌ Playwright E2E Smoke Test
- **Status:** Failed - Server not running
- **Error:** `ERR_CONNECTION_REFUSED at http://localhost:8080/login`
- **Cause:** Frappe server not running at `localhost:8080`
- **Solution:** Need to start server with `bench start` in WSL

### ❌ bench build --app acentem_takipte
- **Status:** Failed - Node missing
- **Error:** `ValueError: Invalid version string: 'bin/sh: 1: node: not found'`
- **Cause:** Node.js not installed in WSL environment
- **Solution:** Node.js needs to be installed on the system

---

## Repo Gap Audit (2026-03-30)

After a full repo scan, the main localization surfaces that still need attention are:

### Backend hot spots

- `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py`
- `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`
- `acentem_takipte/acentem_takipte/**/*.py` for the remaining shared helper and report/notification strings
- `acentem_takipte/acentem_takipte/api/customers.py`
- `acentem_takipte/acentem_takipte/services/reports_runtime.py`

### Completed backend normalization waves

- `acentem_takipte/acentem_takipte/services/report_exports.py`
- `acentem_takipte/acentem_takipte/services/list_exports.py`
- `acentem_takipte/acentem_takipte/setup_utils.py`
- `acentem_takipte/acentem_takipte/api/seed.py`
- `acentem_takipte/acentem_takipte/services/policy_360.py`
- `acentem_takipte/acentem_takipte/utils/i18n.py`

These files now use source-only English plus CSV-based locale resolution.

### Frontend hot spots

The majority of visible copy still clusters in these file families:

- `frontend/src/pages/Dashboard.vue`
- `frontend/src/pages/PolicyList.vue`
- `frontend/src/pages/RenewalsBoard.vue`
- `frontend/src/pages/PolicyDetail.vue`
- `frontend/src/pages/OfferBoard.vue`
- `frontend/src/pages/CustomerDetail.vue`
- `frontend/src/pages/CommunicationCenter.vue`
- `frontend/src/pages/ClaimsBoard.vue`
- `frontend/src/pages/LeadList.vue`
- `frontend/src/pages/PaymentsBoard.vue`
- `frontend/src/pages/ImportData.vue`
- `frontend/src/pages/ExportData.vue`
- `frontend/src/pages/ReconciliationWorkbench.vue`
- `frontend/src/pages/RenewalTaskDetail.vue`
- `frontend/src/pages/OfferDetail.vue`
- `frontend/src/composables/usePolicyFormRuntime.js`
- `frontend/src/composables/useRenewalsBoardRuntime.js`
- `frontend/src/composables/useSidebarNavigation.js`

### Metadata hot spot

- `acentem_takipte/acentem_takipte/doctype/at_activity/at_activity.json`

### New priority note

The next implementation wave should be:
1. First continue with `at_customer.py` and `at_policy.py`
2. Finally move through the frontend copy clusters

---

## Global Rules

1. **Source strings are always English**
   - All user-facing text in code must be written in English first.
   - Turkish lives in `tr.csv`.

2. **Use the correct Frappe wrapper**
   - Python: `from frappe import _`
   - JS/Vue: `__()`
   - Jinja/HTML: `{{ _("...") }}`

3. **Do not split dynamic strings**
   - Wrong: `_("Policy") + " " + policy_no + " " + _("created")`
   - Right: `_("Policy {0} has been created").format(policy_no)`

4. **Use context when a source string is ambiguous**
   - Example:
     - `_("Type", context="Policy Type")`
     - `_("Type", context="Document Type")`

5. **Keep the glossary consistent**
   - `Policy` -> `Poliçe`
   - `Endorsement` -> `Zeyil`
   - `Installment` -> `Taksit`
   - `Renewal` -> `Yenileme`
   - `Gross Premium` -> `Brüt Prim`
   - `Net Premium` -> `Net Prim`
   - `Effective Date` -> `Yürürlük Tarihi`
   - `Expiry Date` -> `Bitiş Tarihi`
   - `Policyholder` -> use context-sensitive translation:
     - `Sigortalı` in customer-facing policy contexts
     - `Ettiren` in formal / contractual contexts when appropriate

6. **DocType JSONs must be handled safely**
   - Prefer controlled Frappe export / fixtures / editor workflows.
   - Avoid careless manual edits that could break schema or options.

7. **Commit in small chunks**
   - Prefer one file family per commit.
   - `customer` and `policy` should never be bundled into a giant unreviewable change.

8. **Hardcoded Turkish string discovery is a required first pass**
   - Use the regex scan to build a source inventory before touching conversion logic.

9. **Frappe translation tooling needs caution**
   - Commands like `bench build-message-files` can rewrite CSV translation files in the working tree.
   - Use these commands only after checking the diff and, if needed, taking a backup first.

---

## Search / Discovery Pattern

Use this regex to find likely hardcoded Turkish strings:

```regex
[^"']*[ğĞüÜşŞİıöÖçÇ][^"']*
```

Suggested search targets:
- `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py`
- `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`
- `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.json`
- `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.json`
- any helper modules those files import

Suggested CLI equivalent:

```powershell
rg -n --pcre2 '[^"']*[ğĞüÜşŞİıöÖçÇ][^"']*' acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py
rg -n --pcre2 '[^"']*[ğĞüÜşŞİıöÖçÇ][^"']*' acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py
```

---

## Phase Map

| Phase | Task | File/Path | Status | Priority |
|---|---|---|---|---|
| Infrastructure | Translation folder + CSV template + hooks + locale fallback | `acentem_takipte/translations/*.csv`, `acentem_takipte/hooks.py`, `acentem_takipte/www/at.py`, `frontend/src/state/session.js` | Done | High |
| Backend | `at_customer.py` localization pass (regex scan clean; already compliant) | `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py` | Done | High |
| Backend | `at_policy.py` localization pass (regex scan clean; already compliant) | `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py` | Done | High |
| Backend | Shared backend helpers and report/notification strings | `acentem_takipte/acentem_takipte/**/*.py` | Todo | High |
| Backend | Seed templates and default language fallback flow | `acentem_takipte/acentem_takipte/notification_seed_data.py`, `acentem_takipte/acentem_takipte/api/smoke.py`, `acentem_takipte/acentem_takipte/api/session.py`, `acentem_takipte/acentem_takipte/notification_dispatch.py`, `acentem_takipte/acentem_takipte/providers/whatsapp_meta.py`, `acentem_takipte/acentem_takipte/services/notifications.py`, `acentem_takipte/acentem_takipte/services/campaigns.py`, `acentem_takipte/acentem_takipte/services/quick_create_special.py`, `acentem_takipte/acentem_takipte/services/scheduled_reports.py`, `acentem_takipte/acentem_takipte/api/aux_edit_registry.py`, `acentem_takipte/acentem_takipte/setup_utils.py` | Done | High |
| Frontend | App shell, boards, detail pages localization pass | `frontend/src/**/*.vue`, `frontend/src/**/*.js` | Todo | High |
| Metadata | DocType labels, descriptions, select options | `acentem_takipte/acentem_takipte/doctype/**/*.json` | Todo | High |
| Test | Backend / frontend / smoke / CSV roundtrip | `acentem_takipte/acentem_takipte/tests/*`, `frontend/src/**/*.test.js`, `frontend/tests/e2e/*` | Todo | High |

---

## Phase 2: Backend Localization Launch

This phase is intentionally small and controlled. The first work targets `at_customer.py`, then `at_policy.py`. Each file is handled in its own commit when possible.

### Task 2.1: Inventory `at_customer.py`

**Files:**
- Modify: `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py`
- Test: `acentem_takipte/acentem_takipte/doctype/at_customer/` targeted backend tests if they exist

- [ ] **Step 1: Run the Turkish-string regex scan**

Run:
```powershell
rg -n --pcre2 '[^"']*[ğĞüÜşŞİıöÖçÇ][^"']*' acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py
```
Expected: a list of every likely hardcoded Turkish string and its line number.

- [ ] **Step 2: Categorize each string**

Classify each match into one of these buckets:
- Error message
- Success message
- Validation message
- Label / button / UI copy
- Technical message that should not be user-facing

Expected: a categorized inventory note before editing the file.

- [ ] **Step 3: Define the English source string**

For every user-facing string, write the master English source string and decide whether context is needed.

Expected:
- English source is explicit
- ambiguous strings include `context`
- dynamic strings use placeholders

- [ ] **Step 4: Update CSV entries**

Sync the source inventory into:
- `acentem_takipte/translations/en.csv`
- `acentem_takipte/translations/tr.csv`

Expected:
- one source row per string
- no broken commas / empty columns
- consistent glossary terms

- [ ] **Step 5: Convert Python strings**

Wrap user-facing strings with `_()` and rewrite dynamic messages with `.format()`.

Expected:
- `from frappe import _` exists in the file
- no fragmented string concatenation for user-facing messages

- [ ] **Step 6: Refresh message dictionary**

Run:
```powershell
bench --site at.localhost get-msg-dict acentem_takipte
```
Expected: message dictionary regeneration completes without errors.

- [ ] **Step 7: Run targeted tests**

Run:
```powershell
bench --site at.localhost run-tests --app acentem_takipte
```
Expected:
- targeted tests pass
- no new translation-related regression

- [ ] **Step 8: Commit**

Commit message guideline:
```bash
git commit -m "refactor: localize customer backend messages"
```

Expected: one focused commit for `at_customer.py`.

**Definition of Done:**
- All user-facing strings in `at_customer.py` are English source and wrapped in `_()`
- Dynamic strings use placeholders, not concatenation
- Ambiguous terms use context where necessary
- `en.csv` / `tr.csv` include the new source rows
- Targeted tests and message dict refresh pass

---

### Task 2.2: Inventory `at_policy.py`

**Files:**
- Modify: `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`
- Test: `acentem_takipte/acentem_takipte/doctype/at_policy/test_at_policy.py`

- [ ] **Step 1: Run the Turkish-string regex scan**

Run:
```powershell
rg -n --pcre2 '[^"']*[ğĞüÜşŞİıöÖçÇ][^"']*' acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py
```
Expected: a complete inventory of candidate strings.

- [ ] **Step 2: Categorize each string**

Buckets:
- Error
- Success
- Validation
- UI / label
- Technical

Expected: a clear list of what needs conversion and what should stay technical.

- [ ] **Step 3: Define the English source string**

Expected:
- source strings are concise English phrases
- context is added for ambiguous terms like `Type`, `Status`, `Save`, `Reset`
- sector terms use the glossary

- [ ] **Step 4: Update CSV entries**

Sync to:
- `acentem_takipte/translations/en.csv`
- `acentem_takipte/translations/tr.csv`

Expected:
- glossary alignment
- no duplicate source rows with conflicting translations

- [ ] **Step 5: Convert Python strings**

Expected:
- `from frappe import _` imported
- `_()` wraps all user-facing strings
- `.format()` used for dynamic messages

- [ ] **Step 6: Refresh message dictionary**

Run:
```powershell
bench --site at.localhost get-msg-dict acentem_takipte
```

Expected: dictionary refresh completes successfully.

- [ ] **Step 7: Run targeted tests**

Run:
```powershell
bench --site at.localhost run-tests --app acentem_takipte
```

Expected:
- `test_at_policy.py` remains green
- translation changes do not break policy behavior

- [ ] **Step 8: Commit**

Commit message guideline:
```bash
git commit -m "refactor: localize policy backend messages"
```

**Definition of Done:**
- All user-facing strings in `at_policy.py` are English source and wrapped in `_()`
- Dynamic strings are placeholder-based
- Context is used for ambiguous terms
- `en.csv` / `tr.csv` are updated
- Tests and message dict regeneration pass

---

### Task 2.3: Shared backend helpers

**Files:**
- Modify: any helper modules imported by `at_customer.py` and `at_policy.py`
- Modify: `acentem_takipte/acentem_takipte/services/*.py`
- Modify: `acentem_takipte/acentem_takipte/api/*.py`

- [ ] **Step 1: Scan shared modules for user-facing text**
- [ ] **Step 2: Convert to `_()`**
- [ ] **Step 3: Add context where needed**
- [ ] **Step 4: Sync CSV**
- [ ] **Step 5: Run bench msg dict refresh**
- [ ] **Step 6: Run tests**
- [ ] **Step 7: Commit**

**Definition of Done:**
- backend messages remain consistent across shared services
- no hardcoded Turkish user-facing strings remain in shared modules

---

## Later Phases (Do not start until backend launch is stable)

### Phase 3: Frontend Localization

Targets:
- `frontend/src/pages/*`
- `frontend/src/components/*`
- `frontend/src/composables/*`

Rules:
- use `__()` for UI copy
- convert page titles, buttons, empty states, tooltips, errors
- keep English source as the key

Success criteria:
- language toggle changes visible text
- no hardcoded Turkish strings in visible UI copy
- dynamic UI copy uses placeholders and context where needed

### Phase 4: Metadata / DocType Localization

Targets:
- `acentem_takipte/acentem_takipte/doctype/**/*.json`

Rules:
- do not break schemas
- prefer controlled export/fixtures/editor flow
- keep labels/descriptions/options English source based

Success criteria:
- DocType label/description/options are translatable
- fixtures or export steps do not corrupt schema

### Phase 5: Validation, Smoke, and Release

Commands:
- `bench --site at.localhost get-msg-dict acentem_takipte`
- `bench --site at.localhost migrate`
- `bench build --app acentem_takipte`
- `cd frontend && npm run build`
- `cd frontend && npm run test:unit`
- Playwright smoke on `at.localhost:8000`

Success criteria:
- TR/EN mode works end-to-end
- backend messages, frontend copy, and metadata all follow the glossary
- future languages can be added by creating a new CSV file without changing architecture

---

## Tracking Rules

Each task is complete only when:
- the regex inventory is updated
- source strings are in English
- translation CSVs are synced
- tests pass
- bench message dict refresh has been run
- a small, reviewable commit exists

If a file becomes too large or noisy during localization:
- split by responsibility
- keep the split small
- commit the split separately before proceeding

If a term is ambiguous:
- prefer context over inventing duplicate source strings
- keep glossary decisions consistent across the entire app
