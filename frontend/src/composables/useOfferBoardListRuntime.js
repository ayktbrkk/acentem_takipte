import { computed, reactive, ref, unref } from "vue";

import {
  extractCustomFilterPresetId,
  isCustomFilterPresetValue,
  makeCustomFilterPresetValue,
  readFilterPresetKey,
  readFilterPresetList,
  writeFilterPresetKey,
  writeFilterPresetList,
} from "../utils/filterPresetState";
import { openListExport } from "../utils/listExport";

function buildOfferListOrderBy(offerListFilters) {
  if (offerListFilters.sort === "valid_until_asc") return "valid_until asc";
  if (offerListFilters.sort === "valid_until_desc") return "valid_until desc";
  if (offerListFilters.sort === "gross_premium_desc") return "gross_premium desc";
  return "modified desc";
}

function buildOfferFilterPayload(offerListFilters, branchRequest) {
  const filters = {};
  const out = { filters };
  const officeBranch = unref(branchRequest) || "";

  if (offerListFilters.insurance_company) filters.insurance_company = offerListFilters.insurance_company;
  if (offerListFilters.valid_until) filters.valid_until = ["<=", offerListFilters.valid_until];
  if (offerListFilters.branch) filters.branch = offerListFilters.branch;
  if (officeBranch) filters.office_branch = officeBranch;
  if (offerListFilters.gross_min !== "") filters.gross_premium = [">=", Number(offerListFilters.gross_min || 0)];
  if (offerListFilters.gross_max !== "") {
    if (Array.isArray(filters.gross_premium)) {
      filters.gross_premium = ["between", [Number(offerListFilters.gross_min || 0), Number(offerListFilters.gross_max || 0)]];
    } else {
      filters.gross_premium = ["<=", Number(offerListFilters.gross_max || 0)];
    }
  }

  if (offerListFilters.actionable_only) {
    filters.status = ["in", ["Sent", "Accepted"]];
    filters.converted_policy = ["is", "not set"];
  } else if (offerListFilters.status) {
    if (offerListFilters.status === "Converted") {
      filters.converted_policy = ["is", "set"];
    } else {
      filters.status = offerListFilters.status;
    }
  }
  if (offerListFilters.query) {
    out.or_filters = [
      ["AT Offer", "name", "like", `%${offerListFilters.query}%`],
      ["AT Offer", "customer", "like", `%${offerListFilters.query}%`],
      ["AT Offer", "insurance_company", "like", `%${offerListFilters.query}%`],
    ];
  }

  return out;
}

function isoDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return formatDate(date);
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function useOfferBoardListRuntime({
  branchRequest,
  localeCode,
  offerCustomPresets,
  offerListCountResource,
  offerListFilters,
  offerListPagination,
  offerListResource,
  offerPresetServerReadResource,
  offerPresetServerWriteResource,
  offerViewMode,
  t,
}) {
  const OFFER_PRESET_STORAGE_KEY = "at:offer-list:preset";
  const OFFER_PRESET_LIST_STORAGE_KEY = "at:offer-list:preset-list";
  const offerPresetKey = ref(readFilterPresetKey(OFFER_PRESET_STORAGE_KEY, "default"));

  const offerCompanies = computed(() =>
    [...new Set((offerListResource.data || []).map((row) => row.insurance_company).filter(Boolean))].sort((a, b) =>
      String(a).localeCompare(String(b)),
    ),
  );
  const offerStatusOptions = computed(() => [
    { value: "Draft", label: t("statusDraft") },
    { value: "Sent", label: t("statusSent") },
    { value: "Accepted", label: t("statusAccepted") },
    { value: "Converted", label: t("statusConverted") },
    { value: "Rejected", label: t("statusRejected") },
  ]);
  const offerSortOptions = computed(() => [
    { value: "modified_desc", label: t("sortModifiedDesc") },
    { value: "valid_until_asc", label: t("sortValidUntilAsc") },
    { value: "valid_until_desc", label: t("sortValidUntilDesc") },
    { value: "gross_premium_desc", label: t("sortGrossDesc") },
  ]);
  const offerPresetOptions = computed(() => [
    { value: "default", label: t("presetDefault") },
    { value: "actionable", label: t("presetActionable") },
    { value: "converted", label: t("presetConverted") },
    { value: "expiring7", label: t("presetExpiring7") },
    ...offerCustomPresets.value.map((preset) => ({
      value: makeCustomFilterPresetValue(preset.id),
      label: preset.label,
    })),
  ]);
  const canDeleteOfferPreset = computed(() => isCustomFilterPresetValue(offerPresetKey.value));
  const isListView = computed(() => offerViewMode.value === "list");

  function onOfferListFilterBarChange({ key, value }) {
    if (key === "insurance_company") offerListFilters.insurance_company = String(value || "");
    if (key === "status") offerListFilters.status = String(value || "");
    offerListPagination.page = 1;
    void applyOfferListFilters();
  }

  function onOfferListFilterBarReset() {
    offerListFilters.query = "";
    offerListFilters.insurance_company = "";
    offerListFilters.status = "";
    offerListPagination.page = 1;
    void applyOfferListFilters();
  }

  function focusOfferSearch() {
    const searchInput = document.querySelector('input[placeholder*="ara"]');
    if (searchInput instanceof HTMLInputElement) {
      searchInput.focus();
      searchInput.select();
    }
  }

  function buildOfferBoardParams() {
    const payload = buildOfferFilterPayload(offerListFilters, branchRequest);
    return {
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
      filters: payload.filters,
      ...(payload.or_filters ? { or_filters: payload.or_filters } : {}),
      order_by: buildOfferListOrderBy(offerListFilters),
      limit_page_length: 100,
    };
  }

  function buildOfferListParams() {
    const payload = buildOfferFilterPayload(offerListFilters, branchRequest);
    return {
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
      filters: payload.filters,
      ...(payload.or_filters ? { or_filters: payload.or_filters } : {}),
      order_by: buildOfferListOrderBy(offerListFilters),
      limit_start: (offerListPagination.page - 1) * offerListPagination.pageLength,
      limit_page_length: offerListPagination.pageLength,
    };
  }

  function buildOfferExportQuery() {
    const payload = buildOfferFilterPayload(offerListFilters, branchRequest);
    return {
      filters: payload.filters,
      ...(payload.or_filters ? { or_filters: payload.or_filters } : {}),
      order_by: buildOfferListOrderBy(offerListFilters),
    };
  }

  function buildOfferListCountParams() {
    const payload = buildOfferFilterPayload(offerListFilters, branchRequest);
    return {
      doctype: "AT Offer",
      filters: payload.filters,
      ...(payload.or_filters ? { or_filters: payload.or_filters } : {}),
    };
  }

  function downloadOfferExport(format) {
    openListExport({
      screen: "offer_list",
      query: buildOfferExportQuery(),
      format,
      limit: 1000,
    });
  }

  async function refreshOfferList() {
    offerListResource.params = buildOfferListParams();
    offerListCountResource.params = buildOfferListCountParams();

    const [recordsResult, countResult] = await Promise.allSettled([
      offerListResource.reload(),
      offerListCountResource.reload(),
    ]);

    if (recordsResult.status === "fulfilled") {
      const records = recordsResult.value || [];
      offerListResource.setData(records);

      if (countResult.status === "fulfilled") {
        const total = Number(countResult.value || 0);
        offerListPagination.total = Number.isFinite(total) ? total : 0;
      } else {
        offerListPagination.total = records.length;
      }
      return;
    }

    offerListPagination.total = 0;
    offerListResource.setData([]);
  }

  async function refreshOffers() {
    offerListResource.params = buildOfferListParams();
    const tasks = [];
    if (isListView.value) tasks.push(refreshOfferList());
    else tasks.push(offerListResource.reload());
    await Promise.allSettled(tasks);
  }

  function setOfferViewMode(mode) {
    offerViewMode.value = mode === "board" ? "board" : "list";
    refreshOffers();
  }

  function applyOfferListFilters() {
    offerListPagination.page = 1;
    refreshOffers();
  }

  function resetOfferListFilters() {
    offerPresetKey.value = "default";
    writeFilterPresetKey(OFFER_PRESET_STORAGE_KEY, "default");
    offerListFilters.query = "";
    offerListFilters.insurance_company = "";
    offerListFilters.status = "";
    offerListFilters.valid_until = "";
    offerListFilters.branch = "";
    offerListFilters.actionable_only = false;
    offerListFilters.gross_min = "";
    offerListFilters.gross_max = "";
    offerListFilters.sort = "modified_desc";
    offerListPagination.pageLength = 20;
    offerListPagination.page = 1;
    void persistOfferPresetStateToServer();
    refreshOffers();
  }

  function hasMeaningfulOfferPresetState(selectedKey, presets) {
    return String(selectedKey || "default") !== "default" || (Array.isArray(presets) && presets.length > 0);
  }

  async function persistOfferPresetStateToServer() {
    try {
      await offerPresetServerWriteResource.submit({
        screen: "offer_list",
        selected_key: offerPresetKey.value,
        custom_presets: offerCustomPresets.value,
      });
    } catch {
      // Keep localStorage as fallback; server sync is best-effort.
    }
  }

  async function hydrateOfferPresetStateFromServer() {
    try {
      const remote = await offerPresetServerReadResource.reload({ screen: "offer_list" });
      const remoteSelectedKey = String(remote?.selected_key || "default");
      const remoteCustomPresets = Array.isArray(remote?.custom_presets) ? remote.custom_presets : [];

      const localHasState = hasMeaningfulOfferPresetState(offerPresetKey.value, offerCustomPresets.value);
      const remoteHasState = hasMeaningfulOfferPresetState(remoteSelectedKey, remoteCustomPresets);

      if (!remoteHasState) {
        if (localHasState) {
          void persistOfferPresetStateToServer();
        }
        return;
      }

      const localSnapshot = JSON.stringify({
        selected_key: offerPresetKey.value,
        custom_presets: offerCustomPresets.value,
      });
      const remoteSnapshot = JSON.stringify({
        selected_key: remoteSelectedKey,
        custom_presets: remoteCustomPresets,
      });

      if (localSnapshot === remoteSnapshot) return;

      offerCustomPresets.value = remoteCustomPresets;
      writeFilterPresetList(OFFER_PRESET_LIST_STORAGE_KEY, offerCustomPresets.value);
      applyOfferPreset(remoteSelectedKey, { refresh: true });
    } catch {
      // Keep local-only behavior on any API error.
    }
  }

  function previousOfferPage() {
    if (offerListPagination.page <= 1) return;
    offerListPagination.page -= 1;
    refreshOfferList();
  }

  function nextOfferPage() {
    if (!offerListHasNextPage.value) return;
    offerListPagination.page += 1;
    refreshOfferList();
  }

  function applyOfferPreset(key, { refresh = true } = {}) {
    const requested = String(key || "default");

    if (isCustomFilterPresetValue(requested)) {
      const customId = extractCustomFilterPresetId(requested);
      const presetRow = offerCustomPresets.value.find((item) => item.id === customId);
      if (!presetRow) {
        applyOfferPreset("default", { refresh });
        return;
      }
      const payload = presetRow.payload || {};
      offerPresetKey.value = requested;
      writeFilterPresetKey(OFFER_PRESET_STORAGE_KEY, requested);
      offerListFilters.query = String(payload.query || "");
      offerListFilters.insurance_company = String(payload.insurance_company || "");
      offerListFilters.status = String(payload.status || "");
      offerListFilters.valid_until = String(payload.valid_until || "");
      offerListFilters.branch = String(payload.branch || "");
      offerListFilters.actionable_only = Boolean(payload.actionable_only);
      offerListFilters.gross_min = payload.gross_min != null ? String(payload.gross_min) : "";
      offerListFilters.gross_max = payload.gross_max != null ? String(payload.gross_max) : "";
      offerListFilters.sort = String(payload.sort || "modified_desc");
      offerListPagination.pageLength = Number(payload.pageLength || 20) || 20;
      offerListPagination.page = 1;
      if (refresh) refreshOffers();
      return;
    }

    const preset = requested;
    offerPresetKey.value = preset;
    writeFilterPresetKey(OFFER_PRESET_STORAGE_KEY, preset);

    offerListFilters.query = "";
    offerListFilters.insurance_company = "";
    offerListFilters.status = "";
    offerListFilters.valid_until = "";
    offerListFilters.branch = "";
    offerListFilters.actionable_only = false;
    offerListFilters.gross_min = "";
    offerListFilters.gross_max = "";
    offerListFilters.sort = "modified_desc";
    offerListPagination.pageLength = 20;

    if (preset === "actionable") {
      offerListFilters.actionable_only = true;
      offerListFilters.sort = "valid_until_asc";
    } else if (preset === "converted") {
      offerListFilters.status = "Converted";
    } else if (preset === "expiring7") {
      offerListFilters.valid_until = isoDateOffset(7);
      offerListFilters.sort = "valid_until_asc";
    }

    offerListPagination.page = 1;
    if (refresh) refreshOffers();
  }

  function onOfferPresetChange() {
    applyOfferPreset(offerPresetKey.value, { refresh: true });
    void persistOfferPresetStateToServer();
  }

  function currentOfferPresetPayload() {
    return {
      query: offerListFilters.query,
      insurance_company: offerListFilters.insurance_company,
      status: offerListFilters.status,
      valid_until: offerListFilters.valid_until,
      branch: offerListFilters.branch,
      actionable_only: Boolean(offerListFilters.actionable_only),
      gross_min: offerListFilters.gross_min,
      gross_max: offerListFilters.gross_max,
      sort: offerListFilters.sort,
      pageLength: offerListPagination.pageLength,
    };
  }

  function saveOfferPreset() {
    const currentCustomId = extractCustomFilterPresetId(offerPresetKey.value);
    const currentCustom = currentCustomId ? offerCustomPresets.value.find((item) => item.id === currentCustomId) : null;
    const initialName = currentCustom?.label || "";
    const name = String(window.prompt(t("savePresetPrompt"), initialName) || "").trim();
    if (!name) return;

    const existing = offerCustomPresets.value.find((item) => item.label.toLowerCase() === name.toLowerCase());
    const targetId = currentCustomId || existing?.id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const nextList = offerCustomPresets.value.filter((item) => item.id !== targetId);
    nextList.push({
      id: targetId,
      label: name,
      payload: currentOfferPresetPayload(),
    });
    offerCustomPresets.value = nextList.sort((a, b) => a.label.localeCompare(b.label, localeCode.value));
    writeFilterPresetList(OFFER_PRESET_LIST_STORAGE_KEY, offerCustomPresets.value);
    offerPresetKey.value = makeCustomFilterPresetValue(targetId);
    writeFilterPresetKey(OFFER_PRESET_STORAGE_KEY, offerPresetKey.value);
    void persistOfferPresetStateToServer();
  }

  function deleteOfferPreset() {
    if (!canDeleteOfferPreset.value) return;
    if (!window.confirm(t("deletePresetConfirm"))) return;
    const customId = extractCustomFilterPresetId(offerPresetKey.value);
    if (!customId) return;
    offerCustomPresets.value = offerCustomPresets.value.filter((item) => item.id !== customId);
    writeFilterPresetList(OFFER_PRESET_LIST_STORAGE_KEY, offerCustomPresets.value);
    applyOfferPreset("default", { refresh: true });
    void persistOfferPresetStateToServer();
  }

  function buildOfferBoardQuickExport() {
    const payload = buildOfferFilterPayload(offerListFilters, branchRequest);
    return {
      filters: payload.filters,
      ...(payload.or_filters ? { or_filters: payload.or_filters } : {}),
      order_by: buildOfferListOrderBy(offerListFilters),
    };
  }

  function buildOfferIdentityFacts(offer, subtleFact, mutedFact, formatDisplayDate, formatCurrency) {
    return [
      subtleFact("record", t("recordId"), offer?.name || "-"),
      mutedFact("offerDate", t("offerDate"), formatDisplayDate(offer?.offer_date)),
    ];
  }

  return {
    applyOfferListFilters,
    applyOfferPreset,
    canDeleteOfferPreset,
    currentOfferPresetPayload,
    deleteOfferPreset,
    downloadOfferExport,
    focusOfferSearch,
    hydrateOfferPresetStateFromServer,
    isListView,
    nextOfferPage,
    onOfferListFilterBarChange,
    onOfferListFilterBarReset,
    onOfferPresetChange,
    offerCompanies,
    offerPresetKey,
    offerPresetOptions,
    offerSortOptions,
    offerStatusOptions,
    previousOfferPage,
    refreshOfferList,
    refreshOffers,
    resetOfferListFilters,
    saveOfferPreset,
    setOfferViewMode,
    buildOfferBoardParams,
    buildOfferBoardQuickExport,
    buildOfferListCountParams,
    buildOfferListParams,
    buildOfferListOrderBy: () => buildOfferListOrderBy(offerListFilters),
    buildOfferListOrderByRaw: buildOfferListOrderBy,
    buildOfferFilterPayload,
    hasMeaningfulOfferPresetState,
    offerListFilters,
    offerListPagination,
  };
}
