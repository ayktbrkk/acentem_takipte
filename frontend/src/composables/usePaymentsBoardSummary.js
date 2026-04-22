import { computed } from "vue";

import { buildPaymentSnapshot, formatCount, formatCurrency } from "./paymentsBoard/helpers";
import { translateText } from "../utils/i18n";

export function usePaymentsBoardSummary({ t, localeCode, payments, installmentSummaryByPayment, buildPaymentRowActions, paymentStore }) {
  const paymentSnapshots = computed(() =>
    payments.value.map((payment) => {
      const snapshot = buildPaymentSnapshot(payment, installmentSummaryByPayment.value.get(payment?.name), localeCode.value);
      return {
        ...snapshot,
        policy_no_display: snapshot.policy_no || snapshot.policy || "-",
        insurance_company_label: snapshot.insurance_company || "-",
        carrier_policy_no: snapshot.carrier_policy_no || snapshot.policy_no || "-",
        branch_label: snapshot.branch || "-",
        customer_type_label: translateText(snapshot.customer_customer_type || "-", localeCode.value),
        customer_tax_id: snapshot.customer_masked_tax_id || "-",
        customer_label: snapshot.customer_full_name || snapshot.customer_name || snapshot.customer || "-",
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
    { key: "payment_no", label: t("payment_no"), width: "180px", type: "mono" },
    { key: "policy_no_display", label: t("policy"), width: "160px", type: "mono" },
    { key: "insurance_company_label", label: t("insurance_company"), width: "180px" },
    { key: "carrier_policy_no", label: t("carrier_policy_no"), width: "180px", type: "mono" },
    { key: "branch_label", label: t("branch"), width: "130px" },
    { key: "due_date_label", label: t("due_date"), width: "135px", type: "date" },
    { key: "status", label: t("status"), width: "130px", type: "status", domain: "payment" },
    { key: "customer_type_label", label: t("customer_type"), width: "130px" },
    { key: "customer_tax_id", label: t("tax_id_label"), width: "140px", type: "mono" },
    { key: "customer_label", label: t("customer"), width: "220px" },
    { key: "customer_birth_date", label: t("birth_date"), width: "120px", type: "date" },
    { key: "amount_label", label: t("amount"), width: "140px", type: "amount", align: "right" },
    { key: "collected_amount_label", label: t("collected"), width: "150px", type: "amount", align: "right" },
    { key: "remaining_amount_label", label: t("remaining"), width: "130px", type: "amount", align: "right" },
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
