<template>
  <section class="page-shell space-y-4">
    <PolicyDetailTopbar
      :name="name"
      :policy="policy"
      :carrier-policy-display-value="carrierPolicyDisplayValue"
      :copy-identity="copyIdentity"
      :go-back="goBack"
      :open-quick-ownership-assignment="openQuickOwnershipAssignment"
      :t="t"
    />

    <HeroStrip :cells="heroCells" />

    <PolicyDetailTabs v-model:activeTab="activeTab" :tabs="tabs" />

    <div class="detail-body">
      <PolicyDetailMainContent
        :t="t"
        :active-tab="activeTab"
        :selected-snapshot-version="selectedSnapshot?.snapshot_version"
        :lifecycle-steps="lifecycleSteps"
        :lifecycle-fields="lifecycleFields"
        :timeline-items="timelineItems"
        :timeline-loading="timelineLoading"
        :premium-field-groups="premiumFieldGroups"
        :payment-loading="paymentLoading"
        :payments="payments"
        :coverage-field-groups="coverageFieldGroups"
        :product-profile-field-groups="productProfileFieldGroups"
        :product-readiness-field-groups="productReadinessFieldGroups"
        :endorsement-loading="endorsementLoading"
        :endorsements="endorsements"
        :file-loading="fileLoading"
        :files="files"
        :at-documents="atDocuments"
        :document-field-groups="documentFieldGroups"
        :fmt-date="fmtDate"
        :fmt-date-time="fmtDateTime"
        :fmt-money="fmtMoney"
        :payment-status-label="paymentStatusLabel"
        :endorsement-status-label="endorsementStatusLabel"
        :endorsement-status-class="endorsementStatusClass"
        :open-quick-ownership-assignment="openQuickOwnershipAssignment"
        :open-policy-documents="openPolicyDocuments"
        :open-upload-modal="openUploadModal"
        :can-upload-documents="canUploadDocuments"
        :fmt-file-size="fmtFileSize"
      />

      <PolicyDetailSidebar
        :t="t"
        :premium-metrics="premiumMetrics"
        :customer-loading="customerLoading"
        :customer="customer"
        :customer-initials="customerInitials"
        :open-customer="openCustomer"
        :date-fields="dateFields"
        :assignments="assignments"
      />
    </div>
    <PolicyDetailQuickDialogs
      :active-locale="activeLocale"
      :ownership-assignment-eyebrow="ownershipAssignmentEyebrow"
      :ownership-assignment-edit-eyebrow="ownershipAssignmentEditEyebrow"
      :policy-quick-options-map="policyQuickOptionsMap"
      :prepare-ownership-assignment-dialog="prepareOwnershipAssignmentDialog"
      :prepare-ownership-assignment-edit-dialog="prepareOwnershipAssignmentEditDialog"
      :ownership-assignment-success-handlers="ownershipAssignmentSuccessHandlers"
      v-model:show-ownership-assignment-dialog="showOwnershipAssignmentDialog"
      v-model:show-ownership-assignment-edit-dialog="showOwnershipAssignmentEditDialog"
    />
    <PolicyDocumentUploadModal
      :open="showUploadModal"
      :can-upload="canUploadDocuments"
      :policy-name="policy?.name || name"
      :t="t"
      @close="closeUploadModal"
      @uploaded="handleUploadComplete"
    />
  </section>
</template>

<script setup>
import { computed, ref, unref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import HeroStrip from "../components/ui/HeroStrip.vue";
import PolicyDetailTopbar from "../components/policy-detail/PolicyDetailTopbar.vue";
import PolicyDetailTabs from "../components/policy-detail/PolicyDetailTabs.vue";
import PolicyDetailMainContent from "../components/policy-detail/PolicyDetailMainContent.vue";
import PolicyDetailSidebar from "../components/policy-detail/PolicyDetailSidebar.vue";
import PolicyDetailQuickDialogs from "../components/policy-detail/PolicyDetailQuickDialogs.vue";
import PolicyDocumentUploadModal from "../components/policy-detail/PolicyDocumentUploadModal.vue";
import { usePolicyDetailRuntime } from "../composables/usePolicyDetailRuntime";
import { usePolicyDetailQuickDialogs } from "../composables/usePolicyDetailQuickDialogs";
import { usePolicyDetailSummary } from "../composables/usePolicyDetailSummary";
import { formatDate, formatDateTime, formatMoney, formatPercent, stripHtml as sharedStripHtml, policyStatusLabel as sharedPolicyStatusLabel, paymentStatusLabel as sharedPaymentStatusLabel, endorsementStatusLabel as sharedEndorsementStatusLabel } from "../utils/detailFormatters";

const props = defineProps({ name: { type: String, default: "" } });
const router = useRouter();
const authStore = useAuthStore();
const activeLocale = computed(() => {
  const rawLocale = String(unref(authStore.locale) || "en").toLowerCase();
  return rawLocale.startsWith("tr") ? "tr" : "en";
});

const labels = {
  tr: {
    breadcrumb: "Sigorta Operasyonları → Poliçeler", overview: "Poliçe Detayı", openDesk: "Yönetim Ekranını Aç", backList: "Listeye Dön", loading: "Yükleniyor...",
    recordNo: "Kayıt No", carrierPolicyNo: "Şirket Poliçe No",
    copy: "Kopyala", copied: "Kopyalandı", notAssigned: "Henüz atanmadı",
    mobileQuickActionsTitle: "Hızlı İşlemler",
    timelineTitle: "Zaman Tüneli", emptyTimeline: "Bu poliçede zaman tüneli kaydı yok.", lifecycleTitle: "Poliçe Yaşam Döngüsü",
    emptyLifecycle: "Anlık görüntü kaydı yok.", premiumTitle: "Prim Bilgileri", customerTitle: "Müşteri Detayı",
    emptyCustomer: "Müşteri kaydı yok.", taxId: "TC/VKN", phone: "Telefon", address: "Adres", customer360: "Müşteri Detaylarını Aç",
    scheduleTitle: "Vade Tarihleri", issue: "Tanzim", start: "Başlangıç", end: "Bitiş", remaining: "Kalan Gün",
    net: "Net Prim", tax: "Vergi", commission: "Komisyon", gross: "Brüt Prim", commissionRate: "Komisyon Oranı", gwpTry: "GWP TRY",
    payments: "Ödemeler", emptyPayments: "Ödeme kaydı yok.", installmentsTitle: "Taksit Planı", emptyInstallments: "Taksit kaydı yok.", assignmentsTitle: "Atamalar", emptyAssignments: "Atama kaydı yok.", activitiesTitle: "Aktiviteler", emptyActivities: "Aktivite kaydı yok.", remindersTitle: "Hatırlatıcılar", emptyReminders: "Hatırlatıcı kaydı yok.", reminderAt: "Hatırlatma", reminderPriority: "Öncelik", markDone: "Tamamla", cancelReminder: "İptal", installmentNo: "Taksit", paidOn: "Ödeme Tarihi", coverageContext: "Poliçe Kapsam Bilgileri", snapshotSummary: "Anlık Görüntü Özeti", newAssignment: "Yeni Atama", edit: "Düzenle", delete: "Sil", deleteAssignmentConfirm: "Bu atama kaydı silinsin mi?", startAssignment: "İşleme Al", blockAssignment: "Bloke Et", closeAssignment: "Kapat",
    productProfileTitle: "Ürün Profili",
    productReadinessTitle: "Ürün Hazırlık Durumu",
    company: "Sigorta Şirketi", branch: "Branş", customer: "Müşteri", status: "Durum", currency: "Para Birimi", fxRate: "Kur", fxDate: "Kur Tarihi",
    productFamily: "Ürün Ailesi", insuredSubject: "Sigortalanan Konu", coverageFocus: "Kapsam Odağı",
    readinessScore: "Hazırlık Skoru", completedFields: "Tam Alan", missingFields: "Eksik Alan",
    missingProductFields: "Eksik Ürün Alanları", noMissingProductField: "Eksik zorunlu alan bulunamadı.", missingFieldStatus: "Eksik",
    endorsementTitle: "Zeyilname Geçmişi", emptyEndorsement: "Zeyilname yok.", documents: "Dokümanlar", emptyFiles: "Dosya yok.", emptyDocuments: "Henüz doküman yüklenmedi.",
    totalDocuments: "Toplam Doküman", pdfDocuments: "PDF", imageDocuments: "Görsel", spreadsheetDocuments: "Tablo", otherDocuments: "Diğer", lastUploadedOn: "Son Yükleme",
    notifications: "Bildirim Taslakları", emptyNotifications: "Bildirim yok.", version: "Versiyon", open: "Aç",
    uploadDocument: "Belge Yükle", chooseFile: "Dosya seçin veya buraya sürükleyin", uploadSuccess: "Belge başarıyla yüklendi",
    uploadError: "Yükleme başarısız. Lütfen tekrar deneyin.", fileTooLarge: "Dosya çok büyük (maks. 10 MB)", private: "Gizli", fileSize: "Dosya boyutu",
    cancel: "İptal", upload: "Yükle", uploading: "Yükleniyor...",
    documentKind: "Belge Türü", documentSubType: "Alt Tür", documentDate: "Belge Tarihi", notes: "Notlar",
    kindPolicy: "Poliçe", kindEndorsement: "Zeyilname", kindClaim: "Hasar", kindOther: "Diğer",
    subTypeRuhsat: "Ruhsat", subTypeKimlik: "Kimlik", subTypePoliceKopyasi: "Poliçe Kopyası", subTypeHasarFotografi: "Hasar Fotoğrafı", subTypeDiger: "Diğer",
    tabSummary: "Özet", tabPremiums: "Prim/Ödeme", tabCoverages: "Teminatlar", tabEndorsements: "Zeyilnameler", tabDocuments: "Dokümanlar",
    typeEndorsement: "Zeyilname", typeCall: "Arama", typeNote: "Not", expired: "Süresi Doldu", noDate: "Tarih yok",
  },
  en: {
    breadcrumb: "Insurance Operations -> Policies", overview: "Policy Details", openDesk: "Open Desk", backList: "Back to List", loading: "Loading...",
    recordNo: "Record No", carrierPolicyNo: "Carrier Policy No",
    copy: "Copy", copied: "Copied", notAssigned: "Not assigned yet",
    mobileQuickActionsTitle: "Quick Actions",
    timelineTitle: "Timeline", emptyTimeline: "No timeline activity.", lifecycleTitle: "Policy Lifecycle",
    emptyLifecycle: "No snapshot records.", premiumTitle: "Premium Details", customerTitle: "Customer Details",
    emptyCustomer: "Customer not found.", taxId: "Tax ID", phone: "Phone", address: "Address", customer360: "Open Customer Details",
    scheduleTitle: "Schedule", issue: "Issue Date", start: "Start Date", end: "End Date", remaining: "Days Remaining",
    net: "Net Premium", tax: "Tax", commission: "Commission", gross: "Gross Premium", commissionRate: "Commission Rate", gwpTry: "GWP TRY",
    payments: "Payments", emptyPayments: "No payments.", installmentsTitle: "Installment Schedule", emptyInstallments: "No installment records.", assignmentsTitle: "Assignments", emptyAssignments: "No assignments.", activitiesTitle: "Activities", emptyActivities: "No activities found.", remindersTitle: "Reminders", emptyReminders: "No reminders found.", reminderAt: "Reminder At", reminderPriority: "Priority", markDone: "Mark Done", cancelReminder: "Cancel", installmentNo: "Installment", paidOn: "Paid On", coverageContext: "Policy Coverage Context", snapshotSummary: "Snapshot Summary", newAssignment: "New Assignment", edit: "Edit", delete: "Delete", deleteAssignmentConfirm: "Delete this assignment record?", startAssignment: "Start", blockAssignment: "Block", closeAssignment: "Close",
    productProfileTitle: "Product Profile",
    productReadinessTitle: "Product Readiness",
    company: "Insurance Company", branch: "Branch", customer: "Customer", status: "Status", currency: "Currency", fxRate: "FX Rate", fxDate: "FX Date",
    productFamily: "Product Family", insuredSubject: "Insured Subject", coverageFocus: "Coverage Focus",
    readinessScore: "Readiness Score", completedFields: "Completed Fields", missingFields: "Missing Fields",
    missingProductFields: "Missing Product Fields", noMissingProductField: "No missing required field found.", missingFieldStatus: "Missing",
    endorsementTitle: "Endorsement History", emptyEndorsement: "No endorsements.", documents: "Documents", emptyFiles: "No files.", emptyDocuments: "No documents uploaded yet.",
    totalDocuments: "Total Documents", pdfDocuments: "PDF", imageDocuments: "Images", spreadsheetDocuments: "Spreadsheets", otherDocuments: "Other", lastUploadedOn: "Last Upload",
    notifications: "Notification Drafts", emptyNotifications: "No notifications.", version: "Version", open: "Open",
    uploadDocument: "Upload Document", chooseFile: "Choose a file or drag it here", uploadSuccess: "Document uploaded successfully",
    uploadError: "Upload failed. Please try again.", fileTooLarge: "File is too large (max 10 MB)", private: "Private", fileSize: "File size",
    cancel: "Cancel", upload: "Upload", uploading: "Uploading...",
    documentKind: "Document Type", documentSubType: "Sub Type", documentDate: "Document Date", notes: "Notes",
    kindPolicy: "Policy", kindEndorsement: "Endorsement", kindClaim: "Claim", kindOther: "Other",
    subTypeRuhsat: "Vehicle Registration", subTypeKimlik: "ID Document", subTypePoliceKopyasi: "Policy Copy", subTypeHasarFotografi: "Damage Photo", subTypeDiger: "Other",
    tabSummary: "Summary", tabPremiums: "Premiums/Payments", tabCoverages: "Coverages", tabEndorsements: "Endorsements", tabDocuments: "Documents",
    typeEndorsement: "Endorsement", typeCall: "Call", typeNote: "Note", expired: "Expired", noDate: "No date",
  },
};
const t = (k) => labels[activeLocale.value]?.[k] || labels.en[k] || k;
const locale = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
const fmtDate = (v) => formatDate(locale.value, v);
const fmtDateTime = (v) => formatDateTime(locale.value, v);
const fmtMoney = (v, c) => formatMoney(locale.value, v, c);
const fmtPct = (v) => formatPercent(locale.value, v);
const stripHtml = (v) => sharedStripHtml(v);
const policyStatusLabel = (status) => sharedPolicyStatusLabel(activeLocale.value, status);
const paymentStatusLabel = (status) => sharedPaymentStatusLabel(activeLocale.value, status);
const endorsementStatusLabel = (status) => sharedEndorsementStatusLabel(activeLocale.value, status);

const tabs = computed(() => [
  { key: "summary", label: t("tabSummary") },
  { key: "premiums", label: t("tabPremiums") },
  { key: "coverages", label: t("tabCoverages") },
  { key: "endorsements", label: t("tabEndorsements") },
  { key: "documents", label: t("tabDocuments") },
]);
const activeTab = ref("summary");

const {
  policy,
  customer,
  endorsements,
  comments,
  communications,
  snapshots,
  payments,
  files,
  atDocuments,
  assignments,
  productProfile,
  documentProfile,
  selectedSnapshotName,
  copyIdentity,
  goBack,
  openDeskPolicy,
  openCustomer,
  openPolicyDocuments,
  showUploadModal,
  openUploadModal,
  closeUploadModal,
  handleUploadComplete,
  canUploadDocuments,
  fmtFileSize,
  load,
  timelineLoading,
  customerLoading,
  endorsementLoading,
  paymentLoading,
  fileLoading,
  endorsementStatusClass,
} = usePolicyDetailRuntime({ props, router, activeTab });

const {
  ownershipAssignmentEyebrow,
  ownershipAssignmentEditEyebrow,
  policyQuickOptionsMap,
  ownershipAssignmentSuccessHandlers,
  showOwnershipAssignmentDialog,
  showOwnershipAssignmentEditDialog,
  prepareOwnershipAssignmentDialog,
  prepareOwnershipAssignmentEditDialog,
  openQuickOwnershipAssignment,
} = usePolicyDetailQuickDialogs({ props, policy, customer, activeLocale, load });

const {
  selectedSnapshot,
  timelineItems,
  carrierPolicyDisplayValue,
  heroCells,
  lifecycleSteps,
  lifecycleFields,
  premiumMetrics,
  dateFields,
  premiumFieldGroups,
  coverageFieldGroups,
  productProfileFieldGroups,
  productReadinessFieldGroups,
  documentFieldGroups,
  customerInitials,
} = usePolicyDetailSummary({
  t,
  locale,
  policy,
  customer,
  endorsements,
  comments,
  communications,
  snapshots,
  files,
  productProfile,
  documentProfile,
  selectedSnapshotName,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  fmtPct,
  stripHtml,
  policyStatusLabel,
  paymentStatusLabel,
  endorsementStatusLabel,
});
</script>

