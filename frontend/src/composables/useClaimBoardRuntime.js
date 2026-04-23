import { computed, reactive, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "../utils/i18n";

export function useClaimBoardRuntime({ activeLocale = ref("tr") } = {}) {
  const router = useRouter();

  function t(key) {
    return translateText(key, activeLocale);
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
      fields: ["name", "customer", "policy", "claim_status", "incident_date", "estimated_amount", "currency"],
      order_by: "creation desc",
    },
    auto: false,
  });

  const summary = computed(() => {
    unref(activeLocale);
    const rows = unref(claimResource.data) || [];
    return {
      total: rows.length,
      active: rows.filter(r => r.claim_status === "Open" || r.claim_status === "Under Review").length,
      closed: rows.filter(r => r.claim_status === "Closed").length,
      rejected: rows.filter(r => r.claim_status === "Rejected").length,
    };
  });

  const rows = computed(() => {
    unref(activeLocale);
    const data = unref(claimResource.data) || [];
    return data.map(row => ({
      ...row,
      // Map schema fields to UI expected keys if necessary, or update UI
      status: row.claim_status,
      claim_date: row.incident_date,
      total_amount: row.estimated_amount,
      status_label: t(`status_${String(row.claim_status || "Open").toLowerCase().replace(" ", "_")}`),
    }));
  });

  const loading = computed(() => claimResource.loading);

  async function reload() {
    const params = {
      doctype: "AT Claim",
      fields: ["name", "customer", "policy", "claim_status", "incident_date", "estimated_amount", "currency"],
      filters: {},
      order_by: filters.sort,
      limit_start: (pagination.page - 1) * pagination.pageLength,
      limit_page_length: pagination.pageLength,
    };

    if (filters.query) {
      params.filters.name = ["like", `%${filters.query}%`];
    }
    if (filters.status) {
      params.filters.claim_status = filters.status;
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

