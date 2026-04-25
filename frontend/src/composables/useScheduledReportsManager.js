import { computed, reactive, ref, watch } from "vue";
import { translateText } from "../utils/i18n";

export function useScheduledReportsManager(props, emit) {
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
    alerts: [],
  });
  const formError = ref("");
  const recipientEmailRegex = /^\S+@\S+\.\S+$/;

  const reportOptions = computed(() =>
    Object.entries(props.reportCatalog || {}).map(([value, config]) => ({
      value,
      label: config?.label?.[props.locale] || config?.label?.en || value,
    })),
  );
  const visibleFilters = computed(() => new Set(reportFilterConfig[form.reportKey] || []));

  function t(key) {
    return translateText(key, props.locale);
  }

  function isFilterVisible(key) {
    return visibleFilters.value.has(key);
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
    form.alerts = [];
    formError.value = "";
  }

  function beginCreate() {
    resetForm();
    if (props.activeOfficeBranch && isFilterVisible("office_branch")) {
      form.filterOfficeBranch = props.activeOfficeBranch;
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
    form.alerts = Array.isArray(item.alerts) ? JSON.parse(JSON.stringify(item.alerts)) : [];
    formError.value = "";
  }

  function addAlert() {
    form.alerts.push({
      field: "",
      operator: ">",
      value: "",
      logic: "any"
    });
  }

  function removeAlert(idx) {
    form.alerts.splice(idx, 1);
  }

  function parseRecipients() {
    return form.recipients
      .split(/[,\n]/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function isRecipientListValid(recipient) {
    return recipientEmailRegex.test(recipient);
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

  function isValidReportKey(reportKey) {
    return Boolean(props.reportCatalog?.[reportKey]);
  }

  function reportLabel(reportKey) {
    return props.reportCatalog?.[reportKey]?.label?.[props.locale] || props.reportCatalog?.[reportKey]?.label?.en || reportKey;
  }

  function deliveryChannelLabel(value) {
    return value === "notification_outbox" ? t("delivery_outbox") : t("delivery_email");
  }

  function formatLastRun(value) {
    if (!value) {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    return new Intl.DateTimeFormat(props.locale === "tr" ? "tr-TR" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function lastStatusLabel(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "sent") return t("status_sent");
    if (normalized === "queued") return t("status_queued");
    if (normalized === "invalid") return t("status_invalid");
    if (normalized === "skipped") return t("status_skipped");
    return value ? String(value) : t("status_unknown");
  }

  function formatFilters(filtersPayload) {
    if (!filtersPayload || typeof filtersPayload !== "object") {
      return "-";
    }
    const entries = Object.entries(filtersPayload).filter(([, value]) => value !== null && value !== undefined && value !== "");
    if (!entries.length) {
      return "-";
    }
    return entries.map(([key, value]) => `${key}: ${value}`).join(" | ");
  }

  function submit() {
    try {
      const recipients = parseRecipients();
      if (!recipients.length) {
        throw new Error(t("recipients_error"));
      }
      if (!recipients.every(isRecipientListValid)) {
        const invalid = recipients.find((recipient) => !recipientEmailRegex.test(recipient));
        throw new Error(t("recipients_invalid").replace("{{value}}", invalid || ""));
      }
      if (!isValidReportKey(form.reportKey)) {
        throw new Error(t("report_key_error"));
      }
      if (!["daily", "weekly", "monthly"].includes(form.frequency)) {
        throw new Error(t("frequency_error"));
      }
      if (!["pdf", "xlsx"].includes(form.format)) {
        throw new Error(t("format_error"));
      }
      if (!["email", "notification_outbox"].includes(form.deliveryChannel)) {
        throw new Error(t("delivery_channel_error"));
      }
      if (!Number.isInteger(Number(form.limit)) || form.limit < 1) {
        throw new Error(t("limit_error"));
      }
      if (form.frequency === "weekly") {
        const normalizedWeekday = Number(form.weekday);
        if (!Number.isInteger(normalizedWeekday) || normalizedWeekday < 0 || normalizedWeekday > 6) {
          throw new Error(t("weekday_error"));
        }
      }
      if (form.frequency === "monthly") {
        const normalizedDay = Number(form.dayOfMonth);
        if (!Number.isInteger(normalizedDay) || normalizedDay < 1 || normalizedDay > 31) {
          throw new Error(t("day_of_month_error"));
        }
      }

      emit("save", {
        index: form.index,
        config: {
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
          alerts: form.alerts.filter(a => a.field && a.value)
        },
      });
      resetForm();
    } catch (error) {
      formError.value = String(error?.message || error || t("recipientsError"));
    }
  }

  function askRemove(item) {
    if (!window.confirm(t("remove_confirm"))) {
      return;
    }
    emit("remove", item.index);
  }

  watch(
    () => form.reportKey,
    () => {
      clearHiddenFilters();
      if (form.visible && props.activeOfficeBranch && isFilterVisible("office_branch") && !form.filterOfficeBranch) {
        form.filterOfficeBranch = props.activeOfficeBranch;
      }
    },
  );

  return {
    t,
    form,
    formError,
    reportOptions,
    beginCreate,
    beginEdit,
    resetForm,
    submit,
    askRemove,
    reportLabel,
    isFilterVisible,
    deliveryChannelLabel,
    formatLastRun,
    lastStatusLabel,
    formatFilters,
    addAlert,
    removeAlert,
  };
}
