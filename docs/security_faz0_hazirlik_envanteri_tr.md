# Faz-0 Guvenlik Hazirlik Envanteri (Endpoint / Rol / Flag / Test Matrisi)

Tarih: 2026-02-26

Bu dokuman, yol haritasindaki **Faz-0** hazirlik maddelerini kapatmak icin repo tabanli bir referans olarak hazirlanmistir.

Kapsam:
- `acentem_takipte/acentem_takipte/api/*.py` public whitelisted endpoint'ler
- Donusum endpoint'leri (`AT Lead`, `AT Offer`)
- Security regression test matrisi (mevcut + hedef)
- Dashboard contract smoke test tanimlari

## 1) Endpoint Envanteri ve Siniflandirma

Not:
- Liste, tum `@frappe.whitelist()` fonksiyonlarini tek tek degil, **operasyonel/siber risk acisindan oncelikli** endpoint gruplarini kapsar.
- `tasks.py` icindeki job fonksiyonlari artik internal calisir; manuel tetikleme `api/admin_jobs.py` uzerinden yapilir.

### A. `read` endpoint'leri

| Modül | Endpoint(ler) | Sinif | Guard/Ozet |
|---|---|---|---|
| `api/dashboard.py` | `get_dashboard_kpis`, `get_dashboard_tab_payload`, `get_customer_list`, `get_customer_portfolio_summary_map`, `get_customer_workbench_rows`, `get_lead_workbench_rows`, `get_lead_detail_payload`, `get_offer_detail_payload` | `read` | Scope + permission policy + dashboard meta/scope handling |
| `api/accounting.py` | `get_reconciliation_workbench` | `read` | Doctype read permission guard |
| `api/communication.py` | `get_queue_snapshot` | `read` | Draft/Outbox read guard + customer scope kontrolu |
| `api/filter_presets.py` | `get_filter_preset_state` | `read` | Authenticated user state read (user-scoped) |
| `api/session.py` | `get_session_context` | `read` | Session/capability bootstrap |
| `doctype/at_notification_template` | `render_notification_template` | `read+compute` | Auth + template read + active check + rate limit |
| `api/smoke.py` | `inspect_at_doctype_modules` | `dev-only/read` | Admin-only + production kill-switch |

### B. `write` endpoint'leri

| Modül | Endpoint(ler) | Sinif | Guard/Ozet |
|---|---|---|---|
| `api/accounting.py` | `run_sync`, `run_reconciliation_job`, `resolve_item` | `write` | POST-only + role guard + doc scope (`resolve_item`) |
| `api/communication.py` | `run_dispatch_cycle`, `create_quick_notification_draft`, `send_draft_now`, `retry_outbox_item`, `requeue_outbox_item` | `write` | POST-only + permission/doc checks + audit |
| `api/filter_presets.py` | `set_filter_preset_state` | `write` | User-scoped state write |
| `api/session.py` | `set_session_locale` | `write` | Session preference update |
| `api/quick_create.py` | `create_quick_*`, `update_quick_aux_record` | `write` | Doctype create/write permission kontrolleri (helper bazli) |
| `api/dashboard.py` | `update_customer_profile` | `write` | Doc write path (dashboard wrapper uzerinden) |

### C. `job-trigger` endpoint'leri

| Modül | Endpoint(ler) | Sinif | Guard/Ozet |
|---|---|---|---|
| `api/admin_jobs.py` | `run_renewal_task_job`, `run_notification_queue_job`, `run_accounting_sync_job`, `run_accounting_reconciliation_job` | `job-trigger` | POST-only + role guard + audit + cache-tabanli rate limit |

### D. `dev-only` endpoint'leri

| Modül | Endpoint(ler) | Sinif | Guard/Ozet |
|---|---|---|---|
| `api/seed.py` | `seed_demo_data` | `dev-only/write` | `System Manager` + POST-only + `at_enable_demo_endpoints` kill-switch + audit |
| `api/smoke.py` | `run_backend_smoke_test` | `dev-only/write` | `System Manager` + POST-only + `at_enable_demo_endpoints` kill-switch + audit |
| `api/smoke.py` | `inspect_at_doctype_modules` | `dev-only/read` | `System Manager` + `at_enable_demo_endpoints` kill-switch + audit |

### E. `conversion` endpoint'leri

| Modül | Endpoint(ler) | Sinif | Guard/Ozet |
|---|---|---|---|
| `doctype/at_lead/at_lead.py` | `convert_to_offer` | `conversion/write` | POST-only + lead read/write + `AT Offer.create` + customer/doc scope |
| `doctype/at_offer/at_offer.py` | `convert_to_policy` | `conversion/write` | POST-only + offer read/write + `AT Policy.create` + customer/doc scope + lead write (varsa) |
| `doctype/at_policy_endorsement/at_policy_endorsement.py` | `apply_endorsement` | `conversion/write` | Endorsement apply flow (ayri permission review gerektirir; Faz-1 sonrasi follow-up) |

## 2) Rol Matrisi (Endpoint Yetki Eslestirme)

Bu matris, endpoint siniflarina gore hedef yetki davranisini standardize eder. Nihai dogrulama `setup.py` + Doctype permission matrix + endpoint guard kombinasyonu ile yapilir.

| Endpoint Sinifi | Agent | Manager | Accountant | System Manager |
|---|---:|---:|---:|---:|
| Dashboard / workbench read (scope'lu) | Evet (scope'lu) | Evet | Evet | Evet |
| Communication snapshot read | Yetki/scope varsa | Evet | Evet | Evet |
| Communication dispatch/mutation | Genelde Hayir (capability bagimli) | Evet | Ops'e gore | Evet |
| Reconciliation read | Ops'e gore | Evet | Evet | Evet |
| Reconciliation resolve/job | Hayir | Evet | Evet | Evet |
| Admin job trigger (`api/admin_jobs.py`) | Hayir | Evet | Evet | Evet |
| Demo seed / smoke | Hayir | Hayir | Hayir | Evet |
| Lead -> Offer conversion | Role + doctype permission varsa | Evet | Gerekirse | Evet |
| Offer -> Policy conversion | `AT Policy.create` varsa | Evet | Gerekirse | Evet |
| Quick create endpoint'leri | Doctype permission'e bagli | Evet | Doctype'e bagli | Evet |

Notlar:
- `Agent` davranisi doctype permission + customer scope ile sinirlanmalidir.
- `System Manager` uygulama ici guard'larda genellikle bypass/ust yetki roludur.
- `Accountant` yalniz muhasebe/mutabakat/job trigger ekseninde genisletilmistir.

## 3) Feature Flag Anahtarlari (Belirlendi)

### Mevcut ve aktif kullanilan flag'ler

| Flag | Durum | Kullanildigi Yer | Amac |
|---|---|---|---|
| `at_enable_demo_endpoints` | Aktif | `api/seed.py`, `api/smoke.py` | Prod ortamda demo/seed/smoke endpoint kill-switch |
| `at_dashboard_allow_bootstrap_global_fallback` | Aktif | `api/dashboard_v2/security.py` | Strict scope migration sirasinda eski global fallback davranisini gecici geri acmak |

### Kanonik yol haritasi anahtarlari (isimlendirme standardi)

| Kanonik isim | Su anki karsiligi | Durum |
|---|---|---|
| `disable_demo_endpoints` | `at_enable_demo_endpoints` (ters mantik) | Belirlendi, henüz alias uygulanmadi |
| `strict_dashboard_scope` | `at_dashboard_allow_bootstrap_global_fallback` (ters mantik fallback flag) | Belirlendi, henüz alias uygulanmadi |
| `strict_security_mode` | (yok) | Belirlendi, gelecek hardening paketleri icin rezerv |

Onerilen ileri adim:
- `api/security.py` icine alias cozumleme helper'i eklenebilir (`strict_security_mode` aktifse daha kati defaultlar).

## 4) Security Regression Test Matrisi (Taslak + Guncel Durum)

### Backend security regression (mevcut)

| Senaryo | Beklenen | Durum | Test Referansi |
|---|---|---|---|
| Unauthorized `seed_demo_data` | permission error | Tamamlandi | `test_seed_smoke_security.py` |
| Unauthorized `run_backend_smoke_test` | permission error | Tamamlandi | `test_seed_smoke_security.py` |
| Unauthorized `inspect_at_doctype_modules` | permission error | Tamamlandi | `test_seed_smoke_security.py` |
| Unauthorized `resolve_item` | permission error | Tamamlandi | `test_accounting_reconciliation.py` |
| Unauthorized `convert_to_offer` | permission error | Tamamlandi | `doctype/at_lead/test_at_lead.py` |
| Unauthorized `convert_to_policy` | permission error | Tamamlandi | `doctype/at_offer/test_at_offer.py` |
| Unauthorized `get_queue_snapshot` | permission error | Tamamlandi | `test_notification_dispatcher.py` |
| Scoped agent dashboard scope | yalniz kendi kapsami / empty / deny | Tamamlandi | `test_dashboard_scope.py` |

### Frontend / UX regression (hedef)

| Senaryo | Beklenen | Durum |
|---|---|---|
| 403 hatasi kullaniciya anlamli banner/toast | Anlasilir mesaj | Acik |
| Capability olmayan aksiyon gizleme/disable | UI parity | Acik |
| Dashboard/workbench contract degisimi sonrasi ekranlarin calismasi | Smoke/E2E yesil | Acik |

## 5) `dashboard.py` Response Contract Smoke Test Tanimlari

Bu madde tanim seviyesini asmis ve uygulanmistir. Referans test paketleri:

- `acentem_takipte.acentem_takipte.tests.test_dashboard_contract_smoke`
  - KPI payload temel alanlari
  - Tab payload (`daily`, `sales`, `renewals`, `collections`)
  - Customer/Lead workbench contract smoke
- `acentem_takipte.acentem_takipte.tests.test_dashboard_scope`
  - strict scope / fallback flag / unmapped user deny
- `acentem_takipte.acentem_takipte.tests.test_dashboard_wave4_builders`
  - builder-level local contract checks (frappe stub ile)

Minimum contract kontrol basliklari:
- `meta` alani (scope reason/access scope)
- `cards` / `previews` anahtar varligi (tab'a gore)
- `rows`, `pagination` (workbench endpoint'leri)
- Beklenmeyen exception yerine bos payload/permission davranisi

