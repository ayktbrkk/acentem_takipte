import { computed, onMounted, unref } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";

import { formatDate as sharedFormatDate, formatMoney as sharedFormatMoney } from "../utils/detailFormatters";

export function useClaimDetailRuntime({ name }) {
  const router = useRouter();
  const claimName = computed(() => String(unref(name) || "").trim());
  const localeCode = "tr-TR";

  const copy = {
    tr: {
      breadcrumb: "Operasyonlar / Hasarlar",
      back: "Listeye Dön",
      action: "Islem Yap",
      process: "Hasar Süreci",
      details: "Hasar Detayları",
      documents: "Belgeler",
      openDocuments: "Belgeleri Aç",
      timeline: "Zaman Tuneli",
      noDocuments: "Belge eklenmemiş.",
      updated: "Güncellendi",
      created: "Oluşturuldu",
      policy: "İlgili Poliçe",
      customer: "Müşteri",
      customerRecord: "Müşteri Kaydı",
      summary: "Hasar Özeti",
      approved: "Onaylanan",
      paid: "Ödenen",
      remaining: "Kalan",
      days: "Kalan Gün",
    },
    en: {
      breadcrumb: "Operations / Claims",
      back: "Back to list",
      action: "Take Action",
      process: "Claim Process",
      details: "Claim Details",
      documents: "Documents",
      openDocuments: "Open Documents",
      timeline: "Timeline",
      noDocuments: "No documents.",
      updated: "Updated",
      created: "Created",
      policy: "Related Policy",
      customer: "Customer",
      customerRecord: "Customer Record",
      summary: "Claim Summary",
      approved: "Approved",
      paid: "Paid",
      remaining: "Remaining",
      days: "Days Left",
    },
  };

  function t(key) {
    return copy.tr[key] || copy.en[key] || key;
  }

  const claimResource = createResource({ url: "frappe.client.get", auto: false });
  const claimFileResource = createResource({ url: "frappe.client.get_list", auto: false });
  const claimPaymentsResource = createResource({ url: "frappe.client.get_list", auto: false });

  const claim = computed(() => unref(claimResource.data) || {});
  const documents = computed(() => (Array.isArray(unref(claimFileResource.data)) ? unref(claimFileResource.data) : []));
  const payments = computed(() => (Array.isArray(unref(claimPaymentsResource.data)) ? unref(claimPaymentsResource.data) : []));
  const claimStatus = computed(() => String(claim.value.claim_status || "Draft"));

  const remainingDays = computed(() => {
    const due = String(claim.value.next_follow_up_on || "").trim();
    if (!due) return null;
    const ms = new Date(due).getTime() - Date.now();
    return Math.ceil(ms / 86400000);
  });
  const remainingDaysDisplay = computed(() => (remainingDays.value == null || Number.isNaN(remainingDays.value) ? "-" : String(remainingDays.value)));
  const remainingAmount = computed(() => Number(claim.value.approved_amount || 0) - Number(claim.value.paid_amount || 0));

  const heroCells = computed(() => [
    { label: "Dosya No", value: claim.value.claim_no || claim.value.name || "-", variant: "default" },
    { label: "Hasar Tarihi", value: formatDate(claim.value.incident_date || claim.value.creation), variant: "default" },
    { label: "Rezerv", value: formatCurrency(claim.value.estimated_amount || 0), variant: "lg" },
    { label: "Ödenen", value: formatCurrency(claim.value.paid_amount), variant: "accent" },
  ]);

  const processFields = computed(() => [
    { label: "Hasar No", value: claim.value.claim_no || claim.value.name || "-", variant: "mono" },
    { label: "Hasar Tarihi", value: formatDate(claim.value.incident_date || claim.value.creation) },
    { label: "Bildirim", value: formatDate(claim.value.reported_date || claim.value.creation) },
    { label: "Tutar", value: formatCurrency(claim.value.estimated_amount || 0), variant: "lg" },
  ]);

  const detailFields = computed(() => [
    { label: "Hasar Türü", value: claim.value.claim_type || "-" },
    { label: "Ofis Şubesi", value: claim.value.office_branch || "-" },
    { label: "Açıklama", value: claim.value.notes || claim.value.rejection_reason || "-", span: 2 },
  ]);

  const claimSteps = computed(() => {
    const status = String(claim.value.claim_status || "").toLowerCase();
    const currentStepIs = (step) => {
      if (step === "expertise") return ["under review", "expertise", "inspection"].includes(status);
      if (step === "approval") return ["approved", "onay", "approval"].includes(status);
      if (step === "payment") return ["paid", "payment", "closed"].includes(status);
      return false;
    };

    const expertiseCurrent = currentStepIs("expertise");
    const approvalCurrent = currentStepIs("approval");
    const paymentCurrent = currentStepIs("payment");

    return [
      { label: "Bildirim", state: "done" },
      { label: "Ekspertiz", state: expertiseCurrent ? "current" : "done" },
      { label: "Onay", state: approvalCurrent ? "current" : paymentCurrent ? "done" : "pending" },
      { label: "Ödeme", state: paymentCurrent ? "current" : "pending" },
    ];
  });

  const peopleFields = computed(() => [
    { label: "Müşteri", value: claim.value.customer || "-" },
    { label: "Eksper", value: claim.value.assigned_expert || claim.value.surveyor || claim.value.expert || "-" },
  ]);

  const reserveFields = computed(() => [
    { label: "Durum", value: claim.value.claim_status || "-" },
    { label: "Tahmini Rezerv", value: formatCurrency(claim.value.estimated_amount || 0) },
    { label: "Onaylanan", value: formatCurrency(claim.value.approved_amount) },
    { label: "Kalan Gün", value: remainingDaysDisplay.value },
  ]);

  const paymentFields = computed(() => [
    { label: "Ödenen", value: formatCurrency(claim.value.paid_amount) },
    { label: "Kalan", value: formatCurrency(remainingAmount.value) },
    { label: "Sonraki Takip", value: formatDate(claim.value.next_follow_up_on) },
    { label: "İtiraz", value: claim.value.appeal_status || "-" },
  ]);

  const expertiseFields = computed(() => [
    { label: "Eksper", value: claim.value.assigned_expert || "-" },
    { label: "İnceleme", value: claim.value.claim_status || "-" },
    { label: "Notlar", value: claim.value.notes || "-", span: 2 },
  ]);

  const recordMetaFields = computed(() => [
    { label: "Oluşturan", value: claim.value.owner || "-" },
    { label: "Oluşturulma", value: formatDate(claim.value.creation) },
    { label: "Güncelleyen", value: claim.value.modified_by || "-" },
    { label: "Güncelleme", value: formatDate(claim.value.modified) },
  ]);

  function formatDate(value) {
    return sharedFormatDate(localeCode, value);
  }

  function formatCurrency(value) {
    return sharedFormatMoney(localeCode, value, "TRY");
  }

  function openPolicy() {
    if (!claim.value.policy) return;
    router.push(`/policies/${claim.value.policy}`);
  }

  function openCustomer() {
    if (!claim.value.customer) return;
    router.push(`/customers/${claim.value.customer}`);
  }

  function backToList() {
    router.push("/claims");
  }

  function openClaimDocuments() {
    if (!claim.value.name && !claimName.value) return;
    const query = new URLSearchParams({
      attached_to_doctype: "AT Claim",
      attached_to_name: claim.value.name || claimName.value,
    });
    window.location.assign(`/at/files?${query.toString()}`);
  }

  function reload() {
    claimResource.params = { doctype: "AT Claim", name: claimName.value };
    claimResource.reload();

    claimFileResource.params = {
      doctype: "File",
      fields: ["name", "file_name", "creation"],
      filters: { attached_to_doctype: "AT Claim", attached_to_name: claimName.value },
      order_by: "creation desc",
      limit_page_length: 20,
    };
    claimFileResource.reload();

    claimPaymentsResource.params = {
      doctype: "AT Payment",
      fields: ["name", "payment_no", "payment_date", "amount", "amount_try", "status", "creation"],
      filters: { claim: claimName.value },
      order_by: "creation desc",
      limit_page_length: 20,
    };
    claimPaymentsResource.reload();
  }

  onMounted(reload);

  return {
    t,
    name: claimName,
    claim,
    documents,
    payments,
    claimStatus,
    heroCells,
    processFields,
    detailFields,
    claimSteps,
    peopleFields,
    reserveFields,
    paymentFields,
    expertiseFields,
    recordMetaFields,
    formatDate,
    formatCurrency,
    backToList,
    openPolicy,
    openCustomer,
    openClaimDocuments,
    reload,
  };
}
