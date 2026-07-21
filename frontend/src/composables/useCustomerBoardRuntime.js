import { computed, reactive, ref, unref } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "../utils/i18n";
import { mapCustomerRecordToTableRow } from "./customerListTableModel";
import { openListExport } from "../utils/listExport";

export function useCustomerBoardRuntime({ activeLocale = ref("tr") } = {}) {
  const router = useRouter();
  const loadErrorText = ref("");

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

  const totalCount = computed(() => {
    const total = Number(unref(customerResource.data)?.total || 0);
    return Number.isFinite(total) ? total : 0;
  });

  const hasNextPage = computed(() => pagination.page * pagination.pageLength < totalCount.value);

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
    return (data.rows || []).map((row) =>
      mapCustomerRecordToTableRow(row, { t, localeCode: unref(activeLocale) }),
    );
  });

  const loading = computed(() => unref(customerResource.loading));

  async function reload() {
    const result = await customerResource
      .reload({
        filters: JSON.stringify(filters),
        page: pagination.page,
        page_length: pagination.pageLength,
      })
      .catch((error) => ({ __error: error }));

    if (!result?.__error) {
      if (result !== undefined && typeof customerResource.setData === "function") {
        customerResource.setData(result);
      }
      loadErrorText.value = "";
      return;
    }

    if (typeof customerResource.setData === "function") {
      customerResource.setData({ rows: [], total: 0, active_count: 0, individual_count: 0, corporate_count: 0 });
    }
    loadErrorText.value = t("loadError");
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

  function openCustomer(name) {
    router.push({ name: "customer-detail", params: { name } });
  }

  function buildCustomerExportQuery() {
    return { filters: JSON.parse(JSON.stringify(filters)) };
  }

  function downloadCustomerExport(format) {
    openListExport({
      screen: "customer_list",
      query: buildCustomerExportQuery(),
      format,
      limit: 1000,
    });
  }

  reload();

  return {
    filters,
    pagination,
    summary,
    rows,
    loading,
    loadErrorText,
    hasNextPage,
    t,
    reload,
    setPage,
    updateFilter,
    openCustomer,
    downloadCustomerExport,
  };
}
