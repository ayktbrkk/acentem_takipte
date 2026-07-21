import { computed, reactive, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "../utils/i18n";
import { OFFER_TRANSLATIONS } from "../config/offer_translations";
import { useAuthStore } from "../stores/auth";

export function useOfferDetailRuntime({ name, activeLocale = ref("tr") }) {
  const router = useRouter();
  const authStore = useAuthStore();

  function t(key) {
    const locale = String(unref(activeLocale) || "tr").toLowerCase().startsWith("tr") ? "tr" : "en";
    return OFFER_TRANSLATIONS[locale]?.[key] || OFFER_TRANSLATIONS.en?.[key] || translateText(key, activeLocale);
  }

  const offerResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_offer_detail_payload",
    auto: false,
  });

  const data = computed(() => unref(offerResource.data) || {});
  const offer = computed(() => data.value.offer || {});
  const customer = computed(() => data.value.customer || {});
  const activity = computed(() => data.value.activity || []);
  const documents = computed(() => data.value.documents || data.value.files || []);
  const relatedOffers = computed(() => data.value.related_offers || []);
  const relatedPolicies = computed(() => data.value.related_policies || []);
  const showUploadModal = ref(false);
  const saving = ref(false);
  const customerSaving = ref(false);
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

  const loading = computed(() => offerResource.loading);

  async function reload() {
    const offerName = unref(name);
    if (!offerName) return;
    await offerResource.reload({ name: offerName });
  }

  function backToList() {
    router.push({ name: "offer-board" });
  }

  function openOfferDocuments() {
    const offerName = String(unref(name) || "").trim();
    if (!offerName) return;
    router.push({
      name: "at-documents-list",
      query: {
        reference_doctype: "AT Offer",
        reference_name: offerName,
      },
    });
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
    Boolean(authStore.can(["doctypes", "AT Offer", "write"]) || authStore.can(["doctypes", "AT Document", "create"]))
  );

  function openPolicy(policyName) {
    router.push({ name: "policy-detail", params: { name: policyName } });
  }

  function openOffer(offerName) {
    router.push({ name: "offer-detail", params: { name: offerName } });
  }

  function openCustomer() {
    if (offer.value.customer) {
      router.push({ name: "customer-detail", params: { name: offer.value.customer } });
    }
  }

  function formatDate(val) {
    if (!val) return t("unspecified");
    return new Intl.DateTimeFormat(unref(activeLocale) === "tr" ? "tr-TR" : "en-US").format(new Date(val));
  }

  function formatCurrency(val, currency = "TRY") {
    return new Intl.NumberFormat(unref(activeLocale) === "tr" ? "tr-TR" : "en-US", {
      style: "currency",
      currency: currency || "TRY",
    }).format(Number(val || 0));
  }

  const heroCells = computed(() => [
    { label: t("branch"), value: offer.value.branch || t("unspecified") },
    { label: t("gross_premium"), value: formatCurrency(offer.value.gross_premium, offer.value.currency), variant: "lg" },
    { label: t("offer_date"), value: formatDate(offer.value.offer_date) },
    { label: t("status"), value: t(`status_${String(offer.value.status || "Draft").toLowerCase()}`), variant: "accent" },
  ]);

  const profileFields = computed(() => [
    { key: "offer_no", label: t("offer_no"), value: offer.value.name, type: "text", disabled: true, copyable: true, unspecifiedLabel: t("unspecified") },
    { key: "insurance_company", label: t("insurance_company"), value: offer.value.insurance_company, type: "text", disabled: true, copyable: true, unspecifiedLabel: t("unspecified") },
    { key: "branch", label: t("branch"), value: offer.value.branch, type: "text", disabled: true, unspecifiedLabel: t("unspecified") },
    { key: "offer_date", label: t("offer_date"), value: offer.value.offer_date, displayValue: formatDate(offer.value.offer_date), type: "date", required: true, unspecifiedLabel: t("unspecified") },
    { key: "valid_until", label: t("valid_until"), value: offer.value.valid_until, displayValue: formatDate(offer.value.valid_until), type: "date", required: true, unspecifiedLabel: t("unspecified"), valueClass: "text-amber-600 font-bold" },
  ]);

  const premiumFields = computed(() => [
    { key: "net_premium", label: t("net_premium"), value: offer.value.net_premium, displayValue: formatCurrency(offer.value.net_premium, offer.value.currency), type: "text", unspecifiedLabel: t("unspecified") },
    { key: "tax_amount", label: t("tax_amount"), value: offer.value.tax_amount, displayValue: formatCurrency(offer.value.tax_amount, offer.value.currency), type: "text", unspecifiedLabel: t("unspecified") },
    { key: "commission_amount", label: t("commission_amount"), value: offer.value.commission_amount, displayValue: formatCurrency(offer.value.commission_amount, offer.value.currency), type: "text", unspecifiedLabel: t("unspecified") },
    { key: "gross_premium", label: t("gross_premium"), value: offer.value.gross_premium, displayValue: formatCurrency(offer.value.gross_premium, offer.value.currency), type: "text", required: true, unspecifiedLabel: t("unspecified"), valueClass: "text-brand-600 font-bold" },
  ]);

  const customerFields = computed(() => [
    { label: t("customer"), value: customer.value.full_name || offer.value.customer || t("unspecified") },
    { label: t("tax_id"), value: customer.value.tax_id || t("unspecified") },
    { label: t("phone"), value: customer.value.phone || t("unspecified") },
    { label: t("email"), value: customer.value.email || t("unspecified") },
  ]);

  async function updateOffer(values, onSuccess) {
    if (!unref(name)) return;
    saving.value = true;
    try {
      await updateResource.submit({
        doctype: "AT Offer",
        name: unref(name),
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

  async function updateCustomer(values, onSuccess) {
    if (!customer.value.name) return;
    customerSaving.value = true;
    try {
      await updateResource.submit({
        doctype: "AT Customer",
        name: customer.value.name,
        fieldname: values,
      });
      showNotification(t("save_success"));
      if (onSuccess) onSuccess();
      await reload();
    } catch (err) {
      console.error(err);
      showNotification(t("save_failed"), "error");
    } finally {
      customerSaving.value = false;
    }
  }

  // Watch for name change
  watch(() => unref(name), (newVal) => {
    if (newVal) reload();
  }, { immediate: true });

  return {
    offer,
    customer,
    activity,
    documents,
    relatedOffers,
    relatedPolicies,
    showUploadModal,
    loading,
    t,
    reload,
    backToList,
    openOfferDocuments,
    openUploadModal,
    closeUploadModal,
    handleUploadComplete,
    canUploadDocuments,
    openPolicy,
    openOffer,
    openCustomer,
    formatDate,
    formatCurrency,
    heroCells,
    profileFields,
    premiumFields,
    customerFields,
    saving,
    customerSaving,
    notification,
    updateOffer,
    updateCustomer,
  };
}

