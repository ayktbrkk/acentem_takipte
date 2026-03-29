import { computed, reactive, ref, unref } from "vue";
import { createResource } from "frappe-ui";

import { getQuickCreateConfig } from "../config/quickCreateRegistry";
import { readFilterPresetList } from "../utils/filterPresetState";

const QUICK_OPTION_LIMIT = 2000;

export function useOfferBoardResources({ branchRequest, t } = {}) {
  const offersResource = createResource({
    url: "frappe.client.get_list",
    params: {
      doctype: "AT Offer",
      fields: [
        "name",
        "customer",
        "insurance_company",
        "status",
        "currency",
        "offer_date",
        "valid_until",
        "net_premium",
        "tax_amount",
        "commission_amount",
        "gross_premium",
        "converted_policy",
      ],
      order_by: "modified desc",
      limit_page_length: 100,
    },
    auto: true,
    transform(data) {
      if (Array.isArray(data)) {
        return Object.freeze(data.map(item => Object.freeze({...item})));
      }
      return data;
    },
  });

  const convertResource = createResource({
    url: "acentem_takipte.doctype.at_offer.at_offer.convert_to_policy",
  });
  const updateOfferStatusResource = createResource({
    url: "frappe.client.set_value",
  });
  const branchResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Branch",
      fields: ["name", "branch_name"],
      filters: {
        is_active: 1,
      },
      order_by: "branch_name asc",
      limit_page_length: QUICK_OPTION_LIMIT,
    },
  });
  const insuranceCompanyResource = createResource({
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
  const salesEntityResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Sales Entity",
      fields: ["name", "full_name"],
      order_by: "full_name asc",
      limit_page_length: QUICK_OPTION_LIMIT,
    },
  });
  const offerLookupResource = createResource({
    url: "frappe.client.get",
    auto: false,
  });
  const offerListResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
    transform(data) {
      if (Array.isArray(data)) {
        return Object.freeze(data.map(item => Object.freeze({...item})));
      }
      return data;
    },
  });
  const offerListCountResource = createResource({
    url: "frappe.client.get_count",
    auto: false,
  });
  const offerPresetServerReadResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.filter_presets.get_filter_preset_state",
    auto: false,
  });
  const offerPresetServerWriteResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.filter_presets.set_filter_preset_state",
    auto: false,
  });

  const offers = computed(() => offersResource.data || []);
  const offerListRows = computed(() => offerListResource.data || []);
  const branches = computed(() => branchResource.data || []);
  const insuranceCompaniesForQuickCreate = computed(() =>
    (insuranceCompanyResource.data || []).map((row) => ({
      value: row.name,
      label: row.company_name || row.name,
    }))
  );
  const salesEntitiesForQuickCreate = computed(() =>
    (salesEntityResource.data || []).map((row) => ({
      value: row.name,
      label: row.full_name || row.name,
    }))
  );
  const offerQuickConfig = getQuickCreateConfig("offer");
  const offerQuickFields = computed(() => offerQuickConfig?.fields || []);
  const offerQuickFormFields = computed(() =>
    offerQuickFields.value.filter((field) => !["customer_type", "tax_id", "phone", "email"].includes(field.name))
  );
  const offersLoadErrorText = computed(() => {
    const err = offersResource.error;
    if (!err) return "";
    return err?.messages?.join(" ") || err?.message || t?.("loadError") || "Failed to load offers";
  });
  const offerListLoadErrorText = computed(() => {
    const err = offerListResource.error;
    if (!err) return "";
    return err?.messages?.join(" ") || err?.message || t?.("loadError") || "Failed to load offers";
  });
  const offerViewMode = ref("list");
  const offerListFilters = reactive({
    query: "",
    insurance_company: "",
    status: "",
    valid_until: "",
    branch: "",
    actionable_only: false,
    gross_min: "",
    gross_max: "",
    sort: "modified_desc",
  });
  const offerListPagination = reactive({
    page: 1,
    pageLength: 20,
    total: 0,
  });
  const offerCustomPresets = ref(readFilterPresetList("at:offer-list:preset-list"));
  const offerBoardBranchRequest = computed(() => unref(branchRequest) || "");

  return {
    branches,
    convertResource,
    insuranceCompaniesForQuickCreate,
    offerBoardBranchRequest,
    offerCustomPresets,
    offerListCountResource,
    offerListFilters,
    offerListPagination,
    offerListResource,
    offerListRows,
    offerLookupResource,
    offerPresetServerReadResource,
    offerPresetServerWriteResource,
    offerQuickConfig,
    offerQuickFields,
    offerQuickFormFields,
    offerViewMode,
    offers,
    offersLoadErrorText,
    offersResource,
    salesEntitiesForQuickCreate,
    updateOfferStatusResource,
  };
}
