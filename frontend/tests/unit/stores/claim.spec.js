import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useClaimStore } from "../../../src/stores/claim";

describe("useClaimStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("updates reactive filters without replacing the filter contract", () => {
    const store = useClaimStore();

    store.setFilters({
      query: "clm",
      status: "Approved",
      amountState: "pending_payment",
      limit: 50,
    });

    expect(store.state.filters.query).toBe("clm");
    expect(store.state.filters.status).toBe("Approved");
    expect(store.state.filters.amountState).toBe("pending_payment");
    expect(store.state.filters.limit).toBe(50);
    expect(store.state.filters.policyQuery).toBe("");
  });

  it("filters claim items by query and amount state", () => {
    const store = useClaimStore();
    store.setLocaleCode("tr-TR");
    store.setItems([
      { name: "CLM-001", claim_no: "H-001", policy: "POL-001", approved_amount: 1000, paid_amount: 200 },
      { name: "CLM-002", claim_no: "H-002", policy: "POL-002", approved_amount: 0, paid_amount: 0 },
      { name: "CLM-003", claim_no: "H-003", policy: "ABC-003", approved_amount: 500, paid_amount: 500 },
    ]);

    store.setFilters({
      query: "clm",
      amountState: "pending_payment",
    });

    expect(store.filteredItems.map((item) => item.name)).toEqual(["CLM-001"]);
  });

  it("tracks active filter count from text and limit changes", () => {
    const store = useClaimStore();

    store.setFilters({
      query: "abc",
      policyQuery: "POL",
      limit: 20,
    });

    expect(store.activeFilterCount).toBe(3);
  });
});
