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
              'px-4 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-gray-400',
              col.align === 'right' && 'text-right',
              col.align === 'center' && 'text-center',
            ]"
          >
            {{ col.label }}
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
            ]"
          >
            <StatusBadge v-if="col.type === 'status'" :status="row[col.key]" />

            <span v-else-if="col.type === 'badge'" :class="['badge', `badge-${row[col.key + '_color'] ?? 'gray'}`]">
              {{ row[col.key] }}
            </span>

            <span v-else-if="col.type === 'mono'" class="font-mono text-xs text-gray-700">
              {{ row[col.key] ?? '—' }}
            </span>

            <span v-else-if="col.type === 'amount'" class="text-sm font-medium text-gray-900">
              {{ row[col.key] ?? '—' }}
            </span>

            <span v-else-if="col.type === 'urgency'" :class="urgencyClass(row[col.key])">
              {{ row[col.key] != null ? `${row[col.key]} gün` : '—' }}
            </span>

            <span v-else-if="col.type === 'date'" class="text-sm text-gray-600">
              {{ row[col.key] ?? '—' }}
            </span>

            <span v-else class="text-sm text-gray-900">
              {{ row[col.key] ?? '—' }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import StatusBadge from '@/components/ui/StatusBadge.vue'

defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  emptyMessage: { type: String, default: 'Kayıt bulunamadı.' },
})

defineEmits(['row-click'])

function urgencyClass(days) {
  if (days == null) return 'text-sm text-gray-400'
  if (days <= 7) return 'urgency-critical'
  if (days <= 30) return 'urgency-warning'
  if (days <= 90) return 'urgency-normal'
  return 'urgency-safe'
}
</script>
