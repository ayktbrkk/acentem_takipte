# Localization Zero-Tolerance Audit (2026-03-31)

## Scope
- Backend: `acentem_takipte/acentem_takipte/**/*.py`
- Frontend: `frontend/src/**/*.{js,vue,ts,tsx}`
- Metadata: `acentem_takipte/acentem_takipte/doctype/**/*.json`
- Turkish character sweep regex: `[ğĞüÜşŞİıöÖçÇ]`

## Exclusions
- `acentem_takipte/translations/tr.csv`
- `frontend/src/generated/translations.js`

## Results
- Turkish-character violations (non-excluded): 4061
- Bare `frappe.throw("...")` violations: 16
- Localized source strings missing in `en.csv`: 217
- Placeholder mismatch (`en.csv` vs `tr.csv`): 0
- Frappe untranslated report (`bench get-untranslated`): 596 missing of 825

## Top Hotspots (Frontend)
- `frontend/src/pages/Dashboard.vue`
- `frontend/src/pages/LeadList.vue`
- `frontend/src/pages/ReconciliationWorkbench.vue`
- `frontend/src/pages/OfferBoard.vue`
- `frontend/src/pages/PolicyList.vue`

## Top Hotspots (Backend Missing Source)
- `acentem_takipte/acentem_takipte/api/break_glass.py`
- `acentem_takipte/acentem_takipte/api/communication.py`
- `acentem_takipte/acentem_takipte/desktop.py`
- `acentem_takipte/acentem_takipte/doctype/at_claim/at_claim.py`
- `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py`

## Bare Throw Findings (Need `_()`)
- `acentem_takipte/acentem_takipte/dev_seed.py`
- `acentem_takipte/acentem_takipte/patches/v2026_03_14_policy_company_number_indexes.py`
- `acentem_takipte/acentem_takipte/patches/v2026_03_25_origin_current_office_branch_*.py`

## Guardrails Added
- Guard script: `tools/localization_guard.py`
- Pre-commit hook: `.githooks/pre-commit`
- GitHub Action: `.github/workflows/localization-guard.yml`

## Recommended Fix Order
1. Convert page-level `copy.tr` blocks to source-English + runtime translation keys.
2. Add missing source strings to `en.csv` and `tr.csv` from backend/API findings.
3. Wrap remaining bare `frappe.throw` strings with `_(...)`.
4. Enforce guard in PR checks and local pre-commit.

## Zero-Error Status
- Not achieved yet.
