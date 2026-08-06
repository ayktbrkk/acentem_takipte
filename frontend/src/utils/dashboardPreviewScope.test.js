import { describe, expect, it } from "vitest";

import { hasPreviewRecords, previewCountBadge, previewScopeMeta } from "./dashboardPreviewScope";

function t(key) {
  return key;
}

describe("dashboard preview scope", () => {
  it("renders the recent/total scope when a full total is known", () => {
    expect(previewScopeMeta(5, 69, t)).toBe("recentPrefix 5 / totalLabel 69");
    expect(previewScopeMeta(0, 69, t)).toBe("recentPrefix 0 / totalLabel 69");
  });

  it("renders only the recent count when no full total is known", () => {
    expect(previewScopeMeta(3, null, t)).toBe("recentPrefix: 3");
  });

  it("keeps the count badge aligned with the full total (not the preview count)", () => {
    expect(previewCountBadge(69)).toBe(69);
    expect(previewCountBadge(0)).toBe(0);
    expect(previewCountBadge(null)).toBe(null);
    expect(previewCountBadge(undefined)).toBe(null);
  });

  it("does not treat a preview-empty list with a non-zero total as a true empty state", () => {
    // full total 69, preview 0 -> NOT a true empty state
    expect(hasPreviewRecords(0, 69)).toBe(true);
    // preview 5, total 69 -> has records
    expect(hasPreviewRecords(5, 69)).toBe(true);
    // preview 0, total 0 -> true empty state
    expect(hasPreviewRecords(0, 0)).toBe(false);
    // preview 0, unknown total -> treat as empty (fallback)
    expect(hasPreviewRecords(0, null)).toBe(false);
  });
});
