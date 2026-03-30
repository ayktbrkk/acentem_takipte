<template>
  <div class="at-quick-create-shell">
    <div class="at-quick-create-shell__accent" aria-hidden="true"></div>
    <div class="at-quick-create-shell__body">
      <header class="qc-managed-dialog__header">
        <div class="qc-managed-dialog__headline">
          <p class="qc-managed-dialog__eyebrow">{{ eyebrowText }}</p>
          <h2 class="qc-managed-dialog__title">{{ titleText }}</h2>
          <p class="qc-managed-dialog__subtitle">{{ subtitleText }}</p>
        </div>
        <button class="qc-managed-dialog__close" type="button" @click="$emit('cancel')">
          <span aria-hidden="true">×</span>
          <span class="sr-only">{{ t("cancel") }}</span>
        </button>
      </header>

      <div class="pt-4">
        <StepBar :steps="formSteps" />
      </div>

      <div v-if="stepError" class="qc-error-banner" role="alert" aria-live="polite">
        <p class="qc-error-banner__text">{{ stepError }}</p>
      </div>

      <div v-if="error" class="qc-error-banner" role="alert" aria-live="polite">
        <p class="qc-error-banner__text">{{ error }}</p>
      </div>

      <form id="policyQuickForm" class="space-y-6" @submit.prevent="onSubmit">
        <PolicyFormCustomerStep
          v-if="currentStep === 1"
          :model="model"
          :field-errors="fieldErrors"
          :options-map="optionsMap"
          :disabled="disabled"
          :active-locale="activeLocale"
          :has-source-offer="hasSourceOffer"
          :office-branch="officeBranch"
          :customer-locked-message="customerLockedMessage"
          :customer-picker-label="customerPickerLabel"
          :customer-search-placeholder="customerSearchPlaceholder"
          :customer-no-results-text="customerNoResultsText"
          :selected-customer-details="selectedCustomerDetails"
          :selected-customer-type-label="selectedCustomerTypeLabel"
          :selected-customer-tax-id="selectedCustomerTaxId"
          :selected-customer-birth-date="selectedCustomerBirthDate"
          :selected-customer-phone="selectedCustomerPhone"
          :selected-customer-email="selectedCustomerEmail"
          :policy-source-offer-fields="policySourceOfferFields"
          :t="t"
        />

        <PolicyFormPolicyStep
          v-if="currentStep === 2"
          :model="model"
          :field-errors="fieldErrors"
          :options-map="optionsMap"
          :disabled="disabled"
          :active-locale="activeLocale"
          :policy-step-fields="policyStepFields"
          :t="t"
        />

        <PolicyFormCoverageStep
          v-if="currentStep === 3"
          :model="model"
          :field-errors="fieldErrors"
          :options-map="optionsMap"
          :disabled="disabled"
          :active-locale="activeLocale"
          :policy-coverage-fields="policyCoverageFields"
          :t="t"
        />

        <PolicyFormReviewStep
          v-if="currentStep === 4"
          :model="model"
          :field-errors="fieldErrors"
          :options-map="optionsMap"
          :disabled="disabled"
          :active-locale="activeLocale"
          :policy-review-fields="policyReviewFields"
          :summary-customer-name="summaryCustomerName"
          :summary-customer-type="summaryCustomerType"
          :summary-customer-tax-id="summaryCustomerTaxId"
          :summary-customer-birth-date="summaryCustomerBirthDate"
          :summary-customer-phone="summaryCustomerPhone"
          :summary-customer-email="summaryCustomerEmail"
          :t="t"
        />
      </form>

      <div class="at-quick-create-shell__footer">
        <button
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-60"
          type="button"
          :disabled="actionsDisabled"
          @click="$emit('cancel')"
        >
          {{ t("cancel") }}
        </button>
        <button
          v-if="currentStep > 1"
          class="rounded-lg border border-brand-700 px-4 py-2 text-sm font-semibold text-brand-700 disabled:opacity-60"
          type="button"
          :disabled="actionsDisabled"
          @click="onPreviousStep"
        >
          {{ t("back") }}
        </button>
        <button
          v-if="currentStep < totalSteps"
          class="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          type="button"
          :disabled="actionsDisabled"
          @click="onNextStep"
        >
          {{ t("next") }}
        </button>
        <button
          v-if="currentStep === totalSteps"
          class="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          type="submit"
          :disabled="actionsDisabled"
          form="policyQuickForm"
        >
          {{ saveButtonText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";
import StepBar from "../components/ui/StepBar.vue";
import PolicyFormCustomerStep from "./policy-form/PolicyFormCustomerStep.vue";
import PolicyFormPolicyStep from "./policy-form/PolicyFormPolicyStep.vue";
import PolicyFormCoverageStep from "./policy-form/PolicyFormCoverageStep.vue";
import PolicyFormReviewStep from "./policy-form/PolicyFormReviewStep.vue";
import { usePolicyFormRuntime } from "../composables/usePolicyFormRuntime";

const authStore = useAuthStore(getAppPinia());

const props = defineProps({
  model: { type: Object, required: true },
  fieldErrors: { type: Object, default: () => ({}) },
  optionsMap: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  hasSourceOffer: { type: Boolean, default: false },
  officeBranch: { type: String, default: "" },
  error: { type: String, default: "" },
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  eyebrow: { type: String, default: "" },
});

const emit = defineEmits(["cancel", "submit"]);

const {
  t,
  activeLocale,
  customerPickerLabel,
  customerSearchPlaceholder,
  customerNoResultsText,
  customerLockedMessage,
  currentStep,
  totalSteps,
  stepError,
  actionsDisabled,
  saveButtonText,
  eyebrowText,
  titleText,
  subtitleText,
  formSteps,
  policySourceOfferFields,
  policyStepFields,
  policyCoverageFields,
  policyReviewFields,
  selectedCustomerDetails,
  selectedCustomerTypeLabel,
  selectedCustomerTaxId,
  selectedCustomerBirthDate,
  selectedCustomerPhone,
  selectedCustomerEmail,
  summaryCustomerName,
  summaryCustomerType,
  summaryCustomerTaxId,
  summaryCustomerBirthDate,
  summaryCustomerPhone,
  summaryCustomerEmail,
  onSubmit,
  onNextStep,
  onPreviousStep,
} = usePolicyFormRuntime({
  props,
  authStore,
  emit,
});
</script>
