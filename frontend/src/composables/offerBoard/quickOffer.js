import { buildQuickCreateDraft } from "../../config/quickCreate";
import { getLocalizedText } from "../../config/quickCreate";
import { buildQuickCreateIntentQuery, readQuickCreateIntent, stripQuickCreateIntentQuery } from "../../utils/quickRouteIntent";
import { buildRelatedQuickCreateNavigation } from "../../utils/relatedQuickCreate";
import { isValidTckn, normalizeCustomerType, normalizeIdentityNumber } from "../../utils/customerIdentity";
import { runQuickCreateSuccessTargets } from "../../utils/quickCreateSuccess";

export function useOfferBoardQuickOffer({
  t,
  router,
  route,
  activeLocale,
  offerQuickConfig,
  offerQuickFields,
  offerQuickFormFields,
  quickOffer,
  quickOfferFieldErrors,
  quickOfferError,
  quickOfferLoading,
  quickOfferOpenedFromIntent,
  quickOfferReturnTo,
  showQuickOfferDialog,
  customerSearchResource,
  createQuickOfferResource,
  offersResource,
  offerQuickSuccessTargets,
  buildOfficeBranchLookupFilters,
  refreshOfferList,
  buildOfferBoardParams,
  openOfferDetail,
}) {
  function clearQuickOfferFieldErrors() {
    Object.keys(quickOfferFieldErrors).forEach((key) => {
      delete quickOfferFieldErrors[key];
    });
  }

  function getSelectedCustomerName() {
    const option = quickOffer.customerOption;
    if (!option) return "";
    if (typeof option === "string") return option.trim();
    if (typeof option === "object") {
      return String(option.value || option.name || "").trim();
    }
    return "";
  }

  function canCreateQuickOffer() {
    const selectedName = getSelectedCustomerName();
    const typedName = quickOffer.queryText.trim();
    return Boolean(selectedName || (quickOffer.createCustomerMode && typedName));
  }

  function validateQuickOfferForm() {
    clearQuickOfferFieldErrors();
    quickOfferError.value = "";
    let valid = true;

    const selectedCustomerName = getSelectedCustomerName();
    const typedName = quickOffer.queryText.trim();
    const shouldCreateCustomer = !selectedCustomerName && Boolean(quickOffer.createCustomerMode);
    if (!selectedCustomerName && !shouldCreateCustomer) {
      quickOfferFieldErrors.customer =
        activeLocale.value === "tr"
          ? "Bir müşteri seçin veya yeni müşteri ekleyin."
          : "Select a customer or add a new customer.";
      valid = false;
    }
    if (shouldCreateCustomer && !typedName) {
      quickOfferFieldErrors.customer =
        activeLocale.value === "tr" ? "Yeni müşteri adı gerekli." : "New customer name is required.";
      valid = false;
    }

    for (const field of offerQuickFormFields.value) {
      const required = field?.required ?? false;
      if (!required) continue;
      const rawValue = quickOffer[field.name];
      const empty = typeof rawValue === "boolean" ? false : String(rawValue ?? "").trim() === "";
      if (empty) {
        quickOfferFieldErrors[field.name] =
          getLocalizedText(field?.label, activeLocale.value) || t("quickCreateValidationFailed");
        valid = false;
      }
    }

    if (shouldCreateCustomer) {
      const customerType = normalizeCustomerType(quickOffer.customer_type, quickOffer.tax_id);
      const identityNumber = normalizeIdentityNumber(quickOffer.tax_id);
      if (customerType === "Corporate") {
        if (identityNumber.length !== 10) {
          quickOfferFieldErrors.tax_id =
            activeLocale.value === "tr" ? "Vergi numarası 10 haneli olmalıdır." : "Tax number must be 10 digits.";
          valid = false;
        }
      } else if (identityNumber.length !== 11) {
        quickOfferFieldErrors.tax_id =
          activeLocale.value === "tr"
            ? "TC kimlik numarası 11 haneli olmalıdır."
            : "T.R. identity number must be 11 digits.";
        valid = false;
      } else if (!isValidTckn(identityNumber)) {
        quickOfferFieldErrors.tax_id =
          activeLocale.value === "tr" ? "Geçerli bir TC kimlik numarası girin." : "Enter a valid T.R. identity number.";
        valid = false;
      }
    }

    const gross = Number(quickOffer.gross_premium || 0);
    const status = String(quickOffer.status || "Draft");
    if (["Sent", "Accepted", "Rejected"].includes(status) && gross <= 0) {
      quickOfferFieldErrors.gross_premium = t("grossPremium");
      valid = false;
    }

    if (!valid && !quickOfferError.value) {
      quickOfferError.value = t("quickCreateValidationFailed");
    }
    return valid;
  }

  function validateQuickOfferManaged({ form, fieldErrors, setError }) {
    Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key]);
    let valid = true;

    for (const field of offerQuickFormFields.value) {
      const required = field?.required ?? false;
      if (!required) continue;
      const rawValue = form?.[field.name];
      const empty = typeof rawValue === "boolean" ? false : String(rawValue ?? "").trim() === "";
      if (empty) {
        fieldErrors[field.name] = getLocalizedText(field?.label, activeLocale.value) || t("quickCreateValidationFailed");
        valid = false;
      }
    }

    const gross = Number(form?.gross_premium || 0);
    const status = String(form?.status || "Draft");
    if (["Sent", "Accepted", "Rejected"].includes(status) && gross <= 0) {
      fieldErrors.gross_premium = t("grossPremium");
      valid = false;
    }

    if (!valid) setError(t("quickCreateValidationFailed"));
    return valid;
  }

  function buildQuickOfferPayload() {
    const selectedCustomerName = getSelectedCustomerName();
    const hasSelectedCustomer = Boolean(selectedCustomerName);
    const shouldCreateCustomer = !hasSelectedCustomer && Boolean(quickOffer.createCustomerMode);
    const customerType = normalizeCustomerType(quickOffer.customer_type, quickOffer.tax_id);
    const taxId = normalizeIdentityNumber(quickOffer.tax_id);
    return {
      customer: selectedCustomerName || null,
      customer_name: shouldCreateCustomer ? quickOffer.queryText.trim() : null,
      customer_type: shouldCreateCustomer ? customerType : null,
      tax_id: shouldCreateCustomer ? taxId || null : null,
      phone: shouldCreateCustomer ? String(quickOffer.phone || "").trim() || null : null,
      email: shouldCreateCustomer ? String(quickOffer.email || "").trim() || null : null,
      branch: quickOffer.branch || null,
      notes: quickOffer.notes || null,
      currency: quickOffer.currency || "TRY",
      offer_date: quickOffer.offer_date || null,
      valid_until: quickOffer.valid_until || null,
      insurance_company: quickOffer.insurance_company || null,
      sales_entity: quickOffer.sales_entity || null,
      status: quickOffer.status || "Draft",
      gross_premium: quickOffer.gross_premium === "" ? null : Number(quickOffer.gross_premium || 0),
      net_premium: quickOffer.net_premium === "" ? null : Number(quickOffer.net_premium || 0),
      tax_amount: quickOffer.tax_amount === "" ? null : Number(quickOffer.tax_amount || 0),
      commission_amount: quickOffer.commission_amount === "" ? null : Number(quickOffer.commission_amount || 0),
    };
  }

  function buildQuickOfferManagedPayload({ form }) {
    const payload = {};
    for (const field of offerQuickFormFields.value) {
      const fieldName = field?.name;
      if (!fieldName) continue;
      const value = form?.[fieldName];
      payload[fieldName] = String(value ?? "").trim() === "" ? null : value;
    }

    payload.currency = payload.currency || "TRY";
    payload.status = payload.status || "Draft";
    payload.gross_premium = payload.gross_premium == null ? null : Number(payload.gross_premium || 0);
    payload.net_premium = payload.net_premium == null ? null : Number(payload.net_premium || 0);
    payload.tax_amount = payload.tax_amount == null ? null : Number(payload.tax_amount || 0);
    payload.commission_amount = payload.commission_amount == null ? null : Number(payload.commission_amount || 0);

    return payload;
  }

  function onQuickOfferManagedCreated({ recordName, openAfter }) {
    const returnTarget = quickOfferOpenedFromIntent.value ? quickOfferReturnTo.value : "";
    quickOfferOpenedFromIntent.value = false;
    quickOfferReturnTo.value = "";
    if (!openAfter && returnTarget) {
      router.push(returnTarget).catch(() => {});
      return;
    }
    if (openAfter && recordName) openOfferDetail(recordName);
  }

  function openQuickOfferDialog({ fromIntent = false, returnTo = "" } = {}) {
    resetQuickOfferForm();
    quickOfferOpenedFromIntent.value = !!fromIntent;
    quickOfferReturnTo.value = returnTo || "";
    showQuickOfferDialog.value = true;
  }

  function openQuickOfferDialogForCustomer(prefill, options = {}) {
    openQuickOfferDialog(options);
    const customerName = String(prefill?.customer || "").trim();
    const customerLabel = String(prefill?.customer_label || customerName).trim();
    if (!customerName) return;
    quickOffer.customerOption = {
      value: customerName,
      label: customerLabel || customerName,
    };
    quickOffer.queryText = customerLabel || customerName;
  }

  function applyQuickOfferPrefills(prefills = {}) {
    if (!prefills || typeof prefills !== "object") return;
    for (const field of offerQuickFields.value) {
      const fieldName = String(field?.name || "").trim();
      if (!fieldName || !(fieldName in prefills)) continue;
      quickOffer[fieldName] = String(prefills[fieldName] ?? "").trim();
    }
    if ("createCustomerMode" in prefills) {
      quickOffer.createCustomerMode = String(prefills.createCustomerMode || "") === "1";
    }
  }

  function buildQuickOfferReturnTo() {
    const prefills = {};
    for (const field of offerQuickFields.value) {
      const fieldName = String(field?.name || "").trim();
      if (!fieldName) continue;
      const value = String(quickOffer[fieldName] ?? "").trim();
      if (!value) continue;
      prefills[fieldName] = value;
    }
    const customerName = String(quickOffer?.customerOption?.value || "").trim();
    const customerLabel = String(quickOffer.queryText || quickOffer?.customerOption?.label || "").trim();
    if (customerName) prefills.customer = customerName;
    if (customerLabel) prefills.customer_label = customerLabel;
    if (!customerName && customerLabel) prefills.queryText = customerLabel;
    if (quickOffer.createCustomerMode) prefills.createCustomerMode = "1";

    return router.resolve({
      name: "offer-board",
      query: buildQuickCreateIntentQuery({ prefills }),
    }).fullPath;
  }

  function onOfferRelatedCreateRequested(request = {}) {
    const navigation = buildRelatedQuickCreateNavigation({
      optionsSource: request?.optionsSource,
      query: request?.query,
      returnTo: buildQuickOfferReturnTo(),
    });
    if (!navigation) return;
    router.push(navigation).catch(() => {});
  }

  function cancelQuickOfferDialog() {
    if (quickOfferOpenedFromIntent.value && quickOfferReturnTo.value) {
      const target = quickOfferReturnTo.value;
      quickOfferOpenedFromIntent.value = false;
      quickOfferReturnTo.value = "";
      router.push(target).catch(() => {});
      return;
    }
    quickOfferOpenedFromIntent.value = false;
    quickOfferReturnTo.value = "";
  }

  function onCustomerInput(event) {
    const value = String(event?.target?.value || "");
    quickOffer.queryText = value;

    const selectedOption = quickOffer.customerOption;
    if (selectedOption && typeof selectedOption === "object") {
      const selectedLabel = String(selectedOption.label || selectedOption.value || "").trim();
      if (selectedLabel !== value.trim()) {
        quickOffer.customerOption = null;
      }
    }

    onCustomerQuery(value);
  }

  function onCustomerQuery(value) {
    quickOffer.queryText = String(value || "");
    const query = quickOffer.queryText.trim();
    customerSearchResource.error = null;
    if (query.length < 2) {
      customerSearchResource.setData([]);
      customerSearchResource.error = null;
      return;
    }

    customerSearchResource
      .reload({
        doctype: "AT Customer",
        fields: ["name", "full_name", "tax_id"],
        filters: buildOfficeBranchLookupFilters(),
        or_filters: [
          ["AT Customer", "full_name", "like", `%${query}%`],
          ["AT Customer", "name", "like", `%${query}%`],
          ["AT Customer", "tax_id", "like", `%${query}%`],
        ],
        order_by: "modified desc",
        limit_page_length: 20,
      })
      .catch(() => {
        customerSearchResource.setData([]);
      });
  }

  function selectCustomerOption(option) {
    quickOffer.customerOption = option;
    quickOffer.queryText = String(option?.label || option?.value || "");
    customerSearchResource.setData([]);
    customerSearchResource.error = null;
  }

  function clearSelectedCustomer() {
    quickOffer.customerOption = null;
    onCustomerQuery(quickOffer.queryText);
  }

  function resetQuickOfferForm() {
    quickOffer.customerOption = null;
    quickOffer.queryText = "";
    quickOffer.createCustomerMode = false;
    Object.assign(quickOffer, buildQuickCreateDraft(offerQuickConfig));
    quickOfferError.value = "";
    clearQuickOfferFieldErrors();
    customerSearchResource.setData([]);
    customerSearchResource.error = null;
  }

  async function createQuickOffer(openAfter = false) {
    if (!canCreateQuickOffer()) return;
    if (!validateQuickOfferForm()) return;
    quickOfferLoading.value = true;
    quickOfferError.value = "";
    try {
      const response = await createQuickOfferResource.submit(buildQuickOfferPayload());
      const offerName = response?.offer || createQuickOfferResource.data?.offer;
      await runQuickCreateSuccessTargets(offerQuickSuccessTargets, {
        offer_list: refreshOfferList,
        offer_board: async () => {
          offersResource.params = buildOfferBoardParams();
          await offersResource.reload();
        },
      });
      if (!openAfter && quickOfferOpenedFromIntent.value && quickOfferReturnTo.value) {
        const target = quickOfferReturnTo.value;
        quickOfferOpenedFromIntent.value = false;
        quickOfferReturnTo.value = "";
        router.push(target).catch(() => {});
        return;
      }
      if (offerName && openAfter) openOfferDetail(offerName);
      quickOfferOpenedFromIntent.value = false;
      quickOfferReturnTo.value = "";
      resetQuickOfferForm();
    } catch (error) {
      quickOfferError.value = error?.messages?.join(" ") || error?.message || t("quickOfferCreateFailed");
    } finally {
      quickOfferLoading.value = false;
    }
  }

  function consumeQuickOfferRouteIntent() {
    const intent = readQuickCreateIntent(route.query);
    const legacyCustomerName = String(route.query?.customer || "").trim();
    const legacyCustomerLabel = String(route.query?.customer_label || legacyCustomerName).trim();
    const customerName = String(intent?.prefills?.customer || legacyCustomerName).trim();
    const customerLabel = String(intent?.prefills?.customer_label || legacyCustomerLabel || customerName).trim();
    if (!intent.quick) return;
    if (customerName) {
      openQuickOfferDialogForCustomer(
        { customer: customerName, customer_label: customerLabel },
        { fromIntent: true, returnTo: intent.returnTo }
      );
    } else {
      openQuickOfferDialog({ fromIntent: true, returnTo: intent.returnTo });
    }
    applyQuickOfferPrefills(intent.prefills || {});
    const nextQuery = stripQuickCreateIntentQuery(route.query, ["customer", "customer_label"]);
    router.replace({ name: "offer-board", query: nextQuery }).catch(() => {});
  }

  return {
    clearQuickOfferFieldErrors,
    validateQuickOfferForm,
    validateQuickOfferManaged,
    buildQuickOfferPayload,
    buildQuickOfferManagedPayload,
    onQuickOfferManagedCreated,
    openQuickOfferDialog,
    openQuickOfferDialogForCustomer,
    applyQuickOfferPrefills,
    buildQuickOfferReturnTo,
    onOfferRelatedCreateRequested,
    cancelQuickOfferDialog,
    onCustomerInput,
    onCustomerQuery,
    selectCustomerOption,
    clearSelectedCustomer,
    getSelectedCustomerName,
    createQuickOffer,
    resetQuickOfferForm,
    consumeQuickOfferRouteIntent,
    canCreateQuickOffer,
    quickOfferSuccessHandlers: {
      offer_list: refreshOfferList,
      offer_board: async () => {
        offersResource.params = buildOfferBoardParams();
        await offersResource.reload();
      },
    },
  };
}
