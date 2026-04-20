<template>
  <WorkbenchPageLayout
    :title="label('list')"
    :subtitle="subtitleLabel"
    :record-count="pagination.total"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <AuxWorkbenchActionBar
        :is-loading="isLoading"
        :can-export-snapshot-rows="canExportSnapshotRows"
        :can-launch-aux-quick-create="canLaunchAuxQuickCreate"
        :aux-quick-create-label="localize(auxQuickCreate?.label) || t('newRecord')"
        :refresh-label="t('refresh')"
        :export-csv-label="t('exportCsv')"
        :export-xlsx-label="t('exportXlsx')"
        :export-pdf-label="t('exportPdf')"
        :panel-label="t('panel')"
        :visible-toolbar-actions="visibleToolbarActions"
        :localize="localize"
        @refresh="refreshList"
        @export-snapshot-rows="exportSnapshotRows"
        @download-xlsx="downloadAuxExport('xlsx')"
        @download-pdf="downloadAuxExport('pdf')"
        @launch-quick-create="showAuxQuickCreateDialog = true"
        @run-toolbar-action="runToolbarAction"
      />
    </template>

    <template #metrics>
      <AuxWorkbenchMetricsPanel
        :snapshot-summary-cards="snapshotSummaryCards"
        :reminder-summary-cards="reminderSummaryCards"
        :access-log-summary-cards="accessLogSummaryCards"
        :file-summary-cards="fileSummaryCards"
        :snapshot-trend-rows="snapshotTrendRows"
        :snapshot-trend-title="t('snapshotTrendTitle')"
        :snapshot-trend-hint="t('snapshotTrendHint')"
        :showing-label="t('showing')"
        :total-snapshots-label="t('totalSnapshots')"
        :average-score-label="t('averageScore')"
        :high-risk-snapshots-label="t('highRiskSnapshots')"
      />
    </template>

    <AuxWorkbenchFilterPanel
      :filters-title="t('filtersTitle')"
      :active-filter-count="activeFilterCount"
      :active-filters-label="t('activeFilters')"
      :preset-key="presetKey"
      :preset-options="presetOptions"
      :can-delete-preset="canDeletePreset"
      :is-loading="isLoading"
      :draft="draft"
      :quick-filter-defs="quickFilterDefs"
      :advanced-filter-defs="advancedFilterDefs"
      :sort-options="sortOptions"
      :search-placeholder="t('searchPlaceholder')"
      :advanced-label="t('advanced')"
      :hide-advanced-label="t('hideAdvanced')"
      :preset-label="t('preset')"
      :save-preset-label="t('savePreset')"
      :delete-preset-label="t('deletePreset')"
      :apply-label="t('apply')"
      :reset-label="t('reset')"
      :field-label="fieldLabel"
      :option-label="optionLabel"
      @update:modelValue="onPresetModelValue"
      @presetChange="onPresetChange"
      @presetSave="savePreset"
      @presetDelete="deletePreset"
      @apply="applyFilters"
      @reset="resetFilters"
    />

    <AuxWorkbenchTableSection
      :list-label="label('list')"
      :subtitle-label="subtitleLabel"
      :showing-label="t('showing')"
      :loading-label="t('loading')"
      :load-error-title="t('loadErrorTitle')"
      :load-error-text="loadError.text"
      :empty-title="t('emptyTitle')"
      :empty-description="t('emptyDescription')"
      :record-label="t('record')"
      :details-label="t('details')"
      :status-label="t('status')"
      :info-label="t('info')"
      :actions-label="t('actions')"
      :modified-label="fieldLabel('modified')"
      :open-detail-label="t('openDetail')"
      :panel-label="t('panel')"
      :send-now-label="t('sendNow')"
      :retry-label="t('retry')"
      :requeue-label="t('requeue')"
      :open-communication-label="t('openCommunication')"
      :start-task-label="t('startTask')"
      :block-task-label="t('blockTaskAction')"
      :complete-task-label="t('completeTaskAction')"
      :cancel-task-label="t('cancelTaskAction')"
      :running-label="t('running')"
      :page-label="t('page')"
      :prev-label="t('prev')"
      :next-label="t('next')"
      :rows="rows"
      :pagination="pagination"
      :total-pages="totalPages"
      :has-next-page="hasNextPage"
      :start-row="startRow"
      :end-row="endRow"
      :is-loading="isLoading"
      :config="config"
      :row-action-busy-name="rowActionBusyName"
      :row-title="rowTitle"
      :fact-items="factItems"
      :format-field="formatField"
      :field-label="fieldLabel"
      :status-value="statusValue"
      :panel-cfg-for-row="panelCfgForRow"
      :can-send-draft-now-row="canSendDraftNowRow"
      :can-retry-outbox-row="canRetryOutboxRow"
      :can-requeue-outbox-row="canRequeueOutboxRow"
      :can-open-communication-context-row="canOpenCommunicationContextRow"
      :can-start-task-row="canStartTaskRow"
      :can-block-task-row="canBlockTaskRow"
      :can-complete-task-row="canCompleteTaskRow"
      :can-cancel-task-row="canCancelTaskRow"
      :can-complete-reminder-row="canCompleteReminderRow"
      :can-cancel-reminder-row="canCancelReminderRow"
      :can-start-ownership-assignment-row="canStartOwnershipAssignmentRow"
      :can-block-ownership-assignment-row="canBlockOwnershipAssignmentRow"
      :can-complete-ownership-assignment-row="canCompleteOwnershipAssignmentRow"
      @open-detail="openDetail"
      @open-panel="openPanel"
      @send-draft-now="sendDraftNowRow"
      @retry-outbox="retryOutboxRow"
      @requeue-outbox="requeueOutboxRow"
      @open-communication-context="openCommunicationContextRow"
      @start-task="startTaskRow"
      @block-task="blockTaskRow"
      @complete-task="completeTaskRow"
      @cancel-task="cancelTaskRow"
      @complete-reminder="completeReminderRow"
      @cancel-reminder="cancelReminderRow"
      @start-ownership-assignment="startOwnershipAssignmentRow"
      @block-ownership-assignment="blockOwnershipAssignmentRow"
      @complete-ownership-assignment="completeOwnershipAssignmentRow"
      @previous="previousPage"
      @next="nextPage"
    />

    <QuickCreateManagedDialog
      v-if="auxQuickCreate && canLaunchAuxQuickCreate"
      v-model="showAuxQuickCreateDialog"
      :config-key="auxQuickCreate.registryKey"
      :locale="activeLocale"
      :options-map="auxQuickOptionsMap"
      :eyebrow="auxQuickCreateEyebrow"
      :show-save-and-open="auxQuickCreate.showSaveAndOpen !== false"
      :before-open="prepareAuxQuickCreateDialog"
      :after-submit="handleAuxQuickCreateAfterSubmit"
      :success-handlers="auxQuickCreateSuccessHandlers"
    />
    <WorkbenchFileUploadModal
      :open="showWorkbenchUploadModal"
      :attached-to-doctype="filters.attached_to_doctype || ''"
      :attached-to-name="filters.attached_to_name || ''"
      @close="showWorkbenchUploadModal = false"
      @uploaded="refreshList"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { getAuxWorkbenchConfig } from "../config/auxWorkbenchConfigs";
import { useAuxWorkbenchRuntime } from "../composables/useAuxWorkbenchRuntime";
import { useAuxWorkbenchViewModel } from "../composables/useAuxWorkbenchViewModel";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import WorkbenchFileUploadModal from "../components/aux-workbench/WorkbenchFileUploadModal.vue";
import AuxWorkbenchActionBar from "../components/aux-workbench/AuxWorkbenchActionBar.vue";
import AuxWorkbenchMetricsPanel from "../components/aux-workbench/AuxWorkbenchMetricsPanel.vue";
import AuxWorkbenchFilterPanel from "../components/aux-workbench/AuxWorkbenchFilterPanel.vue";
import AuxWorkbenchTableSection from "../components/aux-workbench/AuxWorkbenchTableSection.vue";

const props = defineProps({
  screenKey: { type: String, required: true },
});

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const branchStore = useBranchStore();
const config = getAuxWorkbenchConfig(props.screenKey);

if (!config) {
  throw new Error(`Unknown aux workbench screen: ${props.screenKey}`);
}

const activeLocale = computed(() => unref(authStore.locale) || "en");
const runtime = useAuxWorkbenchRuntime({
  config,
  activeLocale,
  authStore,
  branchStore,
  route,
  router,
});

const {
  t,
  localize,
  label,
  fieldLabel,
  optionLabel,
  statusValue,
  formatField,
  factItems,
  rowTitle,
  subtitleLabel,
  toolbarActions,
  visibleToolbarActions,
  canLaunchAuxQuickCreate,
  auxQuickCreateEyebrow,
  quickFilterDefs,
  advancedFilterDefs,
  sortOptions,
  auxQuickOptionsMap,
  snapshotSummaryCards,
  snapshotTrendRows,
  accessLogSummaryCards,
  reminderSummaryCards,
  fileSummaryCards,
  exportSnapshotRows,
  downloadAuxExport,
} = useAuxWorkbenchViewModel({
  activeLocale: runtime.activeLocale,
  localeCode: runtime.localeCode,
  config: runtime.config,
  filters: runtime.filters,
  pagination: runtime.pagination,
  rows: runtime.rows,
  snapshotRows: runtime.snapshotRows,
  accessLogRows: runtime.accessLogRows,
  fileRows: runtime.fileRows,
  reminderRows: runtime.reminderRows,
  authStore,
  branchStore,
  auxQuickCreate: runtime.auxQuickCreate,
  auxQuickCustomerResource: runtime.auxQuickCustomerResource,
  auxQuickPolicyResource: runtime.auxQuickPolicyResource,
  auxQuickTemplateResource: runtime.auxQuickTemplateResource,
  auxQuickInsuranceCompanyResource: runtime.auxQuickInsuranceCompanyResource,
  auxQuickSalesEntityResource: runtime.auxQuickSalesEntityResource,
  auxQuickAccountingEntryResource: runtime.auxQuickAccountingEntryResource,
});

const auxQuickCreateSuccessHandlers = {
  aux_list: async () => {
    await runtime.refreshList();
  },
  notification_draft_list: async () => {
    if (config.key === "notification-drafts") await runtime.refreshList();
  },
  renewal_list: async () => {
    if (config.key === "tasks") await runtime.refreshList();
  },
};

const {
  draft,
  filters,
  pagination,
  loadError,
  showAuxQuickCreateDialog,
  rowActionBusyName,
  listResource,
  countResource,
  presetKey,
  customPresets,
  presetOptions,
  canDeletePreset,
  applyPreset,
  onPresetChange,
  onPresetModelValue,
  savePreset,
  deletePreset,
  persistPresetStateToServer,
  hydratePresetStateFromServer,
  rows,
  snapshotRows,
  accessLogRows,
  fileRows,
  reminderRows,
  canExportSnapshotRows,
  isLoading,
  auxQuickCreate,
  totalPages,
  hasNextPage,
  startRow,
  endRow,
  activeFilterCount,
  refreshList,
  applyFilters,
  resetFilters,
  previousPage,
  nextPage,
  ensureAuxQuickOptionSources,
  prepareAuxQuickCreateDialog,
  handleAuxQuickCreateAfterSubmit,
  runRowQuickAction,
  canSendDraftNowRow,
  canRetryOutboxRow,
  canRequeueOutboxRow,
  canOpenCommunicationContextRow,
  canStartTaskRow,
  canBlockTaskRow,
  canCompleteTaskRow,
  canCancelTaskRow,
  canCompleteReminderRow,
  canCancelReminderRow,
  canStartOwnershipAssignmentRow,
  canBlockOwnershipAssignmentRow,
  canCompleteOwnershipAssignmentRow,
  sendDraftNowRow,
  retryOutboxRow,
  requeueOutboxRow,
  openCommunicationContextRow,
  startTaskRow,
  blockTaskRow,
  completeTaskRow,
  cancelTaskRow,
  completeReminderRow,
  cancelReminderRow,
  startOwnershipAssignmentRow,
  blockOwnershipAssignmentRow,
  completeOwnershipAssignmentRow,
  openDetail,
  panelCfg,
  panelCfgForRow,
  openPanel,
  runToolbarAction,
  showWorkbenchUploadModal,
} = runtime;
</script>

