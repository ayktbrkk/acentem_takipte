import { describe, expect, it, vi } from "vitest";

vi.mock("frappe-ui", () => ({
  createResource: () => ({
    submit: vi.fn(async () => ({})),
    reload: vi.fn(async () => ({})),
  }),
}));

import { useImportDataRuntime } from "./useImportDataRuntime";

describe("useImportDataRuntime", () => {
  it("computes mapped column count from reactive mapping", () => {
    const t = (key) => key;
    const router = { push: vi.fn() };
    const authStore = { locale: "tr" };
    const branchStore = { requestBranch: "IST" };

    const runtime = useImportDataRuntime({ t, router, authStore, branchStore });
    runtime.columns.value = ["full_name", "tax_id"];
    runtime.columnMapping["full_name"] = "full_name";
    runtime.columnMapping["tax_id"] = "tax_id";

    expect(runtime.mappedColumnCount.value).toBe(2);
  });
});
