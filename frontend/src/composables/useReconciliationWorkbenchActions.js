import { computed, ref } from "vue";

import {
  canOpenSourcePanel,
  isPermissionDeniedError,
  openSourcePanel,
  sourcePanelLabel as resolveSourcePanelLabel,
} from "./reconciliationWorkbench/helpers";
import { translateText } from "../utils/i18n";

export function useReconciliationWorkbenchActions({
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
}) {
  const syncing = ref(false);
  const reconciling = ref(false);
  const operationError = ref("");
  const bulkActionLoading = ref(false);
  const showActionDialog = ref(false);
  const actionDialogMode = ref("Note");
  const actionDialogRow = ref(null);
  const actionDialogNotes = ref("");
  const actionDialogLoading = ref(false);
  const actionDialogError = ref("");

  const actionDialogEyebrow = computed(() =>
    translateText("Reconciliation Action", localeCode.value)
  );
  const actionDialogLabels = computed(() => ({
    cancel: translateText("Cancel", localeCode.value),
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

  function openReconciliationDetail(row) {
    if (!row?.name) return;
    router.push({ name: "reconciliation-detail", params: { name: row.name } });
  }

  function handleReconciliationRowClick(row) {
    if (!row?.name) return;
    openReconciliationDetail(row);
  }

  function buildReconciliationRowActions(row) {
    const actions = [];
    actions.push({
      key: `${row?.name}-detail`,
      label: t("recordDetail"),
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

  return {
    syncing,
    reconciling,
    operationError,
    bulkActionLoading,
    showActionDialog,
    actionDialogMode,
    actionDialogRow,
    actionDialogNotes,
    actionDialogLoading,
    actionDialogError,
    actionDialogLabels,
    reconciliationActionDialogTitle,
    reconciliationActionDialogSubtitle,
    actionDialogEyebrow,
    runSync,
    runReconciliation,
    runBulkResolution,
    resolveRow,
    openReconciliationActionDialog,
    closeReconciliationActionDialog,
    submitReconciliationActionDialog,
    handleReconciliationRowClick,
    openReconciliationDetail,
    canOpenSourcePanel: (row) => canOpenSourcePanel(row),
    openSourcePanel: (row) => openSourcePanel(row),
    sourcePanelLabel: (row) => resolveSourcePanelLabel(t, row),
    buildReconciliationRowActions,
  };
}
