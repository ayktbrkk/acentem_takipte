import { computed } from "vue";

function normalizeText(value) {
  return String(value ?? "").trim();
}

function customerDisplay(row) {
  return (
    normalizeText(row?.customer_full_name) ||
    normalizeText(row?.customer_name) ||
    normalizeText(row?.customer_label) ||
    normalizeText(row?.party_name) ||
    normalizeText(row?.full_name) ||
    normalizeText(row?.customer) ||
    "-"
  );
}

function buildOutcomeRows(t, retention) {
  const rows = [
    {
      key: "renewed",
      label: t("outcomeRenewed"),
      value: Number(retention?.renewed || 0),
      colorClass: "bg-emerald-500",
    },
    {
      key: "lost",
      label: t("outcomeLost"),
      value: Number(retention?.lost || 0),
      colorClass: "bg-amber-500",
    },
    {
      key: "cancelled",
      label: t("outcomeCancelled"),
      value: Number(retention?.cancelled || 0),
      colorClass: "bg-slate-400",
    },
  ].filter((row) => row.value > 0);
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  return rows.map((row) => ({
    ...row,
    ratio: row.value ? Math.max(6, Math.round((row.value / total) * 100)) : 0,
  }));
}

function buildStatusRows(totals, order, colorMap, labelFn, totalBase) {
  const total = totalBase || Object.values(totals).reduce((sum, value) => sum + Number(value || 0), 0) || 1;
  return order
    .map((status) => ({
      key: status,
      label: labelFn(status),
      value: Number(totals[status] || 0),
      colorClass: colorMap[status] || "bg-slate-400",
    }))
    .filter((row) => row.value > 0)
    .map((row) => ({
      ...row,
      ratio: row.value ? Math.max(6, Math.round((row.value / total) * 100)) : 0,
    }));
}

export function useDashboardFacts({
  acceptedOfferCount,
  buildQuickStatCard,
  dashboardCards,
  dashboardTabSeries,
  dueTodayCollectionAmount,
  dueTodayCollectionCount,
  formatCurrency,
  formatDate,
  formatNumber,
  overdueCollectionAmount,
  overdueCollectionCount,
  overdueCollectionPayments,
  dueTodayCollectionPayments,
  followUpSummary,
  isCollectionsTab,
  isDailyTab,
  isRenewalsTab,
  isSalesTab,
  myTaskSummary,
  offerWaitingRenewalCount,
  previousDashboardCards,
  readyOfferCount,
  renewalBucketCounts,
  renewalTasks,
  t,
  policyStatusRows,
  convertedOfferCount,
}) {
  function buildStaticQuickStatCard({ key, title, value, icon, hint = t("todaySnapshot") }) {
    const card = buildQuickStatCard({ key, title, value, icon, trendHint: hint });
    return { ...card, trendText: "" };
  }

  const quickStatCards = computed(() => [
    buildQuickStatCard({
      key: "quick-policy",
      title: t("kpiPolicy"),
      value: formatNumber(dashboardCards.value.total_policies),
      current: dashboardCards.value.total_policies,
      previous: previousDashboardCards.value.total_policies,
      icon: "shield",
    }),
    buildQuickStatCard({
      key: "quick-gwp",
      title: t("kpiGwp"),
      value: formatCurrency(dashboardCards.value.total_gwp_try),
      current: dashboardCards.value.total_gwp_try,
      previous: previousDashboardCards.value.total_gwp_try,
      icon: "bar-chart-2",
    }),
    buildQuickStatCard({
      key: "quick-commission",
      title: t("kpiCommission"),
      value: formatCurrency(dashboardCards.value.total_commission),
      current: dashboardCards.value.total_commission,
      previous: previousDashboardCards.value.total_commission,
      icon: "percent",
    }),
    buildQuickStatCard({
      key: "quick-renewal",
      title: t("kpiRenewal"),
      value: formatNumber(dashboardCards.value.pending_renewals),
      current: dashboardCards.value.pending_renewals,
      previous: previousDashboardCards.value.pending_renewals,
      icon: "alert-triangle",
      reverseTrend: true,
    }),
  ]);

  const collectionQuickStatCards = computed(() => [
    buildStaticQuickStatCard({
      key: "quick-collect-due-today-count",
      title: t("kpiCollectionDueTodayCount"),
      value: formatNumber(dueTodayCollectionCount.value),
      icon: "calendar-days",
    }),
    buildStaticQuickStatCard({
      key: "quick-collect-due-today-amount",
      title: t("kpiCollectionDueTodayAmount"),
      value: formatCurrency(dueTodayCollectionAmount.value),
      icon: "banknote",
    }),
    buildStaticQuickStatCard({
      key: "quick-collect-overdue-count",
      title: t("kpiCollectionOverdueCount"),
      value: formatNumber(overdueCollectionCount.value),
      icon: "alert-triangle",
    }),
    buildStaticQuickStatCard({
      key: "quick-collect-overdue-amount",
      title: t("kpiCollectionOverdueAmount"),
      value: formatCurrency(overdueCollectionAmount.value),
      icon: "wallet",
    }),
  ]);

  const renewalQuickStatCards = computed(() => [
    quickStatCards.value.find((card) => card.key === "quick-renewal"),
    buildStaticQuickStatCard({
      key: "quick-renewal-offer-waiting",
      title: t("kpiRenewalOfferWaiting"),
      value: formatNumber(offerWaitingRenewalCount.value),
      icon: "file-clock",
    }),
    buildStaticQuickStatCard({
      key: "quick-renewal-overdue",
      title: t("kpiRenewalOverdue"),
      value: formatNumber(renewalBucketCounts.value.overdue),
      icon: "alert-octagon",
    }),
    buildStaticQuickStatCard({
      key: "quick-renewal-due7",
      title: t("kpiRenewalDue7"),
      value: formatNumber(renewalBucketCounts.value.due7),
      icon: "clock",
    }),
  ].filter(Boolean));

  const operationsQuickStatCards = computed(() => [
    buildStaticQuickStatCard({
      key: "quick-follow-up-overdue",
      title: t("kpiFollowUpOverdue"),
      value: formatNumber(followUpSummary.value.overdue),
      icon: "alert-triangle",
    }),
    buildStaticQuickStatCard({
      key: "quick-follow-up-today",
      title: t("kpiFollowUpToday"),
      value: formatNumber(followUpSummary.value.due_today),
      icon: "calendar-days",
    }),
    buildStaticQuickStatCard({
      key: "quick-task-overdue",
      title: t("kpiTaskOverdue"),
      value: formatNumber(myTaskSummary.value.overdue),
      icon: "briefcase",
    }),
    buildStaticQuickStatCard({
      key: "quick-task-today",
      title: t("kpiTaskToday"),
      value: formatNumber(myTaskSummary.value.due_today),
      icon: "list-todo",
    }),
  ]);

  const salesQuickStatCards = computed(() => [
    buildStaticQuickStatCard({
      key: "quick-sales-ready-offers",
      title: t("kpiReadyOffers"),
      value: formatNumber(readyOfferCount.value),
      icon: "send",
    }),
    buildStaticQuickStatCard({
      key: "quick-sales-accepted-offers",
      title: t("kpiAcceptedOffers"),
      value: formatNumber(acceptedOfferCount.value),
      icon: "badge-check",
    }),
    buildStaticQuickStatCard({
      key: "quick-sales-converted-offers",
      title: t("kpiConvertedOffers"),
      value: formatNumber(convertedOfferCount.value),
      icon: "repeat",
    }),
    buildQuickStatCard({
      key: "quick-sales-gwp",
      title: t("kpiGwp"),
      value: formatCurrency(dashboardCards.value.total_gwp_try),
      current: dashboardCards.value.total_gwp_try,
      previous: previousDashboardCards.value.total_gwp_try,
      icon: "bar-chart-2",
    }),
  ]);

  const visibleQuickStatCards = computed(() => {
    if (isCollectionsTab.value) return collectionQuickStatCards.value;
    if (isRenewalsTab.value) return renewalQuickStatCards.value;
    if (isDailyTab.value) return operationsQuickStatCards.value;
    if (isSalesTab.value) return salesQuickStatCards.value;
    return quickStatCards.value;
  });

  const policyStatusSummary = computed(() => {
    const map = {};
    for (const row of policyStatusRows.value) {
      map[row.status] = {
        total: Number(row.total || 0),
        gwp: Number(row.total_gwp_try || 0),
      };
    }

    const total = Object.values(map).reduce((sum, item) => sum + item.total, 0) || 1;

    return [
      {
        key: "Active",
        label: t("statusActive"),
        value: map.Active?.total || 0,
        gwp: map.Active?.gwp || 0,
        colorClass: "bg-emerald-500",
      },
      {
        key: "KYT",
        label: t("statusKyt"),
        value: map.KYT?.total || 0,
        gwp: map.KYT?.gwp || 0,
        colorClass: "bg-sky-500",
      },
      {
        key: "IPT",
        label: t("statusIpt"),
        value: map.IPT?.total || 0,
        gwp: map.IPT?.gwp || 0,
        colorClass: "bg-amber-400",
      },
    ].map((entry) => ({
      ...entry,
      ratio: entry.value ? Math.max(6, Math.round((entry.value / total) * 100)) : 0,
    }));
  });

  const renewalStatusSummary = computed(() => {
    const serverRows = Array.isArray(dashboardTabSeries.value?.renewal_status) ? dashboardTabSeries.value.renewal_status : null;
    if (serverRows) {
      const counts = {
        Open: 0,
        "In Progress": 0,
        Done: 0,
        Cancelled: 0,
      };
      for (const row of serverRows) {
        const rawKey = String(row?.status || "");
        const key = rawKey === "Completed" ? "Done" : rawKey;
        if (key in counts) counts[key] = Number(row?.total || 0);
      }
      const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1;
      return [
        { key: "Open", label: t("open"), value: counts.Open, colorClass: "bg-amber-500" },
        { key: "In Progress", label: t("statusInProgress"), value: counts["In Progress"], colorClass: "bg-sky-500" },
        { key: "Done", label: t("statusCompleted"), value: counts.Done, colorClass: "bg-emerald-500" },
        { key: "Cancelled", label: t("statusCancelled"), value: counts.Cancelled, colorClass: "bg-slate-400" },
      ]
        .filter((row) => row.value > 0 || isRenewalsTab.value)
        .map((row) => ({
          ...row,
          ratio: row.value ? Math.max(6, Math.round((row.value / total) * 100)) : 0,
        }));
    }
    const counts = {
      Open: 0,
      "In Progress": 0,
      Done: 0,
      Cancelled: 0,
    };
    for (const task of renewalTasks.value) {
      const rawStatus = String(task?.status || "");
      const status = rawStatus === "Completed" ? "Done" : rawStatus;
      if (status in counts) counts[status] += 1;
    }
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1;
    return [
      { key: "Open", label: t("open"), value: counts.Open, colorClass: "bg-amber-500" },
      { key: "In Progress", label: t("statusInProgress"), value: counts["In Progress"], colorClass: "bg-sky-500" },
      { key: "Done", label: t("statusCompleted"), value: counts.Done, colorClass: "bg-emerald-500" },
      { key: "Cancelled", label: t("statusCancelled"), value: counts.Cancelled, colorClass: "bg-slate-400" },
    ]
      .filter((row) => row.value > 0 || isRenewalsTab.value)
      .map((row) => ({
        ...row,
        ratio: row.value ? Math.max(6, Math.round((row.value / total) * 100)) : 0,
      }));
  });

  const collectionPaymentStatusSummary = computed(() => {
    const rows = Array.isArray(dashboardTabSeries.value?.payment_status) ? dashboardTabSeries.value.payment_status : [];
    const totalsByStatus = {};
    for (const row of rows) {
      totalsByStatus[String(row?.status || "")] = Number(row?.total || 0);
    }
    const order = ["Draft", "Paid", "Cancelled"];
    const colorMap = {
      Draft: "bg-amber-500",
      Paid: "bg-emerald-500",
      Cancelled: "bg-slate-400",
    };
    const totals = order.reduce((acc, status) => {
      acc[status] = Number(totalsByStatus[status] || 0);
      return acc;
    }, {});
    return buildStatusRows(totals, order, colorMap, paymentStatusLabel);
  });

  const collectionPaymentDirectionSummary = computed(() => {
    const rows = Array.isArray(dashboardTabSeries.value?.payment_direction) ? dashboardTabSeries.value.payment_direction : [];
    const map = {};
    for (const row of rows) {
      const key = String(row?.payment_direction || "");
      map[key] = {
        total: Number(row?.total || 0),
        paidAmount: Number(row?.paid_amount_try || 0),
      };
    }
    const totalRows = Object.values(map).reduce((sum, item) => sum + Number(item?.total || 0), 0) || 1;
    const order = ["Inbound", "Outbound"];
    const colorMap = {
      Inbound: "bg-sky-500",
      Outbound: "bg-fuchsia-500",
    };
    return order
      .map((direction) => ({
        key: direction,
        label: paymentDirectionLabel(direction),
        value: Number(map[direction]?.total || 0),
        paidAmount: Number(map[direction]?.paidAmount || 0),
        colorClass: colorMap[direction] || "bg-slate-400",
      }))
      .filter((row) => row.value > 0)
      .map((row) => ({
        ...row,
        ratio: row.value ? Math.max(6, Math.round((row.value / totalRows) * 100)) : 0,
      }));
  });

  const collectionRiskRows = computed(() => {
    const grouped = new Map();
    const pushPayment = (payment, bucket) => {
      const customer = customerDisplay(payment);
      const policy = normalizeText(payment?.policy);
      const key = `${customer}::${policy}`;
      const current = grouped.get(key) || {
        key,
        customer,
        policy,
        overdueCount: 0,
        dueTodayCount: 0,
        overdueAmount: 0,
      };
      if (bucket === "overdue") {
        current.overdueCount += 1;
        current.overdueAmount += Number(payment?.amount_try || 0);
      } else {
        current.dueTodayCount += 1;
      }
      grouped.set(key, current);
    };

    for (const payment of overdueCollectionPayments.value) pushPayment(payment, "overdue");
    for (const payment of dueTodayCollectionPayments.value) pushPayment(payment, "due_today");

    return Array.from(grouped.values())
      .map((row) => {
        const score = row.overdueCount * 3 + row.dueTodayCount + Math.min(4, Math.ceil(row.overdueAmount / 5000));
        const title = row.customer || row.policy || "-";
        const descriptionParts = [row.policy, riskLevelLabel(score)].filter(Boolean);
        return {
          ...row,
          score,
          title,
          description: descriptionParts.join(" · ") || title,
        };
      })
      .filter((row) => row.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        if (right.overdueAmount !== left.overdueAmount) return right.overdueAmount - left.overdueAmount;
        return right.overdueCount - left.overdueCount;
      });
  });

  const renewalRetentionRate = computed(() => Number(dashboardTabSeries.value?.renewal_retention?.rate || 0));

  const renewalOutcomeSummary = computed(() => buildOutcomeRows(t, dashboardTabSeries.value?.renewal_retention || {}));

  function renewalTaskFactsDetailed(task) {
    return [
      {
        key: "dueDate",
        label: t("dueDate"),
        value: formatDate(task?.due_date),
        valueClass: "text-xs text-slate-500",
      },
      {
        key: "renewalDate",
        label: t("renewalDate"),
        value: formatDate(task?.renewal_date),
        valueClass: "text-xs text-slate-500",
      },
    ];
  }

  function renewalAlertFacts(task) {
    return [
      { label: t("dueDate"), value: formatDate(task.due_date) },
      { label: t("renewalDate"), value: formatDate(task.renewal_date) },
    ];
  }

  function dashboardPaymentFacts(payment) {
    return [
      {
        key: "dueDate",
        label: t("dueDate"),
        value: formatDate(payment?.due_date || payment?.payment_date),
        valueClass: "text-xs text-slate-500",
      },
      {
        key: "customer",
        label: t("customer"),
        value: customerDisplay(payment),
        valueClass: "text-xs text-slate-500",
      },
      {
        key: "policy",
        label: t("policyLabel"),
        value: payment?.policy || "-",
        valueClass: "text-xs text-slate-500",
      },
    ];
  }

  function dashboardReconciliationFacts(row) {
    return [
      {
        key: "type",
        label: t("reconciliationType"),
        value: row?.mismatch_type || "-",
        valueClass: "text-xs text-slate-500",
      },
      {
        key: "difference",
        label: t("difference"),
        value: formatCurrency(row?.difference_try || 0),
        valueClass: "text-xs text-slate-500",
      },
    ];
  }

  function followUpTitle(item) {
    return item?.source_name || "-";
  }

  function followUpDescription(item) {
    const delta = Number(item?.days_delta ?? 0);
    if (delta < 0) return `${t("followUpDeltaOverdue")} ${Math.abs(delta)} ${t("followUpDeltaDays")}`;
    if (delta === 0) return t("followUpDeltaToday");
    return `${t("followUpDeltaSoon")} ${delta} ${t("followUpDeltaDays")}`;
  }

  function followUpFacts(item) {
    return [
      { label: t("customer"), value: customerDisplay(item) },
      { label: t("status"), value: translatedStatus(item?.status) },
      { label: t("followUpDate"), value: formatDate(item?.follow_up_on) },
      ...(item?.assigned_to ? [{ label: t("followUpAssignee"), value: item.assigned_to }] : []),
    ];
  }

  function taskFacts(task) {
    return [
      { label: t("taskType"), value: task?.task_type || "-" },
      { label: t("taskAssignee"), value: task?.assigned_to || "-" },
      { label: t("dueDate"), value: formatDate(task?.due_date) },
    ];
  }

  function activityFacts(activity) {
    return [
      { label: t("activityType"), value: activity?.activity_type || "-" },
      { label: t("taskAssignee"), value: activity?.assigned_to || "-" },
      { label: t("activityAt"), value: formatDate(activity?.activity_at) },
    ];
  }

  function claimFacts(claim) {
    return [
      { label: t("customer"), value: customerDisplay(claim) },
      { label: t("policyLabel"), value: claim?.policy || "-" },
      { label: t("status"), value: translatedStatus(claim?.claim_status) },
    ];
  }

  function reminderFacts(reminder) {
    return [
      { label: t("customer"), value: customerDisplay(reminder) },
      { label: t("policyLabel"), value: reminder?.policy || "-" },
      { label: t("claimLabel"), value: reminder?.claim || "-" },
      { label: t("taskAssignee"), value: reminder?.assigned_to || "-" },
      { label: t("date"), value: formatDate(reminder?.remind_at) },
    ].filter((item) => item.value && item.value !== "-");
  }

  function translatedStatus(rawStatus) {
    const s = String(rawStatus || "").trim();
    if (!s || s === "-") return s || "-";
    const map = {
      Open: t("open"),
      "In Progress": t("statusInProgress"),
      Completed: t("statusCompleted"),
      Done: t("statusCompleted"),
      Cancelled: t("statusCancelled"),
      "Under Review": t("statusUnderReview"),
      Approved: t("statusApproved"),
      Paid: t("statusPaid"),
      Draft: t("draft"),
      Sent: t("statusSent"),
      Accepted: t("statusAccepted"),
      Rejected: t("statusRejected"),
      Closed: t("statusClosed"),
    };
    return Object.prototype.hasOwnProperty.call(map, s) ? map[s] : s;
  }

  function paymentDirectionLabel(direction) {
    const normalized = normalizeText(direction);
    if (normalized === "Inbound") return t("paymentDirectionInbound");
    if (normalized === "Outbound") return t("paymentDirectionOutbound");
    return normalized || "-";
  }

  function paymentStatusLabel(status) {
    const normalized = normalizeText(status);
    if (normalized === "Draft") return t("draft");
    if (normalized === "Paid") return t("statusPaid");
    if (normalized === "Cancelled") return t("statusCancelled");
    if (normalized === "Open") return t("open");
    return normalized || "-";
  }

  function riskLevelLabel(score) {
    const numericScore = Number(score || 0);
    if (numericScore >= 6) return t("riskLevelHigh");
    if (numericScore >= 3) return t("riskLevelMedium");
    return t("riskLevelLow");
  }

  function collectionRiskFacts(row) {
    return [
      { label: t("riskScore"), value: formatNumber(row?.score || 0) },
      { label: t("overdueCount"), value: formatNumber(row?.overdueCount || 0) },
      { label: t("dueTodayCount"), value: formatNumber(row?.dueTodayCount || 0) },
      { label: t("riskOverdueAmount"), value: formatCurrency(row?.overdueAmount || 0) },
    ];
  }

  return {
    activityFacts,
    claimFacts,
    collectionPaymentDirectionSummary,
    collectionPaymentStatusSummary,
    collectionRiskFacts,
    collectionRiskRows,
    dashboardPaymentFacts,
    dashboardReconciliationFacts,
    followUpDescription,
    followUpFacts,
    followUpTitle,
    operationsQuickStatCards,
    policyStatusSummary,
    quickStatCards,
    reminderFacts,
    renewalAlertFacts,
    renewalOutcomeSummary,
    renewalRetentionRate,
    renewalStatusSummary,
    renewalTaskFactsDetailed,
    salesQuickStatCards,
    taskFacts,
    translatedStatus,
    visibleQuickStatCards,
  };
}
