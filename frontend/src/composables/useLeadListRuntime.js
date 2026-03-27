import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { createResource } from "frappe-ui";

import { useBranchStore } from "../stores/branch";
import { buildQuickCreateDraft, getQuickCreateConfig, getLocalizedText } from "../config/quickCreateRegistry";
import { getQuickCreateEyebrow, getQuickCreateLabels } from "../utils/quickCreateCopy";
import { runQuickCreateSuccessTargets } from "../utils/quickCreateSuccess";
import { openListExport } from "../utils/listExport";
import { buildQuickCreateIntentQuery, readQuickCreateIntent, stripQuickCreateIntentQuery } from "../utils/quickRouteIntent";
import { buildRelatedQuickCreateNavigation } from "../utils/relatedQuickCreate";
import { isValidTckn, normalizeCustomerType, normalizeIdentityNumber } from "../utils/customerIdentity";
import {
  extractCustomFilterPresetId,
  isCustomFilterPresetValue,
  makeCustomFilterPresetValue,
  readFilterPresetKey,
  readFilterPresetList,
  writeFilterPresetKey,
  writeFilterPresetList,
} from "../utils/filterPresetState";

const PRESET_STORAGE_KEY = "at:lead-list:preset";
const PRESET_LIST_STORAGE_KEY = "at:lead-list:preset-list";
const QUICK_OPTION_LIMIT = 2000;

export function useLeadListRuntime({ t, activeLocale }) {
  const router = useRouter();
  const route = useRoute();
  const branchStore = useBranchStore();

  const safeRouteQuery = computed(() => {
    const query = route && typeof route === "object" ? route.query : null;
    return query && typeof query === "object" ? query : {};
  });

  function buildOfficeBranchLookupFilters() {
    const officeBranch = branchStore.requestBranch || "";
    return officeBranch ? { office_branch: officeBranch } : {};
  }

  const filters = reactive({
    query: "",
    status: "",
    branch: "",
    sales_entity: "",
    insurance_company: "",
    conversion_state: "",
    stale_state: "",
    estimated_min: "",
    estimated_max: "",
    has_customer: false,
    can_convert_to_offer: false,
    sort: "modified desc",
  });

  const pagination = reactive({ page: 1, pageLength: 20, total: 0 });
  const presetKey = ref(readFilterPresetKey(PRESET_STORAGE_KEY, "default"));
  const customPresets = ref(readFilterPresetList(PRESET_LIST_STORAGE_KEY));
  const loadErrorText = ref("");
  const actionSuccessText = ref("");
  const actionErrorText = ref("");
  const convertingLeadName = ref("");
  const lastConvertedOfferName = ref("");
  let actionFlashTimer = null;

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

  const leadListResource = createResource({ url: "acentem_takipte.acentem_takipte.api.dashboard.get_lead_workbench_rows", auto: false });
  const quickLeadCreateResource = createResource({ url: quickLeadConfig.submitUrl, auto: false });
  const leadConvertResource = createResource({
    url: "acentem_takipte.doctype.at_lead.at_lead.convert_to_offer",
    auto: false,
  });
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
  const presetServerReadResource = createResource({ url: "acentem_takipte.acentem_takipte.api.filter_presets.get_filter_preset_state", auto: false });
  const presetServerWriteResource = createResource({ url: "acentem_takipte.acentem_takipte.api.filter_presets.set_filter_preset_state", auto: false });

  const rows = computed(() => leadListResource.data?.rows || []);
  const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
  const leadQuickFields = computed(() => quickLeadConfig?.fields || []);
  const leadQuickFormFields = computed(() =>
    leadQuickFields.value.filter(
      (field) => !["customer", "first_name", "last_name", "customer_type", "tax_id", "phone", "email"].includes(field.name)
    )
  );
  const leadQuickOptionsMap = computed(() => ({
    branches: (leadQuickBranchResource.data || []).map((row) => ({ value: row.name, label: row.branch_name || row.name })),
    insuranceCompanies: (leadQuickCompanyResource.data || []).map((row) => ({ value: row.name, label: row.company_name || row.name })),
    salesEntities: (leadQuickSalesEntityResource.data || []).map((row) => ({ value: row.name, label: row.full_name || row.name })),
    customers: (leadQuickCustomerResource.data || []).map((row) => ({ value: row.name, label: row.full_name || row.name })),
  }));
  const quickLeadUi = computed(() => ({
    eyebrow: getQuickCreateEyebrow("lead", activeLocale.value),
    title: getLocalizedText(quickLeadConfig?.title, activeLocale.value),
    subtitle: getLocalizedText(quickLeadConfig?.subtitle, activeLocale.value),
    newLabel: activeLocale.value === "tr" ? "Yeni Fırsat" : "New Lead",
  }));
  const quickCreateCommon = computed(() => ({
    ...getQuickCreateLabels("create", activeLocale.value),
    validation: activeLocale.value === "tr" ? "Lütfen gerekli alanları doldurun." : "Please fill required fields.",
    failed: activeLocale.value === "tr" ? "Hızlı kayıt oluşturulamadı." : "Quick create failed.",
  }));
  const isInitialLoading = computed(() => leadListResource.loading && rows.value.length === 0);

  const leadStatusOptions = computed(() => [
    { value: "Draft", label: t("statusDraft") },
    { value: "Open", label: t("statusOpen") },
    { value: "Replied", label: t("statusReplied") },
    { value: "Closed", label: t("statusClosed") },
  ]);
  const conversionStateOptions = computed(() => [
    { value: "unconverted", label: t("conversionStateUnconverted") },
    { value: "any_converted", label: t("conversionStateAnyConverted") },
    { value: "offer", label: t("conversionStateOffer") },
    { value: "policy", label: t("conversionStatePolicy") },
  ]);
  const staleStateOptions = computed(() => [
    { value: "Fresh", label: t("staleStateFresh") },
    { value: "FollowUp", label: t("staleStateFollowUp") },
    { value: "Stale", label: t("staleStateStale") },
  ]);
  const sortOptions = computed(() => [
    { value: "modified desc", label: t("sortModifiedDesc") },
    { value: "first_name asc", label: t("sortNameAsc") },
    { value: "first_name desc", label: t("sortNameDesc") },
    { value: "estimated_gross_premium desc", label: t("sortEstimatedDesc") },
    { value: "estimated_gross_premium asc", label: t("sortEstimatedAsc") },
    { value: "stale_state desc", label: t("sortStalePriority") },
    { value: "can_convert_to_offer desc", label: t("sortActionableFirst") },
    { value: "conversion_state desc", label: t("sortConversionPriority") },
  ]);
  const presetOptions = computed(() => [
    { value: "default", label: t("presetDefault") },
    { value: "openLeads", label: t("presetOpen") },
    { value: "highPotential", label: t("presetHighPotential") },
    { value: "unconverted", label: t("presetUnconverted") },
    { value: "convertedPolicy", label: t("presetConvertedPolicy") },
    { value: "followUpQueue", label: t("presetFollowUpQueue") },
    { value: "waitingLeads", label: t("presetWaitingLeads") },
    { value: "convertible", label: t("presetConvertible") },
    ...customPresets.value.map((preset) => ({
      value: makeCustomFilterPresetValue(preset.id),
      label: preset.label,
    })),
  ]);
  const canDeletePreset = computed(() => isCustomFilterPresetValue(presetKey.value));
  const activeFilterCount = computed(() => [
    filters.query,
    filters.status,
    filters.branch,
    filters.sales_entity,
    filters.insurance_company,
    filters.conversion_state,
    filters.stale_state,
    filters.estimated_min,
    filters.estimated_max,
    filters.has_customer ? "1" : "",
    filters.can_convert_to_offer ? "1" : "",
  ].filter((v) => String(v ?? "").trim() !== "").length);
  const hasLeadActiveFilters = computed(() => activeFilterCount.value > 0);
  const totalPages = computed(() => Math.max(1, Math.ceil((pagination.total || 0) / pagination.pageLength || 1)));
  const hasNextPage = computed(() => pagination.page < totalPages.value);
  const startRow = computed(() => (pagination.total ? (pagination.page - 1) * pagination.pageLength + 1 : 0));
  const endRow = computed(() => (pagination.total ? Math.min(pagination.total, pagination.page * pagination.pageLength) : 0));
  const leadStatusCountMap = computed(() => {
    const counts = { "": rows.value.length, Draft: 0, Open: 0, Replied: 0, Closed: 0 };
    for (const row of rows.value) {
      const status = String(row?.status || "Draft");
      if (!(status in counts)) counts[status] = 0;
      counts[status] += 1;
    }
    return counts;
  });
  const leadVisibleStatusOptions = computed(() => [
    {
      value: "",
      label: activeLocale.value === "tr" ? "Tümü" : "All",
      count: leadStatusCountMap.value[""] || 0,
    },
    ...leadStatusOptions.value.map((option) => ({
      ...option,
      count: leadStatusCountMap.value[option.value] || 0,
    })),
  ]);
  const leadPageSummary = computed(() => {
    const summary = { open: 0, followUp: 0, actionable: 0, converted: 0, conversionRate: 0 };
    for (const row of rows.value) {
      if (String(row?.status || "") === "Open") summary.open += 1;
      if (leadStaleState(row) !== "Fresh") summary.followUp += 1;
      if (canConvertLead(row)) summary.actionable += 1;
      if (row?.converted_offer || row?.converted_policy) summary.converted += 1;
    }
    summary.conversionRate = rows.value.length ? (summary.converted / rows.value.length) * 100 : 0;
    return summary;
  });
  const leadListFilterConfig = computed(() => [
    {
      key: "status",
      label: "Durum",
      options: leadStatusOptions.value.map((item) => ({ value: item.value, label: item.label })),
    },
    {
      key: "branch",
      label: "Branş",
      options: [...new Set(rows.value.map((row) => String(row.branch || "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, localeCode.value))
        .map((value) => ({ value, label: value })),
    },
    {
      key: "sales_entity",
      label: "Satış Birimi",
      options: [...new Set(rows.value.map((row) => String(row.sales_entity || "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, localeCode.value))
        .map((value) => ({ value, label: value })),
    },
    {
      key: "insurance_company",
      label: "Sigorta Şirketi",
      options: [...new Set(rows.value.map((row) => String(row.insurance_company || "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, localeCode.value))
        .map((value) => ({ value, label: value })),
    },
    {
      key: "conversion_state",
      label: "Dönüşüm",
      options: conversionStateOptions.value.map((item) => ({ value: item.value, label: item.label })),
    },
    {
      key: "stale_state",
      label: "Takip Durumu",
      options: staleStateOptions.value.map((item) => ({ value: item.value, label: item.label })),
    },
  ]);
  const leadListRows = computed(() =>
    rows.value.map((row) => ({
      ...row,
      name: row.name,
      customer: row.customer || "-",
      branch: row.branch || "-",
      status: row.status || "Draft",
      stale_state: leadStaleState(row),
      conversion_state: leadConversionState(row),
    }))
  );
  const leadListColumns = [
    { key: "name", label: "Fırsat No", width: "160px", type: "mono" },
    { key: "customer", label: "Müşteri", width: "220px" },
    { key: "branch", label: "Branş", width: "160px" },
    { key: "estimated_gross_premium", label: "Tahmini Brüt Prim", width: "120px", type: "amount", align: "right" },
    { key: "status", label: "Durum", width: "100px", type: "status" },
    { key: "stale_state", label: "Takip Durumu", width: "120px", type: "status" },
    { key: "conversion_state", label: "Dönüşüm", width: "140px", type: "status" },
  ];

  function onLeadListFilterChange({ key, value }) {
    filters[key] = String(value || "");
    pagination.page = 1;
    applyFilters();
  }

  function applyLeadStatusFilter(value) {
    filters.status = String(value || "");
    pagination.page = 1;
    applyFilters();
  }

  function onLeadListFilterReset() {
    filters.query = "";
    filters.status = "";
    filters.branch = "";
    filters.sales_entity = "";
    filters.insurance_company = "";
    filters.conversion_state = "";
    filters.stale_state = "";
    pagination.page = 1;
    applyFilters();
  }

  function leadDisplayName(row) {
    return `${String(row?.first_name || "").trim()} ${String(row?.last_name || "").trim()}`.trim() || row?.name || "-";
  }
  function fmtDateTime(value) {
    if (!value) return "-";
    try { return new Intl.DateTimeFormat(localeCode.value, { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
    catch { return String(value); }
  }
  function fmtCurrency(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    return new Intl.NumberFormat(localeCode.value, { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n);
  }
  function formatCount(value) {
    return new Intl.NumberFormat(localeCode.value).format(Number(value || 0));
  }
  function formatPercent(value) {
    return `%${new Intl.NumberFormat(localeCode.value, { maximumFractionDigits: 1 }).format(Number(value || 0))}`;
  }
  function focusLeadSearch() {
    const searchInput = document.querySelector("input[type='search'], input[placeholder*='ara'], input[placeholder*='Search']");
    if (searchInput instanceof HTMLElement) searchInput.focus();
  }
  function buildQueryOrFilters() {
    if (!filters.query) return null;
    const q = `%${filters.query}%`;
    return [
      ["AT Lead", "name", "like", q],
      ["AT Lead", "first_name", "like", q],
      ["AT Lead", "last_name", "like", q],
      ["AT Lead", "email", "like", q],
      ["AT Lead", "customer", "like", q],
    ];
  }
  function buildFilterPayload() {
    const out = { filters: {} };
    if (filters.status) out.filters.status = filters.status;
    if (filters.branch) out.filters.branch = ["like", `%${filters.branch}%`];
    if (filters.sales_entity) out.filters.sales_entity = ["like", `%${filters.sales_entity}%`];
    if (filters.insurance_company) out.filters.insurance_company = ["like", `%${filters.insurance_company}%`];
    if (filters.has_customer) out.filters.customer = ["is", "set"];
    const min = Number(filters.estimated_min);
    const max = Number(filters.estimated_max);
    const hasMin = String(filters.estimated_min).trim() !== "" && Number.isFinite(min);
    const hasMax = String(filters.estimated_max).trim() !== "" && Number.isFinite(max);
    if (hasMin && hasMax) out.filters.estimated_gross_premium = ["between", [min, max]];
    else if (hasMin) out.filters.estimated_gross_premium = [">=", min];
    else if (hasMax) out.filters.estimated_gross_premium = ["<=", max];
    if (filters.conversion_state === "unconverted") {
      out.filters.converted_offer = ["is", "not set"];
      out.filters.converted_policy = ["is", "not set"];
    } else if (filters.conversion_state === "offer") {
      out.filters.converted_offer = ["is", "set"];
    } else if (filters.conversion_state === "policy") {
      out.filters.converted_policy = ["is", "set"];
    } else if (filters.conversion_state === "any_converted") {
      out.or_filters = [["AT Lead", "converted_offer", "is", "set"], ["AT Lead", "converted_policy", "is", "set"]];
    }
    if (filters.query && filters.conversion_state !== "any_converted") out.or_filters = buildQueryOrFilters();
    return out;
  }
  function buildListParams() {
    return withOfficeBranchFilter({
      page: pagination.page,
      page_length: pagination.pageLength,
      filters: {
        ...buildFilterPayload().filters,
        query: filters.query || "",
        conversion_state: filters.conversion_state || "",
        stale_state: filters.stale_state || "",
        estimated_min: filters.estimated_min,
        estimated_max: filters.estimated_max,
        has_customer: Boolean(filters.has_customer),
        can_convert_to_offer: Boolean(filters.can_convert_to_offer),
        sort: filters.sort,
        branch: filters.branch || "",
        sales_entity: filters.sales_entity || "",
        insurance_company: filters.insurance_company || "",
        status: filters.status || "",
      },
    });
  }
  function buildLeadExportQuery() {
    return {
      filters: {
        ...(buildListParams().filters || {}),
      },
    };
  }
  function downloadLeadExport(format) {
    openListExport({
      screen: "lead_list",
      query: buildLeadExportQuery(),
      format,
      limit: 1000,
    });
  }
  function withOfficeBranchFilter(params) {
    const officeBranch = branchStore.requestBranch || "";
    if (!officeBranch) return params;
    return {
      ...params,
      filters: {
        ...(params.filters || {}),
        office_branch: officeBranch,
      },
    };
  }
  async function refreshLeadList() {
    const params = buildListParams();
    leadListResource.params = params;
    const result = await leadListResource.reload(params).catch((error) => ({ __error: error }));
    if (!result?.__error) {
      const payload = result || {};
      leadListResource.setData(payload);
      loadErrorText.value = "";
      const total = Number(payload?.total || 0);
      pagination.total = Number.isFinite(total) ? total : 0;
      return;
    }
    leadListResource.setData({ rows: [], total: 0 });
    pagination.total = 0;
    loadErrorText.value = t("loadError");
  }
  function clearActionFeedback() {
    if (actionFlashTimer) {
      window.clearTimeout(actionFlashTimer);
      actionFlashTimer = null;
    }
    actionSuccessText.value = "";
    actionErrorText.value = "";
    lastConvertedOfferName.value = "";
  }
  function scheduleActionFeedbackClear() {
    if (actionFlashTimer) window.clearTimeout(actionFlashTimer);
    actionFlashTimer = window.setTimeout(() => {
      actionSuccessText.value = "";
      actionErrorText.value = "";
      lastConvertedOfferName.value = "";
      actionFlashTimer = null;
    }, 4000);
  }
  function applyFilters() { pagination.page = 1; refreshLeadList(); }
  function previousPage() { if (pagination.page <= 1) return; pagination.page -= 1; refreshLeadList(); }
  function nextPage() { if (!hasNextPage.value) return; pagination.page += 1; refreshLeadList(); }
  function currentPresetPayload() {
    return {
      query: filters.query,
      status: filters.status,
      branch: filters.branch,
      sales_entity: filters.sales_entity,
      insurance_company: filters.insurance_company,
      conversion_state: filters.conversion_state,
      stale_state: filters.stale_state,
      estimated_min: filters.estimated_min,
      estimated_max: filters.estimated_max,
      has_customer: Boolean(filters.has_customer),
      can_convert_to_offer: Boolean(filters.can_convert_to_offer),
      sort: filters.sort,
      pageLength: pagination.pageLength,
    };
  }
  function applyPreset(key, { refresh = true } = {}) {
    const preset = String(key || "default");
    if (isCustomFilterPresetValue(preset)) {
      const customId = extractCustomFilterPresetId(preset);
      const custom = customPresets.value.find((row) => row.id === customId);
      if (!custom) {
        applyPreset("default", { refresh });
        return;
      }
      const payload = custom.payload || {};
      presetKey.value = preset;
      writeFilterPresetKey(PRESET_STORAGE_KEY, preset);
      filters.query = String(payload.query || "");
      filters.status = String(payload.status || "");
      filters.branch = String(payload.branch || "");
      filters.sales_entity = String(payload.sales_entity || "");
      filters.insurance_company = String(payload.insurance_company || "");
      filters.conversion_state = String(payload.conversion_state || "");
      filters.stale_state = String(payload.stale_state || "");
      filters.estimated_min = payload.estimated_min ?? "";
      filters.estimated_max = payload.estimated_max ?? "";
      filters.has_customer = Boolean(payload.has_customer);
      filters.can_convert_to_offer = Boolean(payload.can_convert_to_offer);
      filters.sort = String(payload.sort || "modified desc");
      pagination.pageLength = Number(payload.pageLength || 20) || 20;
      pagination.page = 1;
      if (refresh) refreshLeadList();
      return;
    }

    presetKey.value = preset;
    writeFilterPresetKey(PRESET_STORAGE_KEY, preset);
    filters.query = "";
    filters.status = "";
    filters.branch = "";
    filters.sales_entity = "";
    filters.insurance_company = "";
    filters.conversion_state = "";
    filters.stale_state = "";
    filters.estimated_min = "";
    filters.estimated_max = "";
    filters.has_customer = false;
    filters.can_convert_to_offer = false;
    filters.sort = "modified desc";
    pagination.pageLength = 20;
    if (preset === "openLeads") filters.status = "Open";
    if (preset === "highPotential") { filters.status = "Open"; filters.estimated_min = 10000; }
    if (preset === "unconverted") filters.conversion_state = "unconverted";
    if (preset === "convertedPolicy") filters.conversion_state = "policy";
    if (preset === "followUpQueue") {
      filters.status = "Open";
      filters.stale_state = "FollowUp";
      filters.sort = "stale_state desc";
    }
    if (preset === "waitingLeads") {
      filters.stale_state = "Stale";
      filters.sort = "stale_state desc";
    }
    if (preset === "convertible") {
      filters.conversion_state = "unconverted";
      filters.can_convert_to_offer = true;
      filters.sort = "can_convert_to_offer desc";
    }
    pagination.page = 1;
    if (refresh) refreshLeadList();
  }
  function onPresetChange() {
    applyPreset(presetKey.value, { refresh: true });
    void persistPresetStateToServer();
  }
  function resetFilters() {
    applyPreset("default", { refresh: false });
    void persistPresetStateToServer();
    refreshLeadList();
  }
  function hasMeaningfulPresetState(selectedKey) {
    return String(selectedKey || "default") !== "default" || customPresets.value.length > 0;
  }
  async function persistPresetStateToServer() {
    try {
      await presetServerWriteResource.submit({
        screen: "lead_list",
        selected_key: presetKey.value,
        custom_presets: customPresets.value,
      });
    } catch {
      // local fallback
    }
  }
  async function hydratePresetStateFromServer() {
    try {
      const remote = await presetServerReadResource.reload({ screen: "lead_list" });
      const remoteSelectedKey = String(remote?.selected_key || "default");
      const remoteCustomPresets = Array.isArray(remote?.custom_presets) ? remote.custom_presets : [];
      const remoteHasState =
        String(remoteSelectedKey || "default") !== "default" || remoteCustomPresets.length > 0;
      const localHasState = hasMeaningfulPresetState(presetKey.value);
      if (!remoteHasState) {
        if (localHasState) void persistPresetStateToServer();
        return;
      }
      const localSnapshot = JSON.stringify({ selected_key: presetKey.value, custom_presets: customPresets.value });
      const remoteSnapshot = JSON.stringify({ selected_key: remoteSelectedKey, custom_presets: remoteCustomPresets });
      if (localSnapshot === remoteSnapshot) return;
      customPresets.value = remoteCustomPresets;
      writeFilterPresetList(PRESET_LIST_STORAGE_KEY, customPresets.value);
      applyPreset(remoteSelectedKey, { refresh: true });
    } catch {
      // local fallback
    }
  }
  function savePreset() {
    const currentCustomId = extractCustomFilterPresetId(presetKey.value);
    const currentCustom = currentCustomId ? customPresets.value.find((item) => item.id === currentCustomId) : null;
    const initialName = currentCustom?.label || "";
    const name = String(window.prompt(t("savePresetPrompt"), initialName) || "").trim();
    if (!name) return;

    const existing = customPresets.value.find((item) => item.label.toLowerCase() === name.toLowerCase());
    const targetId =
      currentCustomId || existing?.id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const nextList = customPresets.value.filter((item) => item.id !== targetId);
    nextList.push({ id: targetId, label: name, payload: currentPresetPayload() });
    customPresets.value = nextList.sort((a, b) => a.label.localeCompare(b.label, localeCode.value));
    writeFilterPresetList(PRESET_LIST_STORAGE_KEY, customPresets.value);
    presetKey.value = makeCustomFilterPresetValue(targetId);
    writeFilterPresetKey(PRESET_STORAGE_KEY, presetKey.value);
    void persistPresetStateToServer();
  }
  function deletePreset() {
    if (!canDeletePreset.value) return;
    if (!window.confirm(t("deletePresetConfirm"))) return;
    const customId = extractCustomFilterPresetId(presetKey.value);
    if (!customId) return;
    customPresets.value = customPresets.value.filter((item) => item.id !== customId);
    writeFilterPresetList(PRESET_LIST_STORAGE_KEY, customPresets.value);
    applyPreset("default", { refresh: true });
    void persistPresetStateToServer();
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
      quickLeadFieldErrors.customer =
        activeLocale.value === "tr"
          ? "Bir müşteri seçin veya yeni müşteri ekleyin."
          : "Select a customer or add a new customer.";
      valid = false;
    }
    if (shouldCreateCustomer && !fullName) {
      quickLeadFieldErrors.customer =
        activeLocale.value === "tr" ? "Yeni müşteri adı gerekli." : "New customer name is required.";
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
  function openLeadDetail(name) { router.push({ name: "lead-detail", params: { name } }); }
  function openOfferDetail(name) { router.push({ name: "offer-detail", params: { name } }); }
  function openCustomer360(name) { router.push({ name: "customer-detail", params: { name } }); }
  function openPolicyDetail(name) { router.push({ name: "policy-detail", params: { name } }); }
  function canConvertLead(row) {
    if (typeof row?.can_convert_to_offer === "boolean") return row.can_convert_to_offer;
    if (!row || row.converted_offer || row.converted_policy) return false;
    if (String(row.status || "") === "Closed") return false;
    if (!row.customer || !row.sales_entity || !row.insurance_company || !row.branch) return false;
    const estimated = Number(row.estimated_gross_premium || 0);
    return Number.isFinite(estimated) && estimated > 0;
  }
  async function convertLeadToOffer(row) {
    if (!canConvertLead(row) || !row?.name || leadConvertResource.loading) return;
    clearActionFeedback();
    convertingLeadName.value = row.name;
    try {
      const result = await leadConvertResource.submit({ lead_name: row.name });
      lastConvertedOfferName.value = result?.offer || "";
      actionSuccessText.value = lastConvertedOfferName.value ? "" : (result?.message || t("convertLeadSuccess"));
      await refreshLeadList();
      scheduleActionFeedbackClear();
    } catch (error) {
      actionErrorText.value = parseActionError(error) || t("convertLeadError");
      scheduleActionFeedbackClear();
    } finally {
      convertingLeadName.value = "";
    }
  }
  function parseActionError(error) {
    const direct = error?.message || error?.exc_type;
    if (direct) return String(direct);
    const serverMessage =
      error?._server_messages ||
      error?.messages?.[0] ||
      error?.response?._server_messages ||
      error?.response?.message;
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
  function leadConversionState(row) {
    if (row?.conversion_state) return row.conversion_state;
    if (row?.converted_policy) return "Policy";
    if (row?.converted_offer) return "Offer";
    if (String(row?.status || "") === "Closed") return "Closed";
    if (canConvertLead(row)) return "Actionable";
    return "Incomplete";
  }
  function leadConversionMissingFields(row) {
    if (Array.isArray(row?.conversion_missing_fields) && row.conversion_missing_fields.length) {
      const mapping = {
        customer: t("customer"),
        sales_entity: t("salesEntity"),
        insurance_company: t("company"),
        branch: t("branch"),
        estimated_gross_premium: t("estimatedGross"),
      };
      return row.conversion_missing_fields.map((field) => mapping[field] || field).join(", ");
    }
    if (!row || row.converted_offer || row.converted_policy) return "";
    const missing = [];
    if (!row.customer) missing.push(t("customer"));
    if (!row.sales_entity) missing.push(t("salesEntity"));
    if (!row.insurance_company) missing.push(t("company"));
    if (!row.branch) missing.push(t("branch"));
    const estimated = Number(row.estimated_gross_premium || 0);
    if (!(Number.isFinite(estimated) && estimated > 0)) missing.push(t("estimatedGross"));
    return missing.join(", ");
  }
  function leadStaleState(row) {
    if (row?.stale_state) return row.stale_state;
    const days = leadAgeDays(row?.modified);
    if (days >= 8) return "Stale";
    if (days >= 3) return "FollowUp";
    return "Fresh";
  }
  function leadAgeDays(value) {
    if (!value) return 999;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 999;
    const diff = Date.now() - date.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  function hydrateFromResourceData(payload) {
    leadListResource.setData(payload || { rows: [], total: 0 });
    const total = Number(payload?.total || 0);
    pagination.total = Number.isFinite(total) ? total : 0;
  }

  watch(
    () => leadListResource.data,
    (data) => {
      if (!data) return;
      hydrateFromResourceData(data);
      loadErrorText.value = "";
    },
    { immediate: true }
  );

  watch(
    () => leadListResource.error,
    (error) => {
      if (!error) return;
      loadErrorText.value = t("loadError");
    },
    { immediate: true }
  );

  watch(
    () => branchStore.selected,
    () => {
      pagination.page = 1;
      leadQuickCustomerResource.params = {
        doctype: "AT Customer",
        fields: ["name", "full_name"],
        filters: buildOfficeBranchLookupFilters(),
        order_by: "modified desc",
        limit_page_length: QUICK_OPTION_LIMIT,
      };
      void leadQuickCustomerResource.reload();
      void refreshLeadList();
    }
  );

  applyPreset(presetKey.value, { refresh: false });
  void refreshLeadList();
  void hydratePresetStateFromServer();
  void consumeQuickLeadRouteIntent();

  onBeforeUnmount(() => {
    if (actionFlashTimer) window.clearTimeout(actionFlashTimer);
  });

  return {
    filters,
    pagination,
    leadStatusOptions,
    conversionStateOptions,
    staleStateOptions,
    sortOptions,
    presetKey,
    presetOptions,
    canDeletePreset,
    activeFilterCount,
    totalPages,
    hasNextPage,
    startRow,
    endRow,
    leadStatusCountMap,
    leadVisibleStatusOptions,
    leadPageSummary,
    leadListFilterConfig,
    leadListRows,
    leadListColumns,
    rows,
    loadErrorText,
    actionSuccessText,
    actionErrorText,
    convertingLeadName,
    lastConvertedOfferName,
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
    isInitialLoading,
    leadListResource,
    leadConvertResource,
    applyLeadStatusFilter,
    onLeadListFilterChange,
    onLeadListFilterReset,
    leadDisplayName,
    fmtDateTime,
    fmtCurrency,
    formatCount,
    formatPercent,
    focusLeadSearch,
    buildQueryOrFilters,
    buildFilterPayload,
    buildListParams,
    buildLeadExportQuery,
    downloadLeadExport,
    withOfficeBranchFilter,
    refreshLeadList,
    clearActionFeedback,
    scheduleActionFeedbackClear,
    applyFilters,
    previousPage,
    nextPage,
    currentPresetPayload,
    applyPreset,
    onPresetChange,
    resetFilters,
    hasMeaningfulPresetState,
    persistPresetStateToServer,
    hydratePresetStateFromServer,
    savePreset,
    deletePreset,
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
    openLeadDetail,
    openOfferDetail,
    openCustomer360,
    openPolicyDetail,
    canConvertLead,
    convertLeadToOffer,
    parseActionError,
    leadConversionState,
    leadConversionMissingFields,
    leadStaleState,
    leadAgeDays,
    branchStore,
  };
}
