import { computed, ref, unref } from "vue";

import { RECONCILIATION_TRANSLATIONS } from "../config/reconciliation_translations";
import { translateText } from "../utils/i18n";
import { formatMoney as formatMoneyForLocale, isPermissionDeniedError } from "./reconciliationWorkbench/helpers";

export function useAuxRecordDetailReconciliationDialog({
  activeLocale,
  localeCode,
  doc,
  canResolveReconciliationLifecycle,
  resolveReconciliationResource,
  reloadDetail,
}) {
  const showReconciliationActionDialog = ref(false);
  const reconciliationActionDialogMode = ref("Matched");
  const reconciliationActionDialogNotes = ref("");
  const reconciliationActionDialogLoading = ref(false);
  const reconciliationActionDialogError = ref("");

  function reconciliationT(key) {
    const locale = String(unref(activeLocale) || "en").toLowerCase().startsWith("tr") ? "tr" : "en";
    return (
      RECONCILIATION_TRANSLATIONS[locale]?.[key] ||
      RECONCILIATION_TRANSLATIONS.en?.[key] ||
      translateText(key, activeLocale)
    );
  }

  const reconciliationActionDialogEyebrow = computed(() =>
    translateText("Reconciliation Action", localeCode.value)
  );
  const reconciliationActionDialogLabels = computed(() => ({
    cancel: reconciliationT("cancel") || translateText("Cancel", activeLocale),
    save:
      reconciliationActionDialogMode.value === "Matched"
        ? reconciliationT("actionSaveResolve")
        : reconciliationT("actionSaveIgnore"),
  }));
  const reconciliationActionDialogTitle = computed(() =>
    reconciliationActionDialogMode.value === "Matched"
      ? reconciliationT("actionResolveTitle")
      : reconciliationT("actionIgnoreTitle")
  );
  const reconciliationActionDialogSubtitle = computed(() =>
    reconciliationActionDialogMode.value === "Matched"
      ? reconciliationT("actionResolveSubtitle")
      : reconciliationT("actionIgnoreSubtitle")
  );
  const reconciliationActionDialogRow = computed(() => unref(doc) || null);

  function formatMoney(value) {
    return formatMoneyForLocale(localeCode.value, value);
  }

  function openReconciliationActionDialog(mode) {
    if (!canResolveReconciliationLifecycle.value || !unref(doc)?.name) return;
    reconciliationActionDialogMode.value = mode === "Ignored" ? "Ignored" : "Matched";
    reconciliationActionDialogNotes.value = unref(doc)?.notes || "";
    reconciliationActionDialogError.value = "";
    showReconciliationActionDialog.value = true;
  }

  function closeReconciliationActionDialog(force = false) {
    if (!force && reconciliationActionDialogLoading.value) return;
    showReconciliationActionDialog.value = false;
    reconciliationActionDialogError.value = "";
    reconciliationActionDialogNotes.value = "";
    reconciliationActionDialogMode.value = "Matched";
  }

  async function submitReconciliationActionDialog() {
    if (!unref(doc)?.name || reconciliationActionDialogLoading.value) return;
    reconciliationActionDialogLoading.value = true;
    reconciliationActionDialogError.value = "";
    try {
      await resolveReconciliationResource.submit({
        item_name: unref(doc).name,
        resolution_action: reconciliationActionDialogMode.value,
        notes: String(reconciliationActionDialogNotes.value || "").trim() || null,
      });
      await reloadDetail();
      closeReconciliationActionDialog(true);
    } catch (error) {
      reconciliationActionDialogError.value = isPermissionDeniedError(error)
        ? reconciliationT("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || reconciliationT("actionFailed");
    } finally {
      reconciliationActionDialogLoading.value = false;
    }
  }

  return {
    showReconciliationActionDialog,
    reconciliationActionDialogMode,
    reconciliationActionDialogNotes,
    reconciliationActionDialogLoading,
    reconciliationActionDialogError,
    reconciliationActionDialogEyebrow,
    reconciliationActionDialogLabels,
    reconciliationActionDialogTitle,
    reconciliationActionDialogSubtitle,
    reconciliationActionDialogRow,
    reconciliationT,
    formatMoney,
    openReconciliationActionDialog,
    closeReconciliationActionDialog,
    submitReconciliationActionDialog,
  };
}
