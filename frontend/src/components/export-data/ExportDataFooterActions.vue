<template>
  <div class="flex justify-end gap-2">
    <ActionButton variant="secondary" size="sm" type="button" @click="$emit('cancel')">{{ t("cancel") }}</ActionButton>
    <ActionButton variant="primary" size="sm" type="button" @click="$emit('export')">{{ t("exportAction") }}</ActionButton>
  </div>
  <p v-if="message" class="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
    {{ message }}
  </p>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";

defineProps({
  message: {
    type: String,
    default: "",
  },
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["cancel", "export"]);
</script>
