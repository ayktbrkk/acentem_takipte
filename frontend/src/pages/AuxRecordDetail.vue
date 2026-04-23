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
import { translateText } from "../utils/i18n";

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

function t(key) {
  return translateText(key, activeLocale);
}

function localize(v) {
  return typeof v === "string" ? v : v?.[activeLocale.value] || v?.en || v?.tr || "";
}

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
