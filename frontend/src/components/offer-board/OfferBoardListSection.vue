<template>
  <div class="mt-8 space-y-4">
    <ListTable
      :columns="columns"
      :rows="rows"
      :locale="locale"
      :loading="loading"
      :empty-message="emptyMessage"
      @row-click="$emit('row-click', $event)"
    />
    <div class="mt-4 flex items-center justify-between px-2">
      <p class="text-xs font-medium text-slate-400">{{ rowCount }} / {{ total }} {{ showingLabel }}</p>
      <div class="flex items-center gap-2">
        <button class="btn btn-outline btn-sm" :disabled="page <= 1" @click="$emit('previous-page')">
          <FeatherIcon name="chevron-left" class="h-3 w-3" />
        </button>
        <span class="text-xs font-bold text-slate-900 w-8 text-center">{{ page }}</span>
        <button class="btn btn-outline btn-sm" :disabled="!hasNextPage" @click="$emit('next-page')">
          <FeatherIcon name="chevron-right" class="h-3 w-3" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui";
import ListTable from "../ui/ListTable.vue";

defineProps({
  title: { type: String, required: true },
  count: { type: [String, Number], required: true },
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  locale: { type: String, default: "en" },
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
