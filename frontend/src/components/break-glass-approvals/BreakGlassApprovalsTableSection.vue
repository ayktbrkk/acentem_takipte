<template>
  <SectionPanel :title="t('pendingTitle')" :count="pendingRows.length">
    <div
      v-if="errorText"
      class="rounded-xl border border-at-red/20 bg-at-red/5 px-5 py-4 flex flex-wrap items-center justify-between gap-4"
      role="alert"
      aria-live="polite"
    >
      <div>
        <p class="text-sm font-semibold text-at-red">{{ t("loadErrorTitle") }}</p>
        <p class="mt-1 text-sm text-at-red/90">{{ errorText }}</p>
      </div>
      <ActionButton variant="secondary" size="sm" :disabled="loading" @click="$emit('refresh')">
        {{ t("retry") }}
      </ActionButton>
    </div>

    <article v-if="actionResult" class="qc-success-banner mb-4" role="status" aria-live="polite">
      <p class="qc-success-banner__text font-semibold">{{ t("actionDone") }}</p>
      <p class="qc-success-banner__text mt-1">{{ actionResult }}</p>
    </article>

    <div v-if="loading" class="mt-4">
      <SkeletonLoader variant="list" :rows="6" />
    </div>
    <div v-else-if="pendingRows.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <EmptyState :title="t('emptyTitle')" :description="t('emptyDescription')" />
    </div>

    <div v-else class="mt-3 overflow-auto">
      <table class="at-table">
        <thead>
          <tr class="at-table-head-row">
            <th class="at-table-head-cell">{{ t("request") }}</th>
            <th class="at-table-head-cell">{{ t("accessType") }}</th>
            <th class="at-table-head-cell">{{ t("createdAt") }}</th>
            <th class="at-table-head-cell">{{ t("justification") }}</th>
            <th class="at-table-head-cell">{{ t("actions") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in pendingRows" :key="row.name" class="at-table-row align-top">
            <td class="at-table-cell">
              <p class="font-semibold text-slate-800">{{ row.name }}</p>
              <p class="text-xs text-slate-500">{{ row.user }}</p>
            </td>
            <td class="at-table-cell">{{ mapAccessType(row.access_type) }}</td>
            <td class="at-table-cell">{{ displayFallback(row.created_at) }}</td>
            <td class="at-table-cell max-w-[360px]">
              <p class="line-clamp-3">{{ displayFallback(row.justification) }}</p>
              <p class="mt-1 text-xs text-slate-500">{{ displayFallback(row.reference) }}</p>
            </td>
            <td class="at-table-cell min-w-[220px]">
              <label class="mb-2 flex flex-col gap-1">
                <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ t("durationHours") }}</span>
                <select v-model.number="actionForm[row.name].durationHours" class="input input-xs">
                  <option :value="4">4</option>
                  <option :value="8">8</option>
                  <option :value="24">24</option>
                  <option :value="48">48</option>
                  <option :value="72">72</option>
                </select>
              </label>
              <label class="mb-2 flex flex-col gap-1">
                <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ t("comments") }}</span>
                <input
                  v-model.trim="actionForm[row.name].comments"
                  class="input input-xs"
                  type="text"
                  :placeholder="t('commentsPlaceholder')"
                />
              </label>
              <div class="flex items-center gap-2">
                <ActionButton
                  variant="primary"
                  size="xs"
                  type="button"
                  :disabled="isRowBusy(row.name)"
                  @click="$emit('approve', row.name)"
                >
                  {{ t("approve") }}
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  size="xs"
                  type="button"
                  :disabled="isRowBusy(row.name)"
                  @click="$emit('reject', row.name)"
                >
                  {{ t("reject") }}
                </ActionButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </SectionPanel>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";
import EmptyState from "../app-shell/EmptyState.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import SkeletonLoader from "../ui/SkeletonLoader.vue";

const props = defineProps({
  pendingRows: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  errorText: {
    type: String,
    default: "",
  },
  actionResult: {
    type: String,
    default: "",
  },
  actionForm: {
    type: Object,
    required: true,
  },
  isRowBusy: {
    type: Function,
    required: true,
  },
  mapAccessType: {
    type: Function,
    required: true,
  },
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["refresh", "approve", "reject"]);

function displayFallback(value) {
  const normalized = String(value || "").trim();
  if (!normalized || /^none(?::none)?$/i.test(normalized)) {
    return props.t("notProvided");
  }
  return normalized;
}
</script>
