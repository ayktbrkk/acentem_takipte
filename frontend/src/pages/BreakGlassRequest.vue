<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="requestCountLabel"
    :record-count-label="t('recordCount')"
  >
    <BreakGlassRequestFormPanel
      :form="form"
      :access-type-options="accessTypeOptions"
      :submit-error="submitError"
      :submit-result="submitResult"
      :submitting="submitting"
      :t="t"
      @submit="submitRequest"
      @reset="resetForm"
    />

    <BreakGlassRequestValidationPanel
      :validation="validation"
      :access-type-options="accessTypeOptions"
      :validation-message="validationMessage"
      :validation-ok="validationOk"
      :validating="validating"
      :t="t"
      @validate="validateAccess"
    />
  </WorkbenchPageLayout>
</template>

<script setup>

import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";
import { useBreakGlassRequest } from "../composables/useBreakGlassRequest";
import BreakGlassRequestFormPanel from "../components/break-glass-request/BreakGlassRequestFormPanel.vue";
import BreakGlassRequestValidationPanel from "../components/break-glass-request/BreakGlassRequestValidationPanel.vue";

const authStore = useAuthStore(getAppPinia());

const copy = {
  tr: {
    breadcrumb: "Kontrol Merkezi / Acil Erişim",
    title: "Break-Glass Talebi",
    subtitle: "Kapsamlı veri erişimi için denetlenebilir acil erişim talebi oluşturun",
    recordCount: "son talep",
    requestPanelTitle: "Yeni Talep",
    validatePanelTitle: "Aktif Erişim Kontrolü",
    accessType: "Erişim tipi",
    referenceDoctype: "Referans DocType (opsiyonel)",
    referenceDoctypePlaceholder: "AT Customer, AT Policy vb.",
    referenceName: "Referans Kayıt (opsiyonel)",
    referenceNamePlaceholder: "CUS-0001, POL-0005 vb.",
    justification: "İş gerekçesi",
    justificationPlaceholder: "Neden acil erişim gerektiğini açıkça yazın (min 20 karakter)",
    justificationHint: "Minimum 20 karakter:",
    submit: "Talebi Gönder",
    submitting: "Gönderiliyor",
    clear: "Temizle",
    validate: "Erişimi Doğrula",
    validating: "Doğrulanıyor",
    submitSuccessTitle: "Talep alındı",
    requiredJustification: "Gerekçe en az 20 karakter olmalıdır.",
    unknownError: "Beklenmeyen bir hata oluştu.",
    defaultSuccess: "Talebiniz onay sırasına alındı.",
    customerData: "Müşteri Verisi",
    customerFinancials: "Müşteri Finansalları",
    systemAdmin: "Sistem Yönetimi",
    reportingOverride: "Raporlama İstisnası",
  },
  en: {
    breadcrumb: "Control Center / Emergency Access",
    title: "Break-Glass Request",
    subtitle: "Submit auditable emergency access requests for time-bound elevated visibility",
    recordCount: "latest request",
    requestPanelTitle: "New Request",
    validatePanelTitle: "Active Access Check",
    accessType: "Access type",
    referenceDoctype: "Reference DocType (optional)",
    referenceDoctypePlaceholder: "AT Customer, AT Policy, etc.",
    referenceName: "Reference Record (optional)",
    referenceNamePlaceholder: "CUS-0001, POL-0005, etc.",
    justification: "Business justification",
    justificationPlaceholder: "Explain why emergency access is required (min 20 chars)",
    justificationHint: "Minimum 20 characters:",
    submit: "Submit Request",
    submitting: "Submitting",
    clear: "Clear",
    validate: "Validate Access",
    validating: "Validating",
    submitSuccessTitle: "Request received",
    requiredJustification: "Justification must be at least 20 characters.",
    unknownError: "Unexpected error occurred.",
    defaultSuccess: "Your request is queued for approval.",
    customerData: "Customer Data",
    customerFinancials: "Customer Financials",
    systemAdmin: "System Admin",
    reportingOverride: "Reporting Override",
  },
};

function t(key) {
  return copy[authStore.locale]?.[key] || copy.en[key] || key;
}

const runtime = useBreakGlassRequest({ t });
const {
  accessTypeOptions,
  form,
  validation,
  requestCountLabel,
  submitting,
  validating,
  submitError,
  submitResult,
  validationMessage,
  validationOk,
  submitRequest,
  resetForm,
  validateAccess,
} = runtime;
</script>
