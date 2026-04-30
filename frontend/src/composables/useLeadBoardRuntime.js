import { computed, reactive, ref, unref } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "@/utils/i18n";
import { LEAD_TRANSLATIONS } from "@/config/lead_translations";

export function useLeadBoardRuntime({ activeLocale = ref("tr") } = {}) {
  const router = useRouter();

  function formatCurrency(value, currency = "TRY") {
    const locale = String(unref(activeLocale) || "tr").toLowerCase().startsWith("tr") ? "tr-TR" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "TRY",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  function formatDate(value) {
    if (!value) return t("unspecified");
    const locale = String(unref(activeLocale) || "tr").toLowerCase().startsWith("tr") ? "tr-TR" : "en-US";
    return new Intl.DateTimeFormat(locale).format(new Date(value));
  }

  function getLeadRows() {
    const data = unref(leadResource.data);
    if (Array.isArray(data)) return data;
    return Array.isArray(data?.rows) ? data.rows : [];
  }

  function t(key) {
    const locale = String(unref(activeLocale) || "tr").toLowerCase().startsWith("tr") ? "tr" : "en";
    return LEAD_TRANSLATIONS[locale]?.[key] || LEAD_TRANSLATIONS.en?.[key] || translateText(key, unref(activeLocale));
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

  // Fetch specific name fields to avoid missing full_name on AT Lead (Version 2.1)
  const leadResource = createResource({
    url: "frappe.client.get_list",
    params: {
      doctype: "AT Lead",
      fields: ["name", "first_name", "last_name", "status", "phone", "email", "creation", "branch", "estimated_gross_premium", "sales_entity"],
      order_by: "creation desc",
    },
    auto: false,
  });

  const summary = computed(() => {
    unref(activeLocale);
    const rows = getLeadRows();
    return {
      total: rows.length,
      active: rows.filter(r => r.status !== "Closed").length,
      individual: rows.filter(r => ((r.first_name || "") + (r.last_name || "")).length <= 20).length,
      corporate: rows.filter(r => ((r.first_name || "") + (r.last_name || "")).length > 20).length,
    };
  });

  const rows = computed(() => {
    unref(activeLocale);
    const data = getLeadRows();
    return data.map(row => ({
      ...row,
      full_name: [row.first_name, row.last_name].filter(Boolean).join(" "),
      status_label: t(`status_${String(row.status || "Draft").toLowerCase()}`),
      lead_primary: row.name,
      lead_secondary: row.branch || t("unspecified"),
      customer_label: [row.first_name, row.last_name].filter(Boolean).join(" ") || t("unspecified"),
      customer_secondary: row.phone || t("unspecified"),
      takip_label: row.sales_entity || t("unspecified"),
      finance_primary: formatCurrency(row.estimated_gross_premium, row.currency || "TRY"),
      date_secondary: formatDate(row.creation),
    }));
  });

  const loading = computed(() => unref(leadResource.loading));

  async function reload() {
    const params = {
      doctype: "AT Lead",
      fields: ["name", "first_name", "last_name", "status", "phone", "email", "creation", "branch", "estimated_gross_premium", "sales_entity"],
      filters: {},
      order_by: filters.sort,
      limit_start: (pagination.page - 1) * pagination.pageLength,
      limit_page_length: pagination.pageLength,
    };

    if (filters.query) {
      const query = `%${filters.query}%`;
      params.or_filters = [
        ["AT Lead", "name", "like", query],
        ["AT Lead", "first_name", "like", query],
        ["AT Lead", "last_name", "like", query],
        ["AT Lead", "email", "like", query],
        ["AT Lead", "customer", "like", query],
      ];
    }
    if (filters.status) {
      params.filters.status = filters.status;
    }
    if (filters.office_branch) {
      params.filters.office_branch = filters.office_branch;
    }

    const payload = await leadResource.reload(params);
    if (payload !== undefined && typeof leadResource.setData === "function") {
      leadResource.setData(payload);
    }
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
