import { computed, reactive, ref, watch } from "vue";
import { createResource } from "frappe-ui";

import { buildQuickCreateDraft, getQuickCreateConfig, getLocalizedText } from "../config/quickCreateRegistry";
import { getQuickCreateEyebrow, getQuickCreateLabels } from "../utils/quickCreateCopy";
import { runQuickCreateSuccessTargets } from "../utils/quickCreateSuccess";
import { buildQuickCreateIntentQuery, readQuickCreateIntent, stripQuickCreateIntentQuery } from "../utils/quickRouteIntent";
import { buildRelatedQuickCreateNavigation } from "../utils/relatedQuickCreate";
import { isValidTckn, normalizeCustomerType, normalizeIdentityNumber } from "../utils/customerIdentity";
import { translateText } from "../utils/i18n";

const QUICK_OPTION_LIMIT = 2000;
const POLICY_PRESET_STORAGE_KEY = "at:policy-list:preset";

export function usePolicyQuickCreateRuntime({
  t,
  activeLocale,
  router,
  route,
  branchStore,
  refreshPolicyList,
  openPolicyDetail,
}) {
  const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
  const quickPolicyConfig = getQuickCreateConfig("policy");
  const showQuickPolicyDialog = ref(false);
  const quickPolicyDialogKey = ref(0);
  const quickPolicyLoading = ref(false);
  const quickPolicyError = ref("");
  const quickPolicyFieldErrors = reactive({});
  const quickPolicyForm = reactive({
    queryText: "",
    customerOption: null,
    createCustomerMode: false,
    ...buildQuickCreateDraft(quickPolicyConfig),
  });
  const quickPolicyReturnTo = ref("");
  const quickPolicyOpenedFromIntent = ref(false);

  const quickPolicyCreateResource = createResource({
    url: quickPolicyConfig.submitUrl,
    auto: false,
  });
  const companyResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Insurance Company",
      fields: ["name", "company_name"],
      order_by: "company_name asc",
      limit_page_length: QUICK_OPTION_LIMIT,
    },
  });

  const policyQuickBranchResource = createResource({
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
  const policyQuickSalesEntityResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Sales Entity",
      fields: ["name", "full_name"],
      order_by: "full_name asc",
      limit_page_length: QUICK_OPTION_LIMIT,
    },
  });
  const policyQuickCustomerResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Customer",
      fields: ["name", "full_name", "customer_type", "tax_id", "birth_date", "phone", "email"],
      filters: buildOfficeBranchLookupFilters(),
      order_by: "modified desc",
      limit_page_length: QUICK_OPTION_LIMIT,
    },
  });
  const policyQuickOfferResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Offer",
      fields: ["name", "customer", "offer_date", "status"],
      filters: { status: ["in", ["Sent", "Accepted"]] },
      order_by: "modified desc",
      limit_page_length: QUICK_OPTION_LIMIT,
    },
  });

  const policyQuickFields = computed(() => quickPolicyConfig?.fields || []);
  const policyQuickFormFields = computed(() =>
    policyQuickFields.value.filter(
      (field) =>
        !["customer", "customer_full_name", "customer_type", "customer_tax_id", "customer_phone", "customer_email"].includes(
          field.name
        )
    )
  );
  const hasQuickPolicySourceOffer = computed(() => String(quickPolicyForm.source_offer || "").trim() !== "");
  const policyQuickCustomerOptions = computed(() =>
    asArray(resourceValue(policyQuickCustomerResource, [])).map((row) => ({
      value: row.name,
      label: row.full_name || row.name,
      description: row.tax_id || "",
      customer_type: row.customer_type || "",
      tax_id: row.tax_id || "",
      birth_date: row.birth_date || "",
      phone: row.phone || "",
      email: row.email || "",
    }))
  );
  const policyQuickCustomerLookup = computed(() => {
    const lookup = new Map();
    for (const row of policyQuickCustomerOptions.value) {
      lookup.set(String(row.value || "").trim(), row);
    }
    return lookup;
  });
  const policyQuickOptionsMap = computed(() => ({
    customers: policyQuickCustomerOptions.value,
    salesEntities: asArray(resourceValue(policyQuickSalesEntityResource, [])).map((row) => ({
      value: row.name,
      label: row.full_name || row.name,
    })),
    insuranceCompanies: asArray(resourceValue(companyResource, [])).map((row) => ({ value: row.name, label: row.company_name || row.name })),
    branches: asArray(resourceValue(policyQuickBranchResource, [])).map((row) => ({ value: row.name, label: row.branch_name || row.name })),
    offers: asArray(resourceValue(policyQuickOfferResource, [])).map((row) => ({
      value: row.name,
      label: `${row.name}${row.customer ? ` - ${row.customer}` : ""}${row.status ? ` (${row.status})` : ""}`,
    })),
  }));
  const policyQuickAllowedStatuses = new Set(["Active", "KYT", "IPT"]);
  const policyQuickAllowedOfferNames = computed(() =>
    new Set(policyQuickOptionsMap.value.offers.map((option) => String(option.value || "").trim()).filter(Boolean))
  );
  const quickPolicyUi = computed(() => ({
    title: getLocalizedText(quickPolicyConfig?.title, activeLocale.value),
    subtitle: getLocalizedText(quickPolicyConfig?.subtitle, activeLocale.value),
    eyebrow: getQuickCreateEyebrow("policy", activeLocale.value),
    newLabel: translateText("New Policy", activeLocale.value),
  }));
  const quickCreateCommon = computed(() => ({
    ...getQuickCreateLabels("create", activeLocale.value),
    validation: translateText("Please fill required fields.", activeLocale.value),
    issueDateAfterStartDate: translateText("Issue date cannot be later than start date.", activeLocale.value),
    startDateAfterEndDate: translateText("Start date cannot be later than end date.", activeLocale.value),
    failed: translateText("Quick policy create failed.", activeLocale.value),
  }));

  function buildOfficeBranchLookupFilters() {
    const officeBranch = branchStore?.requestBranch || "";
    return officeBranch ? { office_branch: officeBranch } : {};
  }

  function resourceValue(resource, fallback = null) {
    const value = resource?.data;
    return value == null ? fallback : value;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : value == null ? [] : [value];
  }

  function clearQuickPolicyFieldErrors() {
    Object.keys(quickPolicyFieldErrors).forEach((key) => delete quickPolicyFieldErrors[key]);
  }

  function parseDateOnly(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return null;
    const date = new Date(`${trimmed}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function resetQuickPolicyForm() {
    Object.assign(quickPolicyForm, {
      queryText: "",
      customerOption: null,
      createCustomerMode: false,
      ...buildQuickCreateDraft(quickPolicyConfig),
    });
    quickPolicyError.value = "";
    clearQuickPolicyFieldErrors();
  }

  function openQuickPolicyDialog({ fromIntent = false, returnTo = "" } = {}) {
    resetQuickPolicyForm();
    quickPolicyDialogKey.value += 1;
    quickPolicyOpenedFromIntent.value = !!fromIntent;
    quickPolicyReturnTo.value = returnTo || "";
    showQuickPolicyDialog.value = true;
  }

  function cancelQuickPolicyDialog() {
    showQuickPolicyDialog.value = false;
    if (quickPolicyOpenedFromIntent.value && quickPolicyReturnTo.value) {
      const target = quickPolicyReturnTo.value;
      quickPolicyOpenedFromIntent.value = false;
      quickPolicyReturnTo.value = "";
      router?.push?.(target).catch?.(() => {});
      return;
    }
    quickPolicyOpenedFromIntent.value = false;
    quickPolicyReturnTo.value = "";
  }

  function syncQuickPolicyCustomerSelection() {
    if (hasQuickPolicySourceOffer.value) return;
    const customerName = String(quickPolicyForm.customer || "").trim();
    const selectedCustomer = customerName ? policyQuickCustomerLookup.value.get(customerName) : null;

    if (selectedCustomer) {
      const selectedCustomerType = normalizeCustomerType(
        selectedCustomer.customer_type || quickPolicyForm.customer_type,
        selectedCustomer.tax_id || quickPolicyForm.customer_tax_id
      );
      quickPolicyForm.customer_full_name = String(selectedCustomer.label || customerName).trim() || customerName;
      quickPolicyForm.queryText = quickPolicyForm.customer_full_name;
      quickPolicyForm.customer_type = selectedCustomerType;
      quickPolicyForm.customer_tax_id = selectedCustomer.tax_id || quickPolicyForm.customer_tax_id;
      quickPolicyForm.customer_birth_date = selectedCustomerType === "Corporate" ? "" : String(selectedCustomer.birth_date || "").trim();
      quickPolicyForm.customer_phone = selectedCustomer.phone || quickPolicyForm.customer_phone;
      quickPolicyForm.customer_email = selectedCustomer.email || quickPolicyForm.customer_email;
      quickPolicyForm.createCustomerMode = false;
      return;
    }

    if (!quickPolicyForm.createCustomerMode) {
      quickPolicyForm.customer_type = "Individual";
      quickPolicyForm.customer_tax_id = "";
      quickPolicyForm.customer_phone = "";
      quickPolicyForm.customer_email = "";
      quickPolicyForm.customer_birth_date = "";
    }
  }

  function validateQuickPolicyForm() {
    clearQuickPolicyFieldErrors();
    quickPolicyError.value = "";
    let valid = true;
    const hasSourceOffer = hasQuickPolicySourceOffer.value;
    const statusValue = String(quickPolicyForm.status || "").trim();
    if (!hasSourceOffer && statusValue && !policyQuickAllowedStatuses.has(statusValue)) {
      quickPolicyFieldErrors.status = activeLocale.value === "tr" ? "Geçersiz durum seçimi." : "Unsupported status selection.";
      valid = false;
    }
    const selectedSourceOffer = String(quickPolicyForm.source_offer || "").trim();
    if (hasSourceOffer && selectedSourceOffer && !policyQuickAllowedOfferNames.value.has(selectedSourceOffer)) {
      quickPolicyFieldErrors.source_offer =
        activeLocale.value === "tr" ? "Seçili teklif bulunamadı." : "Selected source offer was not found.";
      valid = false;
    }
    for (const field of policyQuickFormFields.value) {
      if (!isFieldRequired(field)) continue;
      if (String(quickPolicyForm[field.name] ?? "").trim() === "") {
        quickPolicyFieldErrors[field.name] = getLocalizedText(field.label, activeLocale.value);
        valid = false;
      }
    }
    if (!hasSourceOffer && !String(quickPolicyForm.customer || "").trim()) {
      const shouldCreateCustomer = Boolean(quickPolicyForm.createCustomerMode);
      const customerName = String(quickPolicyForm.customer_full_name || quickPolicyForm.queryText || "").trim();
      const identityNumber = normalizeIdentityNumber(quickPolicyForm.customer_tax_id);
      const customerType = normalizeCustomerType(quickPolicyForm.customer_type, identityNumber);
      if (!shouldCreateCustomer) {
        quickPolicyFieldErrors.customer =
          activeLocale.value === "tr" ? "Bir müşteri seçin veya yeni müşteri ekleyin." : "Select a customer or add a new customer.";
        valid = false;
      } else if (!customerName) {
        quickPolicyFieldErrors.customer = activeLocale.value === "tr" ? "Yeni müşteri adı gerekli." : "New customer name is required.";
        valid = false;
      }
      if (shouldCreateCustomer && !identityNumber) {
        quickPolicyFieldErrors.customer_tax_id = getLocalizedText(
          policyQuickFields.value.find((field) => field.name === "customer_tax_id")?.label,
          activeLocale.value
        );
        valid = false;
      } else if (shouldCreateCustomer && customerType === "Corporate") {
        if (identityNumber.length !== 10) {
          quickPolicyFieldErrors.customer_tax_id =
            activeLocale.value === "tr" ? "Vergi numarası 10 haneli olmalıdır." : "Tax number must be 10 digits.";
          valid = false;
        }
      } else if (shouldCreateCustomer && identityNumber.length !== 11) {
        quickPolicyFieldErrors.customer_tax_id =
          activeLocale.value === "tr" ? "TC kimlik numarası 11 haneli olmalıdır." : "National ID number must be 11 digits.";
        valid = false;
      } else if (shouldCreateCustomer && !isValidTckn(identityNumber)) {
        quickPolicyFieldErrors.customer_tax_id =
          activeLocale.value === "tr" ? "Geçerli bir TC kimlik numarası girin." : "Enter a valid Turkish national ID number.";
        valid = false;
      }
      const birthDateValue = String(quickPolicyForm.customer_birth_date || "").trim();
      if (shouldCreateCustomer && customerType !== "Corporate" && birthDateValue) {
        const birthDate = new Date(`${birthDateValue}T00:00:00`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (Number.isNaN(birthDate.getTime()) || birthDate > today) {
          quickPolicyFieldErrors.customer_birth_date =
            activeLocale.value === "tr" ? "Doğum tarihi gelecekte olamaz." : "Birth date cannot be in the future.";
          valid = false;
        }
      }
    }
    if (!valid) {
      quickPolicyError.value = quickCreateCommon.value.validation;
      return false;
    }
    const issueDate = parseDateOnly(quickPolicyForm.issue_date);
    const startDate = parseDateOnly(quickPolicyForm.start_date);
    const endDate = parseDateOnly(quickPolicyForm.end_date);
    if (issueDate && startDate && issueDate > startDate) {
      quickPolicyFieldErrors.issue_date = quickCreateCommon.value.issueDateAfterStartDate;
      quickPolicyError.value = quickCreateCommon.value.validation;
      return false;
    }
    if (startDate && endDate && startDate > endDate) {
      quickPolicyFieldErrors.end_date = quickCreateCommon.value.startDateAfterEndDate;
      quickPolicyError.value = quickCreateCommon.value.validation;
      return false;
    }
    const gross = Number(quickPolicyForm.gross_premium || 0);
    if (!hasSourceOffer && !(Number.isFinite(gross) && gross > 0)) {
      quickPolicyFieldErrors.gross_premium = getLocalizedText(
        policyQuickFields.value.find((f) => f.name === "gross_premium")?.label,
        activeLocale.value
      );
      quickPolicyError.value = quickCreateCommon.value.validation;
      return false;
    }
    return true;
  }

  function buildQuickPolicyPayload() {
    const hasSourceOffer = hasQuickPolicySourceOffer.value;
    const selectedCustomer = String(quickPolicyForm.customer || "").trim();
    const shouldCreateCustomer = !hasSourceOffer && !selectedCustomer && Boolean(quickPolicyForm.createCustomerMode);
    const identityNumber = normalizeIdentityNumber(quickPolicyForm.customer_tax_id);
    const customerType = normalizeCustomerType(quickPolicyForm.customer_type, identityNumber);
    const customerBirthDate = String(quickPolicyForm.customer_birth_date || "").trim();
    const statusValue = String(quickPolicyForm.status || "").trim();
    const normalizedStatus = hasSourceOffer ? null : policyQuickAllowedStatuses.has(statusValue) ? statusValue : "Active";
    return {
      customer: hasSourceOffer ? null : selectedCustomer || null,
      customer_full_name: shouldCreateCustomer
        ? String(quickPolicyForm.customer_full_name || quickPolicyForm.queryText || "").trim() || null
        : null,
      customer_type: shouldCreateCustomer ? customerType : null,
      customer_tax_id: shouldCreateCustomer ? identityNumber || null : null,
      customer_phone: shouldCreateCustomer ? quickPolicyForm.customer_phone || null : null,
      customer_email: shouldCreateCustomer ? quickPolicyForm.customer_email || null : null,
      customer_birth_date: shouldCreateCustomer && customerType !== "Corporate" && customerBirthDate ? customerBirthDate : null,
      sales_entity: hasSourceOffer ? null : quickPolicyForm.sales_entity || null,
      insurance_company: hasSourceOffer ? null : quickPolicyForm.insurance_company || null,
      branch: hasSourceOffer ? null : quickPolicyForm.branch || null,
      policy_no: quickPolicyForm.policy_no || null,
      source_offer: quickPolicyForm.source_offer || null,
      status: normalizedStatus,
      issue_date: hasSourceOffer ? null : quickPolicyForm.issue_date || null,
      start_date: quickPolicyForm.start_date || null,
      end_date: quickPolicyForm.end_date || null,
      currency: quickPolicyForm.currency || "TRY",
      gross_premium: hasSourceOffer || quickPolicyForm.gross_premium === "" ? null : Number(quickPolicyForm.gross_premium || 0),
      net_premium: hasSourceOffer ? null : quickPolicyForm.net_premium === "" ? null : Number(quickPolicyForm.net_premium || 0),
      tax_amount: hasSourceOffer ? null : quickPolicyForm.tax_amount === "" ? null : Number(quickPolicyForm.tax_amount || 0),
      commission_amount: hasSourceOffer
        ? null
        : quickPolicyForm.commission_amount === ""
          ? null
          : Number(quickPolicyForm.commission_amount || 0),
      notes: quickPolicyForm.notes || null,
    };
  }

  async function submitQuickPolicy(openAfter = false) {
    if (quickPolicyLoading.value) return;
    if (!validateQuickPolicyForm()) return;
    quickPolicyLoading.value = true;
    quickPolicyError.value = "";
    try {
      const result = await quickPolicyCreateResource.submit(buildQuickPolicyPayload());
      const policyName = result?.policy || quickPolicyCreateResource.data?.policy || null;
      showQuickPolicyDialog.value = false;
      resetQuickPolicyForm();
      await runQuickCreateSuccessTargets(quickPolicyConfig?.successRefreshTargets, {
        policy_list: refreshPolicyList,
      });
      const returnTarget = quickPolicyOpenedFromIntent.value ? quickPolicyReturnTo.value : "";
      quickPolicyOpenedFromIntent.value = false;
      quickPolicyReturnTo.value = "";
      if (!openAfter && returnTarget) {
        router?.push?.(returnTarget).catch?.(() => {});
        return;
      }
      if (openAfter && policyName && typeof openPolicyDetail === "function") openPolicyDetail(policyName);
    } catch (error) {
      quickPolicyError.value = error?.messages?.join(" ") || error?.message || quickCreateCommon.value.failed;
    } finally {
      quickPolicyLoading.value = false;
    }
  }

  function applyQuickPolicyPrefills(prefills = {}) {
    if (!prefills || typeof prefills !== "object") return;
    for (const field of policyQuickFields.value) {
      const fieldName = String(field?.name || "").trim();
      if (!fieldName || !(fieldName in prefills)) continue;
      const prefillValue = String(prefills[fieldName] ?? "").trim();
      if (fieldName === "status" && prefillValue && !policyQuickAllowedStatuses.has(prefillValue)) {
        quickPolicyForm[fieldName] = "Active";
        continue;
      }
      quickPolicyForm[fieldName] = prefillValue;
    }
    const customerName = String(prefills.customer || "").trim();
    const customerLabel = String(prefills.customer_label || customerName || prefills.customer_full_name || prefills.queryText || "").trim();
    if (customerName) {
      quickPolicyForm.customer = customerName;
      quickPolicyForm.customerOption = {
        value: customerName,
        label: customerLabel || customerName,
      };
    }
    if (customerLabel) {
      quickPolicyForm.customer_full_name = customerLabel;
      quickPolicyForm.queryText = customerLabel;
    }
    if ("createCustomerMode" in prefills) {
      quickPolicyForm.createCustomerMode = String(prefills.createCustomerMode || "") === "1";
    }
  }

  function buildPolicyQuickReturnTo() {
    const prefills = {};
    for (const field of policyQuickFields.value) {
      const fieldName = String(field?.name || "").trim();
      if (!fieldName) continue;
      const value = String(quickPolicyForm[fieldName] ?? "").trim();
      if (!value) continue;
      if (fieldName === "status" && !policyQuickAllowedStatuses.has(value)) {
        prefills[fieldName] = "Active";
        continue;
      }
      prefills[fieldName] = value;
    }
    const customerName = String(quickPolicyForm.customer || "").trim();
    const customerLabel = String(
      quickPolicyForm.customer_full_name || quickPolicyForm.queryText || quickPolicyForm?.customerOption?.label || ""
    ).trim();
    if (customerName) prefills.customer = customerName;
    if (customerLabel) prefills.customer_label = customerLabel;
    if (!customerName && customerLabel) {
      prefills.customer_full_name = customerLabel;
      prefills.queryText = customerLabel;
    }
    if (quickPolicyForm.createCustomerMode) prefills.createCustomerMode = "1";
    return router?.resolve?.({
      name: "policy-list",
      query: buildQuickCreateIntentQuery({ prefills }),
    })?.fullPath || "";
  }

  function onPolicyRelatedCreateRequested(request = {}) {
    const navigation = buildRelatedQuickCreateNavigation({
      optionsSource: request?.optionsSource,
      query: request?.query,
      returnTo: buildPolicyQuickReturnTo(),
    });
    if (!navigation) return;
    router?.push?.(navigation).catch?.(() => {});
  }

  function consumeQuickPolicyRouteIntent() {
    const intent = readQuickCreateIntent(route?.query || {});
    if (!intent.quick) return;
    openQuickPolicyDialog({ fromIntent: true, returnTo: intent.returnTo });
    applyQuickPolicyPrefills(intent.prefills || {});
    const nextQuery = stripQuickCreateIntentQuery(route?.query || {});
    router?.replace?.({ name: "policy-list", query: nextQuery }).catch?.(() => {});
  }

  watch(
    () => branchStore?.selected,
    () => {
      policyQuickCustomerResource.params = {
        doctype: "AT Customer",
        fields: ["name", "full_name"],
        filters: buildOfficeBranchLookupFilters(),
        order_by: "modified desc",
        limit_page_length: QUICK_OPTION_LIMIT,
      };
      void policyQuickCustomerResource.reload();
      void refreshPolicyList?.();
    }
  );
  watch(
    () => [quickPolicyForm.customer, quickPolicyForm.createCustomerMode, hasQuickPolicySourceOffer.value, policyQuickCustomerOptions.value.length],
    () => {
      syncQuickPolicyCustomerSelection();
    },
    { immediate: true }
  );
  watch(
    () => quickPolicyForm.source_offer,
    (value) => {
      if (!String(value || "").trim()) return;
      quickPolicyForm.customer = "";
      quickPolicyForm.customer_full_name = "";
      quickPolicyForm.queryText = "";
      quickPolicyForm.customerOption = null;
      quickPolicyForm.createCustomerMode = false;
      quickPolicyForm.customer_birth_date = "";
    }
  );

  return {
    quickPolicyConfig,
    showQuickPolicyDialog,
    quickPolicyDialogKey,
    quickPolicyLoading,
    quickPolicyError,
    quickPolicyFieldErrors,
    quickPolicyForm,
    policyQuickFormFields,
    policyQuickOptionsMap,
    policyQuickCustomerOptions,
    quickPolicyUi,
    quickCreateCommon,
    hasQuickPolicySourceOffer,
    openQuickPolicyDialog,
    cancelQuickPolicyDialog,
    submitQuickPolicy,
    onPolicyRelatedCreateRequested,
    clearQuickPolicyFieldErrors,
    resetQuickPolicyForm,
    validateQuickPolicyForm,
    buildQuickPolicyPayload,
    applyQuickPolicyPrefills,
    buildPolicyQuickReturnTo,
    consumeQuickPolicyRouteIntent,
    policyQuickCustomerResource,
    quickPolicyCreateResource,
  };
}
