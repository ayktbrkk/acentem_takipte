function cstr(value) {
  return String(value ?? "").trim();
}

function buildLeadDialogError(locale, fallbackTr, fallbackEn) {
  return locale === "tr" ? fallbackTr : fallbackEn;
}

export function useDashboardLeadSubmission({
  activeLocale,
  createLeadResource,
  isSubmitting,
  leadDialogError,
  leadDialogFieldErrors,
  newLead,
  normalizeCustomerType,
  normalizeIdentityNumber,
  resetLeadForm,
  showLeadDialog,
  triggerDashboardReload,
  t,
  isValidTckn,
}) {
  async function createLead() {
    try {
      leadDialogError.value = "";
      Object.keys(leadDialogFieldErrors).forEach((key) => delete leadDialogFieldErrors[key]);

      const selectedCustomer = cstr(newLead.customer);
      const shouldCreateCustomer = !selectedCustomer && Boolean(newLead.createCustomerMode);
      const fullName = cstr(newLead.queryText);
      const customerType = normalizeCustomerType(newLead.customer_type, newLead.tax_id);
      const identityNumber = normalizeIdentityNumber(newLead.tax_id);

      if (!selectedCustomer && !shouldCreateCustomer) {
        leadDialogFieldErrors.customer = buildLeadDialogError(
          activeLocale.value,
          "Bir müşteri seçin veya yeni müşteri ekleyin.",
          "Select a customer or add a new customer."
        );
        leadDialogError.value = buildLeadDialogError(
          activeLocale.value,
          "Müşteri alanını tamamlayın.",
          "Complete the customer section."
        );
        return;
      }

      if (shouldCreateCustomer && !fullName) {
        leadDialogFieldErrors.customer = buildLeadDialogError(
          activeLocale.value,
          "Yeni müşteri adı gerekli.",
          "New customer name is required."
        );
        leadDialogError.value = buildLeadDialogError(
          activeLocale.value,
          "Müşteri alanını tamamlayın.",
          "Complete the customer section."
        );
        return;
      }

      if (shouldCreateCustomer) {
        if (customerType === "Corporate") {
          if (identityNumber.length !== 10) {
            leadDialogFieldErrors.tax_id = t("validationTaxNumberLength");
            leadDialogError.value = t("validationTaxNumberLength");
            return;
          }
        } else if (identityNumber.length !== 11) {
          leadDialogFieldErrors.tax_id = t("validationTcLength");
          leadDialogError.value = t("validationTcLength");
          return;
        } else if (!isValidTckn(identityNumber)) {
          leadDialogFieldErrors.tax_id = t("validationTcInvalid");
          leadDialogError.value = t("validationTcInvalid");
          return;
        }
      }

      isSubmitting.value = true;
      await createLeadResource.submit({
        full_name: fullName || null,
        customer: selectedCustomer || null,
        customer_type: shouldCreateCustomer ? customerType : null,
        tax_id: shouldCreateCustomer ? identityNumber : null,
        phone: shouldCreateCustomer ? newLead.phone : null,
        email: shouldCreateCustomer ? newLead.email : null,
        estimated_gross_premium: Number(newLead.estimated_gross_premium || 0),
        notes: newLead.notes,
        status: "Open",
      });
      showLeadDialog.value = false;
      resetLeadForm();
      triggerDashboardReload({ immediate: true });
    } catch (error) {
      leadDialogError.value = error?.messages?.join(" ") || error?.message || t("loadError");
    } finally {
      isSubmitting.value = false;
    }
  }

  return {
    createLead,
  };
}
