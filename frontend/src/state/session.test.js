import { describe, expect, it } from "vitest";

import { applySessionContextForTest, sessionState, setPreferredLocale } from "./session";

describe("session branch context", () => {
  it("syncs document.documentElement.lang on locale change", () => {
    setPreferredLocale("tr");
    expect(document.documentElement.lang).toBe("tr");
    setPreferredLocale("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("hydrates office branch state from session context", () => {
    applySessionContextForTest({
      user: "agent@example.com",
      full_name: "Agent User",
      branch: null,
      office_branches: [{ name: "BR-1", office_branch_name: "Istanbul" }],
      default_office_branch: "BR-1",
      can_access_all_office_branches: false,
      locale: "tr",
      capabilities: {},
      roles: ["Agent"],
      preferred_home: "/at",
      interface_mode: "spa",
    });

    expect(sessionState.officeBranches).toEqual([{ name: "BR-1", office_branch_name: "Istanbul" }]);
    expect(sessionState.defaultOfficeBranch).toBe("BR-1");
    expect(sessionState.canAccessAllOfficeBranches).toBe(false);
  });
});
