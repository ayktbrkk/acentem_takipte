import { computed } from "vue";

import { buildPaymentSnapshot, formatCount, formatCurrency } from "./paymentsBoard/helpers";
import { translateText } from "../utils/i18n";

export function usePaymentsBoardSummary({ t, localeCode, payments, installmentSummaryByPayment, buildPaymentRowActions, paymentStore }) {
  function fallbackLabel() {
    return t("unspecified");
  }

  const paymentSnapshots = computed(() =>
    payments.value.map((payment) => {
      const snapshot = buildPaymentSnapshot(payment, installmentSummaryByPayment.value.get(payment?.name), localeCode.value);
      const custType = snapshot.customer_customer_type
        ? translateText(snapshot.customer_customer_type, localeCode.value) || snapshot.customer_customer_type
        : fallbackLabel();
      return {
        ...snapshot,
        payment_primary: snapshot.payment_no || snapshot.name || fallbackLabel(),
        payment_secondary: snapshot.policy || fallbackLabel(),
        customer_label: snapshot.customer_full_name || snapshot.customer_name || snapshot.customer || fallbackLabel(),
        customer_secondary: `${custType} | ${snapshot.customer_masked_tax_id || fallbackLabel()}`,
        due_primary: snapshot.due_date_label || fallbackLabel(),
        due_secondary: t(snapshot.status),
        finance_primary: snapshot.amount_label || formatCurrency(localeCode.value, snapshot.totalAmount),
        finance_secondary: `${snapshot.collected_amount_label || "0"} | ${snapshot.remaining_amount_label || "0"}`,
        policy_no_display: snapshot.policy_no || snapshot.policy || fallbackLabel(),
        insurance_company_label: snapshot.insurance_company || fallbackLabel(),
        carrier_policy_no: snapshot.carrier_policy_no || snapshot.policy_no || fallbackLabel(),
        branch_label: snapshot.branch || fallbackLabel(),
        customer_type_label: custType,
        customer_tax_id: snapshot.customer_masked_tax_id || fallbackLabel(),
        customer_birth_date: snapshot.customer_birth_date || null,
      };
    })
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
    { key: "payment_primary", secondaryKey: "payment_secondary", label: t("colPayment"), type: "stacked" },
    { key: "customer_label", secondaryKey: "customer_secondary", label: t("colCustomer"), type: "stacked" },
    { key: "due_primary", secondaryKey: "due_secondary", label: t("colDueDate"), type: "stacked" },
    { key: "finance_primary", secondaryKey: "finance_secondary", label: t("colFinance"), type: "stacked" },
    { key: "_actions", label: t("actions"), width: "200px", type: "actions", align: "right" },
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
