# Acentem Takipte - Proje Kayıt Defteri

> Oluşturulma: 2025-01-20
> Proje: Sigorta Acentesi CRM ve Poliçe Yönetim Sistemi

---

## 📋 İçindekiler

1. [Proje Özeti](#1-proje-özeti)
2. [Mimari Yapı](#2-mimari-yapı)
3. [Dosya Yapısı](#3-dosya-yapısı)
4. [Backend Modülleri](#4-backend-modülleri)
5. [API Endpoints](#5-api-endpoints)
6. [Veri Modelleri (DocTypes)](#6-veri-modelleri-doctypes)
7. [Frontend Bileşenleri](#7-frontend-bileşenleri)
8. [Servis Katmanı](#8-servis-katmanı)
9. [Scheduler Job Tanımları](#9-scheduler-job-tanımları)
10. [İzin ve Yetkilendirme Sistemi](#10-izin-ve-yetkilendirme-sistemi)
11. [Bildirim Sistemi](#11-bildirim-sistemi)
12. [Muhasebe ve Mutabakat](#12-muhasebe-ve-mutabakat)
13. [Yenileme Pipeline](#13-yenileme-pipeline)
14. [Bulgu ve Gözlemler](#14-bulgu-ve-gözlemler)

---

## 1. Proje Özeti

### Temel Bilgiler

| Alan | Değer |
|------|-------|
| **Proje Adı** | Acentem Takipte |
| **Açıklama** | Sigorta acentesi CRM ve poliçe yönetim uygulaması |
| **Lisans** | MIT |
| **Frontend** | Vue 3 + Vite + Pinia + Tailwind CSS |
| **Backend** | Python + Frappe Framework |
| **Veritabanı** | MariaDB |
| **Cache** | Redis |
| **Versiyon** | 0.0.1 |

### Ana Özellikler

- ✅ Müşteri ve Lead Yönetimi (CRM)
- ✅ Poliçe Yaşam Döngüsü Yönetimi
- ✅ Teklif (Offer) Takibi ve Dönüşüm
- ✅ Hasar Dosyası Yönetimi
- ✅ Ödeme ve Tahsilat Takibi
- ✅ Yenileme Pipeline Otomasyonu
- ✅ Çoklu Kanal Bildirim Sistemi (Email, SMS, WhatsApp)
- ✅ Şube Bazlı İzin Sistemi (Branch-Aware Permissions)
- ✅ Dashboard ve Raporlama
- ✅ Break-Glass Acil Erişim Mekanizması
- ✅ Muhasebe Mutabakat İşlemleri
- ✅ Reaktif Gerçek Zamanlı Bildirimler

---

## 2. Mimari Yapı

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vue 3 SPA)                     │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────────┐  │
│  │Dashboard│  │Lead Mgmt│  │Policy   │  │Notification  │  │
│  │  /at    │  │         │  │Management│  │Center        │  │
│  └────┬────┘  └────┬────┘  └────┬────┘  └──────┬───────┘  │
└───────┼────────────┼────────────┼──────────────┼──────────┘
        │            │            │              │
        └────────────┴────────────┴──────────────┘
                         │
                    Frappe API
                         │
┌────────────────────────┼──────────────────────────────────┐
│                    BACKEND (Frappe)                        │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │  DocTypes      │  │  Services      │  │  Scheduler  │ │
│  │  (Veri Model)  │  │  (İş Mantığı) │  │  Jobs       │ │
│  └────────────────┘  └────────────────┘  └─────────────┘ │
└───────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼────┐    ┌─────▼─────┐    ┌────▼────┐
   │ MariaDB │    │   Redis   │    │   SMTP  │
   │         │    │  (Cache)  │    │ Server  │
   └─────────┘    └───────────┘    └─────────┘
```

---

## 3. Dosya Yapısı

### Ana Dizin Yapısı

```
acentem_takipte/
├── acentem_takipte/              # Frappe Uygulama Paketi
│   ├── __init__.py
│   ├── hooks.py                  # Frappe hook tanımları
│   ├── accounting.py            # Muhasebe sync servisi
│   ├── communication.py         # Bildirim gönderim servisi
│   ├── notifications.py         # Bildirim taslak oluşturma
│   ├── tasks.py                 # Scheduler job wrapper'ları
│   ├── setup_utils.py           # Kurulum ve kullanıcı yardımcıları
│   ├── api/                     # REST API endpoints
│   ├── doctype/                 # DocType tanımları
│   ├── services/                # İş mantığı servisleri
│   ├── providers/               # Bildirim sağlayıcıları
│   ├── renewal/                 # Yenileme modülü
│   ├── payments/                # Ödeme işlemleri
│   ├── claims/                  # Hasar modülü
│   ├── utils/                  # Yardımcı fonksiyonlar
│   ├── www/                    # Web route handlers
│   └── public/                 # Statik dosyalar
├── frontend/                   # Vue 3 SPA kaynak kodu
│   ├── src/
│   │   ├── main.js             # Uygulama giriş noktası
│   │   ├── App.vue             # Ana uygulama bileşeni
│   │   ├── router/            # Vue Router yapılandırması
│   │   ├── stores/             # Pinia state management
│   │   ├── pages/              # Sayfa bileşenleri
│   │   ├── components/         # Paylaşılan bileşenler
│   │   ├── composables/        # Vue composables
│   │   ├── config/             # Konfigürasyon
│   │   ├── utils/              # Yardımcı fonksiyonlar
│   │   └── types/             # TypeScript tip tanımları
│   └── package.json
├── scripts/                    # Yardımcı scriptler
├── fixtures/                   # Fixtures tanımları
├── docs/                       # Dokümantasyon
└── hooks.py                    # Üst seviye hooks
```

---

## 4. Backend Modülleri

### 4.1 Ana Modüller

| Dosya | Satır | Açıklama |
|-------|-------|----------|
| `accounting.py` | 559 | Muhasebe sync, mutabakat ve poliçe/payment/claim entegrasyonu |
| `communication.py` | 587 | Email, SMS, WhatsApp bildirim gönderimi |
| `notifications.py` | 128 | Bildirim taslak oluşturma ve kuyruk işleme |
| `tasks.py` | 367 | Scheduler job tanımları ve wrapper'lar |
| `setup_utils.py` | - | Kurulum, kullanıcı yetkisi ve cache ön hesaplama |
| `desktop.py` | - | Frappe desk simgesi |

### 4.2 accounting.py Detayları

**Ana Fonksiyonlar:**
- `sync_doc_event()` - DocEvent'ten tetiklenen muhasebe sync
- `sync_accounting_entries()` - Toplu muhasebe sync
- `sync_accounting_entry()` - Tekil kayıt sync
- `run_reconciliation()` - Mutabakat işlemleri
- `resolve_reconciliation_item()` - Mutabakat kalemi çözümleme

**Kaynak DocTypes:**
- `AT Policy` - Poliçe (Brüt prim, komisyon)
- `AT Payment` - Ödeme (Giriş/Çıkış yönü)
- `AT Claim` - Hasar (Onaylanan tutar)

**Muhasebe Durumları:**
```python
ATAccountingEntryStatus:
  - DRAFT
  - SYNCED
  - FAILED
  
ATReconciliationItemStatus:
  - OPEN
  - RESOLVED
  - IGNORED
```

### 4.3 communication.py Detayları

**Kanal Desteği:**
- `EMAIL` - Frappe sendmail
- `SMS` - WhatsApp adaptörü üzerinden
- `WHATSAPP` - Meta WhatsApp API

**Ana Fonksiyonlar:**
- `queue_notification_drafts()` - Taslakları kuyruğa ekle
- `process_notification_queue()` - Kuyruğu işle
- `dispatch_notification_outbox()` - Bildirim gönder
- `send_notification_draft_now()` - Anında gönder

**Yeniden Deneme Mekanizması:**
- Max 3 deneme
- Üstel geri çekilme: 5, 10, 20 dakika
- 3 başarısız denemeden sonra `DEAD` durumu

---

## 5. API Endpoints

### 5.1 API Dosyaları

| Dosya | Açıklama |
|-------|----------|
| `dashboard.py` | Dashboard verisi, KPI, tab payload |
| `dashboard_v2/` | Dashboard v2 modular endpoints |
| `customers.py` | Müşteri CRUD işlemleri |
| `branches.py` | Şube yönetimi |
| `break_glass.py` | Acil erişim talep/onay |
| `reports.py` | Rapor endpoint'leri |
| `accounting.py` | Muhasebe API |
| `communication.py` | Bildirim API |
| `session.py` | Oturum bilgisi |
| `security.py` | Güvenlik kontrolleri |

### 5.2 Ana API Metodları

```python
# Dashboard API
@frappe.whitelist()
def get_dashboard_kpis(filters=None)
def get_dashboard_tab_payload(tab, filters=None)
def get_customer_list(filters=None, limit=20)
def get_customer_workbench_rows(filters=None, page=1, page_length=20)
def get_lead_workbench_rows(filters=None, page=1, page_length=20)
def get_lead_detail_payload(name)
def get_offer_detail_payload(name)
def update_customer_profile(name, values=None)

# Customer 360
def get_customer_360_payload(name)
def get_policy_360_payload(name)

# Work Management
def get_my_tasks_payload(filters=None)
def get_my_activities_payload(filters=None)
def get_my_reminders_payload(filters=None)
def get_follow_up_sla_payload(filters=None)
```

### 5.3 Dashboard V2 Alt Modülleri

```
dashboard_v2/
├── __init__.py          # Modül marker
├── constants.py         # Sabitler
├── details_lead.py       # Lead detay payload builder
├── details_offer.py      # Offer detay payload builder
├── filters.py           # Filtre normalizasyonu
├── queries_customers.py  # Müşteri sorguları
├── queries_kpis.py       # KPI sorguları
├── queries_leads.py       # Lead sorguları
├── security.py           # Güvenlik kontrolleri
├── serializers.py        # Response serializers
└── tab_payload.py        # Tab payload builders
```

---

## 6. Veri Modelleri (DocTypes)

### 6.1 Ana DocTypes

| DocType | Açıklama | Önemli Alanlar |
|---------|----------|---------------|
| `AT Customer` | Müşteri kaydı | full_name, tax_id, phone, email, office_branch |
| `AT Lead` | Fırsat/Lead | first_name, last_name, status, estimated_gross_premium |
| `AT Offer` | Teklif | customer, insurance_company, gross_premium, status |
| `AT Policy` | Poliçe | policy_no, customer, gross_premium, commission, status, end_date |
| `AT Policy Endorsement` | Poliçe değişikliği | policy, endorsement_type |
| `AT Payment` | Ödeme | payment_direction, amount, due_date, status |
| `AT Payment Installment` | Taksit | payment, installment_number, amount |
| `AT Claim` | Hasar | claim_no, policy, estimated_amount, claim_status |
| `AT Renewal Task` | Yenileme görevi | policy, renewal_date, due_date, status |
| `AT Renewal Outcome` | Yenileme sonucu | outcome_status, lost_reason_code |
| `AT Accounting Entry` | Muhasebe kaydı | entry_type, local_amount, external_amount |
| `AT Reconciliation Item` | Mutabakat kalemi | mismatch_type, resolution_action |
| `AT Notification Draft` | Bildirim taslağı | template, channel, recipient, status |
| `AT Notification Outbox` | Bildirim kuyruğu | status, attempt_count, provider |
| `AT Notification Template` | Bildirim şablonu | event_key, body_template, channel |
| `AT Activity` | Aktivite | activity_type, customer, notes |
| `AT Task` | Görev | task_title, due_date, status |
| `AT Reminder` | Hatırlatıcı | remind_at, source_doctype |
| `AT Call Note` | Arama notu | call_type, notes |
| `AT Campaign` | Kampanya | campaign_type, start_date |
| `AT Segment` | Müşteri segmenti | segment_type |
| `AT Customer Segment Snapshot` | Segment anlık görüntü | snapshot_date |
| `AT Office Branch` | Şube/Ofis | branch_name, parent_branch |
| `AT Sales Entity` | Satış birimi | entity_name, entity_type |
| `AT Branch` | Branş tanımı | branch_name |
| `AT Insurance Company` | Sigorta şirketi | company_name |
| `AT Customer Relation` | Müşteri ilişkisi | relation_type |
| `AT Insured Asset` | Sigortalı varlık | asset_type, policy |
| `AT Access Log` | Erişim günlüğü | action, viewed_on |
| `AT Break Glass Request` | Acil erişim talebi | doctype, reason |
| `AT Emergency Access` | Acil erişim | granted_by, expires_on |
| `AT User Branch Access` | Kullanıcı-Şube eşleştirmesi | user, branch |
| `AT User Sales Entity Access` | Kullanıcı-Satış Birimi | user, sales_entity |
| `AT Ownership Assignment` | Sahiplik ataması | owner, reference_doctype |
| `AT Policy Snapshot` | Poliçe anlık görüntü | policy, snapshot_date |

### 6.2 DocType Durumları

**Lead Durumları:**
```python
"Open", "Draft", "Replied", "Closed"
```

**Offer Durumları:**
```python
"Draft", "Sent", "Accepted", "Rejected", "Converted"
```

**Policy Durumları:**
```python
"Active", "KYT", "IPT", "Cancelled"
```

**Renewal Task Durumları:**
```python
"Open", "In Progress", "Done", "Cancelled"
```

**Payment Durumları:**
```python
"Draft", "Pending", "Paid", "Cancelled"
```

**Claim Durumları:**
```python
"Open", "Under Review", "Approved", "Paid", "Closed"
```

---

## 7. Frontend Bileşenleri

### 7.1 Sayfa Bileşenleri (Pages)

| Sayfa | Route | Açıklama |
|-------|-------|----------|
| `Dashboard.vue` | `/` | Ana operasyon panosu |
| `LeadList.vue` | `/leads` | Lead listesi |
| `LeadDetail.vue` | `/leads/:name` | Lead detayı |
| `OfferBoard.vue` | `/offers` | Teklif panosu |
| `OfferDetail.vue` | `/offers/:name` | Teklif detayı |
| `PolicyList.vue` | `/policies` | Poliçe listesi |
| `PolicyDetail.vue` | `/policies/:name` | Poliçe detayı |
| `CustomerList.vue` | `/customers` | Müşteri listesi |
| `CustomerDetail.vue` | `/customers/:name` | Müşteri detayı |
| `ClaimsBoard.vue` | `/claims` | Hasar panosu |
| `ClaimDetail.vue` | `/claims/:name` | Hasar detayı |
| `PaymentsBoard.vue` | `/payments` | Ödeme panosu |
| `PaymentDetail.vue` | `/payments/:name` | Ödeme detayı |
| `RenewalsBoard.vue` | `/renewals` | Yenileme panosu |
| `RenewalTaskDetail.vue` | `/renewals/:name` | Yenileme detayı |
| `CommunicationHub.vue` | `/communication` | İletişim merkezi |
| `BreakGlassRequest.vue` | `/break-glass` | Acil erişim talebi |
| `BreakGlassApprovals.vue` | `/break-glass/approvals` | Acil erişim onayları |
| `ReconciliationWorkbench.vue` | `/reconciliation` | Mutabakat masası |
| `Reports.vue` | `/reports` | Raporlar listesi |
| `PremiumReport.vue` | `/reports/premium` | Prim raporu |
| `ClaimRatioReport.vue` | `/reports/claim-ratio` | Hasar/prim oranı |
| `AgentPerformanceReport.vue` | `/reports/agent-performance` | Acente performansı |
| `CustomerSegmentationReport.vue` | `/reports/customer-segmentation` | Müşteri segmentasyonu |
| `ImportData.vue` | `/data-import` | Veri içe aktarma |
| `ExportData.vue` | `/data-export` | Veri dışa aktarma |
| `NotificationDraftsList.vue` | `/notification-drafts` | Bildirim taslakları |
| `NotificationTemplatesList.vue` | `/notification-templates` | Bildirim şablonları |
| `AccountingEntriesList.vue` | `/accounting-entries` | Muhasebe kayıtları |
| `TasksList.vue` | `/tasks` | Görevler listesi |
| `AuxWorkbench.vue` | Dinamik | Aux kayıt workbench |
| `AuxRecordDetail.vue` | Dinamik | Aux kayıt detayı |

### 7.2 App Shell Bileşenleri

```
components/app-shell/
├── AccessRequestForm.vue
├── ActionButton.vue
├── ActionPreviewCard.vue
├── ActionToolbarGroup.vue
├── AmountPairSummary.vue
├── AmountStatusRow.vue
├── DataTableCell.vue
├── DataTableShell.vue
├── DetailActionRow.vue
├── DetailTabsBar.vue
├── EmptyState.vue
├── EntityPreviewCard.vue
├── FilterBar.vue
├── FilterChipButton.vue
├── FilterPresetMenu.vue
├── FormattedCurrencyValue.vue
├── GlobalCustomerSearch.vue
├── InlineActionRow.vue
├── KpiMetricCard.vue
├── MaskedDataNotice.vue
├── MetaListCard.vue
├── MiniFactList.vue
├── OfficeBranchSelect.vue
├── PageToolbar.vue
├── PreviewPager.vue
├── ProgressMetricRow.vue
├── QuickCreateDialogShell.vue
├── QuickCreateFormRenderer.vue
├── QuickCreateLauncher.vue
├── QuickCreateManagedDialog.vue
├── QuickCustomerPicker.vue
├── SectionCardHeader.vue
├── SectionPanel.vue
├── TableEntityCell.vue
├── TableFactsCell.vue
├── TablePagerFooter.vue
├── TrendMetricRow.vue
├── WorkbenchFilterToolbar.vue
└── WorkbenchPageLayout.vue
```

### 7.3 UI Bileşenleri

```
components/ui/
├── DetailCard.vue
├── DistributionChart.vue
├── FieldGroup.vue
├── FilterBar.vue
├── HeroStrip.vue
├── ListTable.vue
├── MetricCard.vue
├── RenewalWidget.vue
├── StatusBadge.vue
├── StepBar.vue
└── TrendChart.vue
```

### 7.4 Diğer Bileşenler

```
components/
├── DashboardStatCard.vue
├── PolicyForm.vue
├── QuickCreateClaim.vue
├── QuickCreateCustomer.vue
├── QuickCreateOffer.vue
├── Sidebar.vue
├── Topbar.vue
└── reports/
    └── ScheduledReportsManager.vue
```

---

## 8. Servis Katmanı

### 8.1 Ana Servisler

| Servis | Açıklama |
|--------|----------|
| `accounting_runtime.py` | Çalışma zamanı muhasebe işlemleri |
| `admin_jobs.py` | Admin job yönetimi |
| `branches.py` | Şube hiyerarşi işlemleri |
| `break_glass.py` | Acil erişim mekanizması |
| `campaigns.py` | Kampanya yürütme |
| `customer_360.py` | Müşteri 360 derece görünüm |
| `customer_segments.py` | Müşteri segmentasyonu |
| `document_center.py` | Doküman merkezi |
| `export_payload_utils.py` | Dışa aktarma yardımcıları |
| `follow_up_sla.py` | Takip SLA hesaplama |
| `list_exports.py` | Liste dışa aktarma |
| `notifications.py` | Bildirim işleme |
| `payments.py` | Ödeme işlemleri |
| `policy_360.py` | Poliçe detay görünümü |
| `privacy_masking.py` | Gizlilik maskesi |
| `query_isolation.py` | Sorgu izolasyonu |
| `quick_create.py` | Hızlı oluşturma |
| `quick_customer.py` | Hızlı müşteri oluşturma |
| `renewals.py` | Yenileme işlemleri |
| `reporting.py` | Raporlama servisi |
| `reports_runtime.py` | Rapor çalışma zamanı |
| `report_exports.py` | Rapor dışa aktarma |
| `report_isolation.py` | Rapor izolasyonu |
| `report_registry.py` | Rapor kayıt defteri |
| `sales_entities.py` | Satış birimi yönetimi |
| `scheduled_reports.py` | Zamanlı raporlar |
| `segments.py` | Segment işlemleri |
| `work_management.py` | İş/görev yönetimi |

### 8.2 Yardımcı Modüller (Utils)

| Dosya | Açıklama |
|-------|----------|
| `assets.py` | Asset symlink ve include yönetimi |
| `commissions.py` | Komisyon hesaplama |
| `financials.py` | Finansal hesaplamalar |
| `logging.py` | Loglama ve redact fonksiyonları |
| `metrics.py` | Metrik oluşturma |
| `network_security.py` | Ağ güvenliği (URL normalize) |
| `notes.py` | Not normalizasyonu |
| `permissions.py` | İzin yardımcıları |
| `statuses.py` | Durum enum'ları |

---

## 9. Scheduler Job Tanımları

### 9.1 Cron Jobs (Her 10 dakika)

```python
"*/10 * * * *": [
    "acentem_takipte.tasks.run_notification_queue_job",
]
```

### 9.2 Hourly Jobs (Her saat)

```python
"0 * * * *": [
    "acentem_takipte.tasks.run_accounting_sync_job",
    "acentem_takipte.services.break_glass.expire_break_glass_grants",
]
```

### 9.3 Daily Jobs

```python
"daily": [
    "acentem_takipte.tasks.create_renewal_tasks",              # Yenileme görevi oluşturma
    "acentem_takipte.tasks.run_stale_renewal_task_job",      # Eski görevleri temizle
    "acentem_takipte.tasks.run_payment_due_job",             # Vadesi gelen ödemeler
    "acentem_takipte.tasks.run_due_campaigns_job",           # Kampanya yürütme
    "acentem_takipte.tasks.run_customer_segment_snapshot_job", # Segment anlık görüntü
    "acentem_takipte.tasks.run_scheduled_reports_job",       # Zamanlı raporlar
    "acentem_takipte.tasks.run_accounting_reconciliation_job", # Muhasebe mutabakat
    "acentem_takipte.services.break_glass.expire_stale",    # Acil erişim süre bitimi
    "acentem_takipte.services.break_glass.run_break_glass_audit_monitor", # Audit izleme
]
```

### 9.4 Task Wrapper Fonksiyonları

```python
def create_renewal_tasks()           # -> _queued_response
def run_renewal_task_job()           # -> create_renewal_tasks()
def run_stale_renewal_task_job()     # -> _run_stale_renewal_task_logic()
def run_notification_queue_job()      # -> _run_notification_queue_logic()
def run_payment_due_job()            # -> _run_payment_due_logic()
def run_scheduled_reports_job()       # -> _run_scheduled_reports_logic()
def run_due_campaigns_job()           # -> _run_due_campaigns_logic()
def run_customer_segment_snapshot_job() # -> _run_customer_segment_snapshot_logic()
def run_accounting_sync_job()        # -> sync_accounting_entries()
def run_accounting_reconciliation_job() # -> run_reconciliation()
```

---

## 10. İzin ve Yetkilendirme Sistemi

### 10.1 Şube Bazlı İzin Modeli

**Ana Prensip:** Kullanıcılar sadece atandıkları şubelere erişebilir.

```python
# Temel fonksiyonlar (branch_permissions.py)
def build_office_branch_permission_query(doctype, fieldname, user)
def build_branch_and_sales_entity_permission_query(doctype, office_branch_fieldname, sales_entity_fieldname, user)
def has_office_branch_permission(doc, fieldname, user)
def has_branch_and_sales_entity_permission(doc, office_branch_fieldname, sales_entity_fieldname, user)
```

### 10.2 DocType Bazlı İzin Hooks

```python
permission_query_conditions = {
    "AT Customer": "get_permission_query_conditions",
    "AT Lead": "get_lead_permission_query_conditions",
    "AT Offer": "get_offer_permission_query_conditions",
    "AT Policy": "get_policy_permission_query_conditions",
    "AT Payment": "get_payment_permission_query_conditions",
    "AT Claim": "get_claim_permission_query_conditions",
    "AT Renewal Task": "get_renewal_task_permission_query_conditions",
    "AT Accounting Entry": "get_accounting_entry_permission_query_conditions",
    "AT Reconciliation Item": "get_reconciliation_item_permission_query_conditions",
    "AT Notification Draft": "get_notification_draft_permission_query_conditions",
    "AT Notification Outbox": "get_notification_outbox_permission_query_conditions",
}
```

### 10.3 Break-Glass Mekanizması

**Kullanım:** Yetkisiz DocType'lara acil erişim sağlama.

```python
# break_glass.py
def is_break_glass_active(user, doctype)
def request_break_glass(doctype, docname, reason)
def approve_break_glass(request_name)
def expire_break_glass_grants()  # Scheduler job
```

---

## 11. Bildirim Sistemi

### 11.1 Bildirim Akışı

```
┌─────────────┐    ┌──────────────┐    ┌────────────┐    ┌───────────┐
│ Notification│ -> │Notification  │ -> │ Notification│ -> │ Provider  │
│   Event     │    │   Draft      │    │   Outbox   │    │ (Email/   │
│             │    │              │    │            │    │  WhatsApp)│
└─────────────┘    └──────────────┘    └────────────┘    └───────────┘
```

### 11.2 Bildirim Şablon Alanları

```python
AT Notification Template:
  - name
  - event_key          # Tetikleyici event
  - template_key      # Şablon anahtarı
  - channel            # Email, SMS, WhatsApp, Both
  - language           # tr, en
  - subject            # Email konu
  - body_template      # Genel şablon
  - email_body_template
  - sms_body_template
  - whatsapp_body_template
  - provider_template_name  # WhatsApp template adı
  - is_active          # Aktif mi
```

### 11.3 Bildirim Durumları

```python
# Draft durumları
ATNotificationDraftStatus:
  - DRAFT
  - QUEUED
  - SENT
  - FAILED

# Outbox durumları
ATNotificationOutboxStatus:
  - QUEUED
  - PROCESSING
  - SENT
  - FAILED
  - DEAD
```

### 11.4 Provider Router

```python
# providers/router.py
def get_provider_adapter(channel, explicit_provider=None)

# Desteklenen kanallar
- EMAIL: Frappe sendmail
- WHATSAPP: Meta WhatsApp API
- SMS: WhatsApp adaptörü üzerinden
```

---

## 12. Muhasebe ve Mutabakat

### 12.1 Muhasebe Entry Oluşturma

**Policy İçin:**
```python
# Brüt prim -> Gross Production
# Komisyon -> Commission Accrual
```

**Payment İçin:**
```python
# Inbound -> Pozitif tutar
# Outbound -> Negatif tutar
```

**Claim İçin:**
```python
# Onaylanan tutar -> Claim Reserve
```

### 12.2 Mutabakat Uyumsuzluk Türleri

```python
"Status"           # Sync hatası
"Missing External" # External ref eksik
"Amount"           # Tutar uyumsuzluğu
```

### 12.3 Mutabakat Toleransı

```python
RECONCILIATION_TOLERANCE = 0.01  # 1 kuruş tolerans
```

---

## 13. Yenileme Pipeline

### 13.1 Yenileme Aşamaları

```python
# renewal/reminders.py
RenewalStage:
  - R1: 90 gün öncesi (Erken hatırlatma)
  - R2: 60 gün öncesi
  - R3: 30 gün öncesi
  - R4: 15 gün öncesi
  - R5: 7 gün öncesi (Son hatırlatma)
  - R6: 1 gün öncesi (Acil)
```

### 13.2 Yenileme Görev Durumları

```python
ATRenewalTaskStatus:
  - OPEN
  - IN_PROGRESS
  - DONE
  - CANCELLED
```

### 13.3 Yenileme Sonuç Türleri

```python
# Renewed: Başarıyla yenilendi
# Lost: Rakibe kaptırıldı (competitor_name, lost_reason_code)
# Cancelled: İptal edildi
```

### 13.4 Pipeline Adımları

```
1. run_renewal_task_creation()
   -> get_renewal_candidates()
   -> create_renewal_task_doc()
   -> insert RenewalTask

2. queue_renewal_task_notification()
   -> create_renewal_notification_draft()
   -> Notification Draft oluştur

3. remediate_stale_renewal_tasks()
   -> Eski (geçmiş tarihli) görevleri iptal et

4. sync_renewal_outcome()
   -> RenewalOutcome kaydı oluştur/güncelle
```

---

## 14. Bulgu ve Gözlemler

### 14.1 Güçlü Yönler

| Alan | Açıklama |
|------|----------|
| **Modüler Yapı** | Temiz ayrım: api/, services/, utils/ |
| **Branch Enforcment** | Kapsamlı şube bazlı izin sistemi |
| **Otomasyon** | Scheduler job ile birçok işlem otomatik |
| **Break-Glass** | Acil erişim mekanizması mevcut |
| **Multi-channel Notification** | Email, SMS, WhatsApp desteği |
| **Reconciliation** | Muhasebe mutabakat sistemi |
| **Dashboard** | Kapsamlı Vue tabanlı dashboard |
| **Test Coverage** | Yoğun unit test ve E2E test |

### 14.2 Potansiyel İyileştirme Alanları

| Alan | Öneri |
|------|-------|
| **Retry Logic** | Exponential backoff iyi ama max attempts config'e çıkarılabilir |
| **Caching** | Dashboard için daha fazla Redis cache kullanılabilir |
| **API Versioning** | `/api/v2/` prefix ile versiyonlama eklenebilir |
| **Rate Limiting** | API endpoint'leri için rate limit eklenebilir |
| **Webhook System** | Dış sistem entegrasyonu için webhook desteği |
| **Audit Trail** | Tüm kritik işlemler için detaylı audit log |
| **Soft Delete** | DocTypes için soft delete pattern |
| **Migration Tool** | Veri migration için CLI tool |

### 14.3 Kod Kalitesi Gözlemleri

- ✅ Temiz fonksiyon isimlendirmesi
- ✅ Docstring kullanımı
- ✅ Type hint kullanımı (Python 3.10+)
- ✅ Enum yerine frozen dataclass kullanımı
- ✅ Consistent error handling
- ✅ Logging ve metrics entegrasyonu
- ✅ Redaction fonksiyonları (gizlilik)

### 14.4 Güvenlik Gözlemleri

- ✅ CSRF token yönetimi
- ✅ Şube bazlı veri izolasyonu
- ✅ Sensitive data masking
- ✅ Break-glass ile yetki yükseltme
- ✅ SQL injection koruması (Frappe ORM)
- ⚠️ External API token'ları site config'te

### 14.5 Performans Gözlemleri

- ✅ Debouncing mekanizması (sync_doc_event)
- ✅ Batch processing (limit parametreleri)
- ✅ Cache kullanımı (Redis)
- ✅ Request bucketing (dashboard)
- ✅ Connection pooling (veritabanı)

### 14.6 Documentation Coverage

| Dosya | Durum |
|-------|-------|
| README.md | ✅ Kapsamlı |
| hooks.py | ✅ Inline açıklamalar |
| API functions | ✅ Docstring |
| Frontend | ✅ Vue i18n |
| GitHub Actions | ✅ CI/CD mevcut |
| E2E Tests | ✅ Playwright |

---

## 📊 Dosya Sayıları

| Kategori | Sayı |
|----------|------|
| Python dosyaları (kaynak) | ~200+ |
| Vue bileşenleri | ~80+ |
| Test dosyaları | ~100+ |
| DocType JSON | ~30+ |
| API endpoint | ~20+ |
| Sayfa | ~40+ |

---

## 🔗 İlişkili Kaynaklar

- **Frappe Docs:** https://docs.frappe.io
- **Vue 3 Docs:** https://vuejs.org
- **Tailwind CSS:** https://tailwindcss.com
- **Playwright:** https://playwright.dev

---

*Bu kayıt defteri otomatik olarak oluşturulmuştur.*
*Son güncelleme: 2025-01-20*
