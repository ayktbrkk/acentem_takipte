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
        <SectionPanel v-if="currentStep === 1" :title="t('customerSection')" :show-count="false">
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

        <SectionPanel v-if="currentStep === 2" :title="t('policySection')" :show-count="false">
          <QuickCreateFormRenderer
            :fields="policyStepFields"
            :model="model"
            :field-errors="fieldErrors"
            :disabled="disabled"
            :locale="activeLocale"
            :options-map="optionsMap"
          />
        </SectionPanel>

        <SectionPanel v-if="currentStep === 3" :title="t('coverageSection')" :show-count="false">
          <QuickCreateFormRenderer
            :fields="policyCoverageFields"
            :model="model"
            :field-errors="fieldErrors"
            :disabled="disabled"
            :locale="activeLocale"
            :options-map="optionsMap"
          />
        </SectionPanel>

        <SectionPanel v-if="currentStep === 4" :title="t('previewSection')" :show-count="false">
          <div class="space-y-4">
            <QuickCreateFormRenderer
              :fields="policyReviewFields"
              :model="model"
              :field-errors="fieldErrors"
              :disabled="disabled"
              :locale="activeLocale"
              :options-map="optionsMap"
            />
            <div class="qc-summary-shell">
              <div class="qc-summary-card">
                <p class="qc-accent-label">{{ t("summaryCustomerSection") }}</p>
                <div class="mt-2 space-y-1">
                  <p><strong>{{ t("summaryCustomer") }}:</strong> {{ summaryCustomerName }}</p>
                  <p><strong>{{ t("summaryCustomerType") }}:</strong> {{ summaryCustomerType }}</p>
                  <p><strong>{{ t("summaryTaxId") }}:</strong> {{ summaryCustomerTaxId }}</p>
                  <p><strong>{{ t("summaryBirthDate") }}:</strong> {{ summaryCustomerBirthDate }}</p>
                  <p><strong>{{ t("summaryPhone") }}:</strong> {{ summaryCustomerPhone }}</p>
                  <p><strong>{{ t("summaryEmail") }}:</strong> {{ summaryCustomerEmail }}</p>
                  <p><strong>{{ t("summarySourceOffer") }}:</strong> {{ model.source_offer || '-' }}</p>
                </div>
              </div>
              <div class="qc-summary-card">
                <p class="qc-accent-label">{{ t("summaryPolicySection") }}</p>
                <div class="mt-2 space-y-1">
                  <p><strong>{{ t("summaryPolicy") }}:</strong> {{ model.policy_no || '-' }}</p>
                  <p><strong>{{ t("summaryBranch") }}:</strong> {{ model.branch || '-' }}</p>
                  <p><strong>{{ t("summaryCompany") }}:</strong> {{ model.insurance_company || '-' }}</p>
                  <p><strong>{{ t("summarySalesEntity") }}:</strong> {{ model.sales_entity || '-' }}</p>
                  <p><strong>{{ t("summaryStatus") }}:</strong> {{ model.status || '-' }}</p>
                  <p><strong>{{ t("summaryCurrency") }}:</strong> {{ model.currency || '-' }}</p>
                </div>
              </div>
              <div class="qc-summary-card">
                <p class="qc-accent-label">{{ t("summaryCoverageSection") }}</p>
                <div class="mt-2 space-y-1">
                  <p><strong>{{ t("summaryIssueDate") }}:</strong> {{ model.issue_date || '-' }}</p>
                  <p><strong>{{ t("summaryStartDate") }}:</strong> {{ model.start_date || '-' }}</p>
                  <p><strong>{{ t("summaryEndDate") }}:</strong> {{ model.end_date || '-' }}</p>
                  <p><strong>{{ t("summaryGrossPremium") }}:</strong> {{ model.gross_premium || '-' }}</p>
                  <p><strong>{{ t("summaryNetPremium") }}:</strong> {{ model.net_premium || '-' }}</p>
                  <p><strong>{{ t("summaryTaxAmount") }}:</strong> {{ model.tax_amount || '-' }}</p>
                  <p><strong>{{ t("summaryCommission") }}:</strong> {{ model.commission_amount || '-' }}</p>
                </div>
              </div>
              <div class="qc-summary-card">
                <p class="qc-accent-label">{{ t("summaryNotesSection") }}</p>
                <p class="mt-2 whitespace-pre-wrap text-sm text-slate-700">{{ model.notes || '-' }}</p>
              </div>
            </div>
          </div>
        </SectionPanel>
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
import { computed, ref, unref } from "vue";
import QuickCreateFormRenderer from "./app-shell/QuickCreateFormRenderer.vue";
import QuickCustomerPicker from "./app-shell/QuickCustomerPicker.vue";
import SectionPanel from "./app-shell/SectionPanel.vue";
import { getQuickCreateConfig } from "../config/quickCreateRegistry";
import { useAuthStore } from "../stores/auth";
import { isValidTckn, normalizeCustomerType, normalizeIdentityNumber } from "../utils/customerIdentity";
import StepBar from "../components/ui/StepBar.vue";

const authStore = useAuthStore();

const copy = {
  tr: {
    quickPolicyTag: "Hızlı Poliçe",
    title: "Yeni Poliçe",
    subtitle: "Çok adımlı hızlı poliçe formu",
    customerSection: "Müşteri Bilgileri",
    policySection: "Poliçe Detayları",
    coverageSection: "Teminat ve Primler",
    previewSection: "Önizleme ve Onay",
    customerStepHint: "Müşteriyi tek çubuktan arayın. Arama sonucu yoksa aynı yerden yeni müşteri oluşturun.",
    selectedCustomerTitle: "Seçili Müşteri",
    selectedCustomerHint: "Mevcut müşteri seçildiğinde bilgiler otomatik gelir ve bu bölüm kilitlenir.",
    selectedCustomerLocked: "Kilitli",
    cancel: "İptal",
    summaryCustomerSection: "Müşteri Özeti",
    summaryPolicySection: "Poliçe Özeti",
    summaryCoverageSection: "Prim ve Tarih",
    summaryNotesSection: "Notlar",
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
    summarySourceOffer: "Kaynak Teklif",
    summaryPolicy: "Poliçe",
    summaryBranch: "Branş",
    summaryGrossPremium: "Brüt Prim",
    summaryCustomerType: "Müşteri Tipi",
    summaryTaxId: "Kimlik / Vergi No",
    summaryBirthDate: "Doğum Tarihi",
    summaryPhone: "Telefon",
    summaryEmail: "E-posta",
    summaryCompany: "Sigorta Şirketi",
    summarySalesEntity: "Satış Temsilcisi",
    summaryStatus: "Durum",
    summaryCurrency: "Para Birimi",
    summaryIssueDate: "Tanzim Tarihi",
    summaryStartDate: "Başlangıç Tarihi",
    summaryEndDate: "Bitiş Tarihi",
    summaryNetPremium: "Net Prim",
    summaryTaxAmount: "Vergi Tutarı",
    summaryCommission: "Komisyon",
    corporateLabel: "Kurumsal",
    individualLabel: "Bireysel",
    back: "Geri",
    next: "İleri",
    save: "Kaydet",
    saving: "Kaydediliyor...",
    stepCustomer: "Müşteri",
    stepPolicy: "Poliçe",
    stepCoverage: "Teminat",
    stepReview: "Onay",
    sourceOfferHint: "Kaynak teklif seçildiğinde şirket, branş, durum ve prim alanları tekliften devralınır.",
    sourceOfferRequired: "Lütfen kaynak teklif seçin.",
    customerSelectionRequired: "Bir müşteri seçin veya yeni müşteri oluşturun.",
    customerNameRequired: "Yeni müşteri adı gerekli.",
    customerIdentityRequired: "TC/VKN gerekli.",
    customerCorporateLength: "Kurumsal müşteri için 10 haneli vergi numarası girin.",
    customerIndividualLength: "Bireysel müşteri için 11 haneli TC kimlik numarası girin.",
    customerIndividualInvalid: "Geçerli bir TC kimlik numarası girin.",
    sales_entityRequired: "Satış birimi gerekli.",
    insurance_companyRequired: "Sigorta şirketi gerekli.",
    branchRequired: "Branş gerekli.",
    currencyRequired: "Para birimi gerekli.",
    statusRequired: "Durum gerekli.",
    issue_dateRequired: "Tanzim tarihi gerekli.",
    start_dateRequired: "Başlangıç tarihi gerekli.",
    end_dateRequired: "Bitiş tarihi gerekli.",
    gross_premiumRequired: "Brüt prim gerekli.",
    grossPremiumRequired: "Brüt prim 0'dan büyük olmalıdır.",
    issueDateAfterStartDate: "Tanzim tarihi başlangıç tarihinden sonra olamaz.",
    startDateAfterEndDate: "Başlangıç tarihi bitiş tarihinden sonra olamaz.",
    defaultError: "Lütfen gerekli alanları doldurun.",
  },
  en: {
    quickPolicyTag: "Quick Policy",
    title: "New Policy",
    subtitle: "Multi-step quick policy form",
    customerSection: "Customer Details",
    policySection: "Policy Details",
    coverageSection: "Coverage and Premiums",
    previewSection: "Preview and Review",
    customerStepHint: "Search customers from one bar. If no result appears, create a new customer from the same place.",
    selectedCustomerTitle: "Selected Customer",
    selectedCustomerHint: "When an existing customer is selected, details are auto-filled and this section is locked.",
    selectedCustomerLocked: "Locked",
    cancel: "Cancel",
    summaryCustomerSection: "Customer Summary",
    summaryPolicySection: "Policy Summary",
    summaryCoverageSection: "Premiums and Dates",
    summaryNotesSection: "Notes",
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
    summarySourceOffer: "Source Offer",
    summaryPolicy: "Policy",
    summaryBranch: "Branch",
    summaryGrossPremium: "Gross Premium",
    summaryCustomerType: "Customer Type",
    summaryTaxId: "ID / Tax No",
    summaryBirthDate: "Birth Date",
    summaryPhone: "Phone",
    summaryEmail: "Email",
    summaryCompany: "Insurance Company",
    summarySalesEntity: "Sales Entity",
    summaryStatus: "Status",
    summaryCurrency: "Currency",
    summaryIssueDate: "Issue Date",
    summaryStartDate: "Start Date",
    summaryEndDate: "End Date",
    summaryNetPremium: "Net Premium",
    summaryTaxAmount: "Tax Amount",
    summaryCommission: "Commission",
    corporateLabel: "Corporate",
    individualLabel: "Individual",
    back: "Back",
    next: "Next",
    save: "Save",
    saving: "Saving...",
    stepCustomer: "Customer",
    stepPolicy: "Policy",
    stepCoverage: "Coverage",
    stepReview: "Review",
    sourceOfferHint: "When a source offer is selected, company, branch, status, and premium fields are inherited from the offer.",
    sourceOfferRequired: "Please select a source offer.",
    customerSelectionRequired: "Select a customer or create a new one.",
    customerNameRequired: "New customer name is required.",
    customerIdentityRequired: "Customer ID / tax number is required.",
    customerCorporateLength: "Enter a 10-digit tax number for corporate customers.",
    customerIndividualLength: "Enter an 11-digit national ID number for individual customers.",
    customerIndividualInvalid: "Enter a valid national ID number.",
    sales_entityRequired: "Sales entity is required.",
    insurance_companyRequired: "Insurance company is required.",
    branchRequired: "Branch is required.",
    currencyRequired: "Currency is required.",
    statusRequired: "Status is required.",
    issue_dateRequired: "Issue date is required.",
    start_dateRequired: "Start date is required.",
    end_dateRequired: "End date is required.",
    gross_premiumRequired: "Gross premium is required.",
    grossPremiumRequired: "Gross premium must be greater than zero.",
    issueDateAfterStartDate: "Issue date cannot be later than start date.",
    startDateAfterEndDate: "Start date cannot be later than end date.",
    defaultError: "Please fill required fields.",
  },
};

const activeLocale = computed(() => unref(authStore.locale) || "tr");
const customerPickerLabel = {
  tr: "Müşteri Ara / Yeni Müşteri",
  en: "Customer Search / New Customer",
};
const customerSearchPlaceholder = {
  tr: "Müşteri adı, ünvanı veya TC/VKN girin...",
  en: "Search by customer name, company name, or ID...",
};
const customerNoResultsText = {
  tr: "Aranan müşteri bulunamadı. Aynı çubuktan yeni müşteri ekleyebilirsiniz.",
  en: "No customer found. You can add a new customer from the same bar.",
};
const customerLockedMessage = {
  tr: "Kaynak teklif seçildiğinde müşteri bilgisi tekliften otomatik alınır.",
  en: "Customer information is inherited automatically when a source offer is selected.",
};

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
  officeBranch: { type: String, default: "" },
  error: { type: String, default: '' },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
});

const emit = defineEmits(['cancel', 'submit']);

const currentStep = ref(1);
const totalSteps = 4;
const stepError = ref("");
const actionsDisabled = computed(() => props.disabled || props.loading);
const saveButtonText = computed(() => (props.loading ? t("saving") : t("save")));

const eyebrowText = computed(() => props.eyebrow || t("quickPolicyTag"));
const titleText = computed(() => props.title || t("title"));
const subtitleText = computed(() => props.subtitle || t("subtitle"));

const formSteps = computed(() => [
  { label: t("stepCustomer"), state: currentStep.value > 1 ? 'done' : 'current' },
  { label: t("stepPolicy"), state: currentStep.value > 2 ? 'done' : currentStep.value === 2 ? 'current' : 'pending' },
  { label: t("stepCoverage"), state: currentStep.value > 3 ? 'done' : currentStep.value === 3 ? 'current' : 'pending' },
  { label: t("stepReview"), state: currentStep.value === 4 ? 'current' : 'pending' },
]);

const quickPolicyConfig = getQuickCreateConfig("policy");
const policyQuickFields = computed(() => quickPolicyConfig?.fields || []);
const policySourceOfferFields = computed(() =>
  policyQuickFields.value
    .filter((field) => field.name === "source_offer")
    .map((field) => ({ ...field, fullWidth: true }))
);
const policyStepFields = computed(() =>
  policyQuickFields.value.filter((field) =>
    ["sales_entity", "insurance_company", "branch", "policy_no", "status", "currency"].includes(field.name)
  )
);
const policyCoverageFields = computed(() => [
  {
    name: "start_date",
    type: "date",
    label: t("startDateLabel"),
    required: () => !props.hasSourceOffer,
  },
  {
    name: "end_date",
    type: "date",
    label: t("endDateLabel"),
    required: () => !props.hasSourceOffer,
  },
  {
    name: "issue_date",
    type: "date",
    label: t("issueDateLabel"),
    required: () => !props.hasSourceOffer,
    disabled: () => props.hasSourceOffer,
  },
  {
    name: "gross_premium",
    type: "number",
    label: t("grossPremiumLabel"),
    required: () => !props.hasSourceOffer,
    disabled: () => props.hasSourceOffer,
    min: 0,
    step: "0.01",
  },
  {
    name: "net_premium",
    type: "number",
    label: t("netPremiumLabel"),
    disabled: () => props.hasSourceOffer,
    min: 0,
    step: "0.01",
  },
  {
    name: "tax_amount",
    type: "number",
    label: t("taxAmountLabel"),
    disabled: () => props.hasSourceOffer,
    min: 0,
    step: "0.01",
  },
  {
    name: "commission_amount",
    type: "number",
    label: t("commissionLabel"),
    disabled: () => props.hasSourceOffer,
    min: 0,
    step: "0.01",
  },
]);
const policyReviewFields = computed(() => [
  {
    name: "notes",
    type: "textarea",
    label: t("notesLabel"),
    rows: 8,
    fullWidth: true,
  },
]);
const customerOptions = computed(() => props.optionsMap?.customers || []);
const selectedCustomerDetails = computed(() => {
  const customerName = String(props.model?.customer || "").trim();
  if (!customerName) return null;
  return (
    customerOptions.value.find((row) => String(row?.value || "").trim() === customerName) || {
      value: customerName,
      label: String(props.model?.customer_full_name || props.model?.queryText || customerName).trim() || customerName,
      customer_type: props.model?.customer_type || "",
      tax_id: props.model?.customer_tax_id || "",
      birth_date: props.model?.customer_birth_date || "",
      phone: props.model?.customer_phone || "",
      email: props.model?.customer_email || "",
    }
  );
});
const selectedCustomerName = computed(() =>
  String(selectedCustomerDetails.value?.label || props.model?.customer_full_name || props.model?.queryText || props.model?.customer || "").trim()
);
const selectedCustomerTypeLabel = computed(() => {
  const normalized = normalizeCustomerType(
    selectedCustomerDetails.value?.customer_type || props.model?.customer_type,
    selectedCustomerDetails.value?.tax_id || props.model?.customer_tax_id || ""
  );
  return normalized === "Corporate" ? t("corporateLabel") : t("individualLabel");
});
const selectedCustomerTaxId = computed(
  () => String(selectedCustomerDetails.value?.tax_id || props.model?.customer_tax_id || "-").trim() || "-"
);
const selectedCustomerBirthDate = computed(() => {
  const rawBirthDate = String(selectedCustomerDetails.value?.birth_date || props.model?.customer_birth_date || "").trim();
  if (!rawBirthDate) return "-";
  const normalizedType = normalizeCustomerType(
    selectedCustomerDetails.value?.customer_type || props.model?.customer_type,
    selectedCustomerDetails.value?.tax_id || props.model?.customer_tax_id || ""
  );
  return normalizedType === "Corporate" ? "-" : rawBirthDate;
});
const selectedCustomerPhone = computed(
  () => String(selectedCustomerDetails.value?.phone || props.model?.customer_phone || "-").trim() || "-"
);
const selectedCustomerEmail = computed(
  () => String(selectedCustomerDetails.value?.email || props.model?.customer_email || "-").trim() || "-"
);
const summaryCustomerName = computed(() => selectedCustomerName.value || "-");
const summaryCustomerType = computed(() => selectedCustomerTypeLabel.value || "-");
const summaryCustomerTaxId = computed(() => selectedCustomerTaxId.value || "-");
const summaryCustomerBirthDate = computed(() => selectedCustomerBirthDate.value || "-");
const summaryCustomerPhone = computed(() => selectedCustomerPhone.value || "-");
const summaryCustomerEmail = computed(() => selectedCustomerEmail.value || "-");

function onSubmit() {
  if (actionsDisabled.value) return;
  if (currentStep.value < totalSteps) {
    onNextStep();
    return;
  }
  emit('submit');
}

function customerIsSelected() {
  return Boolean(String(props.model?.customer || "").trim());
}

function customerNameForValidation() {
  return String(props.model?.customer_full_name || props.model?.queryText || "").trim();
}

function customerTypeForValidation() {
  return normalizeCustomerType(props.model?.customer_type, props.model?.customer_tax_id || "");
}

function customerTaxIdForValidation() {
  return normalizeIdentityNumber(props.model?.customer_tax_id);
}

function parseDateOnly(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  const date = new Date(`${trimmed}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function validateCustomerStep() {
  if (props.hasSourceOffer) {
    return String(props.model?.source_offer || "").trim() ? "" : t("sourceOfferRequired");
  }
  if (customerIsSelected()) {
    return "";
  }
  if (!props.model?.createCustomerMode) {
    return t("customerSelectionRequired");
  }
  const customerName = customerNameForValidation();
  if (!customerName) return t("customerNameRequired");
  const customerType = customerTypeForValidation();
  const identityNumber = customerTaxIdForValidation();
  if (!identityNumber) return t("customerIdentityRequired");
  if (customerType === "Corporate") {
    if (identityNumber.length !== 10) return t("customerCorporateLength");
  } else {
    if (identityNumber.length !== 11) return t("customerIndividualLength");
    if (!isValidTckn(identityNumber)) return t("customerIndividualInvalid");
  }
  return "";
}

function validatePolicyStep() {
  if (props.hasSourceOffer) return "";
  const requiredFields = ["sales_entity", "insurance_company", "branch", "currency", "status"];
  for (const fieldName of requiredFields) {
    if (!String(props.model?.[fieldName] || "").trim()) {
      return t(`${fieldName}Required`);
    }
  }
  return "";
}

function validateCoverageStep() {
  if (props.hasSourceOffer) return "";
  const requiredFields = ["issue_date", "start_date", "end_date", "gross_premium"];
  for (const fieldName of requiredFields) {
    if (!String(props.model?.[fieldName] || "").trim()) {
      return t(`${fieldName}Required`);
    }
  }
  const issueDate = parseDateOnly(props.model?.issue_date);
  const startDate = parseDateOnly(props.model?.start_date);
  const endDate = parseDateOnly(props.model?.end_date);
  if (issueDate && startDate && issueDate > startDate) return t("issueDateAfterStartDate");
  if (startDate && endDate && startDate > endDate) return t("startDateAfterEndDate");
  const gross = Number(props.model?.gross_premium || 0);
  if (!Number.isFinite(gross) || gross <= 0) return t("grossPremiumRequired");
  return "";
}

function validateCurrentStep() {
  if (currentStep.value === 1) return validateCustomerStep();
  if (currentStep.value === 2) return validatePolicyStep();
  if (currentStep.value === 3) return validateCoverageStep();
  return "";
}

function onNextStep() {
  if (actionsDisabled.value) return;
  const validationError = validateCurrentStep();
  if (validationError) {
    stepError.value = validationError;
    return;
  }
  stepError.value = "";
  if (currentStep.value < totalSteps) currentStep.value += 1;
}

function onPreviousStep() {
  if (actionsDisabled.value) return;
  stepError.value = "";
  if (currentStep.value > 1) currentStep.value -= 1;
}
</script>
