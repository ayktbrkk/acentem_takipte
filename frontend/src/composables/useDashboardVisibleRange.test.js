import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useDashboardVisibleRange } from "./useDashboardVisibleRange";

describe("useDashboardVisibleRange", () => {
  it("formats the selected date range", () => {
    const visibleRange = useDashboardVisibleRange({
      formatDate: (value) => value,
      selectedRange: ref("last30"),
    });

    expect(visibleRange.value).toContain(" - ");
  });
});
