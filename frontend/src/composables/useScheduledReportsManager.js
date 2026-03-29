import { computed, reactive, ref, watch } from "vue";

const reportFilterConfig = {
  policy_list: ["office_branch", "branch", "insurance_company", "status", "from_date", "to_date"],
  payment_status: ["office_branch", "branch", "insurance_company", "status", "from_date", "to_date"],
  renewal_performance: ["office_branch", "branch", "sales_entity", "status", "from_date", "to_date"],
  claim_loss_ratio: ["office_branch", "branch", "insurance_company", "status", "from_date", "to_date"],
  agent_performance: ["office_branch", "branch", "sales_entity", "from_date", "to_date"],
  customer_segmentation: ["office_branch", "branch"],
  communication_operations: ["office_branch", "status", "from_date", "to_date"],
  reconciliation_operations: ["office_branch", "status", "from_date", "to_date"],
  claims_operations: ["office_branch", "branch", "insurance_company", "status", "from_date", "to_date"],
};

const copy = {
  tr: {
    title: "Zamanlanmış Raporlar",
    subtitle: "Site konfigürasyonu ile tanımlı rapor teslimleri",
    run: "Zamanlanmis Raporlari Çalıştır",
    new: "Yeni Kural",
    loading: "Raporlar yükleniyor...",
    empty: "Tanımlı zamanlanmış rapor yok.",
    recipients: "Alıcılar",
    filters: "Filtreler",
    frequency: "Frekans",
    format: "Format",
    limit: "Limit",
    deliveryChannel: "Teslim Kanalı",
    deliveryEmail: "Doğrudan E-posta",
    deliveryOutbox: "Notification Outbox",
    lastRun: "Son Çalışma",
    lastStatus: "Son Durum",
    statusSent: "Gönderildi",
    statusQueued: "Kuyruğa Alındı",
    statusInvalid: "Geçersiz",
    statusSkipped: "Atlandı",
    statusUnknown: "Bilinmiyor",
    enabled: "Etkin",
    disabled: "Pasif",
    edit: "Düzenle",
    remove: "Sil",
    createTitle: "Yeni Zamanlanmış Rapor",
    editTitle: "Zamanlanmış Raporu Düzenle",
    cancel: "İptal",
    save: "Kaydet",
    reportKey: "Rapor",
    weekday: "Haftanın Günü",
    dayOfMonth: "Ayın Günü",
    officeBranch: "Ofis Şube",
    insuranceBranch: "Sigorta Branşı",
    insuranceCompany: "Sigorta Şirketi",
    salesEntity: "Satış Birimi",
    status: "Durum",
    fromDate: "Başlangıç Tarihi",
    toDate: "Bitiş Tarihi",
    recipientsPlaceholder: "ops@example.com, manager@example.com",
    recipientsError: "En az bir alıcı girilmelidir.",
    recipientsInvalid: "Geçersiz alıcı adresi: {{value}}",
    frequencyError: "Geçerli frekans seçilmelidir.",
    weekdayError: "Haftalık rapor için 0-6 arasında hafta günü girin (0=Pazar, 6=Cumartesi).",
    dayOfMonthError: "Aylık rapor için 1-31 arasında ay günü girin.",
    limitError: "Limit en az 1 olmalıdır.",
    reportKeyError: "Rapor seçilmelidir.",
    formatError: "Geçerli format seçilmelidir.",
    deliveryChannelError: "Teslim kanalı geçersiz.",
    filterPrefix: "Filtre: ",
    removeConfirm: "Bu zamanlanmış rapor kaydını silmek istediğinize emin misiniz?",
  },
  en: {
    title: "Scheduled Reports",
    subtitle: "Report deliveries defined in site config",
    run: "Run Scheduled Reports",
    new: "New Rule",
    loading: "Loading scheduled reports...",
    empty: "No scheduled reports configured.",
    recipients: "Recipients",
    filters: "Filters",
    frequency: "Frequency",
    format: "Format",
    limit: "Limit",
    deliveryChannel: "Delivery Channel",
    deliveryEmail: "Direct Email",
    deliveryOutbox: "Notification Outbox",
    lastRun: "Last Run",
    lastStatus: "Last Status",
    statusSent: "Sent",
    statusQueued: "Queued",
    statusInvalid: "Invalid",
    statusSkipped: "Skipped",
    statusUnknown: "Unknown",
    enabled: "Enabled",
    disabled: "Disabled",
    edit: "Edit",
    remove: "Remove",
    createTitle: "New Scheduled Report",
    editTitle: "Edit Scheduled Report",
    cancel: "Cancel",
    save: "Save",
    reportKey: "Report",
    weekday: "Weekday",
    dayOfMonth: "Day of Month",
    officeBranch: "Office Branch",
    insuranceBranch: "Insurance Branch",
    insuranceCompany: "Insurance Company",
    salesEntity: "Sales Entity",
    status: "Status",
    fromDate: "From Date",
    toDate: "To Date",
    recipientsPlaceholder: "ops@example.com, manager@example.com",
    recipientsError: "At least one recipient is required.",
    recipientsInvalid: "Invalid recipient email: {{value}}",
    frequencyError: "Select a valid frequency.",
    weekdayError: "For weekly reports, weekday must be 0-6 (0=Sunday, 6=Saturday).",
    dayOfMonthError: "For monthly reports, day of month must be 1-31.",
    limitError: "Limit must be at least 1.",
    reportKeyError: "Please select a report.",
    formatError: "Select a valid format.",
    deliveryChannelError: "Invalid delivery channel.",
    filterPrefix: "Filter: ",
    removeConfirm: "Are you sure you want to delete this scheduled report?",
  },
};

export function useScheduledReportsManager({ locale, reportCatalog, activeOfficeBranch, emitSave, emitRemove }) {
  const form = reactive({
    visible: false,
    index: null,
    enabled: true,
    reportKey: "policy_list",
    frequency: "daily",
    format: "xlsx",
    deliveryChannel: "email",
    recipients: "",
    limit: 1000,
    weekday: 0,
    dayOfMonth: 1,
    filterOfficeBranch: "",
    filterBranch: "",
    filterInsuranceCompany: "",
    filterSalesEntity: "",
    filterStatus: "",
    filterFromDate: "",
    filterToDate: "",
  });

  const formError = ref("");
  const recipientEmailRegex = /^\S+@\S+\.\S+$/;

  function t(key) {
    return copy[locale]?.[key] || copy.en[key] || key;
  }

  const reportOptions = computed(() =>
    Object.entries(reportCatalog || {}).map(([value, config]) => ({
      value,
      label: config?.label?.[locale] || config?.label?.en || value,
    })),
  );
  const visibleFilters = computed(() => new Set(reportFilterConfig[form.reportKey] || []));

  function isValidReportKey(reportKey) {
    return Boolean(reportCatalog?.[reportKey]);
  }

  function isFilterVisible(key) {
    return visibleFilters.value.has(key);
  }

  function resetForm() {
    form.visible = false;
    form.index = null;
    form.enabled = true;
    form.reportKey = "policy_list";
    form.frequency = "daily";
    form.format = "xlsx";
    form.deliveryChannel = "email";
    form.recipients = "";
    form.limit = 1000;
    form.weekday = 0;
    form.dayOfMonth = 1;
    form.filterOfficeBranch = "";
    form.filterBranch = "";
    form.filterInsuranceCompany = "";
    form.filterSalesEntity = "";
    form.filterStatus = "";
    form.filterFromDate = "";
    form.filterToDate = "";
    formError.value = "";
  }

  function beginCreate() {
    resetForm();
    if (activeOfficeBranch && isFilterVisible("office_branch")) {
      form.filterOfficeBranch = activeOfficeBranch;
    }
    form.visible = true;
  }

  function beginEdit(item) {
    form.visible = true;
    form.index = item.index;
    form.enabled = Boolean(item.enabled);
    form.reportKey = item.report_key || "policy_list";
    form.frequency = item.frequency || "daily";
    form.format = item.format || "xlsx";
    form.deliveryChannel = item.delivery_channel || "email";
    form.recipients = Array.isArray(item.recipients) ? item.recipients.join(", ") : "";
    form.limit = Number(item.limit || 1000);
    form.weekday = Number(item.weekday || 0);
    form.dayOfMonth = Number(item.day_of_month || 1);
    form.filterOfficeBranch = String(item.filters?.office_branch || "");
    form.filterBranch = String(item.filters?.branch || "");
    form.filterInsuranceCompany = String(item.filters?.insurance_company || "");
    form.filterSalesEntity = String(item.filters?.sales_entity || "");
    form.filterStatus = String(item.filters?.status || "");
    form.filterFromDate = String(item.filters?.from_date || "");
    form.filterToDate = String(item.filters?.to_date || "");
    formError.value = "";
  }

  function parseRecipients() {
    return form.recipients
      .split(/[,\n]/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function buildFilters() {
    const next = {};
    if (isFilterVisible("office_branch") && form.filterOfficeBranch) next.office_branch = form.filterOfficeBranch;
    if (isFilterVisible("branch") && form.filterBranch) next.branch = form.filterBranch;
    if (isFilterVisible("insurance_company") && form.filterInsuranceCompany) next.insurance_company = form.filterInsuranceCompany;
    if (isFilterVisible("sales_entity") && form.filterSalesEntity) next.sales_entity = form.filterSalesEntity;
    if (isFilterVisible("status") && form.filterStatus) next.status = form.filterStatus;
    if (isFilterVisible("from_date") && form.filterFromDate) next.from_date = form.filterFromDate;
    if (isFilterVisible("to_date") && form.filterToDate) next.to_date = form.filterToDate;
    return next;
  }

  function clearHiddenFilters() {
    if (!isFilterVisible("office_branch")) form.filterOfficeBranch = "";
    if (!isFilterVisible("branch")) form.filterBranch = "";
    if (!isFilterVisible("insurance_company")) form.filterInsuranceCompany = "";
    if (!isFilterVisible("sales_entity")) form.filterSalesEntity = "";
    if (!isFilterVisible("status")) form.filterStatus = "";
    if (!isFilterVisible("from_date")) form.filterFromDate = "";
    if (!isFilterVisible("to_date")) form.filterToDate = "";
  }

  function submit() {
    try {
      const recipients = parseRecipients();
      if (!recipients.length) {
        throw new Error(t("recipientsError"));
      }
      if (!recipients.every((recipient) => recipientEmailRegex.test(recipient))) {
        const invalid = recipients.find((recipient) => !recipientEmailRegex.test(recipient));
        throw new Error(t("recipientsInvalid").replace("{{value}}", invalid || ""));
      }
      if (!isValidReportKey(form.reportKey)) {
        throw new Error(t("reportKeyError"));
      }
      if (!["daily", "weekly", "monthly"].includes(form.frequency)) {
        throw new Error(t("frequencyError"));
      }
      if (!["pdf", "xlsx"].includes(form.format)) {
        throw new Error(t("formatError"));
      }
      if (!["email", "notification_outbox"].includes(form.deliveryChannel)) {
        throw new Error(t("deliveryChannelError"));
      }
      if (!Number.isInteger(Number(form.limit)) || form.limit < 1) {
        throw new Error(t("limitError"));
      }
      if (form.frequency === "weekly") {
        const normalizedWeekday = Number(form.weekday);
        if (!Number.isInteger(normalizedWeekday) || normalizedWeekday < 0 || normalizedWeekday > 6) {
          throw new Error(t("weekdayError"));
        }
      }
      if (form.frequency === "monthly") {
        const normalizedDay = Number(form.dayOfMonth);
        if (!Number.isInteger(normalizedDay) || normalizedDay < 1 || normalizedDay > 31) {
          throw new Error(t("dayOfMonthError"));
        }
      }

      const config = {
        enabled: form.enabled ? 1 : 0,
        report_key: form.reportKey,
        frequency: form.frequency,
        format: form.format,
        delivery_channel: form.deliveryChannel,
        recipients,
        filters: buildFilters(),
        limit: Number(form.limit || 1000),
        weekday: Number(form.weekday || 0),
        day_of_month: Number(form.dayOfMonth || 1),
      };
      emitSave?.({ index: form.index, config });
      resetForm();
    } catch (error) {
      formError.value = String(error?.message || error || t("recipientsError"));
    }
  }

  function askRemove(item) {
    if (!window.confirm(t("removeConfirm"))) {
      return;
    }
    emitRemove?.(item.index);
  }

  function reportLabel(reportKey) {
    return reportCatalog?.[reportKey]?.label?.[locale] || reportCatalog?.[reportKey]?.label?.en || reportKey;
  }

  function deliveryChannelLabel(value) {
    return value === "notification_outbox" ? t("deliveryOutbox") : t("deliveryEmail");
  }

  function formatLastRun(value) {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function lastStatusLabel(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "sent") return t("statusSent");
    if (normalized === "queued") return t("statusQueued");
    if (normalized === "invalid") return t("statusInvalid");
    if (normalized === "skipped") return t("statusSkipped");
    return value ? String(value) : t("statusUnknown");
  }

  function formatFilters(filtersPayload) {
    if (!filtersPayload || typeof filtersPayload !== "object") {
      return "-";
    }
    const entries = Object.entries(filtersPayload).filter(([, value]) => value !== null && value !== undefined && value !== "");
    if (!entries.length) {
      return "-";
    }
    return entries.map(([key, value]) => `${t("filterPrefix")}${key}: ${value}`).join(" | ");
  }

  watch(
    () => form.reportKey,
    () => {
      clearHiddenFilters();
      if (form.visible && activeOfficeBranch && isFilterVisible("office_branch") && !form.filterOfficeBranch) {
        form.filterOfficeBranch = activeOfficeBranch;
      }
    },
  );

  return {
    form,
    formError,
    reportOptions,
    visibleFilters,
    t,
    isFilterVisible,
    resetForm,
    beginCreate,
    beginEdit,
    submit,
    askRemove,
    reportLabel,
    deliveryChannelLabel,
    formatLastRun,
    lastStatusLabel,
    formatFilters,
  };
}
