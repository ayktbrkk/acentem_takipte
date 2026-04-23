<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :show-record-count="false"
  >
    <template #actions>
      <div class="flex items-center gap-2">
        <ActionButton variant="secondary" size="sm" @click="cancel">
          {{ t("cancel") }}
        </ActionButton>
        <ActionButton variant="primary" size="sm" :disabled="!canImport" @click="importData">
          {{ t("import_action") }}
        </ActionButton>
      </div>
    </template>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-1 space-y-6">
        <SectionPanel :title="t('step_file')" panel-class="surface-card rounded-2xl p-6">
          <ImportDataStepSelectPanel
            v-model="selectedDataset"
            :localized-datasets="localizedDatasets"
            :file-name="fileName"
            :t="t"
            @file-select="handleFileSelect"
          />
        </SectionPanel>

        <SectionPanel :title="t('step_mapping')" panel-class="surface-card rounded-2xl p-6">
          <ImportDataStepMappingPanel
            :columns="columns"
            :column-mapping="columnMapping"
            :selected-field-options="selectedFieldOptions"
            :t="t"
          />
        </SectionPanel>
      </div>

      <div class="lg:col-span-2">
        <SectionPanel :title="t('step_preview')" panel-class="surface-card rounded-2xl p-6">
          <ImportDataStepPreviewPanel
            :columns="columns"
            :preview-rows="previewRows"
            :import-message="importMessage"
            :t="t"
          />
        </SectionPanel>
      </div>
    </div>
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { translateText } from "../utils/i18n";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import { useImportDataRuntime } from "../composables/useImportDataRuntime";
import ImportDataStepMappingPanel from "../components/import-data/ImportDataStepMappingPanel.vue";
import ImportDataStepPreviewPanel from "../components/import-data/ImportDataStepPreviewPanel.vue";
import ImportDataStepSelectPanel from "../components/import-data/ImportDataStepSelectPanel.vue";

const router = useRouter();
const authStore = useAuthStore();
const activeLocale = computed(() => unref(authStore.locale) || "tr");

function t(key) {
  return translateText(key, activeLocale);
}

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
