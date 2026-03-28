import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useDashboardTabHelpers } from "./useDashboardTabHelpers";

describe("useDashboardTabHelpers", () => {
  it("derives sorted renewal, follow-up, and activity lists", () => {
    const helpers = useDashboardTabHelpers({
      activeRenewalTasks: ref([
        { name: "R2", due_date: "2026-03-10", policy: "P-2" },
        { name: "R1", due_date: "2026-03-01", policy: "P-1" },
      ]),
      compareDateDesc: (left, right) => new Date(right).getTime() - new Date(left).getTime(),
      compareDueDateAsc: (left, right) => new Date(left).getTime() - new Date(right).getTime(),
      displayRecentPolicies: ref([
        { name: "P-1", policy_no: "PN-1" },
        { name: "P-2", policy_no: "PN-2" },
      ]),
      followUpResource: { data: ref({ summary: { total: 2, overdue: 1, due_today: 1, due_soon: 0 }, items: [{ name: "F2", days_delta: 4 }, { name: "F1", days_delta: -1 }] }) },
      myActivitiesResource: { data: ref({ summary: { total: 2, logged: 1, shared: 0, archived: 0 }, items: [{ name: "A1", activity_at: "2026-03-10" }, { name: "A2", activity_at: "2026-03-12" }] }) },
      myRemindersResource: { data: ref({ summary: { total: 1, overdue: 0, due_today: 1, due_soon: 0 }, items: [{ name: "RM1" }] }) },
      myTasksResource: { data: ref({ summary: { total: 2, overdue: 0, due_today: 1, due_soon: 1 }, items: [{ name: "T1", status: "Open", due_date: "2026-03-07" }, { name: "T2", status: "Done", due_date: "2026-03-01" }] }) },
    });

    expect(helpers.renewalAlertItems.value.map((row) => row.name)).toEqual(["R1", "R2"]);
    expect(helpers.displayRenewalTasks.value.map((row) => row.name)).toEqual(["R2", "R1"]);
    expect(helpers.prioritizedFollowUpItems.value.map((row) => row.name)).toEqual(["F1", "F2"]);
    expect(helpers.priorityTaskItems.value.map((row) => row.name)).toEqual(["T1"]);
    expect(helpers.recentActivityItems.value.map((row) => row.name)).toEqual(["A2", "A1"]);
    expect(helpers.renewalLinkedPolicies.value.map((row) => row.name)).toEqual(["P-1", "P-2"]);
    expect(helpers.myReminderItems.value.map((row) => row.name)).toEqual(["RM1"]);
  });
});
