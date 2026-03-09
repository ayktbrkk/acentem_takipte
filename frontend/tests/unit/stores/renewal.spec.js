import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useRenewalStore } from "../../../src/stores/renewal";

describe("useRenewalStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("updates reactive filters without replacing the filter contract", () => {
    const store = useRenewalStore();

    store.setFilters({
      query: "abc",
      status: "Open",
      dueScope: "30",
      limit: 80,
    });

    expect(store.state.filters.query).toBe("abc");
    expect(store.state.filters.status).toBe("Open");
    expect(store.state.filters.dueScope).toBe("30");
    expect(store.state.filters.limit).toBe(80);
    expect(store.state.filters.policyQuery).toBe("");
  });

  it("tracks items, open items and terminal items", () => {
    const store = useRenewalStore();

    store.setItems([
      { name: "RT-001", status: "Open" },
      { name: "RT-002", status: "Done" },
      { name: "RT-003", status: "Cancelled" },
      { name: "RT-004", status: "In Progress" },
    ]);

    expect(store.state.items).toHaveLength(4);
    expect(store.openItems.map((item) => item.name)).toEqual(["RT-001"]);
    expect(store.terminalItems.map((item) => item.name)).toEqual(["RT-002", "RT-003"]);
    expect(store.state.summary).toEqual({
      total: 4,
      open: 1,
      inProgress: 1,
      done: 1,
      cancelled: 1,
    });
  });

  it("stores summary payload as the page-level aggregation contract", () => {
    const store = useRenewalStore();

    store.setSummary({
      total: 10,
      open: 4,
      inProgress: 2,
      done: 3,
      cancelled: 1,
    });

    expect(store.state.summary.total).toBe(10);
    expect(store.state.summary.open).toBe(4);
    expect(store.state.summary.inProgress).toBe(2);
    expect(store.state.summary.done).toBe(3);
    expect(store.state.summary.cancelled).toBe(1);
  });
});
