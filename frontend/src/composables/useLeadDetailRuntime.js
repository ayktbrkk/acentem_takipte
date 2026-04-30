import { computed, reactive, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "../utils/i18n";
import { useAuthStore } from "../stores/auth";

// --- Exported helper functions ---

export function leadAgeDays(dateStr) {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function leadStaleState(lead) {
  const days = leadAgeDays(lead?.modified || lead?.creation);
  if (days < 7) return "Fresh";
  if (days < 14) return "FollowUp";
  if (days < 30) return "Aging";
  return "Stale";
}

export function leadStaleLabel(state, locale = "tr") {
  const labels = {
    tr: { Fresh: "Güncel", FollowUp: "Takip Et", Aging: "Eskiyor", Stale: "Eski" },
    en: { Fresh: "Fresh", FollowUp: "Follow Up", Aging: "Aging", Stale: "Stale" },
  };
  return (labels[locale] || labels.en)[state] || state;
}

export function canConvertLead(lead) {
  if (!lead) return false;
  if (lead.status !== "Open") return false;
  return !!(
    lead.customer &&
    lead.sales_entity &&
    lead.insurance_company &&
    lead.branch &&
    Number(lead.estimated_gross_premium) > 0
  );
}

export function leadConversionState(lead) {
  if (!lead) return "None";
  if (lead.converted_policy) return "Policy";
  if (lead.converted_offer) return "Offer";
  if (lead.status === "Closed") return "Closed";
  return "None";
}

export function leadConversionMissingFields(lead) {
  const required = ["customer", "sales_entity", "insurance_company", "branch", "estimated_gross_premium"];
  return required.filter((f) => !lead[f]);
}

export function mapLeadStatusTone(status) {
  const map = {
    Open: "waiting",
    Converted: "active",
    Closed: "default",
    Lost: "warning",
  };
  return map[status] || "default";
}

export function mapLeadStaleTone(state) {
  const map = { Fresh: "active", FollowUp: "waiting", Aging: "warning", Stale: "waiting" };
  return map[state] || "default";
}

export function parseLeadActionError(err) {
  if (!err) return "";
  if (err.response?.message) {
    return err.response.message.replace(/<[^>]+>/g, "").trim();
  }
  return err.message || String(err);
}

// --- Composable ---

export function useLeadDetailRuntime({ name, activeLocale = ref("tr") }) {
  const router = useRouter();
  const authStore = useAuthStore();

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
  const documents = computed(() => data.value.documents || data.value.files || []);
  const offers = computed(() => data.value.offers || []);
  const policies = computed(() => data.value.policies || []);
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

  // Document actions
  const showUploadModal = ref(false);

  const canUploadDocuments = computed(() => {
    return authStore.can("AT Lead", "write");
  });

  function openLeadDocuments() {
    const leadName = unref(name);
    if (!leadName) return;
    router.push({ name: "at-documents-list", query: { reference_doctype: "AT Lead", reference_name: leadName } });
  }

  function openUploadModal() {
    showUploadModal.value = true;
  }

  function closeUploadModal() {
    showUploadModal.value = false;
  }

  async function handleUploadComplete() {
    closeUploadModal();
    await reload();
  }

  function formatDate(val) {
    if (!val) return t("unspecified");
    return new Intl.DateTimeFormat(unref(activeLocale) === "tr" ? "tr-TR" : "en-US").format(new Date(val));
  }

  function formatCurrency(val, currency = "TRY") {
    return new Intl.NumberFormat(unref(activeLocale) === "tr" ? "tr-TR" : "en-US", {
      style: "currency",
      currency: currency || "TRY",
    }).format(Number(val || 0));
  }

  const heroCells = computed(() => [
    { label: t("industry"), value: lead.value.industry || t("unspecified") },
    { label: t("lead_date"), value: formatDate(lead.value.creation) },
    { label: t("status"), value: t(`status_${String(lead.value.status || "Draft").toLowerCase()}`), variant: "accent" },
  ]);

  const profileFields = computed(() => [
    { key: "full_name", label: t("full_name"), value: leadFullName.value, type: "text", required: true, unspecifiedLabel: t("unspecified") },
    { key: "phone", label: t("phone"), value: lead.value.phone, type: "text", copyable: true, unspecifiedLabel: t("unspecified") },
    { key: "email", label: t("email"), value: lead.value.email, type: "text", copyable: true, unspecifiedLabel: t("unspecified") },
    { key: "tax_id", label: t("tax_id"), value: lead.value.tax_id, type: "text", copyable: true, unspecifiedLabel: t("unspecified") },
    { key: "industry", label: t("industry"), value: lead.value.industry, displayValue: lead.value.industry || t("unspecified"), type: "text", unspecifiedLabel: t("unspecified") },
    { key: "lead_type", label: t("lead_type"), value: lead.value.lead_type, displayValue: lead.value.lead_type || t("unspecified"), type: "text", unspecifiedLabel: t("unspecified") },
  ]);

  const estimationFields = computed(() => [
    { key: "branch", label: t("branch"), value: lead.value.branch, type: "text", disabled: true, unspecifiedLabel: t("unspecified") },
    { key: "estimated_gross_premium", label: t("estimated_gross_premium"), value: lead.value.estimated_gross_premium, displayValue: formatCurrency(lead.value.estimated_gross_premium, lead.value.currency), type: "text", unspecifiedLabel: t("unspecified") },
    { key: "probability", label: t("probability"), value: lead.value.probability, displayValue: `${lead.value.probability || 0}%`, type: "text", unspecifiedLabel: t("unspecified"), valueClass: "text-brand-600 font-bold" },
    { key: "expected_closing", label: t("expected_closing"), value: lead.value.expected_closing, displayValue: formatDate(lead.value.expected_closing), type: "date", unspecifiedLabel: t("unspecified") },
    { key: "next_step", label: t("next_step"), value: lead.value.next_step, displayValue: lead.value.next_step || t("unspecified"), type: "text", unspecifiedLabel: t("unspecified") },
  ]);

  const customerFields = computed(() => [
    { label: t("customer"), value: customer.value.full_name || lead.value.customer || t("unspecified") },
    { label: t("tax_id"), value: customer.value.tax_id || t("unspecified") },
    { label: t("phone"), value: customer.value.phone || t("unspecified") },
    { label: t("email"), value: customer.value.email || t("unspecified") },
  ]);

  async function updateLead(values, onSuccess) {
    if (!unref(name)) return;
    saving.value = true;
    try {
      await updateResource.submit({
        doctype: "AT Lead",
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
    estimationFields,
    customerFields,
    saving,
    customerSaving,
    notification,
    updateLead,
    updateCustomer,
    showUploadModal,
    canUploadDocuments,
    openLeadDocuments,
    openUploadModal,
    closeUploadModal,
    handleUploadComplete,
  };
}

