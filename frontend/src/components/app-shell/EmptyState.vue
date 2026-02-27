<template>
  <div class="at-empty-state">
    <div class="mx-auto max-w-xl">
      <h3 class="text-sm font-semibold text-slate-800">{{ title }}</h3>
      <p v-if="description" class="mt-1 text-sm text-slate-500">
        {{ description }}
      </p>
      <div v-if="$slots.actions || actionLabel" class="mt-4 flex justify-center gap-2">
        <slot name="actions">
          <button
            class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            type="button"
            @click="$emit('action')"
          >
            {{ actionLabel }}
          </button>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  actionLabel: { type: String, default: "" },
});

defineEmits(["action"]);
</script>
