import { computed, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { CLAIM_TRANSLATIONS } from "../config/claim_translations";

export function useClaimDetailRuntime({ name, activeLocale = ref("tr") }) {
  const router = useRouter();

  function t(key) {
    const locale = unref(activeLocale) || "tr";
    return CLAIM_TRANSLATIONS[locale]?.[key] || CLAIM_TRANSLATIONS.en?.[key] || key;
  }

  const claimResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_claim_detail_payload",
    auto: false,
  });

  const data = computed(() => unref(claimResource.data) || {});
  const claim = computed(() => data.value.claim || {});
  const documents = computed(() => data.value.documents || []);
  const payments = computed(() => data.value.payments || []);

  const loading = computed(() => claimResource.loading);

  async function reload() {
    const claimName = unref(name);
    if (!claimName) return;
    await claimResource.reload({ name: claimName });
  }

  function backToList() {
    router.push({ name: "claims-board" });
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
    { label: t("claim_type"), value: claim.value.claim_type },
    { label: t("total_amount"), value: formatCurrency(claim.value.total_amount, claim.value.currency), variant: "lg" },
    { label: t("claim_date"), value: formatDate(claim.value.claim_date) },
    { label: t("status"), value: t(`status_${String(claim.value.status || "Open").toLowerCase()}`), variant: "accent" },
  ]);

  const profileFields = computed(() => [
    { label: t("insurance_company"), value: claim.value.insurance_company },
    { label: t("policy_no"), value: claim.value.policy },
    { label: t("claim_date"), value: formatDate(claim.value.claim_date) },
    { label: t("claim_type"), value: claim.value.claim_type },
  ]);

  // Watch for name change
  watch(() => unref(name), (newVal) => {
    if (newVal) reload();
  }, { immediate: true });

  return {
    claim,
    documents,
    payments,
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
