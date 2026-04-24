<template>
  <div class="overflow-hidden rounded-lg border border-gray-200">
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
    </div>

    <table v-else class="w-full border-collapse">
      <thead>
        <tr class="border-b border-gray-200 bg-gray-50">
          <th
            v-for="col in columns"
            :key="col.key"
            :style="col.width ? `width: ${col.width}` : ''"
            :class="[
              'px-4 py-2.5 text-left text-[10.5px] font-semibold tracking-wider text-gray-400',
              col.align === 'right' && 'text-right',
              col.align === 'center' && 'text-center',
            ]"
          >
            {{ formatHeaderLabel(col.label) }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!rows.length">
          <td :colspan="columns.length" class="px-4 py-12 text-center text-sm text-gray-400">
            {{ emptyMessage }}
          </td>
        </tr>
        <tr
          v-for="row in rows"
          :key="row.name ?? row.id"
          :class="[
            'cursor-pointer border-b border-gray-100 transition-colors duration-100 last:border-0',
            row._urgency || 'hover:bg-gray-50',
          ]"
          @click="$emit('row-click', row)"
        >
          <td
            v-for="col in columns"
            :key="col.key"
            :class="[
              'px-4 py-3',
              col.align === 'right' && 'text-right',
              col.align === 'center' && 'text-center',
              resolveCellClass(col, row),
            ]"
          >
            <StatusBadge v-if="col.type === 'status'" :status="row[col.key]" :domain="col.domain || null" />

            <span v-else-if="col.type === 'badge'" :class="['badge', `badge-${row[col.key + '_color'] ?? 'gray'}`]">
              {{ row[col.key] }}
            </span>

            <span v-else-if="col.type === 'mono'" class="font-mono text-xs text-gray-700">
              {{ row[col.key] ?? '-' }}
            </span>

            <span v-else-if="col.type === 'amount'" :class="['text-sm font-medium', row[`${col.key}_class`] || 'text-gray-900']">
              {{ row[col.key] ?? '-' }}
            </span>

            <span v-else-if="col.type === 'urgency'" :class="urgencyClass(row[col.key])">
              {{ row[col.key] != null ? `${row[col.key]} ${translateText('days', locale)}` : '-' }}
            </span>

            <span v-else-if="col.type === 'date'" class="text-sm text-gray-600">
              {{ formatDateCell(row[col.key]) }}
            </span>

            <div v-else-if="col.type === 'actions'" class="flex flex-wrap justify-end gap-2" @click.stop>
              <button
                v-for="action in row[col.key] || row._actions || []"
                :key="action.key || action.label"
                :class="[
                  'btn btn-sm',
                  action.variant === 'primary' ? 'btn-primary' : action.variant === 'outline' ? 'btn-outline' : '',
                ]"
                :disabled="Boolean(action.disabled)"
                type="button"
                @click.stop="action.onClick?.(row)"
              >
                {{ action.label }}
              </button>
            </div>

            <div v-else-if="col.type === 'stacked'" class="flex flex-col">
              <span class="text-sm font-medium text-gray-900">{{ row[col.key] ?? '-' }}</span>
              <span v-if="col.secondaryKey" class="text-[10.5px] text-gray-400 leading-tight mt-0.5">
                {{ row[col.secondaryKey] ?? '-' }}
              </span>
            </div>

            <span v-else class="text-sm text-gray-900">
              {{ row[col.key] ?? '-' }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from "vue";

import StatusBadge from "@/components/ui/StatusBadge.vue";
import { translateText, uppercaseText } from "@/utils/i18n";

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  emptyMessage: { type: String, default: "No records found." },
  locale: { type: String, default: "en" },
});

defineEmits(["row-click"]);

const locale = computed(() => props.locale || "en");

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
</script>
