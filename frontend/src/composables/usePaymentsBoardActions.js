import { paymentDetailFacts, paymentIdentityFacts } from "./paymentsBoard/helpers";

export function usePaymentsBoardActions({ t, router, installmentSummaryByPayment }) {
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

  const buildPaymentRowActions = (payment) => [
    { key: "collect", label: t("collectPayment"), variant: "primary", onClick: () => openCollectPayment(payment) },
    { key: "receipt", label: t("addReceipt"), variant: "secondary", onClick: () => addReceipt(payment) },
    { key: "reminder", label: t("sendReminder"), variant: "secondary", onClick: () => sendReminder(payment) },
  ];

  return {
    openRelatedRecord,
    openPaymentDetail,
    openCollectPayment,
    addReceipt,
    sendReminder,
    buildPaymentRowActions,
    paymentIdentityFacts: (payment) => paymentIdentityFacts(t, payment),
    paymentDetailFacts: (payment) => paymentDetailFacts(t, payment, installmentSummaryByPayment.value.get(payment?.name)),
  };
}
