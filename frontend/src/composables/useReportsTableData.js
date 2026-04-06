import { computed, reactive, ref } from "vue";

import { columnLabels } from "./reportsConfig";
import { translateText } from "@/utils/i18n";

function isDateLikeValue(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function useReportsTableData({
  filters,
  rows,
  columns,
  comparisonRows,
  activeLocale,
  localeCode,
  branchScopeLabel,
  t,
}) {
  const translatableCategoricalColumns = new Set([
    "status",
    "claim_status",
    "payment_status",
    "mismatch_type",
    "resolution_action",
    "entry_type",
    "source_doctype",
    "reference_doctype",
    "task_type",
    "priority",
    "channel",
    "direction",
    "claim_type",
    "purpose",
  ]);

  const visibleColumnKeys = ref([]);
  const pendingVisibleColumnKeys = ref([]);
  const sortState = reactive({
    column: "",
    direction: "",
  });

  const numberFormatter = computed(() =>
    new Intl.NumberFormat(localeCode.value, {
      maximumFractionDigits: 2,
    }),
  );

  const dateFormatter = computed(() =>
    new Intl.DateTimeFormat(localeCode.value, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
  );

  const percentFormatter = computed(() =>
    new Intl.NumberFormat(localeCode.value, {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }),
  );

  const comparisonEnabled = computed(
    () =>
      ["communication_operations", "reconciliation_operations", "claims_operations"].includes(filters.reportKey)
      && Boolean(filters.fromDate)
      && Boolean(filters.toDate),
  );

  const visibleColumns = computed(() => {
    if (!visibleColumnKeys.value.length) {
      return columns.value;
    }
    return columns.value.filter((column) => visibleColumnKeys.value.includes(column));
  });

  const hiddenColumns = computed(() => columns.value.filter((column) => !visibleColumns.value.includes(column)));
  const columnsSummaryLabel = computed(() => `${visibleColumns.value.length}/${columns.value.length}`);

  const metricToneClasses = {
    rows: "text-gray-900",
    gross_premium: "text-brand-600",
    commission: "text-green-600",
    paid_amount: "text-amber-600",
    active_policies: "text-green-600",
    conversion_rate: "text-brand-600",
    open_renewals: "text-amber-600",
    loyal_customers: "text-gray-900",
    claim_customers: "text-amber-600",
    matched_customers: "text-green-600",
    created_drafts: "text-brand-600",
    successful_deliveries: "text-green-600",
    open_reconciliation: "text-amber-600",
    difference_amount: "text-brand-600",
    resolved_items: "text-green-600",
    open_claims: "text-amber-600",
    rejected_claims: "text-amber-600",
    successful_notifications: "text-green-600",
  };

  const buildMetricItem = (key, label, value, extra = {}) => ({
    key,
    label,
    value,
    valueClass: metricToneClasses[key] || "text-slate-900",
    cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm",
    ...extra,
  });

  function getHeroVariant(key, index) {
    if (index === 0) {
      return "lg";
    }
    if (["gross_premium", "difference_amount", "conversion_rate", "created_drafts"].includes(key)) {
      return "accent";
    }
    if (["commission", "active_policies", "matched_customers", "successful_deliveries", "resolved_items", "successful_notifications"].includes(key)) {
      return "success";
    }
    if (["paid_amount", "open_renewals", "claim_customers", "open_reconciliation", "open_claims", "rejected_claims"].includes(key)) {
      return "warn";
    }
    return "default";
  }

  function numericTotalFromRows(rowSet, keys) {
    return rowSet.reduce((total, row) => {
      for (const key of keys) {
        const value = Number(row?.[key] || 0);
        if (Number.isFinite(value) && value !== 0) {
          return total + value;
        }
      }
      return total;
    }, 0);
  }

  function getColumnLabel(column) {
    const entry = columnLabels[column];
    if (entry) {
      return entry[activeLocale.value] || entry.en || column;
    }
    return String(column)
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  const summaryItems = computed(() => {
    const numericTotal = (keys) =>
      rows.value.reduce((sum, row) => {
        const value = keys.reduce((acc, key) => {
          const parsed = Number(row?.[key] || 0);
          return Number.isFinite(parsed) ? acc + parsed : acc;
        }, 0);
        return sum + value;
      }, 0);

    const avgNumeric = (key) => {
      if (!rows.value.length) return 0;
      const total = rows.value.reduce((sum, row) => {
        const parsed = Number(row?.[key] || 0);
        return Number.isFinite(parsed) ? sum + parsed : sum;
      }, 0);
      return total / rows.value.length;
    };

    if (filters.reportKey === "policy_list" && filters.granularity) {
      return [
        buildMetricItem("rows", t("summaryRows"), numberFormatter.value.format(numericTotal(["policy_count"]))),
        buildMetricItem("gross_premium", t("summaryGrossPremium"), numberFormatter.value.format(numericTotal(["total_gross_premium"]))),
        buildMetricItem("commission", t("summaryCommission"), numberFormatter.value.format(numericTotal(["total_commission"]))),
        buildMetricItem("paid_amount", t("summaryPaidAmount"), numberFormatter.value.format(0)),
      ];
    }

    if (filters.reportKey === "agent_performance") {
      return [
        buildMetricItem("rows", t("summaryRows"), numberFormatter.value.format(rows.value.length)),
        buildMetricItem("gross_premium", t("summaryGrossPremium"), numberFormatter.value.format(numericTotal(["total_gross_premium"]))),
        buildMetricItem("commission", t("summaryCommission"), numberFormatter.value.format(numericTotal(["total_commission"]))),
        buildMetricItem("conversion_rate", t("summaryAvgConversionRate"), `%${percentFormatter.value.format(avgNumeric("offer_conversion_rate"))}`),
      ];
    }

    if (filters.reportKey === "customer_segmentation") {
      return [
        buildMetricItem("rows", t("summaryRows"), numberFormatter.value.format(rows.value.length)),
        buildMetricItem("gross_premium", t("summaryGrossPremium"), numberFormatter.value.format(numericTotal(["total_premium"]))),
        buildMetricItem("active_policies", t("summaryActivePolicies"), numberFormatter.value.format(numericTotal(["active_policy_count"]))),
        buildMetricItem(
          "claim_customers",
          t("summaryClaimCustomers"),
          numberFormatter.value.format(rows.value.filter((row) => String(row?.claim_history_segment || "") === "HAS_CLAIM").length),
        ),
      ];
    }

    if (filters.reportKey === "communication_operations") {
      return [
        buildMetricItem("rows", t("summaryRows"), numberFormatter.value.format(rows.value.length)),
        buildMetricItem("matched_customers", t("summaryMatchedCustomers"), numberFormatter.value.format(numericTotal(["matched_customer_count"]))),
        buildMetricItem("created_drafts", t("summaryCreatedDrafts"), numberFormatter.value.format(numericTotal(["sent_count"]))),
        buildMetricItem("successful_deliveries", t("summarySuccessfulDeliveries"), numberFormatter.value.format(numericTotal(["sent_outbox_count"]))),
      ];
    }

    if (filters.reportKey === "reconciliation_operations") {
      return [
        buildMetricItem("rows", t("summaryRows"), numberFormatter.value.format(rows.value.length)),
        buildMetricItem("open_reconciliation", t("summaryOpenReconciliation"), numberFormatter.value.format(rows.value.filter((row) => String(row?.status || "") === "Open").length)),
        buildMetricItem("difference_amount", t("summaryDifferenceAmount"), numberFormatter.value.format(numericTotal(["difference_try"]))),
        buildMetricItem(
          "resolved_items",
          t("summaryResolvedItems"),
          numberFormatter.value.format(rows.value.filter((row) => ["Resolved", "Ignored"].includes(String(row?.status || ""))).length),
        ),
      ];
    }

    if (filters.reportKey === "claims_operations") {
      return [
        buildMetricItem("rows", t("summaryRows"), numberFormatter.value.format(rows.value.length)),
        buildMetricItem(
          "open_claims",
          t("summaryOpenClaims"),
          numberFormatter.value.format(rows.value.filter((row) => ["Open", "In Review"].includes(String(row?.claim_status || ""))).length),
        ),
        buildMetricItem(
          "rejected_claims",
          t("summaryRejectedClaims"),
          numberFormatter.value.format(rows.value.filter((row) => String(row?.claim_status || "") === "Rejected").length),
        ),
        buildMetricItem("successful_notifications", t("summarySuccessfulNotifications"), numberFormatter.value.format(numericTotal(["sent_outbox_count"]))),
      ];
    }

    return [
      buildMetricItem("rows", t("summaryRows"), numberFormatter.value.format(rows.value.length)),
      buildMetricItem("gross_premium", t("summaryGrossPremium"), numberFormatter.value.format(numericTotal(["gross_premium", "total_gross_premium", "total_premium"]))),
      buildMetricItem("commission", t("summaryCommission"), numberFormatter.value.format(numericTotal(["commission_amount", "total_commission"]))),
      buildMetricItem("paid_amount", t("summaryPaidAmount"), numberFormatter.value.format(numericTotal(["paid_amount", "approved_amount"]))),
    ];
  });

  const heroSummaryCells = computed(() =>
    summaryItems.value.map((item, index) => ({
      label: item.label,
      value: item.value,
      sub: index === 0 ? branchScopeLabel.value : undefined,
      variant: getHeroVariant(item.key, index),
    })),
  );

  const comparisonSummaryItems = computed(() => {
    if (!comparisonEnabled.value || !comparisonRows.value.length) {
      return [];
    }

    if (filters.reportKey === "communication_operations") {
      const currentMatched = numericTotalFromRows(rows.value, ["matched_customer_count"]);
      const previousMatched = numericTotalFromRows(comparisonRows.value, ["matched_customer_count"]);
      const currentDrafts = numericTotalFromRows(rows.value, ["sent_count"]);
      const previousDrafts = numericTotalFromRows(comparisonRows.value, ["sent_count"]);
      const currentDeliveries = numericTotalFromRows(rows.value, ["sent_outbox_count"]);
      const previousDeliveries = numericTotalFromRows(comparisonRows.value, ["sent_outbox_count"]);
      return [
        { key: "cmp_matched", label: t("summaryMatchedCustomers"), value: numberFormatter.value.format(currentMatched), previous: previousMatched, delta: currentMatched - previousMatched, valueClass: metricToneClasses.matched_customers, cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm" },
        { key: "cmp_drafts", label: t("summaryCreatedDrafts"), value: numberFormatter.value.format(currentDrafts), previous: previousDrafts, delta: currentDrafts - previousDrafts, valueClass: metricToneClasses.created_drafts, cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm" },
        { key: "cmp_deliveries", label: t("summarySuccessfulDeliveries"), value: numberFormatter.value.format(currentDeliveries), previous: previousDeliveries, delta: currentDeliveries - previousDeliveries, valueClass: metricToneClasses.successful_deliveries, cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm" },
      ];
    }

    if (filters.reportKey === "reconciliation_operations") {
      const currentOpen = rows.value.filter((row) => String(row?.status || "") === "Open").length;
      const previousOpen = comparisonRows.value.filter((row) => String(row?.status || "") === "Open").length;
      const currentDiff = numericTotalFromRows(rows.value, ["difference_try"]);
      const previousDiff = numericTotalFromRows(comparisonRows.value, ["difference_try"]);
      const currentResolved = rows.value.filter((row) => ["Resolved", "Ignored"].includes(String(row?.status || ""))).length;
      const previousResolved = comparisonRows.value.filter((row) => ["Resolved", "Ignored"].includes(String(row?.status || ""))).length;
      return [
        { key: "cmp_open", label: t("summaryOpenReconciliation"), value: numberFormatter.value.format(currentOpen), previous: previousOpen, delta: currentOpen - previousOpen, valueClass: metricToneClasses.open_reconciliation, cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm" },
        { key: "cmp_difference", label: t("summaryDifferenceAmount"), value: numberFormatter.value.format(currentDiff), previous: previousDiff, delta: currentDiff - previousDiff, valueClass: metricToneClasses.difference_amount, cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm" },
        { key: "cmp_resolved", label: t("summaryResolvedItems"), value: numberFormatter.value.format(currentResolved), previous: previousResolved, delta: currentResolved - previousResolved, valueClass: metricToneClasses.resolved_items, cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm" },
      ];
    }

    if (filters.reportKey === "claims_operations") {
      const currentOpen = rows.value.filter((row) => ["Open", "In Review"].includes(String(row?.claim_status || ""))).length;
      const previousOpen = comparisonRows.value.filter((row) => ["Open", "In Review"].includes(String(row?.claim_status || ""))).length;
      const currentRejected = rows.value.filter((row) => String(row?.claim_status || "") === "Rejected").length;
      const previousRejected = comparisonRows.value.filter((row) => String(row?.claim_status || "") === "Rejected").length;
      const currentNotifications = numericTotalFromRows(rows.value, ["sent_outbox_count"]);
      const previousNotifications = numericTotalFromRows(comparisonRows.value, ["sent_outbox_count"]);
      return [
        { key: "cmp_claim_open", label: t("summaryOpenClaims"), value: numberFormatter.value.format(currentOpen), previous: previousOpen, delta: currentOpen - previousOpen, valueClass: metricToneClasses.open_claims, cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm" },
        { key: "cmp_claim_rejected", label: t("summaryRejectedClaims"), value: numberFormatter.value.format(currentRejected), previous: previousRejected, delta: currentRejected - previousRejected, valueClass: metricToneClasses.rejected_claims, cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm" },
        { key: "cmp_claim_notifications", label: t("summarySuccessfulNotifications"), value: numberFormatter.value.format(currentNotifications), previous: previousNotifications, delta: currentNotifications - previousNotifications, valueClass: metricToneClasses.successful_notifications, cardClass: "rounded-2xl border-slate-200 bg-white/95 shadow-sm" },
      ];
    }

    return [];
  });

  function formatComparisonDelta(delta, previous) {
    const sign = delta >= 0 ? "+" : "";
    return `${sign}${numberFormatter.value.format(delta)} / ${numberFormatter.value.format(previous)}`;
  }

  function isDateLikeValueLocal(value) {
    return isDateLikeValue(value);
  }

  function formatCellValue(column, value) {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    if (["loss_ratio_percent", "offer_conversion_rate", "renewal_success_rate"].includes(column)) {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? `%${percentFormatter.value.format(numeric)}` : String(value);
    }

    if (typeof value === "number") {
      return numberFormatter.value.format(value);
    }

    if (typeof value === "string") {
      const lowerColumn = String(column || "").toLowerCase();
      const shouldTranslateCategory =
        translatableCategoricalColumns.has(lowerColumn)
        || lowerColumn.endsWith("_status")
        || lowerColumn.endsWith("_type")
        || lowerColumn.endsWith("_doctype");
      if (shouldTranslateCategory) {
        return translateText(value, activeLocale.value || "en");
      }

      const numeric = Number(value);
      const numericColumns = new Set([
        "gross_premium",
        "total_gross_premium",
        "total_premium",
        "commission_amount",
        "total_commission",
        "paid_amount",
        "approved_amount",
        "estimated_amount",
        "policy_count",
        "offer_count",
        "accepted_offer_count",
        "renewal_task_count",
        "claim_count",
      ]);

      if (numericColumns.has(column) && Number.isFinite(numeric)) {
        return numberFormatter.value.format(numeric);
      }

      if (isDateLikeValueLocal(value)) {
        const parsed = new Date(`${value}T00:00:00`);
        if (!Number.isNaN(parsed.getTime())) {
          return dateFormatter.value.format(parsed);
        }
      }
    }

    return String(value);
  }

  function normalizeSortableValue(value) {
    if (value === null || value === undefined || value === "") {
      return "";
    }
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      if (isDateLikeValueLocal(value)) {
        return value;
      }
      const numeric = Number(value);
      if (Number.isFinite(numeric) && value.trim() !== "") {
        return numeric;
      }
      return value.toLocaleLowerCase(localeCode.value);
    }
    return String(value);
  }

  function isColumnVisible(column) {
    return visibleColumns.value.includes(column);
  }

  function toggleColumn(column) {
    if (visibleColumnKeys.value.includes(column)) {
      if (visibleColumnKeys.value.length === 1) {
        return;
      }
      visibleColumnKeys.value = visibleColumnKeys.value.filter((item) => item !== column);
      if (!visibleColumnKeys.value.includes(sortState.column)) {
        sortState.column = "";
        sortState.direction = "";
      }
      return;
    }
    visibleColumnKeys.value = [...visibleColumnKeys.value, column];
  }

  function showAllColumns() {
    visibleColumnKeys.value = [...columns.value];
  }

  function toggleSort(column) {
    if (sortState.column !== column) {
      sortState.column = column;
      sortState.direction = "asc";
      return;
    }
    if (sortState.direction === "asc") {
      sortState.direction = "desc";
      return;
    }
    if (sortState.direction === "desc") {
      sortState.column = "";
      sortState.direction = "";
      return;
    }
    sortState.direction = "asc";
  }

  function getSortIndicator(column) {
    if (sortState.column !== column) {
      return "|";
    }
    return sortState.direction === "desc" ? "v" : "^";
  }

  const sortedRows = computed(() => {
    if (!sortState.column || !sortState.direction) {
      return rows.value;
    }

    const direction = sortState.direction === "desc" ? -1 : 1;
    return [...rows.value].sort((leftRow, rightRow) => {
      const left = normalizeSortableValue(leftRow?.[sortState.column]);
      const right = normalizeSortableValue(rightRow?.[sortState.column]);
      if (left === right) {
        return 0;
      }
      return left > right ? direction : -direction;
    });
  });

  return {
    columns,
    rows,
    comparisonRows,
    visibleColumnKeys,
    pendingVisibleColumnKeys,
    sortState,
    numberFormatter,
    dateFormatter,
    percentFormatter,
    visibleColumns,
    hiddenColumns,
    columnsSummaryLabel,
    heroSummaryCells,
    summaryItems,
    comparisonSummaryItems,
    sortedRows,
    getColumnLabel,
    formatCellValue,
    normalizeSortableValue,
    isColumnVisible,
    toggleColumn,
    showAllColumns,
    toggleSort,
    getSortIndicator,
    formatComparisonDelta,
  };
}
