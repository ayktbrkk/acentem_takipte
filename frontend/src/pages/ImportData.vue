<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :show-record-count="false"
  >
    <template #actions>
      <div class="flex items-center gap-2">
        <ActionButton
          v-if="canCancelImport"
          variant="secondary"
          size="sm"
          @click="cancelImportJob()"
        >
          {{ t("cancelJobAction") }}
        </ActionButton>
        <ActionButton variant="secondary" size="sm" @click="cancel">
          {{ t("cancel") }}
        </ActionButton>
        <ActionButton
          variant="secondary"
          size="sm"
          :disabled="!canPreview || previewLoading"
          @click="previewData"
        >
          {{ previewLoading ? t("previewLoading") : t("previewAction") }}
        </ActionButton>
        <ActionButton
          variant="primary"
          size="sm"
          :disabled="!canImport || importLoading"
          @click="importData"
        >
          {{ importLoading ? t("importLoading") : t("import_action") }}
        </ActionButton>
      </div>
    </template>

    <template #metrics>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SaaSMetricCard :label="t('datasetLabel')" :value="selectedDatasetLabel" />
        <SaaSMetricCard :label="t('fileLabel')" :value="fileStateLabel" value-class="text-brand-600" />
        <SaaSMetricCard :label="t('mapping_summary')" :value="mappedColumnsLabel" value-class="text-at-green" />
        <SaaSMetricCard :label="t('previewSummaryLabel')" :value="previewSummaryLabel" value-class="text-brand-700" />
      </div>
    </template>

    <div v-if="errorMessage" class="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {{ errorMessage }}
    </div>

    <div v-if="jobHistory.length" class="mb-4 surface-card rounded-2xl p-6">
      <ImportDataJobHistoryPanel :jobs="jobHistory" :t="t" @cancel-job="cancelImportJob" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-1 space-y-6">
        <div class="surface-card rounded-2xl p-6">
          <ImportDataTemplatesPanel :t="t" />
        </div>

        <div class="surface-card rounded-2xl p-6">
          <ImportDataStepSelectPanel
            v-model="selectedDataset"
            v-model:selected-sheet="selectedSheet"
            :localized-datasets="localizedDatasets"
            :file-name="fileName"
            :sheet-names="sheetNames"
            :is-spreadsheet-file="isSpreadsheetFile"
            :headers-loading="headersLoading"
            :t="t"
            @file-select="handleFileSelect"
          />
        </div>

        <div class="surface-card rounded-2xl p-6">
          <ImportDataStepMappingPanel
            :columns="columns"
            :column-mapping="columnMapping"
            :selected-field-options="selectedFieldOptions"
            :t="t"
          />
        </div>
      </div>

      <div class="lg:col-span-2 space-y-6">
        <div class="surface-card rounded-2xl p-6">
          <ImportDataStepPreviewPanel
            :columns="columns"
            :preview-rows="previewRows"
            :import-message="importMessage"
            :t="t"
          />
        </div>

        <div v-if="jobStatus" class="surface-card rounded-2xl p-6">
          <ImportDataJobStatusPanel
            :job-status="jobStatus"
            :result-summary="resultSummary"
            :error-log-file="errorLogFile"
            :t="t"
          />
        </div>
      </div>
    </div>
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { translateText } from "../utils/i18n";
import { IMPORT_TRANSLATIONS } from "../config/import_translations";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import { useImportDataRuntime } from "../composables/useImportDataRuntime";
import ImportDataJobHistoryPanel from "../components/import-data/ImportDataJobHistoryPanel.vue";
import ImportDataTemplatesPanel from "../components/import-data/ImportDataTemplatesPanel.vue";
import ImportDataJobStatusPanel from "../components/import-data/ImportDataJobStatusPanel.vue";
import ImportDataStepMappingPanel from "../components/import-data/ImportDataStepMappingPanel.vue";
import ImportDataStepPreviewPanel from "../components/import-data/ImportDataStepPreviewPanel.vue";
import ImportDataStepSelectPanel from "../components/import-data/ImportDataStepSelectPanel.vue";

const router = useRouter();
const authStore = useAuthStore();
const branchStore = useBranchStore();
const activeLocale = computed(() => unref(authStore.locale) || "tr");

function t(key) {
  const locale = String(unref(activeLocale) || "tr").toLowerCase().startsWith("tr") ? "tr" : "en";
  return IMPORT_TRANSLATIONS[locale]?.[key] || IMPORT_TRANSLATIONS.en?.[key] || translateText(key, activeLocale);
}

const runtime = useImportDataRuntime({ t, router, authStore, branchStore });
const {
  selectedDataset,
  localizedDatasets,
  fileName,
  columns,
  previewRows,
  previewSummary,
  importMessage,
  errorMessage,
  columnMapping,
  selectedFieldOptions,
  canPreview,
  canImport,
  canCancelImport,
  headersLoading,
  isDatasetSupported,
  previewLoading,
  importLoading,
  jobStatus,
  resultSummary,
  errorLogFile,
  sheetNames,
  selectedSheet,
  isSpreadsheetFile,
  jobHistory,
  handleFileSelect,
  previewData,
  importData,
  cancelImportJob,
  cancel,
} = runtime;

const selectedDatasetLabel = computed(
  () => localizedDatasets.value.find((dataset) => dataset.key === selectedDataset.value)?.label || t("select_dataset"),
);

const fileStateLabel = computed(() => fileName.value || t("no_file_selected"));

const mappedColumnsLabel = computed(() => {
  const mappedColumns = Object.values(columnMapping).filter(Boolean).length;
  return `${mappedColumns} ${t("columnsMapped")}`;
});

const previewSummaryLabel = computed(() => {
  const summary = previewSummary.value || {};
  if (!summary.total_rows) {
    return t("previewEmpty");
  }
  return `${summary.ready || 0} ${t("readyLabel")} / ${summary.skipped || 0} ${t("skippedLabel")} / ${summary.error || 0} ${t("errorLabel")}`;
});
</script>
