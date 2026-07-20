import { computed } from "vue";
import { defineStore } from "pinia";

import {
  applySessionContextForTest,
  hasSessionCapability,
  hydrateSessionState,
  sessionState,
  setPreferredLocale,
} from "../state/session";

export const useAuthStore = defineStore("auth", () => {
  const user = computed(() => sessionState.user);
  const userId = computed(() => sessionState.userId);
  const locale = computed(() => sessionState.locale);
  const roles = computed(() => sessionState.roles);
  const preferredHome = computed(() => sessionState.preferredHome);
  const interfaceMode = computed(() => sessionState.interfaceMode);
  const capabilities = computed(() => sessionState.capabilities);
  const officeBranches = computed(() => sessionState.officeBranches);
  const defaultOfficeBranch = computed(() => sessionState.defaultOfficeBranch);
  const canAccessAllOfficeBranches = computed(() => sessionState.canAccessAllOfficeBranches);

  const isAuthenticated = computed(() => Boolean(userId.value));
  const isDeskUser = computed(() =>
    roles.value.some((role) => role === "System Manager" || role === "Administrator" || role === "AT System Manager")
  );
  const isSpaUser = computed(() => preferredHome.value === "/at" || interfaceMode.value === "spa");

  async function hydrate() {
    await hydrateSessionState();
  }

  function setLocale(localeValue) {
    return setPreferredLocale(localeValue);
  }

  function hasAnyRole(...allowedRoles) {
    if (!allowedRoles.length) return true;
    const userRoles = new Set(roles.value.map((r) => String(r).trim().toLowerCase()));
    return allowedRoles.some((r) => userRoles.has(String(r).trim().toLowerCase()));
  }

  function can(path, fallback = false) {
    return hasSessionCapability(path, fallback);
  }

  function applyContext(data, loggedUser = null) {
    applySessionContextForTest(data, loggedUser);
  }

  return {
    user,
    userId,
    locale,
    roles,
    preferredHome,
    interfaceMode,
    capabilities,
    officeBranches,
    defaultOfficeBranch,
    canAccessAllOfficeBranches,
    isAuthenticated,
    isDeskUser,
    isSpaUser,
    hydrate,
    setLocale,
    hasAnyRole,
    can,
    applyContext,
  };
});
