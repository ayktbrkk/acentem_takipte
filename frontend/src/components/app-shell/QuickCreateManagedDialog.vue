<template>
  <ATQuickEntryModal
    v-model="open"
    :error="errorText"
    :title="uiTitle"
    :subtitle="uiSubtitle"
    :eyebrow="resolvedEyebrow"
    :loading="loading"
    :disabled="saveDisabledComputed"
    :show-save-and-open="showSaveAndOpen"
    :locale="locale"
    :labels="labelsResolved"
    @cancel="onCancel"
    @save="submit(false)"
    @save-and-open="submit(true)"
  >
    <div class="at-card-premium">
      <QuickCreateFormRenderer
        :fields="fields"
        :model="form"
        :field-errors="fieldErrors"
        :disabled="loading"
        :locale="locale"
        :options-map="optionsMap"
        @submit="submit(false)"
      />
    </div>
  </ATQuickEntryModal>
</template>

<script setup>
import { translateText } from "../../utils/i18n";
import ATQuickEntryModal from "./ATQuickEntryModal.vue";
import QuickCreateFormRenderer from "./QuickCreateFormRenderer.vue";
import { useQuickCreateManagedDialog } from "../../composables/useQuickCreateManagedDialog";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  configKey: { type: String, required: true },
  locale: { type: String, default: "en" },
  optionsMap: { type: Object, default: () => ({}) },
  saveDisabled: { type: Boolean, default: false },
  showSaveAndOpen: { type: Boolean, default: true },
  dialogSize: { type: String, default: "xl" },
  eyebrow: { type: String, default: "" },
  titleOverride: { type: [String, Object], default: "" },
  subtitleOverride: { type: [String, Object], default: "" },
  labels: { type: Object, default: () => ({}) },
  returnTo: { type: String, default: "" },
  validate: { type: Function, default: null },
  buildPayload: { type: Function, default: null },
  beforeOpen: { type: Function, default: null },
  itemId: { type: [String, Number], default: "" },
  loadExistingData: { type: Function, default: null },
  beforeSubmit: { type: Function, default: null },
  afterSubmit: { type: Function, default: null },
  successHandlers: { type: Object, default: () => ({}) },
});

const emit = defineEmits([
  "update:modelValue",
  "created",
  "cancel",
  "error",
  "opened",
]);

const {
  form,
  fieldErrors,
  loading,
  errorText,
  labelsResolved,
  uiTitle,
  resolvedEyebrow,
  uiSubtitle,
  dialogShellClass,
  saveDisabledComputed,
  submit,
  onCancel,
  open,
  fields,
} = useQuickCreateManagedDialog(props, emit);
</script>
