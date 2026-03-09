import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useCustomerStore } from "../../../src/stores/customer";

describe("useCustomerStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("updates reactive filters without replacing the filter contract", () => {
    const store = useCustomerStore();

    store.setFilters({
      query: "aykut",
      consent_status: "Granted",
      has_phone: true,
      sort: "full_name asc",
    });

    expect(store.state.filters.query).toBe("aykut");
    expect(store.state.filters.consent_status).toBe("Granted");
    expect(store.state.filters.has_phone).toBe(true);
    expect(store.state.filters.sort).toBe("full_name asc");
    expect(store.state.filters.gender).toBe("");
  });

  it("applies list payload and keeps pagination totals in sync", () => {
    const store = useCustomerStore();

    store.applyListPayload({
      rows: [{ name: "CUST-001" }, { name: "CUST-002" }],
      total: 52,
    });
    store.setPagination({ page: 2, pageLength: 20 });

    expect(store.state.items).toHaveLength(2);
    expect(store.state.pagination.total).toBe(52);
    expect(store.totalPages).toBe(3);
    expect(store.hasNextPage).toBe(true);
    expect(store.startRow).toBe(21);
    expect(store.endRow).toBe(40);
  });

  it("tracks active filter count from mixed text and boolean filters", () => {
    const store = useCustomerStore();

    store.setFilters({
      query: "abc",
      assigned_agent: "agent@example.com",
      has_email: true,
      has_open_offer: true,
    });

    expect(store.activeFilterCount).toBe(4);
  });
});
