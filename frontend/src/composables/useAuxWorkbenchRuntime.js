import { computed, reactive, ref, unref, watch, onMounted } from "vue";
import { createResource } from "frappe-ui";

import {
  writeFilterPresetKey,
} from "../utils/filterPresetState";
import { getQuickCreateConfig } from "../config/quickCreateRegistry";
import { getSourcePanelConfig } from "../utils/sourcePanel";
import { navigateToSameOriginPath } from "../utils/safeNavigation";
import { openDocumentInNewTab } from "../utils/documentOpen";
import { useAuxWorkbenchPresets } from "./useAuxWorkbenchPresets";
import { useAtDocumentLifecycle } from "./useAtDocumentLifecycle";

const OFFICE_BRANCH_FILTER_DOCTYPES = new Set([
  "AT Renewal Task",
  "AT Task",
  "AT Accounting Entry",
  "AT Notification Draft",
  "AT Notification Outbox",
]);
const OFFICE_BRANCH_LOOKUP_DOCTYPES = new Set(["AT Customer", "AT Policy", "AT Accounting Entry"]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function useAuxWorkbenchRuntime({ config, activeLocale, authStore, branchStore, route, router }) {
  const localeCode = computed(() => (String(unref(activeLocale) || "").trim() === "tr" ? "tr-TR" : "en-US"));
  const documentLifecycleLabels = computed(() => {
    const isTr = String(unref(activeLocale) || "").trim() === "tr";
    return isTr
      ? {
          archiveConfirm: "Bu doküman arşivlensin mi?",
          restoreConfirm: "Bu doküman geri yüklensin mi?",
          permanentDeleteConfirm: "Bu doküman ve bağlı dosyası kalıcı olarak silinecek. Devam edilsin mi?",
        }
      : {
          archiveConfirm: "Archive this document?",
          restoreConfirm: "Restore this document?",
          permanentDeleteConfirm: "This document and its linked file will be permanently deleted. Continue?",
        };
  });

  const draft = reactive({ query: "", sort: config.defaultSort || "modified desc", pageLength: 20 });
  const filters = reactive({ query: "", sort: config.defaultSort || "modified desc" });
  for (const fd of config.filterDefs || []) {
    draft[fd.key] = "";
    filters[fd.key] = "";
  }

  const pagination = reactive({ page: 1, pageLength: 20, total: 0 });
  const loadError = reactive({ text: "" });
  const showAuxQuickCreateDialog = ref(false);
  const rowActionBusyName = ref("");
  const { actionBusyName: documentLifecycleBusyName, canArchiveDocument, canRestoreDocument, canPermanentDeleteDocument, archiveDocument, restoreDocument, permanentDeleteDocument } =
    useAtDocumentLifecycle({
      authStore,
      labels: documentLifecycleLabels.value,
    });

  const listResource = createResource({ url: "frappe.client.get_list", auto: false });
  const countResource = createResource({ url: "frappe.client.get_count", auto: false });
  const presetServerReadResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.filter_presets.get_filter_preset_state",
    auto: false,
  });
  const presetServerWriteResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.filter_presets.set_filter_preset_state",
    auto: false,
  });
  const sendDraftNowRowResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.send_draft_now",
    auto: false,
  });
  const retryOutboxRowResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.retry_outbox_item",
    auto: false,
  });
  const requeueOutboxRowResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.requeue_outbox_item",
    auto: false,
  });
  const taskRowMutationResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.quick_create.update_quick_aux_record",
    auto: false,
  });
  const auxQuickCustomerResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
    params: { doctype: "AT Customer", fields: ["name", "full_name"], order_by: "modified desc", limit_page_length: 500 },
  });
  const auxQuickPolicyResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
    params: { doctype: "AT Policy", fields: ["name", "policy_no", "customer"], order_by: "modified desc", limit_page_length: 500 },
  });
  const auxQuickTemplateResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
    params: {
      doctype: "AT Notification Template",
      fields: ["name", "template_key", "event_key", "channel", "language", "is_active"],
      filters: { is_active: 1 },
      order_by: "template_key asc",
      limit_page_length: 500,
    },
  });
  const auxQuickInsuranceCompanyResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
    params: {
      doctype: "AT Insurance Company",
      fields: ["name", "company_name", "company_code"],
      filters: { is_active: 1 },
      order_by: "company_name asc",
      limit_page_length: 500,
    },
  });
  const auxQuickSalesEntityResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
    params: { doctype: "AT Sales Entity", fields: ["name", "full_name", "entity_type"], order_by: "full_name asc", limit_page_length: 500 },
  });
  const auxQuickAccountingEntryResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
    params: { doctype: "AT Accounting Entry", fields: ["name", "source_doctype", "source_name", "status"], order_by: "modified desc", limit_page_length: 500 },
  });

  const PRESET_STORAGE_KEY = `at:aux:${config.key}:preset`;
  const PRESET_LIST_STORAGE_KEY = `at:aux:${config.key}:preset-list`;

  const auxQuickCreate = computed(() => config.quickCreate || null);

  const showWorkbenchUploadModal = ref(false);

  const resourceValue = (resource, fallback = null) => {
    const value = unref(resource?.data);
    return value == null ? fallback : value;
  };

  const rows = computed(() => asArray(resourceValue(listResource, [])));
  const snapshotRows = computed(() => (config.key === "customer-segment-snapshots" ? rows.value : []));
  const accessLogRows = computed(() => (config.key === "access-logs" ? rows.value : []));
  const fileRows = computed(() => (config.key === "files" ? rows.value : []));
  const reminderRows = computed(() => (config.key === "reminders" ? rows.value : []));
  const canExportSnapshotRows = computed(() => config.key === "customer-segment-snapshots" && snapshotRows.value.length > 0);
  const isLoading = computed(() => Boolean(unref(listResource.loading) || unref(countResource.loading)));
  const totalPages = computed(() => Math.max(1, Math.ceil((pagination.total || 0) / (pagination.pageLength || 1))));
  const hasNextPage = computed(() => pagination.page < totalPages.value);
  const startRow = computed(() => (pagination.total ? (pagination.page - 1) * pagination.pageLength + 1 : 0));
  const endRow = computed(() => (pagination.total ? Math.min(pagination.total, pagination.page * pagination.pageLength) : 0));
  const activeFilterCount = computed(() => {
    let count = filters.query ? 1 : 0;
    for (const fd of config.filterDefs || []) if (String(filters[fd.key] ?? "").trim() !== "") count += 1;
    return count;
  });

  function currentPresetPayload() {
    const payload = {
      query: filters.query,
      sort: filters.sort,
      pageLength: pagination.pageLength,
    };
    for (const fd of config.filterDefs || []) {
      payload[fd.key] = String(filters[fd.key] ?? "").trim();
    }
    return payload;
  }

  function setFilterStateFromPayload(payload = {}) {
    const defaultFilters = config.defaultFilters || {};

    filters.query = String(payload.query ?? defaultFilters.query ?? "");
    draft.query = filters.query;

    const sortValue = String(payload.sort || defaultFilters.sort || config.defaultSort || "modified desc");
    filters.sort = sortValue;
    draft.sort = sortValue;

    const pageLength = Number(payload.pageLength || 20) || 20;
    pagination.pageLength = pageLength;
    draft.pageLength = pageLength;

    for (const fd of config.filterDefs || []) {
      const nextValue = Object.prototype.hasOwnProperty.call(payload, fd.key) ? payload[fd.key] : defaultFilters[fd.key];
      const normalized =
        fd.type === "number" && nextValue !== "" && nextValue != null
          ? String(nextValue)
          : nextValue == null
            ? ""
            : String(nextValue);
      filters[fd.key] = normalized;
      draft[fd.key] = normalized;
    }
  }

  function buildOrFilters() {
    const q = String(filters.query || "").trim();
    if (!q || !Array.isArray(config.searchFields) || !config.searchFields.length) return null;
    const like = `%${q}%`;
    return config.searchFields.map((f) => [config.doctype, f, "like", like]);
  }

  function buildFilters() {
    const out = {};
    const officeBranch = branchStore.requestBranch || "";
    if (officeBranch && OFFICE_BRANCH_FILTER_DOCTYPES.has(config.doctype)) {
      out.office_branch = officeBranch;
    }
    for (const fd of config.filterDefs || []) {
      const raw = String(filters[fd.key] ?? "").trim();
      if (raw === "") continue;
      if (fd.mode === "like") out[fd.field] = ["like", `%${raw}%`];
      else if (fd.type === "number") out[fd.field] = Number(raw);
      else if (fd.type === "select" && (fd.field === "is_active" || fd.field === "is_private")) out[fd.field] = Number(raw);
      else out[fd.field] = raw;
    }
    return out;
  }

  function buildOfficeBranchLookupFilters(doctype) {
    const officeBranch = branchStore.requestBranch || "";
    if (!officeBranch || !OFFICE_BRANCH_LOOKUP_DOCTYPES.has(String(doctype || "").trim())) {
      return {};
    }
    return { office_branch: officeBranch };
  }

  function buildListParams() {
    const officeBranch = branchStore.requestBranch || "";
    const out = {
      doctype: config.doctype,
      fields: config.listFields,
      filters: buildFilters(),
      or_filters: buildOrFilters() || undefined,
      order_by: filters.sort || config.defaultSort || "modified desc",
      limit_start: (pagination.page - 1) * pagination.pageLength,
      limit_page_length: pagination.pageLength,
    };
    if (officeBranch && OFFICE_BRANCH_FILTER_DOCTYPES.has(config.doctype)) {
      out.office_branch = officeBranch;
    }
    return out;
  }

  function buildCountParams() {
    const officeBranch = branchStore.requestBranch || "";
    const out = {
      doctype: config.doctype,
      filters: buildFilters(),
      or_filters: buildOrFilters() || undefined,
    };
    if (officeBranch && OFFICE_BRANCH_FILTER_DOCTYPES.has(config.doctype)) {
      out.office_branch = officeBranch;
    }
    return out;
  }

  async function refreshList() {
    loadError.text = "";
    const [rowsResult, countResult] = await Promise.allSettled([
      listResource.reload(buildListParams()),
      countResource.reload(buildCountParams()),
    ]);
    if (rowsResult.status === "fulfilled") {
      const payload = rowsResult.value?.message ?? rowsResult.value;
      listResource.setData(Array.isArray(payload) ? payload : []);
    } else {
      listResource.setData([]);
      loadError.text = rowsResult.reason?.messages?.[0] || rowsResult.reason?.message || String(rowsResult.reason || "");
    }
    if (countResult.status === "fulfilled") {
      const c = Number(countResult.value?.message ?? countResult.value ?? 0);
      pagination.total = Number.isFinite(c) ? c : rows.value.length;
    } else {
      pagination.total = rows.value.length;
    }
  }

  function syncRouteFilters({ refresh = true } = {}) {
    const payload = currentPresetPayload();
    let changed = false;

    if (route.query.query != null) {
      const queryValue = String(route.query.query || "").trim();
      if (payload.query !== queryValue) {
        payload.query = queryValue;
        changed = true;
      }
    }

    for (const fd of config.filterDefs || []) {
      if (route.query[fd.key] == null) continue;
      const nextValue = String(route.query[fd.key] || "").trim();
      if (String(payload[fd.key] || "") !== nextValue) {
        payload[fd.key] = nextValue;
        changed = true;
      }
    }

    if (!changed) return;
    setFilterStateFromPayload(payload);
    pagination.page = 1;
    if (refresh) refreshList();
  }

  function applyFilters() {
    filters.query = draft.query || "";
    filters.sort = draft.sort || config.defaultSort || "modified desc";
    pagination.pageLength = Number(draft.pageLength || 20);
    for (const fd of config.filterDefs || []) filters[fd.key] = draft[fd.key] || "";
    pagination.page = 1;
    refreshList();
  }

  function resetFilters() {
    presetKey.value = "default";
    writeFilterPresetKey(PRESET_STORAGE_KEY, "default");
    setFilterStateFromPayload(config.defaultFilters || {});
    pagination.page = 1;
    void persistPresetStateToServer();
    refreshList();
  }

  function previousPage() {
    if (pagination.page <= 1) return;
    pagination.page -= 1;
    refreshList();
  }

  function nextPage() {
    if (!hasNextPage.value) return;
    pagination.page += 1;
    refreshList();
  }

  async function ensureAuxQuickOptionSources() {
    const registryKey = auxQuickCreate.value?.registryKey;
    if (!registryKey) return;
    auxQuickCustomerResource.params = {
      ...auxQuickCustomerResource.params,
      filters: buildOfficeBranchLookupFilters("AT Customer"),
    };
    auxQuickPolicyResource.params = {
      ...auxQuickPolicyResource.params,
      filters: buildOfficeBranchLookupFilters("AT Policy"),
    };
    auxQuickAccountingEntryResource.params = {
      ...auxQuickAccountingEntryResource.params,
      filters: buildOfficeBranchLookupFilters("AT Accounting Entry"),
    };
    if (["renewal_task", "notification_draft", "communication_message", "accounting_entry"].includes(registryKey)) {
      await Promise.allSettled([auxQuickCustomerResource.reload(), auxQuickPolicyResource.reload()]);
    }
    if (["notification_draft", "communication_message"].includes(registryKey)) {
      await auxQuickTemplateResource.reload().catch(() => {});
    }
    if (["branch_master", "accounting_entry"].includes(registryKey)) {
      await auxQuickInsuranceCompanyResource.reload().catch(() => {});
    }
    if (["sales_entity_master", "accounting_entry"].includes(registryKey)) {
      await auxQuickSalesEntityResource.reload().catch(() => {});
    }
    if (["reconciliation_item"].includes(registryKey)) {
      await auxQuickAccountingEntryResource.reload().catch(() => {});
    }
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function addDaysIso(days) {
    const dt = new Date();
    dt.setDate(dt.getDate() + Number(days || 0));
    return dt.toISOString().slice(0, 10);
  }

  async function prepareAuxQuickCreateDialog({ form }) {
    await ensureAuxQuickOptionSources();
    if (auxQuickCreate.value?.registryKey === "renewal_task") {
      if (!form.renewal_date) form.renewal_date = addDaysIso(30);
      if (!form.due_date) form.due_date = addDaysIso(15);
    }
    if (auxQuickCreate.value?.registryKey === "notification_draft") {
      if (!form.language) form.language = String(unref(activeLocale) || "en").trim() === "tr" ? "tr" : "en";
      if (!form.status) form.status = "Draft";
    }
  }

  async function handleAuxQuickCreateAfterSubmit({ recordName, openAfter }) {
    if (!openAfter || !recordName) return;
    const registryCfg = getQuickCreateConfig(auxQuickCreate.value?.registryKey || "");
    if (registryCfg?.openRouteName) return;
    await router.push({ name: `${config.key}-detail`, params: { name: recordName } }).catch(() => {});
  }

  async function runRowQuickAction(rowName, resource, payloadBuilder) {
    if (!rowName || !resource || typeof payloadBuilder !== "function") return;
    if (rowActionBusyName.value) return;
    rowActionBusyName.value = rowName;
    try {
      await resource.submit(payloadBuilder(rowName));
      await refreshList();
    } finally {
      rowActionBusyName.value = "";
    }
  }

  function canSendDraftNowRow(row) {
    return (
      config.key === "notification-drafts" &&
      authStore.can(["actions", "communication", "sendDraftNow"]) &&
      row?.name &&
      row?.status !== "Sent"
    );
  }

  function canRetryOutboxRow(row) {
    return (
      config.key === "notification-outbox" &&
      authStore.can(["actions", "communication", "retryOutbox"]) &&
      row?.name &&
      ["Failed", "Dead"].includes(String(row.status || ""))
    );
  }

  function canRequeueOutboxRow(row) {
    return (
      config.key === "notification-outbox" &&
      authStore.can(["actions", "communication", "requeueOutbox"]) &&
      row?.name &&
      ["Queued", "Processing"].includes(String(row.status || ""))
    );
  }

  function canOpenCommunicationContextRow(row) {
    return ["notification-drafts", "notification-outbox", "reminders", "tasks", "ownership-assignments"].includes(config.key) && row?.name;
  }

  function canStartTaskRow(row) {
    return config.key === "tasks" && row?.name && String(row.status || "") === "Open";
  }

  function canBlockTaskRow(row) {
    return config.key === "tasks" && row?.name && ["Open", "In Progress"].includes(String(row.status || ""));
  }

  function canCompleteTaskRow(row) {
    return config.key === "tasks" && row?.name && ["Open", "In Progress", "Blocked"].includes(String(row.status || ""));
  }

  function canCancelTaskRow(row) {
    return config.key === "tasks" && row?.name && ["Open", "In Progress", "Blocked"].includes(String(row.status || ""));
  }

  function canCompleteReminderRow(row) {
    return config.key === "reminders" && row?.name && String(row.status || "") === "Open";
  }

  function canCancelReminderRow(row) {
    return config.key === "reminders" && row?.name && String(row.status || "") === "Open";
  }

  function canStartOwnershipAssignmentRow(row) {
    return config.key === "ownership-assignments" && row?.name && String(row.status || "") === "Open";
  }

  function canBlockOwnershipAssignmentRow(row) {
    return config.key === "ownership-assignments" && row?.name && ["Open", "In Progress"].includes(String(row.status || ""));
  }

  function canCompleteOwnershipAssignmentRow(row) {
    return config.key === "ownership-assignments" && row?.name && ["Open", "In Progress", "Blocked"].includes(String(row.status || ""));
  }

  async function sendDraftNowRow(row) {
    if (!authStore.can(["actions", "communication", "sendDraftNow"])) return;
    await runRowQuickAction(row?.name, sendDraftNowRowResource, (name) => ({ draft_name: name }));
  }

  async function retryOutboxRow(row) {
    if (!authStore.can(["actions", "communication", "retryOutbox"])) return;
    await runRowQuickAction(row?.name, retryOutboxRowResource, (name) => ({ outbox_name: name }));
  }

  async function requeueOutboxRow(row) {
    if (!authStore.can(["actions", "communication", "requeueOutbox"])) return;
    await runRowQuickAction(row?.name, requeueOutboxRowResource, (name) => ({ outbox_name: name }));
  }

  function openCommunicationContextRow(row) {
    if (!canOpenCommunicationContextRow(row)) return;
    router.push({
      name: "communication-center",
      query: {
        reference_doctype: config.doctype,
        reference_name: row.name,
        reference_label: row.event_key || row.name,
        return_to: route.fullPath || route.path,
      },
    });
  }

  async function startTaskRow(row) {
    await runRowQuickAction(row?.name, taskRowMutationResource, (name) => ({
      doctype: "AT Task",
      name,
      data: { status: "In Progress" },
    }));
  }

  async function blockTaskRow(row) {
    await runRowQuickAction(row?.name, taskRowMutationResource, (name) => ({
      doctype: "AT Task",
      name,
      data: { status: "Blocked" },
    }));
  }

  async function completeTaskRow(row) {
    await runRowQuickAction(row?.name, taskRowMutationResource, (name) => ({
      doctype: "AT Task",
      name,
      data: { status: "Done" },
    }));
  }

  async function cancelTaskRow(row) {
    await runRowQuickAction(row?.name, taskRowMutationResource, (name) => ({
      doctype: "AT Task",
      name,
      data: { status: "Cancelled" },
    }));
  }

  async function completeReminderRow(row) {
    await runRowQuickAction(row?.name, taskRowMutationResource, (name) => ({
      doctype: "AT Reminder",
      name,
      data: { status: "Done" },
    }));
  }

  async function cancelReminderRow(row) {
    await runRowQuickAction(row?.name, taskRowMutationResource, (name) => ({
      doctype: "AT Reminder",
      name,
      data: { status: "Cancelled" },
    }));
  }

  async function startOwnershipAssignmentRow(row) {
    await runRowQuickAction(row?.name, taskRowMutationResource, (name) => ({
      doctype: "AT Ownership Assignment",
      name,
      data: { status: "In Progress" },
    }));
  }

  async function blockOwnershipAssignmentRow(row) {
    await runRowQuickAction(row?.name, taskRowMutationResource, (name) => ({
      doctype: "AT Ownership Assignment",
      name,
      data: { status: "Blocked" },
    }));
  }

  async function completeOwnershipAssignmentRow(row) {
    await runRowQuickAction(row?.name, taskRowMutationResource, (name) => ({
      doctype: "AT Ownership Assignment",
      name,
      data: { status: "Done" },
    }));
  }

  function openDetail(row) {
    router.push({ name: `${config.key}-detail`, params: { name: row.name } });
  }

  function panelCfg(row) {
    if (!config.panelRef) return null;
    return getSourcePanelConfig(row?.[config.panelRef.doctypeField], row?.[config.panelRef.nameField]);
  }

  function panelCfgForRow(row) {
    if (config.key === "access-logs") {
      return getSourcePanelConfig(row?.reference_doctype, row?.reference_name);
    }
    return panelCfg(row);
  }

  function openPanel(row) {
    const cfg = panelCfgForRow(row);
    if (!cfg?.url) return;
    navigateToSameOriginPath(cfg.url);
  }

  function canOpenDocumentRow(row) {
    if (!["files", "at-documents"].includes(String(config.key || ""))) return false;
    const hasDirect = Boolean(String(row?.file_url || row?.url || "").trim());
    const hasRef = Boolean(String(row?.file || "").trim());
    return hasDirect || hasRef;
  }

  async function openDocument(row) {
    if (!canOpenDocumentRow(row)) return;
    const opened = await openDocumentInNewTab(row, {
      referenceDoctype: config.key === "at-documents" ? "AT Document" : "File",
      referenceName: String(row?.name || ""),
    });
    if (opened) return;
    const locale = String(unref(activeLocale) || "en").trim();
    window.alert(locale === "tr" ? "Dosya bağlantısı bulunamadı" : "File link not found");
  }

  function canArchiveDocumentRow(row) {
    return config.key === "at-documents" && canArchiveDocument(row);
  }

  function canRestoreDocumentRow(row) {
    return config.key === "at-documents" && canRestoreDocument(row);
  }

  function canPermanentDeleteDocumentRow(row) {
    return config.key === "at-documents" && canPermanentDeleteDocument(row);
  }

  async function archiveDocumentRow(row) {
    if (!canArchiveDocumentRow(row)) return;
    await archiveDocument(row, refreshList);
  }

  async function restoreDocumentRow(row) {
    if (!canRestoreDocumentRow(row)) return;
    await restoreDocument(row, refreshList);
  }

  async function permanentDeleteDocumentRow(row) {
    if (!canPermanentDeleteDocumentRow(row)) return;
    await permanentDeleteDocument(row, refreshList);
  }

  function runToolbarAction(action) {
    if (!action || typeof action !== "object") return;
    if (action.capabilityPath && !authStore.can(action.capabilityPath)) return;

    if (action.type === "upload") {
      showWorkbenchUploadModal.value = true;
      return;
    }

    if (action.type === "route" || action.routeName) {
      router.push({
        name: action.routeName,
        params: action.params || undefined,
        query: action.query || undefined,
      }).catch(() => {});
      return;
    }

    if (typeof action.href === "string" && action.href.trim()) {
      navigateToSameOriginPath(action.href);
    }
  }

  const {
    presetKey,
    customPresets,
    presetOptions,
    canDeletePreset,
    applyPreset,
    onPresetChange,
    onPresetModelValue,
    savePreset,
    deletePreset,
    persistPresetStateToServer,
    hydratePresetStateFromServer,
  } = useAuxWorkbenchPresets({
    screenKey: config.key,
    localeCode,
    presetDefs: config.presetDefs || [],
    currentPresetPayload,
    setFilterStateFromPayload,
    refreshList,
  });

  function applyPresetStateFromRoute() {
    syncRouteFilters({ refresh: false });
    applyPreset(presetKey.value, { refresh: false });
  }

  onMounted(() => {
    applyPresetStateFromRoute();
    refreshList();
    void hydratePresetStateFromServer();
  });

  watch(
    () => route.query,
    () => {
      syncRouteFilters();
    },
    { deep: true }
  );
  watch(
    () => branchStore.selected,
    () => {
      pagination.page = 1;
      void refreshList();
    }
  );

    return {
    config,
    activeLocale,
    localeCode,
    draft,
    filters,
    pagination,
    loadError,
    showAuxQuickCreateDialog,
    showWorkbenchUploadModal,
    rowActionBusyName: computed(() => rowActionBusyName.value || documentLifecycleBusyName.value),
    listResource,
    countResource,
    sendDraftNowRowResource,
    retryOutboxRowResource,
    requeueOutboxRowResource,
    taskRowMutationResource,
    auxQuickCustomerResource,
    auxQuickPolicyResource,
    auxQuickTemplateResource,
    auxQuickInsuranceCompanyResource,
    auxQuickSalesEntityResource,
    auxQuickAccountingEntryResource,
    presetKey,
    customPresets,
    presetOptions,
    canDeletePreset,
    applyPreset,
    onPresetChange,
    onPresetModelValue,
    savePreset,
    deletePreset,
    persistPresetStateToServer,
    hydratePresetStateFromServer,
    rows,
    snapshotRows,
    accessLogRows,
    fileRows,
    reminderRows,
    canExportSnapshotRows,
    isLoading,
    auxQuickCreate,
    totalPages,
    hasNextPage,
    startRow,
    endRow,
    activeFilterCount,
    refreshList,
    applyFilters,
    resetFilters,
    previousPage,
    nextPage,
    ensureAuxQuickOptionSources,
    prepareAuxQuickCreateDialog,
    handleAuxQuickCreateAfterSubmit,
    runRowQuickAction,
    canSendDraftNowRow,
    canRetryOutboxRow,
    canRequeueOutboxRow,
    canOpenCommunicationContextRow,
    canStartTaskRow,
    canBlockTaskRow,
    canCompleteTaskRow,
    canCancelTaskRow,
    canCompleteReminderRow,
    canCancelReminderRow,
    canStartOwnershipAssignmentRow,
    canBlockOwnershipAssignmentRow,
    canCompleteOwnershipAssignmentRow,
    sendDraftNowRow,
    retryOutboxRow,
    requeueOutboxRow,
    openCommunicationContextRow,
    startTaskRow,
    blockTaskRow,
    completeTaskRow,
    cancelTaskRow,
    completeReminderRow,
    cancelReminderRow,
    startOwnershipAssignmentRow,
    blockOwnershipAssignmentRow,
    completeOwnershipAssignmentRow,
    openDetail,
    panelCfg,
    panelCfgForRow,
    openPanel,
    canOpenDocumentRow,
    openDocument,
    canArchiveDocumentRow,
    canRestoreDocumentRow,
    canPermanentDeleteDocumentRow,
    archiveDocumentRow,
    restoreDocumentRow,
    permanentDeleteDocumentRow,
    runToolbarAction,
    currentPresetPayload,
    setFilterStateFromPayload,
    buildOrFilters,
    buildFilters,
    buildOfficeBranchLookupFilters,
    buildListParams,
    buildCountParams,
    todayIso,
    addDaysIso,
  };
}
