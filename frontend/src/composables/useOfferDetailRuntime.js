import { computed, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "../utils/i18n";

export function useOfferDetailRuntime({ name, activeLocale = ref("tr") }) {
  const router = useRouter();

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
  const documents = computed(() => data.value.files || []);
  const relatedOffers = computed(() => data.value.related_offers || []);
  const relatedPolicies = computed(() => data.value.related_policies || []);

  const loading = computed(() => offerResource.loading);

  async function reload() {
    const offerName = unref(name);
    if (!offerName) return;
    await offerResource.reload({ name: offerName });
  }

  function backToList() {
    router.push({ name: "offer-board" });
  }

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
    { label: t("insurance_company"), value: offer.value.insurance_company },
    { label: t("branch"), value: offer.value.branch },
    { label: t("offer_date"), value: formatDate(offer.value.offer_date) },
    { label: t("valid_until"), value: formatDate(offer.value.valid_until) },
  ]);

  const customerFields = computed(() => [
    { label: t("customer"), value: customer.value.full_name || offer.value.customer || "-" },
    { label: t("phone"), value: customer.value.phone || "-" },
    { label: t("email"), value: customer.value.email || "-" },
  ]);

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
    loading,
    t,
    reload,
    backToList,
    openPolicy,
    openOffer,
    openCustomer,
    formatDate,
    formatCurrency,
    heroCells,
    profileFields,
    customerFields,
  };
}

