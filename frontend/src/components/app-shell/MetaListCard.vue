<template>
  <li class="rounded-xl border border-slate-200 bg-slate-50 p-3">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <p class="truncate font-semibold text-slate-900">{{ title }}</p>
        <p v-if="subtitle" class="mt-1 text-xs text-slate-500">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.trailing" class="shrink-0">
        <slot name="trailing" />
      </div>
    </div>

    <p v-if="description" :class="descriptionClass">{{ description }}</p>
    <p v-if="meta" class="mt-1 text-xs text-slate-500">{{ meta }}</p>
    <slot />
  </li>
</template>

<script setup>
defineProps({
  title: { type: String, default: "-" },
  subtitle: { type: String, default: "" },
  description: { type: String, default: "" },
  descriptionClass: { type: String, default: "mt-2 text-sm text-slate-700" },
  meta: { type: String, default: "" },
});
</script>
