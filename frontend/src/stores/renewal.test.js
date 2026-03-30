import { describe, expect, it, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useRenewalStore } from "./renewal";

describe("renewal store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("exposes resetFilters alias and resets state", () => {
    const store = useRenewalStore();
    store.setFilters({ query: "abc", status: "Open", policyQuery: "POL", dueScope: "7", limit: 99 });
    store.setItems([{ name: "REN-1", status: "Open" }]);

    expect(store.state.filters.query).toBe("abc");
    expect(typeof store.resetFilters).toBe("function");

    store.resetFilters();

    expect(store.state.filters).toMatchObject({
      query: "",
      status: "",
      policyQuery: "",
      dueScope: "",
      limit: 40,
    });
    expect(store.state.items).toEqual([]);
    expect(store.state.summary.total).toBe(0);
  });
});
