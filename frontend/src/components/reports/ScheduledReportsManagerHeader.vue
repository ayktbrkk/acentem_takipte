<template>
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h3 class="text-base font-semibold text-slate-900">{{ title }}</h3>
      <p class="mt-1 text-sm text-slate-500">{{ subtitle }}</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
        :disabled="loading || running"
        @click="$emit('run')"
      >
        {{ runLabel }}
      </button>
      <button
        type="button"
        class="rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-medium text-brand-700 transition hover:border-sky-400 hover:text-sky-900"
        :disabled="loading || running"
        @click="$emit('new')"
      >
        {{ newLabel }}
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, required: true },
  runLabel: { type: String, required: true },
  newLabel: { type: String, required: true },
  loading: { type: Boolean, default: false },
  running: { type: Boolean, default: false },
});

defineEmits(["run", "new"]);
</script>
