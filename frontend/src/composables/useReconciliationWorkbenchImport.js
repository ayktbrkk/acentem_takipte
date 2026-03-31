import { computed, ref } from "vue";

import { isPermissionDeniedError } from "./reconciliationWorkbench/helpers";
import { translateText } from "../utils/i18n";

export function useReconciliationWorkbenchImport({ t, branchStore, reloadWorkbench, previewStatementImportResource, importStatementPreviewResource, localeCode }) {
  const importDialogEyebrow = computed(() => translateText("Statement Preview", localeCode.value));
  const showImportDialog = ref(false);
  const importLoading = ref(false);
  const importError = ref("");
  const statementImportCsv = ref("");
  const statementImportInsuranceCompany = ref("");
  const statementImportDelimiter = ref(",");
  const statementImportLimit = ref(100);
  const statementImportPreview = ref({ rows: [], summary: {} });

  const statementImportRows = computed(() => statementImportPreview.value?.rows || []);
  const statementImportSummary = computed(() => statementImportPreview.value?.summary || {});
  const importDialogLabels = computed(() => ({
    cancel: translateText("Cancel", localeCode.value),
    save: translateText("Build Preview", localeCode.value),
  }));

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

  return {
    importDialogEyebrow,
    showImportDialog,
    importLoading,
    importError,
    statementImportCsv,
    statementImportInsuranceCompany,
    statementImportDelimiter,
    statementImportLimit,
    statementImportPreview,
    statementImportRows,
    statementImportSummary,
    importDialogLabels,
    openImportDialog,
    closeImportDialog,
    previewStatementImport,
    importStatementPreviewRows,
  };
}
