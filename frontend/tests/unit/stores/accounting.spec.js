import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useAccountingStore } from "../../../src/stores/accounting";

describe("useAccountingStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("updates reactive filters without replacing the filter contract", () => {
    const store = useAccountingStore();

    store.setFilters({
      status: "Resolved",
      mismatchType: "Amount",
      sourceQuery: "abc",
      limit: 20,
    });

    expect(store.state.filters.status).toBe("Resolved");
    expect(store.state.filters.mismatchType).toBe("Amount");
    expect(store.state.filters.sourceQuery).toBe("abc");
    expect(store.state.filters.limit).toBe(20);
    expect(store.state.filters.sourceDoctype).toBe("");
  });

  it("stores workbench payload and derives rows and source options", () => {
    const store = useAccountingStore();
    store.setLocaleCode("tr-TR");
    store.setWorkbench({
      rows: [
        { name: "REC-001", source_doctype: "AT Policy", source_name: "POL-001", accounting: { external_ref: "EXT-1" } },
        { name: "REC-002", source_doctype: "AT Claim", source_name: "CLM-001", accounting: { external_ref: "EXT-2" } },
      ],
      metrics: { open: 2, resolved: 1 },
    });

    expect(store.metrics.open).toBe(2);
    expect(store.rows).toHaveLength(2);
    expect(store.sourceDoctypeOptions.map((item) => item.value)).toEqual(["AT Claim", "AT Policy"]);
  });

  it("filters rows by source doctype and source query", () => {
    const store = useAccountingStore();
    store.setLocaleCode("en-US");
    store.setWorkbench({
      rows: [
        { name: "REC-001", source_doctype: "AT Policy", source_name: "POL-001", accounting: { external_ref: "EXT-1" } },
        { name: "REC-002", source_doctype: "AT Claim", source_name: "CLM-001", accounting: { external_ref: "XYZ-2" } },
      ],
    });

    store.setFilters({
      sourceDoctype: "AT Claim",
      sourceQuery: "xyz",
    });

    expect(store.rows.map((row) => row.name)).toEqual(["REC-002"]);
  });
});
