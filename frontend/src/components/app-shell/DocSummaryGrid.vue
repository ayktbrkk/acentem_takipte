<template>
  <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <div
      v-for="item in items"
      :key="item.key || item.label"
      class="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
    >
      <p class="text-xs uppercase tracking-wide text-slate-500">{{ item.label }}</p>
      <p class="mt-1 truncate text-sm font-semibold" :class="item.valueClass || 'text-slate-900'">
        {{ item.value ?? "-" }}
      </p>
      <p v-if="item.meta" class="mt-1 text-xs text-slate-500">{{ item.meta }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    default: () => [],
  },
});
</script>
