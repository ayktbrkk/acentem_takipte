<template>
  <ATQuickEntryModal
    v-model="show"
    :error="error"
    :title="title || translateText('quick_claim', locale)"
    :subtitle="subtitle || translateText('quick_claim_subtitle', locale)"
    :eyebrow="eyebrow || translateText('Quick Claim', locale)"
    :loading="loading"
    :disabled="loading || disabled"
    :locale="locale"
    :labels="labels"
    :show-save-and-open="true"
    @cancel="closeModal"
    @save="emit('save', false)"
    @save-and-open="emit('save', true)"
  >
    <div class="space-y-6 py-2">
      <!-- Section: Claim Details -->
      <section class="at-card-premium">
        <header class="flex items-center gap-3 mb-6">
          <span class="at-label shrink-0 text-brand-600">{{ translateText('claim_technical_details', locale) }}</span>
          <div class="h-px flex-1 bg-slate-100"></div>
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
      <section class="at-card-premium">
        <header class="flex items-center gap-3 mb-6">
          <span class="at-label shrink-0 text-brand-600">{{ translateText('financial_details', locale) }}</span>
          <div class="h-px flex-1 bg-slate-100"></div>
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
      <section v-if="noteFields.length" class="at-card-premium">
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
  </ATQuickEntryModal>
</template>

<script setup>
import { computed } from "vue";
import ATQuickEntryModal from "./app-shell/ATQuickEntryModal.vue";
import QuickCreateFormRenderer from "./app-shell/QuickCreateFormRenderer.vue";
import { translateText } from "../utils/i18n";

const props = defineProps({
  modelValue: { type: Boolean, default: true },
  model: { type: Object, required: true },
  fieldErrors: { type: Object, default: () => ({}) },
  optionsMap: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  error: { type: String, default: "" },
  eyebrow: { type: String, default: "" },
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  locale: { type: String, default: "tr" },
  labels: { type: Object, default: () => ({}) },
  fields: { type: Array, required: true },
});

const emit = defineEmits(["update:modelValue", "cancel", "save"]);

const show = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const technicalFields = computed(() => 
  props.fields.filter(f => ['policy', 'customer', 'claim_no', 'claim_type', 'claim_status', 'incident_date', 'reported_date'].includes(f.name))
);

const financialFields = computed(() => 
  props.fields.filter(f => ['currency', 'estimated_amount', 'approved_amount'].includes(f.name))
);

const noteFields = computed(() => 
  props.fields.filter(f => f.name === 'notes')
);

function closeModal() {
  emit("update:modelValue", false);
  emit("cancel");
}
</script>
