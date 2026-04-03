<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :show-record-count="false"
  >
    <template #actions>
      <ExportDataHeaderActions :t="t" @reset="resetForm" />
    </template>

    <ExportDataOptionsPanel :form="form" :screen-options="localizedScreenOptions" :t="t" />

    <ExportDataFiltersPanel :form="form" :t="t" />

    <ExportDataHistoryPanel :history-rows="historyRows" :t="t" />

    <ExportDataFooterActions :message="message" :t="t" @cancel="cancel" @export="downloadExport" />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";
import { useRouter } from "vue-router";
import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import { useExportDataRuntime } from "../composables/useExportDataRuntime";
import ExportDataHeaderActions from "../components/export-data/ExportDataHeaderActions.vue";
import ExportDataOptionsPanel from "../components/export-data/ExportDataOptionsPanel.vue";
import ExportDataFiltersPanel from "../components/export-data/ExportDataFiltersPanel.vue";
import ExportDataHistoryPanel from "../components/export-data/ExportDataHistoryPanel.vue";
import ExportDataFooterActions from "../components/export-data/ExportDataFooterActions.vue";

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

const activeLocale = computed(() => unref(authStore.locale) || "en");

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const runtime = useExportDataRuntime({ t, router, authStore });
const { form, message, historyRows, localizedScreenOptions, downloadExport, resetForm, cancel } = runtime;
</script>

