import { computed, ref, unref } from "vue";
import { createResource } from "frappe-ui";

import { openListExport } from "../utils/listExport";

function buildOfficeBranchLookupFilters(branchStore) {
  const officeBranch = branchStore.requestBranch || "";
  return officeBranch ? { office_branch: officeBranch } : {};
}

function normalizePolicyOrderBy(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^modified\s+(asc|desc)$/i);
  if (match) return `\`tabAT Policy\`.modified ${match[1].toLowerCase()}`;
  return raw || "`tabAT Policy`.modified desc";
}

export function usePolicyListRuntime({ t, branchStore, policyStore, filters, pagination }) {
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
  const totalPages = computed(() => policyStore.totalPages);
  const hasNextPage = computed(() => policyStore.hasNextPage);
  const startRow = computed(() => policyStore.startRow);
  const endRow = computed(() => policyStore.endRow);
  const isInitialLoading = computed(() => policyStore.state.loading && (policyStore.state.items || []).length === 0);
  const policyListPage = computed({
    get: () => Number(pagination.page || 1),
    set: (value) => {
      pagination.page = Number(value) || 1;
      void refreshPolicyList();
    },
  });
  const policyListPageSize = computed(() => Math.max(1, Number(pagination.pageLength || 20)));

  function withOfficeBranchFilter(params) {
    const officeBranchFilters = buildOfficeBranchLookupFilters(branchStore);
    if (!officeBranchFilters.office_branch) return params;
    return {
      ...params,
      filters: {
        ...(params.filters || {}),
        ...officeBranchFilters,
      },
    };
  }

  function buildPolicyFilterPayload() {
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

  function buildPolicyParams() {
    const payload = buildPolicyFilterPayload();
    return withOfficeBranchFilter({
      doctype: "AT Policy",
      fields: [
        "name",
        "policy_no",
        "customer",
        "customer.full_name as customer_full_name",
        "customer.customer_type as customer_customer_type",
        "customer.masked_tax_id as customer_masked_tax_id",
        "customer.birth_date as customer_birth_date",
        "insurance_company",
        "branch",
        "status",
        "currency",
        "issue_date",
        "start_date",
        "end_date",
        "gross_premium",
        "commission_amount",
        "commission",
        "gwp_try",
      ],
      filters: payload.filters,
      ...(payload.or_filters ? { or_filters: payload.or_filters } : {}),
      order_by: normalizePolicyOrderBy(filters.sort),
      limit_start: (pagination.page - 1) * pagination.pageLength,
      limit_page_length: pagination.pageLength,
    });
  }

  function buildPolicyExportQuery() {
    const payload = buildPolicyFilterPayload();
    return withOfficeBranchFilter({
      filters: payload.filters,
      ...(payload.or_filters ? { or_filters: payload.or_filters } : {}),
      order_by: normalizePolicyOrderBy(filters.sort),
    });
  }

  function buildCountParams() {
    const payload = buildPolicyFilterPayload();
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

  async function refreshPolicyList() {
    if (pagination.page > totalPages.value && policyStore.state.pagination.total > 0) {
      pagination.page = totalPages.value;
    }

    policyResource.params = buildPolicyParams();
    policyCountResource.params = buildCountParams();
    policyStore.setLoading(true);
    policyStore.clearError();

    const [recordsResult, countResult] = await Promise.allSettled([
      policyResource.reload(),
      policyCountResource.reload(),
    ]);

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

  function applyFilters() {
    pagination.page = 1;
    void refreshPolicyList();
  }

  function previousPage() {
    if (pagination.page <= 1) return;
    pagination.page -= 1;
    void refreshPolicyList();
  }

  function nextPage() {
    if (!hasNextPage.value) return;
    pagination.page += 1;
    void refreshPolicyList();
  }

  function focusPolicySearch() {
    const searchInput = document.querySelector('input[placeholder*="ara"]');
    if (searchInput instanceof HTMLInputElement) {
      searchInput.focus();
      searchInput.select();
    }
  }

  return {
    policyResource,
    policyCountResource,
    policyLoading,
    policyListError,
    totalPages,
    hasNextPage,
    startRow,
    endRow,
    isInitialLoading,
    policyListPage,
    policyListPageSize,
    buildPolicyFilterPayload,
    buildPolicyParams,
    buildPolicyExportQuery,
    buildCountParams,
    downloadPolicyExport,
    refreshPolicyList,
    applyFilters,
    previousPage,
    nextPage,
    focusPolicySearch,
  };
}
