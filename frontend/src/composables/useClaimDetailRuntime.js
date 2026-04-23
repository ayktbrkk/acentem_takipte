import { computed, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "../utils/i18n";
import { useAuthStore } from "../stores/auth";
import { useAtDocumentLifecycle } from "./useAtDocumentLifecycle";

export function useClaimDetailRuntime({ name, activeLocale = ref("tr") }) {
  const router = useRouter();
  const authStore = useAuthStore();

  function t(key) {
    return translateText(key, activeLocale);
  }

  const claimResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_claim_detail_payload",
    auto: false,
  });

  const data = computed(() => unref(claimResource.data) || {});
  const claim = computed(() => data.value.claim || {});
  const documents = computed(() => data.value.documents || []);
  const payments = computed(() => data.value.payments || []);
  const showUploadModal = ref(false);

  const atDocumentLifecycle = useAtDocumentLifecycle({
    authStore,
    t,
  });

  const loading = computed(() => claimResource.loading);

  async function reload() {
    const claimName = unref(name);
    if (!claimName) return;
    await claimResource.reload({ name: claimName });
  }

  function backToList() {
    router.push({ name: "claims-board" });
  }

  function openClaimDocuments() {
    const claimName = String(unref(name) || "").trim();
    if (!claimName) return;
    router.push({
      name: "at-documents-list",
      query: {
        reference_doctype: "AT Claim",
        reference_name: claimName,
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
    Boolean(
      authStore.can(["doctypes", "AT Claim", "write"]) || authStore.can(["doctypes", "AT Document", "create"])
    )
  );

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

  async function archiveDocument(doc) {
    return atDocumentLifecycle.archiveDocument(doc, reload);
  }

  async function restoreDocument(doc) {
    return atDocumentLifecycle.restoreDocument(doc, reload);
  }

  async function permanentDeleteDocument(doc) {
    return atDocumentLifecycle.permanentDeleteDocument(doc, reload);
  }

  const heroCells = computed(() => [
    { label: t("claim_type"), value: claim.value.claim_type },
    { label: t("total_amount"), value: formatCurrency(claim.value.estimated_amount, claim.value.currency), variant: "lg" },
    { label: t("claim_date"), value: formatDate(claim.value.incident_date) },
    { label: t("status"), value: t(`status_${String(claim.value.claim_status || "Open").toLowerCase()}`), variant: "accent" },
  ]);

  const profileFields = computed(() => [
    { label: t("insurance_company"), value: claim.value.insurance_company },
    { label: t("policy_no"), value: claim.value.policy },
    { label: t("claim_date"), value: formatDate(claim.value.incident_date) },
    { label: t("claim_type"), value: claim.value.claim_type },
    { label: t("expert"), value: claim.value.assigned_expert || "-" },
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
    openClaimDocuments,
    showUploadModal,
    openUploadModal,
    closeUploadModal,
    handleUploadComplete,
    canUploadDocuments,
    atDocumentLifecycle,
    archiveDocument,
    restoreDocument,
    permanentDeleteDocument,
    formatDate,
    formatCurrency,
    heroCells,
    profileFields,
  };
}

