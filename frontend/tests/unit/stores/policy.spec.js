import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { usePolicyStore } from "../../../src/stores/policy";

describe("usePolicyStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("updates reactive filters without replacing the filter contract", () => {
    const store = usePolicyStore();

    store.setFilters({
      query: "POL-001",
      insurance_company: "COMP-001",
      status: "Active",
      gross_min: "1000",
    });

    expect(store.state.filters.query).toBe("POL-001");
    expect(store.state.filters.insurance_company).toBe("COMP-001");
    expect(store.state.filters.status).toBe("Active");
    expect(store.state.filters.gross_min).toBe("1000");
    expect(store.state.filters.customer).toBe("");
  });

  it("applies list payload and derives pagination helpers", () => {
    const store = usePolicyStore();

    store.applyListPayload([{ name: "POL-001" }, { name: "POL-002" }], 55);
    store.setPagination({ page: 2, pageLength: 20 });

    expect(store.state.items).toHaveLength(2);
    expect(store.state.pagination.total).toBe(55);
    expect(store.totalPages).toBe(3);
    expect(store.hasNextPage).toBe(true);
    expect(store.startRow).toBe(21);
    expect(store.endRow).toBe(40);
  });

  it("tracks active filter count from policy filter mix", () => {
    const store = usePolicyStore();

    store.setFilters({
      query: "abc",
      status: "Active",
      gross_max: "5000",
    });

    expect(store.activeFilterCount).toBe(3);
  });
});
