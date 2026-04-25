import { computed, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "../utils/i18n";
import { useAuthStore } from "../stores/auth";

export function useOfferDetailRuntime({ name, activeLocale = ref("tr") }) {
  const router = useRouter();
  const authStore = useAuthStore();

  function t(key) {
    return translateText(key, activeLocale);
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
    { label: t("branch"), value: offer.value.branch },
    { label: t("gross_premium"), value: formatCurrency(offer.value.gross_premium, offer.value.currency), variant: "lg" },
    { label: t("offer_date"), value: formatDate(offer.value.offer_date) },
    { label: t("status"), value: t(`status_${String(offer.value.status || "Draft").toLowerCase()}`), variant: "accent" },
  ]);

  const profileFields = computed(() => [
    { key: "insurance_company", label: t("insurance_company"), value: offer.value.insurance_company, type: "text", disabled: true },
    { key: "branch", label: t("branch"), value: offer.value.branch, type: "text", disabled: true },
    { key: "offer_date", label: t("offer_date"), value: offer.value.offer_date, displayValue: formatDate(offer.value.offer_date), type: "date", required: true },
    { key: "valid_until", label: t("valid_until"), value: offer.value.valid_until, displayValue: formatDate(offer.value.valid_until), type: "date", required: true },
  ]);

  const premiumFields = computed(() => [
    { key: "gross_premium", label: t("gross_premium"), value: offer.value.gross_premium, displayValue: formatCurrency(offer.value.gross_premium, offer.value.currency), type: "text", required: true },
    { key: "currency", label: t("currency"), value: offer.value.currency, type: "text", disabled: true },
  ]);

  const customerFields = computed(() => [
    { label: t("customer"), value: customer.value.full_name || offer.value.customer || "-" },
    { label: t("tax_id"), value: customer.value.tax_id || "-" },
    { label: t("phone"), value: customer.value.phone || "-" },
    { label: t("email"), value: customer.value.email || "-" },
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

