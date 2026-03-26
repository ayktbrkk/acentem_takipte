# Acentem Tekne - Kapsamlı Teknik Denetim Raporu

> **Denetleyen:** Senior Software Architect & Security Specialist  
> **Tarih:** 2026-03-26  
> **Frappe v15** (CVE takibi dahil)  
> **Önceki denetim düzeltmeleri:** hooks.py konsolidasyonu, desktop.py, orphan patch temizliği tamamlandı.

---

## 1. Yönetici Özeti

| Metrik | Değer |
|--------|-------|
| **Genel Sağlık Skoru (1-10)** | **6/10** |
| **Kritik Güvenlik Riski** | **3** |
| **Kritik Performans Darboğazı** | **5** |
| **Orta Seviye İyileştirme** | **9** |
| **Uzun Vadeli Öneri** | **4** |

**En riskli alan:** `reporting.py` içindeki correlated subquery'ler (11 adet/satır) + `dashboard.py`'deki `limit_page_length=0` ile sınırsız sorgular. Binlerce poliçe durumunda hem CPU hem bellek patlar.

**Güvenlik özeti:** Frappe ORM kullanımı genel olarak iyi; ancak patch dosyalarında f-string SQL interpolasyonu ve 123 adet `ignore_permissions=True` kullanımı risk oluşturuyor.

**Mimari özeti:** Business logic tamamen server-side (harika), hooks yapısı temiz, ancak `quick_create.py` (1770 satır) ve `dashboard.py` (2394 satır) dosyaları çok şişkin.

---

## 2. Kritik Hatalar (Immediate Action)

### 2.1 Patch SQL Injection: f-string ile DDL identifier interpolasyonu

**Dosya:** `acentem_takipte/acentem_takipte/acentem_takipte/patches/v2026_03_14_policy_company_number_indexes.py`

**Satır 90:**
```python
frappe.db.sql(f'drop index if exists "{index_name}"')
```

**Satır 93:**
```python
rows = frappe.db.sql(f"show index from `{TABLE_NAME}`", as_dict=True)
```

**Satır 109:**
```python
frappe.db.sql(f"drop index `{index_name}` on `{TABLE_NAME}`")
```

**Risk:** `index_name` veritabanından geliyor (düşük olasılıkla manipüle edilebilir), ancak `TABLE_NAME` sabit. Patch dosyaları admin-controlled olsa da, `frappe.db.escape()` veya `_quote_ident()` kullanımı Frappe standartlarına uygun değildir. Frappe'in kendi `_rename_table` gibi fonksiyonları bile identifier quoting yapar.

**Çözüm:**
```python
# Önerilen
safe_table = TABLE_NAME  # hardcoded constant, safe
rows = frappe.db.sql("show index from `" + safe_table + "` where Key_name = %s", (index_name,), as_dict=True)
# veya Frappe pattern:
frappe.db.sql(f"drop index `{frappe.db.escape(index_name)}` on `{safe_table}`")
```

---

### 2.2 Raporlama: 11 correlated subquery ile O(N*M) sorgu patlaması

**Dosya:** `acentem_takipte/acentem_takipte/acentem_takipte/services/reporting.py`  
**Satırlar:** 406-505 (`get_agent_performance_report_rows`)

Her satır (sales entity) için 11 adet correlated subquery çalıştırılıyor:
- 5 adet `tabAT Offer` sorgusu (offer_count, accepted, converted, conversion_rate için 3 alt-sorgu)
- 6 adet `tabAT Renewal Task` sorgusu (task_count, completed, open, success_rate için 3 alt-sorgu)

**Etki:** 50 satır × 11 subquery = **550 SQL sorgusu** tek bir rapor isteğinde.

**Ek olarak satır 429'da:**
```sql
ifnull(o.converted_policy, '') != ''
```
Bu pattern indeks kullanımını engeller (fonksiyon uygulanmış sütun).

**Çözüm:** LEFT JOIN + GROUP BY ile tek sorguya indirgeme:
```sql
SELECT
    p.sales_entity,
    COUNT(DISTINCT p.name) as policy_count,
    COUNT(DISTINCT o.name) as offer_count,
    COUNT(DISTINCT CASE WHEN o.status = 'Accepted' THEN o.name END) as accepted_offer_count,
    COUNT(DISTINCT CASE WHEN o.converted_policy IS NOT NULL AND o.converted_policy != '' THEN o.name END) as converted_offer_count,
    COUNT(DISTINCT r.name) as renewal_task_count,
    COUNT(DISTINCT CASE WHEN r.status = 'Done' THEN r.name END) as completed_renewal_task_count
FROM `tabAT Policy` p
LEFT JOIN `tabAT Offer` o ON o.customer = p.customer AND o.offer_date BETWEEN ...
LEFT JOIN `tabAT Renewal Task` r ON r.policy = p.name AND r.renewal_date BETWEEN ...
WHERE ...
GROUP BY p.sales_entity
```

---

### 2.3 Dashboard: Sınırsız sorgu ile bellek patlaması riski

**Dosya:** `acentem_takipte/acentem_takipte/acentem_takipte/api/dashboard.py`

**Satır 1390-1401** (Her dashboard yüklenmesinde çalışır):
```python
payment_rows = frappe.get_all(
    "AT Payment",
    filters=_build_payment_filters(...),
    fields=["payment_direction", "status", "amount_try"],
    limit_page_length=0,  # SINIRSIZ - tüm ödemeleri çeker
)
```

**Satır 2123-2128** (Yenileme sekmesi):
```python
rows = frappe.get_list(
    "AT Renewal Task",
    fields=["status", "due_date", "renewal_date"],
    filters=filters,
    limit_page_length=0,  # SINIRSIZ
)
```

**Etki:** 10.000 poliçeli bir acentede bu sorgular on binlerce satır döndürebilir ve Python'da `sum()` ile toplama yaparken bellek tüketir.

**Çözüm:** SQL tarafında aggregation kullan:
```python
result = frappe.db.sql("""
    SELECT payment_direction, status, SUM(amount_try) as total
    FROM `tabAT Payment`
    WHERE ...
    GROUP BY payment_direction, status
""", values, as_dict=True)
```

---

### 2.4 ignore_permissions: 123 adet izin by-pass noktası

Tarama sonucunda **123 adet** `ignore_permissions=True` kullanımı bulundu. Kritik olanlar:

| Dosya | Satır | Context | Risk |
|-------|-------|---------|------|
| `accounting.py` | 510, 526 | `_close_open_items` - her reconciliation item'ı `save(ignore_permissions=True)` ile kapatır | **Yüksek** |
| `accounting.py` | 155, 157 | `sync_accounting_entry` - entry oluşturur | **Yüksek** |
| `services/break_glass.py` | 114 | `expire_stale` - per-record commit + ignore_permissions | **Orta** |
| `services/sales_entities.py` | 350-363 | `reassign_sales_entity_records_to_branch_pool` - toplu set_value | **Orta** |
| `services/quick_customer.py` | 65 | Hızlı müşteri oluşturma | **Kontrol edilmeli** |

**Risk:** Whitelisted API endpoint'leri bu service fonksiyonlarını çağırıyorsa, branch/scope izolasyonu atlanabilir.

**Öneri:** Her `ignore_permissions=True` kullanımına yorum satırı eklenmeli:
```python
# ignore_permissions: Background job / internal service call, permission checked at API entry point (create_quick_offer L:52)
offer_doc.insert(ignore_permissions=True)
```

---

### 2.5 Eksik form validate() handler'ları

Hiçbir client-side JS dosyasında `validate(frm)` handler'ı bulunamadı. Bu, form submit öncesi client-side doğrulama yapılmadığı anlamına gelir.

**Dosyalar:** `at_lead.js`, `at_offer.js`, `at_policy.js`, `at_customer.js`, `at_claim.js`, `at_payment.js`, `at_renewal_task.js`

**Etki:** Kullanıcı zorunlu alanları boş bırakıp submit ettiğinde sadece server-side validation çalışır, bu da network round-trip'e neden olur ve UX'i düşürür.

**Öneri (örnek):**
```javascript
// at_lead.js
frappe.ui.form.on("AT Lead", {
  validate(frm) {
    if (!frm.doc.first_name && !frm.doc.last_name) {
      frappe.validated = false;
      frappe.msgprint(__("En az bir ad veya soyad gerekli."));
    }
  }
});
```

---

## 3. Orta Seviye İyileştirmeler

### 3.1 N+1: Accounting reconciliation döngüsü

**Dosya:** `accounting.py:515-531`

```python
open_items = frappe.get_all("AT Reconciliation Item", ..., limit_page_length=0)
for row in open_items:
    item = frappe.get_doc("AT Reconciliation Item", row.name)  # N+1!
    item.status = ATReconciliationItemStatus.RESOLVED
    item.save(ignore_permissions=True)
```

**Önerilen:**
```python
frappe.db.sql("""
    UPDATE `tabAT Reconciliation Item`
    SET status = 'RESOLVED', resolution_action = 'Matched', notes = 'Auto-closed'
    WHERE accounting_entry = %s AND status = 'OPEN'
    AND (mismatch_type IS NULL OR mismatch_type != %s)
""", (accounting_entry, keep_mismatch_type))
```

---

### 3.2 N+1: Sales entity deaktivasyonunda toplu yazım

**Dosya:** `services/sales_entities.py:309-364`

4 DocType × Her entity × Her açık kayıt = O(branch_entities × 4 × open_records) bireysel `set_value` çağrısı.

**Önerilen:** Her DocType için tek bir batch UPDATE:
```python
for config in POOL_ENTITY_OPEN_RECORD_CONFIG:
    frappe.db.sql(f"""
        UPDATE `tab{config["doctype"]}`
        SET `{config["sales_entity_field"]}` = %s
        WHERE `{config["sales_entity_field"]}` = %s
        AND `{config["status_field"]}` IN ('Open', 'Pending', 'Draft')
    """, (pool_entity, deactivated_entity))
```

---

### 3.3 Sınırsız sorgular: 19+ adet `limit_page_length=0`

`services/sales_entities.py`, `services/branches.py`, `api/dashboard.py`, `accounting.py`, `services/break_glass.py` dosyalarında toplam 19+ adet sınırsız sorgu var.

**Öneri:** Her `limit_page_length=0` kullanımına bir comment eklenmeli:
```python
# unbounded: scope precomputation, max ~500 branches expected
frappe.get_all("AT Office Branch", ..., limit_page_length=0)
```
Ve gerçekten sınırsız gereken durumlar dışında makul bir üst limit (örn: 10.000) konmalı.

---

### 3.4 Dashboard: 22-28 SQL sorgu / request

`get_dashboard_tab_payload("daily")` çağrısında 22-28 SQL sorgusu çalıştırılıyor (dashboard cards dahil).

**Öneri:** KPI kartları için `frappe.cache()` ile 60 saniyelik TTL:
```python
cache_key = f"at_dashboard_kpi::{user}::{scope_hash}::{from_date}::{to_date}"
cached = frappe.cache().get_value(cache_key)
if cached:
    return cached
# ... compute ...
frappe.cache().set_value(cache_key, result, expires_in_sec=60)
```

---

### 3.5 JS: Senkron frappe.call() hata yönetimi eksik

**Dosyalar:** `at_lead.js:46-60`, `at_offer.js:101-121`, `at_policy_endorsement.js:7-23`

```javascript
// MEVCUT - hata yönetimi yok
frappe.call({
  method: "acentem_takipte.doctype.at_lead.at_lead.convert_to_offer",
  args: { lead_name: frm.doc.name },
  callback: (r) => {
    const offer = r?.message?.offer;
    if (!offer) return;  // Sessizce başarısız olur
    frappe.set_route("Form", "AT Offer", offer);
  },
});
```

**Önerilen:**
```javascript
frappe.call({
  method: "...",
  args: { lead_name: frm.doc.name },
  freeze: true,
  callback: (r) => {
    if (r.exc) {
      frappe.msgprint({ message: __("Dönüşüm başarısız oldu."), indicator: "red" });
      return;
    }
    const offer = r?.message?.offer;
    if (!offer) {
      frappe.msgprint({ message: __("Offer oluşturulamadı."), indicator: "orange" });
      return;
    }
    frappe.show_alert({ message: __("Offer oluşturuldu: {0}", [offer]), indicator: "green" });
    frm.reload_doc();
    frappe.set_route("Form", "AT Offer", offer);
  },
  error: (r) => {
    frappe.msgprint({ message: __("Sunucu hatası oluştu."), indicator: "red" });
  },
});
```

---

### 3.6 Cache key tutarsızlığı

`branches.py` `at_scope::{user}::branches` / `at_scope::{user}::sales_entities` kullanırken,  
`cache_precomputation.py` `at_user_scope::{user}::complete` kullanıyor.

**Risk:** Scope değişikliğinde bir cache temizlenirken diğeri stale kalabilir.

**Öneri:** Tek bir cache key namespace'i tanımla:
```python
# utils/cache_keys.py
SCOPE_CACHE_PREFIX = "at_scope"
def scope_cache_key(user, scope_type="complete"):
    return f"{SCOPE_CACHE_PREFIX}::{user}::{scope_type}"
```

---

### 3.7 DRY: `_apply_aux_edit_payload` 233 satır

**Dosya:** `quick_create.py:1538-1769`

233 satırlık dev fonksiyon, her field için ayrı `if field in {...}` bloğu içeriyor.

**Önerilen:**
```python
# Field type registry
FIELD_HANDLERS = {
    "string": lambda doc, f, v: setattr(doc, f, (v or "").strip() or None),
    "boolean": lambda doc, f, v: setattr(doc, f, _as_check(v)),
    "date": lambda doc, f, v: setattr(doc, f, _normalize_date(v)),
    "link": lambda doc, f, v, dt: setattr(doc, f, _normalize_link(dt, v)),
}

# DocType → field → handler_type mapping
AUX_EDIT_FIELD_MAP = {
    "AT Insurance Company": {
        "company_name": ("string",),
        "is_active": ("boolean",),
    },
    # ...
}

def _apply_aux_edit_payload(doc, payload):
    field_map = AUX_EDIT_FIELD_MAP.get(doc.doctype, {})
    for field, value in (payload or {}).items():
        handler_spec = field_map.get(field)
        if not handler_spec:
            continue
        handler_type = handler_spec[0]
        FIELD_HANDLERS[handler_type](doc, field, value, *handler_spec[1:])
```

---

### 3.8 DRY: 18 parametreli fonksiyonlar

`create_quick_policy` 23 parametre, `create_quick_payment` 17 parametre alıyor.

**Önerilen:** Dataclass veya dict-based payload:
```python
@dataclass
class QuickPolicyPayload:
    customer: str | None = None
    customer_full_name: str | None = None
    sales_entity: str | None = None
    # ...
    policy_no: str | None = None

def create_quick_policy(payload: QuickPolicyPayload) -> dict[str, str]:
```

---

### 3.9 Vue: fetch() hata yönetimi eksik

**Dosya:** `frontend/src/components/app-shell/AccessRequestForm.vue:152-165` — hata yönetimi yok  
**Dosya:** `frontend/src/components/app-shell/QuickCreateFormRenderer.vue:481-487` — `.catch(() => ({}))` ile hata yutuluyor  
**Dosya:** `frontend/src/components/app-shell/GlobalCustomerSearch.vue` — arama sırasında loading spinner yok

---

## 4. Uzun Vadeli Öneriler

### 4.1 Raporlama: Materialized View / Pre-aggregation

Agent performance ve customer segmentation raporları her istekte correlated subquery ile hesaplanıyor. Bunun yerine:

1. Scheduler job ile gece hesaplanan snapshot tablosu oluştur
2. Dashboard/reports bu snapshot'tan oku
3. Kullanıcı "taze veri" istediğinde on-demand yeniden hesapla

```
AT Report Snapshot:
  - report_key: "agent_performance"
  - scope_hash: "branch=ANK|from=2026-01-01|to=2026-03-26"
  - payload_json: { ...aggregated data... }
  - computed_on: datetime
  - ttl_seconds: 3600
```

---

### 4.2 Service Layer standardı

`quick_create.py` (1770 satır) modüler servislere ayrılmalı:

```
services/
  quick_create/
    __init__.py          # public API
    policies.py          # create_quick_policy
    payments.py          # create_quick_payment
    customers.py         # create_quick_customer
    leads.py             # create_quick_lead
    common.py            # _normalize_* helpers
```

---

### 4.3 API versiyonlama

Mevcut tüm endpoint'ler `/api/method/acentem_takipte.acentem_takipte.api.*` altında. Büyük değişikliklerde backward compatibility sağlamak zor.

**Öneri:** Namespace ayırma:
```
/api/method/acentem_takipte.v2.dashboard.kpis
/api/method/acentem_takipte.v2.reports.agent_performance
```

---

### 4.4 Frappe CVE güncellemesi

Araştırmada tespit edilen kritik CVE'ler:

| CVE | Severity | Açıklama | Etkilenen Sürüm |
|-----|----------|----------|-----------------|
| CVE-2026-31877 | **CRITICAL** | SQL Injection - auth gerektirmez | < 15.84.0 |
| CVE-2026-29081 | MEDIUM | SQL Injection via crafted requests | < 15.100.0 |
| CVE-2026-29077 | MEDIUM | Permission bypass via document sharing | < 15.98.0 |
| CVE-2026-28436 | MEDIUM | XSS via avatar URLs | < 15.102.0 |

**Aksiyon:** `bench --site your-site.local show-config` ile Frappe sürümünü kontrol edin ve en son patch sürümüne güncelleyin.

---

## 5. Kod Karşılaştırması (Refactor Örneği)

### 5.1 `accounting.py` — `_close_open_items` N+1 → Tek SQL

**Mevcut Kod (satır 515-531):**
```python
def _close_open_items(accounting_entry: str, keep_mismatch_type: str | None) -> int:
    open_items = frappe.get_all(
        "AT Reconciliation Item",
        filters={"accounting_entry": accounting_entry, "status": ATReconciliationItemStatus.OPEN},
        fields=["name", "mismatch_type"],
        limit_page_length=0,
    )
    closed = 0
    for row in open_items:
        if keep_mismatch_type and row.mismatch_type == keep_mismatch_type:
            continue
        item = frappe.get_doc("AT Reconciliation Item", row.name)
        item.status = ATReconciliationItemStatus.RESOLVED
        item.resolution_action = "Matched"
        item.notes = "Auto-closed by reconciliation job."
        item.save(ignore_permissions=True)
        closed += 1
    return closed
```

**Önerilen Refactor:**
```python
def _close_open_items(accounting_entry: str, keep_mismatch_type: str | None) -> int:
    conditions = [
        "accounting_entry = %(entry)s",
        "status = %(status)s",
    ]
    values = {"entry": accounting_entry, "status": ATReconciliationItemStatus.OPEN}

    if keep_mismatch_type:
        conditions.append("(mismatch_type IS NULL OR mismatch_type != %(keep_type)s)")
        values["keep_type"] = keep_mismatch_type

    where = " AND ".join(conditions)
    result = frappe.db.sql(
        f"""
        UPDATE `tabAT Reconciliation Item`
        SET status = %(resolved)s,
            resolution_action = 'Matched',
            notes = 'Auto-closed by reconciliation job.',
            modified = NOW()
        WHERE {where}
        """,
        {**values, "resolved": ATReconciliationItemStatus.RESOLVED},
    )
    return frappe.db.sql("SELECT ROW_COUNT()", as_list=True)[0][0]
```

**Kazanç:** N sorgu → 1 sorgu. 1000 açık item için ~2000ms → ~10ms.

---

### 5.2 `dashboard.py` — `_dashboard_cards_summary` Payment aggregation

**Mevcut Kod (satır 1390-1409):**
```python
payment_rows = frappe.get_all(
    "AT Payment",
    filters=_build_payment_filters(
        from_date=from_date, to_date=to_date,
        branch=branch, office_branch=office_branch,
        allowed_customers=allowed_customers,
    ),
    fields=["payment_direction", "status", "amount_try"],
    limit_page_length=0,
)
payment_totals = {
    "collected_try": sum(
        flt(row.get("amount_try") or 0)
        for row in payment_rows
        if row.get("payment_direction") == "Inbound" and row.get("status") == "Paid"
    ),
    "payout_try": sum(
        flt(row.get("amount_try") or 0)
        for row in payment_rows
        if row.get("payment_direction") == "Outbound" and row.get("status") == "Paid"
    ),
}
```

**Önerilen Refactor:**
```python
payment_agg = frappe.db.sql(
    """
    SELECT
        payment_direction,
        status,
        SUM(COALESCE(amount_try, 0)) as total
    FROM `tabAT Payment`
    WHERE {where_clause}
    GROUP BY payment_direction, status
    """.format(where_clause=_build_payment_where_clause(
        from_date=from_date, to_date=to_date,
        branch=branch, office_branch=office_branch,
        allowed_customers=allowed_customers,
    )),
    values=_build_payment_filter_values(
        from_date=from_date, to_date=to_date,
        branch=branch, office_branch=office_branch,
        allowed_customers=allowed_customers,
    ),
    as_dict=True,
)
payment_totals = {
    "collected_try": sum(r.total for r in payment_agg if r.payment_direction == "Inbound" and r.status == "Paid"),
    "payout_try": sum(r.total for r in payment_agg if r.payment_direction == "Outbound" and r.status == "Paid"),
}
```

**Kazanç:** 10.000 payment satırını Python'a çekmek yerine, SQL tarafında aggregation → ~50 satır döner.

---

### 5.3 `reporting.py` — Agent Performance correlated subqueries → JOIN

**Mevcut Kod (satır 406-505):** Her sales entity satırı için 11 correlated subquery.

**Önerilen Refactor:**
```python
def get_agent_performance_report_rows(filters=None, *, limit=500):
    normalized = normalize_report_filters(filters)
    values = {}
    conditions = ["1=1"]

    # ... filter building (same as current) ...

    return frappe.db.sql(
        """
        SELECT
            p.sales_entity,
            MAX(p.office_branch) as office_branch,
            COUNT(DISTINCT p.name) as policy_count,
            COALESCE(SUM(COALESCE(p.gross_premium, 0)), 0) as total_gross_premium,
            COALESCE(SUM({commission_expr}), 0) as total_commission,

            -- Offers (single LEFT JOIN replaces 5 correlated subqueries)
            COUNT(DISTINCT o.name) as offer_count,
            COUNT(DISTINCT CASE WHEN o.status = 'Accepted' THEN o.name END) as accepted_offer_count,
            COUNT(DISTINCT CASE WHEN o.converted_policy IS NOT NULL AND o.converted_policy != '' THEN o.name END) as converted_offer_count,
            ROUND(
                CASE WHEN COUNT(DISTINCT o.name) = 0 THEN 0
                ELSE COUNT(DISTINCT CASE WHEN o.converted_policy IS NOT NULL AND o.converted_policy != '' THEN o.name END)
                     * 100.0 / COUNT(DISTINCT o.name)
                END, 2
            ) as offer_conversion_rate,

            -- Renewal Tasks (single LEFT JOIN replaces 6 correlated subqueries)
            COUNT(DISTINCT r.name) as renewal_task_count,
            COUNT(DISTINCT CASE WHEN r.status = 'Done' THEN r.name END) as completed_renewal_task_count,
            COUNT(DISTINCT CASE WHEN r.status IN ('Open', 'In Progress') THEN r.name END) as open_renewal_task_count,
            ROUND(
                CASE WHEN COUNT(DISTINCT r.name) = 0 THEN 0
                ELSE COUNT(DISTINCT CASE WHEN r.status = 'Done' THEN r.name END)
                     * 100.0 / COUNT(DISTINCT r.name)
                END, 2
            ) as renewal_success_rate

        FROM `tabAT Policy` p
        LEFT JOIN `tabAT Offer` o ON o.customer = p.customer
            AND o.offer_date BETWEEN %(from_date)s AND %(to_date)s
            AND o.sales_entity = p.sales_entity
        LEFT JOIN `tabAT Renewal Task` r ON r.policy = p.name
            AND r.renewal_date BETWEEN %(from_date)s AND %(to_date)s
            AND r.assigned_to = p.sales_entity
        WHERE {where_clause}
        GROUP BY p.sales_entity
        ORDER BY total_gross_premium DESC, total_commission DESC
        LIMIT %(limit)s
        """.format(where_clause=where_clause),
        {**values, "from_date": normalized.get("from_date"), "to_date": normalized.get("to_date"), "limit": max(int(limit or 500), 1)},
        as_dict=True,
    )
```

**Kazanç:** 11N subquery → 1 sorgu (2 LEFT JOIN). 50 satır × 11 = 550 sorgu → 1 sorgu.

---

## Özet Skor Tablosu

| Eksen | Skor | En Kritik Bulgu |
|-------|------|-----------------|
| 1. Frappe Mimarisi | 7/10 | Hooks temiz, DocType normalize iyi; `_close_open_items` N+1 |
| 2. Güvenlik | 5/10 | Patch SQL f-string, 123x ignore_permissions, eksik validate |
| 3. Kod Kalitesi | 6/10 | DRY ihlali (normalizers, 233 satır fonksiyon, 23 parametre) |
| 4. Performans | 5/10 | 19+ unbounded query, 11 correlated subquery, 22-28 SQL/request |
| 5. UI/UX | 7/10 | Frappe API doğru kullanılıyor; validate() eksik, hata yönetimi yok |

**Genel Sağlık: 6/10** — Güçlü mimari temel, ancak performans ve güvenlik düzeltmeleri production-ready olmak için şart.
