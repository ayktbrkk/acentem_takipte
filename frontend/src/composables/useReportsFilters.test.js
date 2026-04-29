import { reactive, ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import { useReportsFilters } from "./useReportsFilters";

const applyPresetMock = vi.fn();
const onPresetChangeMock = vi.fn();
const savePresetMock = vi.fn();
const deletePresetMock = vi.fn();

vi.mock("./useCustomFilterPresets", () => ({
  useCustomFilterPresets: () => ({
    presetKey: ref("default"),
    presetOptions: ref([{ value: "default", label: "Default" }]),
    canDeletePreset: ref(false),
    applyPreset: applyPresetMock,
    onPresetChange: onPresetChangeMock,
    savePreset: savePresetMock,
    deletePreset: deletePresetMock,
  }),
}));

describe("useReportsFilters", () => {
  it("builds payloads and date presets", () => {
    const route = reactive({ query: {} });
    const router = {
      replace: vi.fn(),
    };
    const authStore = reactive({
      roles: ["Manager"],
      isDeskUser: false,
    });
    const branchStore = reactive({
      requestBranch: "IST",
      activeBranch: { label: "Istanbul" },
    });
    const rows = ref([{ insurance_company: "ACME", status: "Open" }]);
    const refresh = vi.fn();

    const result = useReportsFilters({
      props: { initialReportKey: "policy_list" },
      t: (key) => key,
      activeLocale: ref("tr"),
      localeCode: ref("tr-TR"),
      route,
      router,
      authStore,
      branchStore,
      rows,
      refresh,
    });

    result.filters.fromDate = "2026-03-10";
    result.filters.toDate = "2026-03-15";
    result.filters.branch = "B1";
    result.filters.insuranceCompany = "ACME";
    result.filters.granularity = "daily";

    expect(result.reportOptions.value[0].value).toBe("policy_list");
    expect(result.activeReportLabel.value).toBe("Poliçe Listesi");
    expect(result.branchScopeLabel.value).toContain("Istanbul");
    expect(result.activeFilterCount.value).toBeGreaterThan(0);
    expect(result.visibleAdvancedFilters.value.length).toBeGreaterThan(0);
    expect(result.canManageScheduledReports.value).toBe(true);
    expect(result.buildFiltersPayload()).toMatchObject({
      from_date: "2026-03-10",
      to_date: "2026-03-15",
      branch: "B1",
      insurance_company: "ACME",
      office_branch: "IST",
      granularity: "daily",
    });
    expect(result.datePresets.value.map((item) => item.value)).toContain("this_month");

    result.syncReportKeyFromRoute();
    expect(result.filters.reportKey).toBe("policy_list");

    result.persistReportKeyToRoute();
    expect(router.replace).toHaveBeenCalledWith(expect.objectContaining({ query: expect.objectContaining({ report: "policy_list" }) }));

    result.applyDatePreset("today");
    expect(refresh).toHaveBeenCalled();

    result.filters.reportKey = "communication_operations";
    const previousPayload = result.buildPreviousPeriodFiltersPayload();
    expect(previousPayload).toMatchObject({
      from_date: expect.any(String),
      to_date: expect.any(String),
    });
  });
});
