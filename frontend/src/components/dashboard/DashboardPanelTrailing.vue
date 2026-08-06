<template>
  <span class="flex items-center gap-2">
    <span v-if="showBadge" class="badge badge-brand">{{ count }}</span>
    <span v-if="meta" class="text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ meta }}</span>
  </span>
</template>

<script setup>
defineProps({
  count: { type: [String, Number], default: "" },
  meta: { type: String, default: "" },
  showBadge: { type: Boolean, default: true },
});
</script>
