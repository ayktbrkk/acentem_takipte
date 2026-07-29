import { computed, reactive, ref, unref, watch, onUnmounted } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { translateText } from "../utils/i18n";
import { POLICY_TRANSLATIONS } from "../config/policy_translations";
import { useAuthStore } from "../stores/auth";
import { useAtDocumentLifecycle } from "./useAtDocumentLifecycle";
import { useAtFormatting } from "./useAtFormatting";
import { useLinkLabelCache } from "./useLinkLabelCache";

function resolvePolicyStatusPresentation(status, t) {
  const s = String(status || "Record").trim();
  if (s === "Record") return { label: t("status_kayit"), variant: "open-pill" };
  if (s === "Pending") return { label: t("status_onay"), variant: "waiting-pill" };
  if (s === "Active") return { label: t("status_active"), variant: "success-pill" };
  if (s === "Cancelled") return { label: t("status_cancelled"), variant: "cancel-pill" };
  if (s === "Archived") return { label: t("status_archived"), variant: "cancel-pill" };
  return { label: s || t("unspecified"), variant: "waiting-pill" };
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

    if (diffDays < 0) return "text-at-red font-bold animate-pulse-subtle";
    if (diffDays <= 30) return "text-at-amber font-bold";
  } catch (e) {
    return "";
  }
  return "";
}

function normalizeStatus(status) {
  const s = String(status || "Record").trim();
  if (s === "Record") return "Record";
  if (s === "Pending") return "Pending";
  if (s === "Active") return "Active";
  if (s === "Cancelled") return "Cancelled";
  if (s === "Archived") return "Archived";
  return s;
}

function normalizeEndorsementStatus(status) {
  const s = String(status || "Draft").toLowerCase();
  if (["applied"].includes(s)) return "active";
  if (["cancelled"].includes(s)) return "cancelled";
  if (["draft"].includes(s)) return "waiting";
  return "waiting";
}

function translateEndorsementType(t, typeValue) {
  const key = `endorsement_type_${String(typeValue || "").toLowerCase().replace(/\s+/g, "_")}`;
  return t(key) !== key ? t(key) : typeValue;
}

function translateEndorsementStatus(t, status) {
  const s = String(status || "").toLowerCase();
  const key = `endorsement_status_${s}`;
  return t(key) !== key ? t(key) : (status || "-");
}

const PRODUCT_LABEL_MAP = {
  "Record Number": "product_record_number", "Kayıt No": "product_record_number",
  "Start Date": "product_start_date", "Başlangıç Tarihi": "product_start_date",
  "End Date": "product_end_date", "Bitiş Tarihi": "product_end_date",
  "Plate No": "product_plate_no", "Plaka No": "product_plate_no",
  "Document Serial No": "product_doc_serial", "Belge Seri-No": "product_doc_serial",
  "Model Year": "product_model_year", "Model Yılı": "product_model_year",
  "Brand Code": "product_brand_code", "Marka Kodu": "product_brand_code",
  "Chassis No": "product_chassis_no", "Şasi No": "product_chassis_no",
  "Engine No": "product_engine_no", "Motor No": "product_engine_no",
  "Address": "product_address", "Adres": "product_address",
  "UAVT Code": "product_uavt_code", "UAVT Kodu": "product_uavt_code",
  "Gross Area (m2)": "product_gross_area", "Brüt Alan (m2)": "product_gross_area",
  "Usage Type": "product_usage_type", "Kullanım Şekli": "product_usage_type",
  "Floor Count": "product_floor_count", "Kat Sayısı": "product_floor_count",
  "Current Floor": "product_current_floor", "Bulunduğu Kat": "product_current_floor",
  "Construction Year": "product_construction_year", "İnşa Yılı": "product_construction_year",
  "Structure Type": "product_structure_type", "Yapı Tarzı": "product_structure_type",
  "Damage Status": "product_damage_status", "Hasar Durumu": "product_damage_status",
  "Insurance Type": "product_insurance_type", "Sigorta Tipi": "product_insurance_type",
  "Coverage Type": "product_coverage_type", "Teminat Tipi": "product_coverage_type",
  "Network Type": "product_network_type", "Network Tipi": "product_network_type",
  "Inpatient Treatment": "product_inpatient", "Yatarak Tedavi": "product_inpatient",
  "Outpatient Treatment": "product_outpatient", "Ayakta Tedavi": "product_outpatient",
  "Maternity Coverage": "product_maternity", "Doğum": "product_maternity",
  "Motor": "product_family_motor",
  "Property": "product_family_property", "Konut": "product_family_property",
  "Health": "product_family_health", "Sağlık": "product_family_health",
  "Travel": "product_family_travel", "Seyahat": "product_family_travel",
  "Life": "product_family_life", "Hayat": "product_family_life",
  "General": "product_family_general", "Genel": "product_family_general",
};

function translateProductLabel(t, enLabel) {
  const key = PRODUCT_LABEL_MAP[enLabel];
  return key ? t(key) : enLabel;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function usePolicyDetailRuntime({ name, activeLocale = ref("tr") }) {
  const router = useRouter();
  const authStore = useAuthStore();
  const { getLinkLabel } = useLinkLabelCache();

  function t(key) {
    const locale = String(unref(activeLocale) || "tr").toLowerCase().startsWith("tr") ? "tr" : "en";
    return POLICY_TRANSLATIONS[locale]?.[key] || POLICY_TRANSLATIONS.en?.[key] || translateText(key, activeLocale);
  }

  const policyResource = createResource({
    url: "acentem_takipte.acentem_takipte.domains.reports.api.dashboard.get_policy_detail_payload",
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
  const renewalTasks = computed(() => data.value.renewal_tasks || []);
  const versionChain = computed(() => data.value.version_chain || []);

  function translateRenewalStage(code) {
    const normalized = String(code || "").trim().toUpperCase();
    const key = `reminder_stage_${normalized.toLowerCase()}`;
    const translated = t(key);
    return translated !== key ? translated : normalized;
  }
  const showUploadModal = ref(false);
  const saving = ref(false);
  const customerSaving = ref(false);
  const notification = reactive({ show: false, message: "", type: "success" });

  const updateResource = createResource({
    url: "frappe.client.set_value",
    auto: false,
  });

  const auditSnapshotResource = createResource({
    url: "acentem_takipte.acentem_takipte.domains.policies.services.quick_create.create_policy_audit_snapshot",
    auto: false,
  });

  const applyEndorsementResource = createResource({
    url: "acentem_takipte.acentem_takipte.doctype.at_policy_endorsement.at_policy_endorsement.apply_endorsement",
    auto: false,
  });

  const deletePolicyResource = createResource({
    url: "frappe.client.delete",
    auto: false,
  });

  const rollbackEndorsementResource = createResource({
    url: "acentem_takipte.acentem_takipte.doctype.at_policy_endorsement.at_policy_endorsement.delete_applied_endorsement",
    auto: false,
  });

  let notifyTimer = null;

  function showNotification(message, type = "success") {
    notification.message = message;
    notification.type = type;
    notification.show = true;
    if (notifyTimer) clearTimeout(notifyTimer);
    notifyTimer = setTimeout(() => {
      notification.show = false;
      notifyTimer = null;
    }, 4000);
  }

  onUnmounted(() => {
    if (notifyTimer) {
      clearTimeout(notifyTimer);
      notifyTimer = null;
    }
  });

  const atDocumentLifecycle = useAtDocumentLifecycle({
    authStore,
    t,
  });

  const loading = computed(() => policyResource.loading);

  const timelineEntries = computed(() => {
    const typeLabels = {
      comment: t("timeline_comment"),
      communication: t("timeline_communication"),
      activity: t("timeline_activity"),
      reminder: t("timeline_reminder"),
      snapshot: t("timeline_snapshot"),
    };
    const items = [];
    const addItems = (source, type, dateKey, extra = {}) => {
      (source || []).forEach((item) => {
        const dateStr = item[dateKey] || item.creation || item.modified;
        if (!dateStr) return;
        items.push({ ...item, _type: type, _typeLabel: typeLabels[type] || type, _date: dateStr, ...extra });
      });
    };
    addItems(data.value.comments || [], "comment", "creation", { _icon: "message-square" });
    addItems(data.value.communications || [], "communication", "communication_date", { _icon: "phone" });
    addItems(data.value.activities || [], "activity", "activity_at", { _icon: "calendar" });
    addItems(data.value.reminders || [], "reminder", "remind_at", { _icon: "bell" });
    addItems(data.value.snapshots || [], "snapshot", "captured_on", { _icon: "camera" });
    items.sort((a, b) => new Date(b._date) - new Date(a._date));
    return items.slice(0, 50);
  });

  const tasksCount = computed(() => (data.value.assignments || []).length);
  const remindersCount = computed(() => (data.value.reminders || []).length);

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

  const { formatCurrency, formatDate, formatPercent } = useAtFormatting(activeLocale);

  function formatDateOrFallback(value) {
    return value ? formatDate(value) : t("unspecified");
  }

  // Resources for searchable selects
  const branchesResource = createResource({
    url: "frappe.client.get_list",
    params: { doctype: "AT Branch", fields: ["name", "branch_name"], limit_page_length: 500, order_by: "branch_name asc" },
    auto: true
  });

  const companiesResource = createResource({
    url: "frappe.client.get_list",
    params: { doctype: "AT Insurance Company", fields: ["name", "company_name"], limit_page_length: 500, order_by: "company_name asc" },
    auto: true
  });

  const salesEntitiesResource = createResource({
    url: "frappe.client.get_list",
    params: { doctype: "AT Sales Entity", fields: ["name", "full_name", "office_branch"], limit_page_length: 1000, order_by: "full_name asc" },
    auto: true
  });

  const branchOptions = computed(() => asArray(branchesResource.data).map(b => ({ label: b.branch_name || b.name, value: b.name })));
  const companyOptions = computed(() => asArray(companiesResource.data).map(c => ({ label: c.company_name || c.name, value: c.name })));
  const salesEntityOptions = computed(() => asArray(salesEntitiesResource.data).map(s => ({ 
    label: `${s.full_name} (${getLinkLabel(s.office_branch) || t("unspecified")})`, 
    value: s.name 
  })));

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
    { label: t("branch"), value: getLinkLabel(policy.value.branch_name) || getLinkLabel(policy.value.branch) || t("unspecified") },
    { label: t("gross_premium"), value: formatCurrency(policy.value.gross_premium, policy.value.currency), variant: "lg" },
    { label: t("end_date"), value: formatDateOrFallback(policy.value.end_date) },
    { label: t("status"), value: policyStatusPresentation.value.label, variant: policyStatusPresentation.value.variant },
  ]);

  const profileFields = computed(() => {
    return [
      { key: "name", label: t("record_no"), value: policy.value.name || unref(name), type: "text", disabled: true, copyable: true, unspecifiedLabel: t("unspecified") },
      { key: "policy_no", label: t("carrier_policy_no"), value: policy.value.policy_no, type: "text", required: true, copyable: true, unspecifiedLabel: t("unspecified") },
      { 
        key: "insurance_company", 
        label: t("insurance_company"), 
        value: policy.value.insurance_company, 
        displayValue: policy.value.insurance_company_name || getLinkLabel(policy.value.insurance_company),
        type: "autocomplete", 
        options: companyOptions.value,
        required: true,
        unspecifiedLabel: t("unspecified") 
      },
      { 
        key: "branch", 
        label: t("branch"), 
        value: policy.value.branch, 
        displayValue: policy.value.branch_name || getLinkLabel(policy.value.branch),
        type: "autocomplete", 
        options: branchOptions.value,
        required: true,
        unspecifiedLabel: t("unspecified") 
      },
      { 
        key: "status", 
        label: t("status"), 
        value: policy.value.status, 
        displayValue: policyStatusPresentation.value.label,
        type: "select", 
        options: [
            { label: t("status_onay"), value: "Pending" },
            { label: t("status_kayit"), value: "Record" },
            { label: t("status_active"), value: "Active" },
            { label: t("status_cancelled"), value: "Cancelled" },
            { label: t("status_archived"), value: "Archived" }
        ],
        required: true
      },
      { key: "issue_date", label: t("issue_date"), value: policy.value.issue_date, displayValue: formatDateOrFallback(policy.value.issue_date), type: "date", required: true, unspecifiedLabel: t("unspecified") },
      { key: "start_date", label: t("start_date"), value: policy.value.start_date, displayValue: formatDateOrFallback(policy.value.start_date), type: "date", required: true, unspecifiedLabel: t("unspecified") },
      { 
        key: "end_date", 
        label: t("end_date"), 
        value: policy.value.end_date, 
        displayValue: formatDateOrFallback(policy.value.end_date), 
        type: "date", 
        required: true, 
        unspecifiedLabel: t("unspecified"),
        valueClass: getDateClass(policy.value.end_date)
      },
      { 
        key: "sales_entity", 
        label: t("sales_entity"), 
        value: policy.value.sales_entity, 
        displayValue: policy.value.sales_entity_full_name ? `${policy.value.sales_entity_full_name} (${policy.value.sales_entity_office || t("unspecified")})` : (policy.value.sales_entity || t("unspecified")),
        type: "autocomplete", 
        options: salesEntityOptions.value,
        unspecifiedLabel: t("unspecified") 
      },
    ];
  });

  const riskFields = computed(() => {
    const branch = String(policy.value.branch_name || getLinkLabel(policy.value.branch) || "").toLowerCase();
    const fields = [];

    if (branch.includes("kasko") || branch.includes("trafik")) {
      fields.push(
        { key: "plate", label: t("plate"), value: policy.value.plate, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "document_serial_no", label: t("document_serial_no"), value: policy.value.document_serial_no, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "model_year", label: t("model_year"), value: policy.value.model_year, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "brand_code", label: t("brand_code"), value: policy.value.brand_code, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "chassis_no", label: t("chassis_no"), value: policy.value.chassis_no, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "motor_no", label: t("motor_no"), value: policy.value.motor_no, type: "text", unspecifiedLabel: t("unspecified") }
      );
    } else if (branch.includes("konut") || branch.includes("dask")) {
      fields.push(
        { key: "address", label: t("address"), value: policy.value.address, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "uavt_code", label: t("uavt_code"), value: policy.value.uavt_code, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "gross_area_m2", label: t("gross_area_m2"), value: policy.value.gross_area_m2, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "usage_type", label: t("usage_type"), value: policy.value.usage_type, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "floor_count", label: t("floor_count"), value: policy.value.floor_count, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "current_floor", label: t("current_floor"), value: policy.value.current_floor, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "construction_year", label: t("construction_year"), value: policy.value.construction_year, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "structure_type", label: t("structure_type"), value: policy.value.structure_type, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "damage_status", label: t("damage_status"), value: policy.value.damage_status, type: "text", unspecifiedLabel: t("unspecified") }
      );
    } else if (branch.includes("sağlık") || branch.includes("saglik") || branch.includes("health")) {
      fields.push(
        { key: "insurance_type", label: t("insurance_type"), value: policy.value.insurance_type, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "coverage_type", label: t("coverage_type"), value: policy.value.coverage_type, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "network_type", label: t("network_type"), value: policy.value.network_type, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "inpatient_treatment", label: t("inpatient_treatment"), value: policy.value.inpatient_treatment, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "outpatient_treatment", label: t("outpatient_treatment"), value: policy.value.outpatient_treatment, type: "text", unspecifiedLabel: t("unspecified") },
        { key: "maternity_coverage", label: t("maternity_coverage"), value: policy.value.maternity_coverage, type: "text", unspecifiedLabel: t("unspecified") }
      );
    }

    return fields;
  });

  const premiumFields = computed(() => [
    { key: "net_premium", label: t("net_premium"), value: policy.value.net_premium, displayValue: formatCurrency(policy.value.net_premium, policy.value.currency), type: "number", step: "0.01" },
    { key: "tax_amount", label: t("tax_amount"), value: policy.value.tax_amount, displayValue: formatCurrency(policy.value.tax_amount, policy.value.currency), type: "number", step: "0.01" },
    { key: "commission_amount", label: t("commission_amount"), value: policy.value.commission_amount, displayValue: formatCurrency(policy.value.commission_amount, policy.value.currency), type: "number", step: "0.01" },
    { key: "gross_premium", label: t("gross_premium"), value: policy.value.gross_premium, displayValue: formatCurrency(policy.value.gross_premium, policy.value.currency), type: "number", step: "0.01", required: true },
    { key: "commission_rate", label: t("commission_rate"), value: policy.value.commission_rate, displayValue: policy.value.commission_rate != null ? formatPercent(policy.value.commission_rate) : t("unspecified"), type: "number", step: "0.01", disabled: true },
  ]);

  function validatePolicyUpdate(values) {
    const errors = [];
    const p = unref(policy);
    const merged = { ...p, ...values };

    const issue = merged.issue_date ? new Date(merged.issue_date) : null;
    const start = merged.start_date ? new Date(merged.start_date) : null;
    const end = merged.end_date ? new Date(merged.end_date) : null;

    if (issue && start && issue > start) {
      errors.push(t("validation_issue_after_start"));
    }
    if (start && end && start > end) {
      errors.push(t("validation_start_after_end"));
    }

    const net = Number(values.net_premium ?? p.net_premium ?? 0);
    const tax = Number(values.tax_amount ?? p.tax_amount ?? 0);
    const comm = Number(values.commission_amount ?? p.commission_amount ?? 0);
    const gross = Number(values.gross_premium ?? p.gross_premium ?? 0);

    if (gross > 0) {
      const expected = Math.round((net + tax + comm) * 100) / 100;
      const actual = Math.round(gross * 100) / 100;
      if (Math.abs(actual - expected) > 0.01) {
        errors.push(t("validation_gross_mismatch"));
      }
    }

    return errors;
  }

  async function updatePolicy(values, onSuccess) {
    if (!unref(name)) return;

    const validationErrors = validatePolicyUpdate(values);
    if (validationErrors.length) {
      showNotification(validationErrors[0], "error");
      return;
    }

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
      auditSnapshotResource.submit({ policy_name: unref(name) }).catch(() => {});
    } catch (err) {
      console.error(err);
      showNotification(t("save_failed"), "error");
      throw err;
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

  async function applyEndorsement(endorsementName) {
    try {
      await applyEndorsementResource.submit({ endorsement_name: endorsementName });
      showNotification(t("endorsement_applied"));
      await reload();
    } catch (err) {
      console.error(err);
      showNotification(t("endorsement_apply_failed"), "error");
    }
  }

  async function deletePolicy() {
    const policyName = unref(name);
    if (!policyName) return;
    try {
      await deletePolicyResource.submit({
        doctype: "AT Policy",
        name: policyName,
      });
      showNotification(t("policy_permanently_deleted"));
      backToList();
    } catch (err) {
      console.error(err);
      showNotification(t("save_failed"), "error");
    }
  }

  async function deleteEndorsement(endorsementName) {
    try {
      await deletePolicyResource.submit({
        doctype: "AT Policy Endorsement",
        name: endorsementName,
      });
      showNotification(t("endorsement_deleted"));
      await reload();
    } catch (err) {
      console.error(err);
      showNotification(t("endorsement_apply_failed"), "error");
    }
  }

  async function deleteAppliedEndorsement(endorsementName) {
    try {
      await rollbackEndorsementResource.submit({
        endorsement_name: endorsementName,
      });
      showNotification(t("endorsement_deleted"));
      await reload();
    } catch (err) {
      console.error(err);
      showNotification(t("endorsement_apply_failed"), "error");
    }
  }

  // Watch for name change
  watch(() => unref(name), (newVal) => {
    if (newVal) reload();
  }, { immediate: true });

  const commissionDistribution = computed(() => {
    const raw = policy.value?.commission_distribution;
    if (!raw || raw === "[]") return [];
    try {
      return typeof raw === "string" ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    } catch {
      return [];
    }
  });

  return {
    policy,
    customer,
    endorsements,
    payments,
    documents,
    atDocuments,
    productProfile,
    renewalTasks,
    translateRenewalStage,
    versionChain,
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
    heroCells,
    profileFields,
    riskFields,
    premiumFields,
    saving,
    customerSaving,
    notification,
    timelineEntries,
    tasksCount,
    remindersCount,
    updatePolicy,
    updateCustomer,
    normalizeStatus,
    normalizeEndorsementStatus,
    translateEndorsementType,
    translateEndorsementStatus,
    translateProductLabel,
    showNotification,
    applyEndorsement,
    deleteEndorsement,
    deleteAppliedEndorsement,
    deletePolicy,
    commissionDistribution,
  };
}

