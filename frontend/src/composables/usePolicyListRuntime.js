import { computed, onMounted, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";

import { openListExport } from "../utils/listExport";

function buildPolicyFilterPayload(filters) {
  const out = { filters: {} };
  if (filters.insurance_company) out.filters.insurance_company = filters.insurance_company;
  if (filters.status) out.filters.status = filters.status;
  if (filters.end_date) out.filters.end_date = ["<=", filters.end_date];
  if (filters.customer) out.filters.customer = ["like", `%${filters.customer}%`];
  if (filters.gross_min !== "") out.filters.gross_premium = [">=", Number(filters.gross_min || 0)];
  if (filters.gross_max !== "") {
    if (Array.isArray(out.filters.gross_premium)) {
      out.filters.gross_premium = ["between", [Number(filters.gross_min || 0), Number(filters.gross_max || 0)]];
    } else {
      out.filters.gross_premium = ["<=", Number(filters.gross_max || 0)];
    }
  }
  if (filters.query) {
    out.or_filters = [
      ["AT Policy", "name", "like", `%${filters.query}%`],
      ["AT Policy", "policy_no", "like", `%${filters.query}%`],
      ["AT Policy", "customer", "like", `%${filters.query}%`],
    ];
  }
  return out;
}

export function usePolicyListRuntime({
  t,
  filters,
  pagination,
  branchStore,
  initialActiveFilters = 0,
  policyStore,
}) {
  const policyResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
    transform(data) {
      if (Array.isArray(data)) {
        return Object.freeze(data.map((item) => Object.freeze({ ...item })));
      }
      return data;
    },
  });

  const policyCountResource = createResource({
    url: "frappe.client.get_count",
    auto: false,
  });
  const policyLoading = computed(() => Boolean(unref(policyResource.loading)));
  const policyListError = ref("");
  const policyListPage = computed({
    get: () => Number(pagination.page || 1),
    set: (value) => {
      pagination.page = Number(value) || 1;
      void refreshPolicyList();
    },
  });
  const totalPages = computed(() => policyStore.totalPages);
  const hasNextPage = computed(() => policyStore.hasNextPage);
  const startRow = computed(() => policyStore.startRow);
  const endRow = computed(() => policyStore.endRow);
  const isInitialLoading = computed(() => policyStore.state.loading && policyStore.state.items.length === 0);
  const policyActiveFilterCount = computed(() => policyStore.activeFilterCount || initialActiveFilters);

  const withOfficeBranchFilter = (params) => {
    const officeBranch = branchStore.requestBranch || "";
    if (!officeBranch) return params;
    return {
      ...params,
      filters: {
        ...(params.filters || {}),
        office_branch: officeBranch,
      },
    };
  };

  function buildPolicyParams() {
    const payload = buildPolicyFilterPayload(filters);
    return withOfficeBranchFilter({
      doctype: "AT Policy",
      fields: [
        "name",
        "policy_no",
        "customer",
        "insurance_company",
        "status",
        "currency",
        "end_date",
        "gross_premium",
        "commission_amount",
        "commission",
        "gwp_try",
      ],
      filters: payload.filters,
      ...(payload.or_filters ? { or_filters: payload.or_filters } : {}),
      order_by: filters.sort,
      limit_start: (pagination.page - 1) * pagination.pageLength,
      limit_page_length: pagination.pageLength,
    });
  }

  function buildPolicyExportQuery() {
    const payload = buildPolicyFilterPayload(filters);
    return withOfficeBranchFilter({
      filters: payload.filters,
      ...(payload.or_filters ? { or_filters: payload.or_filters } : {}),
      order_by: filters.sort,
    });
  }

  function buildCountParams() {
    const payload = buildPolicyFilterPayload(filters);
    return withOfficeBranchFilter({
      doctype: "AT Policy",
      filters: payload.filters,
      ...(payload.or_filters ? { or_filters: payload.or_filters } : {}),
    });
  }

  function downloadPolicyExport(format) {
    openListExport({
      screen: "policy_list",
      query: buildPolicyExportQuery(),
      format,
      limit: 1000,
    });
  }

  function focusPolicySearch() {
    const searchInput = document.querySelector('input[placeholder*="ara"]');
    if (searchInput instanceof HTMLInputElement) {
      searchInput.focus();
      searchInput.select();
    }
  }

  function openPolicyDetail(policyName, router) {
    router.push({ name: "policy-detail", params: { name: policyName } });
  }

  async function refreshPolicyList() {
    if (pagination.page > totalPages.value && policyStore.state.pagination.total > 0) {
      pagination.page = totalPages.value;
    }

    policyResource.params = buildPolicyParams();
    policyCountResource.params = buildCountParams();
    policyStore.setLoading(true);
    policyStore.clearError();

    const [recordsResult, countResult] = await Promise.allSettled([policyResource.reload(), policyCountResource.reload()]);

    if (recordsResult.status === "fulfilled") {
      const records = recordsResult.value || [];
      policyResource.setData(records);
      policyListError.value = "";

      if (countResult.status === "fulfilled") {
        const total = Number(countResult.value || 0);
        policyStore.applyListPayload(records, Number.isFinite(total) ? total : 0);
      } else {
        policyStore.applyListPayload(records, records.length);
      }
      policyStore.setLoading(false);
      return;
    }

    policyResource.setData([]);
    policyStore.applyListPayload([], 0);
    policyStore.setError(t("loadError"));
    policyStore.setLoading(false);
    policyListError.value = t("loadError");
  }

  function bindPolicyListLifecycle({ hydratePolicyPresetStateFromServer, applyPolicyPreset, policyPresetKey, branchSelected }) {
    applyPolicyPreset(policyPresetKey.value, { refresh: false });
    onMounted(() => {
      void (async () => {
        await hydratePolicyPresetStateFromServer();
        await refreshPolicyList();
      })();
    });

    watch(
      () => pagination.pageLength,
      () => {
        pagination.page = 1;
        void refreshPolicyList();
      }
    );

    watch(
      () => branchSelected?.value,
      () => {
        pagination.page = 1;
        void refreshPolicyList();
      }
    );
  }

  return {
    policyResource,
    policyCountResource,
    policyLoading,
    policyListError,
    policyListPage,
    policyActiveFilterCount,
    totalPages,
    hasNextPage,
    startRow,
    endRow,
    isInitialLoading,
    buildPolicyParams,
    buildPolicyExportQuery,
    buildCountParams,
    downloadPolicyExport,
    focusPolicySearch,
    openPolicyDetail,
    refreshPolicyList,
    bindPolicyListLifecycle,
  };
}
