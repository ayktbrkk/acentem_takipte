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
              ? 'inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-brand-700 transition hover:bg-sky-100'
              : 'inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100'"
            @click="onToggleColumn(column)"
          >
            {{ getColumnLabel(column) }}
          </button>
        </div>
      </div>

      <!-- Pivot / Grouping Area -->
      <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700">{{ t("groupBy") || 'Group By' }}</p>
          <span v-if="groupByColumn" class="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            {{ getColumnLabel(groupByColumn) }}
          </span>
        </div>
        <div class="mt-2 flex flex-wrap gap-2">
          <button
            v-for="column in Array.from(groupableColumns)"
            :key="`group-${column}`"
            type="button"
            :class="groupByColumn === column
              ? 'inline-flex items-center rounded-full border border-amber-400 bg-amber-200 px-2.5 py-1 text-xs font-bold text-amber-900 transition'
              : 'inline-flex items-center rounded-full border border-amber-100 bg-white px-2.5 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100'"
            @click="$emit('on-group-by-change', column)"
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

      <div class="mt-4 overflow-hidden rounded-lg border border-slate-200">
        <div class="overflow-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50">
                <th
                  v-for="column in visibleColumns"
                  :key="column"
                  class="px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-slate-400"
                >
                  <button
                    type="button"
                    class="inline-flex w-full items-center justify-between gap-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-600"
                    @click="onToggleSort(column)"
                  >
                    <span>{{ getColumnLabel(column) }}</span>
                    <span class="text-[10px] text-slate-400">{{ getSortIndicator(column) }}</span>
                  </button>
                </th>
                <th class="w-10 px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(row, rowIndex) in sortedRows" :key="row.name || rowIndex">
                <tr v-if="row.is_group_header" class="bg-slate-100/80 border-y border-slate-200">
                  <td :colspan="visibleColumns.length + 1" class="px-4 py-2">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-slate-800 uppercase tracking-wide">{{ row._group_title }}</span>
                      <div class="flex items-center gap-4 text-[11px] font-bold text-slate-500">
                        <span v-if="row.gross_premium || row.total_gross_premium">
                          {{ t('summaryGrossPremium') }}: {{ formatCellValue('gross_premium', row.gross_premium || row.total_gross_premium) }}
                        </span>
                        <span v-if="row.commission_amount || row.total_commission">
                          {{ t('summaryCommission') }}: {{ formatCellValue('commission_amount', row.commission_amount || row.total_commission) }}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr
                  v-else
                  class="group border-b border-slate-100 transition-colors duration-100 last:border-0"
                  :class="isRowClickable(row) ? 'cursor-pointer hover:bg-slate-50' : ''"
                  @click="onRowClick(row)"
                >
                  <td v-for="column in visibleColumns" :key="column" class="px-4 py-3 text-sm text-slate-900">
                    {{ formatCellValue(column, row[column]) }}
                  </td>
                  <td class="w-10 px-4 py-3 text-right">
                    <button
                      v-if="row.name || row.policy || row.customer"
                      type="button"
                      class="rounded-full p-1.5 text-slate-400 opacity-0 transition-all hover:bg-slate-100 hover:text-brand-600 group-hover:opacity-100"
                      title="Preview"
                      @click.stop="$emit('on-preview-click', row)"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
          <p class="text-xs text-slate-400">{{ sortedRows.length }} / {{ sortedRows.length }} {{ t("showingRecords") }}</p>
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
  groupByColumn: {
    type: String,
    default: "",
  },
  groupableColumns: {
    type: [Set, Array],
    default: () => new Set(),
  },
});

defineEmits(["on-preview-click", "on-group-by-change"]);
</script>
