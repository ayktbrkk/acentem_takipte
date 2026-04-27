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
    :labels="{ 
      cancel: translateText('cancel', locale), 
      save: loading ? translateText('updating', locale) + '...' : translateText('save', locale),
      saveAndOpen: translateText('save_and_open', locale)
    }"
    @cancel="emit('cancel')"
    @save="emit('submit')"
    @saveAndOpen="emit('submit-and-open')"
  >
    <div class="space-y-5 py-2">
      <!-- Section: Customer -->
      <section class="policy-form-section">
        <header class="flex items-center gap-3 mb-5 px-1">
          <span class="qc-accent-label shrink-0 text-brand-700">{{ translateText('customer_details', locale) }}</span>
          <div class="h-px flex-1 bg-brand-100/50"></div>
        </header>
        
        <QuickCustomerPicker
          :model="model"
          :field-errors="fieldErrors"
          :disabled="disabled || loading"
          :locale="locale"
          identity-field-name="tax_id"
          birth-date-field-name="birth_date"
          phone-field-name="phone"
          email-field-name="email"
          customer-type-field-name="customer_type"
        />
      </section>

      <!-- Section: Offer Details -->
      <section class="policy-form-section">
        <header class="flex items-center gap-3 mb-5 px-1">
          <span class="qc-accent-label shrink-0 text-brand-700">{{ translateText('offer_technical_details', locale) }}</span>
          <div class="h-px flex-1 bg-brand-100/50"></div>
        </header>

        <QuickCreateFormRenderer
          :fields="technicalFields"
          :model="model"
          :field-errors="fieldErrors"
          :disabled="disabled || loading"
          :options-map="optionsMap"
          :locale="locale"
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
        />
      </section>
    </div>
  </QuickCreateDialogShell>
</template>

<script setup>
import { computed } from "vue";
import QuickCreateDialogShell from "./app-shell/QuickCreateDialogShell.vue";
import QuickCreateFormRenderer from "./app-shell/QuickCreateFormRenderer.vue";
import QuickCustomerPicker from "./app-shell/QuickCustomerPicker.vue";
import { getQuickCreateConfig } from "../config/quickCreate";
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
  officeBranch: { type: String, default: "" },
  labels: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["cancel", "submit", "submit-and-open"]);

const config = getQuickCreateConfig("offer");
const allFields = computed(() => config?.fields || []);

const CUSTOMER_INTERNAL_FIELDS = [
  "customer",
  "customer_type",
  "tax_id",
  "phone",
  "email",
  "birth_date",
];

const filteredFields = computed(() =>
  allFields.value.filter((field) => !CUSTOMER_INTERNAL_FIELDS.includes(field.name))
);

const technicalFields = computed(() => 
  filteredFields.value.filter(f => ['sales_entity', 'insurance_company', 'branch', 'offer_date', 'valid_until', 'status'].includes(f.name))
);

const financialFields = computed(() => 
  filteredFields.value.filter(f => ['currency', 'gross_premium', 'net_premium', 'tax_amount', 'commission_amount'].includes(f.name))
);

const noteFields = computed(() => 
  filteredFields.value.filter(f => f.name === 'notes')
);
</script>

<style scoped>
.policy-form-section {
  @apply relative;
}
</style>
