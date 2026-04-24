<template>
  <article class="surface-card flex min-h-[160px] flex-col justify-between rounded-xl p-5 shadow-sm">
    <div>
      <div class="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <FeatherIcon :name="icon || 'bar-chart-2'" class="h-6 w-6" />
      </div>
      <p class="text-3xl font-bold tracking-tight text-gray-900">{{ value }}</p>
      <p class="mt-1 text-sm font-medium text-gray-500">{{ title }}</p>
    </div>

    <div class="mt-4 flex items-center border-t border-gray-100 pt-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
      {{ t("quickStatStatusLabel") }}
    </div>
  </article>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui";

defineProps({
  title: {
    type: String,
    default: "",
  },
  value: {
    type: String,
    default: "",
  },
  t: {
    type: Function,
    required: true,
  },
  icon: {
    type: String,
    default: "bar-chart-2",
  },
});
</script>
