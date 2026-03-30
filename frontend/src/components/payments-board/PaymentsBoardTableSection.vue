<template>
  <article class="surface-card rounded-2xl p-5">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-slate-900">{{ t("title") }}</h3>
        <p class="text-xs text-slate-500">{{ t("showing") }} {{ payments.length }}</p>
      </div>
    </div>

    <div v-if="loading" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
      {{ t("loading") }}
    </div>
    <article v-else-if="errorText" class="qc-error-banner mt-4">
      <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
      <p class="qc-error-banner__text mt-1">{{ errorText }}</p>
    </article>
    <div v-else-if="payments.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <EmptyState :title="t('emptyTitle')" :description="t('empty')" />
    </div>
    <div v-else class="mt-4">
      <ListTable
        :columns="paymentListColumns"
        :rows="paymentsWithActions"
        :loading="false"
        :empty-message="t('empty')"
        @row-click="$emit('row-click', $event)"
      />
    </div>
  </article>
</template>

<script setup>
import EmptyState from "../app-shell/EmptyState.vue";
import ListTable from "../ui/ListTable.vue";

defineProps({
  payments: {
    type: Array,
    required: true,
  },
  paymentListColumns: {
    type: Array,
    required: true,
  },
  paymentsWithActions: {
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
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["row-click"]);
</script>
