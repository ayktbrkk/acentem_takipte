<template>
  <div class="overflow-x-auto rounded-lg border border-gray-200">
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
    </div>

    <table v-else class="w-full border-collapse">
      <thead>
        <tr class="border-b border-gray-200 bg-gray-50">
          <th
            v-for="col in effectiveColumns"
            :key="col.key"
            :style="col.width ? `width: ${col.width}` : ''"
            :class="[
              'px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider text-slate-400',
              col.align === 'right' && 'text-right',
              col.align === 'center' && 'text-center',
            ]"
          >
            <button
              v-if="col.sortable"
              type="button"
              class="inline-flex w-full items-center justify-between gap-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-600"
              @click="onSortClick(col.key)"
            >
              <span>{{ formatHeaderLabel(col.label) }}</span>
              <span v-if="activeSortColumn === col.key" class="text-[10px] text-slate-400">
                {{ activeSortDirection === 'asc' ? '▲' : '▼' }}
              </span>
            </button>
            <span v-else>{{ formatHeaderLabel(col.label) }}</span>
          </th>
          <th v-if="showPreview" class="w-10 bg-gray-50 px-4 py-2.5"></th>
          <th v-if="clickable" class="w-10 bg-gray-50 px-4 py-2.5"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!sortedRows.length">
          <td :colspan="tableColspan" class="px-4 py-12 text-center text-sm text-gray-400">
            {{ emptyMessage }}
          </td>
        </tr>
        <template v-for="row in sortedRows" :key="row.name ?? row.id">
          <tr v-if="row._isGroupHeader" class="bg-slate-100/80 border-y border-slate-200">
            <td
              :colspan="tableColspan"
              class="px-4 py-2"
            >
              <div class="flex flex-col gap-0.5">
                <span class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {{ row._groupTitle }}
                </span>
                <span v-if="row._groupSubtitle" class="text-[11px] font-normal text-slate-400">
                  {{ row._groupSubtitle }}
                </span>
              </div>
            </td>
          </tr>
          <tr
            v-else
            :key="row.name ?? row.id"
          :class="[
            'cursor-pointer border-b border-gray-100 transition-colors duration-100 last:border-0',
            row._urgency || 'hover:bg-gray-50',
          ]"
          @click="$emit('row-click', row)"
        >
          <td
            v-for="col in effectiveColumns"
            :key="col.key"
            :class="[
              'px-4 py-3',
              (col.align === 'right' || col.type === 'amount' || col.type === 'finance') && 'text-right',
              col.align === 'center' && 'text-center',
              resolveCellClass(col, row),
            ]"
          >
            <span v-if="col.format" class="text-[13px] font-semibold text-slate-900">
              {{ col.format(row[col.key], row) }}
            </span>

            <StatusBadge v-else-if="col.type === 'status'" :status="row[col.key]" :domain="col.domain || null" />

            <span v-else-if="col.type === 'badge'" :class="['badge', 'badge-' + (row[col.key + '_color'] ?? 'gray')]">
              {{ row[col.key] }}
            </span>

            <span v-else-if="col.type === 'mono'" class="font-mono text-xs text-gray-700">
              {{ row[col.key] ?? '-' }}
            </span>

            <span v-else-if="col.type === 'amount'" :class="['text-[13px] font-semibold', row[col.key + '_class'] || 'text-slate-900']">
              {{ row[col.key] ?? '-' }}
            </span>

            <span v-else-if="col.type === 'urgency'" :class="urgencyClass(row[col.key])">
              {{ row[col.key] != null ? row[col.key] + ' ' + translateText('days', locale) : '-' }}
            </span>

            <span v-else-if="col.type === 'date'" class="text-[13px] font-semibold text-slate-900">
              {{ formatDateCell(row[col.key]) }}
            </span>

            <div v-else-if="col.type === 'actions'" class="flex flex-wrap justify-end gap-2" @click.stop>
              <ActionButton
                v-for="action in row[col.key] || row._actions || []"
                :key="action.key || action.label"
                :variant="action.variant === 'outline' ? 'secondary' : (action.variant || 'secondary')"
                size="xs"
                :disabled="Boolean(action.disabled)"
                @click.stop="action.onClick?.(row)"
              >
                {{ action.label }}
              </ActionButton>
            </div>

            <div v-else-if="col.type === 'stacked'" class="flex flex-col">
              <span class="text-[13px] font-semibold text-slate-900">{{ row[col.key] ?? '-' }}</span>
              <span v-if="col.secondaryKey" class="text-[11px] font-normal text-slate-400 tracking-wider leading-tight mt-0.5">
                {{ row[col.secondaryKey] ?? '-' }}
              </span>
            </div>

            <div v-else-if="col.type === 'compound'" class="min-w-[280px]">
              <p class="text-[13px] font-semibold text-slate-900">{{ row[col.primaryKey] ?? '-' }}</p>
              <p class="text-[11px] font-normal text-slate-400 tracking-wider">{{ row[col.secondaryKey] ?? '-' }}</p>
              <div v-if="col.badgeKey && row[col.badgeKey]" class="mt-1 flex flex-wrap items-center gap-1">
                <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                  {{ row[col.badgeKey] }}
                </span>
                <span v-if="col.badgeSecondaryKey && row[col.badgeSecondaryKey]" class="text-xs text-slate-500">{{ row[col.badgeSecondaryKey] }}</span>
              </div>
            </div>

            <div v-else-if="col.type === 'status-meta'" class="min-w-[220px]">
              <StatusBadge v-if="row[col.key]" :domain="col.domain" :status="row[col.key]" />
              <span v-else class="text-slate-700">-</span>
              <p v-if="col.metaKey && row[col.metaKey]" class="mt-1 max-w-[320px] truncate text-xs text-rose-600">
                {{ row[col.metaKey] }}
              </p>
            </div>

            <div v-else-if="col.type === 'attempts'">
              <span class="text-slate-700">{{ row[col.currentKey] ?? 0 }}/{{ row[col.maxKey] ?? 0 }}</span>
            </div>

            <div v-else-if="col.type === 'actions-advanced'" class="min-w-[240px]" @click.stop>
              <InlineActionRow>
                <ActionButton
                  v-for="action in (row[col.actionKey] || [])"
                  :key="action.label"
                  :variant="action.variant"
                  size="xs"
                  @click.stop="action.onClick?.(row)"
                >
                  {{ action.label }}
                </ActionButton>
              </InlineActionRow>
            </div>

            <span v-else class="text-[13px] font-semibold text-slate-900">
              {{ row[col.key] != null ? row[col.key] : '-' }}
            </span>

          </td>
          <td v-if="showPreview" class="w-10 px-4 py-3 text-right">
            <ActionButton
              variant="ghost"
              size="xs"
              class="rounded-full !p-1.5"
              :aria-label="translateText('preview', locale)"
              :title="translateText('preview', locale)"
              @click.stop="$emit('preview-click', row)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </ActionButton>
          </td>
          <td v-if="clickable" class="px-4 py-3 text-right">
            <FeatherIcon name="chevron-right" class="inline-block h-4 w-4 text-gray-300 group-hover:text-gray-400" />
          </td>
        </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { FeatherIcon } from "frappe-ui";

import StatusBadge from "@/components/ui/StatusBadge.vue";
import ActionButton from "../app-shell/ActionButton.vue";
import InlineActionRow from "../app-shell/InlineActionRow.vue";
import { translateText, uppercaseText } from "@/utils/i18n";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  clickable: { type: Boolean, default: false },
  emptyMessage: { type: String, default: "No records found." },
  locale: { type: String, default: "" },
  visibleColumns: { type: Array, default: null },
  sortColumn: { type: String, default: "" },
  sortDirection: { type: String, default: "" },
  showPreview: { type: Boolean, default: false },
});

const emit = defineEmits(["row-click", "update:sortColumn", "update:sortDirection", "preview-click"]);

const effectiveColumns = computed(() => {
  if (!props.visibleColumns || !props.visibleColumns.length) return props.columns;
  return props.columns.filter((col) => props.visibleColumns.includes(col.key));
});

const tableColspan = computed(() => effectiveColumns.value.length + (props.showPreview ? 1 : 0) + (props.clickable ? 1 : 0));

const isControlledSort = computed(() => props.sortColumn !== "");
const internalSortColumn = ref("");
const internalSortDirection = ref("");

const activeSortColumn = computed(() => isControlledSort.value ? props.sortColumn : internalSortColumn.value);
const activeSortDirection = computed(() => isControlledSort.value ? props.sortDirection : internalSortDirection.value);

const sortedRows = computed(() => {
  if (!props.rows || !props.rows.length) return props.rows;
  if (isControlledSort.value) return props.rows;
  if (!internalSortColumn.value || !internalSortDirection.value) return props.rows;

  const col = internalSortColumn.value;
  const dir = internalSortDirection.value === "asc" ? 1 : -1;
  return [...props.rows].sort((a, b) => {
    const aVal = a[col];
    const bVal = b[col];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === "number" && typeof bVal === "number") {
      return (aVal - bVal) * dir;
    }
    return String(aVal).localeCompare(String(bVal)) * dir;
  });
});

// Prefer explicit prop, then fall back to the user's actual locale from auth store.
const locale = computed(() => props.locale || authStore.locale || "en");

function urgencyClass(days) {
  if (days == null) return "text-sm text-gray-400";
  if (days <= 7) return "urgency-critical";
  if (days <= 30) return "urgency-warning";
  if (days <= 90) return "urgency-normal";
  return "urgency-safe";
}

function resolveCellClass(col, row) {
  if (typeof col?.cellClass === "function") return col.cellClass(row);
  return col?.cellClass || "";
}

function formatDateCell(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const localeCode = locale.value.toLowerCase().startsWith("tr") ? "tr-TR" : "en-US";
  return new Intl.DateTimeFormat(localeCode, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatHeaderLabel(value) {
  return uppercaseText(value, locale);
}

function onSortClick(column) {
  if (isControlledSort.value) {
    const nextDir = nextSortDirection(props.sortColumn === column ? props.sortDirection : "");
    if (props.sortColumn !== column) {
      emit("update:sortColumn", column);
      emit("update:sortDirection", "asc");
    } else {
      emit("update:sortDirection", nextDir);
    }
  } else {
    const nextDir = nextSortDirection(internalSortColumn.value === column ? internalSortDirection.value : "");
    if (internalSortColumn.value !== column) {
      internalSortColumn.value = column;
      internalSortDirection.value = "asc";
    } else {
      internalSortDirection.value = nextDir;
    }
  }
}

function nextSortDirection(current) {
  if (current === "" || current === "desc") return "asc";
  if (current === "asc") return "desc";
  return "asc";
}
</script>
