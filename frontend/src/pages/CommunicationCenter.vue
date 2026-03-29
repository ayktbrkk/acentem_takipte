<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="recordCount"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <CommunicationCenterActionBar :state="state" :runtime="runtime" :t="t" />
    </template>

    <CommunicationCenterOverview :filters="filters" :state="state" :runtime="runtime" :t="t" />

    <CommunicationCenterAlerts
      :snapshot-error-message="state.snapshotErrorMessage"
      :operation-error="runtime.operationError"
      :t="t"
    />

    <CommunicationCenterQueueSections :state="state" :runtime="runtime" :actions="actions" :t="t" />

    <CommunicationCenterDialogs
      :active-locale="activeLocale"
      :quick-dialogs="quickDialogs"
      :runtime="runtime"
      :state="state"
      :t="t"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useCommunicationStore } from "../stores/communication";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import CommunicationCenterActionBar from "../components/communication-center/CommunicationCenterActionBar.vue";
import CommunicationCenterAlerts from "../components/communication-center/CommunicationCenterAlerts.vue";
import CommunicationCenterDialogs from "../components/communication-center/CommunicationCenterDialogs.vue";
import CommunicationCenterOverview from "../components/communication-center/CommunicationCenterOverview.vue";
import CommunicationCenterQueueSections from "../components/communication-center/CommunicationCenterQueueSections.vue";
import { useCommunicationCenterRuntime } from "../composables/communicationCenter/runtime";
import { useCommunicationCenterState } from "../composables/communicationCenter/state";
import { useCommunicationCenterActions } from "../composables/communicationCenter/actions";
import { useCommunicationCenterQuickDialogs } from "../composables/communicationCenter/quickDialogs";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const branchStore = useBranchStore();
const communicationStore = useCommunicationStore();

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
    segmentPreviewTitle: "Segment Önizleme",
    quickSegment: "Segment",
    quickCampaign: "Kampanya",
    quickCallNote: "Arama Notu",
    quickReminder: "Hatırlatma",
    quickMessage: "Hızlı Mesaj",
    quickSegmentSubtitle: "Yeni segment tanımı oluştur",
    quickCampaignSubtitle: "Yeni kampanya tanımı oluştur",
    quickCallNoteSubtitle: "Arama sonrası not kaydı oluştur",
    quickReminderSubtitle: "Hatırlatma kaydı oluştur",
    quickMessageSubtitle: "Hızlı mesaj kaydı oluştur",
    filtersTitle: "Filtreler",
    activeFilters: "aktif filtre",
    advancedFilters: "Gelişmiş filtreler",
    hideAdvancedFilters: "Gelişmiş filtreleri gizle",
    presetLabel: "Hazır ayar",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    applyFilters: "Uygula",
    clearFilters: "Temizle",
    customerFilter: "Müşteri",
    allStatuses: "Tüm durumlar",
    allChannels: "Tüm kanallar",
    allReferenceTypes: "Tüm kayıt türleri",
    referenceNameFilter: "Kayıt adı / ID",
    outboxTitle: "Gönderim Kuyruğu",
    draftTitle: "Bildirim Taslakları",
    loading: "Yükleniyor...",
    loadErrorTitle: "İletişim Verisi Yüklenemedi",
    permissionDeniedRead: "İletişim verilerini görüntüleme izniniz yok.",
    permissionDeniedAction: "Bu iletişim işlemini yapma izniniz yok.",
    emptyOutbox: "Gönderim kuyruğu kaydı bulunamadı.",
    emptyOutboxTitle: "Gönderim Kaydı Yok",
    emptyDrafts: "Taslak kaydı bulunamadı.",
    emptyDraftsTitle: "Taslak Kaydı Yok",
    recipient: "Alıcı",
    channel: "Kanal",
    status: "Durum",
    recordType: "Kayıt Türü",
    attempts: "Deneme",
    nextRetry: "Sonraki Deneme",
    actions: "Aksiyonlar",
    error: "Hata",
    retry: "Tekrar Dene",
    sendNow: "Şimdi Gönder",
    openRef: "Kaydı Aç",
    queued: "Sırada",
    processing: "İşleniyor",
    sent: "Gönderildi",
    failed: "Başarısız",
    dead: "Ölü",
    sms: "SMS",
    email: "E-posta",
    whatsapp: "WhatsApp",
    openPolicyPanel: "Poliçeyi Aç",
    openCustomerPanel: "Müşteriyi Aç",
    openOffersPanel: "Teklifler",
    openClaimsPanel: "Hasarlar",
    openPaymentsPanel: "Ödemeler",
    openRenewalsPanel: "Yenilemeler",
    openReconciliationPanel: "Mutabakat",
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
    skippedRows: "Atlanan Satır",
    previewRows: "Önizleme Satırı",
    hasMore: "Daha Fazla",
    yes: "Evet",
    no: "Hayır",
    policies: "Poliçeler",
    overdueInstallments: "Geciken Taksit",
    renewalWindow: "Yenileme Penceresi",
    customerContext: "Müşteri bağlamı",
    referenceContext: "Referans bağlamı",
    startAssignmentContext: "Atamayı İşleme Al",
    blockAssignmentContext: "Atamayı Bloke Et",
    closeAssignmentContext: "Atamayı Kapat",
    clearCallFollowUpContext: "Arama Takibini Temizle",
    completeReminderContext: "Hatırlatıcıyı Tamamla",
    cancelReminderContext: "İptal",
    clearContext: "Bağlamı Temizle",
  },
  en: {
    breadcrumb: "Control Center → Communication",
    recordCount: "records",
    title: "Communication Center",
    subtitle: "Notification queue, distribution and retry operations",
    refresh: "Refresh",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    dispatch: "Run Dispatch",
    dispatching: "Running...",
    runCampaign: "Run Campaign",
    campaignRunTitle: "Run Campaign",
    segmentPreviewTitle: "Segment Preview",
    quickSegment: "Segment",
    quickCampaign: "Campaign",
    quickCallNote: "Call Note",
    quickReminder: "Reminder",
    quickMessage: "Quick Message",
    quickSegmentSubtitle: "Create a new segment definition",
    quickCampaignSubtitle: "Create a new campaign definition",
    quickCallNoteSubtitle: "Create a call follow-up note",
    quickReminderSubtitle: "Create a reminder record",
    quickMessageSubtitle: "Create a quick message record",
    filtersTitle: "Filters",
    activeFilters: "active filters",
    advancedFilters: "Advanced filters",
    hideAdvancedFilters: "Hide advanced filters",
    presetLabel: "Preset",
    savePreset: "Save",
    deletePreset: "Delete",
    applyFilters: "Apply",
    clearFilters: "Clear",
    customerFilter: "Customer",
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
    customerContext: "Customer context",
    referenceContext: "Reference context",
    startAssignmentContext: "Start Assignment",
    blockAssignmentContext: "Block Assignment",
    closeAssignmentContext: "Close Assignment",
    clearCallFollowUpContext: "Clear call follow-up context",
    completeReminderContext: "Complete Reminder",
    cancelReminderContext: "Cancel Reminder",
    clearContext: "Clear context",
  },
};

const activeLocale = computed(() => unref(authStore.locale) || "en");
const recordCount = computed(() => (unref(state.outboxItems)?.length || 0) + (unref(state.draftItems)?.length || 0));

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const filters = communicationStore.state.filters;

const runtime = useCommunicationCenterRuntime({ route, router, branchStore, communicationStore, filters, t });
const state = useCommunicationCenterState({
  route,
  authStore,
  branchStore,
  communicationStore,
  filters,
  t,
  activeLocale,
  runtime,
});
const actions = useCommunicationCenterActions({
  router,
  canRetryOutboxAction: state.canRetryOutboxAction,
  canSendDraftNowAction: state.canSendDraftNowAction,
  referenceTypeLabel: state.referenceTypeLabel,
  t,
});
const quickDialogs = useCommunicationCenterQuickDialogs({
  filters,
  branchStore,
  activeLocale,
  t,
  reloadSnapshot: runtime.reloadSnapshot,
  runtime,
});
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>
