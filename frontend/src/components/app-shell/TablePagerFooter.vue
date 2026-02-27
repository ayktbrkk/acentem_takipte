<template>
  <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
    <p class="text-xs text-slate-500">{{ pageLabel }} {{ page }} / {{ totalPages }}</p>
    <div class="flex items-center gap-2">
      <ActionButton variant="secondary" size="xs" :disabled="prevDisabled" @click="$emit('previous')">
        {{ previousLabel }}
      </ActionButton>
      <ActionButton variant="secondary" size="xs" :disabled="nextDisabled" @click="$emit('next')">
        {{ nextLabel }}
      </ActionButton>
    </div>
  </div>
</template>

<script setup>
import ActionButton from "./ActionButton.vue";

defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  pageLabel: { type: String, required: true },
  previousLabel: { type: String, required: true },
  nextLabel: { type: String, required: true },
  prevDisabled: { type: Boolean, default: false },
  nextDisabled: { type: Boolean, default: false },
});

defineEmits(["previous", "next"]);
</script>
