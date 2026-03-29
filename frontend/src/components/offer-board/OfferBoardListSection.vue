<template>
  <SectionPanel
    v-if="isListView"
    :title="t('offerTableTitle')"
    :count="formatCount(offerListTotal)"
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
      <p class="text-xs text-gray-400">{{ rows.length }} / {{ offerListTotal }} {{ t("showingRecords") }}</p>
      <div class="flex items-center gap-1">
        <button class="btn btn-sm" :disabled="pagination.page <= 1" @click="$emit('previous-page')">←</button>
        <span class="px-2 text-xs text-gray-600">{{ pagination.page }}</span>
        <button class="btn btn-sm" :disabled="!hasNextPage" @click="$emit('next-page')">→</button>
      </div>
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import ListTable from "../ui/ListTable.vue";

defineProps({
  columns: {
    type: Array,
    default: () => [],
  },
  formatCount: {
    type: Function,
    required: true,
  },
  hasNextPage: {
    type: Boolean,
    default: false,
  },
  isListView: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  offerListTotal: {
    type: Number,
    default: 0,
  },
  pagination: {
    type: Object,
    default: () => ({ page: 1 }),
  },
  rows: {
    type: Array,
    default: () => [],
  },
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["row-click", "previous-page", "next-page"]);
</script>
