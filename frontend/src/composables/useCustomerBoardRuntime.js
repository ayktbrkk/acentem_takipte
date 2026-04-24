import { computed, reactive, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "../utils/i18n";

export function useCustomerBoardRuntime({ activeLocale = ref("tr") } = {}) {
  const router = useRouter();

  function t(key) {
    return translateText(key, activeLocale);
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
    unref(activeLocale);
    const data = unref(customerResource.data) || {};
    return {
      total: data.total || 0,
      active: data.active_count || 0,
      individual: data.individual_count || 0,
      corporate: data.corporate_count || 0,
    };
  });

  const rows = computed(() => {
    unref(activeLocale);
    const data = unref(customerResource.data) || {};
    return (data.rows || []).map(row => ({
      ...row,
      identity_primary: row.full_name || "-",
      identity_secondary: `${row.name} | ${row.customer_type === "Corporate" ? t("corporate") : t("individual")} | ${row.tax_id || "-"}`,
      contact_primary: row.phone || "-",
      contact_secondary: row.email || "-",
      personal_primary: row.job_title || "-",
      personal_secondary: `${t(row.gender || "Unknown")} | ${row.birth_date || "-"}`,
      mgmt_primary: row.sales_entity || "-",
      mgmt_secondary: t(`status_${String(row.consent_status || "Unknown").toLowerCase()}`),
      customer_type_label: row.customer_type === "Corporate" ? t("corporate") : t("individual"),
      consent_status_label: t(`status_${String(row.consent_status || "Unknown").toLowerCase()}`),
    }));
  });

  const loading = computed(() => unref(customerResource.loading));

  async function reload() {
    const payload = await customerResource.reload({
      filters: JSON.stringify(filters),
      page: pagination.page,
      page_length: pagination.pageLength,
    });
    if (payload !== undefined && typeof customerResource.setData === "function") {
      customerResource.setData(payload);
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

