import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { usePaymentStore } from "../../../src/stores/payment";

describe("usePaymentStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("updates reactive filters without replacing the filter contract", () => {
    const store = usePaymentStore();

    store.setFilters({
      query: "pay",
      direction: "Inbound",
      customerQuery: "acme",
      limit: 50,
    });

    expect(store.state.filters.query).toBe("pay");
    expect(store.state.filters.direction).toBe("Inbound");
    expect(store.state.filters.customerQuery).toBe("acme");
    expect(store.state.filters.limit).toBe(50);
    expect(store.state.filters.sort).toBe("modified desc");
  });

  it("filters payment items and derives inbound/outbound totals", () => {
    const store = usePaymentStore();
    store.setLocaleCode("tr-TR");
    store.setItems([
      { name: "PAY-001", payment_no: "T-001", customer: "Acme", policy: "POL-001", payment_direction: "Inbound", amount_try: 1000 },
      { name: "PAY-002", payment_no: "T-002", customer: "Beta", policy: "POL-002", payment_direction: "Outbound", amount_try: 300 },
      { name: "PAY-003", payment_no: "T-003", customer: "Acme", policy: "XYZ-003", payment_direction: "Inbound", amount_try: 700 },
    ]);

    store.setFilters({
      customerQuery: "acme",
    });

    expect(store.filteredItems.map((item) => item.name)).toEqual(["PAY-001", "PAY-003"]);
    expect(store.inboundTotal).toBe(1700);
    expect(store.outboundTotal).toBe(0);
  });

  it("tracks active filter count from text, sort and limit changes", () => {
    const store = usePaymentStore();

    store.setFilters({
      query: "abc",
      sort: "amount_try desc",
      limit: 100,
    });

    expect(store.activeFilterCount).toBe(3);
  });
});
