<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="requestCountLabel"
    :record-count-label="t('recordCount')"
  >
    <SectionPanel :title="t('requestPanelTitle')" panel-class="surface-card rounded-2xl p-5">
      <form class="space-y-4" @submit.prevent="submitRequest">
        <div class="grid gap-3 md:grid-cols-2">
          <label class="flex flex-col gap-1">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("accessType") }}</span>
            <select v-model="form.accessType" class="input" required>
              <option v-for="option in accessTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="flex flex-col gap-1">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("referenceDoctype") }}</span>
            <input v-model.trim="form.referenceDoctype" class="input" type="text" :placeholder="t('referenceDoctypePlaceholder')" />
          </label>

          <label class="flex flex-col gap-1 md:col-span-2">
            <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("referenceName") }}</span>
            <input v-model.trim="form.referenceName" class="input" type="text" :placeholder="t('referenceNamePlaceholder')" />
          </label>
        </div>

        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("justification") }}</span>
          <textarea
            v-model.trim="form.justification"
            class="input min-h-[130px]"
            :placeholder="t('justificationPlaceholder')"
            minlength="20"
            required
          />
          <span class="text-xs text-slate-500">
            {{ t("justificationHint") }}
            {{ form.justification.length }}/20
          </span>
        </label>

        <article v-if="submitError" class="qc-error-banner" role="alert" aria-live="polite">
          <p class="qc-error-banner__text">{{ submitError }}</p>
        </article>

        <article
          v-if="submitResult"
          class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          role="status"
          aria-live="polite"
        >
          <p class="font-semibold">{{ t("submitSuccessTitle") }}</p>
          <p class="mt-1">{{ submitResult }}</p>
        </article>

        <div class="flex flex-wrap items-center gap-2">
          <button class="btn btn-primary btn-sm" type="submit" :disabled="submitting">
            {{ submitting ? t("submitting") : t("submit") }}
          </button>
          <button class="btn btn-outline btn-sm" type="button" :disabled="submitting" @click="resetForm">
            {{ t("clear") }}
          </button>
        </div>
      </form>
    </SectionPanel>

    <SectionPanel :title="t('validatePanelTitle')" panel-class="surface-card rounded-2xl p-5">
      <div class="grid gap-3 md:grid-cols-2">
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("accessType") }}</span>
          <select v-model="validation.accessType" class="input">
            <option v-for="option in accessTypeOptions" :key="`validate-${option.value}`" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("referenceDoctype") }}</span>
          <input v-model.trim="validation.referenceDoctype" class="input" type="text" :placeholder="t('referenceDoctypePlaceholder')" />
        </label>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <button class="btn btn-outline btn-sm" type="button" :disabled="validating" @click="validateAccess">
          {{ validating ? t("validating") : t("validate") }}
        </button>
        <p v-if="validationMessage" class="text-sm" :class="validationOk ? 'text-emerald-700' : 'text-amber-700'">
          {{ validationMessage }}
        </p>
      </div>
    </SectionPanel>
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { frappeRequest } from "frappe-ui";

import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore(getAppPinia());

const copy = {
  tr: {
    breadcrumb: "Kontrol Merkezi / Acil Erisim",
    title: "Break-Glass Talebi",
    subtitle: "Kapsamli veri erisimi icin denetlenebilir acil erisim talebi olusturun",
    recordCount: "son talep",
    requestPanelTitle: "Yeni Talep",
    validatePanelTitle: "Aktif Erisim Kontrolu",
    accessType: "Erisim tipi",
    referenceDoctype: "Referans DocType (opsiyonel)",
    referenceDoctypePlaceholder: "AT Customer, AT Policy vb.",
    referenceName: "Referans Kayit (opsiyonel)",
    referenceNamePlaceholder: "CUS-0001, POL-0005 vb.",
    justification: "Is gerekcesi",
    justificationPlaceholder: "Neden acil erisim gerektigini acikca yazin (min 20 karakter)",
    justificationHint: "Minimum 20 karakter:",
    submit: "Talebi Gonder",
    submitting: "Gonderiliyor",
    clear: "Temizle",
    validate: "Erisimi Dogrula",
    validating: "Dogrulaniyor",
    submitSuccessTitle: "Talep alindi",
    requiredJustification: "Gerekce en az 20 karakter olmalidir.",
    unknownError: "Beklenmeyen bir hata olustu.",
    defaultSuccess: "Talebiniz onay sirasina alindi.",
    customerData: "Musteri Verisi",
    customerFinancials: "Musteri Finansallari",
    systemAdmin: "Sistem Yonetimi",
    reportingOverride: "Raporlama Istisnasi",
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

const accessTypeOptions = computed(() => [
  { value: "customer_data", label: t("customerData") },
  { value: "customer_financials", label: t("customerFinancials") },
  { value: "system_admin", label: t("systemAdmin") },
  { value: "reporting_override", label: t("reportingOverride") },
]);

const form = reactive({
  accessType: "customer_data",
  justification: "",
  referenceDoctype: "",
  referenceName: "",
});

const validation = reactive({
  accessType: "customer_data",
  referenceDoctype: "",
  referenceName: "",
});

const requestCount = ref(0);
const submitting = ref(false);
const validating = ref(false);
const submitError = ref("");
const submitResult = ref("");
const validationMessage = ref("");
const validationOk = ref(false);

const requestCountLabel = computed(() => String(requestCount.value));

async function submitRequest() {
  submitError.value = "";
  submitResult.value = "";

  if (form.justification.trim().length < 20) {
    submitError.value = t("requiredJustification");
    return;
  }

  submitting.value = true;
  try {
    const payload = await frappeRequest({
      url: "/api/method/acentem_takipte.acentem_takipte.api.break_glass.create_request",
      method: "POST",
      params: {
        access_type: form.accessType,
        justification: form.justification.trim(),
        reference_doctype: form.referenceDoctype.trim(),
        reference_name: form.referenceName.trim(),
      },
    });

    const message = payload?.message || payload || {};
    if (message?.ok === false) {
      submitError.value = String(message.error || t("unknownError"));
      return;
    }

    requestCount.value += 1;
    submitResult.value = String(message?.message || t("defaultSuccess"));
    form.justification = "";
  } catch (error) {
    submitError.value = String(error?.message || error || t("unknownError"));
  } finally {
    submitting.value = false;
  }
}

function resetForm() {
  form.accessType = "customer_data";
  form.justification = "";
  form.referenceDoctype = "";
  form.referenceName = "";
  submitError.value = "";
  submitResult.value = "";
}

async function validateAccess() {
  validating.value = true;
  validationMessage.value = "";
  validationOk.value = false;
  try {
    const payload = await frappeRequest({
      url: "/api/method/acentem_takipte.acentem_takipte.api.break_glass.validate_access",
      method: "POST",
      params: {
        access_type: validation.accessType,
        reference_doctype: validation.referenceDoctype.trim(),
        reference_name: validation.referenceName.trim(),
      },
    });

    const message = payload?.message || payload || {};
    validationOk.value = Boolean(message?.is_valid);
    validationMessage.value = String(message?.message || t("unknownError"));
  } catch (error) {
    validationOk.value = false;
    validationMessage.value = String(error?.message || error || t("unknownError"));
  } finally {
    validating.value = false;
  }
}
</script>
