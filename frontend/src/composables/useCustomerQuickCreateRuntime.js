import { computed, reactive, ref, watch } from "vue";
import { createResource } from "frappe-ui";

import { buildQuickCreateDraft, getQuickCreateConfig, getLocalizedText } from "../config/quickCreateRegistry";
import { getQuickCreateLabels } from "../utils/quickCreateCopy";
import { runQuickCreateSuccessTargets } from "../utils/quickCreateSuccess";
import { readQuickCreateIntent, stripQuickCreateIntentQuery } from "../utils/quickRouteIntent";
import { isValidTckn, normalizeCustomerType, normalizeIdentityNumber } from "../utils/customerIdentity";

const QUICK_OPTION_LIMIT = 2000;

export function useCustomerQuickCreateRuntime({
  t,
  activeLocale,
  router,
  route,
  branchStore,
  refreshCustomerList,
  openCustomer360,
}) {
  const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
  const quickCustomerConfig = getQuickCreateConfig("customer");
  const showQuickCustomerDialog = ref(false);
  const quickCustomerLoading = ref(false);
  const quickCustomerError = ref("");
  const quickCustomerFieldErrors = reactive({});
  const quickCustomerForm = reactive(buildQuickCreateDraft(quickCustomerConfig));
  const quickCustomerReturnTo = ref("");
  const quickCustomerOpenedFromIntent = ref(false);

  const quickCustomerCreateResource = createResource({ url: quickCustomerConfig.submitUrl, auto: false });

  const customerQuickFields = computed(() => quickCustomerConfig?.fields || []);
  const quickCustomerUi = computed(() => ({
    title: getLocalizedText(quickCustomerConfig?.title, activeLocale.value),
    subtitle: getLocalizedText(quickCustomerConfig?.subtitle, activeLocale.value),
    eyebrow: activeLocale.value === "tr" ? "Müşteri" : "Customer",
    newLabel: activeLocale.value === "tr" ? "Yeni Müşteri" : "New Customer",
  }));
  const quickCreateCommon = computed(() => ({
    ...getQuickCreateLabels("create", activeLocale.value),
    validation: activeLocale.value === "tr" ? "Lütfen gerekli alanları doldurun." : "Please fill required fields.",
    failed: activeLocale.value === "tr" ? "Hızlı müşteri oluşturma başarısız oldu." : "Quick customer create failed.",
  }));
  const quickCustomerType = computed(() => normalizeCustomerType(quickCustomerForm.customer_type, quickCustomerForm.tax_id));
  const isCorporateQuickCustomer = computed(() => quickCustomerType.value === "Corporate");
  const quickCustomerSuccessHandlers = {
    customer_list: refreshCustomerList,
  };

  function clearQuickCustomerFieldErrors() {
    Object.keys(quickCustomerFieldErrors).forEach((key) => delete quickCustomerFieldErrors[key]);
  }

  function resetQuickCustomerForm() {
    Object.assign(quickCustomerForm, buildQuickCreateDraft(quickCustomerConfig));
    quickCustomerError.value = "";
    clearQuickCustomerFieldErrors();
  }

  function openQuickCustomerDialog({ fromIntent = false, returnTo = "" } = {}) {
    resetQuickCustomerForm();
    quickCustomerOpenedFromIntent.value = !!fromIntent;
    quickCustomerReturnTo.value = returnTo || "";
    showQuickCustomerDialog.value = true;
  }

  function cancelQuickCustomerDialog() {
    showQuickCustomerDialog.value = false;
    if (quickCustomerOpenedFromIntent.value && quickCustomerReturnTo.value) {
      const target = quickCustomerReturnTo.value;
      quickCustomerOpenedFromIntent.value = false;
      quickCustomerReturnTo.value = "";
      router?.push?.(target).catch?.(() => {});
      return;
    }
    quickCustomerOpenedFromIntent.value = false;
    quickCustomerReturnTo.value = "";
  }

  function validateQuickCustomerForm() {
    clearQuickCustomerFieldErrors();
    quickCustomerError.value = "";
    let valid = true;
    for (const field of customerQuickFields.value) {
      const fieldDisabled =
        typeof field?.disabled === "function"
          ? field.disabled({ field, model: quickCustomerForm, locale: activeLocale.value })
          : Boolean(field?.disabled);
      if (field?.name !== "tax_id" && field?.name !== "customer_type" && fieldDisabled) continue;
      if (!field?.required) continue;
      if (String(quickCustomerForm[field.name] ?? "").trim() === "") {
        quickCustomerFieldErrors[field.name] = getLocalizedText(field.label, activeLocale.value);
        valid = false;
      }
    }

    const customerType = normalizeCustomerType(quickCustomerForm.customer_type, quickCustomerForm.tax_id);
    const identityNumber = normalizeIdentityNumber(quickCustomerForm.tax_id);
    if (!identityNumber) {
      quickCustomerFieldErrors.tax_id = t("validationIdentityRequired");
      valid = false;
    } else if (customerType === "Corporate") {
      if (identityNumber.length !== 10) {
        quickCustomerFieldErrors.tax_id = t("validationTaxNumberLength");
        valid = false;
      }
    } else if (identityNumber.length !== 11) {
      quickCustomerFieldErrors.tax_id = t("validationTcLength");
      valid = false;
    } else if (!isValidTckn(identityNumber)) {
      quickCustomerFieldErrors.tax_id = t("validationTcInvalid");
      valid = false;
    }

    const email = String(quickCustomerForm.email || "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      quickCustomerFieldErrors.email = activeLocale.value === "tr" ? "Geçerli e-posta girin." : "Enter a valid email.";
      valid = false;
    }
    const birthDate = String(quickCustomerForm.birth_date || "");
    if (!isCorporateQuickCustomer.value && birthDate) {
      const parsed = new Date(birthDate);
      if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
        quickCustomerFieldErrors.birth_date =
          activeLocale.value === "tr" ? "Doğum tarihi gelecekte olamaz." : "Birth date cannot be in the future.";
        valid = false;
      }
    }

    if (!valid) quickCustomerError.value = quickCreateCommon.value.validation;
    return valid;
  }

  function validateQuickCustomerManaged({ form, fieldErrors, setError }) {
    Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key]);
    let valid = true;
    const fields = customerQuickFields.value;

    for (const field of fields) {
      const fieldDisabled =
        typeof field?.disabled === "function"
          ? field.disabled({ field, model: form, locale: activeLocale.value })
          : Boolean(field?.disabled);
      if (field?.name !== "tax_id" && field?.name !== "customer_type" && fieldDisabled) continue;
      if (!field?.required) continue;
      if (String(form[field.name] ?? "").trim() === "") {
        fieldErrors[field.name] = getLocalizedText(field.label, activeLocale.value);
        valid = false;
      }
    }

    const customerType = normalizeCustomerType(form.customer_type, form.tax_id);
    const identityNumber = normalizeIdentityNumber(form.tax_id);
    if (!identityNumber) {
      fieldErrors.tax_id = t("validationIdentityRequired");
      valid = false;
    } else if (customerType === "Corporate") {
      if (identityNumber.length !== 10) {
        fieldErrors.tax_id = t("validationTaxNumberLength");
        valid = false;
      }
    } else if (identityNumber.length !== 11) {
      fieldErrors.tax_id = t("validationTcLength");
      valid = false;
    } else if (!isValidTckn(identityNumber)) {
      fieldErrors.tax_id = t("validationTcInvalid");
      valid = false;
    }

    const email = String(form.email || "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fieldErrors.email = activeLocale.value === "tr" ? "Geçerli e-posta girin." : "Enter a valid email.";
      valid = false;
    }
    const birthDate = String(form.birth_date || "");
    if (customerType !== "Corporate" && birthDate) {
      const parsed = new Date(birthDate);
      if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
        fieldErrors.birth_date =
          activeLocale.value === "tr" ? "Doğum tarihi gelecekte olamaz." : "Birth date cannot be in the future.";
        valid = false;
      }
    }

    if (!valid) setError(quickCreateCommon.value.validation);
    return valid;
  }

  function buildQuickCustomerPayload() {
    const payload = Object.fromEntries(
      Object.entries(quickCustomerForm).map(([key, value]) => [key, String(value ?? "").trim() === "" ? null : value])
    );
    payload.customer_type = normalizeCustomerType(payload.customer_type, payload.tax_id);
    payload.tax_id = normalizeIdentityNumber(payload.tax_id);
    if (payload.customer_type === "Corporate") {
      payload.birth_date = null;
      payload.gender = "Unknown";
      payload.marital_status = "Unknown";
      payload.occupation = null;
    }
    return payload;
  }

  function buildQuickCustomerManagedPayload({ form }) {
    const payload = Object.fromEntries(
      Object.entries(form || {}).map(([key, value]) => [key, String(value ?? "").trim() === "" ? null : value])
    );
    payload.customer_type = normalizeCustomerType(payload.customer_type, payload.tax_id);
    payload.tax_id = normalizeIdentityNumber(payload.tax_id);
    if (payload.customer_type === "Corporate") {
      payload.birth_date = null;
      payload.gender = "Unknown";
      payload.marital_status = "Unknown";
      payload.occupation = null;
    }
    return payload;
  }

  function onQuickCustomerManagedCreated() {
    quickCustomerOpenedFromIntent.value = false;
    quickCustomerReturnTo.value = "";
  }

  async function submitQuickCustomer(openAfter = false) {
    if (quickCustomerLoading.value) return;
    if (!validateQuickCustomerForm()) return;
    quickCustomerLoading.value = true;
    quickCustomerError.value = "";
    try {
      const result = await quickCustomerCreateResource.submit(buildQuickCustomerPayload());
      const customerName = result?.customer || quickCustomerCreateResource.data?.customer || null;
      showQuickCustomerDialog.value = false;
      resetQuickCustomerForm();
      await runQuickCreateSuccessTargets(quickCustomerConfig?.successRefreshTargets, quickCustomerSuccessHandlers);
      const returnTarget = quickCustomerOpenedFromIntent.value ? quickCustomerReturnTo.value : "";
      quickCustomerOpenedFromIntent.value = false;
      quickCustomerReturnTo.value = "";
      if (!openAfter && returnTarget) {
        router?.push?.(returnTarget).catch?.(() => {});
        return;
      }
      if (openAfter && customerName && typeof openCustomer360 === "function") openCustomer360(customerName);
    } catch (error) {
      quickCustomerError.value = error?.messages?.join(" ") || error?.message || quickCreateCommon.value.failed;
    } finally {
      quickCustomerLoading.value = false;
    }
  }

  function consumeQuickCustomerRouteIntent() {
    const intent = readQuickCreateIntent(route?.query || {});
    if (!intent.quick) return;
    openQuickCustomerDialog({ fromIntent: true, returnTo: intent.returnTo });
    const nextQuery = stripQuickCreateIntentQuery(route?.query || {});
    router?.replace?.({ name: "customer-list", query: nextQuery }).catch?.(() => {});
  }

  watch(
    () => quickCustomerType.value,
    (type) => {
      if (type !== "Corporate") return;
      quickCustomerForm.birth_date = "";
      quickCustomerForm.gender = "Unknown";
      quickCustomerForm.marital_status = "Unknown";
      quickCustomerForm.occupation = "";
    },
    { immediate: true }
  );

  watch(
    () => branchStore?.selected,
    () => {
      void refreshCustomerList?.();
    }
  );

  void consumeQuickCustomerRouteIntent();

  return {
    quickCustomerConfig,
    showQuickCustomerDialog,
    quickCustomerLoading,
    quickCustomerError,
    quickCustomerFieldErrors,
    quickCustomerForm,
    quickCustomerOpenedFromIntent,
    quickCustomerReturnTo,
    quickCustomerUi,
    quickCreateCommon,
    quickCustomerType,
    isCorporateQuickCustomer,
    customerQuickFields,
    quickCustomerSuccessHandlers,
    quickCustomerCreateResource,
    openQuickCustomerDialog,
    cancelQuickCustomerDialog,
    validateQuickCustomerForm,
    validateQuickCustomerManaged,
    buildQuickCustomerPayload,
    buildQuickCustomerManagedPayload,
    onQuickCustomerManagedCreated,
    submitQuickCustomer,
    consumeQuickCustomerRouteIntent,
    clearQuickCustomerFieldErrors,
    resetQuickCustomerForm,
  };
}
