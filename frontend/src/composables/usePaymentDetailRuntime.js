import { computed, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "../utils/i18n";

export function usePaymentDetailRuntime({ name, activeLocale = ref("tr") }) {
  const router = useRouter();

  function t(key) {
    return translateText(key, activeLocale);
  }

  const paymentResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_payment_detail_payload",
    auto: false,
  });

  const data = computed(() => unref(paymentResource.data) || {});
  const payment = computed(() => data.value.payment || {});
  const installments = computed(() => data.value.installments || []);
  const documents = computed(() => data.value.documents || []);

  const loading = computed(() => paymentResource.loading);

  async function reload() {
    const paymentName = unref(name);
    if (!paymentName) return;
    await paymentResource.reload({ name: paymentName });
  }

  function backToList() {
    router.push({ name: "payments-board" });
  }

  function formatDate(val) {
    if (!val) return "-";
    return new Intl.DateTimeFormat(unref(activeLocale) === "tr" ? "tr-TR" : "en-US").format(new Date(val));
  }

  function formatCurrency(val, currency = "TRY") {
    return new Intl.NumberFormat(unref(activeLocale) === "tr" ? "tr-TR" : "en-US", {
      style: "currency",
      currency: currency || "TRY",
    }).format(Number(val || 0));
  }

  const heroCells = computed(() => [
    { label: t("payment_purpose"), value: payment.value.payment_purpose },
    { label: t("amount"), value: formatCurrency(payment.value.amount, payment.value.currency), variant: "lg" },
    { label: t("payment_date"), value: formatDate(payment.value.payment_date) },
    { label: t("status"), value: t(`status_${String(payment.value.status || "Unpaid").toLowerCase()}`), variant: "accent" },
  ]);

  const profileFields = computed(() => [
    { label: t("payment_no"), value: payment.value.payment_no },
    { label: t("payment_date"), value: formatDate(payment.value.payment_date) },
    { label: t("payment_direction"), value: payment.value.payment_direction },
    { label: t("payment_purpose"), value: payment.value.payment_purpose },
  ]);

  // Watch for name change
  watch(() => unref(name), (newVal) => {
    if (newVal) reload();
  }, { immediate: true });

  return {
    payment,
    installments,
    documents,
    loading,
    t,
    reload,
    backToList,
    formatDate,
    formatCurrency,
    heroCells,
    profileFields,
  };
}
