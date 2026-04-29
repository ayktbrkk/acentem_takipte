import { computed, reactive, ref, unref } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "../utils/i18n";

export function useOfferBoardRuntime({ activeLocale = ref("tr") } = {}) {
  const router = useRouter();

  function t(key) {
    return translateText(key, activeLocale);
  }

  const filters = reactive({
    query: "",
    status: "",
    insurance_company: "",
    office_branch: "",
    sort: "modified desc",
  });

  const pagination = reactive({
    page: 1,
    pageLength: 20,
  });

  const offerResource = createResource({
    url: "frappe.client.get_list",
    params: {
      doctype: "AT Offer",
      fields: ["name", "customer", "insurance_company", "branch", "status", "gross_premium", "currency", "offer_date"],
      order_by: "modified desc",
    },
    auto: false,
  });

  const summary = computed(() => {
    unref(activeLocale);
    const rows = unref(offerResource.data) || [];
    return {
      total: rows.length,
      open: rows.filter(r => r.status === "Draft" || r.status === "Sent").length,
      converted: rows.filter(r => r.status === "Converted").length,
      cancelled: rows.filter(r => r.status === "Cancelled").length,
    };
  });

  const rows = computed(() => {
    unref(activeLocale);
    const data = unref(offerResource.data) || [];
    return data.map(row => ({
      ...row,
      status_label: t(`status_${String(row.status || "Draft").toLowerCase()}`),
    }));
  });

  const loading = computed(() => offerResource.loading);

  async function reload() {
    const params = {
      doctype: "AT Offer",
      fields: ["name", "customer", "insurance_company", "branch", "status", "gross_premium", "currency", "offer_date"],
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
    if (filters.insurance_company) {
      params.filters.insurance_company = filters.insurance_company;
    }
    if (filters.office_branch) {
      params.filters.office_branch = filters.office_branch;
    }

    await offerResource.reload(params);
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

  function openOffer(name) {
    router.push({ name: "offer-detail", params: { name } });
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
    openOffer,
  };
}

