<template>
  <div class="mb-4 flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div v-if="icon" class="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-400 border border-slate-100">
        <FeatherIcon :name="icon" class="h-4 w-4" />
      </div>
      <h3 class="text-lg font-semibold text-gray-900 leading-tight">{{ title }}</h3>
    </div>
    <slot v-if="$slots.trailing" name="trailing" />
    <span v-else-if="showCount" class="badge badge-brand ml-2">{{ count }}</span>
    <span v-else-if="meta" class="text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ meta }}</span>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: "" },
  icon: { type: String, default: "" },
  count: { type: [String, Number], default: "" },
  meta: { type: String, default: "" },
  showCount: { type: Boolean, default: true },
});

import { FeatherIcon } from "frappe-ui";
</script>
