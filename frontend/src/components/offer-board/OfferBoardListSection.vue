<template>
  <SectionPanel :title="title" :count="count" panel-class="surface-card rounded-2xl p-5">
    <ListTable
      :columns="columns"
      :rows="rows"
      :loading="loading"
      :empty-message="emptyMessage"
      @row-click="$emit('row-click', $event)"
    />
    <div class="mt-4 flex items-center justify-between">
      <p class="text-xs text-gray-400">{{ rowCount }} / {{ total }} {{ showingLabel }}</p>
      <div class="flex items-center gap-1">
        <button class="btn btn-sm" :disabled="page <= 1" @click="$emit('previous-page')">←</button>
        <span class="px-2 text-xs text-gray-600">{{ page }}</span>
        <button class="btn btn-sm" :disabled="!hasNextPage" @click="$emit('next-page')">→</button>
      </div>
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import ListTable from "../ui/ListTable.vue";

defineProps({
  title: { type: String, required: true },
  count: { type: [String, Number], required: true },
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  emptyMessage: { type: String, default: "" },
  rowCount: { type: [String, Number], default: 0 },
  total: { type: [String, Number], default: 0 },
  showingLabel: { type: String, default: "" },
  page: { type: Number, default: 1 },
  hasNextPage: { type: Boolean, default: false },
});

defineEmits(["row-click", "previous-page", "next-page"]);
</script>
