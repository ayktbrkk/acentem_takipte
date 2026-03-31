import { computed } from "vue";

import {
  buildReconciliationRowActions,
  deriveReconciliationPeriod,
  formatMoney,
  mismatchTypeFacts,
  normalizeReconciliationStatus,
  sourceRowFacts,
} from "./reconciliationWorkbench/helpers";
import { translateText } from "../utils/i18n";

export function useReconciliationWorkbenchSummary({ t, localeCode, workbenchData, rows, metrics, openReconciliationDetail, openReconciliationActionDialog }) {
  const collectionPreviewRows = computed(() => workbenchData.value.collection_preview?.overdue_rows || []);
  const commissionPreviewRows = computed(() => workbenchData.value.commission_preview?.rows || []);
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
    { key: "reconciliationNo", label: translateText("Reconciliation No", localeCode.value), type: "mono" },
    { key: "company", label: translateText("Company", localeCode.value) },
    { key: "period", label: translateText("Period", localeCode.value) },
    { key: "totalPolicy", label: translateText("Total Policy", localeCode.value), align: "center" },
    { key: "totalPremium", label: translateText("Total Premium", localeCode.value), type: "amount", align: "right" },
    { key: "companyStatement", label: translateText("Company Statement", localeCode.value), type: "amount", align: "right" },
    { key: "difference", label: translateText("Difference", localeCode.value), type: "amount", align: "right" },
    { key: "status", label: translateText("Status", localeCode.value), type: "status", domain: "reconciliation" },
    { key: "_actions", label: translateText("Actions", localeCode.value), type: "actions", align: "right" },
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
        period: deriveReconciliationPeriod(localeCode.value, row),
        totalPolicy: accounting.policy ? "1" : "0",
        totalPremium: formatMoney(localeCode.value, row?.local_amount_try || 0),
        companyStatement: formatMoney(localeCode.value, row?.external_amount_try || 0),
        difference: formatMoney(localeCode.value, Math.abs(difference)),
        difference_class: difference > 0 ? "text-green-600" : difference < 0 ? "text-amber-700" : "text-gray-600",
        status: normalizeReconciliationStatus(row?.status, difference),
        _actions: buildReconciliationRowActions({
          row,
          t,
          localeCode: localeCode.value,
          openReconciliationDetail,
          openReconciliationActionDialog,
        }),
      };
    })
  );

  return {
    metrics,
    collectionPreviewRows,
    commissionPreviewRows,
    reconciliationSummary,
    reconciliationListColumns,
    reconciliationListRows,
    formatMoney: (value) => formatMoney(localeCode.value, value),
    sourceRowFacts: (row) => sourceRowFacts(t, row),
    mismatchTypeFacts: (row) => mismatchTypeFacts(t, row),
    normalizeReconciliationStatus,
    deriveReconciliationPeriod: (row) => deriveReconciliationPeriod(localeCode.value, row),
  };
}
