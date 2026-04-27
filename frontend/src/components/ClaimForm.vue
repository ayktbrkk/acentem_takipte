<template>
  <QuickCreateDialogShell
    :error="error"
    :eyebrow="eyebrow"
    :subtitle="subtitle"
    :show-eyebrow="Boolean(eyebrow)"
    :show-subtitle="Boolean(subtitle)"
    :loading="loading"
    :save-disabled="loading || disabled"
    :show-save-and-open="true"
    :labels="labels"
    @cancel="emit('cancel')"
    @save="emit('save', false)"
    @saveAndOpen="emit('save', true)"
  >
    <div class="space-y-6 py-2">
      <!-- Section: Claim Details -->
      <section class="policy-form-section">
        <header class="flex items-center gap-3 mb-5 px-1">
          <span class="qc-accent-label shrink-0 text-brand-700">{{ translateText('claim_technical_details', locale) }}</span>
          <div class="h-px flex-1 bg-brand-100/50"></div>
        </header>

        <QuickCreateFormRenderer
          :fields="technicalFields"
          :model="model"
          :field-errors="fieldErrors"
          :disabled="disabled || loading"
          :options-map="optionsMap"
          :locale="locale"
          @submit="emit('save', false)"
        />
      </section>

      <!-- Section: Financial Details -->
      <section class="policy-form-section">
        <header class="flex items-center gap-3 mb-5 px-1">
          <span class="qc-accent-label shrink-0 text-brand-700">{{ translateText('financial_details', locale) }}</span>
          <div class="h-px flex-1 bg-brand-100/50"></div>
        </header>

        <QuickCreateFormRenderer
          :fields="financialFields"
          :model="model"
          :field-errors="fieldErrors"
          :disabled="disabled || loading"
          :options-map="optionsMap"
          :locale="locale"
          @submit="emit('save', false)"
        />
      </section>

      <!-- Section: Notes -->
      <section v-if="noteFields.length" class="policy-form-section">
        <QuickCreateFormRenderer
          :fields="noteFields"
          :model="model"
          :field-errors="fieldErrors"
          :disabled="disabled || loading"
          :options-map="optionsMap"
          :locale="locale"
          @submit="emit('save', false)"
        />
      </section>
    </div>
  </QuickCreateDialogShell>
</template>

<script setup>
import { computed } from "vue";
import QuickCreateDialogShell from "./app-shell/QuickCreateDialogShell.vue";
import QuickCreateFormRenderer from "./app-shell/QuickCreateFormRenderer.vue";
import { translateText } from "../utils/i18n";

const props = defineProps({
  model: { type: Object, required: true },
  fieldErrors: { type: Object, default: () => ({}) },
  optionsMap: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  error: { type: String, default: "" },
  eyebrow: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  locale: { type: String, default: "tr" },
  labels: { type: Object, default: () => ({}) },
  fields: { type: Array, required: true },
});

const emit = defineEmits(["cancel", "save"]);

const technicalFields = computed(() => 
  props.fields.filter(f => ['policy', 'customer', 'claim_no', 'claim_type', 'claim_status', 'incident_date', 'reported_date'].includes(f.name))
);

const financialFields = computed(() => 
  props.fields.filter(f => ['currency', 'estimated_amount', 'approved_amount'].includes(f.name))
);

const noteFields = computed(() => 
  props.fields.filter(f => f.name === 'notes')
);
</script>

<style scoped>
.policy-form-section {
  @apply relative;
}
</style>
