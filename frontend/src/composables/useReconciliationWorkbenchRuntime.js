import { computed, onMounted, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";

import { useCustomFilterPresets } from "./useCustomFilterPresets";
import { mutedFact, subtleFact } from "../utils/factItems";
import { getSourcePanelConfig } from "../utils/sourcePanel";
import { navigateToSameOriginPath } from "../utils/safeNavigation";
import { openTabularExport } from "../utils/listExport";

export function useReconciliationWorkbenchRuntime({ t, route, router, authStore, branchStore, accountingStore }) {
  const importDialogEyebrow = computed(() => (unref(authStore.locale) === "tr" ? "Ekstre Önizleme" : "Statement Preview"));
  const actionDialogEyebrow = computed(() => (unref(authStore.locale) === "tr" ? "Mutabakat Aksiyonu" : "Reconciliation Action"));
  const localeCode = computed(() => (unref(authStore.locale) === "tr" ? "tr-TR" : "en-US"));

  const filters = accountingStore.state.filters;

  const syncing = ref(false);
  const reconciling = ref(false);
  const operationError = ref("");
  const bulkActionLoading = ref(false);
  const showImportDialog = ref(false);
  const importLoading = ref(false);
  const importError = ref("");
  const statementImportCsv = ref("");
  const statementImportInsuranceCompany = ref("");
  const statementImportDelimiter = ref(",");
  const statementImportLimit = ref(100);
  const statementImportPreview = ref({ rows: [], summary: {} });

  const workbenchResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.accounting.get_reconciliation_workbench",
    params: buildParams(),
    auto: true,
  });
  const syncResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.accounting.run_sync",
  });
  const runReconciliationResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.accounting.run_reconciliation_job",
  });
  const bulkResolveResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.accounting.bulk_resolve_items",
  });
  const resolveResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.accounting.resolve_item",
  });
  const setValueResource = createResource({
    url: "frappe.client.set_value",
  });
  const previewStatementImportResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.accounting.preview_statement_import",
  });
  const importStatementPreviewResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.accounting.import_statement_preview",
  });

  const workbenchData = computed(() => accountingStore.state.workbench || {});
  const activeFilterCount = computed(() => accountingStore.activeFilterCount);
  const sourceDoctypeOptions = computed(() => accountingStore.sourceDoctypeOptions);
  const rows = computed(() => accountingStore.rows);
  const openRowCount = computed(() => rows.value.filter((row) => String(row?.status || "") === "Open").length);
  const metrics = computed(() => accountingStore.metrics);
  const collectionPreviewRows = computed(() => workbenchData.value.collection_preview?.overdue_rows || []);
  const commissionPreviewRows = computed(() => workbenchData.value.commission_preview?.rows || []);
  const statementImportRows = computed(() => statementImportPreview.value?.rows || []);
  const statementImportSummary = computed(() => statementImportPreview.value?.summary || {});
  const workbenchLoading = computed(() => Boolean(unref(workbenchResource.loading)));
  const workbenchErrorText = computed(() => {
    if (accountingStore.state.error) return accountingStore.state.error;
    const err = unref(workbenchResource.error);
    if (!err) return "";
    if (isPermissionDeniedError(err)) return t("permissionDeniedRead");
    return err?.messages?.join(" ") || err?.message || t("loadError");
  });

  const mismatchOptions = computed(() => [
    { value: "Amount", label: t("mismatchAmount") },
    { value: "Currency", label: t("mismatchCurrency") },
    { value: "Missing External", label: t("mismatchMissingExternal") },
    { value: "Missing Local", label: t("mismatchMissingLocal") },
    { value: "Status", label: t("mismatchStatus") },
    { value: "Other", label: t("mismatchOther") },
  ]);
  const reconciliationSummary = computed(() => {
    const list = rows.value || [];
    return {
      total: list.length,
      matched: list.filter((row) => ["Resolved", "Matched"].includes(String(row?.status || ""))).length,
      pending: list.filter((row) => String(row?.status || "") === "Open").length,
      mismatch: list.filter((row) => Math.abs(Number(row?.difference_try || 0)) > 0).length,
      totalDifference: list.reduce((sum, row) => sum + Math.abs(Number(row?.difference_try || 0)), 0),
    };
  });
  const reconciliationListColumns = computed(() => [
    { key: "reconciliationNo", label: "Mutabakat No", type: "mono" },
    { key: "company", label: "Şirket" },
    { key: "period", label: "Dönem" },
    { key: "totalPolicy", label: "Toplam Poliçe", align: "center" },
    { key: "totalPremium", label: "Toplam Prim", type: "amount", align: "right" },
    { key: "companyStatement", label: "Şirket Bildirimi", type: "amount", align: "right" },
    { key: "difference", label: "Fark", type: "amount", align: "right" },
    { key: "status", label: "Durum", type: "status", domain: "reconciliation" },
    { key: "_actions", label: "Actions", type: "actions", align: "right" },
  ]);
  const reconciliationListRows = computed(() =>
    rows.value.map((row) => {
      const difference = Number(row?.difference_try || 0);
      const accounting = row?.accounting || {};
      return {
        id: row?.name,
        name: row?.name,
        reconciliationNo: row?.name || "-",
        company: accounting.insurance_company || row?.insurance_company || "-",
        period: deriveReconciliationPeriod(row),
        totalPolicy: accounting.policy ? "1" : "0",
        totalPremium: formatMoney(row?.local_amount_try || 0),
        companyStatement: formatMoney(row?.external_amount_try || 0),
        difference: formatMoney(Math.abs(difference)),
        difference_class: difference > 0 ? "text-green-600" : difference < 0 ? "text-amber-700" : "text-gray-600",
        status: normalizeReconciliationStatus(row?.status, difference),
        _actions: buildReconciliationRowActions(row),
      };
    })
  );

  const showActionDialog = ref(false);
  const actionDialogMode = ref("Note");
  const actionDialogRow = ref(null);
  const actionDialogNotes = ref("");
  const actionDialogLoading = ref(false);
  const actionDialogError = ref("");
  const actionDialogLabels = computed(() => ({
    cancel: unref(authStore.locale) === "tr" ? "İptal" : "Cancel",
    save:
      actionDialogMode.value === "Matched"
        ? t("actionSaveResolve")
        : actionDialogMode.value === "Ignored"
          ? t("actionSaveIgnore")
          : t("actionSaveNote"),
  }));
  const reconciliationActionDialogTitle = computed(() => {
    if (actionDialogMode.value === "Matched") return t("actionResolveTitle");
    if (actionDialogMode.value === "Ignored") return t("actionIgnoreTitle");
    return t("actionNoteTitle");
  });
  const reconciliationActionDialogSubtitle = computed(() => {
    if (actionDialogMode.value === "Matched") return t("actionResolveSubtitle");
    if (actionDialogMode.value === "Ignored") return t("actionIgnoreSubtitle");
    return t("actionNoteSubtitle");
  });
  const importDialogLabels = computed(() => ({
    cancel: unref(authStore.locale) === "tr" ? "İptal" : "Cancel",
    save: unref(authStore.locale) === "tr" ? "Önizleme Oluştur" : "Build Preview",
  }));

  const {
    presetKey,
    presetOptions,
    canDeletePreset,
    applyPreset,
    onPresetChange,
    savePreset,
    deletePreset,
    persistPresetStateToServer,
    hydratePresetStateFromServer,
  } = useCustomFilterPresets({
    screen: "reconciliation_workbench",
    presetStorageKey: "at:reconciliation-workbench:preset",
    presetListStorageKey: "at:reconciliation-workbench:preset-list",
    t,
    getCurrentPayload: currentWorkbenchPresetPayload,
    setFilterStateFromPayload: setWorkbenchFilterStateFromPayload,
    resetFilterState: resetWorkbenchFilterState,
    refresh: reloadWorkbench,
    getSortLocale: () => (unref(authStore.locale) === "tr" ? "tr-TR" : "en-US"),
  });

  function buildParams() {
    const officeBranch = branchStore.requestBranch;
    return {
      status: filters.status || null,
      mismatch_type: filters.mismatchType || null,
      office_branch: officeBranch,
      limit: filters.limit,
    };
  }

  function reloadWorkbench() {
    operationError.value = "";
    workbenchResource.params = buildParams();
    accountingStore.setLocaleCode(localeCode.value);
    accountingStore.setLoading(true);
    accountingStore.clearError();
    return workbenchResource
      .reload()
      .then((result) => {
        accountingStore.setWorkbench(result || {});
        accountingStore.setLoading(false);
        return result;
      })
      .catch((error) => {
        const message = isPermissionDeniedError(error)
          ? t("permissionDeniedRead")
          : error?.messages?.join(" ") || error?.message || t("loadError");
        accountingStore.setWorkbench({});
        accountingStore.setError(message);
        accountingStore.setLoading(false);
        throw error;
      });
  }

  function downloadReconciliationExport(format) {
    openTabularExport({
      permissionDoctypes: ["AT Reconciliation Item"],
      exportKey: "reconciliation_workbench",
      title: t("title"),
      columns: [
        t("source"),
        t("type"),
        t("status"),
        t("localTry"),
        t("externalTry"),
        t("difference"),
        t("accountingEntry"),
        t("resolution"),
        t("noteLabel"),
      ],
      rows: rows.value.map((row) => ({
        [t("source")]: `${row.source_doctype || "-"} / ${row.source_name || "-"}`,
        [t("type")]: row.mismatch_type || "-",
        [t("status")]: row.status || "-",
        [t("localTry")]: formatMoney(row.local_amount_try || 0),
        [t("externalTry")]: formatMoney(row.external_amount_try || 0),
        [t("difference")]: formatMoney(row.difference_try || 0),
        [t("accountingEntry")]: row.accounting_entry || "-",
        [t("resolution")]: row.resolution_action || "-",
        [t("noteLabel")]: row.notes || "-",
      })),
      filters: currentWorkbenchPresetPayload(),
      format,
    });
  }

  function applyWorkbenchFilters() {
    return reloadWorkbench();
  }

  function resetWorkbenchFilterState() {
    accountingStore.resetFilters();
  }

  function currentWorkbenchPresetPayload() {
    return {
      status: filters.status,
      mismatchType: filters.mismatchType,
      sourceQuery: filters.sourceQuery,
      sourceDoctype: filters.sourceDoctype,
      limit: Number(filters.limit) || 50,
    };
  }

  function setWorkbenchFilterStateFromPayload(payload) {
    filters.status = String(payload?.status || "Open");
    filters.mismatchType = String(payload?.mismatchType || "");
    filters.sourceQuery = String(payload?.sourceQuery || "");
    filters.sourceDoctype = String(payload?.sourceDoctype || "");
    filters.limit = Number(payload?.limit || 50) || 50;
  }

  function applyRouteFilters() {
    const status = String(route.query?.status || "").trim();
    const sourceQuery = String(route.query?.sourceQuery || "").trim();
    const sourceDoctype = String(route.query?.sourceDoctype || "").trim();
    const hasRouteFilters = Boolean(status || sourceQuery || sourceDoctype);
    if (!hasRouteFilters) return false;

    filters.status = status || "Open";
    filters.sourceQuery = sourceQuery;
    filters.sourceDoctype = sourceDoctype;
    return true;
  }

  function resetWorkbenchFilters() {
    applyPreset("default", { refresh: false });
    void persistPresetStateToServer();
    return reloadWorkbench();
  }

  async function runSync() {
    syncing.value = true;
    operationError.value = "";
    try {
      await syncResource.submit({ limit: 250 });
      await reloadWorkbench();
    } catch (error) {
      operationError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("actionFailed");
    } finally {
      syncing.value = false;
    }
  }

  async function runReconciliation() {
    reconciling.value = true;
    operationError.value = "";
    try {
      await runReconciliationResource.submit({ limit: 400 });
      await reloadWorkbench();
    } catch (error) {
      operationError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("actionFailed");
    } finally {
      reconciling.value = false;
    }
  }

  async function runBulkResolution(resolutionAction) {
    const itemNames = rows.value
      .filter((row) => String(row?.status || "") === "Open")
      .map((row) => row.name)
      .filter(Boolean);
    if (!itemNames.length) return;

    const confirmText = resolutionAction === "Ignored" ? t("bulkIgnoreConfirm") : t("bulkResolveConfirm");
    if (!globalThis.confirm?.(confirmText)) return;

    bulkActionLoading.value = true;
    operationError.value = "";
    try {
      await bulkResolveResource.submit({
        item_names: itemNames,
        resolution_action: resolutionAction,
      });
      await reloadWorkbench();
    } catch (error) {
      operationError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("actionFailed");
    } finally {
      bulkActionLoading.value = false;
    }
  }

  function openImportDialog() {
    showImportDialog.value = true;
    importError.value = "";
  }

  function closeImportDialog() {
    if (importLoading.value) return;
    showImportDialog.value = false;
    importError.value = "";
  }

  async function previewStatementImport() {
    importLoading.value = true;
    importError.value = "";
    try {
      const result = await previewStatementImportResource.submit({
        csv_text: statementImportCsv.value,
        office_branch: branchStore.requestBranch || null,
        insurance_company: statementImportInsuranceCompany.value || null,
        delimiter: statementImportDelimiter.value || ",",
        limit: statementImportLimit.value || 100,
      });
      statementImportPreview.value = result || { rows: [], summary: {} };
    } catch (error) {
      importError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("actionFailed");
    } finally {
      importLoading.value = false;
    }
  }

  async function importStatementPreviewRows() {
    importLoading.value = true;
    importError.value = "";
    try {
      await importStatementPreviewResource.submit({
        csv_text: statementImportCsv.value,
        office_branch: branchStore.requestBranch || null,
        insurance_company: statementImportInsuranceCompany.value || null,
        delimiter: statementImportDelimiter.value || ",",
        limit: statementImportLimit.value || 100,
      });
      showImportDialog.value = false;
      statementImportPreview.value = { rows: [], summary: {} };
      await reloadWorkbench();
    } catch (error) {
      importError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("actionFailed");
    } finally {
      importLoading.value = false;
    }
  }

  async function resolveRow(row, action) {
    operationError.value = "";
    await resolveResource.submit({
      item_name: row.name,
      resolution_action: action,
    });
    await reloadWorkbench();
  }

  function openReconciliationActionDialog(row, mode = "Note") {
    actionDialogRow.value = row || null;
    actionDialogMode.value = mode || "Note";
    actionDialogNotes.value = row?.notes || "";
    actionDialogError.value = "";
    showActionDialog.value = true;
  }

  function closeReconciliationActionDialog(force = false) {
    if (!force && actionDialogLoading.value) return;
    showActionDialog.value = false;
    actionDialogError.value = "";
    actionDialogRow.value = null;
    actionDialogMode.value = "Note";
    actionDialogNotes.value = "";
  }

  async function submitReconciliationActionDialog() {
    if (!actionDialogRow.value?.name || actionDialogLoading.value) return;
    actionDialogLoading.value = true;
    actionDialogError.value = "";
    try {
      if (actionDialogMode.value === "Matched" || actionDialogMode.value === "Ignored") {
        await resolveResource.submit({
          item_name: actionDialogRow.value.name,
          resolution_action: actionDialogMode.value,
          notes: String(actionDialogNotes.value || "").trim() || null,
        });
      } else {
        await setValueResource.submit({
          doctype: "AT Reconciliation Item",
          name: actionDialogRow.value.name,
          fieldname: "notes",
          value: String(actionDialogNotes.value || "").trim() || null,
        });
      }
      await reloadWorkbench();
      closeReconciliationActionDialog(true);
    } catch (error) {
      actionDialogError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("actionFailed");
    } finally {
      actionDialogLoading.value = false;
    }
  }

  function isPermissionDeniedError(error) {
    const status = Number(
      error?.statusCode ?? error?.status ?? error?.httpStatus ?? error?.response?.status ?? 0
    );
    const text = String(error?.message || error?.messages?.join(" ") || error?.exc_type || "").toLowerCase();
    return (
      status === 401 ||
      status === 403 ||
      text.includes("permission") ||
      text.includes("not permitted") ||
      text.includes("not authorized")
    );
  }

  function sourcePanelUrl(row) {
    return getSourcePanelConfig(row?.source_doctype, row?.source_name)?.url || "";
  }

  function canOpenSourcePanel(row) {
    return Boolean(sourcePanelUrl(row));
  }

  function openSourcePanel(row) {
    const url = sourcePanelUrl(row);
    if (!url) return;
    navigateToSameOriginPath(url);
  }

  function sourcePanelLabel(row) {
    const labelKey = getSourcePanelConfig(row?.source_doctype, row?.source_name)?.labelKey;
    return labelKey ? t(labelKey) : t("openPanel");
  }

  function mismatchTypeLabel(type) {
    if (type === "Amount") return t("mismatchAmount");
    if (type === "Currency") return t("mismatchCurrency");
    if (type === "Missing External") return t("mismatchMissingExternal");
    if (type === "Missing Local") return t("mismatchMissingLocal");
    if (type === "Status") return t("mismatchStatus");
    if (type === "Other") return t("mismatchOther");
    return type || "-";
  }

  function sourceRowFacts(row) {
    return [subtleFact("externalRef", t("externalRef"), row?.accounting?.external_ref || "-")];
  }

  function mismatchTypeFacts(row) {
    return [mutedFact("mismatchType", t("type"), mismatchTypeLabel(row?.mismatch_type))];
  }

  function normalizeReconciliationStatus(status, difference) {
    const normalizedStatus = String(status || "");
    if (normalizedStatus === "Resolved") return "Matched";
    if (normalizedStatus === "Ignored") return "Cancelled";
    if (normalizedStatus === "Open" && Math.abs(Number(difference || 0)) > 0) return "Mismatch";
    if (normalizedStatus === "Open") return "Pending";
    return normalizedStatus || "Pending";
  }

  function deriveReconciliationPeriod(row) {
    const rawValue =
      row?.resolved_on ||
      row?.posting_date ||
      row?.modified ||
      row?.creation ||
      row?.accounting?.posting_date ||
      "";
    const trimmedValue = String(rawValue || "").trim();
    if (!trimmedValue) return "-";
    const parsedDate = new Date(trimmedValue);
    if (Number.isNaN(parsedDate.getTime())) return trimmedValue.slice(0, 7);
    return new Intl.DateTimeFormat(localeCode.value, { month: "short", year: "numeric" }).format(parsedDate);
  }

  function buildReconciliationRowActions(row) {
    const actions = [];
    actions.push({
      key: `${row?.name}-detail`,
      label: "Kayıt Detayı",
      variant: "primary",
      onClick: () => openReconciliationDetail(row),
    });
    if (String(row?.status || "") === "Open") {
      actions.push({
        key: `${row?.name}-match`,
        label: t("resolve"),
        variant: "outline",
        onClick: () => openReconciliationActionDialog(row, "Matched"),
      });
      actions.push({
        key: `${row?.name}-ignore`,
        label: t("ignore"),
        variant: "outline",
        onClick: () => openReconciliationActionDialog(row, "Ignored"),
      });
    }
    actions.push({
      key: `${row?.name}-note`,
      label: t("addNote"),
      variant: "outline",
      onClick: () => openReconciliationActionDialog(row, "Note"),
    });
    return actions;
  }

  function handleReconciliationRowClick(row) {
    if (!row?.name) return;
    const sourceRow = rows.value.find((item) => item?.name === row.name);
    if (sourceRow && canOpenSourcePanel(sourceRow)) openSourcePanel(sourceRow);
  }

  function openReconciliationDetail(row) {
    if (!row?.name) return;
    router.push({ name: "reconciliation-detail", params: { name: row.name } });
  }

  function formatMoney(value) {
    try {
      return new Intl.NumberFormat(localeCode.value, {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 2,
      }).format(Number(value || 0));
    } catch {
      return String(value ?? 0);
    }
  }

  onMounted(() => {
    accountingStore.setLocaleCode(localeCode.value);
    applyPreset(presetKey.value, { refresh: false });
    applyRouteFilters();
    void reloadWorkbench();
    void hydratePresetStateFromServer();
  });

  watch(
    () => [route.query?.status, route.query?.sourceQuery, route.query?.sourceDoctype],
    () => {
      if (!applyRouteFilters()) return;
      void reloadWorkbench();
    }
  );

  watch(
    () => branchStore.selected,
    () => {
      accountingStore.setLocaleCode(localeCode.value);
      void reloadWorkbench();
    }
  );

  return {
    importDialogEyebrow,
    actionDialogEyebrow,
    filters,
    presetKey,
    presetOptions,
    canDeletePreset,
    activeFilterCount,
    sourceDoctypeOptions,
    rows,
    openRowCount,
    metrics,
    collectionPreviewRows,
    commissionPreviewRows,
    statementImportRows,
    statementImportSummary,
    syncing,
    reconciling,
    operationError,
    bulkActionLoading,
    showImportDialog,
    importLoading,
    importError,
    statementImportCsv,
    statementImportInsuranceCompany,
    statementImportDelimiter,
    statementImportLimit,
    statementImportPreview,
    workbenchLoading,
    workbenchErrorText,
    mismatchOptions,
    reconciliationSummary,
    reconciliationListColumns,
    reconciliationListRows,
    showActionDialog,
    actionDialogMode,
    actionDialogRow,
    actionDialogNotes,
    actionDialogLoading,
    actionDialogError,
    actionDialogLabels,
    reconciliationActionDialogTitle,
    reconciliationActionDialogSubtitle,
    importDialogLabels,
    reloadWorkbench,
    downloadReconciliationExport,
    applyWorkbenchFilters,
    resetWorkbenchFilters,
    runSync,
    runReconciliation,
    runBulkResolution,
    openImportDialog,
    closeImportDialog,
    previewStatementImport,
    importStatementPreviewRows,
    resolveRow,
    openReconciliationActionDialog,
    closeReconciliationActionDialog,
    submitReconciliationActionDialog,
    handleReconciliationRowClick,
    openReconciliationDetail,
    applyPreset,
    onPresetChange,
    savePreset,
    deletePreset,
    persistPresetStateToServer,
    hydratePresetStateFromServer,
    formatMoney,
    sourceRowFacts,
    mismatchTypeFacts,
    sourcePanelLabel,
    canOpenSourcePanel,
    openSourcePanel,
    normalizeReconciliationStatus,
    deriveReconciliationPeriod,
    buildReconciliationRowActions,
  };
}
