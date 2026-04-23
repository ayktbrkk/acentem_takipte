import { computed, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "../utils/i18n";

export function useLeadDetailRuntime({ name, activeLocale = ref("tr") }) {
  const router = useRouter();

  function t(key) {
    return translateText(key, activeLocale);
  }

  const leadResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_lead_detail_payload",
    auto: false,
  });

  const data = computed(() => unref(leadResource.data) || {});
  const lead = computed(() => data.value.lead || {});
  const customer = computed(() => data.value.customer || {});
  const activity = computed(() => data.value.activity || []);
  const documents = computed(() => data.value.files || []);
  const offers = computed(() => data.value.offers || []);
  const policies = computed(() => data.value.policies || []);

  const leadFullName = computed(() => {
    const fn = lead.value.first_name || "";
    const ln = lead.value.last_name || "";
    return `${fn} ${ln}`.trim() || lead.value.name || "-";
  });

  const loading = computed(() => leadResource.loading);

  async function reload() {
    const leadName = unref(name);
    if (!leadName) return;
    await leadResource.reload({ name: leadName });
  }

  function backToList() {
    router.push({ name: "lead-list" });
  }

  function openOffer(offerName) {
    router.push({ name: "offer-detail", params: { name: offerName } });
  }

  function openPolicy(policyName) {
    router.push({ name: "policy-detail", params: { name: policyName } });
  }

  function openCustomer() {
    if (lead.value.customer) {
      router.push({ name: "customer-detail", params: { name: lead.value.customer } });
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
    { label: t("industry"), value: lead.value.industry || "-" },
    { label: t("lead_date"), value: formatDate(lead.value.creation) },
    { label: t("status"), value: t(`status_${String(lead.value.status || "Draft").toLowerCase()}`), variant: "accent" },
  ]);

  const profileFields = computed(() => [
    { label: t("full_name"), value: leadFullName.value },
    { label: t("phone"), value: lead.value.phone || "-" },
    { label: t("email"), value: lead.value.email || "-" },
    { label: t("tax_id"), value: lead.value.tax_id || "-" },
    { label: t("industry"), value: lead.value.industry || "-" },
  ]);

  const customerFields = computed(() => [
    { label: t("customer"), value: customer.value.full_name || lead.value.customer || "-" },
    { label: t("phone"), value: customer.value.phone || "-" },
    { label: t("email"), value: customer.value.email || "-" },
  ]);

  // Watch for name change
  watch(() => unref(name), (newVal) => {
    if (newVal) reload();
  }, { immediate: true });

  return {
    lead,
    customer,
    activity,
    documents,
    offers,
    policies,
    loading,
    t,
    reload,
    backToList,
    openOffer,
    openPolicy,
    openCustomer,
    formatDate,
    formatCurrency,
    heroCells,
    profileFields,
    customerFields,
  };
}

