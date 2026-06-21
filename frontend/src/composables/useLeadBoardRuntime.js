import { computed, reactive, ref, unref } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "@/utils/i18n";
import { LEAD_TRANSLATIONS } from "@/config/lead_translations";
import { maskPhone } from "@/utils/atMasks";

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

  function getWorkbenchData() {
    const data = unref(leadResource.data);
    return data && typeof data === "object" ? data : {};
  }

  function getLeadRows() {
    const data = getWorkbenchData();
    return Array.isArray(data.rows) ? data.rows : [];
  }

  function t(key) {
    const locale = String(unref(activeLocale) || "tr").toLowerCase().startsWith("tr") ? "tr" : "en";
    return LEAD_TRANSLATIONS[locale]?.[key] || LEAD_TRANSLATIONS.en?.[key] || translateText(key, unref(activeLocale));
  }

  function isIndividualLead(row) {
    const customerType = String(row?.customer_customer_type || "").trim().toLowerCase();
    if (customerType === "individual" || customerType === "bireysel") return true;
    if (customerType === "corporate" || customerType === "kurumsal") return false;
    return false;
  }

  function isCorporateLead(row) {
    const customerType = String(row?.customer_customer_type || "").trim().toLowerCase();
    return customerType === "corporate" || customerType === "kurumsal";
  }

  const filters = reactive({
    query: "",
    status: "",
    office_branch: "",
    sort: "modified desc",
  });

  const pagination = reactive({
    page: 1,
    pageLength: 20,
  });

  const leadResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_lead_workbench_rows",
    auto: false,
  });

  const totalCount = computed(() => {
    const total = Number(getWorkbenchData().total || 0);
    return Number.isFinite(total) ? total : 0;
  });

  const hasNextPage = computed(() => pagination.page * pagination.pageLength < totalCount.value);

  const summary = computed(() => {
    unref(activeLocale);
    const rows = getLeadRows();
    const total = totalCount.value;
    const metricsCoverFullResultSet = total > 0 && rows.length === total;

    return {
      total,
      active: metricsCoverFullResultSet
        ? rows.filter((row) => String(row.status || "") !== "Closed").length
        : 0,
      individual: metricsCoverFullResultSet ? rows.filter((row) => isIndividualLead(row)).length : 0,
      corporate: metricsCoverFullResultSet ? rows.filter((row) => isCorporateLead(row)).length : 0,
    };
  });

  const rows = computed(() => {
    unref(activeLocale);
    return getLeadRows().map((row) => {
      const fullName = [row.first_name, row.last_name].filter(Boolean).join(" ");
      const customerLabel = row.customer_full_name || fullName || t("unspecified");
      const phoneDisplay = maskPhone(row.phone) || row.customer_masked_phone || t("unspecified");

      return {
        ...row,
        full_name: fullName || row.customer_full_name || "",
        status_label: t(`status_${String(row.status || "Draft").toLowerCase()}`),
        lead_primary: row.name,
        lead_secondary: row.branch || t("unspecified"),
        customer_label: customerLabel,
        customer_secondary: phoneDisplay,
        takip_label: row.sales_entity || t("unspecified"),
        finance_primary: formatCurrency(row.estimated_gross_premium, row.currency || "TRY"),
        date_secondary: formatDate(row.creation),
      };
    });
  });

  const loading = computed(() => unref(leadResource.loading));

  function buildListParams() {
    return {
      page: pagination.page,
      page_length: pagination.pageLength,
      filters: {
        query: filters.query || "",
        status: filters.status || "",
        branch: filters.office_branch || "",
        sort: filters.sort || "modified desc",
      },
    };
  }

  async function reload() {
    const params = buildListParams();
    const payload = await leadResource.reload(params);
    if (payload !== undefined && typeof leadResource.setData === "function") {
      leadResource.setData(payload);
    }
  }

  function setPage(page) {
    const nextPage = Number(page);
    if (!Number.isFinite(nextPage) || nextPage < 1) return;
    pagination.page = nextPage;
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

  reload();

  return {
    filters,
    pagination,
    summary,
    rows,
    loading,
    hasNextPage,
    t,
    reload,
    setPage,
    updateFilter,
    openLead,
  };
}
