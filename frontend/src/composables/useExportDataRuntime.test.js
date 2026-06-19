import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

vi.mock("frappe-ui", () => ({
  createResource: () => ({
    submit: vi.fn().mockResolvedValue([]),
    reload: vi.fn().mockResolvedValue({ rows: [] }),
    loading: false,
  }),
}));

import { useExportDataRuntime } from "./useExportDataRuntime";

describe("useExportDataRuntime", () => {
  it("builds export urls, records history, and navigates back on cancel", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const routerPush = vi.fn();
    const runtime = useExportDataRuntime({
      t: (key) =>
        ({
          screenDashboard: "Dashboard",
          screenPolicies: "Policies",
          screenOffers: "Offers",
          screenCustomers: "Customers",
          screenClaims: "Claims",
          screenPayments: "Payments",
          screenRenewals: "Renewals",
          exportStarted: "Export started.",
        })[key] || key,
      router: { push: routerPush },
      authStore: { locale: ref("tr") },
      branchStore: { requestBranch: "" },
    });

    runtime.form.screen = "claims_board";
    runtime.form.format = "csv";
    runtime.form.filename = "hasar_export";
    runtime.form.startDate = "2026-03-01";
    runtime.form.endDate = "2026-03-31";
    runtime.form.status = "Open";

    runtime.downloadExport();

    expect(openSpy.mock.calls[0][0]).toContain("download_export");
    expect(openSpy.mock.calls[0][0]).toContain("filename=hasar_export");
    expect(openSpy.mock.calls[0][0]).toContain("start_date=2026-03-01");
    expect(openSpy.mock.calls[0][0]).toContain("end_date=2026-03-31");
    expect(openSpy.mock.calls[0][0]).toContain("status=Open");
    expect(runtime.message.value).toBe("Export started.");
    expect(runtime.historyRows.value).toHaveLength(1);
    expect(runtime.historyRows.value[0].screenLabel).toBe("Claims");

    runtime.cancel();
    expect(routerPush).toHaveBeenCalledWith({ name: "dashboard" });

    openSpy.mockRestore();
  });
});
