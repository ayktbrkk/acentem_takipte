<template>
  <WorkbenchPageLayout
    :title="label('list')"
    :subtitle="subtitleLabel"
    :record-count="pagination.total"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
        <button class="btn btn-outline btn-sm" type="button" :disabled="isLoading" @click="refreshList">
          {{ t('refresh') }}
        </button>
        <button
          v-if="canExportSnapshotRows"
          class="btn btn-outline btn-sm"
          type="button"
          @click="exportSnapshotRows"
        >
          {{ t('exportCsv') }}
        </button>
        <button class="btn btn-outline btn-sm" type="button" :disabled="isLoading" @click="downloadAuxExport('xlsx')">
          {{ t('exportXlsx') }}
        </button>
        <button class="btn btn-outline btn-sm" type="button" :disabled="isLoading" @click="downloadAuxExport('pdf')">
          {{ t('exportPdf') }}
        </button>
        <QuickCreateLauncher
          v-if="auxQuickCreate && canLaunchAuxQuickCreate"
          variant="primary"
          size="sm"
          :label="localize(auxQuickCreate.label) || t('newRecord')"
          @launch="showAuxQuickCreateDialog = true"
        />
        <ActionButton
          v-for="action in visibleToolbarActions"
          :key="action.key || action.routeName || localize(action.label)"
          variant="secondary"
          size="sm"
          @click="runToolbarAction(action)"
        >
          {{ localize(action.label) || t('panel') }}
        </ActionButton>
    </template>

    <template #metrics>
      <div class="space-y-4">
        <div
          v-if="snapshotSummaryCards.length"
          class="grid grid-cols-1 gap-4 md:grid-cols-4"
        >
          <article
            v-for="card in snapshotSummaryCards"
            :key="card.key"
            class="mini-metric"
          >
            <p class="mini-metric-label">{{ card.label }}</p>
            <p class="mini-metric-value">{{ card.value }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ card.hint }}</p>
          </article>
        </div>
        <div
          v-if="reminderSummaryCards.length"
          class="grid grid-cols-1 gap-4 md:grid-cols-4"
        >
          <article
            v-for="card in reminderSummaryCards"
            :key="card.key"
            class="mini-metric"
          >
            <p class="mini-metric-label">{{ card.label }}</p>
            <p class="mini-metric-value">{{ card.value }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ card.hint }}</p>
          </article>
        </div>
        <div
          v-if="accessLogSummaryCards.length"
          class="grid grid-cols-1 gap-4 md:grid-cols-4"
        >
          <article
            v-for="card in accessLogSummaryCards"
            :key="card.key"
            class="mini-metric"
          >
            <p class="mini-metric-label">{{ card.label }}</p>
            <p class="mini-metric-value">{{ card.value }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ card.hint }}</p>
          </article>
        </div>
        <div
          v-if="fileSummaryCards.length"
          class="grid grid-cols-1 gap-4 md:grid-cols-4"
        >
          <article
            v-for="card in fileSummaryCards"
            :key="card.key"
            class="mini-metric"
          >
            <p class="mini-metric-label">{{ card.label }}</p>
            <p class="mini-metric-value">{{ card.value }}</p>
            <p class="mt-1 text-xs text-slate-500">{{ card.hint }}</p>
          </article>
        </div>
        <article
          v-if="snapshotTrendRows.length"
          class="surface-card rounded-2xl p-5"
        >
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("snapshotTrendTitle") }}</p>
              <p class="text-sm text-slate-500">{{ t("snapshotTrendHint") }}</p>
            </div>
            <span class="text-xs text-slate-400">{{ t("showing") }} {{ snapshotTrendRows.length }}</span>
          </div>
          <div class="mt-4 grid gap-3 md:grid-cols-3">
            <article
              v-for="row in snapshotTrendRows"
              :key="row.snapshotDate"
              class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <p class="text-sm font-semibold text-slate-900">{{ row.snapshotDateLabel }}</p>
              <div class="mt-2 space-y-1 text-xs text-slate-600">
                <p>{{ t("totalSnapshots") }}: {{ row.total }}</p>
                <p>{{ t("averageScore") }}: {{ row.averageScore }}</p>
                <p>{{ t("highRiskSnapshots") }}: {{ row.highRisk }}</p>
              </div>
            </article>
          </div>
        </article>
      </div>
    </template>

    <SectionPanel :title="t('filtersTitle')" :count="`${activeFilterCount} ${t('activeFilters')}`" panel-class="surface-card rounded-2xl p-5">
      <WorkbenchFilterToolbar
        :model-value="presetKey"
        :show-preset="true"
        :advanced-label="t('advanced')"
        :collapse-label="t('hideAdvanced')"
        :active-count="activeFilterCount"
        :active-count-label="t('activeFilters')"
        :preset-label="t('preset')"
        :preset-options="presetOptions"
        :can-delete-preset="canDeletePreset"
        :save-label="t('savePreset')"
        :delete-label="t('deletePreset')"
        :apply-label="t('apply')"
        :reset-label="t('reset')"
        :disabled="isLoading"
        @update:modelValue="onPresetModelValue"
        @presetChange="onPresetChange"
        @presetSave="savePreset"
        @presetDelete="deletePreset"
        @apply="applyFilters"
        @reset="resetFilters"
      >
        <input v-model.trim="draft.query" class="rounded-lg border border-slate-300 px-3 py-2 text-sm" :placeholder="t('searchPlaceholder')" />

        <template v-for="fd in quickFilterDefs" :key="'q-'+fd.key">
          <component
            :is="fd.type === 'select' ? 'select' : 'input'"
            v-model="draft[fd.key]"
            :type="fd.type === 'select' ? undefined : fd.type === 'number' ? 'number' : 'text'"
            class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <template v-if="fd.type === 'select'">
              <option v-for="opt in fd.options || []" :key="String(opt)" :value="String(opt)">
                {{ optionLabel(fd, opt) }}
              </option>
            </template>
          </component>
        </template>

        <select v-model="draft.sort" class="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <select v-model.number="draft.pageLength" class="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option v-for="n in [10,20,50]" :key="n" :value="n">{{ n }}</option>
        </select>

        <template #advanced>
          <template v-for="fd in advancedFilterDefs" :key="'a-'+fd.key">
            <component
              :is="fd.type === 'select' ? 'select' : 'input'"
              v-model="draft[fd.key]"
              :type="fd.type === 'select' ? undefined : fd.type === 'number' ? 'number' : 'text'"
              class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              :placeholder="fieldLabel(fd.field)"
            >
              <template v-if="fd.type === 'select'">
                <option v-for="opt in fd.options || []" :key="String(opt)" :value="String(opt)">
                  {{ optionLabel(fd, opt) }}
                </option>
              </template>
            </component>
          </template>
        </template>
      </WorkbenchFilterToolbar>
    </SectionPanel>

    <SectionPanel :title="label('list')" :count="pagination.total" :meta="subtitleLabel" panel-class="surface-card rounded-2xl p-5">
      <template #trailing>
        <p class="text-xs text-slate-500">{{ t("showing") }} {{ startRow }}-{{ endRow }} / {{ pagination.total }}</p>
      </template>
      <div v-if="isLoading && rows.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
        {{ t("loading") }}
      </div>
      <article v-else-if="loadError.text" class="qc-error-banner mt-4">
        <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
        <p class="qc-error-banner__text mt-1">{{ loadError.text }}</p>
      </article>
      <div v-else-if="rows.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <EmptyState :title="t('emptyTitle')" :description="t('emptyDescription')" />
      </div>
      <template v-else>
        <div class="at-table-wrap mt-4">
          <table class="at-table w-full min-w-[980px]">
            <thead>
              <tr class="at-table-head-row">
                <th class="at-table-head-cell">{{ t("record") }}</th>
                <th class="at-table-head-cell">{{ t("details") }}</th>
                <th class="at-table-head-cell">{{ t("status") }}</th>
                <th class="at-table-head-cell">{{ t("info") }}</th>
                <th class="at-table-head-cell">{{ t("actions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in rows"
                :key="row.name"
                class="at-table-row cursor-pointer"
                @click="openDetail(row)"
              >
                <DataTableCell>
                  <TableEntityCell :title="rowTitle(row)" :facts="factItems(row, config.primaryFields)">
                    <p class="text-xs text-slate-500">{{ fieldLabel('modified') }}: {{ formatField(row.modified, 'modified') }}</p>
                  </TableEntityCell>
                </DataTableCell>

                <TableFactsCell :items="factItems(row, config.detailFields)" />

                <DataTableCell>
                  <div class="flex flex-wrap items-center gap-2">
                    <StatusBadge v-if="config.statusField && row[config.statusField] !== undefined && row[config.statusField] !== null && row[config.statusField] !== ''" :domain="config.statusType || 'policy'" :status="statusValue(row, config.statusField, config.statusType)" />
                    <StatusBadge v-if="config.secondaryStatusField && row[config.secondaryStatusField]" :domain="config.secondaryStatusType || 'policy'" :status="statusValue(row, config.secondaryStatusField, config.secondaryStatusType)" />
                    <span v-if="!config.statusField && !config.secondaryStatusField" class="text-xs text-slate-400">-</span>
                  </div>
                </DataTableCell>

                <TableFactsCell :items="factItems(row, config.metricFields)" />

                <DataTableCell>
                  <InlineActionRow>
                    <ActionButton
                      v-if="canSendDraftNowRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="sendDraftNowRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("sendNow") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canRetryOutboxRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="retryOutboxRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("retry") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canRequeueOutboxRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="requeueOutboxRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("requeue") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canOpenCommunicationContextRow(row)"
                      variant="secondary"
                      size="xs"
                      @click.stop="openCommunicationContextRow(row)"
                    >
                      {{ t("openCommunication") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canStartTaskRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="startTaskRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("startTask") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canBlockTaskRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="blockTaskRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("blockTaskAction") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canCompleteTaskRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="completeTaskRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("completeTaskAction") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canCancelTaskRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="cancelTaskRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("cancelTaskAction") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canCompleteReminderRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="completeReminderRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("completeTaskAction") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canCancelReminderRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="cancelReminderRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("cancelTaskAction") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canStartOwnershipAssignmentRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="startOwnershipAssignmentRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("startTask") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canBlockOwnershipAssignmentRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="blockOwnershipAssignmentRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("blockTaskAction") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canCompleteOwnershipAssignmentRow(row)"
                      variant="secondary"
                      size="xs"
                      :disabled="rowActionBusyName === row.name"
                      @click.stop="completeOwnershipAssignmentRow(row)"
                    >
                      {{ rowActionBusyName === row.name ? t("running") : t("completeTaskAction") }}
                    </ActionButton>
                    <ActionButton variant="secondary" size="xs" @click.stop="openDetail(row)">{{ t("openDetail") }}</ActionButton>
                    <ActionButton v-if="panelCfgForRow(row)" variant="link" size="xs" trailing-icon=">" @click.stop="openPanel(row)">{{ t("panel") }}</ActionButton>
                  </InlineActionRow>
                </DataTableCell>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="mt-4">
          <TablePagerFooter
            :page="pagination.page"
            :total-pages="totalPages"
            :page-label="t('page')"
            :previous-label="t('prev')"
            :next-label="t('next')"
            :prev-disabled="pagination.page <= 1 || isLoading"
            :next-disabled="!hasNextPage || isLoading"
            @previous="previousPage"
            @next="nextPage"
          />
        </div>
      </template>
    </SectionPanel>

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
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import TablePagerFooter from "../components/app-shell/TablePagerFooter.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import EmptyState from "../components/app-shell/EmptyState.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";

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
} = runtime;
</script>

