# Audit Ertelenen Sorunlar

## #1 Dashboard

| # | Severlik | Sorun | Dosya |
|---|----------|-------|-------|
| 2 | MEDIUM | Loss-ratio KPI'si eksik (claims paid / premiums earned) | `useDashboardFacts.js` |
| 3 | MEDIUM | Komisyon trendi sadece mutlak tutar, oran trendi yok | `queries_kpis.py` |
| 4 | MEDIUM | `Completed` → `Done` legacy renewal fallback, temizlik zamani yok | `dashboard.py:96` |
| 6 | MEDIUM | `commission_sql_expr` legacy fallback sessiz | `commissions.py:24` |
| 7 | MEDIUM | Tahsilat toplamlari ile prim toplamlari farkli tarih filtreleri | `dashboard.py:1775` |
| 8 | LOW | FX rate opacity — dashboard'da hangi kur kullanildigi belli degil | `useDashboardFormatters.js` |
| 13 | MEDIUM | `daysUntil` + `compareDueDateAsc` iki dosyada tekrarli | `useDashboardFormatters.js`, `useDashboardSales.js` |
| 14 | MEDIUM | API hatalarinda per-resource error state yok | `Dashboard.vue` |
| 15 | MEDIUM | Module-scope `createResource`, abort mekanizmasi yok | `Dashboard.vue:412-539` |
| 16 | LOW | Skeleton sadece ilk yuklemede, tab degisiminde gozukmuyor | `Dashboard.vue:40-44` |
| 17 | LOW | Policy scope cache sadece `table_alias` ile key'leniyor | `queries_kpis.py:26` |

---

## #8 Yenilemeler (Renewals)

| # | Severlik | Sorun | Dosya |
|---|----------|-------|-------|
| 2 | MEDIUM | `policy_no` alani string olarak node_key kullaniliyor, bos string olabilir | `RenewalBoardCard.vue:93` |
| 4 | MEDIUM | `formatDate` yedek tarih olarak `"1970-01-01"` gosteriyor | `useDashboardFormatters.js:89` |
| 5 | LOW | Satir tiklama ve surukleme ayni `@click` ile, tiklama suruklemeyi tetikleyebilir | `RenewalBoardCard.vue:1-7` |

---

## #2 Leads

| # | Severlik | Sorun | Dosya |
|---|----------|-------|-------|
| IE-1 | LOW | "Replied" = "Gorustuldu" CRM terimi, "Tekliflendi" daha uygun | `lead_translations.js` |
| IE-2 | HIGH | `lead_source`, `lead_type`, `assigned_agent` alanlari yok | `at_lead.json` |
| IE-3 | LOW | Liste sayfasinda conversion-rate KPI'si yok | `LeadList.vue` |
| IE-5 | HIGH | `product_interest`, `competitor_info` pipeline alanlari yok | `at_lead.json` |
| AE-1 | MEDIUM | Lead'de komisyon tahmini alani yok | `at_lead.json` |
| AE-2 | MEDIUM | `converted_offer_date` timestamp yok | `at_lead.py` |
| AE-3 | LOW | Actual-vs-estimated premium karsilastirmasi yok | `at_lead.py` |
| SE-3 | CRITICAL | 4 adet duplicate composable temizlenmeli | `domains/leads/composables/` |
| SE-4 | LOW | 8 ceviri anahtari karsiliksiz | `lead_translations.js` |
| SE-6 | MEDIUM | `leadStaleLabel` hardcoded string'ler | `useLeadDetailRuntime.js:26` |

---

## #3 Offers

| # | Severlik | Sorun | Dosya |
|---|----------|-------|-------|
| F1 | MEDIUM | Dual conversion entry points (direct doc call vs API wrapper) | `useOfferDetailRuntime.js` / `endpoints.py` |
| F2 | LOW | OfferDetail conversion lacks start/end/policy_no form fields | `OfferDetail.vue:260-265` |
| F3 | LOW | Offer premiums silently overwritten via db_set during conversion | `at_offer.py:247-252` |
| F7 | MEDIUM | New policies get both commission_amount and legacy commission field | `at_offer.py:223-224` |
| F13 | LOW | convertToPolicy declares 3 unused params | `useOfferDetailRuntime.js:195` |

---

## #4 Policies

| # | Severlik | Sorun | Dosya |
|---|----------|-------|-------|
| — | LOW | `domains/policies/pages/` stale duplicate | Silindi |

