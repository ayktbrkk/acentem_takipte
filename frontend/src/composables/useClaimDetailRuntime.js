import { computed, reactive, ref, unref, watch } from "vue";
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
  const customer = computed(() => data.value.customer || {});
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

  function openCustomer() {
    if (claim.value.customer) {
      router.push({ name: "customer-detail", params: { name: claim.value.customer } });
    }
  }

  function backToList() {
    router.push({ name: "claims-board" });
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
    { key: "insurance_company", label: t("insurance_company"), value: claim.value.insurance_company, type: "text", disabled: true },
    { key: "policy", label: t("policy_no"), value: claim.value.policy, type: "text", disabled: true },
    { key: "incident_date", label: t("claim_date"), value: claim.value.incident_date, displayValue: formatDate(claim.value.incident_date), type: "date", required: true },
    { key: "claim_type", label: t("claim_type"), value: claim.value.claim_type, type: "text" },
    { key: "assigned_expert", label: t("expert"), value: claim.value.assigned_expert, type: "text" },
  ]);

  const financialFields = computed(() => [
    { key: "estimated_amount", label: t("estimated_amount"), value: claim.value.estimated_amount, displayValue: formatCurrency(claim.value.estimated_amount, claim.value.currency), type: "text" },
    { key: "paid_amount", label: t("paid_amount"), value: claim.value.paid_amount, displayValue: formatCurrency(claim.value.paid_amount, claim.value.currency), type: "text", disabled: true },
    { key: "total_amount", label: t("total_amount"), value: claim.value.total_amount, displayValue: formatCurrency(claim.value.total_amount, claim.value.currency), type: "text", required: true },
  ]);

  const customerFields = computed(() => [
    { label: t("customer"), value: customer.value.full_name || claim.value.customer_name || "-" },
    { label: t("tax_id"), value: customer.value.tax_id || "-" },
    { label: t("phone"), value: customer.value.phone || "-" },
    { label: t("email"), value: customer.value.email || "-" },
  ]);

  async function updateClaim(values, onSuccess) {
    if (!unref(name)) return;
    saving.value = true;
    try {
      await updateResource.submit({
        doctype: "AT Claim",
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
    claim,
    documents,
    payments,
    loading,
    t,
    reload,
    backToList,
    openClaimDocuments,
    openCustomer,
    showUploadModal,
    openUploadModal,
    closeUploadModal,
    handleUploadComplete,
    canUploadDocuments,
    atDocumentLifecycle,
    archiveDocument,
    restoreDocument,
    permanentDeleteDocument,
    formatCurrency,
    heroCells,
    profileFields,
    financialFields,
    customerFields,
    saving,
    customerSaving,
    notification,
    updateClaim,
    updateCustomer,
    customer,
  };
}

