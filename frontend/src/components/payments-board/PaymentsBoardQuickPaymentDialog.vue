<template>
  <QuickCreateManagedDialog
    v-model="dialogModel"
    config-key="payment"
    :locale="locale"
    :options-map="optionsMap"
    :eyebrow="eyebrow"
    :show-save-and-open="false"
    :before-open="beforeOpen"
    :success-handlers="successHandlers"
  />
</template>

<script setup>
import { computed } from "vue";

import QuickCreateManagedDialog from "../app-shell/QuickCreateManagedDialog.vue";

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  locale: {
    type: String,
    required: true,
  },
  optionsMap: {
    type: Object,
    required: true,
  },
  eyebrow: {
    type: String,
    required: true,
  },
  beforeOpen: {
    type: Function,
    required: true,
  },
  successHandlers: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue"]);

const dialogModel = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
</script>
