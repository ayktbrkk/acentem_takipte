<template>
  <ActionButton variant="secondary" size="sm" type="button" @click="$emit('reset')">{{ t("reset") }}</ActionButton>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";

defineProps({
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["reset"]);
</script>
