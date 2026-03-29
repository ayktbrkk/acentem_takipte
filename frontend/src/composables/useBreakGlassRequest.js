import { computed, reactive, ref } from "vue";
import { frappeRequest } from "frappe-ui";

export function useBreakGlassRequest({ t }) {
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

  return {
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
  };
}
