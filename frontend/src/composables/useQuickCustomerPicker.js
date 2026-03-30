import { computed, onBeforeUnmount, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";

import { normalizeCustomerType } from "../utils/customerIdentity";
import { getLocalizedText } from "../config/quickCreateRegistry";

export function useQuickCustomerPicker(props) {
  const customerSearchResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
  });

  const selectedCustomerOption = computed(() => {
    const option = props.model?.[props.selectedOptionFieldName];
    if (option && typeof option === "object" && String(option.value || "").trim()) return option;
    const value = String(props.model?.[props.customerFieldName] || "").trim();
    const label = String(props.model?.[props.queryFieldName] || value).trim();
    if (!value) return null;
    return {
      value,
      label: label || value,
    };
  });

  const queryText = computed(() => String(props.model?.[props.queryFieldName] || "").trimStart());
  const createMode = computed(() => Boolean(props.model?.[props.createModeFieldName]));
  const customerType = computed(() =>
    normalizeCustomerType(props.model?.[props.customerTypeFieldName], props.model?.[props.identityFieldName]),
  );
  const searchRows = computed(() => customerSearchResource.data || []);
  const customerOptions = computed(() =>
    searchRows.value.map((row) => ({
      value: row.name,
      label: row.full_name || row.name,
      description: row.tax_id || "",
    })),
  );
  const customerErrorText = computed(() => {
    if (queryText.value.trim().length < 2) return "";
    const err = customerSearchResource.error;
    if (!err) return "";
    return err?.messages?.join(" ") || err?.message || "";
  });
  const showCustomerSuggestions = computed(() => {
    return (
      !props.locked &&
      !props.disabled &&
      !selectedCustomerOption.value?.value &&
      queryText.value.trim().length >= 2 &&
      !customerSearchResource.loading &&
      customerOptions.value.length > 0
    );
  });
  const showCustomerNoResults = computed(() => {
    return (
      !props.locked &&
      !selectedCustomerOption.value?.value &&
      queryText.value.trim().length >= 2 &&
      !customerSearchResource.loading &&
      !customerErrorText.value &&
      customerOptions.value.length === 0
    );
  });
  const showCreateAction = computed(() => {
    return (
      !props.locked &&
      !selectedCustomerOption.value?.value &&
      queryText.value.trim().length > 0
    );
  });
  const showInlineFields = computed(() => {
    return !props.locked && !selectedCustomerOption.value?.value && createMode.value;
  });
  const isBirthDateLocked = computed(() => customerType.value === "Corporate");
  const identityLabel = computed(() =>
    customerType.value === "Corporate"
      ? text({ tr: "Vergi No", en: "Tax Number" })
      : text({ tr: "TC Kimlik No", en: "National ID Number" }),
  );
  const identityHelp = computed(() =>
    customerType.value === "Corporate"
      ? text({ tr: "10 haneli vergi numarası girin.", en: "Enter a 10-digit tax number." })
      : text({
          tr: "11 haneli T.C. kimlik numarası girin.",
          en: "Enter an 11-digit Turkish national ID number.",
        }),
  );
  const createActionText = computed(() => {
    const label = queryText.value.trim();
    if (!label) return "";
    return text({
      tr: `+ Yeni Müşteri Ekle: "${label}"`,
      en: `+ Add New Customer: "${label}"`,
    });
  });

  const selectedCustomerLabel = { tr: "Seçili müşteri", en: "Selected customer" };
  const clearSelectionLabel = { tr: "Temizle", en: "Clear" };
  const customerTypeLabel = { tr: "Müşteri Tipi", en: "Customer Type" };
  const birthDateLabel = { tr: "Doğum Tarihi", en: "Birth Date" };
  const individualLabel = { tr: "Bireysel", en: "Individual" };
  const corporateLabel = { tr: "Kurumsal", en: "Corporate" };
  const phoneLabel = { tr: "Telefon", en: "Phone" };
  const emailLabel = { tr: "E-posta", en: "Email" };

  let searchTimer = null;

  function text(value) {
    return getLocalizedText(value, props.locale);
  }

  function clearPendingSearch() {
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = null;
    }
  }

  function clearSelectedLink() {
    props.model[props.customerFieldName] = "";
    props.model[props.selectedOptionFieldName] = null;
  }

  function resetSearchResults() {
    customerSearchResource.setData([]);
    customerSearchResource.error = null;
  }

  function scheduleSearch(rawValue) {
    clearPendingSearch();
    const query = String(rawValue || "").trim();
    if (!query || query.length < 2 || props.locked) {
      resetSearchResults();
      return;
    }
    searchTimer = setTimeout(() => {
      customerSearchResource
        .reload({
          doctype: "AT Customer",
          fields: ["name", "full_name", "tax_id"],
          filters: props.officeBranch ? { office_branch: props.officeBranch } : {},
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
    }, 220);
  }

  function onQueryInput(event) {
    const value = String(event?.target?.value || "");
    props.model[props.queryFieldName] = value;
    if (selectedCustomerOption.value?.value) {
      const selectedLabel = String(selectedCustomerOption.value.label || selectedCustomerOption.value.value || "").trim();
      if (selectedLabel !== value.trim()) clearSelectedLink();
    }
    if (!value.trim()) props.model[props.createModeFieldName] = false;
    scheduleSearch(value);
  }

  function selectCustomerOption(option) {
    props.model[props.customerFieldName] = String(option?.value || "");
    props.model[props.selectedOptionFieldName] = option;
    props.model[props.queryFieldName] = String(option?.label || option?.value || "");
    props.model[props.createModeFieldName] = false;
    resetSearchResults();
  }

  function clearSelectedCustomer() {
    clearSelectedLink();
    props.model[props.createModeFieldName] = false;
    scheduleSearch(queryText.value);
  }

  function enableCreateMode() {
    clearSelectedLink();
    props.model[props.createModeFieldName] = true;
    resetSearchResults();
  }

  watch(
    customerType,
    (nextType) => {
      if (nextType === "Corporate") {
        props.model[props.birthDateFieldName] = "";
      }
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    clearPendingSearch();
  });

  return {
    selectedCustomerOption,
    queryText,
    createMode,
    customerType,
    customerOptions,
    customerErrorText,
    showCustomerSuggestions,
    showCustomerNoResults,
    showCreateAction,
    showInlineFields,
    isBirthDateLocked,
    identityLabel,
    identityHelp,
    createActionText,
    selectedCustomerLabel,
    clearSelectionLabel,
    customerTypeLabel,
    birthDateLabel,
    individualLabel,
    corporateLabel,
    phoneLabel,
    emailLabel,
    customerSearchResource,
    onQueryInput,
    selectCustomerOption,
    clearSelectedCustomer,
    enableCreateMode,
    text,
  };
}
