<template>
  <SectionPanel :title="t('customerSection')" :show-count="false">
    <div class="space-y-4">
      <p class="text-xs text-slate-500">{{ t("customerStepHint") }}</p>
      <QuickCustomerPicker
        :model="model"
        :field-errors="fieldErrors"
        :disabled="disabled"
        :locale="activeLocale"
        :office-branch="officeBranch"
        :locked="hasSourceOffer"
        :locked-message="customerLockedMessage"
        customer-field-name="customer"
        query-field-name="customer_full_name"
        selected-option-field-name="customerOption"
        create-mode-field-name="createCustomerMode"
        customer-type-field-name="customer_type"
        birth-date-field-name="customer_birth_date"
        identity-field-name="customer_tax_id"
        phone-field-name="customer_phone"
        email-field-name="customer_email"
        :customer-label="customerPickerLabel"
        :search-placeholder="customerSearchPlaceholder"
        :no-results-text="customerNoResultsText"
      />

      <div v-if="selectedCustomerDetails && !model.createCustomerMode && !hasSourceOffer" class="qc-card-soft">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="qc-accent-label">
              {{ t("selectedCustomerTitle") }}
            </p>
            <p class="text-sm font-semibold text-slate-900">
              {{ selectedCustomerDetails.label }}
            </p>
            <p class="text-xs text-slate-500">
              {{ t("selectedCustomerHint") }}
            </p>
          </div>
          <span class="copy-tag">
            {{ t("selectedCustomerLocked") }}
          </span>
        </div>
        <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <p><strong>{{ t("summaryCustomerType") }}:</strong> {{ selectedCustomerTypeLabel }}</p>
          <p><strong>{{ t("summaryTaxId") }}:</strong> {{ selectedCustomerTaxId }}</p>
          <p><strong>{{ t("summaryBirthDate") }}:</strong> {{ selectedCustomerBirthDate }}</p>
          <p><strong>{{ t("summaryPhone") }}:</strong> {{ selectedCustomerPhone }}</p>
          <p><strong>{{ t("summaryEmail") }}:</strong> {{ selectedCustomerEmail }}</p>
        </div>
      </div>

      <QuickCreateFormRenderer
        :fields="policySourceOfferFields"
        :model="model"
        :field-errors="fieldErrors"
        :disabled="disabled"
        :locale="activeLocale"
        :options-map="optionsMap"
      />
      <p v-if="hasSourceOffer" class="text-xs text-slate-500">
        {{ t("sourceOfferHint") }}
      </p>
    </div>
  </SectionPanel>
</template>

<script setup>
import QuickCreateFormRenderer from "../app-shell/QuickCreateFormRenderer.vue";
import QuickCustomerPicker from "../app-shell/QuickCustomerPicker.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";

defineProps({
  model: { type: Object, required: true },
  fieldErrors: { type: Object, default: () => ({}) },
  optionsMap: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
  activeLocale: { type: String, default: "en" },
  hasSourceOffer: { type: Boolean, default: false },
  officeBranch: { type: String, default: "" },
  customerLockedMessage: { type: [String, Object], required: true },
  customerPickerLabel: { type: [String, Object], required: true },
  customerSearchPlaceholder: { type: [String, Object], required: true },
  customerNoResultsText: { type: [String, Object], required: true },
  selectedCustomerDetails: { type: Object, default: null },
  selectedCustomerTypeLabel: { type: String, default: "-" },
  selectedCustomerTaxId: { type: String, default: "-" },
  selectedCustomerBirthDate: { type: String, default: "-" },
  selectedCustomerPhone: { type: String, default: "-" },
  selectedCustomerEmail: { type: String, default: "-" },
  policySourceOfferFields: { type: Array, default: () => [] },
  t: { type: Function, required: true },
});
</script>
