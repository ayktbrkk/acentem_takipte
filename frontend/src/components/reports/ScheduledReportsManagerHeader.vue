<template>
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h3 class="text-base font-semibold text-slate-900">{{ title }}</h3>
      <p class="mt-1 text-sm text-slate-500">{{ subtitle }}</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <ActionButton
        variant="secondary"
        size="sm"
        class="!rounded-xl !py-2 !font-medium hover:!border-slate-400 hover:!text-slate-900 hover:!bg-transparent"
        :disabled="loading || running"
        @click="$emit('run')"
      >
        {{ runLabel }}
      </ActionButton>
      <ActionButton
        variant="primary"
        size="sm"
        class="!rounded-xl !py-2 !font-medium"
        :disabled="loading || running"
        @click="$emit('new')"
      >
        {{ newLabel }}
      </ActionButton>
    </div>
  </div>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";

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
