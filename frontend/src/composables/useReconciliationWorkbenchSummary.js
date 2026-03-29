import { computed } from "vue";

import {
  buildReconciliationRowActions,
  deriveReconciliationPeriod,
  formatMoney,
  mismatchTypeFacts,
  normalizeReconciliationStatus,
  sourceRowFacts,
} from "./reconciliationWorkbench/helpers";

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
