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
          <ActionButton variant="secondary" size="sm" @click="onShowAllColumns">
            {{ t("showAllColumns") }}
          </ActionButton>
        </div>
      </div>

      <div class="mt-3 rounded-xl border border-slate-200 bg-white/90 p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{{ t("columns") }}</p>
          <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {{ columnsSummaryLabel }}
          </span>
        </div>
        <div class="mt-2 max-h-40 overflow-y-auto flex flex-wrap gap-2">
          <ActionButton
            v-for="column in columns"
            :key="`all-${column}`"
            variant="secondary"
            size="xs"
            :pressed="isColumnVisible(column)"
            @click="onToggleColumn(column)"
          >
            {{ getColumnLabel(column) }}
          </ActionButton>
        </div>
      </div>

      <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-amber-700">{{ t("groupBy") }}</p>
            <span v-if="groupByColumn" class="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
            {{ getColumnLabel(groupByColumn) }}
          </span>
        </div>
        <div class="mt-2 flex flex-wrap gap-2">
          <ActionButton
            v-for="column in Array.from(groupableColumns)"
            :key="`group-${column}`"
            variant="secondary"
            size="xs"
            tone="amber"
            :pressed="groupByColumn === column"
            @click="$emit('on-group-by-change', column)"
          >
            {{ getColumnLabel(column) }}
          </ActionButton>
        </div>
      </div>
    </div>

    <div v-if="fetchTruncated" class="mt-4 rounded-xl border border-at-amber/20 bg-at-amber/5 px-4 py-3 text-sm font-medium text-at-amber" role="status">
      {{ t("fetchLimitWarning") }}
    </div>

    <div v-if="loading" class="mt-4">
      <SkeletonLoader variant="list" :rows="8" />
    </div>
    <div
      v-else-if="error"
      class="mt-4 rounded-xl border border-at-red/20 bg-at-red/5 px-5 py-4 flex items-center justify-between gap-4"
      role="alert"
      aria-live="polite"
    >
      <div>
        <p class="text-sm font-semibold text-at-red">{{ t("loadErrorTitle") }}</p>
        <p class="mt-1 text-sm text-at-red/90">{{ error }}</p>
      </div>
      <ActionButton variant="secondary" size="sm" @click="$emit('retry')">
        {{ t("retry") }}
      </ActionButton>
    </div>
    <template v-else>
      <div v-if="sortedRows.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <EmptyState :title="t('emptyTitle')" :description="t('emptyDescription')" />
      </div>

      <div class="mt-4 space-y-4">
        <ListTable
          :columns="columnDefs"
          :rows="sortedRows"
          :loading="false"
          :sort-column="sortColumn"
          :sort-direction="sortDirection"
          :visible-columns="visibleColumnKeys.length ? visibleColumnKeys : null"
          :show-preview="true"
          @update:sort-column="$emit('update:sort-column', $event)"
          @update:sort-direction="$emit('update:sort-direction', $event)"
          @preview-click="$emit('on-preview-click', $event)"
          @row-click="$emit('on-row-click', $event)"
        />
        <ListPager
          v-if="totalCount > 0"
          :shown="shownCount"
          :total="totalCount"
          :page="page"
          :has-next="hasNextPage"
          :showing-label="t('showingRecords')"
          @previous="$emit('previous-page')"
          @next="$emit('next-page')"
        />
      </div>
    </template>
  </SectionPanel>
</template>

<script setup>
import { computed } from "vue";
import ListTable from "../ui/ListTable.vue";
import ActionButton from "../app-shell/ActionButton.vue";
import ListPager from "../app-shell/ListPager.vue";
import SkeletonLoader from "../ui/SkeletonLoader.vue";
import EmptyState from "../app-shell/EmptyState.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";

const props = defineProps({
  activeReportLabel: { type: String, required: true },
  branchScopeLabel: { type: String, required: true },
  columnsSummaryLabel: { type: String, required: true },
  sortedRows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  error: { type: String, default: "" },
  exportLoading: { type: Boolean, default: false },
  t: { type: Function, required: true },
  columns: { type: Array, default: () => [] },
  visibleColumnKeys: { type: Array, default: () => [] },
  isColumnVisible: { type: Function, required: true },
  onToggleColumn: { type: Function, required: true },
  onShowAllColumns: { type: Function, required: true },
  getColumnLabel: { type: Function, required: true },
  formatCellValue: { type: Function, required: true },
  sortColumn: { type: String, default: "" },
  sortDirection: { type: String, default: "" },
  groupByColumn: { type: String, default: "" },
  groupableColumns: { type: [Set, Array], default: () => new Set() },
  page: { type: Number, default: 1 },
  shownCount: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
  hasNextPage: { type: Boolean, default: false },
  fetchTruncated: { type: Boolean, default: false },
});

defineEmits([
  "on-preview-click",
  "on-group-by-change",
  "update:sort-column",
  "update:sort-direction",
  "on-row-click",
  "retry",
  "previous-page",
  "next-page",
]);

const columnDefs = computed(() => {
  const cols = props.columns || [];
  return cols.map((key) => ({
    key,
    label: props.getColumnLabel(key),
    sortable: true,
    format: (value, row) => props.formatCellValue(key, value, row),
  }));
});
</script>
