# Komisyon Dagilim Sistemi — Uygulama Plani

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sigorta acentesi komisyon dagilim modelini head office merkezli olarak yeniden yapilandirmak, sales entity hierarchy ile office branch baglantisini guclendirmek.

**Architecture:** Head office merkezli komisyon dagilimi. Her entity orijinal tutar uzerinden kendi payini alir. Root entity her zaman kalan tum komisyonu alir. Toplam her zaman %100 olur.

**Tech Stack:** Python (Frappe backend), Vue 3 (frontend), Frappe DocType system

**Spec:** `docs/superpowers/specs/2026-07-30-commission-distribution-redesign.md`

---

## File Structure

| Dosya | Sorumluluk |
|-------|-----------|
| `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py` | `_build_commission_distribution()` fonksiyonu |
| `acentem_takipte/acentem_takipte/doctype/at_sales_entity/at_sales_entity.json` | Field aciklamalari |
| `acentem_takipte/acentem_takipte/domains/commissions/services/balance.py` | Yeni JSON yapısina gore bakiye hesaplama |
| `acentem_takipte/acentem_takipte/scripts/recalc_commission_dist.py` | Migration scripti |
| `acentem_takipte/acentem_takipte/tests/test_commission_balances.py` | Yeni algoritmayla testler |
| `frontend/src/composables/usePolicyDetailRuntime.js` | commissionDistribution computed |
| `frontend/src/domains/policies/pages/PolicyDetail.vue` | Komisyon dagilimi tablosu |
| `frontend/src/domains/commissions/pages/CommissionBalances.vue` | Metric'ler ve toplam gorunumu |
| `frontend/src/config/policy_translations.js` | TR/EN translation key'leri |
| `frontend/src/domains/commissions/i18n/translations.js` | TR/EN translation key'leri |

---

## Task 1: Backend Algoritma Degisikligi

**Files:**
- Modify: `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py:421-492`
- Test: `acentem_takipte/acentem_takipte/tests/test_commission_balances.py`

- [ ] **Step 1: Mevcut testi calistir, basarili oldugunu dogrula**

```bash
bench --site at.localhost run-tests --app acentem_takipte --module acentem_takipte.acentem_takipte.tests.test_commission_balances
```

Beklenen: 23 test OK

- [ ] **Step 2: Yeni test yaz — head office merkezli dagilim**

`acentem_takipte/acentem_takipte/tests/test_commission_balances.py` dosyasina ekle:

```python
class TestHeadOfficeDistribution(FrappeTestCase):
    @patch("frappe.db.get_value")
    def test_head_office_centric_distribution(self, mock_db_get_value):
        """Her entity orijinal tutar uzerinden payini alir, root kalanini alir."""
        from acentem_takipte.acentem_takipte.doctype.at_policy.at_policy import (
            _build_commission_distribution,
        )

        def db_get_value_side_effect(doctype, name, fields=None, **kw):
            entities = {
                "ENTITY-REPRESENTATIVE": {"commission_share_pct": 15, "full_name": "Temsilci Ali", "parent_entity": "ENTITY-TEAM", "is_root": 0},
                "ENTITY-TEAM": {"commission_share_pct": 15, "full_name": "Ekip Alpha", "parent_entity": "ENTITY-BRANCH", "is_root": 0},
                "ENTITY-BRANCH": {"commission_share_pct": 30, "full_name": "Istanbul Subesi", "parent_entity": "ENTITY-HO", "is_root": 0},
                "ENTITY-HO": {"commission_share_pct": 40, "full_name": "Kip Sigorta", "parent_entity": None, "is_root": 1},
            }
            return entities.get(name, {})

        mock_db_get_value.side_effect = db_get_value_side_effect

        result = _build_commission_distribution("ENTITY-REPRESENTATIVE", 1000, 1)
        import json
        dist = json.loads(result)

        assert len(dist) == 4
        assert dist[0]["amount"] == 150  # Temsilci: 1000 * 15%
        assert dist[1]["amount"] == 150  # Ekip: 1000 * 15%
        assert dist[2]["amount"] == 300  # Sube: 1000 * 30%
        assert dist[3]["amount"] == 400  # Root: kalan
        total = sum(e["amount"] for e in dist)
        assert total == 1000
```

- [ ] **Step 3: Testi calistir, basarisiz oldugunu dogrula**

```bash
bench --site at.localhost run-tests --app acentem_takipte --module acentem_takipte.acentem_takipte.tests.test_commission_balances::TestHeadOfficeDistribution
```

Beklenen: FAIL (yeni algoritma henuz uygulanmadi)

- [ ] **Step 4: `_build_commission_distribution()` fonksiyonunu guncelle**

`acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py` dosyasinda `_build_commission_distribution` fonksiyonunu degistir:

```python
def _build_commission_distribution(
    sales_entity: str | None,
    commission_amount: float,
    fx_rate: float,
) -> str:
    """Build a head-office-centric commission distribution.

    Each entity retains commission_share_pct% of the ORIGINAL commission amount.
    The root entity absorbs all remaining commission.

    Example: Commission = 1000 TL, Rep(15%) -> Team(15%) -> Branch(30%) -> HO(root, 40%):
      - Rep:   1000 * 15% = 150
      - Team:  1000 * 15% = 150
      - Branch: 1000 * 30% = 300
      - HO:    1000 * 40% = 400 (root, absorbs remainder)
      Total: 150 + 150 + 300 + 400 = 1000

    Returns a JSON array of {entity, entity_name, level, share_pct, amount, amount_try, status}.
    Returns "[]" if commission <= 0 or no sales_entity."""
    commission = flt(commission_amount)
    fx = flt(fx_rate) or 1
    if commission <= 0 or not sales_entity:
        return "[]"
    entries: list[dict] = []
    remaining = commission
    level = 0
    current_entity: str | None = sales_entity
    visited: set[str] = set()
    while current_entity and current_entity not in visited:
        visited.add(current_entity)
        entity_data = frappe.db.get_value(
            "AT Sales Entity",
            current_entity,
            ["commission_share_pct", "full_name", "parent_entity", "is_root"],
            as_dict=True,
        ) or {}
        share_pct = flt(entity_data.get("commission_share_pct") or 0)
        is_root = entity_data.get("is_root")
        if is_root:
            entry_amount = remaining
            remaining = 0.0
        else:
            entry_amount = round(commission * share_pct / 100, 2)
            remaining = round(remaining - entry_amount, 2)
        entry_amount_try = round(entry_amount * fx, 2)
        entity_name = entity_data.get("full_name") or current_entity
        entries.append({
            "entity": current_entity,
            "entity_name": entity_name,
            "level": level,
            "share_pct": share_pct,
            "amount": entry_amount,
            "amount_try": entry_amount_try,
            "status": "Accrued",
        })
        if remaining <= 0.01:
            break
        current_entity = entity_data.get("parent_entity")
        level += 1
        if level > 20:
            break
    return json.dumps(entries)
```

- [ ] **Step 5: Testi calistir, basarili oldugunu dogrula**

```bash
bench --site at.localhost run-tests --app acentem_takipte --module acentem_takipte.acentem_takipte.tests.test_commission_balances::TestHeadOfficeDistribution
```

Beklenen: 1 test OK

- [ ] **Step 6: Tum testleri calistir**

```bash
bench --site at.localhost run-tests --app acentem_takipte --module acentem_takipte.acentem_takipte.tests.test_commission_balances
```

Beklenen: Tum testler OK

- [ ] **Step 7: Commit**

```bash
git add acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py acentem_takipte/acentem_takipte/tests/test_commission_balances.py
git commit -m "refactor: head office centric commission distribution algorithm"
```

---

## Task 2: Root Entity Kurali Duzeltmesi

**Files:**
- Modify: `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py:421-492`
- Test: `acentem_takipte/acentem_takipte/tests/test_commission_balances.py`

- [ ] **Step 1: Root entity her zaman kalanini alir testi yaz**

`acentem_takipte/acentem_takipte/tests/test_commission_balances.py` dosyasina ekle:

```python
    @patch("frappe.db.get_value")
    def test_root_always_gets_remainder(self, mock_db_get_value):
        """Root entity share_pct'ye bakmaksizin kalan tum komisyonu alir."""
        from acentem_takipte.acentem_takipte.doctype.at_policy.at_policy import (
            _build_commission_distribution,
        )

        def db_get_value_side_effect(doctype, name, fields=None, **kw):
            entities = {
                "REP": {"commission_share_pct": 60, "full_name": "Temsilci", "parent_entity": "ROOT", "is_root": 0},
                "ROOT": {"commission_share_pct": 50, "full_name": "Root Entity", "parent_entity": None, "is_root": 1},
            }
            return entities.get(name, {})

        mock_db_get_value.side_effect = db_get_value_side_effect

        result = _build_commission_distribution("REP", 1000, 1)
        import json
        dist = json.loads(result)

        assert dist[0]["amount"] == 600  # Temsilci: 1000 * 60%
        assert dist[1]["amount"] == 400  # Root: kalan (50% share_pct'ye bakilmaksizin)
        total = sum(e["amount"] for e in dist)
        assert total == 1000
```

- [ ] **Step 2: Testi calistir, basarili oldugunu dogrula**

```bash
bench --site at.localhost run-tests --app acentem_takipte --module acentem_takipte.acentem_takipte.tests.test_commission_balances::TestHeadOfficeDistribution::test_root_always_gets_remainder
```

Beklenen: PASS

- [ ] **Step 3: Commit**

```bash
git add acentem_takipte/acentem_takipte/tests/test_commission_balances.py
git commit -m "test: root entity always gets remainder regardless of share_pct"
```

---

## Task 3: Migration Scripti

**Files:**
- Modify: `acentem_takipte/acentem_takipte/scripts/recalc_commission_dist.py`
- Run: migration

- [ ] **Step 1: Migration scriptini guncelle**

`acentem_takipte/acentem_takipte/scripts/recalc_commission_dist.py` dosyasini guncelle:

```python
import frappe
import json
from frappe.utils import flt

def execute():
    """Recalculate commission_distribution for all policies with head-office-centric algorithm."""
    def recalc(sales_entity, commission_amount, fx_rate):
        commission = flt(commission_amount)
        fx = flt(fx_rate) or 1
        if commission <= 0 or not sales_entity:
            return "[]"
        entries = []
        remaining = commission
        level = 0
        current_entity = sales_entity
        visited = set()
        while current_entity and current_entity not in visited:
            visited.add(current_entity)
            ed = frappe.db.get_value("AT Sales Entity", current_entity,
                ["commission_share_pct", "full_name", "parent_entity", "is_root"],
                as_dict=True) or {}
            pct = flt(ed.get("commission_share_pct") or 0)
            is_root = ed.get("is_root")
            if is_root:
                amt = remaining
                remaining = 0.0
            else:
                amt = round(commission * pct / 100, 2)
                remaining = round(remaining - amt, 2)
            entries.append({
                "entity": current_entity,
                "entity_name": ed.get("full_name") or current_entity,
                "level": level,
                "share_pct": pct,
                "amount": round(amt, 2),
                "amount_try": round(amt * fx, 2),
                "status": "Accrued",
            })
            if remaining <= 0.01:
                break
            current_entity = ed.get("parent_entity")
            level += 1
            if level > 20:
                break
        return json.dumps(entries)

    policies = frappe.get_all("AT Policy",
        filters={"status": ["in", ["Active", "Record"]], "commission_amount": [">", 0]},
        fields=["name", "sales_entity", "commission_amount", "fx_rate", "commission_distribution"],
        limit_page_length=0)
    updated = 0
    for p in policies:
        old = p.get("commission_distribution") or "[]"
        new = recalc(p.get("sales_entity"), p.get("commission_amount"), p.get("fx_rate"))
        if old != new:
            frappe.db.set_value("AT Policy", p["name"], "commission_distribution", new)
            updated += 1
    frappe.db.commit()
    return {"updated": updated, "total": len(policies)}
```

- [ ] **Step 2: Migration'i calistir**

```bash
bench --site at.localhost execute acentem_takipte.acentem_takipte.scripts.recalc_commission_dist.execute
```

Beklenen: `{"updated": X, "total": Y}` (X = degisen politika sayisi)

- [ ] **Step 3: Sonuclari dogrula — ornek politika kontrolu**

```bash
bench --site at.localhost console
```

Icinde:
```python
import frappe, json
p = frappe.get_doc("AT Policy", "AT-POL-2026-000188")
d = json.loads(p.commission_distribution or "[]")
print("total:", p.commission_amount)
for e in d:
    print("  %s: %s (%s%%)" % (e["entity_name"], e["amount"], e["share_pct"]))
total = sum(e["amount"] for e in d)
print("sum:", total)
print("match:", abs(total - p.commission_amount) < 0.01)
```

Beklenen: Her entry dogru oranda, toplam eslesme

- [ ] **Step 4: Commit**

```bash
git add acentem_takipte/acentem_takipte/scripts/recalc_commission_dist.py
git commit -m "refactor: migration script for head-office-centric commission distribution"
```

---

## Task 4: Commission Balance Service Guncelleme

**Files:**
- Modify: `acentem_takipte/acentem_takipte/domains/commissions/services/balance.py`
- Test: `acentem_takipte/acentem_takipte/tests/test_commission_balances.py`

- [ ] **Step 1: balance.py'deki entity_ic_accrued mantigini kontrol et**

Mevcut kod zaten `amount_try` uzerinden calisiyor. Yeni JSON yapisiyla uyumlu mu kontrol et. Gerekirse guncelle.

- [ ] **Step 2: Testleri calistir**

```bash
bench --site at.localhost run-tests --app acentem_takipte --module acentem_takipte.acentem_takipte.tests.test_commission_balances
```

Beklenen: Tum testler OK

- [ ] **Step 3: Gerekirse guncelleme yap ve commit et**

---

## Task 5: Frontend — PolicyDetail Komisyon Tablosu

**Files:**
- Modify: `frontend/src/composables/usePolicyDetailRuntime.js:576-591`
- Modify: `frontend/src/domains/policies/pages/PolicyDetail.vue:83-104`
- Modify: `frontend/src/config/policy_translations.js`

- [ ] **Step 1: commissionDistribution computed'i guncelle**

`frontend/src/composables/usePolicyDetailRuntime.js` dosyasinda:

```javascript
const commissionDistribution = computed(() => {
  const raw = policy.value?.commission_distribution;
  if (!raw || raw === "[]") return [];
  try {
    const entries = typeof raw === "string" ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    return entries.map((entry) => ({
      ...entry,
      entity_label: getLinkLabel(entry.entity) || entry.entity_name || entry.entity,
      share_pct_formatted: `%${entry.share_pct}`,
      amount_formatted: formatCurrency(entry.amount, policy.value?.currency || "TRY"),
      status_translated: entry.status === "Accrued" ? t("status_accrued") : (entry.status || "Accrued"),
    }));
  } catch {
    return [];
  }
});
```

- [ ] **Step 2: commissionColumns guncelle**

`frontend/src/domains/policies/pages/PolicyDetail.vue` dosyasinda:

```javascript
const commissionColumns = computed(() => [
  { key: "level", label: t("level"), type: "text" },
  { key: "entity_label", label: t("sales_entity"), type: "text" },
  { key: "share_pct_formatted", label: t("sharePct"), type: "text" },
  { key: "amount_formatted", label: t("commission_amount"), type: "currency" },
  { key: "status_translated", label: t("status"), type: "text" },
]);
```

- [ ] **Step 3: Translation key'lerini guncelle**

`frontend/src/config/policy_translations.js` dosyasinda TR ve EN bolumlerine ekle:

```javascript
// TR
status_accrued: "Tahakkuk",
commission_distribution_empty: "Dağılım henüz hesaplanmadı",

// EN
status_accrued: "Accrued",
commission_distribution_empty: "Distribution not yet computed",
```

- [ ] **Step 4: Lint kontrolu**

```bash
cd frontend && npm run lint
```

Beklenen: 0 error, 0 warning

- [ ] **Step 5: Testleri calistir**

```bash
cd frontend && npm run test:unit
```

Beklenen: Tum testler OK

- [ ] **Step 6: Build**

```bash
cd frontend && npm run build
```

Beklenen: Temiz build

- [ ] **Step 7: Commit**

```bash
git add frontend/src/composables/usePolicyDetailRuntime.js frontend/src/domains/policies/pages/PolicyDetail.vue frontend/src/config/policy_translations.js
git commit -m "feat: update policy detail commission distribution table for new algorithm"
```

---

## Task 6: Frontend — CommissionBalances Metric'leri

**Files:**
- Modify: `frontend/src/domains/commissions/pages/CommissionBalances.vue`
- Modify: `frontend/src/domains/commissions/i18n/translations.js`

- [ ] **Step 1: Translation key'lerini guncelle**

`frontend/src/domains/commissions/i18n/translations.js` dosyasinda:

```javascript
// TR
shared_commission: "Paylaşılan Komisyon",
head_office_commission: "Ofis Komisyonu",

// EN
shared_commission: "Shared Commission",
head_office_commission: "Head Office Commission",
```

- [ ] **Step 2: Metric card'larini guncelle**

`frontend/src/domains/commissions/pages/CommissionBalances.vue` dosyasinda summary section'ini guncelle:

```vue
<template #metrics>
  <div v-if="loading" class="w-full grid grid-cols-1 gap-4 md:grid-cols-4">
    <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
  </div>
  <div v-else class="w-full grid grid-cols-1 gap-4 md:grid-cols-4">
    <SaaSMetricCard :label="t('total_accrued')" :value="formatCurrency(summary.total_accrued_try)" />
    <SaaSMetricCard :label="t('total_paid')" :value="formatCurrency(summary.total_paid_try)" value-class="text-at-green" />
    <SaaSMetricCard :label="t('total_remaining')" :value="formatCurrency(summary.total_remaining_try)" value-class="text-brand-600" />
    <SaaSMetricCard
      v-if="reconciliation.open_items > 0"
      :label="t('reconciliation_open')"
      :value="reconciliation.open_items"
      value-class="text-at-red"
    />
  </div>
</template>
```

- [ ] **Step 3: Lint ve test**

```bash
cd frontend && npm run lint && npm run test:unit
```

Beklenen: Temiz

- [ ] **Step 4: Build**

```bash
cd frontend && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/domains/commissions/pages/CommissionBalances.vue frontend/src/domains/commissions/i18n/translations.js
git commit -m "feat: update commission balances metrics for new distribution model"
```

---

## Task 7: Sales Entity DocType Guncelleme

**Files:**
- Modify: `acentem_takipte/acentem_takipte/doctype/at_sales_entity/at_sales_entity.json`

- [ ] **Step 1: Field aciklamalarini guncelle**

`acentem_takipte/acentem_takipte/doctype/at_sales_entity/at_sales_entity.json` dosyasinda `commission_share_pct` field'inin aciklamasini guncelle:

```json
{
  "default": "50",
  "fieldname": "commission_share_pct",
  "fieldtype": "Float",
  "label": "Commission Share %",
  "description": "Percentage of total commission this entity receives from head office. Root entity absorbs all remaining commission regardless of this value. Total of all shares must equal 100%."
}
```

- [ ] **Step 2: Commit**

```bash
git add acentem_takipte/acentem_takipte/doctype/at_sales_entity/at_sales_entity.json
git commit -m "docs: update commission_share_pct description for head-office-centric model"
```

---

## Task 8: Tum Testler ve Build

**Files:**
- Run: all tests

- [ ] **Step 1: Backend testleri**

```bash
bench --site at.localhost run-tests --app acentem_takipte --module acentem_takipte.acentem_takipte.tests.test_commission_balances
bench --site at.localhost run-tests --app acentem_takipte --module acentem_takipte.acentem_takipte.tests.test_commission_statement_import
```

Beklenen: Tum testler OK

- [ ] **Step 2: Frontend testleri**

```bash
cd frontend && npm run test:unit
```

Beklenen: Tum testler OK

- [ ] **Step 3: Lint ve typecheck**

```bash
cd frontend && npm run lint && npm run typecheck
```

Beklenen: Temiz

- [ ] **Step 4: Build**

```bash
cd frontend && npm run build
```

Beklenen: Temiz build

- [ ] **Step 5: Browser QA**

Tarayicida `/at/commissions` ve `/at/policies/AT-POL-2026-000188` sayfalarini kontrol et.

---

## Task 9: Final Commit

- [ ] **Step 1: Tum degisiklikleri topla**

```bash
git add -A
git status
```

- [ ] **Step 2: Final commit**

```bash
git commit -m "feat: head-office-centric commission distribution system

- Redesigned commission distribution to be head-office-centric
- Each entity gets share_pct of original commission amount
- Root entity always absorbs all remaining commission
- Updated backend algorithm, migration script, frontend tables
- Added comprehensive tests for new distribution model
- Updated translations for TR/EN"
```

---

## Dogrulama Kriterleri

- [ ] Tum politikalarda `sum(distribution.amount) == commission_amount`
- [ ] Her entity kendi share_pct'sine gore orijinal tutar uzerinden payini aliyor
- [ ] Root entity her zaman kalan tum komisyonu aliyor
- [ ] Head Office toplam komisyonu dogru takip ediliyor
- [ ] Sales Entity ve Office Branch baglantisi dogru
- [ ] Tum testler geciyor (backend + frontend)
- [ ] Build temiz
- [ ] Lint temiz
- [ ] Browser QA temiz
