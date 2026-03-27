<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="formatCount(claims.length)"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <QuickCreateLauncher
        variant="primary"
        size="sm"
        :label="t('newClaim')"
        @launch="showQuickClaimDialog = true"
      />
      <ActionButton variant="secondary" size="sm" :disabled="claimsLoading" @click="reloadClaims">
        {{ t("refresh") }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" :disabled="claimsLoading" @click="downloadClaimExport('xlsx')">
        {{ t("exportXlsx") }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" :disabled="claimsLoading" @click="downloadClaimExport('pdf')">
        {{ t("exportPdf") }}
      </ActionButton>
    </template>

    <template #metrics>
      <div class="w-full grid grid-cols-1 gap-4 md:grid-cols-5">
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryTotal") }}</p>
          <p class="mini-metric-value">{{ formatCount(claimSummary.total) }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryOpen") }}</p>
          <p class="mini-metric-value text-brand-600">{{ formatCount(claimSummary.open) }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryApproved") }}</p>
          <p class="mini-metric-value text-amber-600">{{ formatCount(claimSummary.approved) }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryPaid") }}</p>
          <p class="mini-metric-value text-green-600">{{ formatCount(claimSummary.paid) }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryReservePaid") }}</p>
          <p class="mini-metric-value text-slate-900">{{ claimSummary.reserveVsPaid }}</p>
        </div>
      </div>
    </template>

    <article v-if="claimsErrorText" class="qc-error-banner">
      <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
      <p class="qc-error-banner__text mt-1">{{ claimsErrorText }}</p>
    </article>

    <SectionPanel
      :title="t('filtersTitle')"
      :count="`${claimsListActiveCount} ${t('activeFilters')}`"
      panel-class="surface-card rounded-2xl p-4"
    >
      <FilterBar
        v-model:search="claimsListSearchQuery"
        :filters="claimsListFilterConfig"
        :active-count="claimsListActiveCount"
        @filter-change="onClaimsListFilterChange"
        @reset="onClaimsListFilterReset"
      >
        <template #actions>
          <button class="btn btn-outline btn-sm" @click="onClaimsListFilterReset">{{ t("clearFilters") }}</button>
          <button class="btn btn-outline btn-sm" @click="focusClaimSearch">{{ t("searchPlaceholder") }}</button>
        </template>
      </FilterBar>
    </SectionPanel>

    <SectionPanel
      :title="t('claimsTableTitle')"
      :count="formatCount(claimsListRowsWithActions.length)"
      panel-class="surface-card rounded-2xl p-5"
    >
      <ListTable
        :columns="claimsTableColumns"
        :rows="claimsListRowsWithActions"
        :loading="claimsLoading"
        empty-message="Hasar bulunamadı."
        @row-click="openClaimDetail"
      />
    </SectionPanel>

    <QuickCreateClaim
      v-model="showQuickClaimDialog"
      :locale="activeLocale"
      :options-map="claimQuickOptionsMap"
      :before-open="prepareQuickClaimDialog"
      :success-handlers="quickClaimSuccessHandlers"
    />
    <QuickCreateManagedDialog
      v-model="showOwnershipAssignmentDialog"
      config-key="ownership_assignment"
      :locale="activeLocale"
      :options-map="claimQuickOptionsMap"
      :eyebrow="ownershipAssignmentEyebrow"
      :show-save-and-open="false"
      :before-open="prepareOwnershipAssignmentDialog"
      :success-handlers="ownershipAssignmentSuccessHandlers"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";
import { useRoute } from "vue-router";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useClaimStore } from "../stores/claim";
import ActionButton from "../components/app-shell/ActionButton.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import QuickCreateClaim from "../components/QuickCreateClaim.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import ListTable from "../components/ui/ListTable.vue";
import FilterBar from "../components/ui/FilterBar.vue";
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

const claimsTableColumns = [
  { key: "claim_no", label: "Hasar No", width: "140px", type: "mono" },
  { key: "customer", label: "Müşteri", width: "220px" },
  { key: "policy", label: "Poliçe No", width: "140px", type: "mono" },
  { key: "incident_date_label", label: "Hasar Tarihi", width: "120px", type: "date" },
  { key: "office_branch_label", label: "Şube", width: "120px" },
  { key: "claim_type", label: "Hasar Tipi", width: "120px" },
  { key: "reserve_amount_label", label: "Rezerv Tutar", width: "140px", type: "amount", align: "right" },
  { key: "paid_amount_label", label: "Ödenen", width: "140px", type: "amount", align: "right" },
  { key: "claim_status", label: "Durum", width: "130px", type: "status", domain: "claim" },
  { key: "_actions", label: "Actions", width: "280px", type: "actions", align: "right" },
];

const claimsListColumns = [
  { key: "claim_no", label: "Hasar No", width: "140px", type: "mono" },
  { key: "policy", label: "Poliçe", width: "140px", type: "mono" },
  { key: "customer", label: "Müşteri", width: "220px" },
  { key: "claim_status", label: "Durum", width: "130px", type: "status" },
  { key: "approved_amount", label: "Onaylanan", width: "120px", type: "amount", align: "right" },
  { key: "paid_amount", label: "Ödenen", width: "120px", type: "amount", align: "right" },
  { key: "remaining_days", label: "Takip Günü", width: "110px", type: "urgency", align: "right" },
];
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

// Static columns remain here for template readability.

</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>

