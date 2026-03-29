<template>
  <div v-if="open" class="dialog-overlay" @click.self="onCancel">
    <div :class="dialogShellClass">
      <div class="qc-managed-dialog__header">
        <div class="qc-managed-dialog__headline">
          <p class="qc-managed-dialog__eyebrow">{{ resolvedEyebrow }}</p>
          <h3 class="qc-managed-dialog__title">{{ uiTitle }}</h3>
          <p v-if="uiSubtitle" class="qc-managed-dialog__subtitle">{{ uiSubtitle }}</p>
        </div>
        <button
          class="qc-managed-dialog__close"
          type="button"
          :aria-label="locale === 'tr' ? 'Kapat' : 'Close'"
          :title="locale === 'tr' ? 'Kapat' : 'Close'"
          @click="onCancel"
        >
          <span aria-hidden="true">×</span>
          <span class="sr-only">{{ locale === 'tr' ? 'Kapat' : 'Close' }}</span>
        </button>
      </div>

      <form class="qc-managed-dialog__body" @submit.prevent="submit(false)">
        <QuickCreateDialogShell
          :error="errorText"
          :show-eyebrow="false"
          :show-subtitle="false"
          :eyebrow="resolvedEyebrow"
          :subtitle="uiSubtitle"
          :loading="loading"
          :save-disabled="saveDisabledComputed"
          :show-save-and-open="showSaveAndOpen"
          :labels="labelsResolved"
          @cancel="onCancel"
          @save="submit(false)"
          @save-and-open="submit(true)"
        >
          <QuickCreateFormRenderer
            :fields="fields"
            :model="form"
            :field-errors="fieldErrors"
            :disabled="loading"
            :locale="locale"
            :options-map="optionsMap"
            @submit="submit(false)"
          />
        </QuickCreateDialogShell>
      </form>
    </div>
  </div>
</template>

<script setup>
import QuickCreateDialogShell from "./QuickCreateDialogShell.vue";
import QuickCreateFormRenderer from "./QuickCreateFormRenderer.vue";
import { useQuickCreateManagedDialog } from "../../composables/useQuickCreateManagedDialog";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  configKey: { type: String, required: true },
  locale: { type: String, default: "tr" },
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
