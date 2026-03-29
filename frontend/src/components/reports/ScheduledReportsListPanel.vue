<template>
  <div>
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-slate-900">{{ t("title") }}</h3>
        <p class="mt-1 text-sm text-slate-500">{{ t("subtitle") }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
          :disabled="loading || running"
          @click="$emit('run')"
        >
          {{ t("run") }}
        </button>
        <button
          type="button"
          class="rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 transition hover:border-sky-400 hover:text-sky-900"
          :disabled="loading || running"
          @click="$emit('new')"
        >
          {{ t("new") }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="mt-4 text-sm text-slate-500">
      {{ t("loading") }}
    </div>

    <div v-else-if="!items.length" class="mt-4 text-sm text-slate-500">
      {{ t("empty") }}
    </div>

    <div v-else class="mt-4 grid gap-3 xl:grid-cols-2">
      <article
        v-for="item in items"
        :key="`scheduled-${item.index}-${item.report_key}`"
        class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="text-sm font-semibold text-slate-900">
            {{ reportLabel(item.report_key) }}
          </div>
          <span
            class="rounded-full px-2.5 py-1 text-[11px] font-medium"
            :class="item.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'"
          >
            {{ item.enabled ? t("enabled") : t("disabled") }}
          </span>
        </div>

        <dl class="mt-3 space-y-2 text-sm text-slate-600">
          <div class="flex items-start justify-between gap-3">
            <dt class="font-medium text-slate-500">{{ t("frequency") }}</dt>
            <dd class="text-right">{{ item.frequency }}</dd>
          </div>
          <div class="flex items-start justify-between gap-3">
            <dt class="font-medium text-slate-500">{{ t("format") }}</dt>
            <dd class="text-right">{{ item.format }}</dd>
          </div>
          <div class="flex items-start justify-between gap-3">
            <dt class="font-medium text-slate-500">{{ t("deliveryChannel") }}</dt>
            <dd class="text-right">{{ deliveryChannelLabel(item.delivery_channel) }}</dd>
          </div>
          <div class="flex items-start justify-between gap-3">
            <dt class="font-medium text-slate-500">{{ t("limit") }}</dt>
            <dd class="text-right">{{ item.limit }}</dd>
          </div>
          <div class="flex items-start justify-between gap-3">
            <dt class="font-medium text-slate-500">{{ t("lastRun") }}</dt>
            <dd class="text-right">{{ formatLastRun(item.last_run_at) }}</dd>
          </div>
          <div class="flex items-start justify-between gap-3">
            <dt class="font-medium text-slate-500">{{ t("lastStatus") }}</dt>
            <dd class="text-right">{{ lastStatusLabel(item.last_status) }}</dd>
          </div>
          <div class="flex items-start justify-between gap-3">
            <dt class="font-medium text-slate-500">{{ t("recipients") }}</dt>
            <dd class="max-w-[65%] text-right break-words">{{ item.recipients?.join(", ") || "-" }}</dd>
          </div>
          <div class="flex items-start justify-between gap-3">
            <dt class="font-medium text-slate-500">{{ t("filters") }}</dt>
            <dd class="max-w-[65%] text-right break-words">{{ formatFilters(item.filters) }}</dd>
          </div>
        </dl>

        <div class="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            :disabled="loading || running"
            @click="$emit('edit', item)"
          >
            {{ t("edit") }}
          </button>
          <button
            type="button"
            class="qc-danger-button rounded-xl px-3 py-2 text-sm font-medium"
            :disabled="loading || running"
            @click="$emit('remove', item)"
          >
            {{ t("remove") }}
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  running: { type: Boolean, default: false },
  t: { type: Function, required: true },
  reportLabel: { type: Function, required: true },
  deliveryChannelLabel: { type: Function, required: true },
  formatLastRun: { type: Function, required: true },
  lastStatusLabel: { type: Function, required: true },
  formatFilters: { type: Function, required: true },
});

defineEmits(["run", "new", "edit", "remove"]);
</script>
