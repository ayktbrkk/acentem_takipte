import { computed, unref } from "vue";
import { createResource } from "frappe-ui";

import { isPermissionDeniedError, formatMoney as formatMoneyForLocale } from "./reconciliationWorkbench/helpers";
import { useReconciliationWorkbenchFilters } from "./useReconciliationWorkbenchFilters";
import { useReconciliationWorkbenchImport } from "./useReconciliationWorkbenchImport";
import { useReconciliationWorkbenchSummary } from "./useReconciliationWorkbenchSummary";
import { useReconciliationWorkbenchActions } from "./useReconciliationWorkbenchActions";
import { openTabularExport } from "../utils/listExport";

export function useReconciliationWorkbenchRuntime({ t, route, router, authStore, branchStore, accountingStore }) {
  const localeCode = computed(() => (unref(authStore.locale) === "tr" ? "tr-TR" : "en-US"));
  accountingStore.setLocaleCode(localeCode.value);

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

  const rows = computed(() => accountingStore.rows);
  const openRowCount = computed(() => rows.value.filter((row) => String(row?.status || "") === "Open").length);
  const workbenchData = computed(() => accountingStore.state.workbench || {});
  const metrics = computed(() => accountingStore.metrics);
  const workbenchLoading = computed(() => Boolean(unref(workbenchResource.loading)));
  const workbenchErrorText = computed(() => {
    if (accountingStore.state.error) return accountingStore.state.error;
    const err = unref(workbenchResource.error);
    if (!err) return "";
    if (isPermissionDeniedError(err)) return t("permissionDeniedRead");
    return err?.messages?.join(" ") || err?.message || t("loadError");
  });

  function buildParams() {
    const officeBranch = branchStore.requestBranch;
    return {
      status: accountingStore.state.filters.status || null,
      mismatch_type: accountingStore.state.filters.mismatchType || null,
      office_branch: officeBranch,
      limit: accountingStore.state.filters.limit,
    };
  }

  function reloadWorkbench() {
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
    const rowsForExport = rows.value.map((row) => ({
      [t("source")]: `${row.source_doctype || "-"} / ${row.source_name || "-"}`,
      [t("type")]: row.mismatch_type || "-",
      [t("status")]: row.status || "-",
      [t("localTry")]: formatMoneyForLocale(localeCode.value, row.local_amount_try || 0),
      [t("externalTry")]: formatMoneyForLocale(localeCode.value, row.external_amount_try || 0),
      [t("difference")]: formatMoneyForLocale(localeCode.value, row.difference_try || 0),
      [t("accountingEntry")]: row.accounting_entry || "-",
      [t("resolution")]: row.resolution_action || "-",
      [t("noteLabel")]: row.notes || "-",
    }));

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
      rows: rowsForExport,
      filters: {
        status: accountingStore.state.filters.status,
        mismatchType: accountingStore.state.filters.mismatchType,
        sourceQuery: accountingStore.state.filters.sourceQuery,
        sourceDoctype: accountingStore.state.filters.sourceDoctype,
        limit: Number(accountingStore.state.filters.limit) || 50,
      },
      format,
    });
  }

  const filtersUi = useReconciliationWorkbenchFilters({
    t,
    route,
    branchStore,
    accountingStore,
    reloadWorkbench,
    localeCode,
  });

  const actionsUi = useReconciliationWorkbenchActions({
    t,
    router,
    rows,
    reloadWorkbench,
    syncResource,
    runReconciliationResource,
    bulkResolveResource,
    resolveResource,
    setValueResource,
    localeCode,
  });

  const summaryUi = useReconciliationWorkbenchSummary({
    t,
    localeCode,
    workbenchData,
    rows,
    metrics,
    openReconciliationDetail: actionsUi.openReconciliationDetail,
    openReconciliationActionDialog: actionsUi.openReconciliationActionDialog,
  });

  const importUi = useReconciliationWorkbenchImport({
    t,
    branchStore,
    reloadWorkbench,
    previewStatementImportResource,
    importStatementPreviewResource,
    localeCode,
  });

  const mismatchOptions = filtersUi.mismatchOptions;
  const sourceDoctypeOptions = filtersUi.sourceDoctypeOptions;

  return {
    importDialogEyebrow: importUi.importDialogEyebrow,
    actionDialogEyebrow: actionsUi.actionDialogEyebrow,
    filters: filtersUi.filters,
    presetKey: filtersUi.presetKey,
    presetOptions: filtersUi.presetOptions,
    canDeletePreset: filtersUi.canDeletePreset,
    activeFilterCount: filtersUi.activeFilterCount,
    sourceDoctypeOptions,
    rows,
    openRowCount,
    metrics,
    collectionPreviewRows: summaryUi.collectionPreviewRows,
    commissionPreviewRows: summaryUi.commissionPreviewRows,
    statementImportRows: importUi.statementImportRows,
    statementImportSummary: importUi.statementImportSummary,
    syncing: actionsUi.syncing,
    reconciling: actionsUi.reconciling,
    operationError: actionsUi.operationError,
    bulkActionLoading: actionsUi.bulkActionLoading,
    showImportDialog: importUi.showImportDialog,
    importLoading: importUi.importLoading,
    importError: importUi.importError,
    statementImportCsv: importUi.statementImportCsv,
    statementImportInsuranceCompany: importUi.statementImportInsuranceCompany,
    statementImportDelimiter: importUi.statementImportDelimiter,
    statementImportLimit: importUi.statementImportLimit,
    statementImportPreview: importUi.statementImportPreview,
    workbenchLoading,
    workbenchErrorText,
    mismatchOptions,
    reconciliationSummary: summaryUi.reconciliationSummary,
    reconciliationListColumns: summaryUi.reconciliationListColumns,
    reconciliationListRows: summaryUi.reconciliationListRows,
    showActionDialog: actionsUi.showActionDialog,
    actionDialogMode: actionsUi.actionDialogMode,
    actionDialogRow: actionsUi.actionDialogRow,
    actionDialogNotes: actionsUi.actionDialogNotes,
    actionDialogLoading: actionsUi.actionDialogLoading,
    actionDialogError: actionsUi.actionDialogError,
    actionDialogLabels: actionsUi.actionDialogLabels,
    reconciliationActionDialogTitle: actionsUi.reconciliationActionDialogTitle,
    reconciliationActionDialogSubtitle: actionsUi.reconciliationActionDialogSubtitle,
    importDialogLabels: importUi.importDialogLabels,
    reloadWorkbench,
    downloadReconciliationExport,
    applyWorkbenchFilters: filtersUi.applyWorkbenchFilters,
    resetWorkbenchFilters: filtersUi.resetWorkbenchFilters,
    runSync: actionsUi.runSync,
    runReconciliation: actionsUi.runReconciliation,
    runBulkResolution: actionsUi.runBulkResolution,
    openImportDialog: importUi.openImportDialog,
    closeImportDialog: importUi.closeImportDialog,
    previewStatementImport: importUi.previewStatementImport,
    importStatementPreviewRows: importUi.importStatementPreviewRows,
    resolveRow: actionsUi.resolveRow,
    openReconciliationActionDialog: actionsUi.openReconciliationActionDialog,
    closeReconciliationActionDialog: actionsUi.closeReconciliationActionDialog,
    submitReconciliationActionDialog: actionsUi.submitReconciliationActionDialog,
    handleReconciliationRowClick: actionsUi.handleReconciliationRowClick,
    openReconciliationDetail: actionsUi.openReconciliationDetail,
    applyPreset: filtersUi.applyPreset,
    onPresetChange: filtersUi.onPresetChange,
    savePreset: filtersUi.savePreset,
    deletePreset: filtersUi.deletePreset,
    persistPresetStateToServer: filtersUi.persistPresetStateToServer,
    hydratePresetStateFromServer: filtersUi.hydratePresetStateFromServer,
    formatMoney: summaryUi.formatMoney,
    sourceRowFacts: summaryUi.sourceRowFacts,
    mismatchTypeFacts: summaryUi.mismatchTypeFacts,
    sourcePanelLabel: actionsUi.sourcePanelLabel,
    canOpenSourcePanel: actionsUi.canOpenSourcePanel,
    openSourcePanel: actionsUi.openSourcePanel,
    normalizeReconciliationStatus: summaryUi.normalizeReconciliationStatus,
    deriveReconciliationPeriod: summaryUi.deriveReconciliationPeriod,
    buildReconciliationRowActions: actionsUi.buildReconciliationRowActions,
  };
}
