<template>
  <ATQuickEntryModal
    v-model="show"
    :error="error"
    :title="translateText('quick_lead', locale)"
    :subtitle="translateText('quick_lead_subtitle', locale)"
    :loading="loading"
    :disabled="loading || disabled"
    :locale="locale"
    :show-save-and-open="true"
    @cancel="emit('cancel')"
    @save="emit('save', false)"
    @save-and-open="emit('save', true)"
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
          :locale="locale"
          :office-branch="officeBranch"
          identity-field-name="tax_id"
          phone-field-name="phone"
          email-field-name="email"
          customer-type-field-name="customer_type"
        />
      </section>

      <!-- Section: Lead Details -->
      <section class="at-card-premium">
        <header class="flex items-center gap-3 mb-6">
          <span class="at-label shrink-0 text-brand-600">{{ translateText('lead_technical_details', locale) }}</span>
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
import { computed, ref } from "vue";
import ATQuickEntryModal from "./app-shell/ATQuickEntryModal.vue";
import QuickCreateFormRenderer from "./app-shell/QuickCreateFormRenderer.vue";
import QuickCustomerPicker from "./app-shell/QuickCustomerPicker.vue";
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
  fields: { type: Array, required: true },
});

const emit = defineEmits(["cancel", "save"]);

const show = ref(true);

const CUSTOMER_INTERNAL_FIELDS = [
  "customer",
  "tax_id",
  "phone",
  "email",
  "full_name",
  "first_name",
  "last_name",
  "customer_type",
];

const filteredFields = computed(() =>
  props.fields.filter((field) => !CUSTOMER_INTERNAL_FIELDS.includes(field.name))
);

const technicalFields = computed(() => 
  filteredFields.value.filter(f => f.name !== 'notes')
);

const noteFields = computed(() => 
  filteredFields.value.filter(f => f.name === 'notes')
);
</script>
