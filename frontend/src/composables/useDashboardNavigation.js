export function useDashboardNavigation({ router, route, normalizeDashboardTab }) {
  function setDashboardTab(tabKey) {
    const nextTab =
      typeof normalizeDashboardTab === "function" ? normalizeDashboardTab(tabKey) : String(tabKey || "daily");
    const nextQuery = { ...(route.query || {}) };
    if (nextTab === "daily") {
      delete nextQuery.tab;
    } else {
      nextQuery.tab = nextTab;
    }
    router.replace({ name: "dashboard", query: nextQuery });
  }

  function openPage(path) {
    if (path === "/communication") {
      router.push({
        path,
        query: {
          return_to: route.fullPath || route.path || "",
        },
      });
      return;
    }
    router.push(path);
  }

  function openPreviewList(target) {
    switch (target) {
      case "policies":
        openPage("/policies");
        return;
      case "offers":
        openPage("/offers");
        return;
      case "renewals":
        openPage("/renewals");
        return;
      case "companies":
        openPage("/insurance-companies");
        return;
      case "payments":
        openPage("/payments");
        return;
      case "claims":
        openPage("/claims");
        return;
      case "reconciliation":
        openPage("/reconciliation-items");
        return;
      case "leads":
        openPage("/leads");
        return;
      case "tasks":
        router.push({ name: "tasks-list" });
        return;
      case "activities":
        router.push({ name: "activities-list" });
        return;
      case "reminders":
        router.push({ name: "reminders-list" });
        return;
      default:
        return;
    }
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

  function openPolicyItem(policy) {
    if (!policy?.name) return;
    router.push({ name: "policy-detail", params: { name: policy.name } });
  }

  function openRenewalTaskItem(task) {
    if (!task?.name) return;
    router.push({ name: "renewals-board", query: { task: task.name } });
  }

  function openPaymentItem(payment) {
    const paymentQuery = String(payment?.payment_no || payment?.name || "").trim();
    if (!paymentQuery) return;
    router.push({ name: "payments-board", query: { query: paymentQuery } });
  }

  function openReconciliationItem(row) {
    const sourceQuery = String(row?.source_name || row?.name || "").trim();
    if (!sourceQuery) return;
    router.push({
      name: "reconciliation-workbench",
      query: {
        sourceQuery,
        ...(row?.status ? { status: row.status } : {}),
      },
    });
  }

  function openTaskItem(task) {
    if (!task?.name) return;
    router.push({ name: "tasks-detail", params: { name: task.name } });
  }

  function openActivityItem(activity) {
    if (!activity?.name) return;
    router.push({ name: "activities-detail", params: { name: activity.name } });
  }

  function openClaimItem(claim) {
    if (!claim?.name) return;
    router.push({ name: "claim-detail", params: { name: claim.name } });
  }

  function openReminderItem(reminder) {
    if (!reminder?.name) return;
    router.push({ name: "reminders-detail", params: { name: reminder.name } });
  }

  function openFollowUpItem(item) {
    const sourceType = String(item?.source_type || "");
    const sourceName = String(item?.source_name || "");
    if (!sourceName) return;
    if (sourceType === "claim") {
      router.push({ name: "claims-board", query: { claim: sourceName } });
      return;
    }
    if (sourceType === "renewal") {
      router.push({ name: "renewals-board", query: { task: sourceName } });
      return;
    }
    if (sourceType === "assignment" || sourceType === "call_note") {
      router.push({
        name: "communication-center",
        query: {
          reference_doctype: sourceType === "assignment" ? "AT Ownership Assignment" : "AT Call Note",
          reference_name: sourceName,
        },
      });
    }
  }

  function openSalesActionItem(action) {
    if (action?.kind === "reminder") {
      openReminderItem(action);
      return;
    }
    openTaskItem(action);
  }

  function openCollectionRiskItem(row, openPreviewListFn = openPreviewList) {
    const queryValue = String(row?.policy || row?.customer || "").trim();
    if (!queryValue) {
      openPreviewListFn("payments");
      return;
    }
    router.push({ name: "payments-board", query: { query: queryValue } });
  }

  return {
    setDashboardTab,
    openPage,
    openPreviewList,
    openLeadItem,
    openOfferItem,
    openConvertedPolicyItem,
    openPolicyItem,
    openRenewalTaskItem,
    openPaymentItem,
    openReconciliationItem,
    openTaskItem,
    openActivityItem,
    openClaimItem,
    openReminderItem,
    openFollowUpItem,
    openSalesActionItem,
    openCollectionRiskItem,
  };
}
