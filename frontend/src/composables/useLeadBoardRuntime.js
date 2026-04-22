import { computed, reactive, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { LEAD_TRANSLATIONS } from "../config/lead_translations";

export function useLeadBoardRuntime({ activeLocale = ref("tr") } = {}) {
  const router = useRouter();

  function t(key) {
    const locale = unref(activeLocale) || "tr";
    return LEAD_TRANSLATIONS[locale]?.[key] || LEAD_TRANSLATIONS.en?.[key] || key;
  }

  const filters = reactive({
    query: "",
    status: "",
    source: "",
    office_branch: "",
    sort: "creation desc",
  });

  const pagination = reactive({
    page: 1,
    pageLength: 20,
  });

  const leadResource = createResource({
    url: "frappe.client.get_list",
    params: {
      doctype: "AT Lead",
      fields: ["name", "full_name", "status", "source", "phone", "email", "creation"],
      order_by: "creation desc",
    },
    auto: false,
  });

  const summary = computed(() => {
    const rows = unref(leadResource.data) || [];
    return {
      total: rows.length,
      active: rows.filter(r => r.status !== "Converted" && r.status !== "Lost").length,
      individual: rows.filter(r => (r.full_name || "").split(" ").length <= 3).length, // simple heuristic
      corporate: rows.filter(r => (r.full_name || "").split(" ").length > 3).length,
    };
  });

  const rows = computed(() => {
    const data = unref(leadResource.data) || [];
    return data.map(row => ({
      ...row,
      status_label: t(`status_${String(row.status || "Lead").toLowerCase()}`),
    }));
  });

  const loading = computed(() => leadResource.loading);

  async function reload() {
    const params = {
      doctype: "AT Lead",
      fields: ["name", "full_name", "status", "source", "phone", "email", "creation"],
      filters: {},
      order_by: filters.sort,
      limit_start: (pagination.page - 1) * pagination.pageLength,
      limit_page_length: pagination.pageLength,
    };

    if (filters.query) {
      params.filters.full_name = ["like", `%${filters.query}%`];
    }
    if (filters.status) {
      params.filters.status = filters.status;
    }
    if (filters.source) {
      params.filters.source = filters.source;
    }
    if (filters.office_branch) {
      params.filters.office_branch = filters.office_branch;
    }

    await leadResource.reload(params);
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

  function openLead(name) {
    router.push({ name: "lead-detail", params: { name } });
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
    openLead,
  };
}
