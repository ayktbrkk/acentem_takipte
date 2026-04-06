import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { createResource } from "frappe-ui";

import { useBranchStore } from "../stores/branch";
import { getQuickCreateConfig, getLocalizedText, buildQuickCreateDraft } from "../config/quickCreateRegistry";
import { getQuickCreateEyebrow, getQuickCreateLabels } from "../utils/quickCreateCopy";
import { runQuickCreateSuccessTargets } from "../utils/quickCreateSuccess";
import { buildQuickCreateIntentQuery, readQuickCreateIntent, stripQuickCreateIntentQuery } from "../utils/quickRouteIntent";
import { buildRelatedQuickCreateNavigation } from "../utils/relatedQuickCreate";
import { isValidTckn, normalizeCustomerType, normalizeIdentityNumber } from "../utils/customerIdentity";
import { getCustomerOptionLabel } from "../utils/customerOptions";
import { translateText } from "../utils/i18n";

const QUICK_OPTION_LIMIT = 2000;

export function useLeadListQuickLead({ t, activeLocale, refreshLeadList, openLeadDetail }) {
  const router = useRouter();
  const route = useRoute();
  const branchStore = useBranchStore();

  const safeRouteQuery = computed(() => {
    const query = route && typeof route === "object" ? route.query : null;
    return query && typeof query === "object" ? query : {};
  });

  const quickLeadConfig = getQuickCreateConfig("lead");
  const showQuickLeadDialog = ref(false);
  const quickLeadLoading = ref(false);
  const quickLeadError = ref("");
  const quickLeadFieldErrors = reactive({});
  const quickLeadForm = reactive({
    queryText: "",
    customerOption: null,
    createCustomerMode: false,
    ...buildQuickCreateDraft(quickLeadConfig),
  });
  const quickLeadReturnTo = ref("");
  const quickLeadOpenedFromIntent = ref(false);
  const quickLeadCreateResource = createResource({ url: quickLeadConfig.submitUrl, auto: false });

  const leadQuickBranchResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Branch",
      fields: ["name", "branch_name"],
      filters: { is_active: 1 },
      order_by: "branch_name asc",
      limit_page_length: QUICK_OPTION_LIMIT,
    },
  });
  const leadQuickCompanyResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Insurance Company",
      fields: ["name", "company_name"],
      filters: { is_active: 1 },
      order_by: "company_name asc",
      limit_page_length: QUICK_OPTION_LIMIT,
    },
  });
  const leadQuickSalesEntityResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Sales Entity",
      fields: ["name", "full_name"],
      order_by: "full_name asc",
      limit_page_length: QUICK_OPTION_LIMIT,
    },
  });
  const leadQuickCustomerResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Customer",
      fields: ["name", "full_name"],
      filters: buildOfficeBranchLookupFilters(),
      order_by: "modified desc",
      limit_page_length: QUICK_OPTION_LIMIT,
    },
  });

  const leadQuickFields = computed(() => quickLeadConfig?.fields || []);
  const leadQuickFormFields = computed(() =>
    leadQuickFields.value.filter(
      (field) => !["customer", "first_name", "last_name", "customer_type", "tax_id", "phone", "email"].includes(field.name)
    )
  );
  const leadQuickOptionsMap = computed(() => ({
    branches: (Array.isArray(leadQuickBranchResource.data) ? leadQuickBranchResource.data : []).map((row) => ({
      value: row.name,
      label: row.branch_name || row.name,
    })),
    insuranceCompanies: (Array.isArray(leadQuickCompanyResource.data) ? leadQuickCompanyResource.data : []).map((row) => ({
      value: row.name,
      label: row.company_name || row.name,
    })),
    salesEntities: (Array.isArray(leadQuickSalesEntityResource.data) ? leadQuickSalesEntityResource.data : []).map((row) => ({
      value: row.name,
      label: row.full_name || row.name,
    })),
    customers: (Array.isArray(leadQuickCustomerResource.data) ? leadQuickCustomerResource.data : []).map((row) => ({
      value: row.name,
      label: getCustomerOptionLabel(row),
    })),
  }));
  const quickLeadUi = computed(() => ({
    eyebrow: getQuickCreateEyebrow("lead", activeLocale.value),
    title: getLocalizedText(quickLeadConfig?.title, activeLocale.value),
    subtitle: getLocalizedText(quickLeadConfig?.subtitle, activeLocale.value),
    newLabel: translateText("New Lead", activeLocale.value),
  }));
  const quickCreateCommon = computed(() => ({
    ...getQuickCreateLabels("create", activeLocale.value),
    validation: translateText("Please fill required fields.", activeLocale.value),
    failed: translateText("Quick lead create failed.", activeLocale.value),
  }));

  function buildOfficeBranchLookupFilters() {
    const officeBranch = branchStore.requestBranch || "";
    return officeBranch ? { office_branch: officeBranch } : {};
  }

  function clearQuickLeadFieldErrors() {
    Object.keys(quickLeadFieldErrors).forEach((key) => delete quickLeadFieldErrors[key]);
  }

  function resetQuickLeadForm() {
    Object.assign(quickLeadForm, {
      queryText: "",
      customerOption: null,
      createCustomerMode: false,
      ...buildQuickCreateDraft(quickLeadConfig),
    });
    quickLeadError.value = "";
    clearQuickLeadFieldErrors();
  }

  function openQuickLeadDialog({ fromIntent = false, returnTo = "" } = {}) {
    resetQuickLeadForm();
    quickLeadOpenedFromIntent.value = !!fromIntent;
    quickLeadReturnTo.value = returnTo || "";
    showQuickLeadDialog.value = true;
  }

  function cancelQuickLeadDialog() {
    showQuickLeadDialog.value = false;
    if (quickLeadOpenedFromIntent.value && quickLeadReturnTo.value) {
      const target = quickLeadReturnTo.value;
      quickLeadOpenedFromIntent.value = false;
      quickLeadReturnTo.value = "";
      router.push(target).catch(() => {});
      return;
    }
    quickLeadOpenedFromIntent.value = false;
    quickLeadReturnTo.value = "";
  }

  function validateQuickLeadForm() {
    clearQuickLeadFieldErrors();
    quickLeadError.value = "";
    let valid = true;
    for (const field of leadQuickFormFields.value) {
      if (!isFieldRequired(field)) continue;
      const value = quickLeadForm[field.name];
      if (String(value ?? "").trim() === "") {
        quickLeadFieldErrors[field.name] = getLocalizedText(field.label, activeLocale.value);
        valid = false;
      }
    }
    const selectedCustomer = String(quickLeadForm.customer || "").trim();
    const fullName = String(quickLeadForm.queryText || "").trim();
    const shouldCreateCustomer = !selectedCustomer && Boolean(quickLeadForm.createCustomerMode);
    if (!selectedCustomer && !shouldCreateCustomer) {
      quickLeadFieldErrors.customer = translateText("Select a customer or add a new customer.", activeLocale.value);
      valid = false;
    }
    if (shouldCreateCustomer && !fullName) {
      quickLeadFieldErrors.customer = translateText("New customer name is required.", activeLocale.value);
      valid = false;
    }
    const identityNumber = normalizeIdentityNumber(quickLeadForm.tax_id);
    const customerType = normalizeCustomerType(quickLeadForm.customer_type, identityNumber);
    if (shouldCreateCustomer) {
      if (!identityNumber) {
        quickLeadFieldErrors.tax_id = getLocalizedText(
          leadQuickFields.value.find((field) => field.name === "tax_id")?.label,
          activeLocale.value
        );
        valid = false;
      } else if (customerType === "Corporate") {
        if (identityNumber.length !== 10) {
          quickLeadFieldErrors.tax_id = t("validationTaxNumberLength");
          valid = false;
        }
      } else if (identityNumber.length !== 11) {
        quickLeadFieldErrors.tax_id = t("validationTcLength");
        valid = false;
      } else if (!isValidTckn(identityNumber)) {
        quickLeadFieldErrors.tax_id = t("validationTcInvalid");
        valid = false;
      }
    }
    if (!valid) quickLeadError.value = quickCreateCommon.value.validation;
    return valid;
  }

  function buildQuickLeadPayload() {
    const selectedCustomer = String(quickLeadForm.customer || "").trim();
    const shouldCreateCustomer = !selectedCustomer && Boolean(quickLeadForm.createCustomerMode);
    const identityNumber = normalizeIdentityNumber(quickLeadForm.tax_id);
    return {
      full_name: String(quickLeadForm.queryText || "").trim() || null,
      customer: selectedCustomer || null,
      customer_type: shouldCreateCustomer ? normalizeCustomerType(quickLeadForm.customer_type, identityNumber) : null,
      phone: shouldCreateCustomer ? quickLeadForm.phone || null : null,
      tax_id: shouldCreateCustomer ? identityNumber || null : null,
      email: shouldCreateCustomer ? quickLeadForm.email || null : null,
      status: quickLeadForm.status || "Open",
      sales_entity: quickLeadForm.sales_entity || null,
      insurance_company: quickLeadForm.insurance_company || null,
      branch: quickLeadForm.branch || null,
      estimated_gross_premium:
        quickLeadForm.estimated_gross_premium === "" ? null : Number(quickLeadForm.estimated_gross_premium || 0),
      notes: quickLeadForm.notes || null,
    };
  }

  function applyQuickLeadPrefills(prefills = {}) {
    if (!prefills || typeof prefills !== "object") return;
    for (const field of leadQuickFields.value) {
      const fieldName = String(field?.name || "").trim();
      if (!fieldName || !(fieldName in prefills)) continue;
      quickLeadForm[fieldName] = String(prefills[fieldName] ?? "").trim();
    }
    const customerName = String(prefills.customer || "").trim();
    const customerLabel = String(prefills.customer_label || customerName || prefills.queryText || "").trim();
    if (customerName) {
      quickLeadForm.customer = customerName;
      quickLeadForm.customerOption = {
        value: customerName,
        label: customerLabel || customerName,
      };
    }
    if (customerLabel) quickLeadForm.queryText = customerLabel;
    if ("createCustomerMode" in prefills) {
      quickLeadForm.createCustomerMode = String(prefills.createCustomerMode || "") === "1";
    }
  }

  function buildLeadQuickReturnTo() {
    const prefills = {};
    for (const field of leadQuickFields.value) {
      const fieldName = String(field?.name || "").trim();
      if (!fieldName) continue;
      const value = String(quickLeadForm[fieldName] ?? "").trim();
      if (!value) continue;
      prefills[fieldName] = value;
    }
    const customerName = String(quickLeadForm.customer || "").trim();
    const customerLabel = String(quickLeadForm.queryText || quickLeadForm?.customerOption?.label || "").trim();
    if (customerName) prefills.customer = customerName;
    if (customerLabel) prefills.customer_label = customerLabel;
    if (!customerName && customerLabel) prefills.queryText = customerLabel;
    if (quickLeadForm.createCustomerMode) prefills.createCustomerMode = "1";
    return router.resolve({
      name: "lead-list",
      query: buildQuickCreateIntentQuery({ prefills }),
    }).fullPath;
  }

  function onLeadRelatedCreateRequested(request = {}) {
    const navigation = buildRelatedQuickCreateNavigation({
      optionsSource: request?.optionsSource,
      query: request?.query,
      returnTo: buildLeadQuickReturnTo(),
    });
    if (!navigation) return;
    router.push(navigation).catch(() => {});
  }

  function consumeQuickLeadRouteIntent() {
    const intent = readQuickCreateIntent(safeRouteQuery.value);
    if (!intent.quick) return;
    openQuickLeadDialog({ fromIntent: true, returnTo: intent.returnTo });
    applyQuickLeadPrefills(intent.prefills || {});
    const nextQuery = stripQuickCreateIntentQuery(safeRouteQuery.value);
    router.replace({ name: "lead-list", query: nextQuery }).catch(() => {});
  }

  function hydrateCustomerResourceForBranch() {
    leadQuickCustomerResource.params = {
      doctype: "AT Customer",
      fields: ["name", "full_name"],
      filters: buildOfficeBranchLookupFilters(),
      order_by: "modified desc",
      limit_page_length: QUICK_OPTION_LIMIT,
    };
    void leadQuickCustomerResource.reload();
  }

  watch(
    () => branchStore.selected,
    () => {
      hydrateCustomerResourceForBranch();
    }
  );

  consumeQuickLeadRouteIntent();

  onBeforeUnmount(() => {
    // no-op placeholder for symmetry with runtime cleanup
  });

  async function submitQuickLead(openAfter = false) {
    if (quickLeadLoading.value) return;
    if (!validateQuickLeadForm()) return;
    quickLeadLoading.value = true;
    quickLeadError.value = "";
    try {
      const result = await quickLeadCreateResource.submit(buildQuickLeadPayload());
      const leadName = result?.lead || quickLeadCreateResource.data?.lead || null;
      showQuickLeadDialog.value = false;
      resetQuickLeadForm();
      await runQuickCreateSuccessTargets(quickLeadConfig?.successRefreshTargets, {
        lead_list: refreshLeadList,
      });
      const returnTarget = quickLeadOpenedFromIntent.value ? quickLeadReturnTo.value : "";
      quickLeadOpenedFromIntent.value = false;
      quickLeadReturnTo.value = "";
      if (!openAfter && returnTarget) {
        router.push(returnTarget).catch(() => {});
        return;
      }
      if (openAfter && leadName) openLeadDetail(leadName);
    } catch (error) {
      quickLeadError.value = parseActionError(error) || quickCreateCommon.value.failed;
    } finally {
      quickLeadLoading.value = false;
    }
  }

  return {
    quickLeadConfig,
    showQuickLeadDialog,
    quickLeadLoading,
    quickLeadError,
    quickLeadFieldErrors,
    quickLeadForm,
    leadQuickFormFields,
    leadQuickOptionsMap,
    quickLeadUi,
    quickCreateCommon,
    clearQuickLeadFieldErrors,
    resetQuickLeadForm,
    openQuickLeadDialog,
    cancelQuickLeadDialog,
    validateQuickLeadForm,
    buildQuickLeadPayload,
    submitQuickLead,
    applyQuickLeadPrefills,
    buildLeadQuickReturnTo,
    onLeadRelatedCreateRequested,
    consumeQuickLeadRouteIntent,
    hydrateCustomerResourceForBranch,
  };
}

function isFieldRequired(field) {
  return Boolean(field?.required || field?.mandatory || field?.reqd);
}
