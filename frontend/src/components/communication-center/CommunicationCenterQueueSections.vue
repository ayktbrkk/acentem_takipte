<template>
  <SectionPanel :title="t('outboxTitle')" :count="outboxItems.length" panel-class="surface-card rounded-2xl p-5">
    <div v-if="snapshotLoading" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
      {{ t('loading') }}
    </div>
    <div v-else-if="outboxItems.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <EmptyState :title="t('emptyOutboxTitle')" :description="t('emptyOutbox')" />
    </div>
    <div v-else class="mt-4 overflow-auto">
      <table class="at-table">
        <thead>
          <tr class="at-table-head-row">
            <th class="at-table-head-cell">{{ t('recipient') }}</th>
            <th class="at-table-head-cell">{{ t('channel') }}</th>
            <th class="at-table-head-cell">{{ t('status') }}</th>
            <th class="at-table-head-cell">{{ t('attempts') }}</th>
            <th class="at-table-head-cell">{{ t('nextRetry') }}</th>
            <th class="at-table-head-cell">{{ t('actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in outboxItems" :key="row.name" class="at-table-row">
            <DataTableCell cell-class="min-w-[280px]">
              <p class="font-medium text-slate-800">{{ row.recipient || "-" }}</p>
              <p class="text-xs text-slate-500">{{ row.name }}</p>
              <div v-if="row.reference_doctype || row.reference_name" class="mt-1 flex flex-wrap items-center gap-1">
                <span
                  v-if="row.reference_doctype"
                  class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700"
                >
                  {{ referenceTypeLabel(row.reference_doctype) }}
                </span>
                <span v-if="row.reference_name" class="text-xs text-slate-500">{{ row.reference_name }}</span>
              </div>
            </DataTableCell>
            <DataTableCell>
              <StatusBadge v-if="row.channel" domain="notification_channel" :status="row.channel" />
              <span v-else class="text-slate-700">-</span>
            </DataTableCell>
            <DataTableCell cell-class="min-w-[220px]">
              <StatusBadge v-if="row.status" domain="notification_status" :status="row.status" />
              <span v-else class="text-slate-700">-</span>
              <p v-if="row.error_message" class="mt-1 max-w-[320px] truncate qc-inline-error">
                {{ row.error_message }}
              </p>
            </DataTableCell>
            <DataTableCell>
              <span class="text-slate-700">{{ row.attempt_count || 0 }}/{{ row.max_attempts || 0 }}</span>
            </DataTableCell>
            <DataTableCell>
              <span class="text-xs text-slate-600">{{ row.next_retry_on || "-" }}</span>
            </DataTableCell>
            <DataTableCell cell-class="min-w-[240px]">
              <InlineActionRow>
                <ActionButton
                  v-if="actions.canRetryOutboxRow(row)"
                  variant="secondary"
                  size="xs"
                  @click="runtime.retryOutbox(row.name)"
                >
                  {{ t('retry') }}
                </ActionButton>
                <ActionButton
                  v-if="actions.canSendDraftFromOutboxRow(row)"
                  variant="secondary"
                  size="xs"
                  @click="runtime.sendDraftNow(row.draft)"
                >
                  {{ t('sendNow') }}
                </ActionButton>
                <ActionButton
                  v-if="actions.canOpenPanel(row)"
                  variant="link"
                  size="xs"
                  trailing-icon=">"
                  @click="actions.openPanel(row)"
                >
                  {{ actions.panelActionLabel(row) }}
                </ActionButton>
              </InlineActionRow>
            </DataTableCell>
          </tr>
        </tbody>
      </table>
    </div>
  </SectionPanel>

  <SectionPanel :title="t('draftTitle')" :count="draftItems.length" panel-class="surface-card rounded-2xl p-5">
    <div v-if="snapshotLoading" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
      {{ t('loading') }}
    </div>
    <div v-else-if="draftItems.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <EmptyState :title="t('emptyDraftsTitle')" :description="t('emptyDrafts')" />
    </div>
    <div v-else class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="draft in draftItems"
        :key="draft.name"
        class="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
      >
        <div class="flex items-start justify-between gap-2">
          <p class="text-sm font-semibold text-slate-900">{{ draft.event_key }}</p>
          <StatusBadge v-if="draft.status" domain="notification_status" :status="draft.status" />
        </div>
        <div class="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
          <StatusBadge v-if="draft.channel" domain="notification_channel" :status="draft.channel" />
          <span>{{ draft.recipient || "-" }}</span>
        </div>
        <div class="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
          <span
            v-if="draft.reference_doctype"
            class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700"
          >
            {{ referenceTypeLabel(draft.reference_doctype) }}
          </span>
          <span v-if="draft.reference_name">{{ draft.reference_name }}</span>
        </div>
        <p v-if="draft.error_message" class="mt-2 max-h-10 overflow-hidden qc-inline-error">
          {{ draft.error_message }}
        </p>
        <InlineActionRow class="mt-3">
          <ActionButton
            v-if="actions.canSendDraftCard(draft)"
            variant="secondary"
            size="xs"
            @click="runtime.sendDraftNow(draft.name)"
          >
            {{ t('sendNow') }}
          </ActionButton>
          <ActionButton
            v-if="actions.canOpenPanel(draft)"
            variant="link"
            size="xs"
            trailing-icon=">"
            @click="actions.openPanel(draft)"
          >
            {{ actions.panelActionLabel(draft) }}
          </ActionButton>
        </InlineActionRow>
      </article>
    </div>
  </SectionPanel>
</template>

<script setup>
import { computed, unref } from "vue";
import ActionButton from "../app-shell/ActionButton.vue";
import DataTableCell from "../app-shell/DataTableCell.vue";
import EmptyState from "../app-shell/EmptyState.vue";
import InlineActionRow from "../app-shell/InlineActionRow.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import StatusBadge from "../ui/StatusBadge.vue";

const props = defineProps({
  actions: {
    type: Object,
    required: true,
  },
  runtime: {
    type: Object,
    required: true,
  },
  state: {
    type: Object,
    required: true,
  },
  t: {
    type: Function,
    required: true,
  },
});

const outboxItems = computed(() => unref(props.state.outboxItems));
const draftItems = computed(() => unref(props.state.draftItems));
const referenceTypeLabel = (doctype) => props.state.referenceTypeLabel(doctype);
const snapshotLoading = computed(() => props.runtime.snapshotResource.loading);
</script>
