# Commission Tracking System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/at/commissions` page with entity-based commission balance cards and drilldown detail, plus a commission distribution tree panel on the PolicyDetail page.

**Architecture:** Backend adds two whitelisted API endpoints in a new `domains/commissions/` module. Frontend adds a new domain page with Vue components following existing patterns (AuxWorkbench card grid, FilterBar, ListTable). No new DocTypes or DB tables — all data comes from existing `commission_distribution` JSON and `AT Payment`.

**Tech Stack:** Python 3.12 + Frappe 15 (backend), Vue 3 + Vite (frontend), vitest (frontend tests), pytest via bench (backend tests)

---

## File Structure

### Backend (new)

```
acentem_takipte/acentem_takipte/domains/commissions/
  api/endpoints.py          — whitelisted API functions
  services/balance.py        — business logic (computation)
  __init__.py
acentem_takipte/acentem_takipte/tests/
  test_commission_balances.py — backend tests
```

### Frontend (new)

```
frontend/src/domains/commissions/
  pages/CommissionBalances.vue  — main page
  i18n/translations.js          — TR/EN translations
frontend/src/composables/
  useCommissionBalances.js      — state + API for card grid
  useCommissionEntityDetail.js  — state + API for drilldown
frontend/src/domains/commissions/pages/
  CommissionBalances.test.js    — frontend tests
```

### Modified

```
frontend/src/router/index.js                        — add route
frontend/src/platform/router/index.js                — sync route
frontend/src/platform/i18n/sidebar.js               — sidebar entry
frontend/src/domains/policies/pages/PolicyDetail.vue — add commission panel
frontend/src/composables/usePolicyDetailRuntime.js   — expose formatted distribution
```

---

### Task 1: Backend — Create domain scaffold

**Files:**
- Create: `acentem_takipte/acentem_takipte/domains/commissions/__init__.py`
- Create: `acentem_takipte/acentem_takipte/domains/commissions/api/__init__.py`
- Create: `acentem_takipte/acentem_takipte/domains/commissions/services/__init__.py`

- [ ] **Step 1: Create __init__.py files**

Create all three as empty files.

- [ ] **Step 2: Commit**

```bash
git add acentem_takipte/acentem_takipte/domains/commissions/
git commit -m "feat: create commissions domain scaffold"
```

---

### Task 2: Backend — Write balance service with failing test

**Files:**
- Create: `acentem_takipte/acentem_takipte/domains/commissions/services/balance.py`
- Create: `acentem_takipte/acentem_takipte/tests/test_commission_balances.py`

- [ ] **Step 1: Write failing test**

Create `acentem_takipte/acentem_takipte/tests/test_commission_balances.py`:

```python
from __future__ import annotations

import frappe
from frappe.tests.utils import FrappeTestCase

from acentem_takipte.acentem_takipte.domains.commissions.services.balance import (
    compute_commission_balances,
)


class TestCommissionBalances(FrappeTestCase):
    def test_empty_returns_zero(self):
        result = compute_commission_balances()
        assert result["summary"]["total_accrued_try"] == 0
        assert result["summary"]["total_paid_try"] == 0
        assert result["summary"]["total_remaining_try"] == 0
        assert result["entities"] == []
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bench --site at.localhost run-tests --app acentem_takipte --module acentem_takipte.tests.test_commission_balances
```
Expected: `ModuleNotFoundError: No module named 'acentem_takipte.acentem_takipte.domains.commissions.services.balance'`

- [ ] **Step 3: Write minimal balance.py**

Create `acentem_takipte/acentem_takipte/domains/commissions/services/balance.py`:

```python
from __future__ import annotations

import json
from datetime import date, timedelta

import frappe
from frappe.utils import flt, getdate, nowdate

from acentem_takipte.acentem_takipte.domains.accounting.services.runtime import (
    COMMISSION_DUE_DAYS,
)


def compute_commission_balances(
    office_branch: str | None = None,
    aging_bucket: str = "all",
    limit: int = 100,
) -> dict:
    today = getdate(nowdate())
    accrued_by_entity: dict[str, float] = {}
    aging_by_entity: dict[str, dict[str, float]] = {}

    # 1. Accrued: parse commission_distribution from Active/Record policies
    policies = frappe.get_all(
        "AT Policy",
        filters={"status": ["in", ["Active", "Record"]], "commission_amount": [">", 0]},
        fields=["name", "issue_date", "commission_distribution"],
        limit_page_length=0,
    )
    for policy in policies:
        try:
            entries = json.loads(policy.get("commission_distribution") or "[]")
        except (json.JSONDecodeError, TypeError):
            continue
        issue_date = policy.get("issue_date")
        for entry in entries:
            entity = entry.get("entity")
            amount_try = flt(entry.get("amount_try") or 0)
            if not entity or amount_try <= 0:
                continue
            accrued_by_entity[entity] = accrued_by_entity.get(entity, 0) + amount_try

            # Aging per entity
            days_aging = (today - (issue_date + timedelta(days=COMMISSION_DUE_DAYS))).days if issue_date else 0
            bucket = _aging_bucket(days_aging)
            if entity not in aging_by_entity:
                aging_by_entity[entity] = {}
            aging_by_entity[entity][bucket] = aging_by_entity[entity].get(bucket, 0) + amount_try

    # 2. Paid: sum Commission Payout payments per sales_entity
    paid_rows = frappe.get_all(
        "AT Payment",
        filters={
            "payment_purpose": "Commission Payout",
            "status": ["!=", "Cancelled"],
        },
        fields=["sales_entity", "amount_try"],
        limit_page_length=0,
    )
    paid_by_entity: dict[str, float] = {}
    for row in paid_rows:
        entity = row.get("sales_entity") or ""
        if entity:
            paid_by_entity[entity] = paid_by_entity.get(entity, 0) + flt(row.get("amount_try") or 0)

    # 3. Build entity list
    entity_names = set(accrued_by_entity.keys()) | set(paid_by_entity.keys())
    if office_branch:
        entity_names = {name for name in entity_names if _entity_branch(name) == office_branch}

    entities = []
    for entity_name in sorted(entity_names):
        accrued = accrued_by_entity.get(entity_name, 0)
        paid = paid_by_entity.get(entity_name, 0)
        remaining = accrued - paid
        if remaining <= 0 and accrued == 0:
            continue
        aging = aging_by_entity.get(entity_name, {})
        if aging_bucket != "all":
            bucket_amount = aging.get(aging_bucket, 0)
            if bucket_amount <= 0:
                continue

        entities.append({
            "entity_name": entity_name,
            "entity_type": _entity_type(entity_name),
            "office_branch": _entity_branch(entity_name),
            "accrued_try": round(accrued, 2),
            "paid_try": round(paid, 2),
            "remaining_try": round(remaining, 2),
            "aging": {
                "current": round(aging.get("current", 0), 2),
                "1_30": round(aging.get("1_30", 0), 2),
                "31_60": round(aging.get("31_60", 0), 2),
                "61_90": round(aging.get("61_90", 0), 2),
                "90_plus": round(aging.get("90_plus", 0), 2),
            },
            "policy_count": _policy_count(entity_name),
        })

    entities.sort(key=lambda e: e["remaining_try"], reverse=True)
    entities = entities[: int(limit)]

    return {
        "summary": {
            "total_accrued_try": round(sum(e["accrued_try"] for e in entities), 2),
            "total_paid_try": round(sum(e["paid_try"] for e in entities), 2),
            "total_remaining_try": round(sum(e["remaining_try"] for e in entities), 2),
        },
        "entities": entities,
    }


def _aging_bucket(days: int) -> str:
    if days <= 0:
        return "current"
    if days <= 30:
        return "1_30"
    if days <= 60:
        return "31_60"
    if days <= 90:
        return "61_90"
    return "90_plus"


def _entity_branch(entity_name: str) -> str:
    val = frappe.db.get_value("AT Sales Entity", entity_name, "office_branch")
    return str(val or "")


def _entity_type(entity_name: str) -> str:
    val = frappe.db.get_value("AT Sales Entity", entity_name, "entity_type")
    return str(val or "")


def _policy_count(entity_name: str) -> int:
    return int(
        frappe.db.count(
            "AT Policy",
            {"sales_entity": entity_name, "status": ["in", ["Active", "Record"]], "commission_amount": [">", 0]},
        )
    )
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bench --site at.localhost run-tests --app acentem_takipte --module acentem_takipte.tests.test_commission_balances
```
Expected: `test_empty_returns_zero ... ok`

- [ ] **Step 5: Commit**

```bash
git add acentem_takipte/acentem_takipte/domains/commissions/services/balance.py acentem_takipte/acentem_takipte/tests/test_commission_balances.py
git commit -m "feat: add commission balance computation service"
```

---

### Task 3: Backend — Entity detail service with failing test

**Files:**
- Create: `acentem_takipte/acentem_takipte/domains/commissions/services/balance.py` (extend)
- Create: `acentem_takipte/acentem_takipte/tests/test_commission_balances.py` (extend)

- [ ] **Step 1: Write failing test**

Add to `test_commission_balances.py`:

```python
from acentem_takipte.acentem_takipte.domains.commissions.services.balance import (
    compute_entity_detail,
)

class TestEntityDetail(FrappeTestCase):
    def test_empty_entity_returns_empty(self):
        result = compute_entity_detail("Nonexistent Entity")
        assert result["entity"]["name"] == "Nonexistent Entity"
        assert result["accrued_policies"] == []
        assert result["payments"] == []
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bench --site at.localhost run-tests --app acentem_takipte --module acentem_takipte.tests.test_commission_balances
```
Expected: `ImportError` or `AttributeError: module has no attribute 'compute_entity_detail'`

- [ ] **Step 3: Add compute_entity_detail to balance.py**

Append to `acentem_takipte/acentem_takipte/domains/commissions/services/balance.py`:

```python
def compute_entity_detail(entity_name: str, limit: int = 50) -> dict:
    entity_name = str(entity_name or "").strip()
    entity_row = frappe.db.get_value(
        "AT Sales Entity",
        entity_name,
        ["name", "full_name", "entity_type", "office_branch"],
        as_dict=True,
    )

    # Find policies where this entity has a distribution entry
    policies = frappe.get_all(
        "AT Policy",
        filters={"status": ["in", ["Active", "Record"]], "commission_amount": [">", 0]},
        fields=["name", "policy_no", "customer", "issue_date", "commission_distribution"],
        limit_page_length=0,
    )

    accrued_policies = []
    today = getdate(nowdate())
    for policy in policies:
        try:
            entries = json.loads(policy.get("commission_distribution") or "[]")
        except (json.JSONDecodeError, TypeError):
            continue
        for entry in entries:
            if entry.get("entity") != entity_name:
                continue
            amount_try = flt(entry.get("amount_try") or 0)
            if amount_try <= 0:
                continue
            issue_date = policy.get("issue_date")
            aging_days = (today - (issue_date + timedelta(days=COMMISSION_DUE_DAYS))).days if issue_date else 0
            accrued_policies.append({
                "policy_name": policy["name"],
                "policy_no": policy.get("policy_no") or policy["name"],
                "customer_name": frappe.db.get_value("AT Customer", policy.get("customer"), "full_name") or "",
                "commission_amount_try": round(amount_try, 2),
                "issue_date": str(issue_date or ""),
                "aging_days": aging_days,
            })

    payments = frappe.get_all(
        "AT Payment",
        filters={
            "payment_purpose": "Commission Payout",
            "sales_entity": entity_name,
            "status": ["!=", "Cancelled"],
        },
        fields=["name", "payment_no", "amount_try", "payment_date", "reference_no"],
        order_by="payment_date desc",
        limit_page_length=int(limit),
    )

    return {
        "entity": entity_row or {"name": entity_name, "full_name": "", "entity_type": "", "office_branch": ""},
        "accrued_policies": accrued_policies[: int(limit)],
        "payments": payments,
    }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bench --site at.localhost run-tests --app acentem_takipte --module acentem_takipte.tests.test_commission_balances
```
Expected: both tests pass

- [ ] **Step 5: Commit**

```bash
git add acentem_takipte/acentem_takipte/domains/commissions/services/balance.py acentem_takipte/acentem_takipte/tests/test_commission_balances.py
git commit -m "feat: add commission entity detail service"
```

---

### Task 4: Backend — API endpoints with failing test

**Files:**
- Create: `acentem_takipte/acentem_takipte/domains/commissions/api/endpoints.py`
- Create: `acentem_takipte/acentem_takipte/tests/test_commission_balances.py` (extend)

- [ ] **Step 1: Write failing test**

Add to `test_commission_balances.py`:

```python
class TestCommissionEndpoints(FrappeTestCase):
    def test_get_balances_endpoint(self):
        from acentem_takipte.acentem_takipte.domains.commissions.api.endpoints import (
            get_commission_balances,
        )
        result = get_commission_balances()
        assert "summary" in result
        assert "entities" in result
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bench --site at.localhost run-tests --app acentem_takipte --module acentem_takipte.tests.test_commission_balances
```
Expected: `ModuleNotFoundError`

- [ ] **Step 3: Create endpoints.py**

Create `acentem_takipte/acentem_takipte/domains/commissions/api/endpoints.py`:

```python
from __future__ import annotations

import frappe
from frappe.utils import cint

from acentem_takipte.acentem_takipte.platform.api.security import (
    assert_authenticated,
    assert_doctype_permission,
)
from acentem_takipte.acentem_takipte.domains.commissions.services.balance import (
    compute_commission_balances,
    compute_entity_detail,
)


@frappe.whitelist()
def get_commission_balances(
    office_branch: str | None = None,
    aging_bucket: str = "all",
    limit: int = 100,
) -> dict:
    assert_authenticated()
    assert_doctype_permission(
        "AT Policy",
        "read",
        "You do not have permission to view commission balances.",
    )
    assert_doctype_permission(
        "AT Payment",
        "read",
        "You do not have permission to view commission balances.",
    )
    return compute_commission_balances(
        office_branch=office_branch,
        aging_bucket=aging_bucket,
        limit=max(cint(limit), 1),
    )


@frappe.whitelist()
def get_commission_entity_detail(
    entity_name: str,
    limit: int = 50,
) -> dict:
    assert_authenticated()
    assert_doctype_permission(
        "AT Policy",
        "read",
        "You do not have permission to view commission details.",
    )
    return compute_entity_detail(entity_name, limit=max(cint(limit), 1))
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bench --site at.localhost run-tests --app acentem_takipte --module acentem_takipte.tests.test_commission_balances
```
Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add acentem_takipte/acentem_takipte/domains/commissions/api/endpoints.py acentem_takipte/acentem_takipte/tests/test_commission_balances.py
git commit -m "feat: add commission balance API endpoints"
```

---

### Task 5: Frontend — Translations + composables scaffold

**Files:**
- Create: `frontend/src/domains/commissions/i18n/translations.js`
- Create: `frontend/src/composables/useCommissionBalances.js`
- Create: `frontend/src/composables/useCommissionEntityDetail.js`

- [ ] **Step 1: Create translations**

Create `frontend/src/domains/commissions/i18n/translations.js`:

```js
export const COMMISSION_TRANSLATIONS = {
  tr: {
    commissions: "Komisyon",
    subtitle: "Satış birimi bazında komisyon takip ve tahsilat ekranı",
    total_accrued: "Toplam Tahakkuk",
    total_paid: "Toplam Ödenen",
    total_remaining: "Kalan Bakiye",
    entity_type: "Birim Türü",
    accrued: "Tahakkuk",
    paid: "Ödenen",
    remaining: "Kalan",
    policy_count: "Poliçe Sayısı",
    aging_current: "Güncel",
    aging_1_30: "1-30 Gün",
    aging_31_60: "31-60 Gün",
    aging_61_90: "61-90 Gün",
    aging_90_plus: "90+ Gün",
    view_details: "Detayı Gör",
    accrued_policies: "Tahakkuk Eden Poliçeler",
    payment_history: "Ödeme Geçmişi",
    commission_distribution: "Komisyon Dağılımı",
    total_commission: "Toplam Komisyon",
    load_error: "Komisyon verileri yüklenemedi",
    no_commissions: "Henüz komisyon kaydı bulunamadı",
    no_commissions_desc: "Ofis şube ve yaşlandırma filtrelerini değiştirin",
    all: "Hepsi",
    office_branch: "Ofis Şubesi",
    aging_filter: "Yaşlandırma",
    percent_paid: "Ödendi",
  },
  en: {
    commissions: "Commissions",
    subtitle: "Commission tracking and collection by sales entity",
    total_accrued: "Total Accrued",
    total_paid: "Total Paid",
    total_remaining: "Remaining Balance",
    entity_type: "Entity Type",
    accrued: "Accrued",
    paid: "Paid",
    remaining: "Remaining",
    policy_count: "Policy Count",
    aging_current: "Current",
    aging_1_30: "1-30 Days",
    aging_31_60: "31-60 Days",
    aging_61_90: "61-90 Days",
    aging_90_plus: "90+ Days",
    view_details: "View Details",
    accrued_policies: "Accrued Policies",
    payment_history: "Payment History",
    commission_distribution: "Commission Distribution",
    total_commission: "Total Commission",
    load_error: "Failed to load commission data",
    no_commissions: "No commission records yet",
    no_commissions_desc: "Try adjusting office branch or aging filters",
    all: "All",
    office_branch: "Office Branch",
    aging_filter: "Aging",
    percent_paid: "Paid",
  },
};
```

- [ ] **Step 2: Create useCommissionBalances composable**

Create `frontend/src/composables/useCommissionBalances.js`:

```js
import { computed, reactive, ref } from "vue";
import { createResource } from "frappe-ui";

export function useCommissionBalances({ t }) {
  const filters = reactive({
    office_branch: "",
    aging_bucket: "all",
  });

  const resource = createResource({
    url: "acentem_takipte.acentem_takipte.domains.commissions.api.endpoints.get_commission_balances",
    auto: false,
  });

  const loading = computed(() => Boolean(unref(resource.loading)));
  const error = ref("");
  const summary = computed(() => unref(resource.data)?.summary || {});
  const entities = computed(() => unref(resource.data)?.entities || []);

  async function reload() {
    error.value = "";
    try {
      const params = {};
      if (filters.office_branch) params.office_branch = filters.office_branch;
      if (filters.aging_bucket !== "all") params.aging_bucket = filters.aging_bucket;
      await resource.reload(params);
    } catch {
      error.value = t("load_error");
    }
  }

  return { filters, loading, error, summary, entities, reload };
}
```

- [ ] **Step 3: Create useCommissionEntityDetail composable**

Create `frontend/src/composables/useCommissionEntityDetail.js`:

```js
import { computed, reactive, ref } from "vue";
import { createResource } from "frappe-ui";

export function useCommissionEntityDetail({ t }) {
  const entityName = ref("");
  const resource = createResource({
    url: "acentem_takipte.acentem_takipte.domains.commissions.api.endpoints.get_commission_entity_detail",
    auto: false,
  });

  const loading = computed(() => Boolean(unref(resource.loading)));
  const error = ref("");
  const entity = computed(() => unref(resource.data)?.entity || null);
  const accruedPolicies = computed(() => unref(resource.data)?.accrued_policies || []);
  const payments = computed(() => unref(resource.data)?.payments || []);

  async function reload(name) {
    entityName.value = name;
    error.value = "";
    try {
      await resource.reload({ entity_name: name });
    } catch {
      error.value = t("load_error");
    }
  }

  return { loading, error, entity, accruedPolicies, payments, reload };
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/domains/commissions/i18n/translations.js frontend/src/composables/useCommissionBalances.js frontend/src/composables/useCommissionEntityDetail.js
git commit -m "feat: add commission translations and composables"
```

---

### Task 6: Frontend — CommissionBalances page with failing test

**Files:**
- Create: `frontend/src/domains/commissions/pages/CommissionBalances.vue`
- Create: `frontend/src/domains/commissions/pages/CommissionBalances.test.js`

- [ ] **Step 1: Write failing test**

Create `frontend/src/domains/commissions/pages/CommissionBalances.test.js`:

```js
import { mount } from "@vue/test-utils";
import { describe, it, expect, beforeEach } from "vitest";

import CommissionBalances from "./CommissionBalances.vue";

const createStore = () => ({
  authStore: {
    locale: "tr",
  },
});

function makeWrapper() {
  return mount(CommissionBalances, {
    global: {
      mocks: createStore(),
      stubs: {
        WorkbenchPageLayout: { template: "<div><slot /></div>" },
        SkeletonLoader: true,
        ListTable: { template: "<table></table>" },
        FieldGroup: { template: "<div></div>" },
        SectionPanel: { template: "<div><slot /></div>" },
        MiniFactList: { template: "<div></div>" },
        MetaListCard: { template: "<div><slot /></div>" },
        SaaSMetricCard: { template: "<div></div>" },
        FeatherIcon: true,
      },
    },
  });
}

describe("CommissionBalances", () => {
  it("renders title", () => {
    const wrapper = makeWrapper();
    expect(wrapper.text()).toContain("Komisyon");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/domains/commissions/pages/CommissionBalances.test.js
```
Expected: FAIL

- [ ] **Step 3: Create CommissionBalances.vue**

Create `frontend/src/domains/commissions/pages/CommissionBalances.vue`:

```vue
<template>
  <WorkbenchPageLayout
    :breadcrumb="t('commissions')"
    :title="t('commissions')"
    :subtitle="t('subtitle')"
  >
    <!-- Filter Bar -->
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <select v-model="filters.office_branch" class="h-9 px-3 rounded-lg border border-slate-200 text-sm" @change="reload">
        <option value="">{{ t("office_branch") }}: {{ t("all") }}</option>
        <option v-for="b in branchOptions" :key="b.name" :value="b.name">{{ b.label }}</option>
      </select>
      <div class="flex gap-1">
        <button
          v-for="bucket in agingOptions"
          :key="bucket.value"
          type="button"
          :class="[
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            filters.aging_bucket === bucket.value
              ? 'bg-brand-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          ]"
          @click="filters.aging_bucket = bucket.value; reload()"
        >
          {{ t(bucket.label) }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SkeletonLoader v-for="i in 6" :key="i" type="card" />
    </div>

    <!-- Error -->
    <div v-else-if="error" class="text-center py-12">
      <p class="text-slate-500">{{ error }}</p>
      <button class="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg" @click="reload">{{ t("retry") }}</button>
    </div>

    <!-- Empty -->
    <div v-else-if="!entities.length" class="text-center py-12">
      <p class="text-slate-400 font-medium">{{ t("no_commissions") }}</p>
      <p class="text-slate-400 text-sm mt-1">{{ t("no_commissions_desc") }}</p>
    </div>

    <!-- Data -->
    <template v-else>
      <!-- Summary Bar -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="rounded-xl border border-slate-200 p-4 bg-white">
          <p class="text-xs text-slate-400">{{ t("total_accrued") }}</p>
          <p class="text-2xl font-bold text-slate-900 mt-1">{{ formatTry(summary.total_accrued_try) }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 p-4 bg-white">
          <p class="text-xs text-slate-400">{{ t("total_paid") }}</p>
          <p class="text-2xl font-bold text-emerald-600 mt-1">{{ formatTry(summary.total_paid_try) }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 p-4 bg-white">
          <p class="text-xs text-slate-400">{{ t("total_remaining") }}</p>
          <p class="text-2xl font-bold text-brand-600 mt-1">{{ formatTry(summary.total_remaining_try) }}</p>
        </div>
      </div>

      <!-- Entity Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="entity in entities"
          :key="entity.entity_name"
          class="rounded-xl border border-slate-200 p-5 bg-white"
        >
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="font-semibold text-slate-900">{{ entity.entity_name }}</h3>
              <p class="text-xs text-slate-400 mt-0.5">{{ entity.office_branch }}</p>
            </div>
            <span class="px-2 py-0.5 rounded text-xs font-medium bg-brand-50 text-brand-700">{{ entity.entity_type }}</span>
          </div>

          <div class="space-y-1.5 mb-3">
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">{{ t("accrued") }}</span>
              <span class="font-semibold">{{ formatTry(entity.accrued_try) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">{{ t("paid") }}</span>
              <span class="font-semibold text-emerald-600">{{ formatTry(entity.paid_try) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">{{ t("remaining") }}</span>
              <span class="font-semibold text-brand-600">{{ formatTry(entity.remaining_try) }}</span>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="w-full h-1.5 rounded-full bg-slate-100 mb-3">
            <div
              class="h-full rounded-full transition-all"
              :class="progressClass(entity.accrued_try, entity.paid_try)"
              :style="{ width: progressPct(entity.accrued_try, entity.paid_try) + '%' }"
            />
          </div>

          <!-- Aging -->
          <div v-if="hasAging(entity)" class="flex flex-wrap gap-1 mb-3">
            <span v-if="entity.aging.current" class="text-[11px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-600">{{ t("aging_current") }}: {{ formatTry(entity.aging.current) }}</span>
            <span v-if="entity.aging['1_30']" class="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">{{ t("aging_1_30") }}: {{ formatTry(entity.aging['1_30']) }}</span>
            <span v-if="entity.aging['31_60']" class="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">{{ t("aging_31_60") }}: {{ formatTry(entity.aging['31_60']) }}</span>
            <span v-if="entity.aging['61_90']" class="text-[11px] px-1.5 py-0.5 rounded bg-red-50 text-red-700">{{ t("aging_61_90") }}: {{ formatTry(entity.aging['61_90']) }}</span>
            <span v-if="entity.aging['90_plus']" class="text-[11px] px-1.5 py-0.5 rounded bg-red-50 text-red-700">{{ t("aging_90_plus") }}: {{ formatTry(entity.aging['90_plus']) }}</span>
          </div>

          <button
            class="w-full text-center text-sm text-brand-600 hover:text-brand-700 font-medium py-1.5 border border-brand-200 rounded-lg transition-colors"
            @click="toggleDetail(entity.entity_name)"
          >
            {{ expandedEntity === entity.entity_name ? t("view_details") + " ▲" : t("view_details") + " ▼" }}
          </button>

          <!-- Drilldown -->
          <div v-if="expandedEntity === entity.entity_name" class="mt-3 pt-3 border-t border-slate-100">
            <div v-if="detailLoading" class="py-4 text-center">
              <SkeletonLoader type="card" />
            </div>
            <div v-else class="space-y-3">
              <div v-if="detailPolicies.length">
                <h4 class="text-xs font-semibold text-slate-500 uppercase mb-1.5">{{ t("accrued_policies") }}</h4>
                <div class="space-y-1">
                  <div
                    v-for="p in detailPolicies"
                    :key="p.policy_name"
                    class="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-slate-50 hover:bg-slate-100 cursor-pointer"
                    @click="openPolicy(p.policy_name)"
                  >
                    <span class="font-medium">{{ p.policy_no }}</span>
                    <span class="text-slate-500">{{ p.customer_name }}</span>
                    <span class="font-semibold">{{ formatTry(p.commission_amount_try) }}</span>
                    <span class="text-slate-400">{{ p.aging_days }}g</span>
                  </div>
                </div>
              </div>
              <div v-if="detailPayments.length">
                <h4 class="text-xs font-semibold text-slate-500 uppercase mb-1.5">{{ t("payment_history") }}</h4>
                <div class="space-y-1">
                  <div
                    v-for="p in detailPayments"
                    :key="p.name"
                    class="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-slate-50"
                  >
                    <span class="font-medium">{{ p.payment_no }}</span>
                    <span class="text-slate-500">{{ formatDate(p.payment_date) }}</span>
                    <span class="font-semibold">{{ formatTry(p.amount_try) }}</span>
                    <span class="text-slate-400">{{ p.reference_no }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../../stores/auth";
import { useCommissionBalances } from "../../../composables/useCommissionBalances";
import { useCommissionEntityDetail } from "../../../composables/useCommissionEntityDetail";
import { COMMISSION_TRANSLATIONS } from "../i18n/translations";
import { useAtFormatting } from "../../../composables/useAtFormatting";
import WorkbenchPageLayout from "../../../components/app-shell/WorkbenchPageLayout.vue";
import SkeletonLoader from "../../../components/ui/SkeletonLoader.vue";

const props = defineProps({});
const authStore = useAuthStore();
const router = useRouter();

const activeLocale = computed(() => (String(authStore.locale || "tr").toLowerCase().startsWith("tr") ? "tr" : "en"));
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));

function t(key) {
  return COMMISSION_TRANSLATIONS[activeLocale.value]?.[key] || COMMISSION_TRANSLATIONS.en?.[key] || key;
}

const { formatCurrency: formatTry, formatDate } = useAtFormatting(computed(() => activeLocale.value));

const { filters, loading, error, summary, entities, reload } = useCommissionBalances({ t });
const { loading: detailLoading, entity: detailEntity, accruedPolicies: detailPolicies, payments: detailPayments, reload: reloadDetail } = useCommissionEntityDetail({ t });

const expandedEntity = ref(null);

const branchOptions = computed(() => {
  // Will be populated from branchStore if needed
  return [];
});

const agingOptions = [
  { value: "all", label: "all" },
  { value: "current", label: "aging_current" },
  { value: "1_30", label: "aging_1_30" },
  { value: "31_60", label: "aging_31_60" },
  { value: "61_90", label: "aging_61_90" },
  { value: "90_plus", label: "aging_90_plus" },
];

function progressPct(accrued, paid) {
  if (!accrued || accrued <= 0) return 0;
  return Math.min(100, Math.round((paid / accrued) * 100));
}

function progressClass(accrued, paid) {
  const pct = progressPct(accrued, paid);
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function hasAging(entity) {
  const a = entity.aging || {};
  return Object.values(a).some((v) => v > 0);
}

function toggleDetail(entityName) {
  if (expandedEntity.value === entityName) {
    expandedEntity.value = null;
  } else {
    expandedEntity.value = entityName;
    reloadDetail(entityName);
  }
}

function openPolicy(policyName) {
  router.push({ name: "policy-detail", params: { name: policyName } });
}

reload();
</script>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/domains/commissions/pages/CommissionBalances.test.js
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/domains/commissions/pages/CommissionBalances.vue frontend/src/domains/commissions/pages/CommissionBalances.test.js
git commit -m "feat: add commission balances page with cards and drilldown"
```

---

### Task 7: Frontend — Router, sidebar, navigation

**Files:**
- Modify: `frontend/src/router/index.js`
- Modify: `frontend/src/platform/router/index.js`
- Modify: `frontend/src/platform/i18n/sidebar.js`

- [ ] **Step 1: Add route to src/router/index.js**

Add to the routes array:

```js
{
  path: "/commissions",
  name: "commissions",
  component: () => import("@/domains/commissions/pages/CommissionBalances.vue"),
  meta: { title: "Commissions" },
},
```

- [ ] **Step 2: Add same route to platform/router/index.js**

Find the matching route table and add the same entry.

- [ ] **Step 3: Add sidebar entry to platform/i18n/sidebar.js**

Add to the TR section:
```js
commissions: "Komisyon",
```

Add to the EN section:
```js
commissions: "Commissions",
```

- [ ] **Step 4: Run router tests**

```bash
cd frontend && npx vitest run src/router/index.test.js
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/router/index.js frontend/src/platform/router/index.js frontend/src/platform/i18n/sidebar.js
git commit -m "feat: add /at/commissions route and sidebar entry"
```

---

### Task 8: Frontend — Policy Detail commission distribution panel

**Files:**
- Modify: `frontend/src/composables/usePolicyDetailRuntime.js`
- Modify: `frontend/src/domains/policies/pages/PolicyDetail.vue`

- [ ] **Step 1: Expose formatted commission distribution in usePolicyDetailRuntime**

Add to the return object of `usePolicyDetailRuntime`:

```js
const commissionDistribution = computed(() => {
  const dist = policy.value.commission_distribution;
  if (!dist || dist === "[]") return [];
  try {
    const entries = typeof dist === "string" ? JSON.parse(dist) : dist;
    if (!Array.isArray(entries)) return [];
    return entries.map((entry) => ({
      ...entry,
      entity_label: getLinkLabel(entry.entity) || entry.entity_name || entry.entity,
      amount_try_formatted: formatTry(entry.amount_try),
    }));
  } catch {
    return [];
  }
});
```

Add to the return object:
```js
commissionDistribution,
```

- [ ] **Step 2: Add SectionPanel to PolicyDetail.vue**

Add after the existing premium fields section:

```vue
<SectionPanel :title="t('commissionDistribution')">
  <div v-if="!commissionDistribution.length" class="text-slate-400 text-sm py-2">
    {{ t("noDistribution") }}
  </div>
  <div v-else class="space-y-2">
    <div
      v-for="entry in commissionDistribution"
      :key="entry.entity"
      class="flex items-center gap-3"
      :style="{ paddingLeft: (entry.level * 16) + 'px' }"
    >
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-slate-900">{{ entry.entity_label }}</p>
        <p class="text-xs text-slate-400">{{ t("share") }}: %{{ entry.share_pct }}</p>
      </div>
      <div class="text-right">
        <p class="text-sm font-semibold text-slate-900">{{ entry.amount_try_formatted }}</p>
      </div>
      <div class="w-24 h-1.5 rounded-full bg-slate-100">
        <div
          class="h-full rounded-full bg-brand-500"
          :style="{ width: barPct(entry.amount_try) + '%' }"
        />
      </div>
    </div>
    <div class="pt-2 border-t border-slate-100 flex justify-between items-center">
      <span class="text-sm font-semibold">{{ t("total_commission") }}</span>
      <span class="text-sm font-bold text-brand-600">{{ formatTry(policy.commission_amount) }}</span>
    </div>
  </div>
</SectionPanel>
```

- [ ] **Step 3: Add barPct helper to usePolicyDetailRuntime or PolicyDetail.vue**

In PolicyDetail.vue script section:

```js
function barPct(amount) {
  const total = policy.value.commission_amount || 0;
  if (!total) return 0;
  return Math.min(100, Math.round((amount / total) * 100));
}
```

- [ ] **Step 4: Build**

```bash
cd frontend && npm run build
```
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add frontend/src/composables/usePolicyDetailRuntime.js frontend/src/domains/policies/pages/PolicyDetail.vue
git commit -m "feat: add commission distribution tree panel to policy detail"
```

---

### Task 9: Final validation — build, lint, full test suite

**Files:**
- All modified files

- [ ] **Step 1: Run linter**

```bash
cd frontend && npm run lint
```
Expected: No errors

- [ ] **Step 2: Build production assets**

```bash
cd frontend && npm run build
```
Expected: Build succeeds

- [ ] **Step 3: Run full frontend test suite**

```bash
cd frontend && npm run test:unit
```
Expected: 94/94 passed

- [ ] **Step 4: Run backend tests**

```bash
bench --site at.localhost run-tests --app acentem_takipte --module acentem_takipte.tests.test_commission_balances
```
Expected: All tests pass

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: commission tracking system complete"
git push
```

---

## Self-Review

### Spec coverage

| Spec section | Task |
|---|---|
| Backend API `get_commission_balances` | Task 2 |
| Backend API `get_commission_entity_detail` | Task 3 |
| Backend endpoints with permissions | Task 4 |
| Frontend translations | Task 5 |
| Frontend composables | Task 5 |
| CommissionBalances page | Task 6 |
| Route + sidebar | Task 7 |
| Policy Detail commission panel | Task 8 |
| Tests (backend + frontend) | Tasks 2, 3, 4, 6 |
| Build validation | Task 9 |

### Placeholder scan

- No TBD/TODO/fill-in placeholders found.
- All code blocks contain complete, runnable code.
- All file paths are exact and absolute.

### Type consistency

- `commission_distribution` JSON schema matches `at_policy.py:417` — `[{entity, entity_name, level, share_pct, amount, amount_try, status}]`
- `aging_bucket` values match `runtime.py` constant: `current`, `1_30`, `31_60`, `61_90`, `90_plus`
- `COMMISSION_DUE_DAYS = 30` is imported from existing `runtime.py` (line 17)
- `resolve_commission_amount` fallback is documented (mirrors `accounting.py:299-301`)
- `useLinkLabelCache` from previous session is used in PolicyDetail panel for entity name resolution
