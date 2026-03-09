import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { sessionState } from "../state/session";
import { useBranchStore } from "./branch";

describe("branch store route fallback", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    sessionState.officeBranches = [{ name: "ANK", office_branch_name: "Ankara", is_default: 1 }];
    sessionState.defaultOfficeBranch = "ANK";
    sessionState.canAccessAllOfficeBranches = true;
  });

  it("clears selected branch for all-access user when route query is empty", () => {
    const store = useBranchStore();
    store.hydrateFromSession();

    store.syncFromRoute({ query: {} });

    expect(store.selected).toBe(null);
  });

  it("exposes null request branch for all-access user with no selected branch", () => {
    const store = useBranchStore();
    store.hydrateFromSession();
    store.syncFromRoute({ query: {} });

    expect(store.requestBranch).toBe(null);
  });

  it("falls back to default branch for scoped user", () => {
    sessionState.canAccessAllOfficeBranches = false;
    const store = useBranchStore();
    store.hydrateFromSession();

    expect(store.requestBranch).toBe("ANK");
  });
});
