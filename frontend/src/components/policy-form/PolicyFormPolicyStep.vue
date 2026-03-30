<template>
  <SectionPanel :title="t('policySection')" :show-count="false">
    <QuickCreateFormRenderer
      :fields="policyStepFields"
      :model="model"
      :field-errors="fieldErrors"
      :disabled="disabled"
      :locale="activeLocale"
      :options-map="optionsMap"
    />
  </SectionPanel>
</template>

<script setup>
import QuickCreateFormRenderer from "../app-shell/QuickCreateFormRenderer.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";

defineProps({
  model: { type: Object, required: true },
  fieldErrors: { type: Object, default: () => ({}) },
  optionsMap: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
  activeLocale: { type: String, default: "tr" },
  policyStepFields: { type: Array, default: () => [] },
  t: { type: Function, required: true },
});
</script>
