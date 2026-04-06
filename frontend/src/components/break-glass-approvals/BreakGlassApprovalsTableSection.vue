<template>
  <SectionPanel :title="t('pendingTitle')" :count="pendingRows.length" panel-class="surface-card rounded-2xl p-5">
    <article v-if="errorText" class="qc-error-banner" role="alert" aria-live="polite">
      <p class="qc-error-banner__text">{{ errorText }}</p>
    </article>

    <article
      v-if="actionResult"
      class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
      role="status"
      aria-live="polite"
    >
      <p class="font-semibold">{{ t("actionDone") }}</p>
      <p class="mt-1">{{ actionResult }}</p>
    </article>

    <div v-if="loading" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
      {{ t("loading") }}
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
            <td class="at-table-cell">{{ row.created_at || "-" }}</td>
            <td class="at-table-cell max-w-[360px]">
              <p class="line-clamp-3">{{ row.justification || "-" }}</p>
              <p class="mt-1 text-xs text-slate-500">{{ row.reference || "-" }}</p>
            </td>
            <td class="at-table-cell min-w-[220px]">
              <label class="mb-2 flex flex-col gap-1">
                <span class="text-[11px] font-semibold tracking-wide text-slate-500">{{ t("durationHours") }}</span>
                <select v-model.number="actionForm[row.name].durationHours" class="input input-xs">
                  <option :value="4">4</option>
                  <option :value="8">8</option>
                  <option :value="24">24</option>
                  <option :value="48">48</option>
                  <option :value="72">72</option>
                </select>
              </label>
              <label class="mb-2 flex flex-col gap-1">
                <span class="text-[11px] font-semibold tracking-wide text-slate-500">{{ t("comments") }}</span>
                <input
                  v-model.trim="actionForm[row.name].comments"
                  class="input input-xs"
                  type="text"
                  :placeholder="t('commentsPlaceholder')"
                />
              </label>
              <div class="flex items-center gap-2">
                <button
                  class="btn btn-primary btn-xs"
                  type="button"
                  :disabled="isRowBusy(row.name)"
                  @click="$emit('approve', row.name)"
                >
                  {{ t("approve") }}
                </button>
                <button
                  class="btn btn-outline btn-xs"
                  type="button"
                  :disabled="isRowBusy(row.name)"
                  @click="$emit('reject', row.name)"
                >
                  {{ t("reject") }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </SectionPanel>
</template>

<script setup>
import EmptyState from "../app-shell/EmptyState.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";

defineProps({
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
</script>
