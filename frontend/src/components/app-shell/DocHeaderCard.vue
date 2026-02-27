<template>
  <article class="surface-card rounded-2xl p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <p v-if="eyebrow" class="text-xs uppercase tracking-wide text-slate-500">{{ eyebrow }}</p>
        <h2 class="truncate text-xl font-semibold text-slate-900">{{ title }}</h2>
        <p v-if="subtitle" class="text-xs text-slate-500">{{ subtitle }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </article>
</template>

<script setup>
defineProps({
  eyebrow: { type: String, default: "" },
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
});
</script>
