<template>
  <div class="form-shell">
    <div class="form-header">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">{{ titleText }}</h2>
        <p class="text-sm text-gray-500">{{ subtitleText }}</p>
      </div>
      <button class="btn btn-outline btn-sm" type="button" @click="$emit('cancel')">X</button>
    </div>

    <div class="px-6 pt-4">
      <StepBar :steps="formSteps" />
    </div>

    <div v-if="error" class="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ error }}
    </div>

    <form class="space-y-6" @submit.prevent="onSubmit">
      <div v-if="currentStep === 1" class="form-section">
        <h3 class="form-section-title">{{ t("customerSection") }}</h3>
        <div class="form-grid">
          <div v-if="!hasSourceOffer" class="form-field">
            <label class="form-label">{{ t("customerLabel") }}</label>
            <select v-model="model.customer" class="form-input" :disabled="disabled">
              <option value="">{{ t("selectOption") }}</option>
              <option v-for="row in customerOptions" :key="row.value" :value="row.value">{{ row.label }}</option>
            </select>
            <p v-if="fieldErrors.customer" class="text-xs text-red-600">{{ fieldErrors.customer }}</p>
          </div>

          <div v-if="!hasSourceOffer" class="form-field">
            <label class="form-label">{{ t("newCustomerLabel") }}</label>
            <input v-model="model.queryText" class="form-input" type="text" :disabled="disabled" />
          </div>

          <div v-if="!hasSourceOffer" class="form-field md:col-span-2">
            <label class="inline-flex items-center gap-2 text-sm text-gray-700">
              <input v-model="model.createCustomerMode" type="checkbox" :disabled="disabled" />
              {{ t("createCustomer") }}
            </label>
          </div>

          <div v-if="!hasSourceOffer" class="form-field">
            <label class="form-label required">{{ t("taxIdLabel") }}</label>
            <input v-model="model.customer_tax_id" class="form-input" type="text" :disabled="disabled" />
            <p v-if="fieldErrors.customer_tax_id" class="text-xs text-red-600">{{ fieldErrors.customer_tax_id }}</p>
          </div>

          <div v-if="!hasSourceOffer" class="form-field">
            <label class="form-label">{{ t("phoneLabel") }}</label>
            <input v-model="model.customer_phone" class="form-input" type="text" :disabled="disabled" />
          </div>

          <div v-if="!hasSourceOffer" class="form-field md:col-span-2">
            <label class="form-label">{{ t("emailLabel") }}</label>
            <input v-model="model.customer_email" class="form-input" type="email" :disabled="disabled" />
          </div>

          <div class="form-field md:col-span-2">
            <label class="form-label">{{ t("sourceOfferLabel") }}</label>
            <select v-model="model.source_offer" class="form-input" :disabled="disabled">
              <option value="">{{ t("selectOption") }}</option>
              <option v-for="row in offerOptions" :key="row.value" :value="row.value">{{ row.label }}</option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="currentStep === 2" class="form-section">
        <h3 class="form-section-title">{{ t("policySection") }}</h3>
        <div class="form-grid">
          <div class="form-field">
            <label class="form-label required">{{ t("insuranceCompanyLabel") }}</label>
            <select v-model="model.insurance_company" class="form-input" :disabled="disabled || hasSourceOffer">
              <option value="">{{ t("selectOption") }}</option>
              <option v-for="row in companyOptions" :key="row.value" :value="row.value">{{ row.label }}</option>
            </select>
            <p v-if="fieldErrors.insurance_company" class="text-xs text-red-600">{{ fieldErrors.insurance_company }}</p>
          </div>

          <div class="form-field">
            <label class="form-label required">{{ t("branchLabel") }}</label>
            <select v-model="model.branch" class="form-input" :disabled="disabled || hasSourceOffer">
              <option value="">{{ t("selectOption") }}</option>
              <option v-for="row in branchOptions" :key="row.value" :value="row.value">{{ row.label }}</option>
            </select>
            <p v-if="fieldErrors.branch" class="text-xs text-red-600">{{ fieldErrors.branch }}</p>
          </div>

          <div class="form-field">
            <label class="form-label">{{ t("salesEntityLabel") }}</label>
            <select v-model="model.sales_entity" class="form-input" :disabled="disabled || hasSourceOffer">
              <option value="">{{ t("selectOption") }}</option>
              <option v-for="row in salesEntityOptions" :key="row.value" :value="row.value">{{ row.label }}</option>
            </select>
          </div>

          <div class="form-field">
            <label class="form-label">{{ t("policyNoLabel") }}</label>
            <input v-model="model.policy_no" class="form-input" type="text" :disabled="disabled" />
          </div>

          <div class="form-field">
            <label class="form-label">{{ t("statusLabel") }}</label>
            <select v-model="model.status" class="form-input" :disabled="disabled || hasSourceOffer">
              <option value="Active">{{ t("statusActive") }}</option>
              <option value="Draft">{{ t("statusDraft") }}</option>
              <option value="KYT">{{ t("statusKyt") }}</option>
              <option value="IPT">{{ t("statusIpt") }}</option>
            </select>
          </div>

          <div class="form-field">
            <label class="form-label required">{{ t("currencyLabel") }}</label>
            <input v-model="model.currency" class="form-input" type="text" :disabled="disabled" />
          </div>
        </div>
      </div>

      <div v-if="currentStep === 3" class="form-section">
        <h3 class="form-section-title">{{ t("coverageSection") }}</h3>
        <div class="form-grid">
          <div class="form-field">
            <label class="form-label">{{ t("startDateLabel") }}</label>
            <input v-model="model.start_date" class="form-input" type="date" :disabled="disabled" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("endDateLabel") }}</label>
            <input v-model="model.end_date" class="form-input" type="date" :disabled="disabled" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("issueDateLabel") }}</label>
            <input v-model="model.issue_date" class="form-input" type="date" :disabled="disabled || hasSourceOffer" />
          </div>

          <div class="form-field">
            <label class="form-label required">{{ t("grossPremiumLabel") }}</label>
            <input v-model="model.gross_premium" class="form-input" type="number" min="0" step="0.01" :disabled="disabled || hasSourceOffer" />
            <p v-if="fieldErrors.gross_premium" class="text-xs text-red-600">{{ fieldErrors.gross_premium }}</p>
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("netPremiumLabel") }}</label>
            <input v-model="model.net_premium" class="form-input" type="number" min="0" step="0.01" :disabled="disabled" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("taxAmountLabel") }}</label>
            <input v-model="model.tax_amount" class="form-input" type="number" min="0" step="0.01" :disabled="disabled" />
          </div>
          <div class="form-field">
            <label class="form-label">{{ t("commissionLabel") }}</label>
            <input v-model="model.commission_amount" class="form-input" type="number" min="0" step="0.01" :disabled="disabled" />
          </div>
        </div>
      </div>

      <div v-if="currentStep === 4" class="form-section">
        <h3 class="form-section-title">{{ t("previewSection") }}</h3>
        <div class="form-field">
          <label class="form-label">{{ t("notesLabel") }}</label>
          <textarea v-model="model.notes" class="form-input" rows="4" :disabled="disabled" />
        </div>
        <div class="mt-4 grid grid-cols-1 gap-2 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
          <p><strong>{{ t("summaryCustomer") }}:</strong> {{ model.customer || model.queryText || '-' }}</p>
          <p><strong>{{ t("summaryPolicy") }}:</strong> {{ model.policy_no || '-' }}</p>
          <p><strong>{{ t("summaryBranch") }}:</strong> {{ model.branch || '-' }}</p>
          <p><strong>{{ t("summaryGrossPremium") }}:</strong> {{ model.gross_premium || '-' }}</p>
        </div>
      </div>

      <div class="form-footer">
        <button v-if="currentStep > 1" class="btn btn-outline" type="button" :disabled="disabled" @click="currentStep -= 1">{{ t("back") }}</button>
        <button v-if="currentStep < totalSteps" class="btn btn-primary" type="button" :disabled="disabled" @click="currentStep += 1">{{ t("next") }}</button>
        <button v-if="currentStep === totalSteps" class="btn btn-primary" type="submit" :disabled="disabled || loading">{{ t("save") }}</button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { computed, ref, unref } from "vue";
import { useAuthStore } from "../stores/auth";
import StepBar from '@/components/ui/StepBar.vue';

const authStore = useAuthStore();

const copy = {
  tr: {
    title: "Yeni Poliçe",
    subtitle: "Çok adımlı hızlı poliçe formu",
    customerSection: "Müşteri Bilgileri",
    policySection: "Poliçe Detayları",
    coverageSection: "Teminat ve Primler",
    previewSection: "Önizleme ve Notlar",
    customerLabel: "Müşteri",
    newCustomerLabel: "Yeni Müşteri Adı",
    createCustomer: "Yeni müşteri oluştur",
    taxIdLabel: "Kimlik / Vergi No",
    phoneLabel: "Telefon",
    emailLabel: "E-posta",
    sourceOfferLabel: "Kaynak Teklif",
    insuranceCompanyLabel: "Sigorta Şirketi",
    branchLabel: "Branş",
    salesEntityLabel: "Satış Temsilcisi",
    policyNoLabel: "Poliçe No",
    statusLabel: "Durum",
    currencyLabel: "Para Birimi",
    startDateLabel: "Başlangıç Tarihi",
    endDateLabel: "Bitiş Tarihi",
    issueDateLabel: "Tanzim Tarihi",
    grossPremiumLabel: "Brüt Prim",
    netPremiumLabel: "Net Prim",
    taxAmountLabel: "Vergi Tutarı",
    commissionLabel: "Komisyon",
    notesLabel: "Notlar",
    selectOption: "Seçin...",
    statusActive: "Aktif",
    statusDraft: "Taslak",
    statusKyt: "KYT",
    statusIpt: "IPT",
    summaryCustomer: "Müşteri",
    summaryPolicy: "Poliçe",
    summaryBranch: "Branş",
    summaryGrossPremium: "Brüt Prim",
    back: "Geri",
    next: "İleri",
    save: "Kaydet",
    stepCustomer: "Müşteri",
    stepPolicy: "Poliçe",
    stepCoverage: "Teminat",
    stepPayment: "Ödeme",
    defaultError: "Lütfen gerekli alanları doldurun.",
  },
  en: {
    title: "New Policy",
    subtitle: "Multi-step quick policy form",
    customerSection: "Customer Details",
    policySection: "Policy Details",
    coverageSection: "Coverage and Premiums",
    previewSection: "Preview and Notes",
    customerLabel: "Customer",
    newCustomerLabel: "New Customer Name",
    createCustomer: "Create new customer",
    taxIdLabel: "ID / Tax No",
    phoneLabel: "Phone",
    emailLabel: "Email",
    sourceOfferLabel: "Source Offer",
    insuranceCompanyLabel: "Insurance Company",
    branchLabel: "Branch",
    salesEntityLabel: "Sales Entity",
    policyNoLabel: "Policy No",
    statusLabel: "Status",
    currencyLabel: "Currency",
    startDateLabel: "Start Date",
    endDateLabel: "End Date",
    issueDateLabel: "Issue Date",
    grossPremiumLabel: "Gross Premium",
    netPremiumLabel: "Net Premium",
    taxAmountLabel: "Tax Amount",
    commissionLabel: "Commission",
    notesLabel: "Notes",
    selectOption: "Select...",
    statusActive: "Active",
    statusDraft: "Draft",
    statusKyt: "KYT",
    statusIpt: "IPT",
    summaryCustomer: "Customer",
    summaryPolicy: "Policy",
    summaryBranch: "Branch",
    summaryGrossPremium: "Gross Premium",
    back: "Back",
    next: "Next",
    save: "Save",
    stepCustomer: "Customer",
    stepPolicy: "Policy",
    stepCoverage: "Coverage",
    stepPayment: "Payment",
    defaultError: "Please fill required fields.",
  },
};

const activeLocale = computed(() => unref(authStore.locale) || "tr");

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const props = defineProps({
  model: { type: Object, required: true },
  fieldErrors: { type: Object, default: () => ({}) },
  optionsMap: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  hasSourceOffer: { type: Boolean, default: false },
  error: { type: String, default: '' },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
});

const emit = defineEmits(['cancel', 'submit']);

const currentStep = ref(1);
const totalSteps = 4;

const titleText = computed(() => props.title || t("title"));
const subtitleText = computed(() => props.subtitle || t("subtitle"));

const formSteps = computed(() => [
  { label: t("stepCustomer"), state: currentStep.value > 1 ? 'done' : 'current' },
  { label: t("stepPolicy"), state: currentStep.value > 2 ? 'done' : currentStep.value === 2 ? 'current' : 'pending' },
  { label: t("stepCoverage"), state: currentStep.value > 3 ? 'done' : currentStep.value === 3 ? 'current' : 'pending' },
  { label: t("stepPayment"), state: currentStep.value === 4 ? 'current' : 'pending' },
]);

const customerOptions = computed(() => props.optionsMap?.customers || []);
const companyOptions = computed(() => props.optionsMap?.insuranceCompanies || []);
const branchOptions = computed(() => props.optionsMap?.branches || []);
const salesEntityOptions = computed(() => props.optionsMap?.salesEntities || []);
const offerOptions = computed(() => props.optionsMap?.offers || []);

function onSubmit() {
  if (currentStep.value < totalSteps) {
    currentStep.value += 1;
    return;
  }
  emit('submit');
}
</script>
