# Commission Tracking System — Design Spec

**Date:** 2026-07-29  
**Status:** Approved  
**Scope:** `/at/commissions` page + Policy detail commission panel

---

## 1. Overview

The current commission system has waterfall distribution, aging buckets, cumulative payout validation, and cancellation reversal — but no operational tracking dashboard. Agency operators cannot answer: "how much commission has entity X earned, how much has been paid, and how much is pending?"

This feature adds:

1. **Policy-level commission distribution panel** — visible on every `PolicyDetail` page, showing the waterfall hierarchy as a tree with amounts and percentages.
2. **`/at/commissions` page** — entity-based balance cards with accrued/paid/remaining metrics, aging breakdown, and drilldown detail.

All data comes from the existing `commission_distribution` JSON field on `AT Policy` and the `AT Payment` table. No new DocTypes or database tables are created.

---

## 2. Architecture

```
CommissionBalances.vue (page)
  ↓ useCommissionBalances.js (composable)
  ↓ GET /api/method/...get_commission_balances
  ↓ balance.py (backend service)
  ↓ reads: AT Policy.commission_distribution (JSON)
  ↓ reads: AT Payment (Commission Payout, non-Cancelled)
  ↓ computes: accrued, paid, remaining, aging per entity
```

```
CommissionBalances.vue (drilldown)
  ↓ useCommissionEntityDetail.js (composable)
  ↓ GET /api/method/...get_commission_entity_detail
  ↓ balance.py (backend service)
  ↓ reads: AT Policy (filtered by entity name in distribution)
  ↓ reads: AT Payment (filtered by entity)
```

```
PolicyDetail.vue (existing + new panel)
  ↓ reads: AT Policy.commission_distribution (already loaded)
  ↓ renders: tree view with entity names, share_pct, amounts
```

### 2.1 New Files

```
frontend/src/
  domains/commissions/
    pages/CommissionBalances.vue
    i18n/translations.js
  composables/
    useCommissionBalances.js
    useCommissionEntityDetail.js

acentem_takipte/acentem_takipte/
  domains/commissions/
    api/endpoints.py
    services/balance.py

tests/
  backend/test_commission_balances.py
  frontend/src/domains/commissions/pages/CommissionBalances.test.js
```

### 2.2 Modified Files

| File | Change |
|---|---|
| `frontend/src/router/index.js` | New route `/at/commissions` |
| `frontend/src/platform/router/index.js` | Sync copy of route |
| `frontend/src/platform/i18n/sidebar.js` | Sidebar label `TR: "Komisyon" / EN: "Commissions"` |
| `frontend/src/domains/policies/pages/PolicyDetail.vue` | New `SectionPanel` for commission distribution tree |
| `frontend/src/composables/usePolicyDetailRuntime.js` | Expose `commission_distribution` formatted data |

---

## 3. Backend API

### 3.1 `get_commission_balances`

```
METHOD: GET (whitelisted)
PATH: acentem_takipte.domains.commissions.api.endpoints.get_commission_balances
PARAMS:
  office_branch: str | None
  aging_bucket: "all" | "current" | "1_30" | "31_60" | "61_90" | "90_plus" (default: "all")
  limit: int (default 100)

RESPONSE:
{
  "summary": { "total_accrued_try": float, "total_paid_try": float, "total_remaining_try": float },
  "entities": [
    {
      "entity_name": str,
      "entity_type": str,
      "office_branch": str,        // display name via office_branch.office_branch_name
      "accrued_try": float,
      "paid_try": float,
      "remaining_try": float,
      "aging": {
        "current": float,
        "1_30": float,
        "31_60": float,
        "61_90": float,
        "90_plus": float
      },
      "policy_count": int
    }
  ]
}
```

**Computation:**

1. Query all policies with status IN ("Active", "Record") where `commission_amount > 0`.
   - `commission_amount` is the primary field; fall back to legacy `commission` field if `commission_amount` is NULL/0 (mirrors `resolve_commission_amount` in `accounting.py`).
2. For each policy, parse `commission_distribution` JSON array (schema: `[{entity, entity_name, level, share_pct, amount, amount_try, status}]`).
3. For each `{entity, amount_try}` entry, accumulate into `accrued_try` per entity.
4. Query all Commission Payout payments with `status != "Cancelled"`. Accumulate `amount_try` per `sales_entity`.
5. `remaining_try = accrued_try - paid_try`.
6. Aging: for each policy's contribution, compute `days = today - (policy.issue_date + COMMISSION_DUE_DAYS)` where `COMMISSION_DUE_DAYS = 30`. Assign to bucket based on `days`:
   - `current` — `days <= 0`
   - `1_30` — `1 <= days <= 30`
   - `31_60` — `31 <= days <= 60`
   - `61_90` — `61 <= days <= 90`
   - `90_plus` — `days > 90`
7. If `aging_bucket` filter is set, return only entities with non-zero remaining in that bucket.

**Permission:** `frappe.has_permission("AT Policy", "read")` and `frappe.has_permission("AT Payment", "read")`.

**Error handling:** If `commission_distribution` JSON is malformed for a policy, skip that policy's entries but continue processing others. Log a warning.

### 3.2 `get_commission_entity_detail`

```
METHOD: GET (whitelisted)
PATH: acentem_takipte.domains.commissions.api.endpoints.get_commission_entity_detail
PARAMS:
  entity_name: str (required)
  limit: int (default 50)

RESPONSE:
{
  "entity": { "name": str, "full_name": str, "entity_type": str, "office_branch": str },
  "accrued_policies": [
    {
      "policy_name": str,
      "policy_no": str,
      "customer_name": str,         // full_name from AT Customer
      "commission_amount_try": float,
      "issue_date": str,
      "aging_days": int
    }
  ],
  "payments": [
    {
      "payment_name": str,
      "payment_no": str,
      "amount_try": float,
      "payment_date": str,
      "reference_no": str
    }
  ]
}
```

**Computation:**

1. Query policies with status IN ("Active", "Record") where `commission_distribution` JSON contains the entity name.
2. Parse JSON to find policies where this entity has an entry. Extract `commission_amount_try`.
3. Query Commission Payout payments where `sales_entity == entity_name` and `status != "Cancelled"`.
4. Aging: `days = today - (policy.issue_date + 30)`.

---

## 4. Frontend

### 4.1 `/at/commissions` Page (`CommissionBalances.vue`)

**States:**

| State | Behaviour |
|---|---|
| Loading | Skeleton cards (3-column grid, 6 placeholder cards) |
| Empty | "Henuz komisyon kaydi bulunamadi" with illustration |
| Error | "Komisyon verileri yuklenemedi" with retry button |
| Data | Card grid with filters |

**Filter Bar:**
- Office Branch dropdown (from `branchStore`)
- Aging bucket radio/chip (Hepsi / Guncel / 1-30 / 31-60 / 61-90 / 90+)
- Filters sync to API params, re-fetch on change

**Summary Bar:**
- 3 metric cards: Toplam Tahakkuk, Toplam Odenen, Kalan Bakiye
- Fixed at top, doesn't scroll with cards

**Entity Cards (3-column responsive grid):**
- Entity name + entity_type badge
- Office branch display name
- 3 main metrics: accrued, paid, remaining (formatted as TRY)
- Progress bar: `paid / accrued` ratio with color (green >75%, amber 50-75%, red <50%)
- Aging bucket mini-labels (only show buckets with >0 balance)
- "Detayi Gor" toggle button → expands inline detail panel

**Drilldown Panel (expands below card):**
- Two-section layout: "Tahakkuk Eden Policeler" table + "Odeme Gecmisi" table
- Policy rows: policy_no (link), customer, commission_try, aging days
- Payment rows: date, payment_no, amount, reference
- Lazy-loaded: API call only when panel is first opened

### 4.2 Policy Detail Commission Panel

Added to `PolicyDetail.vue` as a `SectionPanel` with title "Komisyon Dagilimi":

**Tree view rendering:**
- Uses existing `commission_distribution` JSON array from policy data
- JSON schema: `[{entity, entity_name, level, share_pct, amount, amount_try, status}]`
- Sorts by level, indents child entities
- Each node shows: entity name (via `getLinkLabel`), share_pct, amount_try
- Horizontal bar proportional to amount
- Bottom line: "Toplam Komisyon: ₺X.XXX" with `commission_amount` (not gross premium)

**Edge case:** If `commission_distribution` is empty or `[]`, panel shows "Henüz dağılım hesaplanmadı" (distribution not yet computed).

---

## 5. Routing & Sidebar

### 5.1 Route

```js
// In frontend/src/router/index.js (and platform copy)
{
  path: '/commissions',
  name: 'commissions',
  component: () => import('@/domains/commissions/pages/CommissionBalances.vue'),
  meta: { title: 'Commissions' }
}
```

### 5.2 Sidebar

Add to sidebar navigation under "Finans" section:
- TR: "Komisyon"
- EN: "Commissions"
- Icon: `dollar-sign` or `percent`

---

## 6. Testing

### 6.1 Backend Tests

| Test | Description |
|---|---|
| `test_balances_empty` | No policies → empty response |
| `test_balances_single_entity` | One policy, one entity → correct accrued/paid/remaining |
| `test_balances_aging_buckets` | Policies with issue_date across all 5 buckets → correct bucketing |
| `test_balances_branch_filter` | office_branch filter returns only entities from that branch |
| `test_entity_detail` | Drilldown returns correct policies and payments |

### 6.2 Frontend Tests

| Test | Description |
|---|---|
| `test_renders_cards` | Mock API response → correct number of cards rendered |
| `test_aging_filter` | Select aging bucket → API called with correct param |
| `test_drilldown_toggle` | Click "Detayi Gor" → detail panel appears |
| `test_empty_state` | Empty API response → empty illustration shown |

---

## 7. Translation Keys

All new keys added to `frontend/src/domains/commissions/i18n/translations.js`:

| Key | TR | EN |
|---|---|---|
| `commissions` | Komisyon | Commissions |
| `subtitle` | Satış birimi bazında komisyon takip ve tahsilat ekranı | Commission tracking and collection by sales entity |
| `total_accrued` | Toplam Tahakkuk | Total Accrued |
| `total_paid` | Toplam Ödenen | Total Paid |
| `total_remaining` | Kalan Bakiye | Remaining Balance |
| `entity_type` | Birim Türü | Entity Type |
| `accrued` | Tahakkuk | Accrued |
| `paid` | Ödenen | Paid |
| `remaining` | Kalan | Remaining |
| `policy_count` | Poliçe Sayısı | Policy Count |
| `aging_current` | Güncel | Current |
| `aging_1_30` | 1-30 Gün | 1-30 Days |
| `aging_31_60` | 31-60 Gün | 31-60 Days |
| `aging_61_90` | 61-90 Gün | 61-90 Days |
| `aging_90_plus` | 90+ Gün | 90+ Days |
| `view_details` | Detayı Gör | View Details |
| `accrued_policies` | Tahakkuk Eden Poliçeler | Accrued Policies |
| `payment_history` | Ödeme Geçmişi | Payment History |
| `commission_distribution` | Komisyon Dağılımı | Commission Distribution |
| `total_commission` | Toplam Komisyon | Total Commission |
| `load_error` | Komisyon verileri yüklenemedi | Failed to load commission data |
| `no_commissions` | Henüz komisyon kaydı bulunamadı | No commission records yet |

---

## 8. Non-Goals (Explicitly Out of Scope)

- Batch/otomatik toplu odeme olusturma (Phase 2)
- Mutabakat raporu (Phase 3)
- Komisyon orani trend grafigi
- PDF/Excel export
- Dashboard'a yeni komisyon KPI'si
- `commission_distribution` JSON format degisikligi

---

## 9. Self-Review Notes

- No placeholders or TBDs remain.
- All API response formats are fully specified with field names and types.
- Frontend states (loading, empty, error, data) are defined for every component.
- Test coverage is specified for both backend and frontend.
- No new DocTypes or DB tables are introduced — all data comes from existing `commission_distribution` JSON and `AT Payment`.
- Existing code changes are limited to: router (route add), sidebar (menu entry), PolicyDetail (one new SectionPanel), usePolicyDetailRuntime (expose formatted distribution data).
- `commission_amount` vs legacy `commission` field fallback is documented (mirrors `resolve_commission_amount` in `accounting.py`).
- `commission_distribution` JSON schema is explicitly documented (`[{entity, entity_name, level, share_pct, amount, amount_try, status}]`).
- Aging buckets use the same `COMMISSION_DUE_DAYS = 30` constant as the existing reconciliation service.
- Malformed `commission_distribution` JSON is handled gracefully (skip + log, no crash).
- Empty distribution edge case shows "Henüz dağılım hesaplanmadı" in PolicyDetail panel.
- Payment accrual uses `status != "Cancelled"` (not just non-Draft) to mirror existing payout validation logic.
