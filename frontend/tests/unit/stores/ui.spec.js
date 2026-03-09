import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useUiStore } from "../../../src/stores/ui";

describe("useUiStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("opens, closes and toggles sidebar state", () => {
    const store = useUiStore();

    store.closeSidebar();
    expect(store.sidebarOpen).toBe(false);

    store.openSidebar();
    expect(store.sidebarOpen).toBe(true);

    store.toggleSidebar();
    expect(store.sidebarOpen).toBe(false);
  });

  it("persists collapsed facade state through store actions", () => {
    const store = useUiStore();

    store.setCollapsed(true);
    expect(store.sidebarCollapsed).toBe(true);

    store.toggleSidebarCollapsed();
    expect(store.sidebarCollapsed).toBe(false);
  });
});
