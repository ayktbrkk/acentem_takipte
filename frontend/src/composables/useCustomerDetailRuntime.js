import { computed, onMounted, ref, unref } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";

import { useAuthStore } from "../stores/auth";
import { formatDate as sharedFormatDate, formatMoney as sharedFormatMoney } from "../utils/detailFormatters";
import { useAtDocumentLifecycle } from "./useAtDocumentLifecycle";
import { translateText } from "../utils/i18n";

export function useCustomerDetailRuntime({ name, activeLocale }) {
  const router = useRouter();
  const authStore = useAuthStore();
  const customerName = computed(() => String(unref(name) || "").trim());
  const localeValue = computed(() => String(unref(activeLocale) || "en").trim() || "en");
  const localeCode = computed(() => (localeValue.value.startsWith("tr") ? "tr-TR" : "en-US"));

  function t(key) {
    return translateText(key, activeLocale);
  }

  const customer360Resource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_customer_360_payload",
    auto: false,
  });

  const atDocumentLifecycle = useAtDocumentLifecycle({
    authStore,
    t
  });

  const customer = computed(() => unref(customer360Resource.data)?.customer || {});
  const summary = computed(() => unref(customer360Resource.data)?.summary || {});
  const portfolio = computed(() => unref(customer360Resource.data)?.portfolio || {});
  const communications = computed(() => unref(customer360Resource.data)?.communication || {});
  const atDocuments = computed(() => unref(customer360Resource.data)?.documents?.items || []);
  const insights = computed(() => unref(customer360Resource.data)?.insights || {});
  const crossSell = computed(() => unref(customer360Resource.data)?.cross_sell || {});
  const operations = computed(() => unref(customer360Resource.data)?.operations || {});
  
  const loading = computed(() => unref(customer360Resource.loading));
  const loadErrorText = computed(() => unref(customer360Resource.error)?.message || "");

  const showUploadModal = ref(false);
  function openUploadModal() { showUploadModal.value = true; }
  function closeUploadModal() { showUploadModal.value = false; }
  async function handleUploadComplete() { showUploadModal.value = false; reload(); }
  
  const canUploadDocuments = computed(() => {
    const caps = authStore.capabilities?.doctypes || {};
    return Boolean(
      caps?.["AT Customer"]?.write
      || caps?.["AT Document"]?.create
    );
  });

  function formatDate(val) {
    return sharedFormatDate(localeCode.value, val);
  }

  function formatCurrency(val, currency = "TRY") {
    return sharedFormatMoney(localeCode.value, val, currency);
  }

  const heroCells = computed(() => [
    { label: t("total_policies"), value: summary.value.active_policy_count || "0", variant: "default" },
    { label: t("open_claims"), value: summary.value.open_claim_count || "0", variant: summary.value.open_claim_count > 0 ? "warning" : "default" },
    { label: t("overdue_payments"), value: formatCurrency(summary.value.overdue_payment_amount), variant: summary.value.overdue_payment_amount > 0 ? "critical" : "default" },
    { label: t("total_premium"), value: formatCurrency(summary.value.total_premium), variant: "lg" },
  ]);

  const profileFields = computed(() => [
    { label: t("full_name"), value: customer.value.full_name || "-" },
    { label: t("tax_id"), value: customer.value.tax_id || "-" },
    { label: t("phone"), value: customer.value.phone || "-" },
    { label: t("email"), value: customer.value.email || "-" },
  ]);

  const moreProfileFields = computed(() => [
    { label: t("birth_date"), value: formatDate(customer.value.birth_date) },
    { label: t("gender"), value: t(customer.value.gender?.toLowerCase()) || customer.value.gender || "-" },
    { label: t("marital_status"), value: t(customer.value.marital_status?.toLowerCase()) || customer.value.marital_status || "-" },
    { label: t("occupation"), value: customer.value.occupation || "-" },
  ]);

  const operationalFields = computed(() => [
    { label: t("office_branch"), value: customer.value.office_branch || "-" },
    { label: t("assigned_agent"), value: customer.value.assigned_agent || "-" },
    {
      label: t("consent_status"),
      value: t(`status_${String(customer.value.consent_status || "Unknown").toLowerCase()}`),
    },
  ]);

  function backToList() {
    router.push({ name: "customers-board" });
  }

  function openPolicy(policyName) {
    router.push({ name: "policy-detail", params: { name: policyName } });
  }

  function openOffer(offerName) {
    router.push({ name: "offer-detail", params: { name: offerName } });
  }

  function openClaim(claimName) {
    router.push({ name: "claim-detail", params: { name: claimName } });
  }

  function reload() {
    if (customerName.value) {
      if (typeof customer360Resource.reload === "function") {
        customer360Resource.reload({ name: customerName.value });
        return;
      }
      if (typeof customer360Resource.fetch === "function") {
        customer360Resource.fetch({ name: customerName.value });
      }
    }
  }

  onMounted(() => {
    reload();
  });

  return {
    customer,
    summary,
    portfolio,
    communications,
    atDocuments,
    insights,
    crossSell,
    operations,
    loading,
    loadErrorText,
    t,
    formatDate,
    formatCurrency,
    heroCells,
    profileFields,
    moreProfileFields,
    operationalFields,
    showUploadModal,
    openUploadModal,
    closeUploadModal,
    handleUploadComplete,
    canUploadDocuments,
    atDocumentLifecycle,
    reload,
    backToList,
    openPolicy,
    openOffer,
    openClaim,
  };
}

