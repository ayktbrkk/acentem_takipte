import { computed, onBeforeUnmount, reactive, ref, unref, watch } from "vue";

import { deskActionsEnabled } from "../utils/deskActions";
import { getCustomerOptionLabel } from "../utils/customerOptions";
import { buildQuickCreateIntentQuery } from "../utils/quickRouteIntent";
import { getLocalizedText, getQuickCreateConfig } from "../config/quickCreate";

export function useCustomerDetailActions({
  props,
  t,
  activeLocale,
  router,
  customer,
  customer360Payload,
  customer360Resource,
  customerProfileUpdateResource,
  customerRelationDeleteResource,
  insuredAssetDeleteResource,
  reminderUpdateResource,
  auxQuickCustomerResource,
  auxQuickPolicyResource,
}) {

  const customerRelationEyebrow = computed(
    () =>
      getLocalizedText(getQuickCreateConfig("customer_relation")?.title, activeLocale.value) ||
      t("newRelation")
  );
  const insuredAssetEyebrow = computed(
    () =>
      getLocalizedText(getQuickCreateConfig("insured_asset")?.title, activeLocale.value) ||
      t("newAsset")
  );
  const customerRelationEditEyebrow = computed(
    () =>
      getLocalizedText(getQuickCreateConfig("customer_relation_edit")?.title, activeLocale.value) ||
      t("editRelation")
  );
  const insuredAssetEditEyebrow = computed(
    () =>
      getLocalizedText(getQuickCreateConfig("insured_asset_edit")?.title, activeLocale.value) ||
      t("editAsset")
  );
  const ownershipAssignmentEyebrow = computed(
    () =>
      getLocalizedText(getQuickCreateConfig("ownership_assignment")?.title, activeLocale.value) ||
      t("newAssignment")
  );
  const ownershipAssignmentEditEyebrow = computed(
    () =>
      getLocalizedText(getQuickCreateConfig("ownership_assignment_edit")?.title, activeLocale.value) ||
      t("editAssignment")
  );

  const profileEditMode = ref(false);
  const profileSaveError = ref("");
  const profileSaveMessage = ref("");
  const showCustomerRelationDialog = ref(false);
  const showInsuredAssetDialog = ref(false);
  const showCustomerRelationEditDialog = ref(false);
  const showInsuredAssetEditDialog = ref(false);
  const showOwnershipAssignmentDialog = ref(false);
  const showOwnershipAssignmentEditDialog = ref(false);
  const editingCustomerRelation = ref(null);
  const editingInsuredAsset = ref(null);
  const editingOwnershipAssignment = ref(null);
  let profileFlashTimer = null;

  const profileFormErrors = reactive({
    full_name: "",
    birth_date: "",
    phone: "",
    email: "",
  });
  const profileForm = reactive({
    full_name: "",
    birth_date: "",
    gender: "Unknown",
    marital_status: "Unknown",
    occupation: "",
    phone: "",
    assigned_agent: "",
    email: "",
    address: "",
    consent_status: "Unknown",
  });

  const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
  const customerTypeValue = computed(() => normalizeCustomerType(customer.value.customer_type, customer.value.tax_id));
  const isCorporateCustomer = computed(() => customerTypeValue.value === "Corporate");
  const customerTypeLabel = computed(() => (isCorporateCustomer.value ? t("customerTypeCorporate") : t("customerTypeIndividual")));
  const customerTaxIdLabel = computed(() => (isCorporateCustomer.value ? t("taxNumber") : t("nationalId")));
  const customerTaxIdDisplay = computed(() => customer.value.tax_id || customer.value.masked_tax_id || "-");
  const customerPhoneDisplay = computed(() => customer.value.phone || customer.value.masked_phone || "-");
  const genderLabel = computed(() => normalizeGender(customer.value.gender, t));
  const maritalStatusLabel = computed(() => normalizeMaritalStatus(customer.value.marital_status, t));
  const consentStatusLabel = computed(() => normalizeConsentStatus(customer.value.consent_status, t));

  const genderOptions = computed(() => [
    { value: "Unknown", label: t("genderUnknown") },
    { value: "Male", label: t("genderMale") },
    { value: "Female", label: t("genderFemale") },
    { value: "Other", label: t("genderOther") },
  ]);
  const maritalStatusOptions = computed(() => [
    { value: "Unknown", label: t("maritalUnknown") },
    { value: "Single", label: t("maritalSingle") },
    { value: "Married", label: t("maritalMarried") },
    { value: "Divorced", label: t("maritalDivorced") },
    { value: "Widowed", label: t("maritalWidowed") },
  ]);
  const consentStatusOptions = computed(() => [
    { value: "Unknown", label: t("consentUnknown") },
    { value: "Granted", label: t("consentGranted") },
    { value: "Revoked", label: t("consentRevoked") },
  ]);

  const activePolicies = computed(() =>
    (customer360Payload.value?.portfolio?.policies || []).filter(
      (policy) => String(policy.status || "").toUpperCase() !== "IPT"
    )
  );

  const customer360QuickOptionsMap = computed(() => ({
    customers: resourceListToOptions(auxQuickCustomerResource, (row) => getCustomerOptionLabel(row)),
    policies: resourceListToOptions(auxQuickPolicyResource, (row) =>
      `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`
    ),
  }));

  const customer360QuickSuccessHandlers = {
    "customer-relations-list": async () => {
      await loadCustomer360();
    },
    "insured-assets-list": async () => {
      await loadCustomer360();
    },
    "ownership-assignments-list": async () => {
      await loadCustomer360();
    },
  };

  function resourceListToOptions(resource, labelFactory) {
    return asArray(unref(resource?.data)).map((row) => ({
      value: row.name,
      label: labelFactory(row),
    }));
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeGender(value, labelFn) {
    const normalized = String(value || "Unknown");
    if (normalized === "Male") return labelFn("genderMale");
    if (normalized === "Female") return labelFn("genderFemale");
    if (normalized === "Other") return labelFn("genderOther");
    return labelFn("genderUnknown");
  }

  function normalizeMaritalStatus(value, labelFn) {
    const normalized = String(value || "Unknown");
    if (normalized === "Single") return labelFn("maritalSingle");
    if (normalized === "Married") return labelFn("maritalMarried");
    if (normalized === "Divorced") return labelFn("maritalDivorced");
    if (normalized === "Widowed") return labelFn("maritalWidowed");
    return labelFn("maritalUnknown");
  }

  function normalizeConsentStatus(value, labelFn) {
    const normalized = String(value || "Unknown");
    if (normalized === "Granted") return labelFn("consentGranted");
    if (normalized === "Revoked") return labelFn("consentRevoked");
    return labelFn("consentUnknown");
  }

  function normalizeIdentityNumber(value) {
    return String(value || "").replace(/[^0-9]/g, "");
  }

  function normalizeCustomerType(value, identityNumber = "") {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "corporate" || normalized === "kurumsal") return "Corporate";
    if (normalized === "individual" || normalized === "bireysel") return "Individual";
    if (normalizeIdentityNumber(identityNumber).length === 10) return "Corporate";
    return "Individual";
  }

  function clearProfileFlashTimer() {
    if (profileFlashTimer) {
      window.clearTimeout(profileFlashTimer);
      profileFlashTimer = null;
    }
  }

  function clearProfileFormErrors() {
    profileFormErrors.full_name = "";
    profileFormErrors.birth_date = "";
    profileFormErrors.phone = "";
    profileFormErrors.email = "";
  }

  function validateProfileForm() {
    clearProfileFormErrors();
    let valid = true;
    if (!String(profileForm.full_name || "").trim()) {
      profileFormErrors.full_name = t("validationFullNameRequired");
      valid = false;
    }
    const birth = String(profileForm.birth_date || "").trim();
    if (!isCorporateCustomer.value && birth) {
      const birthDate = new Date(birth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(birthDate.getTime()) || birthDate > today) {
        profileFormErrors.birth_date = t("validationBirthDateFuture");
        valid = false;
      }
    }
    const email = String(profileForm.email || "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      profileFormErrors.email = t("validationEmailInvalid");
      valid = false;
    }
    const phone = String(profileForm.phone || "").trim();
    if (phone && phone.length < 7) {
      profileFormErrors.phone = t("validationPhoneInvalid");
      valid = false;
    }
    return valid;
  }

  function scheduleProfileFlashClear() {
    clearProfileFlashTimer();
    profileFlashTimer = window.setTimeout(() => {
      profileSaveError.value = "";
      profileSaveMessage.value = "";
      profileFlashTimer = null;
    }, 3500);
  }

  function syncProfileFormFromCustomer() {
    profileForm.full_name = String(customer.value.full_name || "");
    profileForm.birth_date = isCorporateCustomer.value ? "" : customer.value.birth_date ? String(customer.value.birth_date) : "";
    profileForm.gender = isCorporateCustomer.value ? "Unknown" : String(customer.value.gender || "Unknown") || "Unknown";
    profileForm.marital_status = isCorporateCustomer.value ? "Unknown" : String(customer.value.marital_status || "Unknown") || "Unknown";
    profileForm.occupation = isCorporateCustomer.value ? "" : String(customer.value.occupation || "");
    profileForm.phone = String(customer.value.phone || customer.value.masked_phone || "");
    profileForm.assigned_agent = String(customer.value.assigned_agent || "");
    profileForm.email = String(customer.value.email || "");
    profileForm.address = String(customer.value.address || "");
    profileForm.consent_status = String(customer.value.consent_status || "Unknown") || "Unknown";
  }

  function setProfileField(fieldName, value) {
    if (!fieldName) return;
    profileForm[fieldName] = String(value ?? "").trim();
  }

  function startProfileEdit() {
    clearProfileFlashTimer();
    clearProfileFormErrors();
    syncProfileFormFromCustomer();
    profileSaveError.value = "";
    profileSaveMessage.value = "";
    profileEditMode.value = true;
  }

  function cancelProfileEdit() {
    clearProfileFlashTimer();
    clearProfileFormErrors();
    profileEditMode.value = false;
    profileSaveError.value = "";
    profileSaveMessage.value = "";
    syncProfileFormFromCustomer();
  }

  async function saveProfile() {
    if (!props.name) return;
    clearProfileFlashTimer();
    if (!validateProfileForm()) {
      profileSaveError.value = "";
      profileSaveMessage.value = "";
      return;
    }
    profileSaveError.value = "";
    profileSaveMessage.value = "";
    try {
      const result = await customerProfileUpdateResource.submit({
        name: props.name,
        values: {
          full_name: profileForm.full_name,
          birth_date: isCorporateCustomer.value ? null : profileForm.birth_date || null,
          gender: isCorporateCustomer.value ? "Unknown" : profileForm.gender || "Unknown",
          marital_status: isCorporateCustomer.value ? "Unknown" : profileForm.marital_status || "Unknown",
          occupation: isCorporateCustomer.value ? null : profileForm.occupation,
          phone: profileForm.phone || null,
          assigned_agent: profileForm.assigned_agent || null,
          email: profileForm.email,
          address: profileForm.address,
          consent_status: profileForm.consent_status || "Unknown",
        },
      });
      if (result && typeof result === "object") {
        customer360Resource.setData({
          ...(customer360Resource.data?.value || {}),
          customer: {
            ...(customer.value || {}),
            ...result,
          },
        });
      }
      // Keep server as source of truth, but do not fail UX if refresh request is delayed.
      await loadCustomer360().catch(() => {});
      profileEditMode.value = false;
      profileSaveMessage.value = t("saveProfileSuccess");
      syncProfileFormFromCustomer();
      scheduleProfileFlashClear();
    } catch (error) {
      profileSaveError.value = parseProfileSaveError(error) || t("saveProfileError");
      scheduleProfileFlashClear();
    }
  }

  function parseProfileSaveError(error) {
    const serverMessage =
      error?._server_messages ||
      error?.messages?.[0] ||
      error?.response?._server_messages ||
      error?.response?.message ||
      error?.message;
    if (!serverMessage) return "";
    try {
      const parsed = typeof serverMessage === "string" ? JSON.parse(serverMessage) : serverMessage;
      if (Array.isArray(parsed) && parsed.length) {
        return String(parsed[0]).replace(/<[^>]*>/g, "").trim();
      }
    } catch {
      return String(serverMessage).replace(/<[^>]*>/g, "").trim();
    }
    return "";
  }

  async function loadCustomer360() {
    if (!props.name) return;
    await customer360Resource.reload({ name: props.name });
    syncProfileFormFromCustomer();
  }

  function openPolicyDetail(policyName) {
    router.push({ name: "policy-detail", params: { name: policyName } });
  }

  function openCustomerDesk() {
    if (!props.name) return;
    window.location.assign(`/app/at-customer/${encodeURIComponent(props.name)}`);
  }

  function openQuickOfferForCustomer() {
    if (!props.name) return;
    router.push({
      name: "offer-board",
      query: buildQuickCreateIntentQuery({
        prefills: {
          customer: props.name,
          customer_label: String(customer.value.full_name || props.name),
        },
        returnTo: router.currentRoute.value?.fullPath || "",
      }),
    });
  }

  function openCommunicationCenterForCustomer() {
    if (!props.name) return;
    router.push({
      name: "communication-center",
      query: {
        customer: props.name,
        customer_label: String(customer.value.full_name || props.name),
        return_to: router.currentRoute.value?.fullPath || "",
      },
    });
  }

  function openCustomerDocuments() {
    if (!props.name) return;
    router.push({
      name: "at-documents-list",
      query: {
        reference_doctype: "AT Customer",
        reference_name: props.name,
      },
    });
  }

  function openCustomerRelations() {
    router.push({ name: "customer-relations-list", query: { customer: props.name || "" } });
  }

  function openInsuredAssets() {
    router.push({ name: "insured-assets-list", query: { customer: props.name || "" } });
  }

  function openQuickCustomerRelation() {
    showCustomerRelationDialog.value = true;
  }

  function openQuickInsuredAsset() {
    showInsuredAssetDialog.value = true;
  }

  function openQuickOwnershipAssignment() {
    showOwnershipAssignmentDialog.value = true;
  }

  function openEditCustomerRelation(relation) {
    editingCustomerRelation.value = relation || null;
    showCustomerRelationEditDialog.value = true;
  }

  function openEditInsuredAsset(asset) {
    editingInsuredAsset.value = asset || null;
    showInsuredAssetEditDialog.value = true;
  }

  function openEditOwnershipAssignment(assignment) {
    editingOwnershipAssignment.value = assignment || null;
    showOwnershipAssignmentEditDialog.value = true;
  }

  async function deleteCustomerRelation(relation) {
    if (!relation?.name) return;
    if (!globalThis.confirm?.(t("deleteRelationConfirm"))) return;
    await customerRelationDeleteResource.submit({ doctype: "AT Customer Relation", name: relation.name });
    await loadCustomer360();
  }

  async function deleteInsuredAsset(asset) {
    if (!asset?.name) return;
    if (!globalThis.confirm?.(t("deleteAssetConfirm"))) return;
    await insuredAssetDeleteResource.submit({ doctype: "AT Insured Asset", name: asset.name });
    await loadCustomer360();
  }

  async function deleteOwnershipAssignment(assignment) {
    if (!assignment?.name) return;
    if (!globalThis.confirm?.(t("deleteAssignmentConfirm"))) return;
    await customerRelationDeleteResource.submit({ doctype: "AT Ownership Assignment", name: assignment.name });
    await loadCustomer360();
  }

  async function updateReminderStatus(reminder, status) {
    if (!reminder?.name) return;
    await reminderUpdateResource.submit({
      doctype: "AT Reminder",
      name: reminder.name,
      data: { status },
    });
    await loadCustomer360();
  }

  async function updateOwnershipAssignmentStatus(assignment, status) {
    if (!assignment?.name) return;
    await reminderUpdateResource.submit({
      doctype: "AT Ownership Assignment",
      name: assignment.name,
      data: { status },
    });
    await loadCustomer360();
  }

  async function markReminderDone(reminder) {
    await updateReminderStatus(reminder, "Done");
  }

  async function cancelReminder(reminder) {
    await updateReminderStatus(reminder, "Cancelled");
  }

  async function markAssignmentInProgress(assignment) {
    await updateOwnershipAssignmentStatus(assignment, "In Progress");
  }

  async function markAssignmentBlocked(assignment) {
    await updateOwnershipAssignmentStatus(assignment, "Blocked");
  }

  async function markAssignmentDone(assignment) {
    await updateOwnershipAssignmentStatus(assignment, "Done");
  }

  async function ensureCustomer360QuickOptionSources() {
    await Promise.allSettled([
      auxQuickCustomerResource.reload({
        doctype: "AT Customer",
        fields: ["name", "full_name"],
        order_by: "modified desc",
        limit_page_length: 200,
      }),
      auxQuickPolicyResource.reload({
        doctype: "AT Policy",
        fields: ["name", "policy_no", "customer"],
        filters: props.name ? { customer: props.name } : {},
        order_by: "modified desc",
        limit_page_length: 200,
      }),
    ]);
  }

  async function prepareCustomerRelationDialog({ form }) {
    await ensureCustomer360QuickOptionSources();
    if (!form.customer) form.customer = props.name || "";
  }

  async function prepareInsuredAssetDialog({ form }) {
    await ensureCustomer360QuickOptionSources();
    if (!form.customer) form.customer = props.name || "";
    if (!form.policy && activePolicies.value[0]?.name) form.policy = activePolicies.value[0].name;
  }

  async function prepareOwnershipAssignmentDialog({ form }) {
    await ensureCustomer360QuickOptionSources();
    if (!form.source_doctype) form.source_doctype = "AT Customer";
    if (!form.source_name) form.source_name = props.name || "";
    if (!form.customer) form.customer = props.name || "";
  }

  async function prepareCustomerRelationEditDialog({ resetForm }) {
    await ensureCustomer360QuickOptionSources();
    const relation = editingCustomerRelation.value || {};
    resetForm({
      doctype: "AT Customer Relation",
      name: relation.name || "",
      customer: relation.customer || props.name || "",
      related_customer: relation.related_customer || "",
      relation_type: relation.relation_type || "Other",
      is_household: Boolean(relation.is_household),
      notes: relation.notes || "",
    });
  }

  async function prepareInsuredAssetEditDialog({ resetForm }) {
    await ensureCustomer360QuickOptionSources();
    const asset = editingInsuredAsset.value || {};
    resetForm({
      doctype: "AT Insured Asset",
      name: asset.name || "",
      customer: asset.customer || props.name || "",
      policy: asset.policy || "",
      asset_type: asset.asset_type || "Other",
      asset_label: asset.asset_label || asset.policy_no || asset.policy || "",
      asset_identifier: asset.asset_identifier || asset.insurance_company || "",
      notes: asset.notes || "",
    });
  }

  async function prepareOwnershipAssignmentEditDialog({ resetForm }) {
    await ensureCustomer360QuickOptionSources();
    const assignment = editingOwnershipAssignment.value || {};
    resetForm({
      doctype: "AT Ownership Assignment",
      name: assignment.name || "",
      source_doctype: assignment.source_doctype || "AT Customer",
      source_name: assignment.source_name || props.name || "",
      customer: assignment.customer || props.name || "",
      policy: assignment.policy || "",
      assigned_to: assignment.assigned_to || "",
      assignment_role: assignment.assignment_role || "Owner",
      status: assignment.status || "Open",
      priority: assignment.priority || "Normal",
      due_date: assignment.due_date || "",
      notes: assignment.notes || "",
    });
  }

  watch(
    () => props.name,
    () => {
      clearProfileFlashTimer();
      clearProfileFormErrors();
      profileEditMode.value = false;
      profileSaveError.value = "";
      profileSaveMessage.value = "";
      loadCustomer360();
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    clearProfileFlashTimer();
  });

  return {
    router,
    customerRelationEyebrow,
    insuredAssetEyebrow,
    customerRelationEditEyebrow,
    insuredAssetEditEyebrow,
    ownershipAssignmentEyebrow,
    ownershipAssignmentEditEyebrow,
    customerProfileUpdateResource,
    customerRelationDeleteResource,
    insuredAssetDeleteResource,
    reminderUpdateResource,
    profileEditMode,
    profileSaveError,
    profileSaveMessage,
    showCustomerRelationDialog,
    showInsuredAssetDialog,
    showCustomerRelationEditDialog,
    showInsuredAssetEditDialog,
    showOwnershipAssignmentDialog,
    showOwnershipAssignmentEditDialog,
    editingCustomerRelation,
    editingInsuredAsset,
    editingOwnershipAssignment,
    profileFormErrors,
    profileForm,
    localeCode,
    customerTypeValue,
    isCorporateCustomer,
    customerTypeLabel,
    customerTaxIdLabel,
    customerTaxIdDisplay,
    customerPhoneDisplay,
    genderLabel,
    maritalStatusLabel,
    consentStatusLabel,
    genderOptions,
    maritalStatusOptions,
    consentStatusOptions,
    customer360QuickOptionsMap,
    customer360QuickSuccessHandlers,
    clearProfileFlashTimer,
    clearProfileFormErrors,
    validateProfileForm,
    scheduleProfileFlashClear,
    syncProfileFormFromCustomer,
    setProfileField,
    startProfileEdit,
    cancelProfileEdit,
    saveProfile,
    parseProfileSaveError,
    loadCustomer360,
    openPolicyDetail,
    openCustomerDesk,
    openQuickOfferForCustomer,
    openCommunicationCenterForCustomer,
    openCustomerDocuments,
    openCustomerRelations,
    openInsuredAssets,
    openQuickCustomerRelation,
    openQuickInsuredAsset,
    openQuickOwnershipAssignment,
    openEditCustomerRelation,
    openEditInsuredAsset,
    openEditOwnershipAssignment,
    deleteCustomerRelation,
    deleteInsuredAsset,
    deleteOwnershipAssignment,
    updateReminderStatus,
    updateOwnershipAssignmentStatus,
    markReminderDone,
    cancelReminder,
    markAssignmentInProgress,
    markAssignmentBlocked,
    markAssignmentDone,
    ensureCustomer360QuickOptionSources,
    prepareCustomerRelationDialog,
    prepareInsuredAssetDialog,
    prepareOwnershipAssignmentDialog,
    prepareCustomerRelationEditDialog,
    prepareInsuredAssetEditDialog,
    prepareOwnershipAssignmentEditDialog,
    deskActionsEnabled,
  };
}
