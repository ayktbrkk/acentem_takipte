<template>
  <WorkbenchPageLayout
    :breadcrumb="listLabel"
    :title="recordTitle"
    :subtitle="recordSubtitle"
  >
    <template #actions>
      <ActionButton variant="secondary" size="sm" @click="goBack">
        {{ t('backToList') }}
      </ActionButton>
      <ActionButton
        v-if="canOpenCommunicationContext"
        variant="secondary"
        size="sm"
        @click="openCommunicationContext"
      >
        <FeatherIcon name="message-square" class="h-4 w-4" />
        {{ t('openCommunication') }}
      </ActionButton>
      <ActionButton v-if="canSendDraftLifecycle" variant="secondary" size="sm" @click="sendDraftLifecycle">
        <FeatherIcon name="send" class="h-4 w-4" />
        {{ t('sendNow') }}
      </ActionButton>
      <ActionButton v-if="canRetryOutboxLifecycle" variant="secondary" size="sm" @click="retryOutboxLifecycle">
        <FeatherIcon name="refresh-cw" class="h-4 w-4" />
        {{ t('retry') }}
      </ActionButton>
      <ActionButton v-if="canRequeueOutboxLifecycle" variant="secondary" size="sm" @click="requeueOutboxLifecycle">
        <FeatherIcon name="rotate-cw" class="h-4 w-4" />
        {{ t('requeue') }}
      </ActionButton>
      <ActionButton v-if="canStartTaskLifecycle" variant="secondary" size="sm" @click="markTaskLifecycle('In Progress')">
        <FeatherIcon name="play" class="h-4 w-4" />
        {{ t('startTask') }}
      </ActionButton>
      <ActionButton v-if="canBlockTaskLifecycle" variant="secondary" size="sm" @click="markTaskLifecycle('Blocked')">
        <FeatherIcon name="pause-circle" class="h-4 w-4" />
        {{ t('blockTaskAction') }}
      </ActionButton>
      <ActionButton v-if="canCompleteTaskLifecycle" variant="secondary" size="sm" @click="markTaskLifecycle('Done')">
        <FeatherIcon name="check-circle" class="h-4 w-4" />
        {{ t('completeTaskAction') }}
      </ActionButton>
      <ActionButton v-if="canCancelTaskLifecycle" variant="ghost" size="sm" @click="markTaskLifecycle('Cancelled')">
        <FeatherIcon name="x-circle" class="h-4 w-4" />
        {{ t('cancelTaskAction') }}
      </ActionButton>
      <ActionButton v-if="canCompleteReminderLifecycle" variant="secondary" size="sm" @click="markReminderLifecycle('Done')">
        <FeatherIcon name="check-circle" class="h-4 w-4" />
        {{ t('completeReminderAction') }}
      </ActionButton>
      <ActionButton v-if="canCancelReminderLifecycle" variant="ghost" size="sm" @click="markReminderLifecycle('Cancelled')">
        <FeatherIcon name="x-circle" class="h-4 w-4" />
        {{ t('cancelReminderAction') }}
      </ActionButton>
      <ActionButton v-if="canStartAssignmentLifecycle" variant="secondary" size="sm" @click="markAssignmentLifecycle('In Progress')">
        <FeatherIcon name="play" class="h-4 w-4" />
        {{ t('startAssignment') }}
      </ActionButton>
      <ActionButton v-if="canBlockAssignmentLifecycle" variant="secondary" size="sm" @click="markAssignmentLifecycle('Blocked')">
        <FeatherIcon name="pause-circle" class="h-4 w-4" />
        {{ t('blockAssignment') }}
      </ActionButton>
      <ActionButton v-if="canCloseAssignmentLifecycle" variant="secondary" size="sm" @click="markAssignmentLifecycle('Done')">
        <FeatherIcon name="check-circle" class="h-4 w-4" />
        {{ t('closeAssignment') }}
      </ActionButton>
      <ActionButton v-if="canResolveReconciliationLifecycle" variant="secondary" size="sm" @click="resolveReconciliationLifecycle('Matched')">
        <FeatherIcon name="check" class="h-4 w-4" />
        {{ t('resolveReconciliation') }}
      </ActionButton>
      <ActionButton v-if="canIgnoreReconciliationLifecycle" variant="ghost" size="sm" @click="resolveReconciliationLifecycle('Ignored')">
        <FeatherIcon name="slash" class="h-4 w-4" />
        {{ t('ignoreReconciliation') }}
      </ActionButton>
      <ActionButton
        v-if="quickEditConfig && canUseQuickEdit"
        variant="secondary"
        size="sm"
        @click="showQuickEditDialog = true"
      >
        <FeatherIcon name="edit-3" class="h-4 w-4" />
        {{ t('quickEdit') }}
      </ActionButton>
      <ActionButton v-if="panelConfig?.url" variant="secondary" size="sm" @click="openPanel">
        <FeatherIcon name="link-2" class="h-4 w-4" />
        {{ t('panel') }}
      </ActionButton>
      <ActionButton v-if="canOpenDocument" variant="secondary" size="sm" @click="openDocument">
        <FeatherIcon name="file-text" class="h-4 w-4" />
        {{ t('openDocument') }}
      </ActionButton>
      <ActionButton v-if="canArchiveDocument" variant="secondary" size="sm" @click="archiveDocument">
        <FeatherIcon name="archive" class="h-4 w-4" />
        {{ t('archiveDocument') }}
      </ActionButton>
      <ActionButton v-if="canRestoreDocument" variant="secondary" size="sm" @click="restoreDocument">
        <FeatherIcon name="rotate-ccw" class="h-4 w-4" />
        {{ t('restoreDocument') }}
      </ActionButton>
      <ActionButton v-if="canPermanentDeleteDocument" variant="ghost" size="sm" @click="permanentDeleteDocument">
        <FeatherIcon name="trash-2" class="h-4 w-4" />
        {{ t('permanentDeleteDocument') }}
      </ActionButton>
      <ActionButton v-if="showDeskAction" variant="secondary" size="sm" @click="openDesk">
        <FeatherIcon name="external-link" class="h-4 w-4" />
        {{ t('openDesk') }}
      </ActionButton>
    </template>

    <template #metrics>
      <div v-if="!activeLoading" class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SaaSMetricCard
          v-for="cell in summaryItems"
          :key="cell.label"
          :label="cell.label"
          :value="cell.value"
        />
      </div>
      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
      </div>
    </template>

    <div v-if="activeLoading && !doc" class="surface-card rounded-2xl p-5">
      <SkeletonLoader variant="detail" />
    </div>

    <article v-else-if="errorText" class="qc-error-banner flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
        <p class="qc-error-banner__text mt-1">{{ errorText }}</p>
      </div>
      <ActionButton variant="secondary" size="sm" :disabled="activeLoading" @click="reloadDetail">
        {{ t("retry") }}
      </ActionButton>
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
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { getAuxWorkbenchConfig } from "../config/auxWorkbenchConfigs";
import { AUX_DETAIL_TRANSLATIONS } from "../config/aux_detail_translations";
import { deskActionsEnabled } from "../utils/deskActions";
import { useAuxRecordDetailRuntime } from "../composables/useAuxRecordDetailRuntime";
import { useAuxRecordDetailSummary } from "../composables/useAuxRecordDetailSummary";
import AuxRecordDetailContent from "../components/aux-record-detail/AuxRecordDetailContent.vue";
import AuxRecordDetailSidebar from "../components/aux-record-detail/AuxRecordDetailSidebar.vue";
import AuxRecordDetailQuickEditDialog from "../components/aux-record-detail/AuxRecordDetailQuickEditDialog.vue";
import { useAuxRecordDetailActions } from "../composables/useAuxRecordDetailActions";
import { useAuxRecordDetailQuickDialogs } from "../composables/useAuxRecordDetailQuickDialogs";
import { FeatherIcon } from "frappe-ui";
import ActionButton from "../components/app-shell/ActionButton.vue";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SkeletonLoader from "../components/ui/SkeletonLoader.vue";
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
  const locale = String(unref(activeLocale) || "en").toLowerCase().startsWith("tr") ? "tr" : "en";
  return AUX_DETAIL_TRANSLATIONS[locale]?.[key] || AUX_DETAIL_TRANSLATIONS.en?.[key] || translateText(key, activeLocale);
}

function localize(v) {
  return typeof v === "string" ? v : v?.[activeLocale.value] || v?.en || v?.tr || "";
}

const listLabel = computed(() => localize(config.labels?.list));

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
  canArchiveDocument,
  canRestoreDocument,
  canPermanentDeleteDocument,
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
  canResolveReconciliationLifecycle,
  canIgnoreReconciliationLifecycle,
  resolveReconciliationLifecycle,
} = detailActions;

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
