import { computed, reactive, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "../utils/i18n";
import { PAYMENT_TRANSLATIONS } from "../config/payment_translations";
import { useAuthStore } from "../stores/auth";

export function usePaymentDetailRuntime({ name, activeLocale = ref("tr") }) {
  const router = useRouter();
  const authStore = useAuthStore();

  function t(key) {
    const locale = String(unref(activeLocale) || "tr").toLowerCase().startsWith("tr") ? "tr" : "en";
    return PAYMENT_TRANSLATIONS[locale]?.[key] || PAYMENT_TRANSLATIONS.en?.[key] || translateText(key, activeLocale);
  }

  const paymentResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_payment_detail_payload",
    auto: false,
  });

  const data = computed(() => unref(paymentResource.data) || {});
  const payment = computed(() => data.value.payment || {});
  const customer = computed(() => data.value.customer || {});
  const installments = computed(() => data.value.installments || []);
  const documents = computed(() => data.value.documents || data.value.files || []);
  const showUploadModal = ref(false);
  const saving = ref(false);
  const notification = reactive({ show: false, message: "", type: "success" });

  const updateResource = createResource({
    url: "frappe.client.set_value",
    auto: false,
  });

  function showNotification(message, type = "success") {
    notification.message = message;
    notification.type = type;
    notification.show = true;
    setTimeout(() => {
      notification.show = false;
    }, 4000);
  }

  const loading = computed(() => paymentResource.loading);

  async function reload() {
    const paymentName = unref(name);
    if (!paymentName) return;
    await paymentResource.reload({ name: paymentName });
  }

  function backToList() {
    router.push("/payments");
  }

  function openCustomer() {
    const customerName = String(payment.value.customer || "").trim();
    if (!customerName) return;
    router.push({ name: "customer-detail", params: { name: customerName } });
  }

  function openReminder() {
    const paymentName = String(unref(name) || payment.value.name || "").trim();
    if (!paymentName) return;
    router.push({
      name: "communication-center",
      query: {
        payment: paymentName,
        mode: "reminder",
      },
    });
  }

  function openPaymentDocuments() {
    const paymentName = String(unref(name) || payment.value.name || "").trim();
    if (!paymentName) return;
    router.push({
      name: "at-documents-list",
      query: {
        reference_doctype: "AT Payment",
        reference_name: paymentName,
      },
    });
  }

  function openCollectPayment() {
    const paymentName = String(unref(name) || payment.value.name || "").trim();
    router.push({ name: "payments-board", query: paymentName ? { collect: paymentName } : {} });
  }

  function openUploadModal() {
    showUploadModal.value = true;
  }

  function closeUploadModal() {
    showUploadModal.value = false;
  }

  async function handleUploadComplete() {
    showUploadModal.value = false;
    await reload();
  }

  const canUploadDocuments = computed(() =>
    Boolean(authStore.can(["doctypes", "AT Payment", "write"]) || authStore.can(["doctypes", "AT Document", "create"]))
  );

  function formatDate(val) {
    if (!val) return t("unspecified");
    return new Intl.DateTimeFormat(unref(activeLocale) === "tr" ? "tr-TR" : "en-US").format(new Date(val));
  }

  function translateValue(val) {
    return val ? translateText(String(val), activeLocale) || String(val) : t("unspecified");
  }

  function formatCurrency(val, currency = "TRY") {
    return new Intl.NumberFormat(unref(activeLocale) === "tr" ? "tr-TR" : "en-US", {
      style: "currency",
      currency: currency || "TRY",
    }).format(Number(val || 0));
  }

  const heroCells = computed(() => [
    { label: t("payment_purpose"), value: translateValue(payment.value.payment_purpose) },
    { label: t("amount"), value: formatCurrency(payment.value.amount, payment.value.currency) },
    { label: t("payment_date"), value: formatDate(payment.value.payment_date) },
    { 
      label: t("status"), 
      value: t(`status_${String(payment.value.status || "Unpaid").toLowerCase()}`),
      variant: payment.value.status === "Paid" ? "success-pill" : payment.value.status === "Cancelled" ? "cancel-pill" : "default"
    },
  ]);

  const profileFields = computed(() => [
    { key: "payment_no", label: t("payment_no"), value: payment.value.payment_no, type: "text", disabled: true, unspecifiedLabel: t("unspecified") },
    { key: "payment_date", label: t("payment_date"), value: payment.value.payment_date, displayValue: formatDate(payment.value.payment_date), type: "date", unspecifiedLabel: t("unspecified") },
    { key: "payment_direction", label: t("payment_direction"), value: payment.value.payment_direction, displayValue: translateValue(payment.value.payment_direction), type: "select", options: [
      { label: t("inbound"), value: "Inbound" },
      { label: t("outbound"), value: "Outbound" }
    ], unspecifiedLabel: t("unspecified")},
    { key: "payment_purpose", label: t("payment_purpose"), value: payment.value.payment_purpose, displayValue: translateValue(payment.value.payment_purpose), type: "text", unspecifiedLabel: t("unspecified") },
  ]);

  const financialFields = computed(() => [
    { key: "amount", label: t("amount"), value: payment.value.amount, displayValue: formatCurrency(payment.value.amount, payment.value.currency), type: "text", unspecifiedLabel: t("unspecified") },
    { key: "status", label: t("status"), value: payment.value.status, displayValue: t('status_' + String(payment.value.status || 'Unpaid').toLowerCase()), type: "select", options: [
      { label: t("status_paid"), value: "Paid" },
      { label: t("status_unpaid"), value: "Unpaid" },
      { label: t("status_cancelled"), value: "Cancelled" }
    ], unspecifiedLabel: t("unspecified")},
    { key: "policy", label: t("policy"), value: payment.value.policy, type: "text", unspecifiedLabel: t("unspecified") },
    { key: "claim", label: t("claim_detail"), value: payment.value.claim, type: "text", unspecifiedLabel: t("unspecified") },
  ]);

  async function savePayment(values, onSuccess) {
    const paymentName = unref(name);
    if (!paymentName) return;
    
    saving.value = true;
    try {
      await updateResource.submit({
        doctype: "AT Payment",
        name: paymentName,
        fieldname: values,
      });
      showNotification(t("save_success"));
      if (onSuccess) onSuccess();
      await reload();
    } catch (err) {
      console.error(err);
      showNotification(t("save_failed"), "error");
    } finally {
      saving.value = false;
    }
  }

  // Watch for name change
  watch(() => unref(name), (newVal) => {
    if (newVal) reload();
  }, { immediate: true });

  return {
    payment,
    customer,
    installments,
    documents,
    showUploadModal,
    loading,
    t,
    reload,
    backToList,
    openCustomer,
    openReminder,
    openPaymentDocuments,
    openCollectPayment,
    openUploadModal,
    closeUploadModal,
    handleUploadComplete,
    canUploadDocuments,
    formatDate,
    formatCurrency,
    heroCells,
    profileFields,
    financialFields,
    saving,
    notification,
    savePayment,
  };
}
