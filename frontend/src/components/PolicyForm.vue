<template>
  <QuickCreateDialogShell
    :error="error"
    :eyebrow="eyebrow"
    :subtitle="subtitle"
    :show-eyebrow="Boolean(eyebrow)"
    :show-subtitle="Boolean(subtitle)"
    :loading="loading"
    :save-disabled="loading || disabled"
    :show-save-and-open="false"
    :labels="{ cancel: translateText('cancel', locale), save: loading ? translateText('updating', locale) + '...' : translateText('save', locale) }"
    @cancel="emit('cancel')"
    @save="emit('submit')"
  >
    <div class="space-y-6 py-2">
      <!-- Section: Customer -->
      <section class="policy-form-section">
        <header class="flex items-center gap-3 mb-5">
          <span class="qc-accent-label shrink-0">{{ translateText('customer_details', locale) }}</span>
          <div class="h-px flex-1 bg-slate-100"></div>
        </header>
        
        <QuickCustomerPicker
          :model="model"
          :field-errors="fieldErrors"
          :disabled="disabled || loading"
          :office-branch="officeBranch"
          :locked="hasSourceOffer"
          :locale="locale"
        />
      </section>

      <!-- Section: Core Details -->
      <section class="policy-form-section">
        <header class="flex items-center gap-3 mb-5">
          <span class="qc-accent-label shrink-0">{{ translateText('policy_technical_details', locale) }}</span>
          <div class="h-px flex-1 bg-slate-100"></div>
        </header>

        <QuickCreateFormRenderer
          :fields="coreFields"
          :model="model"
          :field-errors="fieldErrors"
          :disabled="disabled || loading"
          :options-map="optionsMap"
          :locale="locale"
        />
      </section>

      <!-- Section: Schedule -->
      <section class="policy-form-section">
        <header class="flex items-center gap-3 mb-5">
          <span class="qc-accent-label shrink-0">{{ translateText('scheduleTitle', locale) }}</span>
          <div class="h-px flex-1 bg-slate-100"></div>
        </header>

        <QuickCreateFormRenderer
          :fields="scheduleFields"
          :model="model"
          :field-errors="fieldErrors"
          :disabled="disabled || loading"
          :options-map="optionsMap"
          :locale="locale"
        />
      </section>

      <!-- Section: Financial Details -->
      <section class="policy-form-section p-5 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm ring-1 ring-slate-200/50">
        <header class="flex items-center gap-3 mb-5">
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
import { getQuickCreateConfig } from "../config/quickCreateRegistry";
import { translateText } from "../utils/i18n";

const props = defineProps({
  model: { type: Object, required: true },
  fieldErrors: { type: Object, default: () => ({}) },
  optionsMap: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  hasSourceOffer: { type: Boolean, default: false },
  officeBranch: { type: String, default: "" },
  error: { type: String, default: "" },
  eyebrow: { type: String, default: "" },
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  locale: { type: String, default: "tr" },
});

const emit = defineEmits(["cancel", "submit"]);

const config = getQuickCreateConfig("policy");
const allFields = computed(() => config?.fields || []);

const CUSTOMER_INTERNAL_FIELDS = [
  "customer",
  "customer_full_name",
  "customer_type",
  "customer_tax_id",
  "customer_phone",
  "customer_email",
  "customer_birth_date",
];

const filteredFields = computed(() =>
  allFields.value.filter((field) => !CUSTOMER_INTERNAL_FIELDS.includes(field.name))
);

// Grouping logic for "Tightness"
const coreFields = computed(() => 
  filteredFields.value.filter(f => ['insurance_company', 'branch', 'carrier_policy_no', 'sales_entity', 'status'].includes(f.name))
);

const scheduleFields = computed(() => 
  filteredFields.value.filter(f => ['issue_date', 'start_date', 'end_date'].includes(f.name))
);

const financialFields = computed(() => 
  filteredFields.value.filter(f => ['currency', 'gross_premium', 'net_premium', 'tax_amount', 'commission_amount', 'commission_rate'].includes(f.name))
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
