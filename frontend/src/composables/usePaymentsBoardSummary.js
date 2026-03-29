import { computed } from "vue";

import { buildPaymentSnapshot, formatCount, formatCurrency } from "./paymentsBoard/helpers";

export function usePaymentsBoardSummary({ t, localeCode, payments, installmentSummaryByPayment, buildPaymentRowActions, paymentStore }) {
  const paymentSnapshots = computed(() =>
    payments.value.map((payment) => buildPaymentSnapshot(payment, installmentSummaryByPayment.value.get(payment?.name), localeCode.value))
  );

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

  return {
    paymentSnapshots,
    paymentSummary,
    paymentListColumns,
    paymentsWithActions,
    inboundTotal,
    outboundTotal,
    formatCount: (value) => formatCount(localeCode.value, value),
    formatCurrency: (value) => formatCurrency(localeCode.value, value),
  };
}
