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
    <div class="space-y-5 py-2">
      <!-- Section: Identity -->
      <section class="policy-form-section">
        <header class="flex items-center gap-3 mb-5 px-1">
          <span class="qc-accent-label shrink-0 text-brand-700">{{ translateText('identity_information', locale) }}</span>
          <div class="h-px flex-1 bg-brand-100/50"></div>
        </header>
        
        <QuickCreateFormRenderer
          :fields="identityFields"
          :model="model"
          :field-errors="fieldErrors"
          :disabled="disabled || loading"
          :options-map="optionsMap"
          :locale="locale"
          @submit="emit('save', false)"
        />
      </section>

      <!-- Section: Contact -->
      <section class="policy-form-section">
        <header class="flex items-center gap-3 mb-5 px-1">
          <span class="qc-accent-label shrink-0 text-brand-700">{{ translateText('contact_details', locale) }}</span>
          <div class="h-px flex-1 bg-brand-100/50"></div>
        </header>

        <QuickCreateFormRenderer
          :fields="contactFields"
          :model="model"
          :field-errors="fieldErrors"
          :disabled="disabled || loading"
          :options-map="optionsMap"
          :locale="locale"
          @submit="emit('save', false)"
        />
      </section>

      <!-- Section: Professional & Demographic -->
      <section class="policy-form-section">
        <header class="flex items-center gap-3 mb-5 px-1">
          <span class="qc-accent-label shrink-0 text-brand-700">{{ translateText('demographic_details', locale) }}</span>
          <div class="h-px flex-1 bg-brand-100/50"></div>
        </header>

        <QuickCreateFormRenderer
          :fields="otherFields"
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

const identityFields = computed(() => 
  props.fields.filter(f => ['full_name', 'tax_id', 'birth_date'].includes(f.name))
);

const contactFields = computed(() => 
  props.fields.filter(f => ['phone', 'email', 'address'].includes(f.name))
);

const otherFields = computed(() => 
  props.fields.filter(f => ['gender', 'marital_status', 'consent_status', 'assigned_agent', 'occupation'].includes(f.name))
);
</script>

<style scoped>
.policy-form-section {
  @apply relative;
}
</style>
