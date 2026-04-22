import { computed, reactive, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { CUSTOMER_TRANSLATIONS } from "../config/customer_translations";

export function useCustomerBoardRuntime({ activeLocale = ref("tr") } = {}) {
  const router = useRouter();

  function t(key) {
    const locale = unref(activeLocale) || "tr";
    return CUSTOMER_TRANSLATIONS[locale]?.[key] || CUSTOMER_TRANSLATIONS.en?.[key] || key;
  }

  const filters = reactive({
    query: "",
    consent_status: "",
    gender: "",
    office_branch: "",
    sort: "modified desc",
  });

  const pagination = reactive({
    page: 1,
    pageLength: 20,
  });

  const customerResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_customer_workbench_rows",
    auto: false,
  });

  const summary = computed(() => {
    const data = unref(customerResource.data) || {};
    return {
      total: data.total || 0,
      active: data.active_count || 0,
      individual: data.individual_count || 0,
      corporate: data.corporate_count || 0,
    };
  });

  const rows = computed(() => {
    const data = unref(customerResource.data) || {};
    return (data.rows || []).map(row => ({
      ...row,
      customer_type_label: row.customer_type === "Corporate" ? t("corporate") : t("individual"),
      consent_status_label: t(`consent_${String(row.consent_status || "Unknown").toLowerCase()}`),
    }));
  });

  const loading = computed(() => customerResource.loading);

  async function reload() {
    await customerResource.reload({
      filters: JSON.stringify(filters),
      page: pagination.page,
      page_length: pagination.pageLength,
    });
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

  function openCustomer(name) {
    router.push({ name: "customer-detail", params: { name } });
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
    openCustomer,
  };
}
