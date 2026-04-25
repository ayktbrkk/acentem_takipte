import { computed, reactive, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "../utils/i18n";
import { useAuthStore } from "../stores/auth";
import { useAtDocumentLifecycle } from "./useAtDocumentLifecycle";

function resolvePolicyStatusPresentation(status, t) {
  const normalized = String(status || "Active").trim().toLowerCase();

  if (normalized === "active") {
    return { label: t("status_active"), variant: "success-pill" };
  }

  if (["kyt", "waiting", "pending", "draft"].includes(normalized)) {
    return {
      label: normalized === "draft" ? t("status_draft") : t("status_waiting"),
      variant: "waiting-pill",
    };
  }

  if (["ipt", "cancelled", "expired"].includes(normalized)) {
    return {
      label: normalized === "expired" ? t("expired") : t("status_cancelled"),
      variant: "cancel-pill",
    };
  }

  return { label: status || "-", variant: "waiting-pill" };
}

function getDateClass(dateStr) {
  if (!dateStr) return "";
  try {
    const end = new Date(dateStr);
    const now = new Date();
    // Reset hours to compare dates only
    now.setHours(0, 0, 0, 0);
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "text-rose-600 font-bold animate-pulse-subtle";
    if (diffDays <= 30) return "text-amber-600 font-bold";
  } catch (e) {
    return "";
  }
  return "";
}

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

  const policyStatusPresentation = computed(() => resolvePolicyStatusPresentation(policy.value.status, t));

  const heroCells = computed(() => [
    { label: t("branch"), value: policy.value.branch },
    { label: t("gross_premium"), value: formatCurrency(policy.value.gross_premium, policy.value.currency), variant: "lg" },
    { label: t("end_date"), value: formatDate(policy.value.end_date) },
    { label: t("status"), value: policyStatusPresentation.value.label, variant: policyStatusPresentation.value.variant },
  ]);

  const profileFields = computed(() => {
    const fields = [
      { key: "policy_no", label: t("carrier_policy_no"), value: policy.value.policy_no, type: "text", required: true, copyable: true, unspecifiedLabel: t("unspecified") },
      { key: "insurance_company", label: t("insurance_company"), value: policy.value.insurance_company, type: "text", disabled: true, copyable: true, unspecifiedLabel: t("unspecified") },
      { key: "branch", label: t("branch"), value: policy.value.branch, type: "text", disabled: true, unspecifiedLabel: t("unspecified") },
      { key: "issue_date", label: t("issue_date"), value: policy.value.issue_date, displayValue: formatDate(policy.value.issue_date), type: "date", required: true, unspecifiedLabel: t("unspecified") },
      { key: "start_date", label: t("start_date"), value: policy.value.start_date, displayValue: formatDate(policy.value.start_date), type: "date", required: true, unspecifiedLabel: t("unspecified") },
      { 
        key: "end_date", 
        label: t("end_date"), 
        value: policy.value.end_date, 
        displayValue: formatDate(policy.value.end_date), 
        type: "date", 
        required: true, 
        unspecifiedLabel: t("unspecified"),
        valueClass: getDateClass(policy.value.end_date)
      },
      { key: "sales_entity", label: t("sales_entity"), value: policy.value.sales_entity, type: "text", disabled: true, unspecifiedLabel: t("unspecified") },
    ];

    const branch = String(policy.value.branch || "").toLowerCase();
    const riskFields = [];

    if (branch.includes("kasko") || branch.includes("trafik")) {
      riskFields.push(
        { key: "plate", label: t("plate"), value: policy.value.plate, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "vehicle_make_model", label: t("vehicle_make_model"), value: policy.value.vehicle_make_model, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "chassis_no", label: t("chassis_no"), value: policy.value.chassis_no, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "motor_no", label: t("motor_no"), value: policy.value.motor_no, type: "text", unspecifiedLabel: t("unspecified") }
      );
    } else if (branch.includes("konut") || branch.includes("dask")) {
      riskFields.push(
        { key: "uavt_code", label: t("uavt_code"), value: policy.value.uavt_code, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "floor_count", label: t("floor_count"), value: policy.value.floor_count, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "structure_type", label: t("structure_type"), value: policy.value.structure_type, type: "text", unspecifiedLabel: t("unspecified") }
      );
    } else if (branch.includes("sağlık") || branch.includes("saglik") || branch.includes("health")) {
      riskFields.push(
        { key: "coverage_type", label: t("coverage_type"), value: policy.value.coverage_type, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "network_type", label: t("network_type"), value: policy.value.network_type, type: "text", unspecifiedLabel: t("unspecified") }
      );
    }

    if (riskFields.length > 0) {
      fields.push({ type: "divider", label: t("risk_info") });
      fields.push(...riskFields);
    }

    return fields;
  });

  const premiumFields = computed(() => [
    { key: "net_premium", label: t("net_premium"), value: policy.value.net_premium, displayValue: formatCurrency(policy.value.net_premium, policy.value.currency), type: "text" },
    { key: "tax_amount", label: t("tax_amount"), value: policy.value.tax_amount, displayValue: formatCurrency(policy.value.tax_amount, policy.value.currency), type: "text" },
    { key: "commission_amount", label: t("commission_amount"), value: policy.value.commission_amount, displayValue: formatCurrency(policy.value.commission_amount, policy.value.currency), type: "text" },
    { key: "gross_premium", label: t("gross_premium"), value: policy.value.gross_premium, displayValue: formatCurrency(policy.value.gross_premium, policy.value.currency), type: "text", required: true },
    { key: "commission_rate", label: t("commission_rate"), value: policy.value.commission_rate, displayValue: `${policy.value.commission_rate || 0}%`, type: "text", disabled: true },
  ]);

  const customerFields = computed(() => [
    { label: t("customer"), value: customer.value.full_name || policy.value.customer || "-" },
    { label: t("tax_id"), value: customer.value.tax_id || "-" },
    { label: t("phone"), value: customer.value.phone || "-" },
    { label: t("email"), value: customer.value.email || "-" },
  ]);

  async function updatePolicy(values, onSuccess) {
    if (!unref(name)) return;
    saving.value = true;
    try {
      await updateResource.submit({
        doctype: "AT Policy",
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
    premiumFields,
    customerFields,
    saving,
    customerSaving,
    notification,
    updatePolicy,
    updateCustomer,
  };
}

