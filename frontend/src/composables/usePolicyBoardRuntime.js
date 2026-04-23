import { computed, reactive, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter, useRoute } from "vue-router";
import { translateText } from "../utils/i18n";

export function usePolicyBoardRuntime({ activeLocale = ref("tr") } = {}) {
  const router = useRouter();
  const route = useRoute();

  function t(key) {
    return translateText(key, activeLocale);
  }

  const filters = reactive({
    query: route.query.query || "",
    status: route.query.status || "",
    insurance_company: route.query.insurance_company || "",
    branch: route.query.branch || "",
    office_branch: route.query.office_branch || "",
    sort: route.query.sort || "modified desc",
  });

  const pagination = reactive({
    page: parseInt(route.query.page || "1"),
    pageLength: 20,
  });

  const policyResource = createResource({
    url: "frappe.client.get_list",
    params: {
      doctype: "AT Policy",
      fields: ["name", "policy_no", "customer", "insurance_company", "branch", "status", "gross_premium", "currency", "end_date"],
      order_by: "modified desc",
    },
    auto: false,
  });

  const summary = computed(() => {
    unref(activeLocale);
    const rows = unref(policyResource.data) || [];
    return {
      total: rows.length,
      active: rows.filter(r => r.status === "Active").length,
      waiting: rows.filter(r => r.status === "KYT").length,
      cancelled: rows.filter(r => r.status === "IPT").length,
    };
  });

  const rows = computed(() => {
    unref(activeLocale);
    const data = unref(policyResource.data) || [];
    return data.map(row => ({
      ...row,
      status_label: t(`status_${String(row.status || "Active").toLowerCase()}`),
    }));
  });

  const loading = computed(() => policyResource.loading);

  async function reload() {
    const params = {
      doctype: "AT Policy",
      fields: ["name", "policy_no", "customer", "insurance_company", "branch", "status", "gross_premium", "currency", "end_date"],
      filters: {},
      order_by: filters.sort,
      limit_start: (pagination.page - 1) * pagination.pageLength,
      limit_page_length: pagination.pageLength,
    };

    if (filters.query) {
      params.filters.policy_no = ["like", `%${filters.query}%`];
    }
    if (filters.status) {
      params.filters.status = filters.status;
    }
    if (filters.insurance_company) {
      params.filters.insurance_company = filters.insurance_company;
    }
    if (filters.branch) {
      params.filters.branch = filters.branch;
    }
    if (filters.office_branch) {
      params.filters.office_branch = filters.office_branch;
    }

    await policyResource.reload(params);
    
    // Sync with route query
    const query = { ...filters, page: pagination.page };
    // Remove empty values
    Object.keys(query).forEach(key => {
      if (!query[key]) delete query[key];
    });
    router.replace({ query });
  }

  function setPage(p) {
    pagination.page = p;
    reload();
  }

  function updateFilter(key, value) {
    filters[key] = value;
    pagination.page = 1;
    reload();
  }

  function openPolicy(name) {
    router.push({ name: "policy-detail", params: { name } });
  }

  // Initial load
  reload();

  return {
    filters,
    pagination,
    summary,
    rows,
    loading,
    t,
    reload,
    setPage,
    updateFilter,
    openPolicy,
  };
}

