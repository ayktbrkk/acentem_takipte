import { describe, expect, it } from "vitest";
import { ref } from "vue";

import {
  asArray,
  buildInitialClaimListParams,
  buildInitialKpiParams,
  buildInitialTabPayloadParams,
  getDateRange,
  getPreviousDateRange,
  isPermissionDeniedError,
  normalizeDashboardTab,
  normalizeResourcePayload,
  toApiDate,
  withDashboardOfficeBranchFilter,
} from "./dashboardHelpers";

describe("dashboardHelpers", () => {
  it("normalizes payload and tab values", () => {
    expect(normalizeResourcePayload({ message: { foo: 1 } })).toEqual({ foo: 1 });
    expect(normalizeResourcePayload(null)).toEqual({});
    expect(normalizeDashboardTab("operations")).toBe("daily");
    expect(normalizeDashboardTab("renewals")).toBe("renewals");
    expect(asArray(null)).toEqual([]);
    expect(asArray([1, 2])).toEqual([1, 2]);
  });

  it("builds dashboard params with office branch filter", () => {
    const branchStore = { requestBranch: "IST" };
    const selectedRange = ref(7);

    const kpiParams = buildInitialKpiParams(branchStore, selectedRange);
    const tabParams = buildInitialTabPayloadParams(branchStore, selectedRange, "sales");
    const claimParams = buildInitialClaimListParams(branchStore);

    expect(kpiParams.office_branch).toBe("IST");
    expect(kpiParams.filters.office_branch).toBe("IST");
    expect(tabParams.tab).toBe("sales");
    expect(tabParams.filters.office_branch).toBe("IST");
    expect(claimParams.filters.office_branch).toBe("IST");
    expect(claimParams.fields).toContain("customer.full_name as customer_full_name");
  });

  it("supports date helpers and permission detection", () => {
    const range = getDateRange(7);
    const previous = getPreviousDateRange(7);

    expect(range.from).toBeInstanceOf(Date);
    expect(previous.to).toBeInstanceOf(Date);
    expect(toApiDate(new Date("2026-03-28T00:00:00Z"))).toMatch(/2026-03-28/);
    expect(withDashboardOfficeBranchFilter({ requestBranch: "IST" }, { filters: {} }).filters.office_branch).toBe("IST");
    expect(isPermissionDeniedError({ status: 403, message: "Forbidden" })).toBe(true);
    expect(isPermissionDeniedError({ status: 500, message: "Boom" })).toBe(false);
  });
});
