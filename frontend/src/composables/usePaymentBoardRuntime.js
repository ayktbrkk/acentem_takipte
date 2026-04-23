import { computed, reactive, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "../utils/i18n";

export function usePaymentBoardRuntime({ activeLocale = ref("tr") } = {}) {
  const router = useRouter();

  function t(key) {
    return translateText(key, activeLocale);
  }

  const filters = reactive({
    query: "",
    status: "",
    payment_purpose: "",
    sort: "creation desc",
  });

  const pagination = reactive({
    page: 1,
    pageLength: 20,
  });

  const paymentResource = createResource({
    url: "frappe.client.get_list",
    params: {
      doctype: "AT Payment",
      fields: ["name", "payment_no", "customer", "status", "payment_date", "amount", "currency", "payment_purpose"],
      order_by: "creation desc",
    },
    auto: false,
  });

  const summary = computed(() => {
    const rows = unref(paymentResource.data) || [];
    return {
      total: rows.length,
      paid: rows.filter(r => r.status === "Paid").length,
      unpaid: rows.filter(r => r.status === "Unpaid").length,
      overdue: 0, // Placeholder
    };
  });

  const rows = computed(() => {
    const data = unref(paymentResource.data) || [];
    return data.map(row => ({
      ...row,
      status_label: t(`status_${String(row.status || "Unpaid").toLowerCase()}`),
    }));
  });

  const loading = computed(() => paymentResource.loading);

  async function reload() {
    const params = {
      doctype: "AT Payment",
      fields: ["name", "payment_no", "customer", "status", "payment_date", "amount", "currency", "payment_purpose"],
      filters: {},
      order_by: filters.sort,
      limit_start: (pagination.page - 1) * pagination.pageLength,
      limit_page_length: pagination.pageLength,
    };

    if (filters.query) {
      params.filters.payment_no = ["like", `%${filters.query}%`];
    }
    if (filters.status) {
      params.filters.status = filters.status;
    }
    if (filters.payment_purpose) {
      params.filters.payment_purpose = filters.payment_purpose;
    }

    await paymentResource.reload(params);
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

  function openPayment(name) {
    router.push({ name: "payment-detail", params: { name } });
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
    openPayment,
  };
}
