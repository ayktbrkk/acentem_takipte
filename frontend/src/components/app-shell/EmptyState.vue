<template>
  <div :class="compact ? compactContainerClass : 'flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-12 text-center'">
    <div :class="compact ? 'mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400' : 'mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400'">
      <slot name="icon">
        <FeatherIcon name="inbox" :class="compact ? 'h-5 w-5' : 'h-8 w-8'" />
      </slot>
    </div>
    <h4 v-if="title" :class="compact ? 'text-xs font-semibold text-gray-900' : 'text-sm font-semibold text-gray-900'">{{ title }}</h4>
    <p v-if="description" :class="compact ? 'mt-1 text-[11px] text-gray-500' : 'mt-1 text-xs text-gray-500'">{{ description }}</p>
    <div v-if="$slots.actions" :class="compact ? 'mt-2' : 'mt-4'">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui";

defineProps({
  title: { type: String, default: "No records found." },
  description: { type: String, default: "" },
  compact: { type: Boolean, default: false },
  compactContainerClass: {
    type: String,
    default: "flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/40 py-5 text-center",
  },
});
</script>
