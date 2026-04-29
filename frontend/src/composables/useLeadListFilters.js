import { computed, reactive, ref, watch } from "vue";

import { createResource } from "frappe-ui";

import { useBranchStore } from "../stores/branch";
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
export function useLeadListFilters({ t, activeLocale }) {
  const branchStore = useBranchStore();

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

  const leadListResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_lead_workbench_rows",
    auto: false,
  });

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
  const activeFilterCount = computed(
    () =>
      [
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
      ].filter((value) => String(value ?? "").trim() !== "").length
  );
  const hasLeadActiveFilters = computed(() => activeFilterCount.value > 0);
  const totalPages = computed(() => Math.max(1, Math.ceil((pagination.total || 0) / pagination.pageLength || 1)));
  const hasNextPage = computed(() => pagination.page < totalPages.value);
  const startRow = computed(() => (pagination.total ? (pagination.page - 1) * pagination.pageLength + 1 : 0));
  const endRow = computed(() => (pagination.total ? Math.min(pagination.total, pagination.page * pagination.pageLength) : 0));

  function buildOfficeBranchLookupFilters() {
    const officeBranch = branchStore.requestBranch || "";
    return officeBranch ? { office_branch: officeBranch } : {};
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
      out.or_filters = [
        ["AT Lead", "converted_offer", "is", "set"],
        ["AT Lead", "converted_policy", "is", "set"],
      ];
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

  function applyFilters() {
    pagination.page = 1;
    refreshLeadList();
  }

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

  function previousPage() {
    if (pagination.page <= 1) return;
    pagination.page -= 1;
    refreshLeadList();
  }

  function nextPage() {
    if (!hasNextPage.value) return;
    pagination.page += 1;
    refreshLeadList();
  }

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

  function hasMeaningfulPresetState(selectedKey) {
    return String(selectedKey || "default") !== "default" || customPresets.value.length > 0;
  }

  async function persistPresetStateToServer() {
    try {
      const resource = createResource({
        url: "acentem_takipte.acentem_takipte.api.filter_presets.set_filter_preset_state",
        auto: false,
      });
      await resource.submit({
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
      const resource = createResource({
        url: "acentem_takipte.acentem_takipte.api.filter_presets.get_filter_preset_state",
        auto: false,
      });
      const remote = await resource.reload({ screen: "lead_list" });
      const remoteSelectedKey = String(remote?.selected_key || "default");
      const remoteCustomPresets = Array.isArray(remote?.custom_presets) ? remote.custom_presets : [];
      const remoteHasState = String(remoteSelectedKey || "default") !== "default" || remoteCustomPresets.length > 0;
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
    if (preset === "highPotential") {
      filters.status = "Open";
      filters.estimated_min = 10000;
    }
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
    customPresets.value = nextList.sort((a, b) => a.label.localeCompare(b.label, activeLocale.value === "tr" ? "tr-TR" : "en-US"));
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

  watch(
    () => leadListResource.data,
    (data) => {
      if (!data) return;
      const total = Number(data?.total || 0);
      pagination.total = Number.isFinite(total) ? total : 0;
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
      leadListResource.params = buildListParams();
      void refreshLeadList();
    }
  );

  applyPreset(presetKey.value, { refresh: false });
  void refreshLeadList();
  void hydratePresetStateFromServer();

  return {
    branchStore,
    filters,
    pagination,
    presetKey,
    customPresets,
    leadListResource,
    loadErrorText,
    leadStatusOptions,
    conversionStateOptions,
    staleStateOptions,
    sortOptions,
    presetOptions,
    canDeletePreset,
    activeFilterCount,
    hasLeadActiveFilters,
    totalPages,
    hasNextPage,
    startRow,
    endRow,
    buildQueryOrFilters,
    buildFilterPayload,
    buildListParams,
    buildLeadExportQuery,
    refreshLeadList,
    applyLeadStatusFilter,
    onLeadListFilterChange,
    onLeadListFilterReset,
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
    withOfficeBranchFilter,
    buildOfficeBranchLookupFilters,
  };
}
