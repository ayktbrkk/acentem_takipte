<template>
  <ActionButton variant="secondary" size="sm" type="button" :disabled="loading" @click="$emit('refresh')">
    {{ loading ? t("loading") : t("refresh") }}
  </ActionButton>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";

defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["refresh"]);
</script>
