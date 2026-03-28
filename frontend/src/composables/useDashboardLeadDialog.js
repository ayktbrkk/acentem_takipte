export function useDashboardLeadDialog({
  leadDialogError,
  leadDialogFieldErrors,
  newLead,
  showLeadDialog,
}) {
  function resetLeadForm() {
    leadDialogError.value = "";
    Object.keys(leadDialogFieldErrors).forEach((key) => delete leadDialogFieldErrors[key]);
    newLead.customer = "";
    newLead.queryText = "";
    newLead.customerOption = null;
    newLead.createCustomerMode = false;
    newLead.customer_type = "Individual";
    newLead.tax_id = "";
    newLead.phone = "";
    newLead.email = "";
    newLead.estimated_gross_premium = "";
    newLead.notes = "";
  }

  function openLeadDialog() {
    resetLeadForm();
    showLeadDialog.value = true;
  }

  return {
    openLeadDialog,
    resetLeadForm,
  };
}
