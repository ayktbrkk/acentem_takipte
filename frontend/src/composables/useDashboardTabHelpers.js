import { computed, unref } from "vue";

function normalizeLookupValue(value) {
  return String(value ?? "").trim();
}

export function useDashboardTabHelpers({
  activeRenewalTasks,
  compareDateDesc,
  compareDueDateAsc,
  displayRecentPolicies,
  followUpResource,
  myActivitiesResource,
  myRemindersResource,
  myTasksResource,
}) {
  const renewalAlertItems = computed(() =>
    activeRenewalTasks.value
      .slice()
      .sort((left, right) =>
        new Date(left.due_date || left.renewal_date || 0).getTime()
        - new Date(right.due_date || right.renewal_date || 0).getTime()
      )
  );

  const displayRenewalAlertItems = computed(() => renewalAlertItems.value);
  const displayRenewalTasks = computed(() => activeRenewalTasks.value);

  const followUpPayload = computed(() => unref(followUpResource.data) || {});
  const followUpSummary = computed(() => followUpPayload.value.summary || { total: 0, overdue: 0, due_today: 0, due_soon: 0 });
  const followUpItems = computed(() => (Array.isArray(followUpPayload.value.items) ? followUpPayload.value.items : []));

  const myTasksPayload = computed(() => unref(myTasksResource.data) || {});
  const myTaskSummary = computed(() => myTasksPayload.value.summary || { total: 0, overdue: 0, due_today: 0, due_soon: 0 });
  const myTaskItems = computed(() => (Array.isArray(myTasksPayload.value.items) ? myTasksPayload.value.items : []));

  const myActivitiesPayload = computed(() => unref(myActivitiesResource.data) || {});
  const myActivityItems = computed(() => (Array.isArray(myActivitiesPayload.value.items) ? myActivitiesPayload.value.items : []));

  const myRemindersPayload = computed(() => unref(myRemindersResource.data) || {});
  const myReminderSummary = computed(() => myRemindersPayload.value.summary || { total: 0, overdue: 0, due_today: 0, due_soon: 0 });
  const myReminderItems = computed(() => (Array.isArray(myRemindersPayload.value.items) ? myRemindersPayload.value.items : []));

  const prioritizedFollowUpItems = computed(() =>
    followUpItems.value
      .slice()
      .sort((left, right) => Number(left?.days_delta ?? 999) - Number(right?.days_delta ?? 999))
  );

  const priorityTaskItems = computed(() =>
    myTaskItems.value
      .filter((task) => !["Done", "Completed", "Cancelled"].includes(String(task?.status || "")))
      .slice()
      .sort((left, right) => compareDueDateAsc(left?.due_date, right?.due_date))
  );

  const recentActivityItems = computed(() =>
    myActivityItems.value
      .slice()
      .sort((left, right) =>
        compareDateDesc(
          left?.activity_at || left?.modified || left?.creation,
          right?.activity_at || right?.modified || right?.creation
        )
      )
  );

  const renewalLinkedPolicies = computed(() => {
    const linkedKeys = new Set(
      activeRenewalTasks.value
        .map((task) => normalizeLookupValue(task?.policy))
        .filter(Boolean)
    );

    if (!linkedKeys.size) return [];

    return displayRecentPolicies.value.filter((policy) => {
      const policyName = normalizeLookupValue(policy?.name);
      const policyNumber = normalizeLookupValue(policy?.policy_no);
      return linkedKeys.has(policyName) || linkedKeys.has(policyNumber);
    });
  });

  return {
    displayRenewalAlertItems,
    displayRenewalTasks,
    followUpSummary,
    myReminderItems,
    myReminderSummary,
    myTaskItems,
    myTaskSummary,
    prioritizedFollowUpItems,
    priorityTaskItems,
    recentActivityItems,
    renewalAlertItems,
    renewalLinkedPolicies,
  };
}
