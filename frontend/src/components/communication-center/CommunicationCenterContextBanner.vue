<template>
  <article
    v-if="hasContextFilters"
    class="surface-card rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="space-y-1">
        <p v-if="filters.customer" class="text-sm font-medium text-sky-800">
          {{ t("customerContext") }}: {{ customerContextLabel }}
        </p>
        <p v-if="referenceContextLabel" class="text-xs font-medium text-sky-700">
          {{ t("referenceContext") }}: {{ referenceContextLabel }}
        </p>
        <p v-if="channelStatusContextLabel" class="text-xs text-sky-700">
          {{ channelStatusContextLabel }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ActionButton
          v-if="canStartAssignmentContext"
          variant="secondary"
          size="xs"
          @click="onStartAssignmentContext"
        >
          {{ t("startAssignmentContext") }}
        </ActionButton>
        <ActionButton
          v-if="canBlockAssignmentContext"
          variant="secondary"
          size="xs"
          @click="onBlockAssignmentContext"
        >
          {{ t("blockAssignmentContext") }}
        </ActionButton>
        <ActionButton
          v-if="canCloseAssignmentContext"
          variant="secondary"
          size="xs"
          @click="onCloseAssignmentContext"
        >
          {{ t("closeAssignmentContext") }}
        </ActionButton>
        <ActionButton
          v-if="canClearCallNoteContext"
          variant="secondary"
          size="xs"
          @click="onClearCallNoteContext"
        >
          {{ t("clearCallFollowUpContext") }}
        </ActionButton>
        <ActionButton
          v-if="canCompleteReminderContext"
          variant="secondary"
          size="xs"
          @click="onCompleteReminderContext"
        >
          {{ t("completeReminderContext") }}
        </ActionButton>
        <ActionButton
          v-if="canCancelReminderContext"
          variant="secondary"
          size="xs"
          @click="onCancelReminderContext"
        >
          {{ t("cancelReminderContext") }}
        </ActionButton>
        <ActionButton v-if="canReturnToContext" variant="link" size="xs" @click="onReturnToContext">
          {{ returnToLabel }}
        </ActionButton>
        <ActionButton variant="link" size="xs" @click="onClearContextFilters">
          {{ t("clearContext") }}
        </ActionButton>
      </div>
    </div>
  </article>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";

defineProps({
  canBlockAssignmentContext: {
    type: Boolean,
    default: false,
  },
  canCancelReminderContext: {
    type: Boolean,
    default: false,
  },
  canClearCallNoteContext: {
    type: Boolean,
    default: false,
  },
  canCloseAssignmentContext: {
    type: Boolean,
    default: false,
  },
  canCompleteReminderContext: {
    type: Boolean,
    default: false,
  },
  canReturnToContext: {
    type: Boolean,
    default: false,
  },
  canStartAssignmentContext: {
    type: Boolean,
    default: false,
  },
  channelStatusContextLabel: {
    type: String,
    default: "",
  },
  customerContextLabel: {
    type: String,
    default: "",
  },
  filters: {
    type: Object,
    required: true,
  },
  hasContextFilters: {
    type: Boolean,
    default: false,
  },
  onBlockAssignmentContext: {
    type: Function,
    required: true,
  },
  onCancelReminderContext: {
    type: Function,
    required: true,
  },
  onClearCallNoteContext: {
    type: Function,
    required: true,
  },
  onClearContextFilters: {
    type: Function,
    required: true,
  },
  onCloseAssignmentContext: {
    type: Function,
    required: true,
  },
  onCompleteReminderContext: {
    type: Function,
    required: true,
  },
  onReturnToContext: {
    type: Function,
    required: true,
  },
  onStartAssignmentContext: {
    type: Function,
    required: true,
  },
  referenceContextLabel: {
    type: String,
    default: "",
  },
  returnToLabel: {
    type: String,
    default: "",
  },
  t: {
    type: Function,
    required: true,
  },
});
</script>
