<template>
  <div class="at-page-toolbar">
    <div class="min-w-0">
      <slot name="title">
        <h2 class="text-xl font-semibold text-slate-900">{{ title }}</h2>
        <p v-if="subtitle" class="text-sm text-slate-500">{{ subtitle }}</p>
      </slot>
    </div>

    <div class="at-toolbar-actions">
      <slot name="actions">
        <button
          v-if="showRefresh"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          :disabled="busy"
          @click="$emit('refresh')"
        >
          {{ refreshLabel }}
        </button>
      </slot>
    </div>
  </div>

  <div v-if="$slots.filters" class="mt-4">
    <slot name="filters" />
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  showRefresh: { type: Boolean, default: false },
  refreshLabel: { type: String, default: "Refresh" },
  busy: { type: Boolean, default: false },
});

defineEmits(["refresh"]);
</script>
