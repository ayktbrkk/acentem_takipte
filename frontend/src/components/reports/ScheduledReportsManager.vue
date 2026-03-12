<template>
  <article class="surface-card rounded-2xl p-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-slate-900">{{ t("title") }}</h3>
        <p class="mt-1 text-sm text-slate-500">{{ t("subtitle") }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          :disabled="loading || running"
          @click="$emit('run')"
        >
          {{ t("run") }}
        </button>
        <button
          type="button"
          class="rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 transition hover:border-sky-400 hover:text-sky-900"
          :disabled="loading || running"
          @click="beginCreate"
        >
          {{ t("new") }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="mt-4 text-sm text-slate-500">
      {{ t("loading") }}
    </div>

    <div v-else-if="!items.length" class="mt-4 text-sm text-slate-500">
      {{ t("empty") }}
    </div>

    <div v-else class="mt-4 grid gap-3 xl:grid-cols-2">
      <article
        v-for="item in items"
        :key="`scheduled-${item.index}-${item.report_key}`"
        class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="text-sm font-semibold text-slate-900">
            {{ reportLabel(item.report_key) }}
          </div>
          <span
            class="rounded-full px-2.5 py-1 text-[11px] font-medium"
            :class="item.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'"
          >
            {{ item.enabled ? t("enabled") : t("disabled") }}
          </span>
        </div>

        <dl class="mt-3 space-y-2 text-sm text-slate-600">
          <div class="flex items-start justify-between gap-3">
            <dt class="font-medium text-slate-500">{{ t("frequency") }}</dt>
            <dd class="text-right">{{ item.frequency }}</dd>
          </div>
          <div class="flex items-start justify-between gap-3">
            <dt class="font-medium text-slate-500">{{ t("format") }}</dt>
            <dd class="text-right">{{ item.format }}</dd>
          </div>
          <div class="flex items-start justify-between gap-3">
            <dt class="font-medium text-slate-500">{{ t("deliveryChannel") }}</dt>
            <dd class="text-right">{{ deliveryChannelLabel(item.delivery_channel) }}</dd>
          </div>
          <div class="flex items-start justify-between gap-3">
            <dt class="font-medium text-slate-500">{{ t("limit") }}</dt>
            <dd class="text-right">{{ item.limit }}</dd>
          </div>
          <div class="flex items-start justify-between gap-3">
            <dt class="font-medium text-slate-500">{{ t("lastRun") }}</dt>
            <dd class="text-right">{{ formatLastRun(item.last_run_at) }}</dd>
          </div>
          <div class="flex items-start justify-between gap-3">
            <dt class="font-medium text-slate-500">{{ t("lastStatus") }}</dt>
            <dd class="text-right">{{ lastStatusLabel(item.last_status) }}</dd>
          </div>
          <div class="flex items-start justify-between gap-3">
            <dt class="font-medium text-slate-500">{{ t("recipients") }}</dt>
            <dd class="max-w-[65%] text-right break-words">{{ item.recipients?.join(", ") || "-" }}</dd>
          </div>
          <div class="flex items-start justify-between gap-3">
            <dt class="font-medium text-slate-500">{{ t("filters") }}</dt>
            <dd class="max-w-[65%] text-right break-words">{{ formatFilters(item.filters) }}</dd>
          </div>
        </dl>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            :disabled="loading || running"
            @click="beginEdit(item)"
          >
            {{ t("edit") }}
          </button>
          <button
            type="button"
            class="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-400 hover:text-rose-900"
            :disabled="loading || running"
            @click="askRemove(item)"
          >
            {{ t("remove") }}
          </button>
        </div>
      </article>
    </div>

    <form v-if="form.visible" class="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4" @submit.prevent="submit">
      <div class="flex items-center justify-between gap-3">
        <h4 class="text-sm font-semibold text-slate-900">
          {{ form.index ? t("editTitle") : t("createTitle") }}
        </h4>
        <button type="button" class="text-sm text-slate-500 transition hover:text-slate-800" @click="resetForm">
          {{ t("cancel") }}
        </button>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <label class="space-y-1">
          <span class="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{{ t("reportKey") }}</span>
          <select v-model="form.reportKey" class="input">
            <option v-for="option in reportOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="space-y-1">
          <span class="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{{ t("frequency") }}</span>
          <select v-model="form.frequency" class="input">
            <option value="daily">daily</option>
            <option value="weekly">weekly</option>
            <option value="monthly">monthly</option>
          </select>
        </label>

        <label class="space-y-1">
          <span class="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{{ t("format") }}</span>
          <select v-model="form.format" class="input">
            <option value="xlsx">xlsx</option>
            <option value="pdf">pdf</option>
          </select>
        </label>

        <label class="space-y-1">
          <span class="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{{ t("deliveryChannel") }}</span>
          <select v-model="form.deliveryChannel" class="input">
            <option value="email">{{ t("deliveryEmail") }}</option>
            <option value="notification_outbox">{{ t("deliveryOutbox") }}</option>
          </select>
        </label>

        <label class="space-y-1">
          <span class="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{{ t("limit") }}</span>
          <input v-model.number="form.limit" class="input" type="number" min="1" step="1" />
        </label>

        <label v-if="form.frequency === 'weekly'" class="space-y-1">
          <span class="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{{ t("weekday") }}</span>
          <input v-model.number="form.weekday" class="input" type="number" min="0" max="6" step="1" />
        </label>

        <label v-if="form.frequency === 'monthly'" class="space-y-1">
          <span class="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{{ t("dayOfMonth") }}</span>
          <input v-model.number="form.dayOfMonth" class="input" type="number" min="1" max="31" step="1" />
        </label>

        <label class="flex items-center gap-2 pt-6 text-sm text-slate-700">
          <input v-model="form.enabled" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
          <span>{{ t("enabled") }}</span>
        </label>
      </div>

      <label class="space-y-1">
        <span class="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{{ t("recipients") }}</span>
        <textarea
          v-model.trim="form.recipients"
          class="input min-h-24"
          :placeholder="t('recipientsPlaceholder')"
        />
      </label>

      <div class="space-y-2">
        <span class="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{{ t("filters") }}</span>
        <div class="grid gap-3 md:grid-cols-2">
          <label v-if="isFilterVisible('office_branch')" class="space-y-1">
            <span class="text-xs text-slate-500">{{ t("officeBranch") }}</span>
            <input v-model.trim="form.filterOfficeBranch" class="input" type="search" />
          </label>
          <label v-if="isFilterVisible('branch')" class="space-y-1">
            <span class="text-xs text-slate-500">{{ t("insuranceBranch") }}</span>
            <input v-model.trim="form.filterBranch" class="input" type="search" />
          </label>
          <label v-if="isFilterVisible('insurance_company')" class="space-y-1">
            <span class="text-xs text-slate-500">{{ t("insuranceCompany") }}</span>
            <input v-model.trim="form.filterInsuranceCompany" class="input" type="search" />
          </label>
          <label v-if="isFilterVisible('sales_entity')" class="space-y-1">
            <span class="text-xs text-slate-500">{{ t("salesEntity") }}</span>
            <input v-model.trim="form.filterSalesEntity" class="input" type="search" />
          </label>
          <label v-if="isFilterVisible('status')" class="space-y-1">
            <span class="text-xs text-slate-500">{{ t("status") }}</span>
            <input v-model.trim="form.filterStatus" class="input" type="search" />
          </label>
          <label v-if="isFilterVisible('from_date')" class="space-y-1">
            <span class="text-xs text-slate-500">{{ t("fromDate") }}</span>
            <input v-model="form.filterFromDate" class="input" type="date" />
          </label>
          <label v-if="isFilterVisible('to_date')" class="space-y-1">
            <span class="text-xs text-slate-500">{{ t("toDate") }}</span>
            <input v-model="form.filterToDate" class="input" type="date" />
          </label>
        </div>
      </div>

      <p v-if="formError" class="text-sm text-rose-600">
        {{ formError }}
      </p>

      <div class="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          class="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          @click="resetForm"
        >
          {{ t("cancel") }}
        </button>
          <button
            type="submit"
            class="rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 transition hover:border-sky-400 hover:text-sky-900"
          >
            {{ t("save") }}
        </button>
      </div>
    </form>
  </article>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  running: {
    type: Boolean,
    default: false,
  },
  locale: {
    type: String,
    default: "tr",
  },
  reportCatalog: {
    type: Object,
    default: () => ({}),
  },
  activeOfficeBranch: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["run", "save", "remove"]);

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
    frequencyError: "Geçerli frekans secilmelidir.",
    weekdayError: "Haftalık rapor için 0-6 arasında hafta günü girin (0=Pazar, 6=Cumartesi).",
    dayOfMonthError: "Aylık rapor için 1-31 arasında ay günü girin.",
    limitError: "Limit en az 1 olmalıdır.",
    reportKeyError: "Rapor secilmelidir.",
    formatError: "Geçerli format seçilmelidir.",
    deliveryChannelError: "Teslim kanali gecersiz.",
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

function t(key) {
  return copy[props.locale]?.[key] || copy.en[key] || key;
}

const reportOptions = computed(() =>
  Object.entries(props.reportCatalog || {}).map(([value, config]) => ({
    value,
    label: config?.label?.[props.locale] || config?.label?.en || value,
  })),
);
const visibleFilters = computed(() => new Set(reportFilterConfig[form.reportKey] || []));

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
const recipientEmailRegex = /^\\S+@\\S+\\.\\S+$/;

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
  formError.value = "";
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

function submit() {
  try {
    const recipients = parseRecipients();
    if (!recipients.length) {
      throw new Error(t("recipientsError"));
    }
    if (!recipients.every(isRecipientListValid)) {
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

    const filters = buildFilters();
    const config = {
      enabled: form.enabled ? 1 : 0,
      report_key: form.reportKey,
      frequency: form.frequency,
      format: form.format,
      delivery_channel: form.deliveryChannel,
      recipients,
      filters,
      limit: Number(form.limit || 1000),
      weekday: Number(form.weekday || 0),
      day_of_month: Number(form.dayOfMonth || 1),
    };
    emit("save", { index: form.index, config });
    resetForm();
  } catch (error) {
    formError.value = String(error?.message || error || t("recipientsError"));
  }
}

function askRemove(item) {
  if (!window.confirm(t("removeConfirm"))) {
    return;
  }
  emit("remove", item.index);
}

function reportLabel(reportKey) {
  return props.reportCatalog?.[reportKey]?.label?.[props.locale] || props.reportCatalog?.[reportKey]?.label?.en || reportKey;
}

function isValidReportKey(reportKey) {
  return Boolean(props.reportCatalog?.[reportKey]);
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
  return entries.map(([key, value]) => `${key}: ${value}`).join(" | ");
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
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>
