import { computed, onMounted, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";

import { useCustomFilterPresets } from "./useCustomFilterPresets";
import { mutedFact, pushMutedFactIf, subtleFact } from "../utils/factItems";
import { openTabularExport } from "../utils/listExport";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function resourceValue(resource, fallback = null) {
  const value = unref(resource?.data);
  return value == null ? fallback : value;
}

export function usePaymentsBoardRuntime({ t, route, router, authStore, branchStore, paymentStore }) {
  const activeLocale = computed(() => unref(authStore.locale) || "en");
  const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
  const filters = paymentStore.state.filters;

  const paymentSortOptions = computed(() => [
    { value: "modified desc", label: t("sortModifiedDesc") },
    { value: "payment_date desc", label: t("sortPaymentDateDesc") },
    { value: "payment_date asc", label: t("sortPaymentDateAsc") },
    { value: "amount_try desc", label: t("sortAmountDesc") },
  ]);
  const activeFilterCount = computed(() => paymentStore.activeFilterCount);

  const paymentsResource = createResource({
    url: "frappe.client.get_list",
    params: buildPaymentListParams(),
    auto: true,
  });
  const paymentsLoading = computed(() => Boolean(unref(paymentsResource.loading)));
  const paymentsResourceError = computed(() => unref(paymentsResource.error));
  const paymentInstallmentResource = createResource({
    url: "frappe.client.get_list",
    params: buildPaymentInstallmentListParams(),
    auto: true,
  });

  const paymentQuickCustomerResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Customer",
      fields: ["name", "full_name"],
      filters: buildOfficeBranchLookupFilters(),
      order_by: "modified desc",
      limit_page_length: 500,
    },
  });
  const paymentQuickPolicyResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Policy",
      fields: ["name", "policy_no", "customer"],
      filters: buildOfficeBranchLookupFilters(),
      order_by: "modified desc",
      limit_page_length: 500,
    },
  });
  const paymentQuickClaimResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Claim",
      fields: ["name", "claim_no", "customer", "policy"],
      filters: buildOfficeBranchLookupFilters(),
      order_by: "modified desc",
      limit_page_length: 500,
    },
  });
  const paymentQuickSalesEntityResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Sales Entity",
      fields: ["name", "full_name"],
      order_by: "full_name asc",
      limit_page_length: 500,
    },
  });

  const payments = computed(() => paymentStore.filteredItems);
  const installmentSummaryByPayment = computed(() => {
    const grouped = new Map();
    for (const installment of asArray(resourceValue(paymentInstallmentResource, []))) {
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
  const showQuickPaymentDialog = ref(false);
  const paymentQuickOptionsMap = computed(() => ({
    customers: asArray(resourceValue(paymentQuickCustomerResource, [])).map((row) => ({ value: row.name, label: row.full_name || row.name })),
    policies: asArray(resourceValue(paymentQuickPolicyResource, [])).map((row) => ({
      value: row.name,
      label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
    })),
    claims: asArray(resourceValue(paymentQuickClaimResource, [])).map((row) => ({
      value: row.name,
      label: `${row.claim_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
    })),
    salesEntities: asArray(resourceValue(paymentQuickSalesEntityResource, [])).map((row) => ({ value: row.name, label: row.full_name || row.name })),
  }));
  const quickPaymentEyebrow = computed(() => (activeLocale.value === "tr" ? "Hızlı Ödeme" : "Quick Payment"));
  const quickPaymentSuccessHandlers = {
    payment_list: async () => {
      await reloadPayments();
    },
  };
  const paymentsErrorText = computed(() => {
    if (paymentStore.state.error) return paymentStore.state.error;
    const err = paymentsResourceError.value;
    if (!err) return "";
    return err?.messages?.join(" ") || err?.message || t("loadError");
  });
  const paymentSnapshots = computed(() => payments.value.map((payment) => buildPaymentSnapshot(payment)));
  const paymentSummary = computed(() => {
    const rows = paymentSnapshots.value;
    return {
      total: rows.length,
      pending: rows.filter((row) => row.isPending).length,
      collected: rows.filter((row) => row.isCollected).length,
      overdue: rows.filter((row) => row.isOverdue).length,
      totalAmount: rows.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0),
    };
  });
  const paymentListColumns = computed(() => [
    { key: "payment_no", label: t("paymentNo"), width: "180px", type: "mono" },
    { key: "customer", label: t("customer"), width: "220px" },
    { key: "policy", label: t("policy"), width: "160px", type: "mono" },
    { key: "due_date_label", label: t("dueDate"), width: "135px", type: "date" },
    { key: "amount_label", label: t("amount"), width: "140px", type: "amount", align: "right" },
    { key: "collected_amount_label", label: t("collected"), width: "150px", type: "amount", align: "right" },
    { key: "remaining_amount_label", label: t("remaining"), width: "130px", type: "amount", align: "right" },
    { key: "status", label: t("status"), width: "130px", type: "status", domain: "payment" },
    { key: "_actions", label: t("actions"), width: "340px", type: "actions", align: "right" },
  ]);
  const paymentsWithActions = computed(() => paymentSnapshots.value.map((row) => ({ ...row, _actions: buildPaymentRowActions(row) })));
  const inboundTotal = computed(() => paymentStore.inboundTotal);
  const outboundTotal = computed(() => paymentStore.outboundTotal);

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
    getCurrentPayload: currentPaymentPresetPayload,
    setFilterStateFromPayload: setPaymentFilterStateFromPayload,
    resetFilterState: resetPaymentFilterState,
    refresh: reloadPayments,
    getSortLocale: () => localeCode.value,
  });

  function buildOfficeBranchLookupFilters() {
    const officeBranch = branchStore.requestBranch || "";
    return officeBranch ? { office_branch: officeBranch } : {};
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat(localeCode.value, {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  }

  function formatCount(value) {
    return new Intl.NumberFormat(localeCode.value).format(Number(value || 0));
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat(localeCode.value, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  function parseDateOnly(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  function isPastDate(value) {
    const date = parseDateOnly(value);
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
  }

  function isDueSoon(value) {
    const date = parseDateOnly(value);
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((date.getTime() - today.getTime()) / 86400000);
    return diffDays >= 0 && diffDays <= 7;
  }

  function buildPaymentStatus(payment, collectedAmount, remainingAmount, isOverdue) {
    const rawStatus = String(payment?.status || "").trim();
    if (rawStatus === "Cancelled") return rawStatus;
    if (remainingAmount <= 0 && Number(payment?.amount_try || payment?.amount || 0) > 0) return "Paid";
    if (isOverdue) return "Overdue";
    if (collectedAmount > 0 && remainingAmount > 0) return "Partially Paid";
    if (rawStatus) return rawStatus;
    return "Outstanding";
  }

  function buildPaymentSnapshot(payment) {
    const installmentSummary = installmentSummaryByPayment.value.get(payment?.name) || {};
    const totalAmount = Number(payment?.amount_try || payment?.amount || 0);
    const collectedAmount = Number(installmentSummary.paidAmount || 0);
    const remainingAmount = Math.max(totalAmount - collectedAmount, 0);
    const dueDate = String(payment?.due_date || payment?.payment_date || "").trim();
    const isOverdue = Boolean(installmentSummary.overdue > 0) || (isPastDate(dueDate) && remainingAmount > 0);
    const status = buildPaymentStatus(payment, collectedAmount, remainingAmount, isOverdue);
    const isCollected = status === "Paid" || collectedAmount >= totalAmount;
    const isPending = !isCollected && !isOverdue && status !== "Cancelled";

    return {
      ...payment,
      status,
      totalAmount,
      collectedAmount,
      remainingAmount,
      due_date_label: formatDate(dueDate),
      amount_label: formatCurrency(totalAmount),
      collected_amount_label: formatCurrency(collectedAmount),
      remaining_amount_label: formatCurrency(remainingAmount),
      isOverdue,
      isCollected,
      isPending,
      _urgency: isOverdue ? "row-critical" : remainingAmount > 0 && isDueSoon(dueDate) ? "row-warning" : "",
    };
  }

  function buildPaymentRowActions(payment) {
    return [
      { key: "collect", label: t("collectPayment"), variant: "primary", onClick: () => openCollectPayment(payment) },
      { key: "receipt", label: t("addReceipt"), variant: "secondary", onClick: () => addReceipt(payment) },
      { key: "reminder", label: t("sendReminder"), variant: "secondary", onClick: () => sendReminder(payment) },
    ];
  }

  function buildPaymentListParams() {
    const params = {
      doctype: "AT Payment",
      fields: [
        "name",
        "payment_no",
        "status",
        "payment_direction",
        "payment_purpose",
        "amount",
        "amount_try",
        "payment_date",
        "due_date",
        "customer",
        "policy",
        "reference_no",
        "installment_count",
        "office_branch",
        "sales_entity",
      ],
      order_by: filters.sort || "modified desc",
      limit_page_length: Number(filters.limit) || 24,
    };
    if (filters.direction) {
      params.filters = { payment_direction: filters.direction };
    }
    return withOfficeBranchFilter(params);
  }

  function buildPaymentInstallmentListParams() {
    return withOfficeBranchFilter({
      doctype: "AT Payment Installment",
      fields: ["payment", "installment_no", "installment_count", "status", "due_date", "amount_try"],
      order_by: "due_date asc",
      limit_page_length: 1000,
    });
  }

  function withOfficeBranchFilter(params) {
    const officeBranch = branchStore.requestBranch || "";
    if (!officeBranch) return params;
    return {
      ...params,
      filters: {
        ...(params.filters || {}),
        office_branch: officeBranch,
      },
    };
  }

  function reloadPayments() {
    paymentsResource.params = buildPaymentListParams();
    paymentInstallmentResource.params = buildPaymentInstallmentListParams();
    paymentStore.setLocaleCode(localeCode.value);
    paymentStore.setLoading(true);
    paymentStore.clearError();
    return Promise.all([paymentsResource.reload(), paymentInstallmentResource.reload()])
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
      columns: [t("paymentNo"), t("customer"), t("policy"), t("dueDate"), t("amount"), t("collected"), t("remaining"), t("status")],
      rows: paymentSnapshots.value.map((payment) => ({
        [t("paymentNo")]: payment.payment_no || payment.name || "-",
        [t("customer")]: payment.customer || "-",
        [t("policy")]: payment.policy || "-",
        [t("dueDate")]: payment.due_date_label || "-",
        [t("amount")]: payment.amount_label || formatCurrency(payment.totalAmount),
        [t("collected")]: payment.collected_amount_label || formatCurrency(payment.collectedAmount),
        [t("remaining")]: payment.remaining_amount_label || formatCurrency(payment.remainingAmount),
        [t("status")]: payment.status || "-",
      })),
      filters: currentPaymentPresetPayload(),
      format,
    });
  }

  function applyPaymentFilters() {
    return reloadPayments();
  }

  function resetPaymentFilterState() {
    paymentStore.resetFilters();
  }

  function currentPaymentPresetPayload() {
    return {
      query: filters.query,
      direction: filters.direction,
      customerQuery: filters.customerQuery,
      policyQuery: filters.policyQuery,
      purposeQuery: filters.purposeQuery,
      sort: filters.sort,
      limit: Number(filters.limit) || 24,
    };
  }

  function setPaymentFilterStateFromPayload(payload) {
    filters.query = String(payload?.query || "");
    filters.direction = String(payload?.direction || "");
    filters.customerQuery = String(payload?.customerQuery || "");
    filters.policyQuery = String(payload?.policyQuery || "");
    filters.purposeQuery = String(payload?.purposeQuery || "");
    filters.sort = String(payload?.sort || "modified desc");
    filters.limit = Number(payload?.limit || 24) || 24;
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

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function prepareQuickPaymentDialog({ form }) {
    if (!form.payment_date) form.payment_date = todayIso();
  }

  function paymentIdentityFacts(payment) {
    return [mutedFact("purpose", t("purpose"), payment?.payment_purpose || "-", "at-clamp-2"), subtleFact("record", t("recordId"), payment?.name || "-")];
  }

  function paymentDetailFacts(payment) {
    const items = [mutedFact("date", t("date"), payment?.payment_date || "-"), mutedFact("customer", t("customer"), payment?.customer || "-")];
    pushMutedFactIf(items, Boolean(payment?.policy), "policy", t("policy"), payment?.policy);
    const installmentSummary = installmentSummaryByPayment.value.get(payment?.name);
    const installmentCount = Number(installmentSummary?.total || payment?.installment_count || 0);
    pushMutedFactIf(items, installmentCount > 1, "installments", t("installments"), `${installmentCount}`);
    pushMutedFactIf(items, Number(installmentSummary?.paid || 0) > 0, "paid_installments", t("paidInstallments"), `${installmentSummary?.paid}/${installmentCount || installmentSummary?.paid}`);
    pushMutedFactIf(items, Number(installmentSummary?.overdue || 0) > 0, "overdue_installments", t("overdueInstallments"), `${installmentSummary?.overdue}`);
    pushMutedFactIf(items, Boolean(installmentSummary?.nextDue), "next_due", t("nextInstallmentDue"), installmentSummary?.nextDue);
    return items;
  }

  function openRelatedRecord(payment) {
    if (payment?.policy) {
      window.location.assign(`/at/policies/${encodeURIComponent(payment.policy)}`);
      return;
    }
    if (payment?.customer) {
      window.location.assign(`/at/customers/${encodeURIComponent(payment.customer)}`);
    }
  }

  function openPaymentDetail(payment) {
    if (!payment?.name) return;
    router.push({ name: "payment-detail", params: { name: payment.name } });
  }

  function openCollectPayment(payment) {
    if (!payment?.name) return;
    router.push({ name: "payment-detail", params: { name: payment.name }, query: { action: "collect" } });
  }

  function addReceipt(payment) {
    if (!payment?.name) return;
    router.push({ name: "payment-detail", params: { name: payment.name }, query: { action: "receipt" } });
  }

  function sendReminder(payment) {
    if (!payment?.name) return;
    router.push({
      name: "reminders-list",
      query: { sourceDoctype: "AT Payment", sourceName: payment.name, customer: payment.customer || "", policy: payment.policy || "" },
    });
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

  watch(
    () => branchStore.selected,
    () => {
      paymentStore.setLocaleCode(localeCode.value);
      const officeFilters = buildOfficeBranchLookupFilters();
      paymentQuickCustomerResource.params = { doctype: "AT Customer", fields: ["name", "full_name"], filters: officeFilters, order_by: "modified desc", limit_page_length: 500 };
      paymentQuickPolicyResource.params = { doctype: "AT Policy", fields: ["name", "policy_no", "customer"], filters: officeFilters, order_by: "modified desc", limit_page_length: 500 };
      paymentQuickClaimResource.params = { doctype: "AT Claim", fields: ["name", "claim_no", "customer", "policy"], filters: officeFilters, order_by: "modified desc", limit_page_length: 500 };
      void paymentQuickCustomerResource.reload();
      void paymentQuickPolicyResource.reload();
      void paymentQuickClaimResource.reload();
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
    paymentQuickCustomerResource,
    paymentQuickPolicyResource,
    paymentQuickClaimResource,
    paymentQuickSalesEntityResource,
    payments,
    installmentSummaryByPayment,
    showQuickPaymentDialog,
    paymentQuickOptionsMap,
    quickPaymentEyebrow,
    quickPaymentSuccessHandlers,
    paymentsErrorText,
    paymentSnapshots,
    paymentSummary,
    paymentListColumns,
    paymentsWithActions,
    inboundTotal,
    outboundTotal,
    reloadPayments,
    downloadPaymentExport,
    applyPaymentFilters,
    resetPaymentFilters,
    currentPaymentPresetPayload,
    setPaymentFilterStateFromPayload,
    applyRouteFilters,
    resetPaymentFilterState,
    todayIso,
    prepareQuickPaymentDialog,
    paymentIdentityFacts,
    paymentDetailFacts,
    openRelatedRecord,
    openPaymentDetail,
    openCollectPayment,
    addReceipt,
    sendReminder,
    formatCurrency,
    formatCount,
    formatDate,
  };
}
