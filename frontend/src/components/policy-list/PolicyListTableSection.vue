<template>
  <SectionPanel
    :title="t('policyTableTitle')"
    :count="formatCount(totalCount)"
    panel-class="surface-card rounded-2xl p-5"
  >
    <ListTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :empty-message="t('empty')"
      @row-click="$emit('row-click', $event)"
    />

    <div class="mt-4 flex items-center justify-between">
      <p class="text-xs text-gray-400">{{ pageRows.length }} / {{ totalCount }} {{ t("showingRecords") }}</p>
      <div class="flex items-center gap-1">
        <button class="btn btn-sm" :disabled="page <= 1" @click="$emit('update-page', page - 1)">←</button>
        <span class="px-2 text-xs text-gray-600">{{ page }}</span>
        <button class="btn btn-sm" :disabled="page >= totalPages" @click="$emit('update-page', page + 1)">→</button>
      </div>
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import ListTable from "../ui/ListTable.vue";

defineProps({
  t: { type: Function, required: true },
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  totalCount: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  pageRows: { type: Array, required: true },
  page: { type: Number, required: true },
  formatCount: { type: Function, required: true },
});

defineEmits(["row-click", "update-page"]);
</script>
