import { describe, expect, it } from "vitest";

import { DASHBOARD_TRANSLATIONS } from "./translations";

describe("dashboard translations parity", () => {
  it("keeps TR and EN key sets identical", () => {
    const trKeys = Object.keys(DASHBOARD_TRANSLATIONS.tr).sort();
    const enKeys = Object.keys(DASHBOARD_TRANSLATIONS.en).sort();
    expect(trKeys).toEqual(enKeys);
  });

  it("renders no raw backend enum keys as user-facing values", () => {
    const rawEnumMarkers = /(^|\s)(status_|kpi[a-zA-Z]*Key|type_|channel_|direction_)/;
    for (const locale of ["tr", "en"]) {
      const map = DASHBOARD_TRANSLATIONS[locale];
      for (const [key, value] of Object.entries(map)) {
        if (typeof value !== "string") continue;
        expect(value, `raw marker in ${locale}.${key}`).not.toMatch(rawEnumMarkers);
        expect(value, `key leaked as value in ${locale}.${key}`).not.toBe(key);
      }
    }
  });

  it("localizes the dashboard tab labels in both languages", () => {
    expect(DASHBOARD_TRANSLATIONS.tr.tabSales).not.toBe("sales");
    expect(DASHBOARD_TRANSLATIONS.en.tabSales).toBe("Sales");
    expect(DASHBOARD_TRANSLATIONS.tr.tabSales).toBe("Satışlar");
  });
});
