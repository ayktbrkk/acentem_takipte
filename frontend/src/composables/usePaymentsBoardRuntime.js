import { computed, onMounted, reactive, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";

import { usePaymentsBoardActions } from "./usePaymentsBoardActions";
import { useCustomFilterPresets } from "./useCustomFilterPresets";
import { usePaymentsBoardQuickPayment } from "./usePaymentsBoardQuickPayment";
import { usePaymentsBoardSummary } from "./usePaymentsBoardSummary";
import { openTabularExport } from "../utils/listExport";
import { PAYMENT_TRANSLATIONS } from "../config/payment_translations";
import {
  buildPaymentListParams,
  buildPaymentInstallmentListParams,
  buildPaymentSnapshot,
  setPaymentFilterStateFromPayload,
  resetPaymentFilterState,
  currentPaymentPresetPayload as buildPresetPayload
} from "./paymentsBoard/helpers";
import { translateText } from "../utils/i18n";

function runResource(resource) {
  if (typeof resource?.fetch === "function") return resource.fetch();
  if (typeof resource?.reload === "function") return resource.reload();
  return Promise.resolve([]);
}

export function usePaymentsBoardRuntime({ route, router, authStore, branchStore, paymentStore }) {
  const activeLocale = computed(() => unref(authStore.locale) || "en");
  const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
  const filters = paymentStore.state.filters;

  function t(key) {
    const locale = String(unref(activeLocale) || "en").toLowerCase().startsWith("tr") ? "tr" : "en";
    if (PAYMENT_TRANSLATIONS[locale]?.[key]) {
      return PAYMENT_TRANSLATIONS[locale][key];
    }
    return translateText(key, activeLocale);
  }

  function fallbackLabel() {
    return t("unspecified");
  }

  const paymentSortOptions = computed(() => [
    { value: "modified desc", label: t("sortModifiedDesc") },
    { value: "payment_date desc", label: t("sortPaymentDateDesc") },
    { value: "payment_date asc", label: t("sortPaymentDateAsc") },
    { value: "amount_try desc", label: t("sortAmountDesc") },
  ]);
  const activeFilterCount = computed(() => paymentStore.activeFilterCount);
  const paymentListPagination = reactive({ page: 1, pageLength: 20 });
  const paymentTotalCount = ref(0);
  const paymentHasNextPage = computed(
    () => paymentListPagination.page * paymentListPagination.pageLength < paymentTotalCount.value,
  );

  function buildPaymentCountParams() {
    const listParams = buildPaymentListParams({
      filters,
      officeBranch: branchStore.requestBranch,
      pagination: paymentListPagination,
    });
    const params = {
      doctype: "AT Payment",
      filters: listParams.filters || {},
    };
    if (Array.isArray(listParams.or_filters) && listParams.or_filters.length) {
      params.or_filters = listParams.or_filters;
    }
    return params;
  }

  function buildPaymentSummaryParams() {
    const params = {
      query: String(filters.query || "").trim() || undefined,
      office_branch: branchStore.requestBranch || undefined,
      status: filters.status || undefined,
      direction: filters.direction || undefined,
      currency: filters.currency || undefined,
      policy: filters.policyQuery || undefined,
      customer: filters.customerQuery || undefined,
      purpose: filters.purposeQuery || undefined,
      limit: 2000,
    };
    return params;
  }

  const paymentsResource = createResource({
    url: "frappe.client.get_list",
    params: buildPaymentListParams({ filters, officeBranch: branchStore.requestBranch, pagination: paymentListPagination }),
    auto: false,
  });
  const paymentCountResource = createResource({
    url: "frappe.client.get_count",
    auto: false,
  });
  const paymentSummaryResource = createResource({
    url: "acentem_takipte.acentem_takipte.domains.payments.api.endpoints.get_payments_board_summary",
    auto: false,
  });
  const paymentExportResource = createResource({
    url: "frappe.client.get_list",
    auto: false,
  });
  const paymentsLoading = computed(() => Boolean(unref(paymentsResource.loading)));
  const paymentsResourceError = computed(() => unref(paymentsResource.error));
  const paymentInstallmentResource = createResource({
    url: "frappe.client.get_list",
    params: buildPaymentInstallmentListParams(branchStore.requestBranch),
    auto: false,
  });

  const payments = computed(() => paymentStore.filteredItems);
  const installmentSummaryByPayment = computed(() => {
    const grouped = new Map();
    const data = unref(paymentInstallmentResource.data) || [];
    for (const installment of data) {
      if (!installment?.payment) continue;
      const current = grouped.get(installment.payment) || {
        total: 0,
        paid: 0,
        overdue: 0,
        nextDue: "",
        paidAmount: 0,
      };
      current.total = Math.max(Number(current.total || 0), Number(installment.installment_count || installment.installment_no || 0));
      if (installment.status === "Paid") {
        current.paid += 1;
        current.paidAmount += Number(installment.amount_try || 0);
      }
      if (installment.status === "Overdue") current.overdue += 1;
      if (
        (installment.status === "Scheduled" || installment.status === "Overdue") &&
        installment.due_date &&
        (!current.nextDue || installment.due_date < current.nextDue)
      ) {
        current.nextDue = installment.due_date;
      }
      grouped.set(installment.payment, current);
    }
    return grouped;
  });

  const actionsUi = usePaymentsBoardActions({ t, router, installmentSummaryByPayment });
  const summaryUi = usePaymentsBoardSummary({
    t,
    localeCode,
    payments,
    installmentSummaryByPayment,
    buildPaymentRowActions: actionsUi.buildPaymentRowActions,
    paymentStore,
    totalCount: paymentTotalCount,
  });

  const paymentsErrorText = computed(() => {
    if (paymentStore.state.error) return paymentStore.state.error;
    const err = paymentsResourceError.value;
    if (!err) return "";
    return err?.messages?.join(" ") || err?.message || t("loadError");
  });

  const {
    presetKey,
    presetOptions,
    canDeletePreset,
    applyPreset,
    onPresetChange,
    savePreset,
    deletePreset,
    persistPresetStateToServer,
    hydratePresetStateFromServer,
  } = useCustomFilterPresets({
    screen: "payments_board",
    presetStorageKey: "at:payments-board:preset",
    presetListStorageKey: "at:payments-board:preset-list",
    t,
    getCurrentPayload: () => buildPresetPayload(filters),
    setFilterStateFromPayload: (p) => setPaymentFilterStateFromPayload(filters, p),
    resetFilterState: () => resetPaymentFilterState(paymentStore),
    refresh: reloadPayments,
    getSortLocale: () => localeCode.value,
  });

  const quickPaymentUi = usePaymentsBoardQuickPayment({
    t,
    branchStore,
    reloadPayments,
    localeCode,
  });

  function reloadPayments() {
    paymentsResource.params = buildPaymentListParams({
      filters,
      officeBranch: branchStore.requestBranch,
      pagination: paymentListPagination,
    });
    paymentInstallmentResource.params = buildPaymentInstallmentListParams(branchStore.requestBranch);
    paymentSummaryResource.params = buildPaymentSummaryParams();
    paymentStore.setLocaleCode(localeCode.value);
    paymentStore.setLoading(true);
    paymentStore.clearError();
    return Promise.all([
      runResource(paymentsResource),
      runResource(paymentInstallmentResource),
      paymentCountResource.reload(buildPaymentCountParams()),
      runResource(paymentSummaryResource),
    ])
      .then(([result, , total, summary]) => {
        paymentTotalCount.value = Number(total) || 0;
        paymentStore.applyBoardPayload(result || [], summary || null);
        paymentStore.setLoading(false);
        return result;
      })
      .catch((error) => {
        paymentTotalCount.value = 0;
        paymentStore.setItems([]);
        paymentStore.setError(error?.messages?.join(" ") || error?.message || t("loadError"));
        paymentStore.setLoading(false);
        throw error;
      });
  }

  async function downloadPaymentExport(format) {
    // Export the full filtered scope, not just the current page rows, so the
    // exported file, the list, the KPI cards and the footer all agree.
    paymentExportResource.params = buildPaymentListParams({
      filters,
      officeBranch: branchStore.requestBranch,
      pagination: { page: 1, pageLength: 2000 },
    });
    const fullRows = (await runResource(paymentExportResource)) || [];
    const rowsForExport = fullRows.map((payment) => {
      const snapshot = buildPaymentSnapshot(payment, installmentSummaryByPayment.value.get(payment?.name), localeCode.value);
      return {
        [t("payment_no")]: payment.payment_no || payment.name || fallbackLabel(),
        [t("customer")]: snapshot.customer_full_name || snapshot.customer_name || payment.customer || fallbackLabel(),
        [t("policy")]: payment.policy || fallbackLabel(),
        [t("due_date")]: snapshot.due_date_label || fallbackLabel(),
        [t("amount")]: snapshot.amount_label || summaryUi.formatCurrency(snapshot.totalAmount),
        [t("collected")]: snapshot.collected_amount_label || summaryUi.formatCurrency(snapshot.collectedAmount),
        [t("remaining")]: snapshot.remaining_amount_label || summaryUi.formatCurrency(snapshot.remainingAmount),
        [t("status")]: t(snapshot.status) || fallbackLabel(),
      };
    });
    openTabularExport({
      permissionDoctypes: ["AT Payment"],
      exportKey: "payments_board",
      title: t("title"),
      columns: [t("payment_no"), t("customer"), t("policy"), t("due_date"), t("amount"), t("collected"), t("remaining"), t("status")],
      rows: rowsForExport,
      filters: buildPresetPayload(filters),
      format,
    });
  }

  function applyPaymentFilters() {
    paymentListPagination.page = 1;
    return reloadPayments();
  }

  function setPaymentPage(page) {
    const nextPage = Number(page);
    if (!Number.isFinite(nextPage) || nextPage < 1) return reloadPayments();
    paymentListPagination.page = nextPage;
    return reloadPayments();
  }

  function applyRouteFilters() {
    const query = String(route.query?.query || "").trim();
    const customerQuery = String(route.query?.customer || "").trim();
    const policyQuery = String(route.query?.policy || "").trim();
    const purposeQuery = String(route.query?.purpose || "").trim();
    const direction = String(route.query?.direction || "").trim();
    const hasRouteFilters = Boolean(query || customerQuery || policyQuery || purposeQuery || direction);
    if (!hasRouteFilters) return false;

    filters.query = query;
    filters.customerQuery = customerQuery;
    filters.policyQuery = policyQuery;
    filters.purposeQuery = purposeQuery;
    filters.direction = direction;
    return true;
  }

  function resetPaymentFilters() {
    applyPreset("default", { refresh: false });
    void persistPresetStateToServer();
    return reloadPayments();
  }

  function openPaymentDetail(payment) {
    if (!payment?.name) return;
    router.push({ name: "payment-detail", params: { name: payment.name } });
  }

  onMounted(() => {
    paymentStore.setLocaleCode(localeCode.value);
    applyPreset(presetKey.value, { refresh: false });
    applyRouteFilters();
    void reloadPayments();
    void hydratePresetStateFromServer();
  });

  watch(
    () => [route.query?.query, route.query?.customer, route.query?.policy, route.query?.purpose, route.query?.direction],
    () => {
      if (!applyRouteFilters()) return;
      void reloadPayments();
    }
  );

  // Debounced server-side search so the list, KPI summary, footer count and
  // export all stay on the same filtered dataset while typing. Without this,
  // the client-side row filter narrowed the table while the KPIs (server) kept
  // reporting the unfiltered totals.
  let searchDebounceTimer = null;
  watch(
    () => [
      String(filters.query || ""),
      String(filters.customerQuery || ""),
      String(filters.policyQuery || ""),
      String(filters.purposeQuery || ""),
    ],
    () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        paymentListPagination.page = 1;
        void reloadPayments();
      }, 400);
    }
  );

  return {
    activeLocale,
    localeCode,
    filters,
    paymentSortOptions,
    activeFilterCount,
    presetKey,
    presetOptions,
    canDeletePreset,
    applyPreset,
    onPresetChange,
    savePreset,
    deletePreset,
    persistPresetStateToServer,
    hydratePresetStateFromServer,
    paymentsResource,
    paymentsLoading,
    paymentsResourceError,
    paymentInstallmentResource,
    paymentQuickCustomerResource: quickPaymentUi.paymentQuickCustomerResource,
    paymentQuickPolicyResource: quickPaymentUi.paymentQuickPolicyResource,
    paymentQuickClaimResource: quickPaymentUi.paymentQuickClaimResource,
    paymentQuickSalesEntityResource: quickPaymentUi.paymentQuickSalesEntityResource,
    payments,
    installmentSummaryByPayment,
    showQuickPaymentDialog: quickPaymentUi.showQuickPaymentDialog,
    paymentQuickOptionsMap: quickPaymentUi.paymentQuickOptionsMap,
    quickPaymentEyebrow: quickPaymentUi.quickPaymentEyebrow,
    quickPaymentSuccessHandlers: quickPaymentUi.quickPaymentSuccessHandlers,
    paymentsErrorText,
    paymentListPagination,
    paymentTotalCount,
    paymentHasNextPage,
    setPaymentPage,
    paymentSnapshots: summaryUi.paymentSnapshots,
    paymentSummary: summaryUi.paymentSummary,
    paymentListColumns: summaryUi.paymentListColumns,
    paymentsWithActions: summaryUi.paymentsWithActions,
    inboundTotal: summaryUi.inboundTotal,
    outboundTotal: summaryUi.outboundTotal,
    reloadPayments,
    downloadPaymentExport,
    applyPaymentFilters,
    resetPaymentFilters,
    applyRouteFilters,
    openPaymentDetail,
    prepareQuickPaymentDialog: quickPaymentUi.prepareQuickPaymentDialog,
    formatCurrency: summaryUi.formatCurrency,
    formatCount: summaryUi.formatCount,
    t,
  };
}
