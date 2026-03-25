import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { sessionState } from "../state/session";
import { useBranchStore } from "./branch";

describe("branch store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    sessionState.officeBranches = [];
    sessionState.defaultOfficeBranch = null;
    sessionState.canAccessAllOfficeBranches = false;
  });

  it("hydrates branch items and default selection from session state", () => {
    sessionState.officeBranches = [{ name: "BR-1", office_branch_name: "Istanbul", is_default: 1 }];
    sessionState.defaultOfficeBranch = "BR-1";

    const store = useBranchStore();
    store.hydrateFromSession();

    expect(store.items).toEqual([{ name: "BR-1", office_branch_name: "Istanbul", is_default: 1 }]);
    expect(store.selected).toBe("BR-1");
    expect(store.activeBranch).toEqual({ name: "BR-1", office_branch_name: "Istanbul", is_default: 1 });
  });

  it("allows clearing active branch only for all-branch users", () => {
    sessionState.officeBranches = [{ name: "BR-1", office_branch_name: "Istanbul", is_default: 1 }];
    sessionState.defaultOfficeBranch = "BR-1";
    sessionState.canAccessAllOfficeBranches = true;

    const store = useBranchStore();
    store.hydrateFromSession();
    store.setActiveBranch(null);

    expect(store.selected).toBe(null);
  });

  it("syncs selected branch from router query when present", () => {
    sessionState.officeBranches = [
      { name: "BR-1", office_branch_name: "Istanbul", is_default: 1 },
      { name: "BR-2", office_branch_name: "Ankara", is_default: 0 },
    ];
    sessionState.defaultOfficeBranch = "BR-1";

    const store = useBranchStore();
    store.hydrateFromSession();
    store.syncFromRoute({ query: { office_branch: "BR-2" } });

    expect(store.selected).toBe("BR-2");
  });

  it("builds tree-aware branch option labels", () => {
    sessionState.officeBranches = [
      { name: "HQ", office_branch_name: "AT Sigorta", is_head_office: 1, is_default: 1 },
      { name: "SUB", office_branch_name: "Ankara", parent_office_branch: "HQ", is_default: 0 },
    ];
    sessionState.defaultOfficeBranch = "HQ";
    sessionState.locale = "tr";

    const store = useBranchStore();
    store.hydrateFromSession();

    expect(store.options.map((row) => row.label)).toEqual(["AT Sigorta [Merkez]", "  - Ankara"]);
  });
});

