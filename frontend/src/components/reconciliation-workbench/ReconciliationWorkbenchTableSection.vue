<template>
  <SectionPanel :title="props.t('reconciliationListTitle')" :count="props.reconciliationListRows.length" :meta="props.t('subtitle')">
    <template #trailing>
      <p class="text-xs text-slate-500">{{ props.t("showing") }} {{ props.reconciliationListRows.length }} / {{ props.rows.length }}</p>
    </template>

    <div v-if="props.workbenchLoading" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
      {{ props.t("loading") }}
    </div>
    <div v-else-if="props.workbenchErrorText" class="mt-4 qc-error-banner" role="alert" aria-live="polite">
      <p class="qc-error-banner__text font-semibold">{{ props.t("loadErrorTitle") }}</p>
      <p class="qc-error-banner__text mt-1">{{ props.workbenchErrorText }}</p>
    </div>
    <div v-else-if="props.rows.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <EmptyState :title="props.t('emptyTitle')" :description="props.t('empty')" />
    </div>
    <div v-else class="mt-4">
      <ListTable
        :columns="props.reconciliationListColumns"
        :rows="props.reconciliationListRows"
        :loading="false"
        :empty-message="props.t('empty')"
        @row-click="$emit('row-click', $event)"
      />
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import EmptyState from "../app-shell/EmptyState.vue";
import ListTable from "../ui/ListTable.vue";

const props = defineProps({
  t: { type: Function, required: true },
  workbenchLoading: { type: Boolean, default: false },
  workbenchErrorText: { type: String, default: "" },
  rows: { type: Array, default: () => [] },
  reconciliationListColumns: { type: Array, default: () => [] },
  reconciliationListRows: { type: Array, default: () => [] },
});

defineEmits(["row-click"]);
</script>
