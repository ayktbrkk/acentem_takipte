<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :show-record-count="false"
  >
    <template #actions>
      <button class="btn btn-outline btn-sm" type="button" @click="resetForm">{{ t("reset") }}</button>
    </template>

    <SectionPanel :title="t('step1Title')" panel-class="surface-card rounded-2xl p-5">
      <div class="grid gap-4 md:grid-cols-3">
        <div class="form-field">
          <label class="form-label">{{ t("datasetLabel") }}</label>
          <select v-model="form.screen" class="form-input">
            <option v-for="option in screenOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>

        <div class="form-field">
          <label class="form-label">{{ t("formatLabel") }}</label>
          <select v-model="form.format" class="form-input">
            <option value="xlsx">{{ t("formatXlsx") }}</option>
            <option value="pdf">{{ t("formatPdf") }}</option>
            <option value="csv">{{ t("formatCsv") }}</option>
          </select>
        </div>

        <div class="form-field">
          <label class="form-label">{{ t("filenameLabel") }}</label>
          <input v-model="form.filename" class="form-input" type="text" :placeholder="t('filenamePlaceholder')" />
        </div>
      </div>
    </SectionPanel>

    <SectionPanel :title="t('step2Title')" panel-class="surface-card rounded-2xl p-5">
      <div class="grid gap-4 md:grid-cols-3">
        <div class="form-field">
          <label class="form-label">{{ t("startDateLabel") }}</label>
          <input v-model="form.startDate" class="form-input" type="date" />
        </div>

        <div class="form-field">
          <label class="form-label">{{ t("endDateLabel") }}</label>
          <input v-model="form.endDate" class="form-input" type="date" />
        </div>

        <div class="form-field">
          <label class="form-label">{{ t("statusLabel") }}</label>
          <select v-model="form.status" class="form-input">
            <option value="">{{ t("allStatuses") }}</option>
            <option value="Draft">{{ t("statusDraft") }}</option>
            <option value="Active">{{ t("statusActive") }}</option>
            <option value="Open">{{ t("statusOpen") }}</option>
            <option value="Closed">{{ t("statusClosed") }}</option>
          </select>
        </div>
      </div>
    </SectionPanel>

    <SectionPanel :title="t('step3Title')" panel-class="surface-card rounded-2xl p-5">
      <div v-if="!historyRows.length" class="card-empty">{{ t("historyEmpty") }}</div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr>
              <th class="table-header">{{ t("historyDate") }}</th>
              <th class="table-header">{{ t("historyDataset") }}</th>
              <th class="table-header">{{ t("historyFormat") }}</th>
              <th class="table-header">{{ t("historyFile") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in historyRows" :key="row.id">
              <td class="table-cell">{{ row.date }}</td>
              <td class="table-cell">{{ row.screenLabel }}</td>
              <td class="table-cell">{{ row.format.toUpperCase() }}</td>
              <td class="table-cell">{{ row.filename }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </SectionPanel>

    <div class="flex justify-end gap-2">
      <button class="btn btn-outline" type="button" @click="cancel">{{ t("cancel") }}</button>
      <button class="btn btn-primary" type="button" @click="downloadExport">{{ t("exportAction") }}</button>
    </div>

    <p v-if="message" class="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
      {{ message }}
    </p>
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, reactive, ref, unref } from "vue";
import { useRouter } from "vue-router";
import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";

const router = useRouter();
const appPinia = getAppPinia();
const authStore = useAuthStore(appPinia);

const copy = {
  tr: {
    breadcrumb: "Veri Yönetimi → Dışa Aktarma",
    title: "Veri Dışa Aktarma",
    subtitle: "Raporlama ve analiz için sistem verilerini farklı formatlarda indirin.",
    reset: "Sıfırla",
    step1Title: "1. Veri Kümesi ve Format",
    step2Title: "2. Filtreler",
    step3Title: "3. Son İşlemler",
    datasetLabel: "Veri Kümesi",
    formatLabel: "Format",
    formatXlsx: "Excel (XLSX)",
    formatPdf: "PDF",
    formatCsv: "CSV",
    filenameLabel: "Dosya Adı",
    filenamePlaceholder: "örnek: policy_export",
    startDateLabel: "Başlangıç Tarihi",
    endDateLabel: "Bitiş Tarihi",
    statusLabel: "Durum",
    allStatuses: "Tüm Durumlar",
    statusDraft: "Taslak",
    statusActive: "Aktif",
    statusOpen: "Açık",
    statusClosed: "Kapalı",
    historyEmpty: "Henüz dışa aktarma kaydı bulunmuyor.",
    historyDate: "Tarih",
    historyDataset: "Veri Kümesi",
    historyFormat: "Format",
    historyFile: "Dosya",
    cancel: "İptal",
    exportAction: "Dışa Aktar",
    exportStarted: "Dışa aktarma işlemi başlatıldı.",
    screenDashboard: "Pano",
    screenPolicies: "Poliçeler",
    screenOffers: "Teklifler",
    screenCustomers: "Müşteriler",
    screenClaims: "Hasarlar",
    screenPayments: "Ödemeler",
    screenRenewals: "Yenilemeler",
    screenNoLabel: "Kayıt",
  },
  en: {
    breadcrumb: "Data Management → Export",
    title: "Data Export",
    subtitle: "Download system data in different formats for reporting and analysis.",
    reset: "Reset",
    step1Title: "1. Dataset and Format",
    step2Title: "2. Filters",
    step3Title: "3. Recent Exports",
    datasetLabel: "Dataset",
    formatLabel: "Format",
    formatXlsx: "Excel (XLSX)",
    formatPdf: "PDF",
    formatCsv: "CSV",
    filenameLabel: "File Name",
    filenamePlaceholder: "example: policy_export",
    startDateLabel: "Start Date",
    endDateLabel: "End Date",
    statusLabel: "Status",
    allStatuses: "All Statuses",
    statusDraft: "Draft",
    statusActive: "Active",
    statusOpen: "Open",
    statusClosed: "Closed",
    historyEmpty: "No export history yet.",
    historyDate: "Date",
    historyDataset: "Dataset",
    historyFormat: "Format",
    historyFile: "File",
    cancel: "Cancel",
    exportAction: "Export",
    exportStarted: "Export started.",
    screenDashboard: "Dashboard",
    screenPolicies: "Policies",
    screenOffers: "Offers",
    screenCustomers: "Customers",
    screenClaims: "Claims",
    screenPayments: "Payments",
    screenRenewals: "Renewals",
    screenNoLabel: "Record",
  },
};

const activeLocale = computed(() => unref(authStore.locale) || "tr");

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const screenOptions = [
  { value: "dashboard", labelKey: "screenDashboard" },
  { value: "policy_list", labelKey: "screenPolicies" },
  { value: "offer_list", labelKey: "screenOffers" },
  { value: "customer_list", labelKey: "screenCustomers" },
  { value: "claims_board", labelKey: "screenClaims" },
  { value: "payments_board", labelKey: "screenPayments" },
  { value: "renewals_board", labelKey: "screenRenewals" },
];

const localizedScreenOptions = computed(() =>
  screenOptions.map((option) => ({
    value: option.value,
    label: t(option.labelKey),
  })),
);

const form = reactive({
  screen: "policy_list",
  format: "xlsx",
  filename: "",
  startDate: "",
  endDate: "",
  status: "",
});

const message = ref("");
const historyRows = ref([]);

function buildExportUrl() {
  const params = new URLSearchParams({
    screen: form.screen,
    format: form.format,
  });

  if (form.filename) params.set("filename", form.filename);
  if (form.startDate) params.set("start_date", form.startDate);
  if (form.endDate) params.set("end_date", form.endDate);
  if (form.status) params.set("status", form.status);

  return `/api/method/acentem_takipte.api.list_exports.download_export?${params.toString()}`;
}

function addHistory() {
  const screenLabel = localizedScreenOptions.value.find((option) => option.value === form.screen)?.label || t("screenNoLabel");
  const filename = form.filename || `${form.screen}_${new Date().toISOString().slice(0, 10)}`;
  historyRows.value = [
    {
      id: `${Date.now()}`,
      date: new Intl.DateTimeFormat(activeLocale.value === "tr" ? "tr-TR" : "en-US", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date()),
      screenLabel,
      format: form.format,
      filename,
    },
    ...historyRows.value,
  ].slice(0, 8);
}

function downloadExport() {
  const url = buildExportUrl();
  window.open(url, "_blank", "noopener,noreferrer");
  addHistory();
  message.value = t("exportStarted");
}

function resetForm() {
  form.screen = "policy_list";
  form.format = "xlsx";
  form.filename = "";
  form.startDate = "";
  form.endDate = "";
  form.status = "";
  message.value = "";
}

function cancel() {
  router.push({ name: "dashboard" });
}
</script>
