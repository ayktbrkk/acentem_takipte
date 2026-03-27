import { computed, unref } from "vue";

import { buildOfficeBranchOptions } from "../utils/officeBranchTree";
import { openTabularExport } from "../utils/listExport";

function humanizeField(field) {
  return String(field || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

const AUX_FIELD_VALUE_LABELS = {
  tr: {
    Synced: "Senkron",
    Draft: "Taslak",
    Failed: "Başarısız",
    Claim: "Hasar",
    Policy: "Poliçe",
    Payment: "Ödeme",
    Resolved: "Çözüldü",
    Open: "Açık",
    Ignored: "Yoksayıldı",
    Amount: "Tutar",
    Currency: "Döviz",
    "Missing External": "Harici Kayıt Eksik",
    "Missing Local": "Yerel Kayıt Eksik",
    Status: "Durum",
    Other: "Diğer",
    Matched: "Eşleşti",
    Adjusted: "Düzeltildi",
    "Manual Override": "Manuel Geçersiz Kılma",
    "AT Policy": "Poliçe",
    "AT Claim": "Hasar",
    "AT Payment": "Ödeme",
    "AT Customer": "Müşteri",
    "AT Accounting Entry": "Muhasebe Kaydı",
    Agency: "Acente",
    Representative: "Temsilci",
    "Sub-Account": "Alt Hesap",
    Both: "Her İkisi",
    tr: "Türkçe",
    en: "İngilizce",
  },
  en: {},
};

const AUX_FIELD_LABELS = {
  "notification-outbox": {
    tr: { name: "Kayıt", customer: "Müşteri", recipient: "Alıcı", provider: "Sağlayıcı", reference_name: "Referans Kayıt", attempt_count: "Deneme Sayısı", next_retry_on: "Sonraki Deneme", owner: "Kayıt Sahibi", modified: "Güncellendi" },
    en: { name: "Record", customer: "Customer", recipient: "Recipient", provider: "Provider", reference_name: "Reference Record", attempt_count: "Attempt Count", next_retry_on: "Next Retry", owner: "Owner", modified: "Modified" },
  },
  companies: {
    tr: { name: "Kayıt", company_code: "Şirket Kodu", owner: "Oluşturan", modified: "Güncellendi" },
    en: { name: "Record", company_code: "Company Code", owner: "Owner", modified: "Modified" },
  },
  branches: {
    tr: { name: "Kayıt", branch_code: "Branş Kodu", insurance_company: "Sigorta Şirketi", modified: "Güncellendi" },
    en: { name: "Record", branch_code: "Branch Code", insurance_company: "Insurance Company", modified: "Modified" },
  },
  "sales-entities": {
    tr: { name: "Kayıt", parent_entity: "Üst Birim", entity_type: "Birim Türü", modified: "Güncellendi" },
    en: { name: "Record", parent_entity: "Parent Entity", entity_type: "Entity Type", modified: "Modified" },
  },
  templates: {
    tr: { name: "Kayıt", event_key: "Olay Anahtarı", subject: "Konu", language: "Dil", modified: "Güncellendi" },
    en: { name: "Record", event_key: "Event Key", subject: "Subject", language: "Language", modified: "Modified" },
  },
  "accounting-entries": {
    tr: { name: "Kayıt", source_doctype: "Kaynak Tipi", source_name: "Kaynak Kaydı", policy: "Poliçe", customer: "Müşteri", local_amount_try: "Yerel Tutar (TRY)", external_amount_try: "Harici Tutar (TRY)", difference_try: "Fark (TRY)", local_amount: "Yerel Tutar", external_amount: "Harici Tutar", status: "Durum", entry_type: "Kayıt Türü", insurance_company: "Sigorta Şirketi", external_ref: "Harici Referans", needs_reconciliation: "Mutabakat Gerekli", last_synced_on: "Son Senkron", sync_attempt_count: "Senkron Denemesi", payload_json: "Payload (JSON)", error_message: "Hata Mesajı", currency: "Döviz", accounting_entry: "Muhasebe Kaydı", owner: "Kayıt Sahibi", modified: "Güncellendi" },
    en: { name: "Record", source_doctype: "Source DocType", source_name: "Source Record", policy: "Policy", customer: "Customer", local_amount_try: "Local Amount (TRY)", external_amount_try: "External Amount (TRY)", difference_try: "Difference (TRY)", local_amount: "Local Amount", external_amount: "External Amount", status: "Status", entry_type: "Entry Type", insurance_company: "Insurance Company", external_ref: "External Reference", needs_reconciliation: "Needs Reconciliation", last_synced_on: "Last Synced", sync_attempt_count: "Sync Attempts", payload_json: "Payload (JSON)", error_message: "Error Message", currency: "Currency", accounting_entry: "Accounting Entry", owner: "Owner", modified: "Modified" },
  },
  "reconciliation-items": {
    tr: { name: "Kayıt", accounting_entry: "Muhasebe Kaydı", source_doctype: "Kaynak Tipi", source_name: "Kaynak Kaydı", mismatch_type: "Uyumsuzluk Tipi", difference_try: "Fark (TRY)", local_amount_try: "Yerel Tutar (TRY)", external_amount_try: "Harici Tutar (TRY)", resolution_action: "Çözüm İşlemi", resolved_by: "Çözen Kullanıcı", resolved_on: "Çözüm Tarihi", unique_key: "Benzersiz Anahtar", notes: "Notlar", details_json: "Ham JSON", status: "Durum", owner: "Kayıt Sahibi", modified: "Güncellendi" },
    en: { name: "Record", accounting_entry: "Accounting Entry", source_doctype: "Source DocType", source_name: "Source Record", mismatch_type: "Mismatch Type", difference_try: "Difference (TRY)", local_amount_try: "Local Amount (TRY)", external_amount_try: "External Amount (TRY)", resolution_action: "Resolution Action", resolved_by: "Resolved By", resolved_on: "Resolved On", unique_key: "Unique Key", notes: "Notes", details_json: "Raw JSON", status: "Status", owner: "Owner", modified: "Modified" },
  },
};

function currentLocale(activeLocale) {
  return String(unref(activeLocale) || "en").trim() || "en";
}

function resolveLocaleCode(localeCode) {
  return String(unref(localeCode) || "en-US").trim() || "en-US";
}

function translateFieldValue(value, activeLocale) {
  const key = String(value ?? "");
  return AUX_FIELD_VALUE_LABELS[currentLocale(activeLocale)]?.[key] || key;
}

function normalizeBoolStatus(v) {
  if (v === true || String(v) === "1") return "1";
  if (v === false || String(v) === "0") return "0";
  return String(v ?? "");
}

function isFieldType(config, field, typeName) {
  const list = config?.[`${typeName}Fields`] || [];
  return list.includes(field);
}

function parseSignalEntries(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      return parseSignalEntries(JSON.parse(value));
    } catch {
      return value
        .split(/\r?\n/)
        .map((entry) => entry.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean);
    }
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, entry]) => `${humanizeField(key)}: ${entry}`)
      .filter(Boolean);
  }
  return [String(value)];
}

export function useAuxWorkbenchViewModel({
  activeLocale,
  localeCode,
  config,
  filters,
  pagination,
  rows,
  snapshotRows,
  accessLogRows,
  fileRows,
  reminderRows,
  authStore,
  branchStore,
  auxQuickCreate,
  auxQuickCustomerResource,
  auxQuickPolicyResource,
  auxQuickTemplateResource,
  auxQuickInsuranceCompanyResource,
  auxQuickSalesEntityResource,
  auxQuickAccountingEntryResource,
}) {
  function localize(v) {
    if (!v) return "";
    if (typeof v === "string") return v;
    const locale = currentLocale(activeLocale);
    return v[locale] || v.en || v.tr || "";
  }

  function t(key) {
    const locale = currentLocale(activeLocale);
    return copy[locale]?.[key] || copy.en[key] || key;
  }

  const copy = {
    tr: {
      recordCount: "kayıt",
      filtersTitle: "Filtreler",
      refresh: "Yenile",
      advanced: "Gelişmiş Filtreler",
      hideAdvanced: "Gelişmiş Filtreleri Gizle",
      activeFilters: "aktif filtre",
      preset: "Filtre Şablonu",
      presetDefault: "Standart",
      apply: "Uygula",
      reset: "Temizle",
      savePreset: "Kaydet",
      deletePreset: "Sil",
      savePresetPrompt: "Şablon adı",
      deletePresetConfirm: "Bu özel şablon silinsin mi?",
      searchPlaceholder: "Kayıtlarda ara...",
      loading: "Kayıtlar yükleniyor...",
      loadErrorTitle: "Kayıtlar Yüklenemedi",
      emptyTitle: "Kayıt bulunamadı",
      emptyDescription: "Filtreleri güncelleyip tekrar deneyin.",
      showing: "Gösterilen",
      record: "Kayıt",
      details: "Detaylar",
      status: "Durum",
      info: "Bilgiler",
      actions: "Aksiyon",
      exportCsv: "CSV Dışa Aktar",
      exportXlsx: "Excel",
      exportPdf: "PDF",
      totalSnapshots: "Toplam Snapshot",
      highRiskSnapshots: "Yüksek Risk",
      highValueSnapshots: "Yüksek Değer",
      averageScore: "Ortalama Skor",
      totalAuditEvents: "Toplam Kayıt",
      totalReminders: "Toplam Hatırlatıcı",
      openReminders: "Açık",
      overdueReminders: "Geciken",
      highPriorityReminders: "Yüksek Öncelik",
      createEvents: "Oluşturma",
      editEvents: "Düzenleme",
      deleteEvents: "Silme",
      runEvents: "Çalıştırma",
      totalFiles: "Toplam Dosya",
      pdfFiles: "PDF",
      imageFiles: "Görseller",
      spreadsheetFiles: "E-Tablolar",
      attachedCustomers: "Müşteri Ekleri",
      attachedPolicies: "Poliçe Ekleri",
      attachedClaims: "Hasar Ekleri",
      snapshotTrendTitle: "Snapshot Eğilimi",
      snapshotTrendHint: "Görünen kayıtlardaki son üç snapshot gününü özetler",
      snapshotWindowHint: "Geçerli filtre penceresindeki kayıtlar",
      highRiskHint: "Hasar riski yüksek kayıtlar",
      highValueHint: "Yüksek veya premium değer bandındaki kayıtlar",
      averageScoreHint: "Filtrelenen kayıtların ortalama skoru",
      auditWindowHint: "Geçerli filtre penceresindeki audit kayıtları",
      reminderWindowHint: "Geçerli filtre penceresindeki hatırlatıcılar",
      openRemindersHint: "Açık durumundaki hatırlatıcılar",
      overdueRemindersHint: "Hatırlatma zamanı geçmiş açık kayıtlar",
      highPriorityRemindersHint: "Yüksek öncelikli açık hatırlatıcılar",
      createEventsHint: "Oluşturma aksiyonları",
      editEventsHint: "Düzenleme aksiyonları",
      deleteEventsHint: "Silme aksiyonları",
      runEventsHint: "Çalıştırma aksiyonları",
      filesWindowHint: "Geçerli filtre penceresindeki dosyalar",
      pdfFilesHint: "PDF biçimindeki belgeler",
      imageFilesHint: "Görsel dosyalar",
      spreadsheetFilesHint: "E-tablo belgeleri",
      attachedCustomersHint: "AT Customer kayıtlarına ekli dosyalar",
      attachedPoliciesHint: "AT Policy kayıtlarına ekli dosyalar",
      attachedClaimsHint: "AT Claim kayıtlarına ekli dosyalar",
      newRecord: "Yeni Kayıt",
      openDetail: "Kayıt Detayını Aç",
      openDesk: "Yönetim Ekranını Aç",
      panel: "Panel",
      openCommunication: "İletişim Merkezini Aç",
      sendNow: "Hemen Gönder",
      retry: "Tekrar Dene",
      requeue: "Kuyruğa Al",
      startTask: "Takibe Al",
      blockTaskAction: "Bloke Et",
      completeTaskAction: "Tamamla",
      cancelTaskAction: "İptal",
      running: "Çalışıyor...",
      page: "Sayfa",
      prev: "Önceki",
      next: "Sonraki",
    },
    en: {
      recordCount: "records",
      filtersTitle: "Filters",
      refresh: "Refresh",
      advanced: "Advanced Filters",
      hideAdvanced: "Hide Advanced",
      activeFilters: "active filters",
      preset: "Filter Preset",
      presetDefault: "Standard",
      apply: "Apply",
      reset: "Reset",
      savePreset: "Save",
      deletePreset: "Delete",
      savePresetPrompt: "Preset name",
      deletePresetConfirm: "Delete this custom preset?",
      searchPlaceholder: "Search records...",
      loading: "Loading records...",
      loadErrorTitle: "Failed to Load",
      emptyTitle: "No records found",
      emptyDescription: "Adjust filters and try again.",
      showing: "Showing",
      record: "Record",
      details: "Details",
      status: "Status",
      info: "Info",
      actions: "Actions",
      exportCsv: "Export CSV",
      exportXlsx: "Excel",
      exportPdf: "PDF",
      totalSnapshots: "Total Snapshots",
      highRiskSnapshots: "High Risk",
      highValueSnapshots: "High Value",
      averageScore: "Average Score",
      totalAuditEvents: "Total Audit Events",
      totalReminders: "Total Reminders",
      openReminders: "Open",
      overdueReminders: "Overdue",
      highPriorityReminders: "High Priority",
      createEvents: "Create",
      editEvents: "Edit",
      deleteEvents: "Delete",
      runEvents: "Run",
      totalFiles: "Total Files",
      pdfFiles: "PDF",
      imageFiles: "Images",
      spreadsheetFiles: "Spreadsheets",
      attachedCustomers: "Customer Attached",
      attachedPolicies: "Policy Attached",
      attachedClaims: "Claim Attached",
      snapshotTrendTitle: "Snapshot Trend",
      snapshotTrendHint: "Summarizes the latest three snapshot days from visible records",
      snapshotWindowHint: "Records in the current filtered window",
      highRiskHint: "Records where claim risk is High",
      highValueHint: "Records with High or Premium value band",
      averageScoreHint: "Average score for filtered records",
      auditWindowHint: "Audit events in the current filtered window",
      reminderWindowHint: "Reminders in the current filtered window",
      openRemindersHint: "Reminders with Open status",
      overdueRemindersHint: "Open reminders whose remind time has passed",
      highPriorityRemindersHint: "Open reminders with High priority",
      createEventsHint: "Create actions",
      editEventsHint: "Edit actions",
      deleteEventsHint: "Delete actions",
      runEventsHint: "Run actions",
      filesWindowHint: "Files in the current filtered window",
      pdfFilesHint: "Documents in PDF format",
      imageFilesHint: "Image files",
      spreadsheetFilesHint: "Spreadsheet documents",
      attachedCustomersHint: "Files attached to AT Customer records",
      attachedPoliciesHint: "Files attached to AT Policy records",
      attachedClaimsHint: "Files attached to AT Claim records",
      newRecord: "New Record",
      openDetail: "Open Record Details",
      openDesk: "Open Desk",
      panel: "Panel",
      openCommunication: "Communication Center",
      sendNow: "Send Now",
      retry: "Retry",
      requeue: "Requeue",
      startTask: "Start",
      blockTaskAction: "Block",
      completeTaskAction: "Mark Done",
      cancelTaskAction: "Cancel",
      running: "Running...",
      page: "Page",
      prev: "Previous",
      next: "Next",
    },
  };

  function label(kind) {
    return localize(config?.labels?.[kind]);
  }

  function sortLabel(orderBy) {
    const [field, dir] = String(orderBy || "").split(/\s+/);
    const base = fieldLabel(field);
    const suffix = String(dir || "").toLowerCase() === "asc"
      ? currentLocale(activeLocale) === "tr" ? "artan" : "asc"
      : currentLocale(activeLocale) === "tr" ? "azalan" : "desc";
    return `${base} (${suffix})`;
  }

  function fieldLabel(field) {
    const locale = currentLocale(activeLocale);
    const localized = AUX_FIELD_LABELS[config?.key]?.[locale]?.[field] || AUX_FIELD_LABELS[config?.key]?.en?.[field];
    return localized || humanizeField(field);
  }

  function optionLabel(fd, opt) {
    const locale = currentLocale(activeLocale);
    if (opt === "") return locale === "tr" ? "Tümü" : "All";
    if (fd.field === "is_active") {
      if (String(opt) === "1") return locale === "tr" ? "Aktif" : "Active";
      if (String(opt) === "0") return locale === "tr" ? "Pasif" : "Inactive";
    }
    return translateFieldValue(opt, activeLocale);
  }

  function statusValue(row, field, type) {
    const raw = row?.[field];
    if (type === "boolean_active") return normalizeBoolStatus(raw);
    return String(raw ?? "");
  }

  function formatSignalSummary(value, field) {
    const entries = parseSignalEntries(value);
    if (!entries.length) return "-";
    const first = entries[0];
    const count = entries.length;
    if (field === "score_reason_json") {
      return count > 1 ? `${first} (+${count - 1})` : first;
    }
    const locale = currentLocale(activeLocale);
    const prefix =
      field === "strengths_json"
        ? locale === "tr" ? "Güçlü" : "Strengths"
        : locale === "tr" ? "Risk" : "Risks";
    return `${prefix}: ${count}`;
  }

  function formatField(value, field) {
    if (value == null || value === "") return "-";
    if (["strengths_json", "risks_json", "score_reason_json"].includes(field)) {
      return formatSignalSummary(value, field);
    }
    const locale = currentLocale(activeLocale);
    const lc = resolveLocaleCode(localeCode);
    if (isFieldType(config, field, "bool")) {
      const active = value === true || String(value) === "1";
      return active ? (locale === "tr" ? "Evet" : "Yes") : (locale === "tr" ? "Hayır" : "No");
    }
    if (isFieldType(config, field, "currency")) {
      const n = Number(value);
      if (!Number.isFinite(n)) return String(value);
      return new Intl.NumberFormat(lc, { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n);
    }
    if (isFieldType(config, field, "number")) {
      const n = Number(value);
      return Number.isFinite(n) ? new Intl.NumberFormat(lc).format(n) : String(value);
    }
    if (isFieldType(config, field, "date")) {
      try { return new Intl.DateTimeFormat(lc, { dateStyle: "short" }).format(new Date(value)); } catch { return String(value); }
    }
    if (isFieldType(config, field, "dateTime")) {
      try { return new Intl.DateTimeFormat(lc, { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); } catch { return String(value); }
    }
    if (["modified", "creation", "resolved_on", "sent_at", "next_retry_on", "last_attempt_on"].includes(field)) {
      try { return new Intl.DateTimeFormat(lc, { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); } catch { /* noop */ }
    }
    if (["due_date", "renewal_date", "policy_end_date"].includes(field)) {
      try { return new Intl.DateTimeFormat(lc, { dateStyle: "short" }).format(new Date(value)); } catch { /* noop */ }
    }
    if (["status", "entry_type", "source_doctype", "mismatch_type", "resolution_action"].includes(field)) {
      return translateFieldValue(value, activeLocale);
    }
    return String(value);
  }

  function toCsvValue(value) {
    const normalized = value == null ? "" : String(value);
    if (normalized.includes(",") || normalized.includes("\"") || normalized.includes("\n")) {
      return `"${normalized.replace(/"/g, "\"\"")}"`;
    }
    return normalized;
  }

  function factItems(row, fields) {
    return (fields || [])
      .filter((field) => row?.[field] !== undefined && row?.[field] !== null && row?.[field] !== "")
      .map((field) => ({ label: fieldLabel(field), value: formatField(row[field], field) }));
  }

  function rowTitle(row) {
    return String(row?.[config?.titleField] || row?.name || "-");
  }

  const subtitleLabel = computed(() => localize(config?.subtitle));
  const toolbarActions = computed(() => (Array.isArray(config?.toolbarActions) ? config.toolbarActions : []));
  const visibleToolbarActions = computed(() =>
    toolbarActions.value.filter((action) => {
      const capabilityPath = action?.capabilityPath;
      if (!capabilityPath) return true;
      return authStore.can(capabilityPath);
    })
  );
  const canLaunchAuxQuickCreate = computed(() => {
    const registryKey = auxQuickCreate.value?.registryKey;
    if (!registryKey) return false;
    return authStore.can(["quickCreate", registryKey]);
  });
  const auxQuickCreateEyebrow = computed(() => localize(auxQuickCreate.value?.label) || t("newRecord"));
  const quickFilterDefs = computed(() => (config?.filterDefs || []).slice(0, 2));
  const advancedFilterDefs = computed(() => (config?.filterDefs || []).slice(2));
  const sortOptions = computed(() =>
    (config?.sortOptions || ["modified desc"]).map((value) =>
      typeof value === "string" ? { value, label: sortLabel(value) } : { value: value.value, label: localize(value.label) }
    )
  );
  const auxQuickOptionsMap = computed(() => ({
    customers: asArray(auxQuickCustomerResource?.data?.value || auxQuickCustomerResource?.data).map((row) => ({
      value: row.name,
      label: row.full_name || row.name,
    })),
    policies: asArray(auxQuickPolicyResource?.data?.value || auxQuickPolicyResource?.data).map((row) => ({
      value: row.name,
      label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
    })),
    notificationTemplates: asArray(auxQuickTemplateResource?.data?.value || auxQuickTemplateResource?.data).map((row) => ({
      value: row.name,
      label: `${row.template_key || row.name}${row.channel ? ` (${row.channel})` : ""}`,
    })),
    insuranceCompanies: asArray(auxQuickInsuranceCompanyResource?.data?.value || auxQuickInsuranceCompanyResource?.data).map((row) => ({
      value: row.name,
      label: `${row.company_name || row.name}${row.company_code ? ` (${row.company_code})` : ""}`,
    })),
    salesEntities: asArray(auxQuickSalesEntityResource?.data?.value || auxQuickSalesEntityResource?.data).map((row) => ({
      value: row.name,
      label: `${row.full_name || row.name}${row.entity_type ? ` (${row.entity_type})` : ""}`,
    })),
    officeBranches: buildOfficeBranchOptions(asArray(branchStore.items), { locale: currentLocale(activeLocale) }).map((row) => ({
      value: row.value,
      label: row.label,
    })),
    accountingEntries: asArray(auxQuickAccountingEntryResource?.data?.value || auxQuickAccountingEntryResource?.data).map((row) => ({
      value: row.name,
      label: `${row.name}${row.source_doctype ? ` (${row.source_doctype})` : ""}`,
    })),
  }));

  const snapshotSummaryCards = computed(() => {
    if (config?.key !== "customer-segment-snapshots") return [];
    const total = snapshotRows.value.length;
    const highRisk = snapshotRows.value.filter((row) => String(row?.claim_risk || "").toLowerCase() === "high").length;
    const highValue = snapshotRows.value.filter((row) => {
      const valueBand = String(row?.value_band || "").toLowerCase();
      return valueBand === "high" || valueBand === "premium";
    }).length;
    const scored = snapshotRows.value.map((row) => Number(row?.score)).filter((value) => Number.isFinite(value));
    const averageScore = scored.length ? Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length) : 0;
    return [
      { key: "total", label: t("totalSnapshots"), value: String(total), hint: t("snapshotWindowHint") },
      { key: "high-risk", label: t("highRiskSnapshots"), value: String(highRisk), hint: t("highRiskHint") },
      { key: "high-value", label: t("highValueSnapshots"), value: String(highValue), hint: t("highValueHint") },
      { key: "avg-score", label: t("averageScore"), value: String(averageScore), hint: t("averageScoreHint") },
    ];
  });
  const snapshotTrendRows = computed(() => {
    if (config?.key !== "customer-segment-snapshots") return [];
    const grouped = new Map();
    for (const row of snapshotRows.value) {
      const snapshotDate = String(row?.snapshot_date || "").trim();
      if (!snapshotDate) continue;
      if (!grouped.has(snapshotDate)) {
        grouped.set(snapshotDate, { total: 0, highRisk: 0, scoreSum: 0, scoreCount: 0 });
      }
      const bucket = grouped.get(snapshotDate);
      bucket.total += 1;
      if (String(row?.claim_risk || "").toLowerCase() === "high") bucket.highRisk += 1;
      const score = Number(row?.score);
      if (Number.isFinite(score)) {
        bucket.scoreSum += score;
        bucket.scoreCount += 1;
      }
    }
    return [...grouped.entries()]
      .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
      .slice(0, 3)
      .map(([snapshotDate, bucket]) => ({
        snapshotDate,
        snapshotDateLabel: formatField(snapshotDate, "snapshot_date"),
        total: bucket.total,
        highRisk: bucket.highRisk,
        averageScore: bucket.scoreCount ? Math.round(bucket.scoreSum / bucket.scoreCount) : 0,
      }));
  });
  const accessLogSummaryCards = computed(() => {
    if (config?.key !== "access-logs") return [];
    const actions = accessLogRows.value.map((row) => String(row?.action || "").trim().toLowerCase());
    const countByAction = (action) => actions.filter((value) => value === action).length;
    return [
      { key: "total-audit", label: t("totalAuditEvents"), value: String(accessLogRows.value.length), hint: t("auditWindowHint") },
      { key: "create-audit", label: t("createEvents"), value: String(countByAction("create")), hint: t("createEventsHint") },
      { key: "edit-audit", label: t("editEvents"), value: String(countByAction("edit")), hint: t("editEventsHint") },
      { key: "delete-audit", label: t("deleteEvents"), value: String(countByAction("delete")), hint: t("deleteEventsHint") },
      { key: "run-audit", label: t("runEvents"), value: String(countByAction("run")), hint: t("runEventsHint") },
    ];
  });
  const reminderSummaryCards = computed(() => {
    if (config?.key !== "reminders") return [];
    const openRows = reminderRows.value.filter((row) => String(row?.status || "").trim() === "Open");
    const now = Date.now();
    const overdueRows = openRows.filter((row) => {
      const remindAt = row?.remind_at;
      if (!remindAt) return false;
      const value = new Date(remindAt).getTime();
      return Number.isFinite(value) && value < now;
    });
    const highPriorityRows = openRows.filter((row) => String(row?.priority || "").trim() === "High");
    return [
      { key: "total-reminders", label: t("totalReminders"), value: String(reminderRows.value.length), hint: t("reminderWindowHint") },
      { key: "open-reminders", label: t("openReminders"), value: String(openRows.length), hint: t("openRemindersHint") },
      { key: "overdue-reminders", label: t("overdueReminders"), value: String(overdueRows.length), hint: t("overdueRemindersHint") },
      { key: "high-reminders", label: t("highPriorityReminders"), value: String(highPriorityRows.length), hint: t("highPriorityRemindersHint") },
    ];
  });
  const fileSummaryCards = computed(() => {
    if (config?.key !== "files") return [];
    const total = fileRows.value.length;
    const byType = (matcher) => fileRows.value.filter((row) => matcher(String(row?.file_type || "").toLowerCase())).length;
    const byDoctype = (doctype) => fileRows.value.filter((row) => String(row?.attached_to_doctype || "").trim() === doctype).length;
    return [
      { key: "total-files", label: t("totalFiles"), value: String(total), hint: t("filesWindowHint") },
      { key: "pdf-files", label: t("pdfFiles"), value: String(byType((v) => v.includes("pdf"))), hint: t("pdfFilesHint") },
      { key: "image-files", label: t("imageFiles"), value: String(byType((v) => v.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].some((token) => v.includes(token)))), hint: t("imageFilesHint") },
      { key: "spreadsheet-files", label: t("spreadsheetFiles"), value: String(byType((v) => ["sheet", "excel", "csv", "xls", "xlsx"].some((token) => v.includes(token)))), hint: t("spreadsheetFilesHint") },
      { key: "customer-files", label: t("attachedCustomers"), value: String(byDoctype("AT Customer")), hint: t("attachedCustomersHint") },
      { key: "policy-files", label: t("attachedPolicies"), value: String(byDoctype("AT Policy")), hint: t("attachedPoliciesHint") },
      { key: "claim-files", label: t("attachedClaims"), value: String(byDoctype("AT Claim")), hint: t("attachedClaimsHint") },
    ];
  });

  function currentPresetPayload() {
    const payload = {
      query: filters.query,
      sort: filters.sort,
      pageLength: pagination.pageLength,
    };
    for (const fd of config?.filterDefs || []) {
      payload[fd.key] = String(filters[fd.key] ?? "").trim();
    }
    return payload;
  }

  function exportSnapshotRows() {
    if (!(config?.key === "customer-segment-snapshots" && snapshotRows.value.length > 0)) return;
    const columns = [
      ["customer", "Customer"],
      ["snapshot_date", "Snapshot Date"],
      ["segment", "Segment"],
      ["value_band", "Value Band"],
      ["claim_risk", "Claim Risk"],
      ["score", "Score"],
      ["source_version", "Source Version"],
      ["strengths_json", "Strength Summary"],
      ["risks_json", "Risk Summary"],
      ["score_reason_json", "Score Reason Summary"],
    ];
    const lines = [
      columns.map(([, label]) => toCsvValue(label)).join(","),
      ...snapshotRows.value.map((row) =>
        columns
          .map(([field]) => toCsvValue(formatField(row?.[field], field)))
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `customer-segment-snapshots-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function downloadAuxExport(format) {
    const exportFields = Array.from(
      new Set([
        config.titleField,
        ...(config.listFields || []),
      ].filter(Boolean))
    );
    const columns = exportFields.map((field) => fieldLabel(field));
    const exportedRows = rows.value.map((row) =>
      Object.fromEntries(
        exportFields.map((field) => [fieldLabel(field), formatField(row?.[field], field)])
      )
    );
    openTabularExport({
      permissionDoctypes: [config.doctype],
      exportKey: `aux_${config.key}`,
      title: label("list"),
      columns,
      rows: exportedRows,
      filters: currentPresetPayload(),
      format,
    });
  }

  return {
    t,
    localize,
    label,
    fieldLabel,
    optionLabel,
    statusValue,
    formatField,
    factItems,
    rowTitle,
    subtitleLabel,
    toolbarActions,
    visibleToolbarActions,
    canLaunchAuxQuickCreate,
    auxQuickCreateEyebrow,
    quickFilterDefs,
    advancedFilterDefs,
    sortOptions,
    auxQuickOptionsMap,
    snapshotSummaryCards,
    snapshotTrendRows,
    accessLogSummaryCards,
    reminderSummaryCards,
    fileSummaryCards,
    currentPresetPayload,
    exportSnapshotRows,
    downloadAuxExport,
  };
}
