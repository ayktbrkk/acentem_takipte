<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :show-record-count="false"
  >
    <template #metrics>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SaaSMetricCard :label="t('datasetLabel')" :value="activeScreenLabel" />
        <SaaSMetricCard :label="t('formatLabel')" :value="activeFormatLabel" value-class="text-brand-600" />
        <SaaSMetricCard :label="t('history_summary')" :value="historyRows.length" value-class="text-at-green" />
      </div>
    </template>

    <template #actions>
      <ExportDataHeaderActions :t="t" @reset="resetForm" @cancel="cancel" @export="downloadExport" />
    </template>

    <SectionPanel :title="t('workflowTitle')" :show-count="false">
      <StepBar :steps="exportSteps" />
    </SectionPanel>

    <div v-if="message" class="qc-success-banner" role="status" aria-live="polite">
      <p class="qc-success-banner__text">{{ message }}</p>
    </div>

    <ExportDataOptionsPanel :form="form" :screen-options="localizedScreenOptions" :t="t" />

    <ExportDataFiltersPanel :form="form" :screen="form.screen" :t="t" />

    <ExportDataPreviewPanel
      :show-panel="showListPreview"
      :columns="listPreviewColumns"
      :rows="listPreviewTableRows"
      :loading="listPreviewLoading"
      :locale="activeLocale"
      :t="t"
    />

    <ExportDataHistoryPanel :history-rows="historyRows" :locale="activeLocale" :t="t" />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";
import { useRouter } from "vue-router";
import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import { useExportDataRuntime } from "../composables/useExportDataRuntime";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import StepBar from "../components/ui/StepBar.vue";
import ExportDataHeaderActions from "../components/export-data/ExportDataHeaderActions.vue";
import ExportDataOptionsPanel from "../components/export-data/ExportDataOptionsPanel.vue";
import ExportDataFiltersPanel from "../components/export-data/ExportDataFiltersPanel.vue";
import ExportDataPreviewPanel from "../components/export-data/ExportDataPreviewPanel.vue";
import ExportDataHistoryPanel from "../components/export-data/ExportDataHistoryPanel.vue";
import { translateText } from "../utils/i18n";
import { EXPORT_TRANSLATIONS } from "../config/export_translations";

const router = useRouter();
const appPinia = getAppPinia();
const authStore = useAuthStore(appPinia);
const branchStore = useBranchStore(appPinia);

const activeLocale = computed(() => unref(authStore.locale) || "en");

function t(key) {
  const locale = String(unref(activeLocale) || "en").toLowerCase().startsWith("tr") ? "tr" : "en";
  return EXPORT_TRANSLATIONS[locale]?.[key] || EXPORT_TRANSLATIONS.en?.[key] || translateText(key, activeLocale);
}

const runtime = useExportDataRuntime({ t, router, authStore, branchStore });
const {
  form,
  message,
  historyRows,
  localizedScreenOptions,
  showListPreview,
  listPreviewColumns,
  listPreviewTableRows,
  listPreviewLoading,
  downloadExport,
  resetForm,
  cancel,
} = runtime;

const activeScreenLabel = computed(
  () => localizedScreenOptions.value.find((option) => option.value === form.screen)?.label || t("screenNoLabel"),
);

const activeFormatLabel = computed(() => {
  if (form.format === "pdf") return t("formatPdf");
  if (form.format === "csv") return t("formatCsv");
  return t("formatXlsx");
});

const exportSteps = computed(() => {
  const previewReady =
    showListPreview.value && (listPreviewLoading.value || listPreviewTableRows.value.length > 0);
  return [
    { label: t("step1Title"), state: "done" },
    { label: t("step2Title"), state: previewReady ? "done" : "current" },
    { label: t("exportStepTitle"), state: previewReady ? "current" : "pending" },
  ];
});
</script>
