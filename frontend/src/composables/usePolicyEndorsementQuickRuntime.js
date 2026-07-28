import { computed, reactive, ref, unref } from "vue";
import { createResource } from "frappe-ui";

const ENDORSEMENT_TYPES = [
  { value: "Premium Update", labelKey: "endorsement_premium_update" },
  { value: "Coverage Update", labelKey: "endorsement_coverage_update" },
  { value: "Date Update", labelKey: "endorsement_date_update" },
  { value: "Cancellation", labelKey: "endorsement_cancellation" },
  { value: "Other", labelKey: "endorsement_other" },
];

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function usePolicyEndorsementQuickRuntime({ policyName, t, onCreated, onSuccess }) {
  const form = reactive({
    endorsement_type: "Other",
    endorsement_date: todayISO(),
    net_premium: "",
    tax_amount: "",
    commission_amount: "",
    gross_premium: "",
    notes: "",
  });
  const fieldErrors = reactive({});
  const error = ref("");
  const editMode = ref(false);
  const editingName = ref("");

  const showFinancialFields = computed(() =>
    ["Premium Update", "Cancellation"].includes(form.endorsement_type)
  );

  const dialogTitle = computed(() =>
    editMode.value ? t("edit_endorsement_title") : t("endorsement_dialog_title")
  );

  const endorsementCreateResource = createResource({
    url: "acentem_takipte.acentem_takipte.domains.policies.services.quick_create.create_quick_endorsement",
    auto: false,
  });

  const endorsementUpdateResource = createResource({
    url: "acentem_takipte.acentem_takipte.domains.policies.services.quick_create.update_quick_endorsement",
    auto: false,
  });

  const loading = computed(() => endorsementCreateResource.loading || endorsementUpdateResource.loading);

  const typeOptions = computed(() =>
    ENDORSEMENT_TYPES.map((opt) => ({
      label: t(opt.labelKey),
      value: opt.value,
    }))
  );

  function validate() {
    Object.keys(fieldErrors).forEach((k) => delete fieldErrors[k]);
    if (!unref(policyName)) {
      fieldErrors.policy = t("endorsement_validation_policy_required");
      return false;
    }
    if (!form.endorsement_type) {
      fieldErrors.endorsement_type = t("endorsement_validation_type_required");
      return false;
    }
    if (!form.endorsement_date) {
      fieldErrors.endorsement_date = t("endorsement_validation_date_required");
      return false;
    }
    if (["Premium Update", "Cancellation"].includes(form.endorsement_type)) {
      const gross = Number(form.gross_premium || 0);
      if (gross <= 0) {
        fieldErrors.gross_premium = t("validation_gross_mismatch");
        return false;
      }
    }
    return true;
  }

  function resetForm() {
    editMode.value = false;
    editingName.value = "";
    error.value = "";
    form.endorsement_type = "Other";
    form.endorsement_date = todayISO();
    form.net_premium = "";
    form.tax_amount = "";
    form.commission_amount = "";
    form.gross_premium = "";
    form.notes = "";
    Object.keys(fieldErrors).forEach((k) => delete fieldErrors[k]);
  }

  function loadForEdit(endorsement) {
    if (!endorsement) return;
    editMode.value = true;
    editingName.value = endorsement.name || "";
    error.value = "";
    Object.keys(fieldErrors).forEach((k) => delete fieldErrors[k]);
    form.endorsement_type = endorsement.endorsement_type || "Other";
    form.endorsement_date = endorsement.endorsement_date || todayISO();
    form.notes = endorsement.notes || "";

    let payload = {};
    try {
      if (endorsement.change_payload) {
        payload = typeof endorsement.change_payload === "string"
          ? JSON.parse(endorsement.change_payload)
          : endorsement.change_payload;
      }
    } catch (_e) { /* ignore parse errors */ }

    form.net_premium = payload.net_premium != null ? String(payload.net_premium) : "";
    form.tax_amount = payload.tax_amount != null ? String(payload.tax_amount) : "";
    form.commission_amount = payload.commission_amount != null ? String(payload.commission_amount) : "";
    form.gross_premium = payload.gross_premium != null ? String(payload.gross_premium) : "";
  }

  async function submitEndorsement() {
    if (!validate()) return false;
    error.value = "";
    try {
      if (editMode.value) {
        await endorsementUpdateResource.submit({
          endorsement_name: editingName.value,
          endorsement_type: form.endorsement_type,
          endorsement_date: form.endorsement_date,
          net_premium: form.net_premium || 0,
          tax_amount: form.tax_amount || 0,
          commission_amount: form.commission_amount || 0,
          gross_premium: form.gross_premium || 0,
          notes: form.notes,
        });
        if (onSuccess) onSuccess(t("endorsement_edit_success"));
      } else {
        await endorsementCreateResource.submit({
          policy: unref(policyName),
          endorsement_type: form.endorsement_type,
          endorsement_date: form.endorsement_date,
          net_premium: form.net_premium || 0,
          tax_amount: form.tax_amount || 0,
          commission_amount: form.commission_amount || 0,
          gross_premium: form.gross_premium || 0,
          notes: form.notes,
        });
        if (onSuccess) onSuccess(t("endorsement_create_success"));
      }
      if (onCreated) await onCreated();
      return true;
    } catch (_err) {
      error.value = t("endorsement_create_failed");
      return false;
    }
  }

  return {
    form,
    fieldErrors,
    error,
    loading,
    typeOptions,
    showFinancialFields,
    editMode,
    dialogTitle,
    t,
    resetForm,
    loadForEdit,
    submitEndorsement,
  };
}
