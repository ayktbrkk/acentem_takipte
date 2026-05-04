import { computed, onMounted, reactive, ref, unref } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";

import { useAuthStore } from "../stores/auth";
import { formatDate as sharedFormatDate, formatMoney as sharedFormatMoney } from "../utils/detailFormatters";
import { useAtDocumentLifecycle } from "./useAtDocumentLifecycle";
import { translateText } from "../utils/i18n";
import { CUSTOMER_TRANSLATIONS } from "../config/customer_translations";
import { buildQuickCreateIntentQuery } from "../utils/quickRouteIntent";

export function useCustomerDetailRuntime({ name, activeLocale }) {
  const router = useRouter();
  const authStore = useAuthStore();
  const UNKNOWN_VALUE_SET = new Set(["", "unknown", "none", "null", "undefined"]);
  const ASSIGNED_AGENT_ROLE_SET = new Set(["Agent", "System Manager"]);
  const customerName = computed(() => String(unref(name) || "").trim());
  const localeValue = computed(() => String(unref(activeLocale) || "en").trim() || "en");
  const localeCode = computed(() => (localeValue.value.startsWith("tr") ? "tr-TR" : "en-US"));

  function t(key) {
    const locale = localeValue.value.startsWith("tr") ? "tr" : "en";
    return CUSTOMER_TRANSLATIONS[locale]?.[key] || CUSTOMER_TRANSLATIONS.en?.[key] || translateText(key, activeLocale);
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

  const assignedAgentsResource = createResource({
    url: "frappe.client.get_list",
    params: {
      doctype: "User",
      fields: ["name", "full_name", "enabled", "user_type"],
      filters: { enabled: 1 },
      limit_page_length: 500,
      order_by: "full_name asc",
    },
    auto: true,
  });

  const assignedAgentRolesResource = createResource({
    url: "frappe.client.get_list",
    params: {
      doctype: "Has Role",
      fields: ["parent", "role", "parenttype"],
      filters: {
        parenttype: "User",
        role: ["in", Array.from(ASSIGNED_AGENT_ROLE_SET)],
      },
      limit_page_length: 1000,
      order_by: "parent asc",
    },
    auto: true,
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

  function normalizeValue(value) {
    const normalized = String(value ?? "").trim();
    return UNKNOWN_VALUE_SET.has(normalized.toLowerCase()) ? "" : normalized;
  }

  function formatTextOrFallback(value) {
    return normalizeValue(value) || t("unspecified");
  }

  function formatDateOrFallback(val) {
    return normalizeValue(val) ? formatDate(val) : t("unspecified");
  }

  function normalizeGender(value) {
    const normalized = normalizeValue(value);
    if (normalized === "Male") return t("genderMale");
    if (normalized === "Female") return t("genderFemale");
    if (normalized === "Other") return t("genderOther");
    return t("unspecified");
  }

  function normalizeMaritalStatus(value) {
    const normalized = normalizeValue(value);
    if (normalized === "Single") return t("maritalSingle");
    if (normalized === "Married") return t("maritalMarried");
    if (normalized === "Divorced") return t("maritalDivorced");
    if (normalized === "Widowed") return t("maritalWidowed");
    return t("unspecified");
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function assignedAgentOptionLabel(row) {
    const userId = String(row?.name || "").trim();
    const fullName = String(row?.full_name || "").trim();
    if (!userId) return "";
    return fullName && fullName !== userId ? `${fullName} (${userId})` : userId;
  }

  const assignedAgentOptions = computed(() => {
    const allowedAssignedAgents = new Set(
      asArray(unref(assignedAgentRolesResource.data))
        .map((row) => String(row?.parent || "").trim())
        .filter(Boolean)
    );

    const options = asArray(unref(assignedAgentsResource.data))
      .filter((row) => {
        const userId = String(row?.name || "").trim();
        if (!userId || userId === "Guest") return false;
        const userType = String(row?.user_type || "System User").trim();
        return (!userType || userType === "System User") && allowedAssignedAgents.has(userId);
      })
      .map((row) => ({
        value: String(row.name || "").trim(),
        label: assignedAgentOptionLabel(row),
      }));

    const currentValue = normalizeValue(customer.value.assigned_agent);
    if (currentValue && !options.some((option) => option.value === currentValue)) {
      options.unshift({ value: currentValue, label: currentValue });
    }

    return options;
  });

  const assignedAgentLabelMap = computed(() => {
    const map = new Map();
    for (const option of assignedAgentOptions.value) {
      const key = String(option?.value || "").trim();
      if (!key) continue;
      map.set(key, String(option?.label || key));
    }
    return map;
  });

  const assignedAgentDisplay = computed(() => {
    const currentValue = normalizeValue(customer.value.assigned_agent);
    if (!currentValue) return t("unspecified");
    return assignedAgentLabelMap.value.get(currentValue) || currentValue;
  });

  function formatFileSize(bytes) {
    if (!bytes || Number(bytes) <= 0) return t("unspecified");
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
      displayValue: formatDateOrFallback(customer.value.birth_date),
      type: "date",
      unspecifiedLabel: t("unspecified"),
    },
    {
      key: "gender",
      label: t("gender"),
      value: customer.value.gender,
      displayValue: normalizeGender(customer.value.gender),
      type: "select",
      options: [
        { label: t("genderMale"), value: "Male" },
        { label: t("genderFemale"), value: "Female" },
        { label: t("genderOther"), value: "Other" },
      ],
      unspecifiedLabel: t("unspecified"),
    },
    {
      key: "marital_status",
      label: t("marital_status"),
      value: customer.value.marital_status,
      displayValue: normalizeMaritalStatus(customer.value.marital_status),
      type: "select",
      options: [
        { label: t("maritalSingle"), value: "Single" },
        { label: t("maritalMarried"), value: "Married" },
        { label: t("maritalDivorced"), value: "Divorced" },
        { label: t("maritalWidowed"), value: "Widowed" },
      ],
      unspecifiedLabel: t("unspecified"),
    },
    {
      key: "occupation",
      label: t("occupation"),
      value: customer.value.occupation,
      displayValue: formatTextOrFallback(customer.value.occupation),
      type: "text",
      unspecifiedLabel: t("unspecified"),
    },
  ]);

  const operationalFields = computed(() => [
    {
      key: "office_branch",
      label: t("office_branch"),
      value: customer.value.office_branch,
      displayValue: formatTextOrFallback(customer.value.office_branch),
      type: "text", // Should be a link ideally, but for now text
      disabled: true, // Typically branch shouldn't be edited inline easily without a search
      unspecifiedLabel: t("unspecified"),
    },
    {
      key: "assigned_agent",
      label: t("assigned_agent"),
      value: customer.value.assigned_agent,
      displayValue: assignedAgentDisplay.value,
      type: "autocomplete",
      options: assignedAgentOptions.value,
      unspecifiedLabel: t("unspecified"),
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
  };
}

