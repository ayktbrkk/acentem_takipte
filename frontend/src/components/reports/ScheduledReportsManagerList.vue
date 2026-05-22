<template>
  <div v-if="loading" class="mt-4 text-sm text-slate-500">
    {{ loadingLabel }}
  </div>

  <div v-else-if="!items.length" class="mt-4 text-sm text-slate-500">
    {{ emptyLabel }}
  </div>

  <div v-else class="mt-4 grid gap-3 xl:grid-cols-2">
    <article
      v-for="item in items"
      :key="`scheduled-${item.index}-${item.report_key}`"
      class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="text-sm font-semibold text-slate-900">{{ reportLabel(item.report_key) }}</div>
        <span
          class="rounded-full px-2.5 py-1 text-[11px] font-medium"
          :class="item.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'"
        >
          {{ item.enabled ? enabledLabel : disabledLabel }}
        </span>
      </div>

      <dl class="mt-3 space-y-2">
        <div class="flex items-start justify-between gap-3">
          <dt class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ frequencyLabel }}</dt>
          <dd class="text-right text-[13px] font-semibold text-slate-900">{{ item.frequency }}</dd>
        </div>
        <div class="flex items-start justify-between gap-3">
          <dt class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ formatLabel }}</dt>
          <dd class="text-right text-[13px] font-semibold text-slate-900">{{ item.format }}</dd>
        </div>
        <div class="flex items-start justify-between gap-3">
          <dt class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ deliveryChannelLabel }}</dt>
          <dd class="text-right text-[13px] font-semibold text-slate-900">{{ formatDeliveryChannel(item.delivery_channel) }}</dd>
        </div>
        <div class="flex items-start justify-between gap-3">
          <dt class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ limitLabel }}</dt>
          <dd class="text-right text-[13px] font-semibold text-slate-900">{{ item.limit }}</dd>
        </div>
        <div class="flex items-start justify-between gap-3">
          <dt class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ lastRunLabel }}</dt>
          <dd class="text-right text-[13px] font-semibold text-slate-900">{{ formatLastRun(item.last_run_at) }}</dd>
        </div>
        <div class="flex items-start justify-between gap-3">
          <dt class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ lastStatusLabel }}</dt>
          <dd class="text-right text-[13px] font-semibold text-slate-900">{{ formatLastStatus(item.last_status) }}</dd>
        </div>
        <div class="flex items-start justify-between gap-3">
          <dt class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ recipientsLabel }}</dt>
          <dd class="max-w-[65%] break-words text-right text-[13px] font-semibold text-slate-900">{{ item.recipients?.join(", ") || "-" }}</dd>
        </div>
        <div class="flex items-start justify-between gap-3">
          <dt class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ filtersLabel }}</dt>
          <dd class="max-w-[65%] break-words text-right text-[13px] font-semibold text-slate-900">{{ formatFilters(item.filters) }}</dd>
        </div>
      </dl>

      <div class="mt-4 flex flex-wrap gap-2">
        <ActionButton
          variant="secondary"
          size="sm"
          class="!rounded-xl !py-2 !font-medium"
          :disabled="loading || running"
          @click="$emit('edit', item)"
        >
          {{ editLabel }}
        </ActionButton>
        <ActionButton
          variant="secondary"
          size="sm"
          class="qc-danger-button !rounded-xl !py-2 !font-medium"
          :disabled="loading || running"
          @click="$emit('remove', item)"
        >
          {{ removeLabel }}
        </ActionButton>
      </div>
    </article>
  </div>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";

defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  running: { type: Boolean, default: false },
  loadingLabel: { type: String, required: true },
  emptyLabel: { type: String, required: true },
  reportLabel: { type: Function, required: true },
  enabledLabel: { type: String, required: true },
  disabledLabel: { type: String, required: true },
  frequencyLabel: { type: String, required: true },
  formatLabel: { type: String, required: true },
  deliveryChannelLabel: { type: String, required: true },
  limitLabel: { type: String, required: true },
  lastRunLabel: { type: String, required: true },
  lastStatusLabel: { type: String, required: true },
  recipientsLabel: { type: String, required: true },
  filtersLabel: { type: String, required: true },
  editLabel: { type: String, required: true },
  removeLabel: { type: String, required: true },
  formatDeliveryChannel: { type: Function, required: true },
  formatLastRun: { type: Function, required: true },
  formatLastStatus: { type: Function, required: true },
  formatFilters: { type: Function, required: true },
});

defineEmits(["edit", "remove"]);
</script>
