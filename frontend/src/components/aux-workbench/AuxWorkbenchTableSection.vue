<template>
  <SectionPanel :title="listLabel" :record-count="pagination.total" panel-class="surface-card rounded-2xl p-5">
    <template #trailing>
      <p class="text-xs text-slate-500 font-medium">{{ showingLabel }} {{ startRow }}-{{ endRow }} / {{ pagination.total }}</p>
    </template>

    <div v-if="isLoading && rows.length === 0" class="mt-4">
      <SkeletonLoader variant="list" :rows="10" />
    </div>
    <div
      v-else-if="loadErrorText"
      class="mt-4 rounded-xl border border-at-red/20 bg-at-red/5 px-5 py-4 flex flex-wrap items-center justify-between gap-4"
      role="alert"
      aria-live="polite"
    >
      <div>
        <p class="text-sm font-semibold text-at-red">{{ loadErrorTitle }}</p>
        <p class="mt-1 text-sm text-at-red/90">{{ loadErrorText }}</p>
      </div>
      <ActionButton variant="secondary" size="sm" :disabled="isLoading" @click="$emit('retry')">
        {{ retryLabel }}
      </ActionButton>
    </div>
    <div v-else-if="rows.length === 0" class="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5">
      <EmptyState :title="emptyTitle" :description="emptyDescription" />
    </div>
    <template v-else>
      <div class="overflow-x-auto mt-4 -mx-5 px-5">
        <table class="w-full min-w-[1000px] border-separate border-spacing-0">
          <thead>
            <tr class="bg-slate-50/50 border-b border-slate-100">
              <th class="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.05em] text-slate-400 uppercase">{{ recordLabel }}</th>
              <th class="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.05em] text-slate-400 uppercase">{{ detailsLabel }}</th>
              <th class="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.05em] text-slate-400 uppercase">{{ statusLabel }}</th>
              <th class="px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-[0.05em] text-slate-400 uppercase">{{ infoLabel }}</th>
              <th class="w-10 bg-slate-50/50 px-4 py-2.5 text-right text-[10.5px] font-semibold tracking-[0.05em] text-slate-400 uppercase">{{ actionsLabel }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr
              v-for="row in rows"
              :key="row.name"
              class="group hover:bg-slate-50/80 transition-colors cursor-pointer"
              @click="$emit('open-detail', row)"
            >
              <td class="px-4 py-4">
                <div class="flex flex-col">
                  <span class="text-sm font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">{{ rowTitle(row) }}</span>
                  <div class="mt-1 flex flex-wrap gap-x-2 gap-y-1">
                    <span v-for="fact in factItems(row, config.primaryFields)" :key="fact.label" class="text-[11px] text-slate-400">
                      {{ fact.label }}: <span class="text-slate-700 font-semibold">{{ fact.value }}</span>
                    </span>
                  </div>
                  <span class="mt-1 text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ modifiedLabel }}: {{ formatField(row.modified, 'modified') }}</span>
                </div>
              </td>

              <td class="px-4 py-4">
                <div class="grid grid-cols-1 gap-1">
                  <div v-for="fact in factItems(row, config.detailFields)" :key="fact.label" class="flex flex-col">
                    <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400 mb-0.5">{{ fact.label }}</span>
                    <span class="text-xs font-semibold text-slate-700 truncate max-w-[200px]">{{ fact.value }}</span>
                  </div>
                </div>
              </td>

              <td class="px-4 py-4">
                <div class="flex flex-wrap items-center gap-1.5">
                  <StatusBadge v-if="config.statusField && row[config.statusField] !== undefined" :domain="config.statusType || 'policy'" :status="statusValue(row, config.statusField, config.statusType)" />
                  <StatusBadge v-if="config.secondaryStatusField && row[config.secondaryStatusField]" :domain="config.secondaryStatusType || 'policy'" :status="statusValue(row, config.secondaryStatusField, config.secondaryStatusType)" />
                </div>
              </td>

              <td class="px-4 py-4">
                <div class="flex flex-wrap gap-4">
                  <div v-for="fact in factItems(row, config.metricFields)" :key="fact.label" class="flex flex-col items-center">
                    <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400 mb-0.5">{{ fact.label }}</span>
                    <span class="text-xs font-semibold text-slate-900">{{ fact.value }}</span>
                  </div>
                </div>
              </td>

              <td class="px-4 py-4 text-right align-top" @click.stop>
                <div v-if="visibleRowActions(row).length" class="flex flex-col items-end gap-1.5">
                  <ActionButton
                    v-for="action in visibleRowActions(row)"
                    :key="`${row.name}-${action.event}`"
                    :variant="action.variant"
                    size="xs"
                    :disabled="rowActionBusyName === row.name"
                    @click="$emit(action.event, row)"
                  >
                    {{ rowActionBusyName === row.name ? runningLabel : action.label }}
                  </ActionButton>
                </div>
                <FeatherIcon
                  v-else
                  name="chevron-right"
                  class="inline-block h-4 w-4 text-slate-200 group-hover:text-slate-400 transition-colors"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ListPager
        class="mt-6 border-t border-slate-50 pt-4"
        :shown="rows.length"
        :total="pagination.total"
        :page="pagination.page"
        :has-next="hasNextPage"
        :showing-label="showingRecordsLabel"
        @previous="$emit('previous')"
        @next="$emit('next')"
      />
    </template>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import EmptyState from "../app-shell/EmptyState.vue";
import StatusBadge from "../ui/StatusBadge.vue";
import SkeletonLoader from "../ui/SkeletonLoader.vue";
import ActionButton from "../app-shell/ActionButton.vue";
import ListPager from "../app-shell/ListPager.vue";
import { FeatherIcon } from "frappe-ui";

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
  "retry",
]);

const props = defineProps({
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
  showingRecordsLabel: { type: String, default: "" },
  requeueLabel: { type: String, default: "" },
  openCommunicationLabel: { type: String, default: "" },
  startTaskLabel: { type: String, default: "" },
  blockTaskLabel: { type: String, default: "" },
  completeTaskLabel: { type: String, default: "" },
  cancelTaskLabel: { type: String, default: "" },
  completeReminderLabel: { type: String, default: "" },
  cancelReminderLabel: { type: String, default: "" },
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

function pushAction(actions, enabled, event, label, variant = "secondary") {
  if (!enabled) return;
  actions.push({ event, label, variant });
}

function visibleRowActions(row) {
  const actions = [];

  pushAction(actions, props.canOpenDocumentRow(row), "open-document", props.openDocumentLabel);
  pushAction(actions, props.canArchiveDocumentRow(row), "archive-document", props.archiveDocumentLabel, "ghost");
  pushAction(actions, props.canRestoreDocumentRow(row), "restore-document", props.restoreDocumentLabel);
  pushAction(actions, props.canPermanentDeleteDocumentRow(row), "permanent-delete-document", props.permanentDeleteDocumentLabel, "ghost");
  pushAction(actions, props.canSendDraftNowRow(row), "send-draft-now", props.sendNowLabel);
  pushAction(actions, props.canRetryOutboxRow(row), "retry-outbox", props.retryLabel);
  pushAction(actions, props.canRequeueOutboxRow(row), "requeue-outbox", props.requeueLabel);
  pushAction(actions, props.canOpenCommunicationContextRow(row), "open-communication-context", props.openCommunicationLabel);
  pushAction(actions, props.panelCfgForRow(row)?.url, "open-panel", props.panelLabel);
  pushAction(actions, props.canStartTaskRow(row), "start-task", props.startTaskLabel);
  pushAction(actions, props.canStartOwnershipAssignmentRow(row), "start-ownership-assignment", props.startTaskLabel);
  pushAction(actions, props.canBlockTaskRow(row), "block-task", props.blockTaskLabel);
  pushAction(actions, props.canBlockOwnershipAssignmentRow(row), "block-ownership-assignment", props.blockTaskLabel);
  pushAction(actions, props.canCompleteTaskRow(row), "complete-task", props.completeTaskLabel);
  pushAction(actions, props.canCompleteOwnershipAssignmentRow(row), "complete-ownership-assignment", props.completeTaskLabel);
  pushAction(actions, props.canCompleteReminderRow(row), "complete-reminder", props.completeReminderLabel);
  pushAction(actions, props.canCancelTaskRow(row), "cancel-task", props.cancelTaskLabel, "ghost");
  pushAction(actions, props.canCancelReminderRow(row), "cancel-reminder", props.cancelReminderLabel, "ghost");

  return actions;
}
</script>
