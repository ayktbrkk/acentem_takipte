import { computed, reactive, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { CLAIM_TRANSLATIONS } from "../config/claim_translations";

export function useClaimBoardRuntime({ activeLocale = ref("tr") } = {}) {
  const router = useRouter();

  function t(key) {
    const locale = unref(activeLocale) || "tr";
    return CLAIM_TRANSLATIONS[locale]?.[key] || CLAIM_TRANSLATIONS.en?.[key] || key;
  }

  const filters = reactive({
    query: "",
    status: "",
    claim_type: "",
    sort: "creation desc",
  });

  const pagination = reactive({
    page: 1,
    pageLength: 20,
  });

  const claimResource = createResource({
    url: "frappe.client.get_list",
    params: {
      doctype: "AT Claim",
      fields: ["name", "customer", "insurance_company", "policy", "status", "claim_date", "total_amount", "currency"],
      order_by: "creation desc",
    },
    auto: false,
  });

  const summary = computed(() => {
    const rows = unref(claimResource.data) || [];
    return {
      total: rows.length,
      active: rows.filter(r => r.status === "Open" || r.status === "In Progress").length,
      closed: rows.filter(r => r.status === "Closed").length,
      rejected: rows.filter(r => r.status === "Rejected").length,
    };
  });

  const rows = computed(() => {
    const data = unref(claimResource.data) || [];
    return data.map(row => ({
      ...row,
      status_label: t(`status_${String(row.status || "Open").toLowerCase().replace(" ", "_")}`),
    }));
  });

  const loading = computed(() => claimResource.loading);

  async function reload() {
    const params = {
      doctype: "AT Claim",
      fields: ["name", "customer", "insurance_company", "policy", "status", "claim_date", "total_amount", "currency"],
      filters: {},
      order_by: filters.sort,
      limit_start: (pagination.page - 1) * pagination.pageLength,
      limit_page_length: pagination.pageLength,
    };

    if (filters.query) {
      params.filters.name = ["like", `%${filters.query}%`];
    }
    if (filters.status) {
      params.filters.status = filters.status;
    }
    if (filters.claim_type) {
      params.filters.claim_type = filters.claim_type;
    }

    await claimResource.reload(params);
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

  function openClaim(name) {
    router.push({ name: "claim-detail", params: { name } });
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
    openClaim,
  };
}
