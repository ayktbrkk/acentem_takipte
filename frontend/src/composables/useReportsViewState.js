export function useReportsViewState({
  filters,
  columns,
  visibleColumnKeys,
  pendingVisibleColumnKeys,
  sortState,
  route,
  router,
  error,
  t,
}) {
  const COLUMN_MIGRATIONS = {
    policy_list: {
      customer: "customer_full_name",
      sales_entity: "sales_entity_full_name",
    },
  };

  function getViewStorageKey() {
    return `at:reports:view:${filters.reportKey}`;
  }

  function getSafeLocalStorage() {
    const storage = window?.localStorage;
    if (!storage) return null;
    return typeof storage.getItem === "function" && typeof storage.setItem === "function" ? storage : null;
  }

  function migrateColumnKeys(reportKey, keys) {
    const renames = COLUMN_MIGRATIONS[reportKey];
    if (!renames || !keys.length) return keys;
    const migrated = keys.map((k) => renames[k] ?? k);
    if (keys.includes("customer") && !migrated.includes("customer_tax_id")) {
      const insertAt = migrated.indexOf("customer_full_name");
      if (insertAt !== -1) migrated.splice(insertAt + 1, 0, "customer_tax_id");
      else migrated.push("customer_tax_id");
    }
    return migrated;
  }

  function applyViewState(payload = {}) {
    const rawKeys = Array.isArray(payload?.visibleColumnKeys)
      ? payload.visibleColumnKeys.filter((item) => typeof item === "string" && item)
      : [];
    const columnKeys = migrateColumnKeys(filters.reportKey, rawKeys);

    pendingVisibleColumnKeys.value = [...columnKeys];
    visibleColumnKeys.value = columnKeys.length
      ? columns.value.filter((column) => columnKeys.includes(column))
      : [...columns.value];

    sortState.column = typeof payload?.sortColumn === "string" && payload.sortColumn ? payload.sortColumn : "";
    sortState.direction = payload?.sortDirection === "asc" || payload?.sortDirection === "desc" ? payload.sortDirection : "";
  }

  function buildViewStatePayload() {
    return {
      visibleColumnKeys: [...visibleColumnKeys.value],
      sortColumn: sortState.column || "",
      sortDirection: sortState.direction || "",
    };
  }

  function persistViewStateToStorage() {
    try {
      const storage = getSafeLocalStorage();
      if (!storage) return;
      storage.setItem(getViewStorageKey(), JSON.stringify(buildViewStatePayload()));
    } catch (err) {
      error.value = String(err?.message || err || t("viewStateError"));
    }
  }

  function syncViewStateFromStorage() {
    try {
      const storage = getSafeLocalStorage();
      if (!storage) {
        applyViewState({});
        return;
      }
      const raw = storage.getItem(getViewStorageKey());
      if (!raw) {
        applyViewState({});
        return;
      }
      applyViewState(JSON.parse(raw));
    } catch {
      applyViewState({});
    }
  }

  function syncViewStateFromRoute() {
    const visibleColumnsFromRoute = String(route.query?.report_cols || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    applyViewState({
      visibleColumnKeys: visibleColumnsFromRoute,
      sortColumn: String(route.query?.report_sort || ""),
      sortDirection: String(route.query?.report_dir || ""),
    });
  }

  function persistViewStateToRoute() {
    const nextQuery = {
      ...route.query,
      report: filters.reportKey,
      report_cols: visibleColumnKeys.value.length ? visibleColumnKeys.value.join(",") : undefined,
      report_sort: sortState.column || undefined,
      report_dir: sortState.direction || undefined,
    };

    if (JSON.stringify(nextQuery) === JSON.stringify(route.query || {})) {
      return;
    }

    void router.replace({ query: nextQuery });
  }

  return {
    applyViewState,
    buildViewStatePayload,
    persistViewStateToStorage,
    syncViewStateFromStorage,
    syncViewStateFromRoute,
    persistViewStateToRoute,
  };
}
