<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :show-record-count="false"
  >
    <template #actions>
      <div class="flex flex-wrap items-center justify-end gap-2">
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

    <SectionPanel :title="t('workflowTitle')" :show-count="false">
      <StepBar :steps="importSteps" />
    </SectionPanel>

    <div
      v-if="errorMessage"
      class="rounded-xl border border-at-red/20 bg-at-red/5 px-5 py-4 flex flex-wrap items-center justify-between gap-4"
      role="alert"
      aria-live="polite"
    >
      <p class="text-sm font-semibold text-at-red">{{ errorMessage }}</p>
      <div class="flex flex-wrap items-center gap-2">
        <ActionButton
          v-if="canPreview"
          variant="secondary"
          size="sm"
          :disabled="previewLoading"
          @click="previewData"
        >
          {{ t("retry") }}
        </ActionButton>
        <ActionButton variant="secondary" size="sm" @click="clearError">
          {{ t("dismiss") }}
        </ActionButton>
      </div>
    </div>

    <ImportDataJobHistoryPanel
      v-if="jobHistory.length"
      :jobs="jobHistory"
      :locale="activeLocale"
      :t="t"
      @cancel-job="cancelImportJob"
    />

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="space-y-6 lg:col-span-1">
        <ImportDataTemplatesPanel :t="t" />
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
        <ImportDataStepMappingPanel
          :columns="columns"
          :column-mapping="columnMapping"
          :selected-field-options="selectedFieldOptions"
          :t="t"
        />
      </div>

      <div class="space-y-6 lg:col-span-2">
        <ImportDataStepPreviewPanel
          :columns="columns"
          :preview-rows="previewRows"
          :table-columns="workbenchPreviewColumns"
          :table-rows="workbenchPreviewRows"
          :use-workbench-table="useWorkbenchTable"
          :loading="previewLoading"
          :locale="activeLocale"
          :import-message="importMessage"
          :t="t"
        />

        <ImportDataJobStatusPanel
          v-if="jobStatus"
          :job-status="jobStatus"
          :result-summary="resultSummary"
          :error-log-file="errorLogFile"
          :locale="activeLocale"
          :t="t"
        />
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
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import StepBar from "../components/ui/StepBar.vue";
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
  previewLoading,
  importLoading,
  jobStatus,
  resultSummary,
  errorLogFile,
  sheetNames,
  selectedSheet,
  isSpreadsheetFile,
  jobHistory,
  workbenchPreviewColumns,
  workbenchPreviewRows,
  useWorkbenchTable,
  handleFileSelect,
  previewData,
  importData,
  cancelImportJob,
  clearError,
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

const importSteps = computed(() => {
  const hasFile = Boolean(fileName.value);
  const hasMapping = Object.values(columnMapping).some(Boolean);
  const hasPreview = previewRows.value.length > 0;

  return [
    { label: t("step_file"), state: hasFile ? "done" : "current" },
    {
      label: t("step_mapping"),
      state: !hasFile ? "pending" : hasMapping ? "done" : "current",
    },
    {
      label: t("step_preview"),
      state: !hasFile ? "pending" : hasPreview ? "current" : hasMapping ? "current" : "pending",
    },
  ];
});
</script>

