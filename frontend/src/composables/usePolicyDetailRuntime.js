import { computed, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "../utils/i18n";
import { useAuthStore } from "../stores/auth";
import { useAtDocumentLifecycle } from "./useAtDocumentLifecycle";

export function usePolicyDetailRuntime({ name, activeLocale = ref("tr") }) {
  const router = useRouter();
  const authStore = useAuthStore();

  function t(key) {
    return translateText(key, activeLocale);
  }

  const policyResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.dashboard.get_policy_detail_payload",
    auto: false,
  });

  const data = computed(() => unref(policyResource.data) || {});
  const policy = computed(() => data.value.policy || {});
  const customer = computed(() => data.value.customer || {});
  const endorsements = computed(() => data.value.endorsements || []);
  const payments = computed(() => data.value.payments || []);
  const documents = computed(() => data.value.files || []);
  const atDocuments = computed(() => data.value.at_documents || []);
  const productProfile = computed(() => data.value.product_profile || {});
  const showUploadModal = ref(false);

  const atDocumentLifecycle = useAtDocumentLifecycle({
    authStore,
    t,
  });

  const loading = computed(() => policyResource.loading);

  async function reload() {
    const policyName = unref(name);
    if (!policyName) return;
    await policyResource.reload({ name: policyName });
  }

  function backToList() {
    router.push({ name: "policy-list" });
  }

  function openCustomer() {
    if (policy.value.customer) {
      router.push({ name: "customer-detail", params: { name: policy.value.customer } });
    }
  }

  function openPolicyDocuments() {
    const policyName = String(unref(name) || "").trim();
    router.push({
      name: "at-documents-list",
      query: {
        reference_doctype: "AT Policy",
        reference_name: policyName,
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
      authStore.can(["doctypes", "AT Policy", "write"]) || authStore.can(["doctypes", "AT Document", "create"])
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

  function formatFileSize(bytes) {
    if (!bytes || Number(bytes) <= 0) return "-";
    const kilobytes = Number(bytes) / 1024;
    if (kilobytes < 1024) {
      return `${kilobytes.toFixed(1)} KB`;
    }
    return `${(kilobytes / 1024).toFixed(1)} MB`;
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
    { label: t("branch"), value: policy.value.branch },
    { label: t("gross_premium"), value: formatCurrency(policy.value.gross_premium, policy.value.currency), variant: "lg" },
    { label: t("end_date"), value: formatDate(policy.value.end_date) },
    { label: t("status"), value: t(`status_${String(policy.value.status || "Active").toLowerCase()}`), variant: "success" },
  ]);

  const profileFields = computed(() => [
    { label: t("policy_no"), value: policy.value.policy_no },
    { label: t("insurance_company"), value: policy.value.insurance_company },
    { label: t("branch"), value: policy.value.branch },
    { label: t("issue_date"), value: formatDate(policy.value.issue_date) },
    { label: t("start_date"), value: formatDate(policy.value.start_date) },
    { label: t("end_date"), value: formatDate(policy.value.end_date) },
  ]);

  const customerFields = computed(() => [
    { label: t("customer"), value: customer.value.full_name || policy.value.customer || "-" },
    { label: t("phone"), value: customer.value.phone || "-" },
    { label: t("email"), value: customer.value.email || "-" },
  ]);

  // Watch for name change
  watch(() => unref(name), (newVal) => {
    if (newVal) reload();
  }, { immediate: true });

  return {
    policy,
    customer,
    endorsements,
    payments,
    documents,
    atDocuments,
    productProfile,
    loading,
    t,
    reload,
    backToList,
    openCustomer,
    openPolicyDocuments,
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
    formatFileSize,
    heroCells,
    profileFields,
    customerFields,
  };
}

