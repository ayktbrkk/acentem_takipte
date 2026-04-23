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
import { translateText } from "../utils/i18n";

const router = useRouter();
const appPinia = getAppPinia();
const authStore = useAuthStore(appPinia);

const activeLocale = computed(() => unref(authStore.locale) || "en");

function t(key) {
  return translateText(key, activeLocale);
}

const runtime = useExportDataRuntime({ t, router, authStore });
const { form, message, historyRows, localizedScreenOptions, downloadExport, resetForm, cancel } = runtime;
</script>

