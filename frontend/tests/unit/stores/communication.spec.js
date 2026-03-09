import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useCommunicationStore } from "../../../src/stores/communication";

describe("useCommunicationStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("updates reactive filters without replacing the filter contract", () => {
    const store = useCommunicationStore();

    store.setFilters({
      customer: "CUST-001",
      status: "Queued",
      channel: "WHATSAPP",
      limit: 100,
    });

    expect(store.state.filters.customer).toBe("CUST-001");
    expect(store.state.filters.status).toBe("Queued");
    expect(store.state.filters.channel).toBe("WHATSAPP");
    expect(store.state.filters.limit).toBe(100);
    expect(store.state.filters.referenceName).toBe("");
  });

  it("stores snapshot payload and derives queue sections", () => {
    const store = useCommunicationStore();

    store.setSnapshot({
      outbox: [{ name: "OUT-001" }],
      drafts: [{ name: "DRF-001" }],
      status_breakdown: [
        { status: "Queued", total: 4 },
        { status: "Sent", total: 2 },
      ],
    });

    expect(store.outboxItems).toHaveLength(1);
    expect(store.draftItems).toHaveLength(1);
    expect(store.statusCards.find((item) => item.status === "Queued")?.value).toBe(4);
    expect(store.statusCards.find((item) => item.status === "Sent")?.value).toBe(2);
  });

  it("tracks active filter count from context filters and limit", () => {
    const store = useCommunicationStore();

    store.setFilters({
      customer: "CUST-001",
      channel: "SMS",
      referenceDoctype: "AT Policy",
      limit: 20,
    });

    expect(store.activeFilterCount).toBe(4);
  });
});
