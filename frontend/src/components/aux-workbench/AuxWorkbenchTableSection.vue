<template>
  <SectionPanel :title="listLabel" :count="pagination.total" :meta="subtitleLabel" panel-class="surface-card rounded-2xl p-5">
    <template #trailing>
      <p class="text-xs text-slate-500">{{ showingLabel }} {{ startRow }}-{{ endRow }} / {{ pagination.total }}</p>
    </template>

    <div v-if="isLoading && rows.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
      {{ loadingLabel }}
    </div>
    <article v-else-if="loadErrorText" class="qc-error-banner mt-4">
      <p class="qc-error-banner__text font-semibold">{{ loadErrorTitle }}</p>
      <p class="qc-error-banner__text mt-1">{{ loadErrorText }}</p>
    </article>
    <div v-else-if="rows.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <EmptyState :title="emptyTitle" :description="emptyDescription" />
    </div>
    <template v-else>
      <div class="at-table-wrap mt-4">
        <table class="at-table w-full min-w-[980px]">
          <thead>
            <tr class="at-table-head-row">
              <th class="at-table-head-cell">{{ recordLabel }}</th>
              <th class="at-table-head-cell">{{ detailsLabel }}</th>
              <th class="at-table-head-cell">{{ statusLabel }}</th>
              <th class="at-table-head-cell">{{ infoLabel }}</th>
              <th class="at-table-head-cell">{{ actionsLabel }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.name"
              class="at-table-row cursor-pointer"
              @click="$emit('open-detail', row)"
            >
              <DataTableCell>
                <TableEntityCell :title="rowTitle(row)" :facts="factItems(row, config.primaryFields)">
                  <p class="text-xs text-slate-500">{{ modifiedLabel }}: {{ formatField(row.modified, 'modified') }}</p>
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
                    @click.stop="$emit('send-draft-now', row)"
                  >
                    {{ rowActionBusyName === row.name ? runningLabel : sendNowLabel }}
                  </ActionButton>
                  <ActionButton
                    v-if="canRetryOutboxRow(row)"
                    variant="secondary"
                    size="xs"
                    :disabled="rowActionBusyName === row.name"
                    @click.stop="$emit('retry-outbox', row)"
                  >
                    {{ rowActionBusyName === row.name ? runningLabel : retryLabel }}
                  </ActionButton>
                  <ActionButton
                    v-if="canRequeueOutboxRow(row)"
                    variant="secondary"
                    size="xs"
                    :disabled="rowActionBusyName === row.name"
                    @click.stop="$emit('requeue-outbox', row)"
                  >
                    {{ rowActionBusyName === row.name ? runningLabel : requeueLabel }}
                  </ActionButton>
                  <ActionButton
                    v-if="canOpenCommunicationContextRow(row)"
                    variant="secondary"
                    size="xs"
                    @click.stop="$emit('open-communication-context', row)"
                  >
                    {{ openCommunicationLabel }}
                  </ActionButton>
                  <ActionButton
                    v-if="canStartTaskRow(row)"
                    variant="secondary"
                    size="xs"
                    :disabled="rowActionBusyName === row.name"
                    @click.stop="$emit('start-task', row)"
                  >
                    {{ rowActionBusyName === row.name ? runningLabel : startTaskLabel }}
                  </ActionButton>
                  <ActionButton
                    v-if="canBlockTaskRow(row)"
                    variant="secondary"
                    size="xs"
                    :disabled="rowActionBusyName === row.name"
                    @click.stop="$emit('block-task', row)"
                  >
                    {{ rowActionBusyName === row.name ? runningLabel : blockTaskLabel }}
                  </ActionButton>
                  <ActionButton
                    v-if="canCompleteTaskRow(row)"
                    variant="secondary"
                    size="xs"
                    :disabled="rowActionBusyName === row.name"
                    @click.stop="$emit('complete-task', row)"
                  >
                    {{ rowActionBusyName === row.name ? runningLabel : completeTaskLabel }}
                  </ActionButton>
                  <ActionButton
                    v-if="canCancelTaskRow(row)"
                    variant="secondary"
                    size="xs"
                    :disabled="rowActionBusyName === row.name"
                    @click.stop="$emit('cancel-task', row)"
                  >
                    {{ rowActionBusyName === row.name ? runningLabel : cancelTaskLabel }}
                  </ActionButton>
                  <ActionButton
                    v-if="canCompleteReminderRow(row)"
                    variant="secondary"
                    size="xs"
                    :disabled="rowActionBusyName === row.name"
                    @click.stop="$emit('complete-reminder', row)"
                  >
                    {{ rowActionBusyName === row.name ? runningLabel : completeTaskLabel }}
                  </ActionButton>
                  <ActionButton
                    v-if="canCancelReminderRow(row)"
                    variant="secondary"
                    size="xs"
                    :disabled="rowActionBusyName === row.name"
                    @click.stop="$emit('cancel-reminder', row)"
                  >
                    {{ rowActionBusyName === row.name ? runningLabel : cancelTaskLabel }}
                  </ActionButton>
                  <ActionButton
                    v-if="canStartOwnershipAssignmentRow(row)"
                    variant="secondary"
                    size="xs"
                    :disabled="rowActionBusyName === row.name"
                    @click.stop="$emit('start-ownership-assignment', row)"
                  >
                    {{ rowActionBusyName === row.name ? runningLabel : startTaskLabel }}
                  </ActionButton>
                  <ActionButton
                    v-if="canBlockOwnershipAssignmentRow(row)"
                    variant="secondary"
                    size="xs"
                    :disabled="rowActionBusyName === row.name"
                    @click.stop="$emit('block-ownership-assignment', row)"
                  >
                    {{ rowActionBusyName === row.name ? runningLabel : blockTaskLabel }}
                  </ActionButton>
                  <ActionButton
                    v-if="canCompleteOwnershipAssignmentRow(row)"
                    variant="secondary"
                    size="xs"
                    :disabled="rowActionBusyName === row.name"
                    @click.stop="$emit('complete-ownership-assignment', row)"
                  >
                    {{ rowActionBusyName === row.name ? runningLabel : completeTaskLabel }}
                  </ActionButton>
                  <ActionButton variant="secondary" size="xs" @click.stop="$emit('open-detail', row)">{{ openDetailLabel }}</ActionButton>
                  <ActionButton
                    v-if="canOpenDocumentRow(row)"
                    variant="secondary"
                    size="xs"
                    @click.stop="$emit('open-document', row)"
                  >
                    {{ openDocumentLabel }}
                  </ActionButton>
                  <ActionButton
                    v-if="canArchiveDocumentRow(row)"
                    variant="secondary"
                    size="xs"
                    :disabled="rowActionBusyName === row.name"
                    @click.stop="$emit('archive-document', row)"
                  >
                    {{ rowActionBusyName === row.name ? runningLabel : archiveDocumentLabel }}
                  </ActionButton>
                  <ActionButton
                    v-if="canRestoreDocumentRow(row)"
                    variant="secondary"
                    size="xs"
                    :disabled="rowActionBusyName === row.name"
                    @click.stop="$emit('restore-document', row)"
                  >
                    {{ rowActionBusyName === row.name ? runningLabel : restoreDocumentLabel }}
                  </ActionButton>
                  <ActionButton
                    v-if="canPermanentDeleteDocumentRow(row)"
                    variant="secondary"
                    size="xs"
                    :disabled="rowActionBusyName === row.name"
                    class="text-red-700"
                    @click.stop="$emit('permanent-delete-document', row)"
                  >
                    {{ rowActionBusyName === row.name ? runningLabel : permanentDeleteDocumentLabel }}
                  </ActionButton>
                  <ActionButton v-if="panelCfgForRow(row)" variant="link" size="xs" trailing-icon=">" @click.stop="$emit('open-panel', row)">{{ panelLabel }}</ActionButton>
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
          :page-label="pageLabel"
          :previous-label="prevLabel"
          :next-label="nextLabel"
          :prev-disabled="pagination.page <= 1 || isLoading"
          :next-disabled="!hasNextPage || isLoading"
          @previous="$emit('previous')"
          @next="$emit('next')"
        />
      </div>
    </template>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import DataTableCell from "../app-shell/DataTableCell.vue";
import TableEntityCell from "../app-shell/TableEntityCell.vue";
import TableFactsCell from "../app-shell/TableFactsCell.vue";
import TablePagerFooter from "../app-shell/TablePagerFooter.vue";
import InlineActionRow from "../app-shell/InlineActionRow.vue";
import ActionButton from "../app-shell/ActionButton.vue";
import EmptyState from "../app-shell/EmptyState.vue";
import StatusBadge from "../ui/StatusBadge.vue";

defineProps({
  listLabel: { type: String, default: "" },
  subtitleLabel: { type: String, default: "" },
  showingLabel: { type: String, default: "" },
  loadingLabel: { type: String, default: "" },
  loadErrorTitle: { type: String, default: "" },
  loadErrorText: { type: String, default: "" },
  emptyTitle: { type: String, default: "" },
  emptyDescription: { type: String, default: "" },
  recordLabel: { type: String, default: "" },
  detailsLabel: { type: String, default: "" },
  statusLabel: { type: String, default: "" },
  infoLabel: { type: String, default: "" },
  actionsLabel: { type: String, default: "" },
  modifiedLabel: { type: String, default: "" },
  openDetailLabel: { type: String, default: "" },
  openDocumentLabel: { type: String, default: "" },
  archiveDocumentLabel: { type: String, default: "" },
  restoreDocumentLabel: { type: String, default: "" },
  permanentDeleteDocumentLabel: { type: String, default: "" },
  panelLabel: { type: String, default: "" },
  sendNowLabel: { type: String, default: "" },
  retryLabel: { type: String, default: "" },
  requeueLabel: { type: String, default: "" },
  openCommunicationLabel: { type: String, default: "" },
  startTaskLabel: { type: String, default: "" },
  blockTaskLabel: { type: String, default: "" },
  completeTaskLabel: { type: String, default: "" },
  cancelTaskLabel: { type: String, default: "" },
  runningLabel: { type: String, default: "" },
  pageLabel: { type: String, default: "" },
  prevLabel: { type: String, default: "" },
  nextLabel: { type: String, default: "" },
  rows: { type: Array, default: () => [] },
  pagination: { type: Object, required: true },
  totalPages: { type: Number, default: 1 },
  hasNextPage: { type: Boolean, default: false },
  startRow: { type: Number, default: 0 },
  endRow: { type: Number, default: 0 },
  isLoading: { type: Boolean, default: false },
  config: { type: Object, required: true },
  rowActionBusyName: { type: String, default: "" },
  rowTitle: { type: Function, required: true },
  factItems: { type: Function, required: true },
  formatField: { type: Function, required: true },
  fieldLabel: { type: Function, required: true },
  statusValue: { type: Function, required: true },
  panelCfgForRow: { type: Function, required: true },
  canSendDraftNowRow: { type: Function, required: true },
  canRetryOutboxRow: { type: Function, required: true },
  canRequeueOutboxRow: { type: Function, required: true },
  canOpenCommunicationContextRow: { type: Function, required: true },
  canStartTaskRow: { type: Function, required: true },
  canBlockTaskRow: { type: Function, required: true },
  canCompleteTaskRow: { type: Function, required: true },
  canCancelTaskRow: { type: Function, required: true },
  canCompleteReminderRow: { type: Function, required: true },
  canCancelReminderRow: { type: Function, required: true },
  canStartOwnershipAssignmentRow: { type: Function, required: true },
  canBlockOwnershipAssignmentRow: { type: Function, required: true },
  canCompleteOwnershipAssignmentRow: { type: Function, required: true },
  canOpenDocumentRow: { type: Function, required: true },
  canArchiveDocumentRow: { type: Function, required: true },
  canRestoreDocumentRow: { type: Function, required: true },
  canPermanentDeleteDocumentRow: { type: Function, required: true },
});

defineEmits([
  "open-detail",
  "open-document",
  "open-panel",
  "send-draft-now",
  "retry-outbox",
  "requeue-outbox",
  "open-communication-context",
  "start-task",
  "block-task",
  "complete-task",
  "cancel-task",
  "complete-reminder",
  "cancel-reminder",
  "start-ownership-assignment",
  "block-ownership-assignment",
  "complete-ownership-assignment",
  "archive-document",
  "restore-document",
  "permanent-delete-document",
  "previous",
  "next",
]);
</script>
