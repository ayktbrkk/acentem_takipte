import { computed, ref } from "vue";
import { defineStore } from "pinia";

import { OFFICE_BRANCH_QUERY_KEY } from "../router";
import { sessionState } from "../state/session";

export const useBranchStore = defineStore("branch", () => {
  const items = ref([]);
  const selected = ref(null);
  const loading = ref(false);
  const error = ref("");
  const canAccessAll = ref(false);

  const options = computed(() => items.value.map((item) => ({
    value: item.name,
    label: item.office_branch_name || item.name,
    code: item.office_branch_code || "",
    city: item.city || "",
    isDefault: Boolean(item.is_default),
  })));
  const defaultBranch = computed(() => {
    const defaultName = sessionState.defaultOfficeBranch || null;
    if (defaultName) {
      return items.value.find((item) => item.name === defaultName) || null;
    }
    return items.value.find((item) => Boolean(item.is_default)) || items.value[0] || null;
  });

  const activeBranch = computed(() => {
    if (!selected.value) {
      return null;
    }
    return items.value.find((item) => item.name === selected.value) || null;
  });
  const selectedBranch = computed(() => activeBranch.value || defaultBranch.value);
  const requestBranch = computed(() => {
    if (selected.value) {
      return selected.value;
    }
    if (canAccessAll.value) {
      return null;
    }
    return sessionState.defaultOfficeBranch || null;
  });

  function hydrateFromSession() {
    items.value = Array.isArray(sessionState.officeBranches) ? sessionState.officeBranches : [];
    canAccessAll.value = Boolean(sessionState.canAccessAllOfficeBranches);

    if (sessionState.defaultOfficeBranch) {
      selected.value = sessionState.defaultOfficeBranch;
      return;
    }

    if (items.value.length > 0) {
      const defaultItem = items.value.find((item) => Boolean(item.is_default));
      selected.value = (defaultItem && defaultItem.name) || items.value[0].name;
      return;
    }

    selected.value = null;
  }

  function setActiveBranch(branchName) {
    const normalized = String(branchName || "").trim();
    if (!normalized) {
      selected.value = canAccessAll.value ? null : selected.value;
      return;
    }
    if (items.value.some((item) => item.name === normalized)) {
      selected.value = normalized;
    }
  }

  function syncFromRoute(route) {
    const routeBranch = String(route?.query?.[OFFICE_BRANCH_QUERY_KEY] || "").trim();
    if (!routeBranch) {
      if (canAccessAll.value) {
        selected.value = null;
      }
      return;
    }
    if (items.value.some((item) => item.name === routeBranch)) {
      selected.value = routeBranch;
    }
  }

  async function persistToRoute(router, route) {
    if (!router || !route) {
      return;
    }
    const nextQuery = { ...(route.query || {}) };
    if (selected.value) {
      nextQuery[OFFICE_BRANCH_QUERY_KEY] = selected.value;
    } else {
      delete nextQuery[OFFICE_BRANCH_QUERY_KEY];
    }
    await router.replace({
      path: route.path,
      query: nextQuery,
      hash: route.hash,
    });
  }

  return {
    items,
    selected,
    loading,
    error,
    canAccessAll,
    options,
    defaultBranch,
    activeBranch,
    selectedBranch,
    requestBranch,
    hydrateFromSession,
    setActiveBranch,
    syncFromRoute,
    persistToRoute,
  };
});
