import { computed } from "vue";

function cstr(value) {
  return String(value ?? "").trim();
}

function isSalesActionSource(sourceDoctype) {
  const source = cstr(sourceDoctype);
  return source === "AT Lead" || source === "AT Offer";
}

function compareDueDateAsc(leftDate, rightDate) {
  const leftDays = daysUntil(leftDate);
  const rightDays = daysUntil(rightDate);
  const safeLeft = leftDays == null ? Number.POSITIVE_INFINITY : leftDays;
  const safeRight = rightDays == null ? Number.POSITIVE_INFINITY : rightDays;
  return safeLeft - safeRight;
}

function daysUntil(dateValue) {
  if (!dateValue) return null;
  const due = new Date(dateValue);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function compareDateDesc(leftDate, rightDate) {
  const leftTime = new Date(leftDate || 0).getTime();
  const rightTime = new Date(rightDate || 0).getTime();
  const safeLeft = Number.isFinite(leftTime) ? leftTime : 0;
  const safeRight = Number.isFinite(rightTime) ? rightTime : 0;
  return safeRight - safeLeft;
}

export function useDashboardSales({
  dashboardData,
  dashboardTabSeries,
  formatCurrency,
  formatDate,
  openPreviewList,
  openTaskItem,
  recentOffers,
  recentPolicies,
  router,
  t,
  leads,
  myReminderItems,
  myTaskItems,
}) {
  const displayRecentLeads = computed(() => leads.value);
  const displayRecentPolicies = computed(() => recentPolicies.value);
  const displayRecentOffers = computed(() => recentOffers.value);

  const leadStatusSummary = computed(() => {
    const source = dashboardTabSeries.value.lead_status || dashboardData.value.lead_status || [];
    const map = {};
    for (const row of source) {
      map[row.status] = Number(row.total || 0);
    }

    const total = Object.values(map).reduce((sum, value) => sum + value, 0) || 1;

    return [
      { key: "Draft", label: t("draft"), value: map.Draft || 0, colorClass: "bg-amber-500" },
      { key: "Open", label: t("open"), value: map.Open || 0, colorClass: "bg-sky-500" },
      { key: "Replied", label: t("replied"), value: map.Replied || 0, colorClass: "bg-emerald-500" },
      { key: "Closed", label: t("closed"), value: map.Closed || 0, colorClass: "bg-slate-500" },
    ].map((entry) => ({
      ...entry,
      ratio: entry.value ? Math.max(6, Math.round((entry.value / total) * 100)) : 0,
    }));
  });

  const salesOfferStatusSummary = computed(() => {
    const rows = Array.isArray(dashboardTabSeries.value?.offer_status) ? dashboardTabSeries.value.offer_status : [];
    const totalsByStatus = {};
    for (const row of rows) {
      totalsByStatus[String(row?.status || "")] = Number(row?.total || 0);
    }
    const total = Object.values(totalsByStatus).reduce((sum, value) => sum + Number(value || 0), 0) || 1;
    const colorMap = {
      Draft: "bg-amber-500",
      Sent: "bg-sky-500",
      Accepted: "bg-emerald-500",
      Rejected: "bg-amber-500",
      Converted: "bg-indigo-500",
    };
    const labelMap = {
      Draft: t("draft"),
      Sent: t("statusSent"),
      Accepted: t("statusAccepted"),
      Rejected: t("statusRejected"),
      Converted: t("converted"),
    };
    const order = ["Draft", "Sent", "Accepted", "Converted", "Rejected"];
    return order
      .map((status) => ({
        key: status,
        label: labelMap[status] || status,
        value: Number(totalsByStatus[status] || 0),
        colorClass: colorMap[status] || "bg-slate-400",
      }))
      .filter((row) => row.value > 0)
      .map((row) => ({
        ...row,
        ratio: row.value ? Math.max(6, Math.round((row.value / total) * 100)) : 0,
      }));
  });

  const salesPipelineOffers = computed(() =>
    displayRecentOffers.value.filter((offer) => {
      const status = String(offer?.status || "");
      return !offer?.converted_policy && ["Draft", "Sent", "Accepted"].includes(status);
    })
  );

  const convertedSalesOffers = computed(() =>
    displayRecentOffers.value.filter((offer) => Boolean(offer?.converted_policy) || String(offer?.status || "") === "Converted")
  );

  const salesCandidateTaskActions = computed(() =>
    myTaskItems.value
      .filter((task) => isSalesActionSource(task?.source_doctype))
      .map((task) => ({ ...task, kind: "task", action_date: task?.due_date || null }))
  );

  const salesCandidateReminderActions = computed(() =>
    myReminderItems.value
      .filter((reminder) => isSalesActionSource(reminder?.source_doctype))
      .map((reminder) => ({ ...reminder, kind: "reminder", action_date: reminder?.remind_at || null }))
  );

  const salesCandidateActions = computed(() =>
    [...salesCandidateTaskActions.value, ...salesCandidateReminderActions.value]
      .slice()
      .sort((left, right) => compareDueDateAsc(left?.action_date, right?.action_date))
  );

  function recentLeadFacts(lead) {
    return [
      { label: t("email"), value: lead.email || "-" },
      {
        label: t("estPremium"),
        value: formatCurrency(lead.estimated_gross_premium || 0),
      },
    ];
  }

  function recentPolicyFacts(policy) {
    return [
      {
        key: "customer",
        label: t("customer"),
        value: policy?.customer || "-",
        valueClass: "text-xs text-slate-500",
      },
      {
        key: "issueDate",
        label: t("issueDate"),
        value: policy?.issue_date || "-",
        valueClass: "text-xs text-slate-500",
      },
    ];
  }

  function recentOfferFacts(offer) {
    return [
      {
        key: "customer",
        label: t("customer"),
        value: offer?.customer || "-",
        valueClass: "text-xs text-slate-500",
      },
      {
        key: "validUntil",
        label: t("validUntil"),
        value: offer?.valid_until || "-",
        valueClass: "text-xs text-slate-500",
      },
    ];
  }

  function salesActionSourceLabel(sourceDoctype) {
    const source = cstr(sourceDoctype);
    if (source === "AT Lead") return t("salesActionLead");
    if (source === "AT Offer") return t("salesActionOffer");
    return sourceDoctype || "-";
  }

  function salesActionFacts(action) {
    const actionDateLabel = action?.kind === "reminder" ? t("date") : t("dueDate");
    return [
      { label: t("taskType"), value: action?.kind === "reminder" ? t("salesActionReminder") : (action?.task_type || t("salesActionTask")) },
      { label: t("source"), value: salesActionSourceLabel(action?.source_doctype) },
      { label: actionDateLabel, value: formatDate(action?.action_date) },
    ].filter((item) => item.value && item.value !== "-");
  }

  function salesActionTitle(action) {
    return action?.task_title || action?.reminder_title || action?.source_name || action?.name || "-";
  }

  function salesActionDescription(action) {
    const actionType = action?.kind === "reminder" ? t("salesActionReminder") : t("salesActionTask");
    const sourceLabel = salesActionSourceLabel(action?.source_doctype);
    const sourceName = action?.source_name || "-";
    return `${actionType} · ${sourceLabel} · ${sourceName}`;
  }

  function openLeadItem(lead) {
    if (!lead?.name) return;
    router.push({ name: "lead-detail", params: { name: lead.name } });
  }

  function openOfferItem(offer) {
    if (!offer?.name) return;
    router.push({ name: "offer-detail", params: { name: offer.name } });
  }

  function openConvertedPolicyItem(offer) {
    const policyName = String(offer?.converted_policy || "").trim();
    if (!policyName) return;
    router.push({ name: "policy-detail", params: { name: policyName } });
  }

  function openSalesActionItem(action) {
    if (action?.kind === "reminder") {
      if (!action?.name) return;
      router.push({ name: "reminders-detail", params: { name: action.name } });
      return;
    }
    openTaskItem(action);
  }

  function openSalesActionList() {
    if (salesCandidateTaskActions.value.length >= salesCandidateReminderActions.value.length) {
      openPreviewList("tasks");
      return;
    }
    openPreviewList("reminders");
  }

  return {
    convertedSalesOffers,
    displayRecentLeads,
    displayRecentPolicies,
    leadStatusSummary,
    openConvertedPolicyItem,
    openLeadItem,
    openOfferItem,
    openSalesActionItem,
    openSalesActionList,
    recentLeadFacts,
    recentOfferFacts,
    recentPolicyFacts,
    salesActionDescription,
    salesActionFacts,
    salesActionTitle,
    salesCandidateActions,
    salesOfferStatusSummary,
    salesPipelineOffers,
  };
}
