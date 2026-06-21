<template>
  <div class="flex flex-wrap items-center justify-end gap-2">
    <ActionButton variant="secondary" size="sm" type="button" @click="$emit('reset')">{{ t("reset") }}</ActionButton>
    <ActionButton variant="secondary" size="sm" type="button" @click="$emit('cancel')">{{ t("cancel") }}</ActionButton>
    <ActionButton
      variant="primary"
      size="sm"
      type="button"
      :disabled="exportLoading"
      @click="$emit('export')"
    >
      {{ exportLoading ? t("exportLoading") : t("exportAction") }}
    </ActionButton>
  </div>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";

defineProps({
  t: {
    type: Function,
    required: true,
  },
  exportLoading: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["reset", "cancel", "export"]);
</script>
