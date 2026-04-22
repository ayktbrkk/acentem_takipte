<template>
  <section class="page-shell space-y-4">
    <AuxRecordDetailTopbar
      :config="config"
      :doc="doc"
      :record-title="recordTitle"
      :record-subtitle="recordSubtitle"
      :list-label="localize(config.labels?.list)"
      :copied-record-key="copiedRecordKey"
      :t="t"
      :can-open-communication-context="canOpenCommunicationContext"
      :can-send-draft-lifecycle="canSendDraftLifecycle"
      :can-retry-outbox-lifecycle="canRetryOutboxLifecycle"
      :can-requeue-outbox-lifecycle="canRequeueOutboxLifecycle"
      :can-start-task-lifecycle="canStartTaskLifecycle"
      :can-block-task-lifecycle="canBlockTaskLifecycle"
      :can-complete-task-lifecycle="canCompleteTaskLifecycle"
      :can-cancel-task-lifecycle="canCancelTaskLifecycle"
      :can-complete-reminder-lifecycle="canCompleteReminderLifecycle"
      :can-cancel-reminder-lifecycle="canCancelReminderLifecycle"
      :can-start-assignment-lifecycle="canStartAssignmentLifecycle"
      :can-block-assignment-lifecycle="canBlockAssignmentLifecycle"
      :can-close-assignment-lifecycle="canCloseAssignmentLifecycle"
      :quick-edit-config="quickEditConfig"
      :can-use-quick-edit="canUseQuickEdit"
      :panel-config="panelConfig"
      :can-open-document="canOpenDocument"
      :can-archive-document="canArchiveDocument"
      :can-restore-document="canRestoreDocument"
      :can-permanent-delete-document="canPermanentDeleteDocument"
      :show-desk-action="showDeskAction"
      :go-back="goBack"
      :copy-record-value="copyRecordValue"
      :open-communication-context="openCommunicationContext"
      :send-draft-lifecycle="sendDraftLifecycle"
      :retry-outbox-lifecycle="retryOutboxLifecycle"
      :requeue-outbox-lifecycle="requeueOutboxLifecycle"
      :mark-task-lifecycle="markTaskLifecycle"
      :mark-reminder-lifecycle="markReminderLifecycle"
      :mark-assignment-lifecycle="markAssignmentLifecycle"
      :open-panel="openPanel"
      :open-document="openDocument"
      :archive-document="archiveDocument"
      :restore-document="restoreDocument"
      :permanent-delete-document="permanentDeleteDocument"
      :open-desk="openDesk"
      @open-quick-edit="showQuickEditDialog = true"
    />

    <AuxRecordDetailHero :cells="summaryItems" />

    <div v-if="activeLoading && !doc" class="surface-card rounded-2xl p-5">
      <div class="card-empty">{{ t("loading") }}</div>
    </div>

    <article v-else-if="errorText" class="qc-error-banner">
      <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
      <p class="qc-error-banner__text mt-1">{{ errorText }}</p>
    </article>

    <div v-else-if="isEmpty" class="surface-card rounded-2xl p-5">
      <p class="card-empty">{{ t("emptyTitle") }}</p>
      <p class="mt-2 text-sm text-slate-500">{{ t("emptyDescription") }}</p>
    </div>

    <div v-else class="detail-body">
      <AuxRecordDetailContent
        v-model:active-detail-tab="activeDetailTab"
        :detail-tabs="detailTabs"
        :visible-groups="visibleGroups"
        :related-record-cards="relatedRecordCards"
        :activity-items="activityItems"
        :visible-text-blocks="visibleTextBlocks"
        :group-title="groupTitle"
        :group-items="groupItems"
        :field-label="fieldLabel"
        :t="t"
      />

      <AuxRecordDetailSidebar
        :special-badges="specialBadges"
        :record-title="recordTitle"
        :summary-items="summaryItems"
        :state-summary-label="t('stateSummary')"
        :no-decision-context-text="t('noDecisionContext')"
      />
    </div>

    <AuxRecordDetailQuickEditDialog
      v-model="showQuickEditDialog"
      :quick-edit-config="quickEditConfig"
      :active-locale="activeLocale"
      :quick-edit-options-map="quickEditOptionsMap"
      :quick-edit-eyebrow="quickEditEyebrow"
      :prepare-quick-edit-dialog="prepareQuickEditDialog"
      :build-quick-edit-payload="buildQuickEditPayload"
      :after-quick-edit-submit="afterQuickEditSubmit"
      :quick-edit-success-handlers="quickEditSuccessHandlers"
      :labels="{ save: t('saveChanges'), cancel: t('cancel') }"
    />
  </section>
</template>

<script setup>
import { computed, unref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { getAuxWorkbenchConfig } from "../config/auxWorkbenchConfigs";
import { deskActionsEnabled } from "../utils/deskActions";
import { useAuxRecordDetailRuntime } from "../composables/useAuxRecordDetailRuntime";
import { useAuxRecordDetailSummary } from "../composables/useAuxRecordDetailSummary";
import { useAuxRecordDetailActions } from "../composables/useAuxRecordDetailActions";
import { useAuxRecordDetailQuickDialogs } from "../composables/useAuxRecordDetailQuickDialogs";
import AuxRecordDetailTopbar from "../components/aux-record-detail/AuxRecordDetailTopbar.vue";
import AuxRecordDetailHero from "../components/aux-record-detail/AuxRecordDetailHero.vue";
import AuxRecordDetailContent from "../components/aux-record-detail/AuxRecordDetailContent.vue";
import AuxRecordDetailSidebar from "../components/aux-record-detail/AuxRecordDetailSidebar.vue";
import AuxRecordDetailQuickEditDialog from "../components/aux-record-detail/AuxRecordDetailQuickEditDialog.vue";

const props = defineProps({
  screenKey: { type: String, required: true },
  name: { type: String, required: true },
});

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const branchStore = useBranchStore();
const activeLocale = computed(() => unref(authStore.locale) || "en");
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
const config = getAuxWorkbenchConfig(props.screenKey);
const showDeskAction = deskActionsEnabled();

if (!config) {
  throw new Error(`Unknown aux workbench screen: ${props.screenKey}`);
}

const copy = {
  tr: {
    backToList: "Listeye Dön",
    quickEdit: "Hızlı Düzenle",
    openDesk: "Yönetim Ekranını Aç",
    panel: "Bağlı Kayda Git",
    openDocument: "Dokümanı Aç",
    archiveDocument: "Arşivle",
    restoreDocument: "Geri Yükle",
    permanentDeleteDocument: "Kalıcı Sil",
    archiveConfirm: "Bu doküman arşivlensin mi?",
    restoreConfirm: "Bu doküman geri yüklensin mi?",
    permanentDeleteConfirm: "Bu doküman ve bağlı dosyası kalıcı olarak silinecek. Devam edilsin mi?",
    saveChanges: "Değişiklikleri Kaydet",
    cancel: "İptal",
    copy: "Kopyala",
    copied: "Kopyalandı",
    openCommunication: "İletişim Merkezini Aç",
    sendNow: "Hemen Gönder",
    retry: "Tekrar Dene",
    requeue: "Kuyruğa Al",
    startTask: "Takibe Al",
    blockTaskAction: "Bloke Et",
    completeTaskAction: "Tamamla",
    cancelTaskAction: "İptal",
    loading: "Kayıt yükleniyor...",
    loadErrorTitle: "Kayıt Yüklenemedi",
    emptyTitle: "Kayıt bulunamadı",
    emptyDescription: "Kayıt silinmiş veya erişim yetkiniz olmayabilir.",
    stateSummary: "Durum Özeti",
    accountingAmounts: "Tutarlar",
    accountingSource: "Kaynak Bağlamı",
    accountingSync: "Senkronizasyon",
    templateMeta: "Şablon Özeti",
    templateLifecycle: "Yayın ve Kayıt",
    outboxDelivery: "Gönderim Özeti",
    outboxRetry: "Deneme ve Zamanlama",
    outboxReference: "Bağlı Kayıtlar",
    outboxQueue: "Kuyruk ve İşlem",
    bodyTemplate: "Şablon İçeriği",
    payloadJson: "Payload (JSON)",
    responseLog: "Sağlayıcı Yanıtı",
    tabOverview: "Genel",
    tabRelated: "İlişkili",
    tabActivity: "Aktivite",
    tabOperations: "Operasyon",
    tabLogs: "Loglar",
    relatedTitle: "İlişkili Kayıtlar",
    noRelatedRecords: "İlişkili kayıt bulunamadı.",
    activityTitle: "Aktivite",
    noActivity: "Aktivite kaydı bulunamadı.",
    relatedCustomer: "Müşteri",
    relatedPolicy: "Poliçe",
    relatedDraft: "Bildirim Taslağı",
    relatedOutbox: "Giden Bildirim",
    relatedAccountingEntry: "Muhasebe Kaydı",
    relatedReference: "Referans Kayıt",
    relatedSource: "Kaynak Kayıt",
    snapshotContext: "Snapshot Bağlamı",
    snapshotSignals: "Segment Sinyalleri",
    strengthSignals: "Güçlü Sinyaller",
    riskSignals: "Risk Sinyalleri",
    scoreReasons: "Skor Gerekçeleri",
    noSignals: "Kayıtlı sinyal bulunamadı.",
    assignmentContext: "Atama Bağlamı",
    assignmentLifecycle: "Atama Yaşam Döngüsü",
    assignmentNotes: "Atama Notları",
    startAssignment: "İşleme Al",
    blockAssignment: "Bloke Et",
    closeAssignment: "Kapat",
    auditContext: "Kayıt Bağlamı",
    auditDecision: "Karar ve Eylem",
    auditActionSummary: "Eylem Özeti",
    auditDecisionContext: "Karar Bağlamı",
    noDecisionContext: "Karar bağlamı girilmemiş.",
    reconciliationContextTitle: "Kaynak ve Kayıt Bağlamı",
    reconciliationAmountsTitle: "Mutabakat Tutar Özeti",
    reconciliationResolutionTitle: "Çözüm ve Yaşam Döngüsü",
    baseInfo: "Temel Bilgiler",
    scheduleInfo: "Takvim",
    assignmentInfo: "Atama",
    draftInfo: "Taslak Bilgisi",
    deliveryInfo: "Gönderim Bilgisi",
    referenceContext: "Kaynak Bağlamı",
    createdAt: "Oluşturma",
    modifiedAt: "Güncelleme",
    resolvedAt: "Çözülme",
    sentAt: "Gönderim",
    lastAttemptAt: "Son Deneme",
    nextRetryAt: "Sonraki Deneme",
    lastSyncedAt: "Son Senkron",
    officeBranch: "Ofis Şubesi",
  },
  en: {
    backToList: "Back to List",
    quickEdit: "Quick Edit",
    openDesk: "Open Desk",
    panel: "Go to Linked Record",
    openDocument: "Open Document",
    archiveDocument: "Archive",
    restoreDocument: "Restore",
    permanentDeleteDocument: "Delete Permanently",
    archiveConfirm: "Archive this document?",
    restoreConfirm: "Restore this document?",
    permanentDeleteConfirm: "This document and its linked file will be permanently deleted. Continue?",
    saveChanges: "Save Changes",
    cancel: "Cancel",
    copy: "Copy",
    copied: "Copied",
    openCommunication: "Open Communication Center",
    sendNow: "Send Now",
    retry: "Retry",
    requeue: "Requeue",
    startTask: "Start",
    blockTaskAction: "Block",
    completeTaskAction: "Mark Done",
    cancelTaskAction: "Cancel",
    loading: "Loading record...",
    loadErrorTitle: "Failed to Load",
    emptyTitle: "Record not found",
    emptyDescription: "The record may be deleted or inaccessible.",
    stateSummary: "State Summary",
    accountingAmounts: "Amounts",
    accountingSource: "Source Context",
    accountingSync: "Sync",
    templateMeta: "Template Summary",
    templateLifecycle: "Publish & Record",
    outboxDelivery: "Delivery Summary",
    outboxRetry: "Attempts & Schedule",
    outboxReference: "Related Records",
    outboxQueue: "Queue & Processing",
    bodyTemplate: "Template Body",
    payloadJson: "Payload (JSON)",
    responseLog: "Provider Response",
    tabOverview: "Overview",
    tabRelated: "Related",
    tabActivity: "Activity",
    tabOperations: "Operations",
    tabLogs: "Logs",
    relatedTitle: "Related Records",
    noRelatedRecords: "No related records found.",
    activityTitle: "Activity",
    noActivity: "No activity records found.",
    relatedCustomer: "Customer",
    relatedPolicy: "Policy",
    relatedDraft: "Notification Draft",
    relatedOutbox: "Notification Outbox",
    relatedAccountingEntry: "Accounting Entry",
    relatedReference: "Reference Record",
    relatedSource: "Source Record",
    snapshotContext: "Snapshot Context",
    snapshotSignals: "Segment Signals",
    strengthSignals: "Strength Signals",
    riskSignals: "Risk Signals",
    scoreReasons: "Score Reasons",
    noSignals: "No signals recorded.",
    assignmentContext: "Assignment Context",
    assignmentLifecycle: "Assignment Lifecycle",
    assignmentNotes: "Assignment Notes",
    startAssignment: "Start",
    blockAssignment: "Block",
    closeAssignment: "Close",
    auditContext: "Record Context",
    auditDecision: "Decision & Action",
    auditActionSummary: "Action Summary",
    auditDecisionContext: "Decision Context",
    noDecisionContext: "No decision context recorded.",
    reconciliationContextTitle: "Source & Record Context",
    reconciliationAmountsTitle: "Reconciliation Amount Summary",
    reconciliationResolutionTitle: "Resolution & Lifecycle",
    baseInfo: "Base Info",
    scheduleInfo: "Schedule",
    assignmentInfo: "Assignment",
    draftInfo: "Draft Info",
    deliveryInfo: "Delivery Info",
    referenceContext: "Reference Context",
    createdAt: "Created",
    modifiedAt: "Modified",
    resolvedAt: "Resolved",
    sentAt: "Sent",
    lastAttemptAt: "Last Attempt",
    nextRetryAt: "Next Retry",
    lastSyncedAt: "Last Synced",
    officeBranch: "Office Branch",
  },
};
function t(key) { return copy[activeLocale.value]?.[key] || copy.en[key] || key; }
function localize(v) { return typeof v === "string" ? v : v?.[activeLocale.value] || v?.en || v?.tr || ""; }

const detailRuntime = useAuxRecordDetailRuntime({
  props,
  config,
  activeLocale,
  localeCode,
  authStore,
  branchStore,
  route,
  router,
  localize,
  t,
});

const {
  resource,
  resolvedDoctype,
  activeDoctype,
  activeResource,
  activeLoading,
  doc,
  errorText,
  isEmpty,
  activeDetailTab,
  campaignDraftsResource,
  campaignOutboxResource,
  reloadDetail,
} = detailRuntime;

const detailSummary = useAuxRecordDetailSummary({
  doc,
  config,
  activeLocale,
  localeCode,
  t,
  localize,
  activeDetailTab,
  campaignDraftsResource,
  campaignOutboxResource,
});

const {
  recordTitle,
  recordSubtitle,
  summaryItems,
  specialBadges,
  detailTabs,
  visibleGroups,
  visibleTextBlocks,
  relatedRecordCards,
  activityItems,
  groupTitle,
  groupItems,
  fieldLabel,
} = detailSummary;

const detailActions = useAuxRecordDetailActions({
  props,
  config,
  authStore,
  t,
  route,
  router,
  activeDoctype,
  doc,
  reloadDetail,
});

const {
  sendDraftLifecycle,
  retryOutboxLifecycle,
  requeueOutboxLifecycle,
  markTaskLifecycle,
  markReminderLifecycle,
  markAssignmentLifecycle,
  goBack,
  openCommunicationContext,
  openDesk,
  openPanel,
  openDocument,
  archiveDocument,
  restoreDocument,
  permanentDeleteDocument,
  panelConfig,
  canOpenDocument,
  canArchiveDocument: canArchiveDocumentFn,
  canRestoreDocument: canRestoreDocumentFn,
  canPermanentDeleteDocument: canPermanentDeleteDocumentFn,
  canOpenCommunicationContext,
  isTaskDetail,
  isReminderDetail,
  isOwnershipAssignmentDetail,
  canSendDraftLifecycle,
  canRetryOutboxLifecycle,
  canRequeueOutboxLifecycle,
  canStartTaskLifecycle,
  canBlockTaskLifecycle,
  canCompleteTaskLifecycle,
  canCancelTaskLifecycle,
  canCompleteReminderLifecycle,
  canCancelReminderLifecycle,
  canStartAssignmentLifecycle,
  canBlockAssignmentLifecycle,
  canCloseAssignmentLifecycle,
} = detailActions;

const canArchiveDocument = computed(() => canArchiveDocumentFn(doc.value));
const canRestoreDocument = computed(() => canRestoreDocumentFn(doc.value));
const canPermanentDeleteDocument = computed(() => canPermanentDeleteDocumentFn(doc.value));

const detailQuickDialogs = useAuxRecordDetailQuickDialogs({
  props,
  config,
  activeLocale,
  authStore,
  branchStore,
  activeDoctype,
  doc,
  reloadDetail,
  localize,
  t,
});

const {
  showQuickEditDialog,
  quickEditConfig,
  quickEditEyebrow,
  canUseQuickEdit,
  copiedRecordKey,
  copyRecordValue,
  prepareQuickEditDialog,
  buildQuickEditPayload,
  afterQuickEditSubmit,
  quickEditOptionsMap,
  quickEditSuccessHandlers,
} = detailQuickDialogs;

</script>
