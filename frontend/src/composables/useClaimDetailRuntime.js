import { computed, onMounted, ref, unref } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";

import { useAuthStore } from "../stores/auth";
import { formatDate as sharedFormatDate, formatMoney as sharedFormatMoney } from "../utils/detailFormatters";
import { useAtDocumentLifecycle } from "./useAtDocumentLifecycle";

export function useClaimDetailRuntime({ name, activeLocale }) {
  const router = useRouter();
  const authStore = useAuthStore();
  const claimName = computed(() => String(unref(name) || "").trim());
  const localeValue = computed(() => String(unref(activeLocale) || "en").trim() || "en");
  const localeCode = computed(() => (localeValue.value.startsWith("tr") ? "tr-TR" : "en-US"));

  const labels = {
    breadcrumb: "Operations / Claims",
    back: "Back to List",
    action: "Take Action",
    process: "Claim Process",
    details: "Claim Details",
    documents: "Documents",
    openDocuments: "Open Documents",
    uploadDocument: "Upload Document",
    openDocument: "Open Document",
    archiveDocument: "Archive",
    restoreDocument: "Restore",
    permanentDeleteDocument: "Delete Permanently",
    archiveConfirm: "Archive this document?",
    restoreConfirm: "Restore this document?",
    permanentDeleteConfirm: "This document and its linked file will be permanently deleted. Continue?",
    emptyDocuments: "No documents uploaded yet.",
    sensitiveData: "Sensitive Data",
    verified: "Verified",
    open: "Open",
    timeline: "Timeline",
    noDocuments: "No documents.",
    updated: "Updated",
    created: "Created",
    policy: "Related Policy",
    customer: "Customer",
    customerRecord: "Customer Record",
    paymentHistory: "Payment History",
    expertReports: "Expert Reports",
    relatedPeople: "Related People",
    reserveInformation: "Reserve Information",
    paymentInformation: "Payment Information",
    recordMetadata: "Record Metadata",
    noPayments: "No payment records found.",
    notes: "Notes",
    fileNo: "File No",
    claimDate: "Claim Date",
    reserve: "Reserve",
    paid: "Paid",
    claimNo: "Claim No",
    notification: "Notification",
    amount: "Amount",
    claimType: "Claim Type",
    officeBranch: "Office Branch",
    description: "Description",
    expertise: "Expertise",
    review: "Review",
    approvalStep: "Approval",
    paymentStep: "Payment",
    status: "Status",
    estimatedReserve: "Estimated Reserve",
    approved: "Approved",
    daysLeft: "Days Left",
    remaining: "Remaining",
    nextFollowUp: "Next Follow-up",
    appeal: "Appeal",
    createdBy: "Created By",
    createdAt: "Created At",
    updatedBy: "Updated By",
    updatedAt: "Updated At",
    expert: "Expert",
    supportCustomer: "Customer",
  };

  const copy = {
    tr: {
      "Operations / Claims": "Operasyonlar / Hasarlar",
      "Back to List": "Listeye Dön",
      "Take Action": "İşlem Yap",
      "Claim Process": "Hasar Süreci",
      "Claim Details": "Hasar Detayları",
      "Documents": "Dokümanlar",
      "Open Documents": "Doküman Merkezine Git",
      "Upload Document": "Doküman Yükle",
      "Open Document": "Dokümanı Aç",
      "Archive": "Arşivle",
      "Restore": "Geri Yükle",
      "Delete Permanently": "Kalıcı Sil",
      "Archive this document?": "Bu doküman arşivlensin mi?",
      "Restore this document?": "Bu doküman geri yüklensin mi?",
      "This document and its linked file will be permanently deleted. Continue?": "Bu doküman ve bağlı dosyası kalıcı olarak silinecek. Devam edilsin mi?",
      "No documents uploaded yet.": "Henüz doküman yüklenmedi.",
      "Sensitive Data": "Hassas Veri",
      "Verified": "Doğrulandı",
      "Open": "Aç",
      "Timeline": "Zaman Tüneli",
      "No documents.": "Henüz doküman yüklenmedi.",
      "Updated": "Güncellendi",
      "Created": "Oluşturuldu",
      "Related Policy": "İlgili Poliçe",
      "Customer": "Müşteri",
      "Customer Record": "Müşteri Kaydı",
      "Payment History": "Ödeme Geçmişi",
      "Expert Reports": "Ekspertiz Raporları",
      "Related People": "İlgili Kişiler",
      "Reserve Information": "Rezerv Bilgileri",
      "Payment Information": "Ödeme Bilgileri",
      "Record Metadata": "Kayıt Meta",
      "No payment records found.": "Ödeme kaydı bulunamadı.",
      "Notes": "Notlar",
      "File No": "Dosya No",
      "Claim Date": "Hasar Tarihi",
      "Reserve": "Rezerv",
      "Paid": "Ödenen",
      "Claim No": "Hasar No",
      "Notification": "Bildirim",
      "Amount": "Tutar",
      "Claim Type": "Hasar Türü",
      "Office Branch": "Ofis Şubesi",
      "Description": "Açıklama",
      "Expertise": "Ekspertiz",
      "Review": "İnceleme",
      "Approval": "Onay",
      "Payment": "Ödeme",
      "Status": "Durum",
      "Estimated Reserve": "Tahmini Rezerv",
      "Approved": "Onaylanan",
      "Days Left": "Kalan Gün",
      "Remaining": "Kalan",
      "Next Follow-up": "Sonraki Takip",
      "Appeal": "İtiraz",
      "Created By": "Oluşturan",
      "Created At": "Oluşturulma",
      "Updated By": "Güncelleyen",
      "Updated At": "Güncelleme",
      "Expert": "Eksper",
    },
    en: {
      "Operations / Claims": "Operations / Claims",
      "Back to List": "Back to List",
      "Take Action": "Take Action",
      "Claim Process": "Claim Process",
      "Claim Details": "Claim Details",
      "Documents": "Documents",
      "Open Documents": "Go to Document Center",
      "Upload Document": "Upload Document",
      "Open Document": "Open Document",
      "No documents uploaded yet.": "No documents uploaded yet.",
      "Sensitive Data": "Sensitive Data",
      "Verified": "Verified",
      "Open": "Open",
      "Timeline": "Timeline",
      "No documents.": "No documents uploaded yet.",
      "Updated": "Updated",
      "Created": "Created",
      "Related Policy": "Related Policy",
      "Customer": "Customer",
      "Customer Record": "Customer Record",
      "Payment History": "Payment History",
      "Expert Reports": "Expert Reports",
      "Related People": "Related People",
      "Reserve Information": "Reserve Information",
      "Payment Information": "Payment Information",
      "Record Metadata": "Record Metadata",
      "No payment records found.": "No payment records found.",
      "Notes": "Notes",
      "File No": "File No",
      "Claim Date": "Claim Date",
      "Reserve": "Reserve",
      "Paid": "Paid",
      "Claim No": "Claim No",
      "Notification": "Notification",
      "Amount": "Amount",
      "Claim Type": "Claim Type",
      "Office Branch": "Office Branch",
      "Description": "Description",
      "Expertise": "Expertise",
      "Review": "Review",
      "Approval": "Approval",
      "Payment": "Payment",
      "Status": "Status",
      "Estimated Reserve": "Estimated Reserve",
      "Approved": "Approved",
      "Days Left": "Days Left",
      "Remaining": "Remaining",
      "Next Follow-up": "Next Follow-up",
      "Appeal": "Appeal",
      "Created By": "Created By",
      "Created At": "Created At",
      "Updated By": "Updated By",
      "Updated At": "Updated At",
      "Expert": "Expert",
    },
  };

  function t(key) {
    const source = labels[key] || key;
    return copy[localeValue.value]?.[source] || copy.en[source] || source;
  }

  const claimResource = createResource({ url: "frappe.client.get", auto: false });
  const atDocumentR = createResource({ url: "frappe.client.get_list", auto: false });
  const claimPaymentsResource = createResource({ url: "frappe.client.get_list", auto: false });
  const atDocumentLifecycle = useAtDocumentLifecycle({ authStore, t: (key) => labels[localeValue.value]?.[key] || labels.en[key] || key });

  const claim = computed(() => unref(claimResource.data) || {});
  const atDocuments = computed(() => (Array.isArray(unref(atDocumentR.data)) ? unref(atDocumentR.data) : []));
  const payments = computed(() => (Array.isArray(unref(claimPaymentsResource.data)) ? unref(claimPaymentsResource.data) : []));

  const showUploadModal = ref(false);
  function openUploadModal() { showUploadModal.value = true; }
  function closeUploadModal() { showUploadModal.value = false; }
  async function handleUploadComplete() { showUploadModal.value = false; reload(); }
  const canUploadDocuments = computed(() => {
    const caps = authStore.capabilities?.doctypes || {};
    return Boolean(
      caps?.["AT Claim"]?.write
      || caps?.["AT Document"]?.create
      || caps?.["AT Document"]?.write
      || caps?.File?.create
      || caps?.File?.write
    );
  });
  function fmtFileSize(bytes) {
    if (!bytes || bytes === 0) return "-";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }
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
    { label: t("fileNo"), value: claim.value.claim_no || claim.value.name || "-", variant: "default" },
    { label: t("claimDate"), value: formatDate(claim.value.incident_date || claim.value.creation), variant: "default" },
    { label: t("reserve"), value: formatCurrency(claim.value.estimated_amount || 0), variant: "lg" },
    { label: t("paid"), value: formatCurrency(claim.value.paid_amount), variant: "accent" },
  ]);

  const processFields = computed(() => [
    { label: t("claimNo"), value: claim.value.claim_no || claim.value.name || "-", variant: "mono" },
    { label: t("claimDate"), value: formatDate(claim.value.incident_date || claim.value.creation) },
    { label: t("notification"), value: formatDate(claim.value.reported_date || claim.value.creation) },
    { label: t("amount"), value: formatCurrency(claim.value.estimated_amount || 0), variant: "lg" },
  ]);

  const detailFields = computed(() => [
    { label: t("claimType"), value: claim.value.claim_type || "-" },
    { label: t("officeBranch"), value: claim.value.office_branch || "-" },
    { label: t("description"), value: claim.value.notes || claim.value.rejection_reason || "-", span: 2 },
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
      { label: t("notification"), state: "done" },
      { label: t("expertise"), state: expertiseCurrent ? "current" : "done" },
      { label: t("approvalStep"), state: approvalCurrent ? "current" : paymentCurrent ? "done" : "pending" },
      { label: t("paymentStep"), state: paymentCurrent ? "current" : "pending" },
    ];
  });

  const peopleFields = computed(() => [
    { label: t("customer"), value: claim.value.customer || "-" },
    { label: t("expert"), value: claim.value.assigned_expert || claim.value.surveyor || claim.value.expert || "-" },
  ]);

  const reserveFields = computed(() => [
    { label: t("status"), value: claim.value.claim_status || "-" },
    { label: t("estimatedReserve"), value: formatCurrency(claim.value.estimated_amount || 0) },
    { label: t("approved"), value: formatCurrency(claim.value.approved_amount) },
    { label: t("daysLeft"), value: remainingDaysDisplay.value },
  ]);

  const paymentFields = computed(() => [
    { label: t("paid"), value: formatCurrency(claim.value.paid_amount) },
    { label: t("remaining"), value: formatCurrency(remainingAmount.value) },
    { label: t("nextFollowUp"), value: formatDate(claim.value.next_follow_up_on) },
    { label: t("appeal"), value: claim.value.appeal_status || "-" },
  ]);

  const expertiseFields = computed(() => [
    { label: t("expert"), value: claim.value.assigned_expert || "-" },
    { label: t("review"), value: claim.value.claim_status || "-" },
    { label: t("notes"), value: claim.value.notes || "-", span: 2 },
  ]);

  const recordMetaFields = computed(() => [
    { label: t("createdBy"), value: claim.value.owner || "-" },
    { label: t("createdAt"), value: formatDate(claim.value.creation) },
    { label: t("updatedBy"), value: claim.value.modified_by || "-" },
    { label: t("updatedAt"), value: formatDate(claim.value.modified) },
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
    const cn = claim.value.name || claimName.value;
    if (!cn) return;
    router.push({
      name: "at-documents-list",
      query: { reference_doctype: "AT Claim", reference_name: cn },
    });
  }

  function reload() {
    claimResource.params = { doctype: "AT Claim", name: claimName.value };
    claimResource.reload();

    atDocumentR.params = {
      doctype: "AT Document",
      fields: ["name", "file", "display_name", "document_kind", "document_sub_type",
               "document_date", "notes", "status", "is_sensitive", "is_verified", "creation"],
      filters: { claim: claimName.value },
      order_by: "creation desc",
      limit_page_length: 50,
    };
    atDocumentR.reload();

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
    atDocuments,
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
    showUploadModal,
    openUploadModal,
    closeUploadModal,
    handleUploadComplete,
    canUploadDocuments,
    canArchiveDocument: (doc) => atDocumentLifecycle.canArchiveDocument(doc),
    canRestoreDocument: (doc) => atDocumentLifecycle.canRestoreDocument(doc),
    canPermanentDeleteDocument: (doc) => atDocumentLifecycle.canPermanentDeleteDocument(doc),
    archiveDocument: (doc) => atDocumentLifecycle.archiveDocument(doc, reload),
    restoreDocument: (doc) => atDocumentLifecycle.restoreDocument(doc, reload),
    permanentDeleteDocument: (doc) => atDocumentLifecycle.permanentDeleteDocument(doc, reload),
    fmtFileSize,
    reload,
  };
}
