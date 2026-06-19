import { describe, expect, it, vi } from "vitest";

vi.mock("frappe-ui", () => ({
  createResource: () => ({
    submit: vi.fn(async () => ({})),
    reload: vi.fn(async () => ({})),
  }),
}));

import { useImportDataRuntime } from "./useImportDataRuntime";

describe("useImportDataRuntime", () => {
  const baseContext = () => ({
    t: (key) => key,
    router: { push: vi.fn() },
    authStore: { locale: "tr" },
    branchStore: { requestBranch: "IST" },
  });

  it("computes mapped column count from reactive mapping", () => {
    const runtime = useImportDataRuntime(baseContext());
    runtime.columns.value = ["full_name", "tax_id"];
    runtime.columnMapping["full_name"] = "full_name";
    runtime.columnMapping["tax_id"] = "tax_id";

    expect(runtime.mappedColumnCount.value).toBe(2);
  });

  it("enables cancel while job is previewed", () => {
    const runtime = useImportDataRuntime(baseContext());
    runtime.jobStatus.value = "Previewed";
    expect(runtime.canCancelImport.value).toBe(true);
  });

  it("disables import until preview has ready rows", () => {
    const runtime = useImportDataRuntime(baseContext());
    runtime.jobName.value = "AT-IMP-2026-000001";
    runtime.columns.value = ["full_name"];
    runtime.columnMapping["full_name"] = "full_name";
    runtime.jobStatus.value = "Previewed";
    runtime.previewSummary.value = { ready: 0 };

    expect(runtime.canImport.value).toBe(false);

    runtime.previewSummary.value = { ready: 2 };
    expect(runtime.canImport.value).toBe(true);
  });
});
