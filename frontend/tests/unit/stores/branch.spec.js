import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useAuthStore } from "../../../src/stores/auth";
import { useBranchStore } from "../../../src/stores/branch";
import { OFFICE_BRANCH_QUERY_KEY } from "../../../src/router";

describe("useBranchStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("hydrates selected branch from session context", () => {
    const authStore = useAuthStore();
    const branchStore = useBranchStore();

    authStore.applyContext({
      user: "agent@example.com",
      roles: ["Agent"],
      preferred_home: "/at",
      interface_mode: "spa",
      office_branches: [
        { name: "IST", office_branch_name: "Istanbul", is_default: 1 },
        { name: "ANK", office_branch_name: "Ankara", is_default: 0 },
      ],
      default_office_branch: "IST",
      can_access_all_office_branches: false,
    });

    branchStore.hydrateFromSession();

    expect(branchStore.selected).toBe("IST");
    expect(branchStore.requestBranch).toBe("IST");
    expect(branchStore.options).toHaveLength(2);
  });

  it("allows all-branch users to clear route scoped selection", () => {
    const authStore = useAuthStore();
    const branchStore = useBranchStore();

    authStore.applyContext({
      user: "manager@example.com",
      roles: ["Manager"],
      preferred_home: "/at",
      interface_mode: "spa",
      office_branches: [
        { name: "IST", office_branch_name: "Istanbul", is_default: 1 },
        { name: "ANK", office_branch_name: "Ankara", is_default: 0 },
      ],
      default_office_branch: "IST",
      can_access_all_office_branches: true,
    });

    branchStore.hydrateFromSession();
    branchStore.syncFromRoute({ query: {} });

    expect(branchStore.selected).toBe(null);
    expect(branchStore.requestBranch).toBe(null);
  });

  it("persists active branch to router query", async () => {
    const authStore = useAuthStore();
    const branchStore = useBranchStore();
    const replace = async (payload) => payload;

    authStore.applyContext({
      user: "agent@example.com",
      roles: ["Agent"],
      preferred_home: "/at",
      interface_mode: "spa",
      office_branches: [{ name: "IST", office_branch_name: "Istanbul", is_default: 1 }],
      default_office_branch: "IST",
      can_access_all_office_branches: false,
    });

    branchStore.hydrateFromSession();
    branchStore.setActiveBranch("IST");

    const router = { replace };
    const route = { path: "/customers", query: {}, hash: "" };
    let received = null;
    router.replace = async (payload) => {
      received = payload;
    };

    await branchStore.persistToRoute(router, route);

    expect(received.query[OFFICE_BRANCH_QUERY_KEY]).toBe("IST");
  });
});
