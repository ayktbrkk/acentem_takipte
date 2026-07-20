import { reactive, ref } from "vue";

function createInitialLead() {
  return {
    customer: "",
    queryText: "",
    customerOption: null,
    createCustomerMode: false,
    customer_type: "Individual",
    tax_id: "",
    phone: "",
    email: "",
    estimated_gross_premium: "",
    notes: "",
  };
}

export function useDashboardLeadState() {
  const showLeadDialog = ref(false);
  const isSubmitting = ref(false);
  const leadDialogError = ref("");
  const leadDialogFieldErrors = reactive({});
  const newLead = reactive(createInitialLead());

  return {
    isSubmitting,
    leadDialogError,
    leadDialogFieldErrors,
    newLead,
    showLeadDialog,
  };
}
