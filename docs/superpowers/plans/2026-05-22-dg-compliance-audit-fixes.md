# DG Compliance Audit Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 26 DESIGN_GUIDELINES v2.3 violations/improvements found during the 36-doctype audit.

**Architecture:** Changes are grouped by file to minimize context switching. Each phase targets one or two files. All changes are frontend-only (translation/config/CSS). No backend changes needed.

**Tech Stack:** Vue 3, Tailwind CSS, Vitest

---

## Phase 1: AUX_DETAIL_FIELD_LABELS — 8 doctypes'e field label ekle (HIGH)

**File:** `frontend/src/composables/useAuxRecordDetailSummary.js:20-213`

8 doctype için `AUX_DETAIL_FIELD_LABELS`'ta eksik entry var. Hepsi `humanizeField()` fallback ile İngilizce label gösteriyor.

- [ ] **Step 1: Add `sales-entities` field labels**

```javascript
  "sales-entities": {
    tr: {
      name: "Kayıt",
      entity_type: "Birim Türü",
      full_name: "Tam Ad",
      office_branch: "Ofis Şubesi",
      parent_entity: "Üst Birim",
      owner: "Kayıt Sahibi",
      modified: "Güncellendi",
    },
    en: {
      name: "Record",
      entity_type: "Entity Type",
      full_name: "Full Name",
      office_branch: "Office Branch",
      parent_entity: "Parent Entity",
      owner: "Owner",
      modified: "Modified",
    },
  },
```

- [ ] **Step 2: Add `companies` field labels**

```javascript
  companies: {
    tr: {
      name: "Kayıt",
      company_name: "Şirket Adı",
      company_code: "Şirket Kodu",
      is_active: "Aktif",
      owner: "Kayıt Sahibi",
      modified: "Güncellendi",
    },
    en: {
      name: "Record",
      company_name: "Company Name",
      company_code: "Company Code",
      is_active: "Active",
      owner: "Owner",
      modified: "Modified",
    },
  },
```

- [ ] **Step 3: Add `branches` field labels**

```javascript
  branches: {
    tr: {
      name: "Kayıt",
      branch_name: "Branş Adı",
      branch_code: "Branş Kodu",
      insurance_company: "Sigorta Şirketi",
      is_active: "Aktif",
      owner: "Kayıt Sahibi",
      modified: "Güncellendi",
    },
    en: {
      name: "Record",
      branch_name: "Branch Name",
      branch_code: "Branch Code",
      insurance_company: "Insurance Company",
      is_active: "Active",
      owner: "Owner",
      modified: "Modified",
    },
  },
```

- [ ] **Step 4: Add `segments` field labels**

```javascript
  segments: {
    tr: {
      name: "Kayıt",
      segment_name: "Segment Adı",
      segment_type: "Segment Türü",
      channel_focus: "Kanal Odağı",
      office_branch: "Ofis Şubesi",
      status: "Durum",
      estimated_customer_count: "Tahmini Müşteri Sayısı",
      criteria_json: "Kriterler",
      notes: "Notlar",
      owner: "Kayıt Sahibi",
      modified: "Güncellendi",
    },
    en: {
      name: "Record",
      segment_name: "Segment Name",
      segment_type: "Segment Type",
      channel_focus: "Channel Focus",
      office_branch: "Office Branch",
      status: "Status",
      estimated_customer_count: "Estimated Customer Count",
      criteria_json: "Criteria",
      notes: "Notes",
      owner: "Owner",
      modified: "Modified",
    },
  },
```

- [ ] **Step 5: Add `templates` field labels**

```javascript
  templates: {
    tr: {
      name: "Kayıt",
      template_key: "Şablon Anahtarı",
      event_key: "Etkinlik Anahtarı",
      channel: "Kanal",
      language: "Dil",
      subject: "Konu",
      is_active: "Aktif",
      body_template: "Şablon İçeriği",
      owner: "Kayıt Sahibi",
      modified: "Güncellendi",
    },
    en: {
      name: "Record",
      template_key: "Template Key",
      event_key: "Event Key",
      channel: "Channel",
      language: "Language",
      subject: "Subject",
      is_active: "Active",
      body_template: "Template Body",
      owner: "Owner",
      modified: "Modified",
    },
  },
```

- [ ] **Step 6: Add `notification-drafts` field labels**

```javascript
  "notification-drafts": {
    tr: {
      name: "Kayıt",
      event_key: "Etkinlik Anahtarı",
      channel: "Kanal",
      customer: "Müşteri",
      recipient: "Alıcı",
      reference_doctype: "Referans Tipi",
      reference_name: "Referans Kayıt",
      template: "Şablon",
      status: "Durum",
      language: "Dil",
      subject: "Konu",
      body: "İçerik",
      outbox_record: "Giden Kayıt",
      sent_at: "Gönderim Tarihi",
      error_message: "Hata Mesajı",
      owner: "Kayıt Sahibi",
      modified: "Güncellendi",
    },
    en: {
      name: "Record",
      event_key: "Event Key",
      channel: "Channel",
      customer: "Customer",
      recipient: "Recipient",
      reference_doctype: "Reference Type",
      reference_name: "Reference Record",
      template: "Template",
      status: "Status",
      language: "Language",
      subject: "Subject",
      body: "Body",
      outbox_record: "Outbox Record",
      sent_at: "Sent At",
      error_message: "Error Message",
      owner: "Owner",
      modified: "Modified",
    },
  },
```

- [ ] **Step 7: Add `notification-outbox` field labels**

```javascript
  "notification-outbox": {
    tr: {
      name: "Kayıt",
      event_key: "Etkinlik Anahtarı",
      channel: "Kanal",
      customer: "Müşteri",
      recipient: "Alıcı",
      reference_doctype: "Referans Tipi",
      reference_name: "Referans Kayıt",
      provider: "Sağlayıcı",
      status: "Durum",
      priority: "Öncelik",
      attempt_count: "Deneme Sayısı",
      max_attempts: "Maks. Deneme",
      draft: "Taslak",
      next_retry_on: "Sonraki Deneme",
      last_attempt_on: "Son Deneme",
      provider_message_id: "Sağlayıcı Mesaj ID",
      error_message: "Hata Mesajı",
      response_log: "Yanıt Logu",
      owner: "Kayıt Sahibi",
      modified: "Güncellendi",
    },
    en: {
      name: "Record",
      event_key: "Event Key",
      channel: "Channel",
      customer: "Customer",
      recipient: "Recipient",
      reference_doctype: "Reference Type",
      reference_name: "Reference Record",
      provider: "Provider",
      status: "Status",
      priority: "Priority",
      attempt_count: "Attempt Count",
      max_attempts: "Max Attempts",
      draft: "Draft",
      next_retry_on: "Next Retry On",
      last_attempt_on: "Last Attempt On",
      provider_message_id: "Provider Message ID",
      error_message: "Error Message",
      response_log: "Response Log",
      owner: "Owner",
      modified: "Modified",
    },
  },
```

- [ ] **Step 8: Add `insured-assets` field labels**

```javascript
  "insured-assets": {
    tr: {
      name: "Kayıt",
      customer: "Müşteri",
      policy: "Poliçe",
      asset_type: "Varlık Türü",
      asset_label: "Varlık Etiketi",
      asset_identifier: "Varlık Tanımlayıcı",
      notes: "Notlar",
      owner: "Kayıt Sahibi",
      modified: "Güncellendi",
    },
    en: {
      name: "Record",
      customer: "Customer",
      policy: "Policy",
      asset_type: "Asset Type",
      asset_label: "Asset Label",
      asset_identifier: "Asset Identifier",
      notes: "Notes",
      owner: "Owner",
      modified: "Modified",
    },
  },
```

- [ ] **Step 9: Add `customer-relations` field labels**

```javascript
  "customer-relations": {
    tr: {
      name: "Kayıt",
      customer: "Müşteri",
      related_customer: "İlişkili Müşteri",
      relation_type: "İlişki Türü",
      is_household: "Hane Halkı",
      notes: "Notlar",
      owner: "Kayıt Sahibi",
      modified: "Güncellendi",
    },
    en: {
      name: "Record",
      customer: "Customer",
      related_customer: "Related Customer",
      relation_type: "Relation Type",
      is_household: "Household",
      notes: "Notes",
      owner: "Owner",
      modified: "Modified",
    },
  },
```

- [ ] **Step 10: Add `customer-segment-snapshots` field labels**

```javascript
  "customer-segment-snapshots": {
    tr: {
      name: "Kayıt",
      customer: "Müşteri",
      office_branch: "Ofis Şubesi",
      snapshot_date: "Snapshot Tarihi",
      segment: "Segment",
      value_band: "Değer Aralığı",
      claim_risk: "Hasar Riski",
      score: "Skor",
      source_version: "Kaynak Sürüm",
      owner: "Kayıt Sahibi",
      modified: "Güncellendi",
    },
    en: {
      name: "Record",
      customer: "Customer",
      office_branch: "Office Branch",
      snapshot_date: "Snapshot Date",
      segment: "Segment",
      value_band: "Value Band",
      claim_risk: "Claim Risk",
      score: "Score",
      source_version: "Source Version",
      owner: "Owner",
      modified: "Modified",
    },
  },
```

- [ ] **Step 11: Add `activities` field labels**

```javascript
  activities: {
    tr: {
      name: "Kayıt",
      activity_title: "Aktivite Başlığı",
      activity_type: "Aktivite Türü",
      source_doctype: "Kaynak Tipi",
      source_name: "Kaynak Kayıt",
      customer: "Müşteri",
      policy: "Poliçe",
      claim: "Hasar",
      office_branch: "Ofis Şubesi",
      assigned_to: "Atanan Kişi",
      status: "Durum",
      activity_at: "Aktivite Tarihi",
      notes: "Notlar",
      owner: "Kayıt Sahibi",
      modified: "Güncellendi",
    },
    en: {
      name: "Record",
      activity_title: "Activity Title",
      activity_type: "Activity Type",
      source_doctype: "Source Type",
      source_name: "Source Record",
      customer: "Customer",
      policy: "Policy",
      claim: "Claim",
      office_branch: "Office Branch",
      assigned_to: "Assigned To",
      status: "Status",
      activity_at: "Activity Date",
      notes: "Notes",
      owner: "Owner",
      modified: "Modified",
    },
  },
```

- [ ] **Step 12: Add `reminders` field labels**

```javascript
  reminders: {
    tr: {
      name: "Kayıt",
      reminder_title: "Hatırlatıcı Başlığı",
      source_doctype: "Kaynak Tipi",
      source_name: "Kaynak Kayıt",
      customer: "Müşteri",
      policy: "Poliçe",
      claim: "Hasar",
      office_branch: "Ofis Şubesi",
      assigned_to: "Atanan Kişi",
      status: "Durum",
      priority: "Öncelik",
      remind_at: "Hatırlatma Tarihi",
      completed_on: "Tamamlanma Tarihi",
      notes: "Notlar",
      owner: "Kayıt Sahibi",
      modified: "Güncellendi",
    },
    en: {
      name: "Record",
      reminder_title: "Reminder Title",
      source_doctype: "Source Type",
      source_name: "Source Record",
      customer: "Customer",
      policy: "Policy",
      claim: "Claim",
      office_branch: "Office Branch",
      assigned_to: "Assigned To",
      status: "Status",
      priority: "Priority",
      remind_at: "Remind At",
      completed_on: "Completed On",
      notes: "Notes",
      owner: "Owner",
      modified: "Modified",
    },
  },
```

- [ ] **Step 13: Run `npm run lint && npm run test:unit -- AuxRecordDetail` from frontend/ — expect PASS**
- [ ] **Step 14: Commit** `git commit -m "feat: add AUX_DETAIL_FIELD_LABELS for 10 aux doctypes"`

---

## Phase 2: Offer — çeviri anahtarları ve raw controls (HIGH)

**Files:** `frontend/src/config/offer_translations.js`, `frontend/src/pages/OfferBoard.vue`

- [ ] **Step 1: Add missing translation keys to `offer_translations.js`**

In the `tr` block, add after existing entries:
```javascript
    sortValidUntilAsc: "Geçerlilik (Artan)",
    sortValidUntilDesc: "Geçerlilik (Azalan)",
    sortGrossPrimaryDesc: "Prime Göre",
    presetConverted: "Dönüşenler",
    presetExpiring7: "7 Gün İçinde Bitecekler",
    colOffer: "Teklif",
    colCustomer: "Müşteri",
    colValidity: "Geçerlilik",
    colPremium: "Prim",
    colStatus: "Durum",
    customerSearchFailed: "Müşteri araması başarısız oldu",
    quickCreateValidationFailed: "Zorunlu alanları doldurun",
    quickOfferCreateFailed: "Teklif oluşturulamadı",
    conversionFailed: "Dönüşüm başarısız oldu",
    statusUpdateFailed: "Durum güncellenemedi",
    save_success: "Kaydedildi",
    save_failed: "Kaydedilemedi",
    no_recent_activity: "Son aktivite bulunamadı",
    upload: "Doküman Yükle",
    view_all_documents: "Tüm Dokümanları Gör",
    quickOfferTitle: "Hızlı Teklif",
    quickOfferSubtitle: "Yeni bir teklif oluşturun",
```

In the `en` block, add:
```javascript
    sortValidUntilAsc: "Validity (Ascending)",
    sortValidUntilDesc: "Validity (Descending)",
    sortGrossPrimaryDesc: "By Premium",
    presetConverted: "Converted",
    presetExpiring7: "Expiring in 7 Days",
    colOffer: "Offer",
    colCustomer: "Customer",
    colValidity: "Validity",
    colPremium: "Premium",
    colStatus: "Status",
    customerSearchFailed: "Customer search failed",
    quickCreateValidationFailed: "Please fill in required fields",
    quickOfferCreateFailed: "Failed to create offer",
    conversionFailed: "Conversion failed",
    statusUpdateFailed: "Status update failed",
    save_success: "Saved",
    save_failed: "Save failed",
    no_recent_activity: "No recent activity found",
    upload: "Upload Document",
    view_all_documents: "View All Documents",
    quickOfferTitle: "Quick Offer",
    quickOfferSubtitle: "Create a new offer",
```

- [ ] **Step 2: Also remove duplicate `refresh` key** at `offer_translations.js:103` (already exists at line 53) and consolidate `status_draft`/`statusDraft` into single key.

- [ ] **Step 3: Remove unused `import { ref } from "vue"`** if not used (check OfferBoard.vue)

- [ ] **Step 4: Run lint/tests — expect PASS**
- [ ] **Step 5: Commit** `git commit -m "fix: add 20 missing translation keys to offer_translations.js"`

---

## Phase 3: StatusBadge — hardcoded English değerleri düzelt (HIGH)

**Files:** `frontend/src/components/ui/StatusBadge.vue:280-284`

- [ ] **Step 1: Read StatusBadge.vue sales_entity_type en block**
        Change raw English strings to translation keys:
```javascript
  sales_entity_type: {
    active_bg: "bg-emerald-50",
    active_text: "text-emerald-700",
    active_label: t("valAgency") || "Agency",
    waiting_bg: "bg-amber-50",
    waiting_text: "text-amber-700",
    waiting_label: t("valRepresentative") || "Representative",
    draft_bg: "bg-slate-50",
    draft_text: "text-slate-700",
    draft_label: t("valSubAccount") || "Sub-Account",
  },
```

- [ ] **Step 2: Add values to aux_detail_translations.js**:
```javascript
    valAgency: "Acente",
    valRepresentative: "Temsilci",
    valSubAccount: "Alt Hesap",
```
And EN:
```javascript
    valAgency: "Agency",
    valRepresentative: "Representative",
    valSubAccount: "Sub-Account",
```

- [ ] **Step 3: Commit**

---

## Phase 4: Ad-hoc badge → StatusBadge (MEDIUM)

**Files:** `frontend/src/pages/CustomerDetail.vue`, `frontend/src/pages/PolicyDetail.vue`

- [ ] **Step 1: CustomerDetail.vue** — Replace 6 `<span class="badge badge-brand">` and `<span class="badge badge-blue">` instances with shared component pattern. These are count badges (tab counts, cross-sell tags, policy/offer/claim/document counts). Replace with simple count indicators using Tailwind classes that match the design system:
  - Line 62: tab count → `<span class="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-brand-50 text-brand-700 text-[11px] font-semibold px-1.5">{{ ... }}</span>`
  - Lines 128, 140, 171: cross-sell/policy/offer counts → same pattern
  - Line 202: claim count → `bg-blue-50 text-blue-700` → use `bg-slate-100 text-slate-700`
  - Line 286: private label → already uses inline rounded-full, replace with StatusBadge or labeled span

- [ ] **Step 2: PolicyDetail.vue:154,167** — Replace `<span class="badge badge-blue">` and `<span class="badge badge-amber">` with `StatusBadge` or inline count indicators.

- [ ] **Step 3: Commit**

---

## Phase 5: window.alert/prompt → ToastNotification (MEDIUM)

**Files:** `frontend/src/pages/CustomerDetail.vue:459`, `frontend/src/pages/ClaimDetail.vue:227`, `frontend/src/composables/useClaimsBoardRuntime.js:535`

- [ ] **Step 1: CustomerDetail.vue** — Replace `window.alert(t("file_link_not_found"))` with toast notification. Add a ref `const toastMessage = ref("")` and pass to existing `ToastNotification` in template.

- [ ] **Step 2: ClaimDetail.vue** — Same replacement for window.alert.

- [ ] **Step 3: useClaimsBoardRuntime.js** — Replace `window.prompt(t("rejectReasonPrompt"))` with a proper modal/dialog or inline input. Minimum: keep prompt but ensure key resolves. Add `rejectReasonPrompt` to `claim_translations.js`:
  ```javascript
  rejectReasonPrompt: "Ret sebebini girin" / "Enter rejection reason"
  ```

- [ ] **Step 4: Commit**

---

## Phase 6: Error/loading state fixes (MEDIUM)

**Files:** `frontend/src/pages/CustomerDetail.vue`, `frontend/src/pages/ClaimDetail.vue`

- [ ] **Step 1: CustomerDetail.vue** — Add error banner using `loadErrorText` computed already exported by `useCustomerDetailRuntime.js:46`. Add after loading section:
  ```html
  <div v-else-if="loadErrorText" class="qc-error-banner">
    <p>{{ t("load_error_title") }}</p>
    <p>{{ loadErrorText }}</p>
  </div>
  ```

- [ ] **Step 2: ClaimDetail.vue** — Add loading guard on main body content (`v-if="!loading"` on lines 32-129 wrapper). Add error state similar to step 1.

- [ ] **Step 3: Commit**

---

## Phase 7: Segment sidebar + registry fixes (LOW)

**Files:** `frontend/src/composables/useSidebarNavigation.js`, `frontend/src/config/sidebar_translations.js`, `frontend/src/config/auxWorkbench/registry.js`

- [ ] **Step 1: Add segments sidebar entry** in `useSidebarNavigation.js` under Communication section:
  ```javascript
  { key: "segments", label: t("segmentsSidebar"), route: { name: "segments-list" } },
  ```

- [ ] **Step 2: Add `segments` key** to `sidebar_translations.js` in both TR/EN blocks:
  ```javascript
  segmentsSidebar: "Segmentler" / "Segments"
  ```

- [ ] **Step 3: registry.js** — Remove dead duplicate `tasks` key (lines 14-42) or rename first entry to `"renewal-tasks"` and update references.

- [ ] **Step 4: registry.js** — Add `statusType: "segment_status"` to segments config (line 74 area).

- [ ] **Step 5: registry.js:524** — Remove `strengths_json`, `risks_json`, `score_reason_json` from `listFields` for `customer-segment-snapshots`.

- [ ] **Step 6: registry.js:520** — Fix Turkish typo: `"Müşteri Segment Snapshotları"` → `"Müşteri Segment Snapshot'ları"`

- [ ] **Step 7: Commit**

---

## Phase 8: Quick Create translation keys (LOW)

**Files:** `frontend/src/config/common_translations.js`

- [ ] **Step 1: Add missing quick create keys** for `quick_customer_relation`, `create_a_relationship_between_customers`, `quick_insured_asset`, `create_an_insured_asset_linked_to_a_customer`, `quick_segment`, `create_a_campaign_target_segment`, `quick_campaign`, `create_a_segment-based_campaign`:

```javascript
// TR
quick_customer_relation: "Yeni Müşteri İlişkisi",
create_a_relationship_between_customers: "İki müşteri arasında ilişki kaydı oluşturun",
quick_insured_asset: "Yeni Sigortalı Varlık",
create_an_insured_asset_linked_to_a_customer: "Müşteriye bağlı sigortalı varlık kaydı oluşturun",
quick_segment: "Yeni Segment",
create_a_campaign_target_segment: "Kampanya hedef segmenti oluşturun",
quick_campaign: "Yeni Kampanya",
create_a_segment_based_campaign: "Segment bazlı kampanya oluşturun",

// EN
quick_customer_relation: "New Customer Relation",
create_a_relationship_between_customers: "Create a relationship record between two customers",
quick_insured_asset: "New Insured Asset",
create_an_insured_asset_linked_to_a_customer: "Create a customer-linked insured asset record",
quick_segment: "New Segment",
create_a_campaign_target_segment: "Create a campaign target segment",
quick_campaign: "New Campaign",
create_a_segment_based_campaign: "Create a segment-based campaign",
```

- [ ] **Step 2: Commit**

---

## Phase 9: Insured Asset quickCreate — option labels (LOW)

**Files:** `frontend/src/config/quickCreate/registry.js:570-579`

- [ ] **Step 1: Fix hardcoded English option labels** for asset_type select. Change from `option("Vehicle", "Vehicle")` to bilingual pattern. Since the option() helper may not support locale objects, add the translations to `common_translations.js` keyed as `assetTypeVehicle` etc. and reference them.

  For now, minimum fix: add TR labels alongside EN:
```javascript
  // The options in registry.js can pass translateText-able values
  // Change option("Vehicle", "Vehicle") to use translated labels
```

- [ ] **Step 2: Commit**

---

## Phase 10: Final validation & deploy

- [ ] **Step 1: `npm run lint`** — expect PASS
- [ ] **Step 2: `npm run test:unit -- AuxRecordDetail`** — expect 18/18 PASS
- [ ] **Step 3: `npm run test:unit`** (full suite) — expect all pass
- [ ] **Step 4: `npm run build`** — expect success
- [ ] **Step 5: Commit all remaining changes**
- [ ] **Step 6: `git push origin main`**
- [ ] **Step 7: Deploy to production** (manual SSH: pull image, restart, migrate, clear-cache, smoke test)
