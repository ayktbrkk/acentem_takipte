<script setup>
import ActionButton from "../app-shell/ActionButton.vue";
import StatusBadge from "../ui/StatusBadge.vue";

defineProps({
  config: {
    type: Object,
    required: true,
  },
  doc: {
    type: Object,
    default: null,
  },
  recordTitle: {
    type: String,
    required: true,
  },
  recordSubtitle: {
    type: String,
    required: true,
  },
  listLabel: {
    type: String,
    default: "",
  },
  copiedRecordKey: {
    type: String,
    default: "",
  },
  t: {
    type: Function,
    required: true,
  },
  canOpenCommunicationContext: {
    type: Boolean,
    default: false,
  },
  canSendDraftLifecycle: {
    type: Boolean,
    default: false,
  },
  canRetryOutboxLifecycle: {
    type: Boolean,
    default: false,
  },
  canRequeueOutboxLifecycle: {
    type: Boolean,
    default: false,
  },
  canStartTaskLifecycle: {
    type: Boolean,
    default: false,
  },
  canBlockTaskLifecycle: {
    type: Boolean,
    default: false,
  },
  canCompleteTaskLifecycle: {
    type: Boolean,
    default: false,
  },
  canCancelTaskLifecycle: {
    type: Boolean,
    default: false,
  },
  canCompleteReminderLifecycle: {
    type: Boolean,
    default: false,
  },
  canCancelReminderLifecycle: {
    type: Boolean,
    default: false,
  },
  canStartAssignmentLifecycle: {
    type: Boolean,
    default: false,
  },
  canBlockAssignmentLifecycle: {
    type: Boolean,
    default: false,
  },
  canCloseAssignmentLifecycle: {
    type: Boolean,
    default: false,
  },
  quickEditConfig: {
    type: Object,
    default: null,
  },
  canUseQuickEdit: {
    type: Boolean,
    default: false,
  },
  panelConfig: {
    type: Object,
    default: null,
  },
  canOpenDocument: {
    type: Boolean,
    default: false,
  },
  showDeskAction: {
    type: Boolean,
    default: false,
  },
  goBack: {
    type: Function,
    required: true,
  },
  copyRecordValue: {
    type: Function,
    required: true,
  },
  openCommunicationContext: {
    type: Function,
    required: true,
  },
  sendDraftLifecycle: {
    type: Function,
    required: true,
  },
  retryOutboxLifecycle: {
    type: Function,
    required: true,
  },
  requeueOutboxLifecycle: {
    type: Function,
    required: true,
  },
  markTaskLifecycle: {
    type: Function,
    required: true,
  },
  markReminderLifecycle: {
    type: Function,
    required: true,
  },
  markAssignmentLifecycle: {
    type: Function,
    required: true,
  },
  openPanel: {
    type: Function,
    required: true,
  },
  openDocument: {
    type: Function,
    required: true,
  },
  openDesk: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["open-quick-edit"]);
</script>

<template>
  <div class="detail-topbar">
    <div class="min-w-0">
      <p class="detail-breadcrumb">{{ listLabel }}</p>
      <h1 class="detail-title">
        {{ recordTitle }}
        <StatusBadge
          v-if="doc?.[config.statusField]"
          :domain="config.statusType || 'policy'"
          :status="String(doc?.[config.statusField])"
        />
        <StatusBadge
          v-if="doc?.[config.secondaryStatusField]"
          :domain="config.secondaryStatusType || 'policy'"
          :status="String(doc?.[config.secondaryStatusField])"
        />
      </h1>
      <p class="detail-subtitle">{{ recordSubtitle }}</p>
      <div class="mt-1.5 flex flex-wrap items-center gap-2">
        <button class="copy-tag" type="button" @click="copyRecordValue(doc?.name || '', 'recordNo')">
          {{ copiedRecordKey === 'recordNo' ? t('copied') : (doc?.name || '-') }}
        </button>
        <button
          v-if="doc?.[config.titleField]"
          class="copy-tag"
          type="button"
          @click="copyRecordValue(String(doc?.[config.titleField] || ''), 'recordTitle')"
        >
          {{ copiedRecordKey === 'recordTitle' ? t('copied') : (doc?.[config.titleField] || '-') }}
        </button>
      </div>
    </div>
    <div class="flex flex-wrap items-center justify-end gap-2">
      <ActionButton variant="secondary" size="xs" @click="goBack">{{ t('backToList') }}</ActionButton>
      <ActionButton
        v-if="canOpenCommunicationContext"
        variant="secondary"
        size="xs"
        @click="openCommunicationContext"
      >
        {{ t('openCommunication') }}
      </ActionButton>
      <ActionButton v-if="canSendDraftLifecycle" variant="secondary" size="xs" @click="sendDraftLifecycle">
        {{ t('sendNow') }}
      </ActionButton>
      <ActionButton v-if="canRetryOutboxLifecycle" variant="secondary" size="xs" @click="retryOutboxLifecycle">
        {{ t('retry') }}
      </ActionButton>
      <ActionButton v-if="canRequeueOutboxLifecycle" variant="secondary" size="xs" @click="requeueOutboxLifecycle">
        {{ t('requeue') }}
      </ActionButton>
      <ActionButton v-if="canStartTaskLifecycle" variant="secondary" size="xs" @click="markTaskLifecycle('In Progress')">
        {{ t('startTask') }}
      </ActionButton>
      <ActionButton v-if="canBlockTaskLifecycle" variant="secondary" size="xs" @click="markTaskLifecycle('Blocked')">
        {{ t('blockTaskAction') }}
      </ActionButton>
      <ActionButton v-if="canCompleteTaskLifecycle" variant="secondary" size="xs" @click="markTaskLifecycle('Done')">
        {{ t('completeTaskAction') }}
      </ActionButton>
      <ActionButton v-if="canCancelTaskLifecycle" variant="secondary" size="xs" @click="markTaskLifecycle('Cancelled')">
        {{ t('cancelTaskAction') }}
      </ActionButton>
      <ActionButton v-if="canCompleteReminderLifecycle" variant="secondary" size="xs" @click="markReminderLifecycle('Done')">
        {{ t('completeTaskAction') }}
      </ActionButton>
      <ActionButton v-if="canCancelReminderLifecycle" variant="secondary" size="xs" @click="markReminderLifecycle('Cancelled')">
        {{ t('cancelTaskAction') }}
      </ActionButton>
      <ActionButton
        v-if="canStartAssignmentLifecycle"
        variant="secondary"
        size="xs"
        @click="markAssignmentLifecycle('In Progress')"
      >
        {{ t('startAssignment') }}
      </ActionButton>
      <ActionButton
        v-if="canBlockAssignmentLifecycle"
        variant="secondary"
        size="xs"
        @click="markAssignmentLifecycle('Blocked')"
      >
        {{ t('blockAssignment') }}
      </ActionButton>
      <ActionButton v-if="canCloseAssignmentLifecycle" variant="secondary" size="xs" @click="markAssignmentLifecycle('Done')">
        {{ t('closeAssignment') }}
      </ActionButton>
      <ActionButton
        v-if="quickEditConfig && canUseQuickEdit"
        variant="secondary"
        size="xs"
        @click="emit('open-quick-edit')"
      >
        {{ t('quickEdit') }}
      </ActionButton>
      <ActionButton v-if="canOpenDocument" variant="secondary" size="xs" @click="openDocument">
        {{ t('openDocument') }}
      </ActionButton>
      <ActionButton v-if="panelConfig" variant="link" size="xs" trailing-icon=">" @click="openPanel">
        {{ t('panel') }}
      </ActionButton>
      <ActionButton v-if="showDeskAction" variant="secondary" size="xs" @click="openDesk">
        {{ t('openDesk') }}
      </ActionButton>
    </div>
  </div>
</template>
