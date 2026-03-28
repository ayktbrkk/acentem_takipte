function cstr(value) {
  return String(value ?? "").trim();
}

export function useDashboardItemActions({
  myTaskMutationResource,
  openPreviewList,
  router,
  triggerDashboardReload,
}) {
  function openFollowUpItem(item) {
    const sourceType = String(item?.source_type || "");
    const sourceName = String(item?.source_name || "");
    if (!sourceName) {
      return;
    }
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
      return;
    }
  }

  function openCollectionRiskItem(row) {
    const queryValue = cstr(row?.policy) || cstr(row?.customer);
    if (!queryValue) {
      openPreviewList("payments");
      return;
    }
    router.push({ name: "payments-board", query: { query: queryValue } });
  }

  function openActivityItem(activity) {
    if (!activity?.name) return;
    router.push({ name: "activities-detail", params: { name: activity.name } });
  }

  function openTaskItem(task) {
    if (!task?.name) return;
    router.push({ name: "tasks-detail", params: { name: task.name } });
  }

  function canCompleteReminder(reminder) {
    return cstr(reminder?.status) === "Open";
  }

  function canCancelReminder(reminder) {
    return cstr(reminder?.status) === "Open";
  }

  async function updateReminderStatus(reminder, nextStatus) {
    if (!reminder?.name || !nextStatus) return;
    await myTaskMutationResource.submit({
      doctype: "AT Reminder",
      name: reminder.name,
      data: { status: nextStatus },
    });
    triggerDashboardReload({ immediate: true });
  }

  async function completeReminder(reminder) {
    await updateReminderStatus(reminder, "Done");
  }

  async function cancelReminder(reminder) {
    await updateReminderStatus(reminder, "Cancelled");
  }

  function canStartTask(task) {
    return cstr(task?.status) === "Open";
  }

  function canBlockTask(task) {
    return ["Open", "In Progress"].includes(cstr(task?.status));
  }

  function canCompleteTask(task) {
    return ["Open", "In Progress", "Blocked"].includes(cstr(task?.status));
  }

  function canCancelTask(task) {
    return ["Open", "In Progress", "Blocked"].includes(cstr(task?.status));
  }

  async function updateTaskStatus(task, nextStatus) {
    if (!task?.name || !nextStatus) return;
    await myTaskMutationResource.submit({
      doctype: "AT Task",
      name: task.name,
      data: { status: nextStatus },
    });
    triggerDashboardReload({ immediate: true });
  }

  async function startTask(task) {
    await updateTaskStatus(task, "In Progress");
  }

  async function blockTask(task) {
    await updateTaskStatus(task, "Blocked");
  }

  async function completeTask(task) {
    await updateTaskStatus(task, "Done");
  }

  async function cancelTask(task) {
    await updateTaskStatus(task, "Cancelled");
  }

  function openClaimItem(claim) {
    if (!claim?.name) return;
    router.push({ name: "claim-detail", params: { name: claim.name } });
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

  return {
    canBlockTask,
    canCancelReminder,
    canCancelTask,
    canCompleteReminder,
    canCompleteTask,
    canStartTask,
    cancelReminder,
    cancelTask,
    completeReminder,
    completeTask,
    openActivityItem,
    openClaimItem,
    openCollectionRiskItem,
    openFollowUpItem,
    openPaymentItem,
    openPolicyItem,
    openReconciliationItem,
    openRenewalTaskItem,
    openTaskItem,
  };
}
