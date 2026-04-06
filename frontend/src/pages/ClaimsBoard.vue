<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="formatCount(claims.length)"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <ClaimsBoardActionBar
        :claims-loading="claimsLoading"
        :t="t"
        @launch-quick-claim="showQuickClaimDialog = true"
        @refresh="reloadClaims"
        @download-xlsx="downloadClaimExport('xlsx')"
        @download-pdf="downloadClaimExport('pdf')"
      />
    </template>

    <template #metrics>
      <ClaimsBoardMetricsPanel :claim-summary="claimSummary" :format-count="formatCount" :t="t" />
    </template>

    <article v-if="claimsErrorText" class="qc-error-banner">
      <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
      <p class="qc-error-banner__text mt-1">{{ claimsErrorText }}</p>
    </article>

    <ClaimsBoardFilterSection
      v-model:search-query="claimsListSearchQuery"
      :claims-list-filter-config="claimsListFilterConfig"
      :claims-list-active-count="claimsListActiveCount"
      :t="t"
      @filter-change="onClaimsListFilterChange"
      @reset="onClaimsListFilterReset"
      @focus-search="focusClaimSearch"
    />

    <ClaimsBoardTableSection
      :claims-table-columns="claimsTableColumns"
      :rows="claimsListRowsWithActions"
      :loading="claimsLoading"
      :format-count="formatCount"
      :t="t"
      @row-click="openClaimDetail"
    />

    <ClaimsBoardDialogs
      v-model:show-quick-claim-dialog="showQuickClaimDialog"
      v-model:show-ownership-assignment-dialog="showOwnershipAssignmentDialog"
      :active-locale="activeLocale"
      :claim-quick-options-map="claimQuickOptionsMap"
      :ownership-assignment-eyebrow="ownershipAssignmentEyebrow"
      :prepare-quick-claim-dialog="prepareQuickClaimDialog"
      :quick-claim-success-handlers="quickClaimSuccessHandlers"
      :prepare-ownership-assignment-dialog="prepareOwnershipAssignmentDialog"
      :ownership-assignment-success-handlers="ownershipAssignmentSuccessHandlers"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";
import { useRoute } from "vue-router";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useClaimStore } from "../stores/claim";
import ClaimsBoardActionBar from "../components/claims-board/ClaimsBoardActionBar.vue";
import ClaimsBoardDialogs from "../components/claims-board/ClaimsBoardDialogs.vue";
import ClaimsBoardFilterSection from "../components/claims-board/ClaimsBoardFilterSection.vue";
import ClaimsBoardMetricsPanel from "../components/claims-board/ClaimsBoardMetricsPanel.vue";
import ClaimsBoardTableSection from "../components/claims-board/ClaimsBoardTableSection.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import { useClaimsBoardRuntime } from "../composables/useClaimsBoardRuntime";
import { getAppPinia } from "../pinia";

const copy = {
  tr: {
    breadcrumb: "Sigorta Operasyonları → Hasarlar",
    title: "Hasarlar",
    subtitle: "Hasar dosyaları ve ödeme durumunu izleyin",
    recordCount: "kayıt",
    summaryTotal: "Toplam Hasar",
    summaryOpen: "Açık",
    summaryApproved: "Onayda",
    summaryPaid: "Ödendi",
    summaryReservePaid: "Toplam Rezerv / Ödeme",
    refresh: "Yenile",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    newClaim: "Yeni Hasar",
    loading: "Yükleniyor...",
    loadErrorTitle: "Hasarlar Yüklenemedi",
    loadError: "Hasar kayıtları yüklenirken bir hata oluştu.",
    emptyTitle: "Hasar Kaydı Yok",
    empty: "Kayıt bulunamadı.",
    claim: "Hasar",
    policy: "Poliçe",
    status: "Durum",
    operations: "Operasyon",
    amounts: "Tutarlar",
    approved: "Onaylanan",
    paid: "Ödenen",
    recordId: "Kayıt",
    actions: "Aksiyon",
    newAssignment: "Atama",
    markUnderReview: "İncelemeye Al",
    markApproved: "Onayla",
    markClosed: "Kapat",
    markRejected: "Reddet",
    clearFollowUp: "Takibi Temizle",
    notificationDraft: "Bildirim Taslağı",
    notificationMissing: "Bildirim Akışı Yok",
    notificationQueue: "Bildirim Kuyruğu",
    notificationNone: "Bildirim Kaydı Yok",
    openNotifications: "Bildirimler",
    openDocuments: "Dokümanlar",
    viewClaimFile: "Dosya Görüntüle",
    createPayment: "Ödeme Yap",
    rejectReasonPrompt: "Red sebebini girin",
    openDesk: "Yönetim Ekranını Aç",
    openPolicy: "Poliçeyi Aç",
    openClaimDetail: "Hasar Kaydını Aç",
    advancedFilters: "Gelişmiş Filtreler",
    hideAdvancedFilters: "Gelişmiş Filtreleri Gizle",
    activeFilters: "aktif filtre",
    filtersTitle: "Filtreler",
    claimsTableTitle: "Hasar Listesi",
    presetLabel: "Filtre Şablonu",
    presetDefault: "Standart",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    savePresetPrompt: "Filtre şablonu adı",
    deletePresetConfirm: "Seçili özel filtre şablonu silinsin mi?",
    applyFilters: "Uygula",
    clearFilters: "Filtreleri Temizle",
    searchPlaceholder: "Hasar no / kayıt no / poliçe ara",
    allStatuses: "Tüm durumlar",
    policyFilter: "Poliçe (içerir)",
    allAmountStates: "Tüm tutar durumları",
    amountStatePaid: "Ödenen kayıtlar",
    amountStateUnpaid: "Ödenmeyen kayıtlar",
    amountStateApprovedOnly: "Onaylı tutarı olanlar",
    amountStatePendingPayment: "Onaylı ama eksik ödeme",
    assignedExpert: "Eksper",
    rejectionReason: "Red Sebebi",
    appealStatus: "İtiraz",
    nextFollowUpOn: "Sonraki Takip",
    documentSummary: "Doküman",
    documentNone: "Dosya yok",
    lastUpload: "Son Yükleme",
    noExpert: "Atanmadı",
    assignmentSummary: "Atama",
    assignmentNone: "Açık atama yok",
    assignmentOpenCount: "açık",
    claimNo: "Hasar No",
    fldCustomer: "Müşteri",
    fldInsuranceCompany: "Sigorta Şirketi",
    fldCarrierPolicyNo: "Sigorta Şirketi Poliçe No",
    fldCustomerType: "Müşteri Türü",
    fldTaxId: "TC/VNO",
    fldCustomerFullName: "Müşteri Ad Soyad",
    fldBirthDate: "Doğum Tarihi",
    fldPolicy: "Poliçe No",
    fldIncidentDate: "Hasar Tarihi",
    fldBranch: "Branş",
    fldClaimType: "Hasar Tipi",
    fldReserve: "Rezerv Tutar",
  },
  en: {
    breadcrumb: "Insurance Operations → Claims",
    title: "Claims",
    subtitle: "Track claim files and payment status",
    recordCount: "records",
    summaryTotal: "Total Claims",
    summaryOpen: "Open",
    summaryApproved: "Approved",
    summaryPaid: "Paid",
    summaryReservePaid: "Reserve / Paid",
    refresh: "Refresh",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    newClaim: "New Claim",
    loading: "Loading...",
    loadErrorTitle: "Failed to Load Claims",
    loadError: "An error occurred while loading claim records.",
    emptyTitle: "No Claim Records",
    empty: "No records found.",
    claim: "Claim",
    policy: "Policy",
    status: "Status",
    operations: "Operations",
    amounts: "Amounts",
    approved: "Approved",
    paid: "Paid",
    recordId: "Record",
    actions: "Actions",
    newAssignment: "Assignment",
    markUnderReview: "Move to Review",
    markApproved: "Approve",
    markClosed: "Close",
    markRejected: "Reject",
    clearFollowUp: "Clear Follow-up",
    notificationDraft: "Notification Draft",
    notificationMissing: "No Notification Flow",
    notificationQueue: "Notification Queue",
    notificationNone: "No Notification Records",
    openNotifications: "Notifications",
    openDocuments: "Documents",
    viewClaimFile: "View File",
    createPayment: "Create Payment",
    rejectReasonPrompt: "Enter rejection reason",
    openDesk: "Open Desk",
    openPolicy: "Open Policy",
    openClaimDetail: "Open Claim Record",
    advancedFilters: "Advanced Filters",
    hideAdvancedFilters: "Hide Advanced Filters",
    activeFilters: "active filters",
    filtersTitle: "Filters",
    claimsTableTitle: "Claims List",
    presetLabel: "Filter Preset",
    presetDefault: "Standard",
    savePreset: "Save",
    deletePreset: "Delete",
    savePresetPrompt: "Filter preset name",
    deletePresetConfirm: "Delete selected custom filter preset?",
    applyFilters: "Apply",
    clearFilters: "Clear Filters",
    searchPlaceholder: "Search claim no / record id / policy",
    allStatuses: "All statuses",
    policyFilter: "Policy (contains)",
    allAmountStates: "All amount states",
    amountStatePaid: "Paid claims",
    amountStateUnpaid: "Unpaid claims",
    amountStateApprovedOnly: "Approved amount exists",
    amountStatePendingPayment: "Approved but underpaid",
    assignedExpert: "Assigned Expert",
    rejectionReason: "Rejection Reason",
    appealStatus: "Appeal Status",
    nextFollowUpOn: "Next Follow Up",
    documentSummary: "Documents",
    documentNone: "No files",
    lastUpload: "Last Upload",
    noExpert: "Unassigned",
    assignmentSummary: "Assignment",
    assignmentNone: "No open assignment",
    assignmentOpenCount: "open",
    claimNo: "Claim No",
    fldInsuranceCompany: "Insurance Company",
    fldCarrierPolicyNo: "Carrier Policy No",
    fldCustomerType: "Customer Type",
    fldTaxId: "National ID / Tax ID",
    fldCustomerFullName: "Customer Full Name",
    fldBirthDate: "Birth Date",
    fldCustomer: "Customer",
    fldPolicy: "Policy No",
    fldIncidentDate: "Incident Date",
    fldBranch: "Line of Business",
    fldClaimType: "Claim Type",
    fldReserve: "Reserve Amount",
  },
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const appPinia = getAppPinia();
const authStore = useAuthStore(appPinia);
const branchStore = useBranchStore(appPinia);
const claimStore = useClaimStore(appPinia);
const route = useRoute();
const activeLocale = computed(() => unref(authStore.locale) || "en");
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));

const claimsTableColumns = computed(() => [
  { key: "claim_no", label: t("claimNo"), width: "140px", type: "mono" },
  { key: "policy_no_display", label: t("fldPolicy"), width: "140px", type: "mono" },
  { key: "insurance_company_label", label: t("fldInsuranceCompany"), width: "180px" },
  { key: "carrier_policy_no", label: t("fldCarrierPolicyNo"), width: "180px", type: "mono" },
  { key: "branch_label", label: t("fldBranch"), width: "140px" },
  { key: "claim_status", label: t("status"), width: "130px", type: "status", domain: "claim" },
  { key: "customer_type_label", label: t("fldCustomerType"), width: "130px" },
  { key: "customer_tax_id", label: t("fldTaxId"), width: "140px", type: "mono" },
  { key: "customer_label", label: t("fldCustomerFullName"), width: "220px" },
  { key: "customer_birth_date", label: t("fldBirthDate"), width: "120px", type: "date" },
  { key: "incident_date_label", label: t("fldIncidentDate"), width: "120px", type: "date" },
  { key: "claim_type", label: t("fldClaimType"), width: "120px" },
  { key: "reserve_amount_label", label: t("fldReserve"), width: "140px", type: "amount", align: "right" },
  { key: "paid_amount_label", label: t("paid"), width: "140px", type: "amount", align: "right" },
  { key: "_actions", label: t("actions"), width: "280px", type: "actions", align: "right" },
]);

const claimsRuntime = useClaimsBoardRuntime({
  authStore,
  branchStore,
  claimStore,
  route,
  activeLocale,
  localeCode,
  t,
});

const {
  ownershipAssignmentEyebrow,
  presetKey,
  presetOptions,
  canDeletePreset,
  applyPreset,
  onPresetChange,
  savePreset,
  deletePreset,
  claims,
  claimsLoading,
  claimsListSearchQuery,
  claimsListLocalFilters,
  showQuickClaimDialog,
  showOwnershipAssignmentDialog,
  claimsListFilterConfig,
  claimsListRowsWithActions,
  claimSummary,
  claimsListActiveCount,
  onClaimsListFilterChange,
  onClaimsListFilterReset,
  formatCount,
  reloadClaims,
  downloadClaimExport,
  claimQuickOptionsMap,
  quickClaimSuccessHandlers,
  ownershipAssignmentSuccessHandlers,
  claimsErrorText,
  prepareQuickClaimDialog,
  openClaimDetail,
  openClaimDocuments,
  openClaimPayment,
  openClaimAssignment,
  prepareOwnershipAssignmentDialog,
} = claimsRuntime;

function focusClaimSearch() {
  const input = document.querySelector(".surface-card input[type='text']");
  if (input && typeof input.focus === "function") {
    input.focus();
  }
}

</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>

