<template>
  <article class="surface-card rounded-2xl p-5 at-data-shell">
    <div v-if="$slots.header" class="mb-3">
      <slot name="header" />
    </div>

    <div v-if="loading" class="py-8 text-sm text-slate-500">
      {{ loadingLabel }}
    </div>

    <div v-else-if="error" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      <p class="font-semibold">{{ errorTitle }}</p>
      <p class="mt-1">{{ error }}</p>
    </div>

    <div v-else-if="empty">
      <slot name="empty">
        <EmptyState :title="emptyTitle" :description="emptyDescription" />
      </slot>
    </div>

    <div v-else class="space-y-3">
      <slot />
    </div>

    <div v-if="$slots.footer && !loading && !error && !empty" class="mt-3">
      <slot name="footer" />
    </div>
  </article>
</template>

<script setup>
import EmptyState from "./EmptyState.vue";

defineProps({
  loading: { type: Boolean, default: false },
  empty: { type: Boolean, default: false },
  error: { type: String, default: "" },
  loadingLabel: { type: String, default: "Loading..." },
  errorTitle: { type: String, default: "Error" },
  emptyTitle: { type: String, default: "No records found" },
  emptyDescription: { type: String, default: "" },
});
</script>
