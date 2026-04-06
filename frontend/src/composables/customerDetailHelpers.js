export function createCustomerDetailFormatters({ t, localeCode }) {
  function describeValueBand(value) {
    if (value === "High Value") return t("valueBandHighValue");
    if (value === "Mid Value") return t("valueBandMidValue");
    return t("valueBandStandard");
  }

  function describeInsightSignal(value) {
    if (value === "multi_policy") return t("insightSignalMultiPolicy");
    if (value === "active_portfolio") return t("insightSignalActivePortfolio");
    if (value === "high_premium") return t("insightSignalHighPremium");
    if (value === "medium_premium") return t("insightSignalMediumPremium");
    if (value === "clean_claims") return t("insightSignalCleanClaims");
    if (value === "renewal_pipeline") return t("insightSignalRenewalPipeline");
    if (value === "claim_pressure") return t("insightRiskClaimPressure");
    if (value === "collection_risk") return t("insightRiskCollectionRisk");
    if (value === "overdue_payment") return t("insightRiskOverduePayment");
    if (value === "cancellation_history") return t("insightRiskCancellationHistory");
    return value || "";
  }

  function stripHtml(value) {
    if (!value) return "";
    return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  function formatDate(value) {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(parsed);
  }

  function formatDateTime(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat(localeCode.value, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  }

  function formatCurrency(value, currency) {
    return new Intl.NumberFormat(localeCode.value, {
      style: "currency",
      currency: currency || "TRY",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  return {
    describeValueBand,
    describeInsightSignal,
    stripHtml,
    formatDate,
    formatDateTime,
    formatCurrency,
  };
}

export function createCustomerDetailFacts({
  t,
  formatDate,
  formatDateTime,
  formatCurrency,
  paymentInstallmentsByPayment,
}) {
  function assignmentSummaryLabel(assignment) {
    return [assignment.status || "-", assignment.due_date || "-"].filter(Boolean).join(" / ");
  }

  function activityCardFacts(activity) {
    return [
      {
        key: "activityAt",
        label: t("date"),
        value: formatDateTime(activity?.activity_at),
        valueClass: "text-xs text-slate-600",
      },
      {
        key: "assignedTo",
        label: t("assignedTo"),
        value: activity?.assigned_to || "-",
        valueClass: "text-sm text-slate-800",
      },
      {
        key: "source",
        label: t("source"),
        value: [activity?.source_doctype, activity?.source_name].filter(Boolean).join(" / ") || "-",
        valueClass: "text-sm text-slate-800",
      },
    ];
  }

  function reminderCardFacts(reminder) {
    return [
      {
        key: "remindAt",
        label: t("reminderAt"),
        value: formatDateTime(reminder?.remind_at),
        valueClass: "text-xs text-slate-600",
      },
      {
        key: "priority",
        label: t("reminderPriority"),
        value: reminder?.priority || "-",
        valueClass: "text-xs text-slate-700",
      },
      {
        key: "assignedTo",
        label: t("assignedTo"),
        value: reminder?.assigned_to || "-",
        valueClass: "text-xs text-slate-700",
      },
      {
        key: "source",
        label: t("recordId"),
        value: reminder?.source_name || reminder?.policy || reminder?.claim || "-",
        valueClass: "text-xs text-slate-700",
      },
    ];
  }

  function policyCardFacts(policy) {
    return [
      {
        key: "endDate",
        label: t("endDate"),
        value: formatDate(policy?.end_date),
        valueClass: "text-xs text-slate-600",
      },
      {
        key: "grossPremium",
        label: t("grossPremium"),
        value: formatCurrency(policy?.gross_premium, policy?.currency || "TRY"),
        valueClass: "text-sm font-semibold text-slate-900",
      },
    ];
  }

  function offerCardFacts(offer) {
    return [
      {
        key: "validUntil",
        label: t("validUntil"),
        value: formatDate(offer?.valid_until),
        valueClass: "text-xs text-slate-600",
      },
      {
        key: "grossPremium",
        label: t("grossPremium"),
        value: formatCurrency(offer?.gross_premium, offer?.currency || "TRY"),
        valueClass: "text-sm font-semibold text-slate-900",
      },
    ];
  }

  function paymentCardFacts(payment) {
    const relatedInstallments = paymentInstallmentsByPayment.value.get(payment?.name) || [];
    const overdueInstallmentCount = relatedInstallments.filter((row) => String(row?.status || "") === "Overdue").length;
    return [
      {
        key: "paymentDate",
        label: t("paymentDate"),
        value: formatDate(payment?.payment_date),
        valueClass: "text-xs text-slate-600",
      },
      {
        key: "amount",
        label: t("grossPremium"),
        value: formatCurrency(payment?.amount_try, "TRY"),
        valueClass: "text-sm font-semibold text-slate-900",
      },
      {
        key: "overdueInstallments",
        label: t("overdueInstallments"),
        value: String(overdueInstallmentCount),
        valueClass: overdueInstallmentCount > 0 ? "text-sm font-semibold text-amber-700" : "text-sm text-slate-700",
      },
    ];
  }

  function claimCardFacts(claim) {
    return [
      {
        key: "reportedDate",
        label: t("reportedDate"),
        value: formatDate(claim?.reported_date),
        valueClass: "text-xs text-slate-600",
      },
      {
        key: "claimAmount",
        label: t("claimAmount"),
        value: formatCurrency(claim?.claim_amount, "TRY"),
        valueClass: "text-sm font-semibold text-slate-900",
      },
    ];
  }

  function renewalCardFacts(renewal) {
    return [
      {
        key: "dueDate",
        label: t("dueDate"),
        value: formatDate(renewal?.due_date || renewal?.renewal_date),
        valueClass: "text-xs text-slate-600",
      },
      {
        key: "lostReason",
        label: t("lostReason"),
        value: renewal?.lost_reason_code || "-",
        valueClass: "text-sm text-slate-800",
      },
    ];
  }

  function insuredAssetFacts(asset) {
    return [
      {
        key: "assetType",
        label: t("assetType"),
        value: asset?.asset_type || asset?.branch || "-",
        valueClass: "text-xs text-slate-600",
      },
      {
        key: "assetIdentifier",
        label: t("assetIdentifier"),
        value: asset?.asset_identifier || asset?.policy || "-",
        valueClass: "text-sm text-slate-800",
      },
    ];
  }

  return {
    assignmentSummaryLabel,
    activityCardFacts,
    reminderCardFacts,
    policyCardFacts,
    offerCardFacts,
    paymentCardFacts,
    claimCardFacts,
    renewalCardFacts,
    insuredAssetFacts,
  };
}
