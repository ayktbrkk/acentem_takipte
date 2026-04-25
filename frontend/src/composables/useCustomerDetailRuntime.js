import { computed, onMounted, reactive, ref, unref } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";

import { useAuthStore } from "../stores/auth";
import { formatDate as sharedFormatDate, formatMoney as sharedFormatMoney } from "../utils/detailFormatters";
import { useAtDocumentLifecycle } from "./useAtDocumentLifecycle";
import { translateText } from "../utils/i18n";
import { buildQuickCreateIntentQuery } from "../utils/quickRouteIntent";

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

  const updateResource = createResource({
    url: "frappe.client.set_value",
    auto: false,
  });

  const saving = ref(false);
  const showUploadModal = ref(false);
  const notification = reactive({ show: false, message: "", type: "success" });

  function showNotification(message, type = "success") {
    notification.message = message;
    notification.type = type;
    notification.show = true;
    setTimeout(() => {
      notification.show = false;
    }, 4000);
  }
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

  function openCustomerDocuments() {
    if (!customerName.value) return;
    router.push({
      name: "at-documents-list",
      query: {
        reference_doctype: "AT Customer",
        reference_name: customerName.value,
      },
    });
  }

  function formatDate(val) {
    return sharedFormatDate(localeCode.value, val);
  }

  function formatCurrency(val, currency = "TRY") {
    return sharedFormatMoney(localeCode.value, val, currency);
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
    { label: t("total_policies"), value: summary.value.active_policy_count || "0", variant: "default" },
    { label: t("open_claims"), value: summary.value.open_claim_count || "0", variant: summary.value.open_claim_count > 0 ? "warning" : "default" },
    { label: t("overdue_payments"), value: formatCurrency(summary.value.overdue_payment_amount), variant: summary.value.overdue_payment_amount > 0 ? "critical" : "default" },
    { label: t("total_premium"), value: formatCurrency(summary.value.total_premium), variant: "lg" },
  ]);

  const profileFields = computed(() => [
    {
      key: "full_name",
      label: t("full_name"),
      value: customer.value.full_name,
      type: "text",
      required: true,
    },
    {
      key: "tax_id",
      label: t("tax_id"),
      value: customer.value.tax_id,
      type: "tckn",
      required: true,
    },
    {
      key: "phone",
      label: t("phone"),
      value: customer.value.phone,
      type: "phone",
    },
    {
      key: "email",
      label: t("email"),
      value: customer.value.email,
      type: "email",
    },
  ]);

  const moreProfileFields = computed(() => [
    {
      key: "birth_date",
      label: t("birth_date"),
      value: customer.value.birth_date,
      displayValue: formatDate(customer.value.birth_date),
      type: "date",
    },
    {
      key: "gender",
      label: t("gender"),
      value: customer.value.gender,
      displayValue: t(customer.value.gender?.toLowerCase()) || customer.value.gender || "-",
      type: "select",
      options: [
        { label: t("male"), value: "Male" },
        { label: t("female"), value: "Female" },
        { label: t("other"), value: "Other" },
      ],
    },
    {
      key: "marital_status",
      label: t("marital_status"),
      value: customer.value.marital_status,
      displayValue: t(customer.value.marital_status?.toLowerCase()) || customer.value.marital_status || "-",
      type: "select",
      options: [
        { label: t("single"), value: "Single" },
        { label: t("married"), value: "Married" },
        { label: t("divorced"), value: "Divorced" },
        { label: t("widowed"), value: "Widowed" },
      ],
    },
    {
      key: "occupation",
      label: t("occupation"),
      value: customer.value.occupation,
      type: "text",
    },
  ]);

  const operationalFields = computed(() => [
    {
      key: "office_branch",
      label: t("office_branch"),
      value: customer.value.office_branch,
      type: "text", // Should be a link ideally, but for now text
      disabled: true, // Typically branch shouldn't be edited inline easily without a search
    },
    {
      key: "assigned_agent",
      label: t("assigned_agent"),
      value: customer.value.assigned_agent,
      type: "text", // Link would be better
      disabled: true,
    },
    {
      key: "consent_status",
      label: t("consent_status"),
      value: customer.value.consent_status === "Granted",
      displayValue: t(`status_${String(customer.value.consent_status || "Unknown").toLowerCase()}`),
      type: "toggle",
    },
  ]);

  async function updateCustomer(data, onSuccess) {
    if (!customerName.value) return;
    
    saving.value = true;
    try {
      // Map toggle back to Frappe values
      const payload = { ...data };
      if (Object.prototype.hasOwnProperty.call(payload, 'consent_status')) {
        payload.consent_status = payload.consent_status ? "Granted" : "Revoked";
      }

      await updateResource.submit({
        doctype: "AT Customer",
        name: customerName.value,
        fieldname: payload,
      });
      
      // Success
      if (onSuccess) onSuccess();
      showNotification(t("save_success"), "success");
      reload();
    } catch (err) {
      console.error("Failed to update customer:", err);
      showNotification(t("save_failed"), "error");
    } finally {
      saving.value = false;
    }
  }

  function backToList() {
    router.push({ name: "customer-list" });
  }

  function openNewOffer() {
    const currentCustomerName = String(customer.value.name || customerName.value || "").trim();
    const currentCustomerLabel = String(customer.value.full_name || currentCustomerName).trim();
    router.push({
      name: "offer-board",
      query: buildQuickCreateIntentQuery({
        prefills: {
          customer: currentCustomerName,
          customer_label: currentCustomerLabel,
        },
      }),
    });
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
    saving,
    notification,
    updateCustomer,
    showUploadModal,
    openUploadModal,
    closeUploadModal,
    handleUploadComplete,
    canUploadDocuments,
    atDocumentLifecycle,
    openCustomerDocuments,
    archiveDocument,
    restoreDocument,
    permanentDeleteDocument,
    formatFileSize,
    reload,
    backToList,
    openNewOffer,
    openPolicy,
    openOffer,
    openClaim,
    showUploadModal,
  };
}

