import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";

import { useAuthStore } from "../../../src/stores/auth";

describe("useAuthStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("derives desk and spa access from session context", () => {
    const store = useAuthStore();

    store.applyContext({
      user: "manager@example.com",
      full_name: "Manager",
      roles: ["Manager"],
      preferred_home: "/at",
      interface_mode: "spa",
      locale: "tr",
      capabilities: {
        quickCreate: {
          ATPolicy: true,
        },
      },
    });

    expect(store.isAuthenticated).toBe(true);
    expect(store.isSpaUser).toBe(true);
    expect(store.isDeskUser).toBe(false);
    expect(store.can("quickCreate.ATPolicy")).toBe(true);

    store.applyContext({
      user: "Administrator",
      full_name: "Administrator",
      roles: ["System Manager"],
      preferred_home: "/app",
      interface_mode: "desk",
      locale: "en",
    });

    expect(store.isDeskUser).toBe(true);
    expect(store.isSpaUser).toBe(false);
    expect(store.preferredHome).toBe("/app");
    expect(store.locale).toBe("en");
  });

  it("exposes office branch context from session payload", () => {
    const store = useAuthStore();

    store.applyContext({
      user: "branch.user@example.com",
      roles: ["Agent"],
      preferred_home: "/at",
      interface_mode: "spa",
      office_branches: [
        { name: "IST", office_branch_name: "Istanbul", is_default: 1 },
        { name: "ANK", office_branch_name: "Ankara", is_default: 0 },
      ],
      default_office_branch: "IST",
      can_access_all_office_branches: true,
    });

    expect(store.officeBranches).toHaveLength(2);
    expect(store.defaultOfficeBranch).toBe("IST");
    expect(store.canAccessAllOfficeBranches).toBe(true);
  });
});
