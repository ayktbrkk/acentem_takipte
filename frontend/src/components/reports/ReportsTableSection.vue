<template>
  <SectionPanel
    :title="activeReportLabel"
    :count="sortedRows.length"
    :meta="branchScopeLabel"
    panel-class="surface-card rounded-2xl p-5"
  >
    <div class="mt-1 flex items-center justify-between gap-3 text-xs text-slate-500">
      <span>{{ t("columns") }}: {{ columnsSummaryLabel }}</span>
      <span v-if="exportLoading">{{ t("exporting") }}</span>
    </div>

    <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <p class="text-xs text-slate-600">{{ t("columnHint") }}</p>
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
            {{ columnsSummaryLabel }}
          </span>
          <button
            type="button"
            class="btn btn-outline btn-xs"
            @click="onShowAllColumns"
          >
            {{ t("showAllColumns") }}
          </button>
        </div>
      </div>

      <div class="mt-3 rounded-xl border border-slate-200 bg-white/90 p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{{ t("columns") }}</p>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {{ columnsSummaryLabel }}
          </span>
        </div>
        <div class="mt-2 max-h-40 overflow-y-auto flex flex-wrap gap-2">
          <button
            v-for="column in columns"
            :key="`all-${column}`"
            type="button"
            :class="isColumnVisible(column)
              ? 'inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 transition hover:bg-sky-100'
              : 'inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100'"
            @click="onToggleColumn(column)"
          >
            {{ getColumnLabel(column) }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
      {{ t("loading") }}
    </div>
    <div v-else-if="error" class="mt-4 qc-error-banner" role="alert" aria-live="polite">
      <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
      <p class="qc-error-banner__text mt-1">{{ error }}</p>
    </div>
    <template v-else>
      <div v-if="sortedRows.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <EmptyState :title="t('emptyTitle')" :description="t('emptyDescription')" />
      </div>

      <div class="mt-4 overflow-hidden rounded-lg border border-gray-200">
        <div class="overflow-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50">
                <th
                  v-for="column in visibleColumns"
                  :key="column"
                  class="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-gray-400"
                >
                  <button
                    type="button"
                    class="inline-flex w-full items-center justify-between gap-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-600"
                    @click="onToggleSort(column)"
                  >
                    <span>{{ getColumnLabel(column) }}</span>
                    <span class="text-[10px] text-gray-400">{{ getSortIndicator(column) }}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, rowIndex) in sortedRows"
                :key="row.name || rowIndex"
                class="border-b border-gray-100 transition-colors duration-100 last:border-0"
                :class="isRowClickable(row) ? 'cursor-pointer hover:bg-gray-50' : ''"
                @click="onRowClick(row)"
              >
                <td v-for="column in visibleColumns" :key="column" class="px-4 py-3 text-sm text-gray-900">
                  {{ formatCellValue(column, row[column]) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
          <p class="text-xs text-gray-400">{{ sortedRows.length }} / {{ sortedRows.length }} {{ t("showingRecords") }}</p>
        </div>
      </div>
    </template>
  </SectionPanel>
</template>

<script setup>
import EmptyState from "../app-shell/EmptyState.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";

defineProps({
  activeReportLabel: {
    type: String,
    required: true,
  },
  branchScopeLabel: {
    type: String,
    required: true,
  },
  columnsSummaryLabel: {
    type: String,
    required: true,
  },
  columns: {
    type: Array,
    default: () => [],
  },
  visibleColumns: {
    type: Array,
    default: () => [],
  },
  sortedRows: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: "",
  },
  exportLoading: {
    type: Boolean,
    default: false,
  },
  isColumnVisible: {
    type: Function,
    required: true,
  },
  onToggleColumn: {
    type: Function,
    required: true,
  },
  onShowAllColumns: {
    type: Function,
    required: true,
  },
  getColumnLabel: {
    type: Function,
    required: true,
  },
  onToggleSort: {
    type: Function,
    required: true,
  },
  getSortIndicator: {
    type: Function,
    required: true,
  },
  formatCellValue: {
    type: Function,
    required: true,
  },
  isRowClickable: {
    type: Function,
    required: true,
  },
  onRowClick: {
    type: Function,
    required: true,
  },
  t: {
    type: Function,
    required: true,
  },
});
</script>
