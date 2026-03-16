<template>
  <div class="flex flex-wrap items-center gap-2">
    <div class="relative min-w-[200px] max-w-xs flex-1">
      <svg class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 16 16">
        <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" />
        <path d="m11 11 3 3" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" />
      </svg>
      <input
        :value="search"
        type="text"
        placeholder="Ara..."
        class="h-8 w-full rounded-md border border-gray-200 bg-white pl-8 pr-3 text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:border-brand-600 focus:outline-none"
        @input="$emit('update:search', $event.target.value)"
      />
    </div>

    <select
      v-for="filter in filters"
      :key="filter.key"
      class="h-8 appearance-none rounded-md border border-gray-200 bg-white bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAxNiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJtNSA2IDMgMyAzLTMiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-[right_6px_center] bg-no-repeat px-2.5 pr-7 text-sm text-gray-700 transition-colors focus:border-brand-600 focus:outline-none"
      @change="$emit('filter-change', { key: filter.key, value: $event.target.value })"
    >
      <option value="">{{ filter.label }}: Tümü</option>
      <option v-for="opt in filter.options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>

    <button
      v-if="activeCount > 0"
      class="flex h-8 items-center gap-1 rounded-md border border-gray-200 px-2.5 text-xs text-gray-500 transition-colors hover:bg-gray-50"
      @click="$emit('reset')"
    >
      Sıfırla
      <span class="flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-600">
        {{ activeCount }}
      </span>
    </button>

    <div class="ml-auto flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  search: { type: String, default: '' },
  filters: { type: Array, default: () => [] },
  activeCount: { type: Number, default: 0 },
})

defineEmits(['update:search', 'filter-change', 'reset'])
</script>
