<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :show-record-count="false"
  >
    <template #actions>
      <ImportDataActionsBar :can-import="canImport" :t="t" @cancel="cancel" @import="importData" />
    </template>

    <ImportDataStepSelectPanel
      v-model="selectedDataset"
      :localized-datasets="localizedDatasets"
      :file-name="fileName"
      :t="t"
      @file-select="handleFileSelect"
    />

    <ImportDataStepMappingPanel
      :columns="columns"
      :column-mapping="columnMapping"
      :selected-field-options="selectedFieldOptions"
      :t="t"
    />

    <ImportDataStepPreviewPanel
      :columns="columns"
      :preview-rows="previewRows"
      :import-message="importMessage"
      :t="t"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";
import { useRouter } from "vue-router";

import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import { useImportDataRuntime } from "../composables/useImportDataRuntime";
import ImportDataActionsBar from "../components/import-data/ImportDataActionsBar.vue";
import ImportDataStepMappingPanel from "../components/import-data/ImportDataStepMappingPanel.vue";
import ImportDataStepPreviewPanel from "../components/import-data/ImportDataStepPreviewPanel.vue";
import ImportDataStepSelectPanel from "../components/import-data/ImportDataStepSelectPanel.vue";

const router = useRouter();
const appPinia = getAppPinia();
const authStore = useAuthStore(appPinia);

const copy = {
  tr: {
    breadcrumb: "Veri Yönetimi → İçe Aktarma",
    title: "Veri İçe Aktarma",
    subtitle: "Excel/CSV dosyalarını eşleştirerek toplu veri yükleyin.",
    clear: "Temizle",
    step1Title: "1. Dosya Seç",
    step2Title: "2. Eşleştirme",
    step3Title: "3. Önizleme",
    datasetLabel: "Veri Kümesi",
    fileLabel: "Excel Dosyası",
    selectedFile: "Seçilen dosya",
    mappingEmpty: "Dosya seçildikten sonra kolonlar burada listelenir.",
    excelColumn: "Excel Kolonu",
    systemField: "Sistem Alanı",
    selectOption: "-- Seçiniz --",
    previewEmpty: "Önizleme verisi bulunamadı.",
    cancel: "İptal",
    importAction: "İçe Aktar",
    columnsMapped: "kolon eşleştirildi",
    importQueued: "İçe aktarma kuyruğa alındı.",
    xlsPreviewWarning:
      "XLS/XLSX önizleme tarayıcı tarafında sınırlı. Eşleştirmeyi tamamlayıp içe aktarma işlemini başlatabilirsiniz.",
    rowsPrefix: "Satır",
    policyLabel: "Poliçeler",
    offerLabel: "Teklifler",
    customerLabel: "Müşteriler",
    policyNo: "Poliçe No",
    customer: "Müşteri",
    branch: "Branş",
    grossPremium: "Brüt Prim",
    status: "Durum",
    offerNo: "Teklif No",
    insuranceCompany: "Sigorta Şirketi",
    fullName: "Ad Soyad",
    taxId: "Kimlik/Vergi No",
    mobilePhone: "Telefon",
    email: "E-posta",
    customerType: "Müşteri Tipi",
    csvCustomerHint: ["musteri", "customer"],
    csvOfferHint: ["teklif", "offer"],
    csvPolicyHint: ["polic", "poli"],
  },
  en: {
    breadcrumb: "Data Management → Import",
    title: "Data Import",
    subtitle: "Bulk-load data by matching Excel/CSV columns.",
    clear: "Clear",
    step1Title: "1. Choose File",
    step2Title: "2. Map Fields",
    step3Title: "3. Preview",
    datasetLabel: "Dataset",
    fileLabel: "Spreadsheet File",
    selectedFile: "Selected file",
    mappingEmpty: "Columns will appear here after a file is selected.",
    excelColumn: "Excel Column",
    systemField: "System Field",
    selectOption: "-- Select --",
    previewEmpty: "No preview data found.",
    cancel: "Cancel",
    importAction: "Import",
    columnsMapped: "columns mapped",
    importQueued: "Import queued.",
    xlsPreviewWarning:
      "XLS/XLSX preview is limited in the browser. Finish the mapping and start the import flow.",
    rowsPrefix: "Row",
    policyLabel: "Policies",
    offerLabel: "Offers",
    customerLabel: "Customers",
    policyNo: "Policy No",
    customer: "Customer",
    branch: "Branch",
    grossPremium: "Gross Premium",
    status: "Status",
    offerNo: "Offer No",
    insuranceCompany: "Insurance Company",
    fullName: "Full Name",
    taxId: "ID/Tax No",
    mobilePhone: "Phone",
    email: "Email",
    customerType: "Customer Type",
    csvCustomerHint: ["customer", "client"],
    csvOfferHint: ["offer", "quote"],
    csvPolicyHint: ["policy"],
  },
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const activeLocale = computed(() => unref(authStore.locale) || "en");

const runtime = useImportDataRuntime({ t, router, authStore });
const {
  selectedDataset,
  localizedDatasets,
  fileName,
  columns,
  previewRows,
  importMessage,
  columnMapping,
  selectedFieldOptions,
  canImport,
  handleFileSelect,
  importData,
  cancel,
} = runtime;
</script>
