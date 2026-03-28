<script setup>
import QuickCreateManagedDialog from "../app-shell/QuickCreateManagedDialog.vue";

defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  quickEditConfig: {
    type: Object,
    default: null,
  },
  activeLocale: {
    type: String,
    default: "en",
  },
  quickEditOptionsMap: {
    type: Object,
    default: () => ({}),
  },
  quickEditEyebrow: {
    type: String,
    default: "",
  },
  prepareQuickEditDialog: {
    type: Function,
    required: true,
  },
  buildQuickEditPayload: {
    type: Function,
    required: true,
  },
  afterQuickEditSubmit: {
    type: Function,
    required: true,
  },
  quickEditSuccessHandlers: {
    type: Object,
    default: () => ({}),
  },
  labels: {
    type: Object,
    default: () => ({ save: "Kaydet", cancel: "İptal" }),
  },
});

const emit = defineEmits(["update:modelValue"]);
</script>

<template>
  <QuickCreateManagedDialog
    v-if="quickEditConfig"
    :model-value="modelValue"
    @update:model-value="(value) => emit('update:modelValue', value)"
    :config-key="quickEditConfig.registryKey"
    :locale="activeLocale"
    :options-map="quickEditOptionsMap"
    :eyebrow="quickEditEyebrow"
    :show-save-and-open="false"
    :before-open="prepareQuickEditDialog"
    :build-payload="buildQuickEditPayload"
    :after-submit="afterQuickEditSubmit"
    :success-handlers="quickEditSuccessHandlers"
    :labels="labels"
  />
</template>
