<template>
  <SectionPanel :title="t('coverageSection')" :show-count="false">
    <QuickCreateFormRenderer
      :fields="policyCoverageFields"
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
  activeLocale: { type: String, default: "en" },
  policyCoverageFields: { type: Array, default: () => [] },
  t: { type: Function, required: true },
});
</script>
