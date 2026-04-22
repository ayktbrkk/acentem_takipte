import { computed, onMounted, unref, watch } from "vue";
import { createResource } from "frappe-ui";

import { usePaymentsBoardActions } from "./usePaymentsBoardActions";
import { useCustomFilterPresets } from "./useCustomFilterPresets";
import { usePaymentsBoardQuickPayment } from "./usePaymentsBoardQuickPayment";
import { usePaymentsBoardSummary } from "./usePaymentsBoardSummary";
import { openTabularExport } from "../utils/listExport";
import { 
  buildPaymentListParams, 
  buildPaymentInstallmentListParams, 
  setPaymentFilterStateFromPayload, 
  resetPaymentFilterState,
  currentPaymentPresetPayload as buildPresetPayload
} from "./paymentsBoard/helpers";
import { PAYMENT_TRANSLATIONS } from "../config/payment_translations";

export function usePaymentsBoardRuntime({ route, router, authStore, branchStore, paymentStore }) {
  const activeLocale = computed(() => unref(authStore.locale) || "en");
  const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
  const filters = paymentStore.state.filters;

  function t(key) {
    return PAYMENT_TRANSLATIONS[activeLocale.value]?.[key] || PAYMENT_TRANSLATIONS.en[key] || key;
  }

  const paymentSortOptions = computed(() => [
    { value: "modified desc", label: t("sortModifiedDesc") },
    { value: "payment_date desc", label: t("sortPaymentDateDesc") },
    { value: "payment_date asc", label: t("sortPaymentDateAsc") },
    { value: "amount_try desc", label: t("sortAmountDesc") },
  ]);
  const activeFilterCount = computed(() => paymentStore.activeFilterCount);

  const paymentsResource = createResource({
    url: "frappe.client.get_list",
    params: buildPaymentListParams({ filters, officeBranch: branchStore.requestBranch }),
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
    paymentsResource.params = buildPaymentListParams({ filters, officeBranch: branchStore.requestBranch });
    paymentInstallmentResource.params = buildPaymentInstallmentListParams(branchStore.requestBranch);
    paymentStore.setLocaleCode(localeCode.value);
    paymentStore.setLoading(true);
    paymentStore.clearError();
    return Promise.all([paymentsResource.fetch(), paymentInstallmentResource.fetch()])
      .then(([result]) => {
        paymentStore.setItems(result || []);
        paymentStore.setLoading(false);
        return result;
      })
      .catch((error) => {
        paymentStore.setItems([]);
        paymentStore.setError(error?.messages?.join(" ") || error?.message || t("loadError"));
        paymentStore.setLoading(false);
        throw error;
      });
  }

  function downloadPaymentExport(format) {
    openTabularExport({
      permissionDoctypes: ["AT Payment"],
      exportKey: "payments_board",
      title: t("title"),
      columns: [t("payment_no"), t("customer"), t("policy"), t("due_date"), t("amount"), t("collected"), t("remaining"), t("status")],
      rows: summaryUi.paymentSnapshots.value.map((payment) => ({
        [t("payment_no")]: payment.payment_no || payment.name || "-",
        [t("customer")]: payment.customer_label || payment.customer_full_name || payment.customer_name || payment.customer || "-",
        [t("policy")]: payment.policy || "-",
        [t("due_date")]: payment.due_date_label || "-",
        [t("amount")]: payment.amount_label || summaryUi.formatCurrency(payment.totalAmount),
        [t("collected")]: payment.collected_amount_label || summaryUi.formatCurrency(payment.collectedAmount),
        [t("remaining")]: payment.remaining_amount_label || summaryUi.formatCurrency(payment.remainingAmount),
        [t("status")]: payment.status || "-",
      })),
      filters: buildPresetPayload(filters),
      format,
    });
  }

  function applyPaymentFilters() {
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
