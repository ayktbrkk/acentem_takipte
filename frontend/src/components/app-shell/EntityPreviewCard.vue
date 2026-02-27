<template>
  <article :class="['rounded-xl border border-slate-200 bg-slate-50/80 p-4', stretch && 'flex h-full flex-col']">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold text-slate-900" :class="titleClass">{{ title }}</p>
        <p v-if="subtitle" class="mt-1 text-xs text-slate-500" :class="subtitleClass">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.trailing" class="shrink-0">
        <slot name="trailing" />
      </div>
    </div>

    <div v-if="$slots.default" :class="[stretch ? 'mt-2 flex-1' : 'mt-2']">
      <slot />
    </div>

    <div v-if="$slots.footer" class="mt-3">
      <slot name="footer" />
    </div>
  </article>
</template>

<script setup>
defineProps({
  title: { type: String, default: "-" },
  subtitle: { type: String, default: "" },
  titleClass: { type: String, default: "" },
  subtitleClass: { type: String, default: "" },
  stretch: { type: Boolean, default: false },
});
</script>
