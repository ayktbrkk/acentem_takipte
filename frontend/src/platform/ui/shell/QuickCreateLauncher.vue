<template>
  <ActionButton
    :variant="variant"
    :size="size"
    :disabled="disabled || busy"
    @click="onClick"
  >
    <slot>{{ label }}</slot>
  </ActionButton>
</template>

<script setup>
import ActionButton from "./ActionButton.vue";
import { useQuickCreateLauncher } from "../../composables/useQuickCreateLauncher";

const props = defineProps({
  label: { type: String, default: "" },
  variant: { type: String, default: "primary" },
  size: { type: String, default: "sm" },
  disabled: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  routeName: { type: String, default: "" },
  prefills: { type: Object, default: () => ({}) },
  extras: { type: Object, default: () => ({}) },
  withReturnTo: { type: Boolean, default: false },
  returnTo: { type: String, default: "" },
});

const emit = defineEmits(["launch"]);

const { onClick } = useQuickCreateLauncher(props, emit);
</script>

