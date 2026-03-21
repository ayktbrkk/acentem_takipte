<template>
  <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
    <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
      <p class="text-sm font-medium text-gray-800">Yaklaşan Yenilemeler</p>
      <span class="badge badge-amber">{{ renewals.length }} bekliyor</span>
    </div>

    <div v-if="!renewals.length" class="card-empty">Yaklaşan yenileme yok.</div>

    <div v-else>
      <div
        v-for="r in renewals"
        :key="r.name"
        class="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50 last:border-0"
        @click="$emit('row-click', r)"
      >
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium"
          :class="avatarClass(r.remaining_days)"
        >
          {{ initials(r.customer) }}
        </div>

        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-gray-900">{{ r.customer }}</p>
          <p class="text-xs text-gray-400">{{ r.branch }}</p>
        </div>

        <span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium" :class="urgencyBadgeClass(r.remaining_days)">
          {{ r.remaining_days }} gun
        </span>

        <p class="w-24 shrink-0 text-right text-sm font-medium text-gray-900">{{ r.premium }}</p>
      </div>
    </div>

    <div class="border-t border-gray-100 px-4 py-2.5">
      <button class="text-xs font-medium text-brand-600 transition-colors hover:text-brand-700" @click="$emit('view-all')">
        Tümünü Gör ->
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  renewals: { type: Array, default: () => [] },
})

defineEmits(['row-click', 'view-all'])

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function avatarClass(days) {
  if (days <= 7) return 'bg-amber-50 text-amber-700'
  if (days <= 30) return 'bg-amber-50 text-amber-600'
  return 'bg-brand-50 text-brand-600'
}

function urgencyBadgeClass(days) {
  if (days <= 7) return 'bg-amber-50 text-amber-700'
  if (days <= 30) return 'bg-amber-50 text-amber-600'
  return 'bg-gray-100 text-gray-600'
}
</script>
