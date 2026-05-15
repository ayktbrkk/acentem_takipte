<template>
  <SectionPanel :title="t('outboxTitle')" :count="outboxItems.length" panel-class="surface-card rounded-2xl p-5">
    <ListTable
      :columns="outboxColumns"
      :rows="outboxRows"
      :loading="snapshotLoading"
      :empty-message="t('emptyOutbox')"
    />
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
              class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-700"
          >
            {{ referenceTypeLabel(draft.reference_doctype) }}
          </span>
          <span v-if="draft.reference_name">{{ draft.reference_name }}</span>
        </div>
        <p v-if="draft.error_message" class="mt-2 max-h-10 overflow-hidden text-xs text-rose-600">
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
import EmptyState from "../app-shell/EmptyState.vue";
import InlineActionRow from "../app-shell/InlineActionRow.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import StatusBadge from "../ui/StatusBadge.vue";
import ListTable from "../ui/ListTable.vue";

const props = defineProps({
  actions: { type: Object, required: true },
  runtime: { type: Object, required: true },
  state: { type: Object, required: true },
  t: { type: Function, required: true },
});

const outboxItems = computed(() => unref(props.state.outboxItems));
const draftItems = computed(() => unref(props.state.draftItems));
const referenceTypeLabel = (doctype) => props.state.referenceTypeLabel(doctype);
const snapshotLoading = computed(() => props.runtime.snapshotResource.loading);

const actionsApi = props.actions;

const outboxColumns = computed(() => [
  {
    key: "recipient",
    type: "compound",
    primaryKey: "recipient",
    secondaryKey: "name",
    badgeKey: "_reference_label",
    badgeSecondaryKey: "reference_name",
    label: props.t("recipient"),
  },
  { key: "channel", type: "status", domain: "notification_channel", label: props.t("channel") },
  { key: "status", type: "status-meta", metaKey: "error_message", domain: "notification_status", label: props.t("status") },
  { key: "attempts", type: "attempts", currentKey: "attempt_count", maxKey: "max_attempts", label: props.t("attempts") },
  { key: "next_retry_on", type: "date", label: props.t("nextRetry") },
  { key: "actions", type: "actions-advanced", actionKey: "_actions", label: props.t("actions") },
]);

const outboxRows = computed(() =>
  unref(outboxItems).map((row) => ({
    ...row,
    _reference_label: referenceTypeLabel(row.reference_doctype),
    _actions: buildOutboxActions(row),
  }))
);

function buildOutboxActions(row) {
  const actions = [];
  if (actionsApi.canRetryOutboxRow(row)) {
    actions.push({ label: props.t("retry"), variant: "secondary", onClick: () => props.runtime.retryOutbox(row.name) });
  }
  if (actionsApi.canSendDraftFromOutboxRow(row)) {
    actions.push({ label: props.t("sendNow"), variant: "secondary", onClick: () => props.runtime.sendDraftNow(row.draft) });
  }
  if (actionsApi.canOpenPanel(row)) {
    actions.push({ label: actionsApi.panelActionLabel(row), variant: "link", onClick: () => actionsApi.openPanel(row) });
  }
  return actions;
}
</script>
