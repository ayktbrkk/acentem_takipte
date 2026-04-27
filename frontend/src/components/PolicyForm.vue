<template>
  <ATQuickEntryModal
    v-model="show"
    :error="error"
    :title="translateText('quick_policy_entry', locale)"
    :subtitle="translateText('quick_policy_subtitle', locale)"
    :loading="loading"
    :disabled="loading || disabled"
    :locale="locale"
    :show-save-and-open="true"
    @cancel="emit('cancel')"
    @save="emit('submit')"
    @save-and-open="emit('submit-and-open')"
  >
    <div class="space-y-6 py-2">
      <!-- Section: Customer -->
      <section class="at-card-premium">
        <header class="flex items-center gap-3 mb-6">
          <span class="at-label shrink-0 text-brand-600">{{ translateText('customer_details', locale) }}</span>
          <div class="h-px flex-1 bg-slate-100"></div>
        </header>
        
        <QuickCustomerPicker
          :model="model"
          :field-errors="fieldErrors"
          :disabled="disabled || loading"
          :office-branch="officeBranch"
          :locked="hasSourceOffer"
          :locale="locale"
          identity-field-name="customer_tax_id"
          birth-date-field-name="customer_birth_date"
          phone-field-name="customer_phone"
          email-field-name="customer_email"
          customer-type-field-name="customer_type"
        />
      </section>

      <!-- Section: Core Details -->
      <section class="at-card-premium">
        <header class="flex items-center gap-3 mb-6">
          <span class="at-label shrink-0 text-brand-600">{{ translateText('policy_technical_details', locale) }}</span>
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
      <section class="at-card-premium">
        <header class="flex items-center gap-3 mb-6">
          <span class="at-label shrink-0 text-brand-600">{{ translateText('scheduleTitle', locale) }}</span>
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
        />
      </section>
    </div>
  </ATQuickEntryModal>
</template>

<script setup>
import { computed, ref } from "vue";
import ATQuickEntryModal from "./app-shell/ATQuickEntryModal.vue";
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

const emit = defineEmits(["cancel", "submit", "submit-and-open"]);

const show = ref(true);

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
  filteredFields.value.filter(f => ['insurance_company', 'branch', 'policy_no', 'sales_entity', 'status'].includes(f.name))
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
