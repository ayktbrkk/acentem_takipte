import { computed, ref } from "vue";

export function useAccessRequestForm(props, emit) {
  const formData = ref({
    request_kind: "access",
    justification: "",
  });

  const isSubmitting = ref(false);
  const formError = ref("");
  const showSuccess = ref(false);

  const isFormValid = computed(() => {
    return (
      formData.value.request_kind &&
      formData.value.justification.length >= 10 &&
      formData.value.justification.length <= 500
    );
  });

  async function submitAccessRequest() {
    if (!isFormValid.value) return;

    isSubmitting.value = true;
    formError.value = "";

    try {
      const response = await fetch("/api/method/create_customer_access_request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Frappe-CSRF-Token": window?.frappe?.csrf_token || "",
        },
        body: JSON.stringify({
          customer_name: props.customerName,
          justification: formData.value.justification,
          request_kind: formData.value.request_kind,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        formError.value = errorData.message || "Failed to submit request. Please try again.";
        return;
      }

      showSuccess.value = true;
      emit("submitted", formData.value.request_kind);

      setTimeout(() => {
        emit("closed");
      }, 2000);
    } catch (error) {
      formError.value = `Error submitting request: ${error instanceof Error ? error.message : "Unknown error"}`;
    } finally {
      isSubmitting.value = false;
    }
  }

  return {
    formData,
    isSubmitting,
    formError,
    showSuccess,
    isFormValid,
    submitAccessRequest,
  };
}
