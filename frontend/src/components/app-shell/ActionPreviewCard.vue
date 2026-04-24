<template>
  <button type="button" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 shadow-sm" :disabled="disabled" @click="$emit('click', $event)">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-slate-800">{{ title }}</p>
        <p v-if="description" class="text-xs text-slate-500">{{ description }}</p>
      </div>
      <div v-if="$slots.trailing" class="shrink-0">
        <slot name="trailing" />
      </div>
    </div>
    <slot />
  </button>
</template>

<script setup>
defineProps({
  title: { type: String, default: "-" },
  description: { type: String, default: "" },
  disabled: { type: Boolean, default: false },
});

defineEmits(["click"]);
</script>

