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
              'px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider text-slate-400',
              col.align === 'right' && 'text-right',
              col.align === 'center' && 'text-center',
            ]"
          >
            {{ formatHeaderLabel(col.label) }}
          </th>
          <th v-if="clickable" class="w-10 bg-gray-50 px-4 py-2.5"></th>
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
              (col.align === 'right' || col.type === 'amount' || col.type === 'finance') && 'text-right',
              col.align === 'center' && 'text-center',
              resolveCellClass(col, row),
            ]"
          >
            <StatusBadge v-if="col.type === 'status'" :status="row[col.key]" :domain="col.domain || null" />

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

            <span v-else-if="col.type === 'date'" class="text-[13px] text-slate-600">
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
              <span class="text-[13px] font-semibold text-slate-900">{{ row[col.key] ?? '-' }}</span>
              <span v-if="col.secondaryKey" class="text-[11px] text-slate-400 leading-tight mt-0.5">
                {{ row[col.secondaryKey] ?? '-' }}
              </span>
            </div>

            <div v-else-if="col.type === 'compound'" class="min-w-[280px]">
              <p class="font-medium text-slate-800">{{ row[col.primaryKey] ?? '-' }}</p>
              <p class="text-xs text-slate-500">{{ row[col.secondaryKey] ?? '-' }}</p>
              <div v-if="col.badgeKey && row[col.badgeKey]" class="mt-1 flex flex-wrap items-center gap-1">
                <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
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

          </td>
          <td v-if="clickable" class="px-4 py-3 text-right">
            <FeatherIcon name="chevron-right" class="inline-block h-4 w-4 text-gray-300 group-hover:text-gray-400" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from "vue";
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
});

defineEmits(["row-click"]);

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
</script>
