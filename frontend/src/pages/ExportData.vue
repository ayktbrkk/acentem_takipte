<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :show-record-count="false"
  >
    <template #metrics>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SaaSMetricCard :label="t('datasetLabel')" :value="activeScreenLabel" />
        <SaaSMetricCard :label="t('formatLabel')" :value="activeFormatLabel" value-class="text-brand-600" />
        <SaaSMetricCard :label="t('scopeLabel')" :value="activeBranchLabel" value-class="text-brand-700" />
        <SaaSMetricCard :label="t('history_summary')" :value="historyRows.length" value-class="text-at-green" />
      </div>
    </template>

    <template #actions>
      <ExportDataHeaderActions
        :t="t"
        :export-loading="exportLoading"
        :can-export="canExport"
        :row-count="exportRowCount"
        @reset="resetForm"
        @cancel="cancel"
        @export="downloadExport"
      />
    </template>

    <SectionPanel :title="t('workflowTitle')" :show-count="false">
      <StepBar :steps="exportSteps" />
    </SectionPanel>

    <div v-if="message" class="qc-success-banner" role="status" aria-live="polite">
      <p class="qc-success-banner__text">{{ message }}</p>
    </div>

    <div
      v-if="exceedsSoftLimit && !exceedsHardLimit"
      class="rounded-xl border border-at-amber/25 bg-at-amber/5 px-5 py-3 mb-4 flex items-start gap-3"
      role="alert"
      aria-live="polite"
    >
      <span class="text-at-amber text-lg mt-0.5">&#9888;</span>
      <div>
        <p class="text-sm font-semibold text-slate-800">{{ t("largeExportTitle") }}</p>
        <p class="text-sm text-slate-600 mt-1">{{ t("largeExportMessage", { count: exportRowCount }) }}</p>
      </div>
    </div>

    <div
      v-if="exceedsHardLimit"
      class="rounded-xl border border-at-red/25 bg-at-red/5 px-5 py-3 mb-4 flex items-start gap-3"
      role="alert"
      aria-live="polite"
    >
      <span class="text-at-red text-lg mt-0.5">&#9888;</span>
      <div>
        <p class="text-sm font-semibold text-slate-800">{{ t("exportLimitReachedTitle") }}</p>
        <p class="text-sm text-slate-600 mt-1">{{ t("exportLimitReachedMessage", { count: exportRowCount }) }}</p>
      </div>
    </div>

    <div
      v-if="containsPii"
      class="rounded-xl border border-brand-500/25 bg-brand-50/50 px-5 py-3 mb-4 flex items-start gap-3"
      role="alert"
      aria-live="polite"
    >
      <span class="text-brand-700 text-lg mt-0.5">&#9432;</span>
      <div>
        <p class="text-sm font-semibold text-slate-800">{{ t("piiExportTitle") }}</p>
        <p class="text-sm text-slate-600 mt-1">{{ t("piiExportMessage") }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ t("piiExportNote") }}</p>
      </div>
    </div>

    <ExportDataOptionsPanel :form="form" :screen-options="localizedScreenOptions" :t="t" />

    <ExportDataFiltersPanel :form="form" :screen="form.screen" :t="t" />

    <ExportDataPreviewPanel
      :show-panel="showListPreview"
      :columns="listPreviewColumns"
      :rows="listPreviewTableRows"
      :loading="listPreviewLoading"
      :error="listPreviewError"
      :locale="activeLocale"
      :t="t"
      @retry="refreshListPreview"
    />

    <div
      v-if="showListPreview && listPreviewTotal > 0 && !listPreviewLoading"
      class="rounded-xl border border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-4"
    >
      <p class="text-sm text-slate-600">
        <span class="font-semibold text-slate-800">{{ t("previewCountLabel") }}</span>
        {{ t("previewCount", { preview: Math.min(10, listPreviewTableRows.length), total: listPreviewTotal }) }}
      </p>
      <ActionButton
        variant="secondary"
        size="sm"
        @click="previewConfirmed = !previewConfirmed"
      >
        {{ previewConfirmed ? t("unconfirmExport") : t("confirmExport") }}
      </ActionButton>
    </div>

    <ExportDataHistoryPanel :history-rows="historyRows" :locale="activeLocale" :t="t" />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, onMounted, unref } from "vue";
import { useRouter } from "vue-router";
import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import { useExportDataRuntime } from "../composables/useExportDataRuntime";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import StepBar from "../components/ui/StepBar.vue";
import ExportDataHeaderActions from "../components/export-data/ExportDataHeaderActions.vue";
import ExportDataOptionsPanel from "../components/export-data/ExportDataOptionsPanel.vue";
import ExportDataFiltersPanel from "../components/export-data/ExportDataFiltersPanel.vue";
import ExportDataPreviewPanel from "../components/export-data/ExportDataPreviewPanel.vue";
import ExportDataHistoryPanel from "../components/export-data/ExportDataHistoryPanel.vue";
import { EXPORT_TRANSLATIONS } from "../config/export_translations";

const router = useRouter();
const appPinia = getAppPinia();
const authStore = useAuthStore(appPinia);
const branchStore = useBranchStore(appPinia);

const activeLocale = computed(() => unref(authStore.locale) || "tr");

function t(key, vars) {
  const locale = String(unref(activeLocale) || "tr").toLowerCase().startsWith("tr") ? "tr" : "en";
  let text = EXPORT_TRANSLATIONS[locale]?.[key] || EXPORT_TRANSLATIONS.en?.[key] || key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
  }
  return text;
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
  listPreviewError,
  listPreviewTotal,
  exportRowCount,
  exceedsSoftLimit,
  exceedsHardLimit,
  containsPii,
  canExport,
  previewConfirmed,
  exportLoading,
  downloadExport,
  loadExportJobs,
  resetForm,
  cancel,
  refreshListPreview,
} = runtime;

const activeScreenLabel = computed(
  () => localizedScreenOptions.value.find((option) => option.value === form.screen)?.label || t("screenNoLabel"),
);

const activeFormatLabel = computed(() => {
  if (form.format === "pdf") return t("formatPdf");
  if (form.format === "csv") return t("formatCsv");
  return t("formatXlsx");
});

const activeBranchLabel = computed(() => {
  const branchCode = branchStore?.requestBranch || "";
  if (!branchCode) return t("allBranches");
  const branch = (branchStore?.items || []).find((b) => b.name === branchCode);
  return branch?.office_branch_name || branch?.office_branch_code || t("allBranches");
});

const exportSteps = computed(() => {
  const previewReady =
    showListPreview.value && (listPreviewLoading.value || listPreviewTableRows.value.length > 0);
  return [
    { label: t("step1Title"), state: "done" },
    { label: t("step2Title"), state: previewReady ? "done" : "current" },
    { label: t("exportStepTitle"), state: canExport.value ? "done" : previewReady ? "current" : "pending" },
  ];
});

onMounted(() => {
  void loadExportJobs();
});
</script>

