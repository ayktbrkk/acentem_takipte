import { beforeEach } from "vitest";

import { sessionState } from "../src/state/session";

function resetSessionState() {
  sessionState.user = "";
  sessionState.userId = "";
  sessionState.branch = null;
  sessionState.officeBranches = [];
  sessionState.defaultOfficeBranch = null;
  sessionState.canAccessAllOfficeBranches = false;
  sessionState.locale = "en";
  sessionState.capabilities = {
    quickCreate: {},
    quickEdit: {},
    actions: {},
    doctypes: {},
  };
  sessionState.realtime = { enabled: false, port: null };
  sessionState.roles = [];
  sessionState.preferredHome = "/at";
  sessionState.interfaceMode = "spa";
}

beforeEach(() => {
  try {
    const storage = window.localStorage;
    if (typeof storage?.clear === "function") {
      storage.clear();
    } else if (typeof storage?.removeItem === "function") {
      storage.removeItem("at_locale");
    }
  } catch (error) {
    // Some Vitest storage shims are intentionally minimal.
  }
  document.cookie = "user_lang=; path=/; max-age=0; SameSite=Lax";
  document.documentElement.lang = "en";
  resetSessionState();
});
