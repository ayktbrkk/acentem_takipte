<template>
  <div class="mt-4 flex items-center justify-between px-2">
    <p class="text-xs font-medium text-slate-400">{{ shown }} / {{ total }} {{ showingLabel }}</p>
    <div class="flex items-center gap-2">
      <ActionButton variant="secondary" size="xs" :disabled="page <= 1" @click="$emit('previous')">
        <FeatherIcon name="chevron-left" class="h-3 w-3" />
      </ActionButton>
      <span class="text-xs font-semibold text-slate-900 w-8 text-center">{{ page }}</span>
      <ActionButton variant="secondary" size="xs" :disabled="!hasNext" @click="$emit('next')">
        <FeatherIcon name="chevron-right" class="h-3 w-3" />
      </ActionButton>
    </div>
  </div>
</template>

<script setup>
import ActionButton from "./ActionButton.vue";
import { FeatherIcon } from "frappe-ui";

defineProps({
  shown: { type: Number, required: true },
  total: { type: Number, required: true },
  page: { type: Number, required: true },
  hasNext: { type: Boolean, default: false },
  showingLabel: { type: String, default: "" },
});

defineEmits(["previous", "next"]);
</script>
