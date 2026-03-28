<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="outboxItems.length + draftItems.length"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <CommunicationCenterActionBar
        :can-create-quick-message="canCreateQuickMessage"
        :can-return-to-context="canReturnToContext"
        :can-run-dispatch-cycle="canRunDispatchCycle"
        :dispatching="dispatching"
        :return-to-label="returnToLabel"
        :snapshot-loading="snapshotLoading"
        :t="t"
        @dispatch="runDispatchCycle"
        @export-pdf="downloadCommunicationExport('pdf')"
        @export-xlsx="downloadCommunicationExport('xlsx')"
        @launch-call-note="showCallNoteDialog = true"
        @launch-campaign="showCampaignDialog = true"
        @launch-campaign-run="showCampaignRunDialog = true"
        @launch-quick-message="showQuickMessageDialog = true"
        @launch-reminder="showReminderDialog = true"
        @launch-segment="showSegmentDialog = true"
        @launch-segment-preview="showSegmentPreviewDialog = true"
        @refresh="reloadSnapshot"
        @return-context="returnToContext"
      />
    </template>

    <CommunicationCenterFilterSection
      :active-filter-count="activeFilterCount"
      :can-delete-preset="canDeletePreset"
      :channel-options="channelOptions"
      :filters="communicationFilters"
      :has-context-filters="hasContextFilters"
      :on-apply-filters="applySnapshotFilters"
      :on-clear-context-filters="clearContextFilters"
      :on-preset-change="onPresetChange"
      :on-preset-delete="deletePreset"
      :on-preset-save="savePreset"
      :on-reset-filters="resetSnapshotFilters"
      :preset-key="presetKey"
      :preset-options="presetOptions"
      :reference-doctype-options="referenceDoctypeOptions"
      :status-options="statusOptions"
      :t="t"
    />

    <CommunicationCenterContextBanner
      :can-block-assignment-context="canBlockAssignmentContext"
      :can-cancel-reminder-context="canCancelReminderContext"
      :can-clear-call-note-context="canClearCallNoteContext"
      :can-close-assignment-context="canCloseAssignmentContext"
      :can-complete-reminder-context="canCompleteReminderContext"
      :can-return-to-context="canReturnToContext"
      :can-start-assignment-context="canStartAssignmentContext"
      :channel-status-context-label="channelStatusContextLabel"
      :customer-context-label="customerContextLabel"
      :filters="communicationFilters"
      :has-context-filters="hasContextFilters"
      :on-block-assignment-context="blockAssignmentContext"
      :on-cancel-reminder-context="cancelReminderContext"
      :on-clear-call-note-context="clearCallNoteContext"
      :on-clear-context-filters="clearContextFilters"
      :on-close-assignment-context="closeAssignmentContext"
      :on-complete-reminder-context="completeReminderContext"
      :on-return-to-context="returnToContext"
      :on-start-assignment-context="startAssignmentContext"
      :reference-context-label="referenceContextLabel"
      :return-to-label="returnToLabel"
      :t="t"
    />

    <template #metrics>
      <CommunicationCenterMetricsPanel :status-cards="statusCards" />
    </template>

    <article v-if="snapshotErrorMessage" class="qc-error-banner">
      <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
      <p class="qc-error-banner__text mt-1">{{ snapshotErrorMessage }}</p>
    </article>

    <article v-if="operationError" class="qc-error-banner">
      <p class="qc-error-banner__text font-semibold">{{ t("actions") }}</p>
      <p class="qc-error-banner__text mt-1">{{ operationError }}</p>
    </article>

    <CommunicationCenterOutboxSection
      :can-open-panel="canOpenPanel"
      :can-retry-outbox-row="canRetryOutboxRow"
      :can-send-draft-card="canSendDraftCard"
      :can-send-draft-from-outbox-row="canSendDraftFromOutboxRow"
      :draft-items="draftItems"
      :on-open-panel="openPanel"
      :on-retry-outbox="retryOutbox"
      :on-send-draft-now="sendDraftNow"
      :outbox-items="outboxItems"
      :panel-action-label="panelActionLabel"
      :reference-type-label="referenceTypeLabel"
      :snapshot-loading="snapshotLoading"
      :t="t"
    />

    <CommunicationCenterDialogs
      v-model:campaign-run-selection="campaignRunSelection"
      v-model:segment-preview-segment="segmentPreviewSegment"
      v-model:show-call-note-dialog="showCallNoteDialog"
      v-model:show-campaign-dialog="showCampaignDialog"
      v-model:show-campaign-run-dialog="showCampaignRunDialog"
      v-model:show-quick-message-dialog="showQuickMessageDialog"
      v-model:show-reminder-dialog="showReminderDialog"
      v-model:show-segment-dialog="showSegmentDialog"
      v-model:show-segment-preview-dialog="showSegmentPreviewDialog"
      :active-locale="activeLocale"
      :build-quick-message-payload="buildQuickMessagePayload"
      :can-create-quick-message="canCreateQuickMessage"
      :can-send-draft-now-action="canSendDraftNowAction"
      :campaign-run-error="campaignRunError"
      :campaign-run-loading="campaignRunLoading"
      :campaign-run-result="campaignRunResult"
      :campaign-success-handlers="campaignSuccessHandlers"
      :call-note-success-handlers="callNoteSuccessHandlers"
      :communication-quick-options-map="communicationQuickOptionsMap"
      :load-segment-preview="loadSegmentPreview"
      :prepare-call-note-dialog="prepareCallNoteDialog"
      :prepare-quick-message-dialog="prepareQuickMessageDialog"
      :prepare-reminder-dialog="prepareReminderDialog"
      :quick-call-note-eyebrow="quickCallNoteEyebrow"
      :quick-campaign-eyebrow="quickCampaignEyebrow"
      :quick-message-dialog-labels="quickMessageDialogLabels"
      :quick-message-eyebrow="quickMessageEyebrow"
      :quick-message-success-handlers="quickMessageSuccessHandlers"
      :quick-reminder-eyebrow="quickReminderEyebrow"
      :quick-segment-eyebrow="quickSegmentEyebrow"
      :reminder-success-handlers="reminderSuccessHandlers"
      :run-campaign-execution="runCampaignExecution"
      :segment-preview-error="segmentPreviewError"
      :segment-preview-loading="segmentPreviewLoading"
      :segment-preview-rows="segmentPreviewRows"
      :segment-preview-summary="segmentPreviewSummary"
      :segment-success-handlers="segmentSuccessHandlers"
      :t="t"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, ref, unref } from "vue";

import { useAuthStore } from "../stores/auth";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import CommunicationCenterActionBar from "../components/communication-center/CommunicationCenterActionBar.vue";
import CommunicationCenterContextBanner from "../components/communication-center/CommunicationCenterContextBanner.vue";
import CommunicationCenterDialogs from "../components/communication-center/CommunicationCenterDialogs.vue";
import CommunicationCenterFilterSection from "../components/communication-center/CommunicationCenterFilterSection.vue";
import CommunicationCenterMetricsPanel from "../components/communication-center/CommunicationCenterMetricsPanel.vue";
import CommunicationCenterOutboxSection from "../components/communication-center/CommunicationCenterOutboxSection.vue";
import { useCommunicationCenterBootstrap } from "../composables/communicationCenter/bootstrap";
import { channelLabel, referenceTypeLabel, statusLabel } from "../composables/communicationCenter/common";
import { useCommunicationCenterRuntime } from "../composables/communicationCenter/runtime";
import { useCommunicationCenterState } from "../composables/communicationCenter/state";
import { useCommunicationCenterActions } from "../composables/communicationCenter/actions";
import { useCommunicationCenterQuickDialogs } from "../composables/communicationCenter/quickDialogs";

const authStore = useAuthStore();

const copy = {
  tr: {
    breadcrumb: "Kontrol Merkezi → İletişim",
    recordCount: "kayıt",
    title: "İletişim Merkezi",
    subtitle: "Bildirim kuyruğu, dağıtım ve yeniden deneme operasyonları",
    refresh: "Yenile",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    dispatch: "Dağıtımı Çalıştır",
    dispatching: "Çalışıyor...",
    runCampaign: "Kampanyayı Çalıştır",
    campaignRunTitle: "Kampanya Çalıştır",
    selectCampaign: "Kampanya seçin",
    previewSegment: "Segment Önizleme",
    segmentPreviewTitle: "Segment Üye Önizleme",
    selectSegment: "Segment seçin",
    quickSegment: "Segment",
    quickSegmentSubtitle: "Hedef müşteri segmenti oluştur",
    quickCampaign: "Kampanya",
    quickCampaignSubtitle: "Segmente bağlı kampanya oluştur",
    quickCallNote: "Arama Notu",
    quickCallNoteSubtitle: "Telefon görüşmesini not olarak kaydet",
    quickReminder: "Hatırlatıcı",
    quickReminderSubtitle: "Müşteri veya kayıt için zaman bazlı hatırlatıcı ekle",
    startAssignmentContext: "Atamayı İşleme Al",
    blockAssignmentContext: "Atamayı Bloke Et",
    closeAssignmentContext: "Atamayı Kapat",
    clearCallFollowUpContext: "Arama Takibini Temizle",
    completeReminderContext: "Hatırlatıcıyı Tamamla",
    cancelReminderContext: "İptal",
    quickMessage: "Hızlı İletişim",
    quickMessageSubtitle: "Taslak kaydet veya seçili kanal ile hemen gönder",
    saveDraft: "Taslak Kaydet",
    sendImmediately: "Hemen Gönder",
    filtersTitle: "Filtreler",
    advancedFilters: "Gelişmiş Filtreler",
    hideAdvancedFilters: "Gelişmiş Filtreleri Gizle",
    activeFilters: "aktif filtre",
    presetLabel: "Filtre Şablonu",
    presetDefault: "Standart",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    savePresetPrompt: "Filtre şablonu adı",
    deletePresetConfirm: "Seçili özel filtre şablonu silinsin mi?",
    applyFilters: "Uygula",
    clearFilters: "Filtreleri Temizle",
    customerFilter: "Müşteri (AT Customer)",
    customerContext: "Müşteri Filtresi",
    clearCustomer: "Müşteri Filtresini Temizle",
    referenceContext: "Kayıt Bağlamı",
    clearContext: "Bağlam Filtrelerini Temizle",
    allStatuses: "Tüm durumlar",
    allChannels: "Tüm kanallar",
    allReferenceTypes: "Tüm kayıt tipleri",
    referenceNameFilter: "Kayıt adı / ID",
    outboxTitle: "Gönderim Kuyruğu",
    draftTitle: "Bildirim Taslakları",
    loading: "Yükleniyor...",
    loadErrorTitle: "İletişim Verileri Yüklenemedi",
    permissionDeniedRead: "İletişim verilerini görmek için yetkiniz yok.",
    permissionDeniedAction: "Bu iletişim işlemini yapmaya yetkiniz yok.",
    emptyOutbox: "Gönderim kuyruğu kaydı bulunamadı.",
    emptyOutboxTitle: "Kuyruk Kaydı Yok",
    emptyDrafts: "Taslak kaydı bulunamadı.",
    emptyDraftsTitle: "Taslak Kaydı Yok",
    recipient: "Alıcı",
    channel: "Kanal",
    status: "Durum",
    recordType: "Kayıt Türü",
    attempts: "Deneme",
    nextRetry: "Sonraki Deneme",
    actions: "Aksiyon",
    error: "Hata",
    retry: "Tekrar Dene",
    sendNow: "Hemen Gönder",
    openRef: "Kaydı Aç",
    queued: "Kuyrukta",
    processing: "İşleniyor",
    sent: "Gönderildi",
    failed: "Başarısız",
    dead: "Kalıcı Hata",
    sms: "SMS",
    email: "E-posta",
    whatsapp: "WhatsApp",
    openPolicyPanel: "Poliçeyi Aç",
    openCustomerPanel: "Müşteriyi Aç",
    openOffersPanel: "Teklif Panosu",
    openClaimsPanel: "Hasar Panosu",
    openPaymentsPanel: "Ödeme Panosu",
    openRenewalsPanel: "Yenileme Panosu",
    openReconciliationPanel: "Mutabakat Panosu",
    openCommunicationPanel: "İletişim Kaydı",
    openMasterDataPanel: "Ana Veri Kaydı",
    referenceLead: "Lead",
    referenceOffer: "Teklif",
    referencePolicy: "Poliçe",
    referenceCustomer: "Müşteri",
    referenceClaim: "Hasar",
    referencePayment: "Ödeme",
    referenceRenewalTask: "Yenileme",
    referenceAccountingEntry: "Muhasebe",
    referenceReconciliationItem: "Mutabakat",
    matchedCustomers: "Eşleşen Müşteriler",
    createdDrafts: "Üretilen Taslaklar",
    skippedRows: "Atlanan Kayıtlar",
    previewRows: "Önizleme Satırı",
    hasMore: "Devamı Var",
    yes: "Evet",
    no: "Hayır",
    policies: "Poliçe",
    overdueInstallments: "Geciken Taksit",
    renewalWindow: "Yenileme Penceresi",
  },
  en: {
    breadcrumb: "Control Center → Communication",
    recordCount: "records",
    title: "Communication Center",
    subtitle: "Notification queue, dispatch and retry operations",
    refresh: "Refresh",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    dispatch: "Run Dispatch",
    dispatching: "Running...",
    runCampaign: "Run Campaign",
    campaignRunTitle: "Run Campaign",
    selectCampaign: "Select campaign",
    previewSegment: "Preview Segment",
    segmentPreviewTitle: "Segment Member Preview",
    selectSegment: "Select segment",
    quickSegment: "Segment",
    quickSegmentSubtitle: "Create a target customer segment",
    quickCampaign: "Campaign",
    quickCampaignSubtitle: "Create a segment-based campaign",
    quickCallNote: "Call Note",
    quickCallNoteSubtitle: "Log a phone conversation as an interaction note",
    quickReminder: "Reminder",
    quickReminderSubtitle: "Create a time-based reminder for the current context",
    startAssignmentContext: "Start Assignment",
    blockAssignmentContext: "Block Assignment",
    closeAssignmentContext: "Close Assignment",
    clearCallFollowUpContext: "Clear Call Follow-up",
    completeReminderContext: "Complete Reminder",
    cancelReminderContext: "Cancel Reminder",
    quickMessage: "Quick Message",
    quickMessageSubtitle: "Save as draft or send immediately",
    saveDraft: "Save Draft",
    sendImmediately: "Send Now",
    filtersTitle: "Filters",
    advancedFilters: "Advanced Filters",
    hideAdvancedFilters: "Hide Advanced Filters",
    activeFilters: "active filters",
    presetLabel: "Filter Preset",
    presetDefault: "Standard",
    savePreset: "Save",
    deletePreset: "Delete",
    savePresetPrompt: "Filter preset name",
    deletePresetConfirm: "Delete selected custom filter preset?",
    applyFilters: "Apply",
    clearFilters: "Clear Filters",
    customerFilter: "Customer (AT Customer)",
    customerContext: "Customer Filter",
    clearCustomer: "Clear Customer Filter",
    referenceContext: "Record Context",
    clearContext: "Clear Context Filters",
    allStatuses: "All statuses",
    allChannels: "All channels",
    allReferenceTypes: "All record types",
    referenceNameFilter: "Record name / ID",
    outboxTitle: "Outbox Queue",
    draftTitle: "Notification Drafts",
    loading: "Loading...",
    loadErrorTitle: "Failed to Load Communication Data",
    permissionDeniedRead: "You do not have permission to view communication data.",
    permissionDeniedAction: "You do not have permission to perform this communication action.",
    emptyOutbox: "No outbox records found.",
    emptyOutboxTitle: "No Outbox Records",
    emptyDrafts: "No draft records found.",
    emptyDraftsTitle: "No Draft Records",
    recipient: "Recipient",
    channel: "Channel",
    status: "Status",
    recordType: "Record Type",
    attempts: "Attempts",
    nextRetry: "Next Retry",
    actions: "Actions",
    error: "Error",
    retry: "Retry",
    sendNow: "Send Now",
    openRef: "Open Record",
    queued: "Queued",
    processing: "Processing",
    sent: "Sent",
    failed: "Failed",
    dead: "Dead",
    sms: "SMS",
    email: "Email",
    whatsapp: "WhatsApp",
    openPolicyPanel: "Open Policy",
    openCustomerPanel: "Open Customer",
    openOffersPanel: "Offers Board",
    openClaimsPanel: "Claims Board",
    openPaymentsPanel: "Payments Board",
    openRenewalsPanel: "Renewals Board",
    openReconciliationPanel: "Reconciliation Board",
    openCommunicationPanel: "Communication Record",
    openMasterDataPanel: "Master Data Record",
    referenceLead: "Lead",
    referenceOffer: "Offer",
    referencePolicy: "Policy",
    referenceCustomer: "Customer",
    referenceClaim: "Claim",
    referencePayment: "Payment",
    referenceRenewalTask: "Renewal",
    referenceAccountingEntry: "Accounting",
    referenceReconciliationItem: "Reconciliation",
    matchedCustomers: "Matched Customers",
    createdDrafts: "Created Drafts",
    skippedRows: "Skipped Rows",
    previewRows: "Preview Rows",
    hasMore: "Has More",
    yes: "Yes",
    no: "No",
    policies: "Policies",
    overdueInstallments: "Overdue Installments",
    renewalWindow: "Renewal Window",
  },
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const activeLocale = computed(() => unref(authStore.locale) || "en");

let filters;

const runtime = useCommunicationCenterRuntime({
  t,
  statusLabel,
  channelLabel,
  referenceTypeLabel,
});

const {
  activeFilterCount,
  auxMutationResource,
  breakdown,
  campaignRunResource,
  communicationQuickCampaignResource,
  communicationQuickClaimResource,
  communicationQuickCustomerResource,
  communicationQuickPolicyResource,
  communicationQuickSegmentResource,
  communicationQuickTemplateResource,
  draftItems,
  hasRouteContextQuery,
  outboxItems,
  reloadQuickCustomers,
  reloadSnapshot,
  runCycleResource,
  sendDraftResource,
  retryOutboxResource,
  segmentPreviewResource,
  snapshotData,
  snapshotErrorMessage,
  snapshotResource,
  statusCards,
} = runtime;
const snapshotLoading = computed(() => Boolean(snapshotResource?.loading));

const state = useCommunicationCenterState({
  activeLocale,
  reloadSnapshot,
  communicationQuickTemplateResource,
  communicationQuickCustomerResource,
  communicationQuickPolicyResource,
  communicationQuickClaimResource,
  communicationQuickSegmentResource,
  communicationQuickCampaignResource,
  statusCards,
  t,
  statusLabel,
  channelLabel,
  referenceTypeLabel,
});

const {
  applyPreset,
  applySnapshotFilters,
  canBlockAssignmentContext,
  canCancelReminderContext,
  canClearCallNoteContext,
  canCloseAssignmentContext,
  canCompleteReminderContext,
  canCreateQuickMessage,
  canDeletePreset,
  canReturnToContext,
  canRetryOutboxAction,
  canRunDispatchCycle,
  canSendDraftNowAction,
  canStartAssignmentContext,
  channelOptions,
  channelStatusContextLabel,
  clearContextFilters,
  clearCustomerFilter,
  communicationQuickOptionsMap,
  customerContextLabel,
  deletePreset,
  filters: communicationFilters,
  hasContextFilters,
  hydratePresetStateFromServer,
  onPresetChange,
  persistPresetStateToServer,
  presetKey,
  presetOptions,
  quickCallNoteEyebrow,
  quickCampaignEyebrow,
  quickMessageDialogLabels,
  quickMessageEyebrow,
  quickReminderEyebrow,
  quickSegmentEyebrow,
  referenceContextLabel,
  referenceDoctypeOptions,
  resetCommunicationFilterState,
  resetSnapshotFilters,
  returnToContext,
  returnToLabel,
  returnToTarget,
  safeReturnTo,
  savePreset,
  statusOptions,
} = state;
filters = communicationFilters;

const quickDialogs = useCommunicationCenterQuickDialogs({
  activeLocale,
  filters: communicationFilters,
  reloadSnapshot,
  segmentPreviewResource,
  campaignRunResource,
  t,
});

const {
  buildQuickMessagePayload,
  campaignRunError,
  campaignRunLoading,
  campaignRunResult,
  campaignRunSelection,
  callNoteSuccessHandlers,
  loadSegmentPreview,
  quickMessageSuccessHandlers,
  prepareCallNoteDialog,
  prepareQuickMessageDialog,
  prepareReminderDialog,
  runCampaignExecution,
  segmentPreviewError,
  segmentPreviewLoading,
  segmentPreviewPayload,
  segmentPreviewRows,
  segmentPreviewSegment,
  segmentPreviewSummary,
  showCallNoteDialog,
  showCampaignDialog,
  showCampaignRunDialog,
  showQuickMessageDialog,
  showReminderDialog,
  showSegmentDialog,
  showSegmentPreviewDialog,
  reminderSuccessHandlers,
  segmentSuccessHandlers,
  campaignSuccessHandlers,
} = quickDialogs;

const dispatchingState = useCommunicationCenterActions({
  auxMutationResource,
  canCancelReminderContext,
  canClearCallNoteContext,
  canCloseAssignmentContext,
  canCompleteReminderContext,
  canRetryOutboxAction,
  canRunDispatchCycle,
  canSendDraftNowAction,
  filters: communicationFilters,
  reloadSnapshot,
  retryOutboxResource,
  runCycleResource,
  sendDraftResource,
  t,
});

const {
  blockAssignmentContext,
  canOpenPanel,
  canRetryOutboxRow,
  canSendDraftCard,
  canSendDraftFromOutboxRow,
  cancelReminderContext,
  clearCallNoteContext,
  closeAssignmentContext,
  completeReminderContext,
  dispatching,
  operationError,
  openPanel,
  panelActionLabel,
  retryOutbox,
  runDispatchCycle,
  sendDraftNow,
  sourcePanelConfig,
  startAssignmentContext,
} = dispatchingState;

useCommunicationCenterBootstrap({
  applyPreset,
  hasRouteContextQuery,
  hydratePresetStateFromServer,
  presetKey,
  reloadQuickCustomers,
  reloadSnapshot,
});
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>

