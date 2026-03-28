import { describe, expect, it, vi } from "vitest";
import { reactive, ref } from "vue";

import { useDashboardLeadSubmission } from "./useDashboardLeadSubmission";

function buildSubject(overrides = {}) {
  const leadDialogError = ref("");
  const leadDialogFieldErrors = reactive({});
  const newLead = reactive({
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
    ...overrides.newLead,
  });
  const showLeadDialog = ref(true);
  const isSubmitting = ref(false);
  const createLeadResource = {
    submit: vi.fn(async () => ({})),
  };
  const resetLeadForm = vi.fn();
  const triggerDashboardReload = vi.fn();
  const activeLocale = ref(overrides.locale || "en");

  const { createLead } = useDashboardLeadSubmission({
    activeLocale,
    createLeadResource,
    isSubmitting,
    leadDialogError,
    leadDialogFieldErrors,
    newLead,
    normalizeCustomerType: overrides.normalizeCustomerType || ((value) => value || "Individual"),
    normalizeIdentityNumber: overrides.normalizeIdentityNumber || ((value) => String(value || "").trim()),
    resetLeadForm,
    showLeadDialog,
    triggerDashboardReload,
    t: overrides.t || ((key) => key),
    isValidTckn: overrides.isValidTckn || (() => true),
  });

  return {
    activeLocale,
    createLead,
    createLeadResource,
    isSubmitting,
    leadDialogError,
    leadDialogFieldErrors,
    newLead,
    resetLeadForm,
    showLeadDialog,
    triggerDashboardReload,
  };
}

describe("useDashboardLeadSubmission", () => {
  it("blocks submit when no customer is selected or created", async () => {
    const subject = buildSubject();

    await subject.createLead();

    expect(subject.createLeadResource.submit).not.toHaveBeenCalled();
    expect(subject.leadDialogFieldErrors.customer).toBe("Select a customer or add a new customer.");
    expect(subject.leadDialogError.value).toBe("Complete the customer section.");
    expect(subject.showLeadDialog.value).toBe(true);
  });

  it("validates individual tax id before submit", async () => {
    const subject = buildSubject({
      newLead: {
        customer: "",
        createCustomerMode: true,
        queryText: "Jane Doe",
        tax_id: "123",
        customer_type: "Individual",
      },
      isValidTckn: () => false,
    });

    await subject.createLead();

    expect(subject.createLeadResource.submit).not.toHaveBeenCalled();
    expect(subject.leadDialogFieldErrors.tax_id).toBe("validationTcLength");
    expect(subject.leadDialogError.value).toBe("validationTcLength");
    expect(subject.showLeadDialog.value).toBe(true);
  });

  it("submits, resets and reloads on success", async () => {
    const submit = vi.fn(async () => ({}));
    const resetLeadForm = vi.fn();
    const triggerDashboardReload = vi.fn();
    const subject = buildSubject({
      newLead: {
        customer: "CUST-001",
        createCustomerMode: false,
        queryText: "Existing Customer",
        estimated_gross_premium: "1250.5",
        notes: "Follow up",
      },
    });
    subject.createLeadResource.submit = submit;
    subject.resetLeadForm = resetLeadForm;
    subject.triggerDashboardReload = triggerDashboardReload;

    const { createLead } = useDashboardLeadSubmission({
      activeLocale: subject.activeLocale,
      createLeadResource: subject.createLeadResource,
      isSubmitting: subject.isSubmitting,
      leadDialogError: subject.leadDialogError,
      leadDialogFieldErrors: subject.leadDialogFieldErrors,
      newLead: subject.newLead,
      normalizeCustomerType: (value) => value || "Individual",
      normalizeIdentityNumber: (value) => String(value || "").trim(),
      resetLeadForm,
      showLeadDialog: subject.showLeadDialog,
      triggerDashboardReload,
      t: (key) => key,
      isValidTckn: () => true,
    });

    await createLead();

    expect(submit).toHaveBeenCalledWith({
      full_name: "Existing Customer",
      customer: "CUST-001",
      customer_type: null,
      tax_id: null,
      phone: null,
      email: null,
      estimated_gross_premium: 1250.5,
      notes: "Follow up",
      status: "Open",
    });
    expect(subject.showLeadDialog.value).toBe(false);
    expect(resetLeadForm).toHaveBeenCalledTimes(1);
    expect(triggerDashboardReload).toHaveBeenCalledWith({ immediate: true });
    expect(subject.isSubmitting.value).toBe(false);
  });
});
