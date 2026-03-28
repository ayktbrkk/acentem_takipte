import { reactive } from "vue";
import { describe, expect, it, vi } from "vitest";

import { useReportsRowActions } from "./useReportsRowActions";

describe("useReportsRowActions", () => {
  it("opens policy detail for clickable policy list rows", () => {
    const router = {
      push: vi.fn(),
    };
    const filters = reactive({
      reportKey: "policy_list",
    });

    const result = useReportsRowActions({
      filters,
      router,
    });

    expect(result.isRowClickable({ name: "POL-001" })).toBe(true);
    result.onRowClick({ name: "POL-001" });
    expect(router.push).toHaveBeenCalledWith({
      name: "policy-detail",
      params: { name: "POL-001" },
    });
  });

  it("does not open rows for non policy reports", () => {
    const router = {
      push: vi.fn(),
    };
    const filters = reactive({
      reportKey: "communication_operations",
    });

    const result = useReportsRowActions({
      filters,
      router,
    });

    expect(result.isRowClickable({ name: "ROW-1" })).toBe(false);
    result.onRowClick({ name: "ROW-1" });
    expect(router.push).not.toHaveBeenCalled();
  });
});
