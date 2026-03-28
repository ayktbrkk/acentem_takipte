<template>
  <QuickCreateManagedDialog
    v-model="showSegmentDialogModel"
    config-key="segment"
    :locale="activeLocale"
    :options-map="communicationQuickOptionsMap"
    :eyebrow="quickSegmentEyebrow"
    :title-override="t('quickSegment')"
    :subtitle-override="t('quickSegmentSubtitle')"
    :show-save-and-open="false"
    :success-handlers="segmentSuccessHandlers"
  />

  <QuickCreateManagedDialog
    v-model="showCampaignDialogModel"
    config-key="campaign"
    :locale="activeLocale"
    :options-map="communicationQuickOptionsMap"
    :eyebrow="quickCampaignEyebrow"
    :title-override="t('quickCampaign')"
    :subtitle-override="t('quickCampaignSubtitle')"
    :show-save-and-open="false"
    :success-handlers="campaignSuccessHandlers"
  />

  <Dialog
    v-model="showCampaignRunDialogModel"
    :options="{
      title: t('campaignRunTitle'),
      size: '3xl',
    }"
  >
    <template #body-content>
      <div class="space-y-4">
        <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
          <select v-model="campaignRunSelectionModel" class="input" data-testid="campaign-run-select">
            <option value="">{{ t("selectCampaign") }}</option>
            <option v-for="option in communicationQuickOptionsMap.campaigns" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <ActionButton
            variant="primary"
            size="sm"
            :disabled="!campaignRunSelection || campaignRunLoading"
            data-testid="campaign-run-submit"
            @click="runCampaignExecution"
          >
            {{ campaignRunLoading ? t("dispatching") : t("runCampaign") }}
          </ActionButton>
        </div>

        <article v-if="campaignRunError" class="qc-error-banner">
          <p class="qc-error-banner__text">{{ campaignRunError }}</p>
        </article>

        <article
          v-else-if="campaignRunResult"
          class="surface-card rounded-xl border border-slate-200 bg-slate-50/80 p-4"
        >
          <div class="grid gap-3 sm:grid-cols-3">
            <div>
              <p class="text-xs uppercase tracking-wide text-slate-500">{{ t("createdDrafts") }}</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ campaignRunResult.created || 0 }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wide text-slate-500">{{ t("skippedRows") }}</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ campaignRunResult.skipped || 0 }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wide text-slate-500">{{ t("matchedCustomers") }}</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ campaignRunResult.matched_customers || 0 }}</p>
            </div>
          </div>
        </article>
      </div>
    </template>
  </Dialog>

  <Dialog
    v-model="showSegmentPreviewDialogModel"
    :options="{
      title: t('segmentPreviewTitle'),
      size: '4xl',
    }"
  >
    <template #body-content>
      <div class="space-y-4">
        <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
          <select v-model="segmentPreviewSegmentModel" class="input" data-testid="segment-preview-select">
            <option value="">{{ t("selectSegment") }}</option>
            <option v-for="option in communicationQuickOptionsMap.segments" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <ActionButton
            variant="primary"
            size="sm"
            :disabled="!segmentPreviewSegment || segmentPreviewLoading"
            data-testid="segment-preview-submit"
            @click="loadSegmentPreview"
          >
            {{ segmentPreviewLoading ? t("loading") : t("previewSegment") }}
          </ActionButton>
        </div>

        <article v-if="segmentPreviewError" class="qc-error-banner">
          <p class="qc-error-banner__text">{{ segmentPreviewError }}</p>
        </article>

        <article
          v-else-if="segmentPreviewSummary"
          class="surface-card rounded-xl border border-slate-200 bg-slate-50/80 p-4"
        >
          <div class="grid gap-3 sm:grid-cols-3">
            <div>
              <p class="text-xs uppercase tracking-wide text-slate-500">{{ t("matchedCustomers") }}</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ segmentPreviewSummary.matched_count || 0 }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wide text-slate-500">{{ t("previewRows") }}</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ segmentPreviewSummary.preview_count || 0 }}</p>
            </div>
            <div>
              <p class="text-xs uppercase tracking-wide text-slate-500">{{ t("hasMore") }}</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ segmentPreviewSummary.has_more ? t("yes") : t("no") }}</p>
            </div>
          </div>
        </article>

        <div v-if="segmentPreviewRows.length" class="overflow-auto">
          <table class="at-table">
            <thead>
              <tr class="at-table-head-row">
                <th class="at-table-head-cell">{{ t("customer") }}</th>
                <th class="at-table-head-cell">{{ t("policies") }}</th>
                <th class="at-table-head-cell">{{ t("overdueInstallments") }}</th>
                <th class="at-table-head-cell">{{ t("renewalWindow") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in segmentPreviewRows" :key="row.name" class="at-table-row">
                <DataTableCell>
                  <p class="font-medium text-slate-800">{{ row.full_name || row.name }}</p>
                  <p class="text-xs text-slate-500">{{ row.name }}</p>
                </DataTableCell>
                <DataTableCell>
                  <span class="text-slate-700">{{ row.active_policy_count || 0 }}</span>
                </DataTableCell>
                <DataTableCell>
                  <span class="text-slate-700">{{ row.has_overdue_installment ? t("yes") : t("no") }}</span>
                </DataTableCell>
                <DataTableCell>
                  <span class="text-slate-700">{{ row.in_renewal_window ? t("yes") : t("no") }}</span>
                </DataTableCell>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </Dialog>

  <QuickCreateManagedDialog
    v-model="showCallNoteDialogModel"
    config-key="call_note"
    :locale="activeLocale"
    :options-map="communicationQuickOptionsMap"
    :eyebrow="quickCallNoteEyebrow"
    :title-override="t('quickCallNote')"
    :subtitle-override="t('quickCallNoteSubtitle')"
    :show-save-and-open="false"
    :before-open="prepareCallNoteDialog"
    :success-handlers="callNoteSuccessHandlers"
  />

  <QuickCreateManagedDialog
    v-model="showReminderDialogModel"
    config-key="reminder"
    :locale="activeLocale"
    :options-map="communicationQuickOptionsMap"
    :eyebrow="quickReminderEyebrow"
    :title-override="t('quickReminder')"
    :subtitle-override="t('quickReminderSubtitle')"
    :show-save-and-open="false"
    :before-open="prepareReminderDialog"
    :success-handlers="reminderSuccessHandlers"
  />

  <QuickCreateManagedDialog
    v-if="canCreateQuickMessage"
    v-model="showQuickMessageDialogModel"
    config-key="communication_message"
    :locale="activeLocale"
    :options-map="communicationQuickOptionsMap"
    :eyebrow="quickMessageEyebrow"
    :title-override="t('quickMessage')"
    :subtitle-override="t('quickMessageSubtitle')"
    :labels="quickMessageDialogLabels"
    :show-save-and-open="canSendDraftNowAction"
    :before-open="prepareQuickMessageDialog"
    :build-payload="buildQuickMessagePayload"
    :success-handlers="quickMessageSuccessHandlers"
  />
</template>

<script setup>
import { computed } from "vue";
import { Dialog } from "frappe-ui";

import ActionButton from "../app-shell/ActionButton.vue";
import DataTableCell from "../app-shell/DataTableCell.vue";
import QuickCreateManagedDialog from "../app-shell/QuickCreateManagedDialog.vue";

const props = defineProps({
  activeLocale: {
    type: String,
    default: "en",
  },
  buildQuickMessagePayload: {
    type: Function,
    required: true,
  },
  canCreateQuickMessage: {
    type: Boolean,
    default: false,
  },
  canSendDraftNowAction: {
    type: Boolean,
    default: false,
  },
  campaignRunError: {
    type: String,
    default: "",
  },
  campaignRunLoading: {
    type: Boolean,
    default: false,
  },
  campaignRunResult: {
    type: Object,
    default: null,
  },
  campaignRunSelection: {
    type: String,
    default: "",
  },
  campaignSuccessHandlers: {
    type: Object,
    default: () => ({}),
  },
  callNoteSuccessHandlers: {
    type: Object,
    default: () => ({}),
  },
  communicationQuickOptionsMap: {
    type: Object,
    default: () => ({}),
  },
  loadSegmentPreview: {
    type: Function,
    required: true,
  },
  prepareCallNoteDialog: {
    type: Function,
    required: true,
  },
  prepareQuickMessageDialog: {
    type: Function,
    required: true,
  },
  prepareReminderDialog: {
    type: Function,
    required: true,
  },
  quickCallNoteEyebrow: {
    type: String,
    default: "",
  },
  quickCampaignEyebrow: {
    type: String,
    default: "",
  },
  quickMessageDialogLabels: {
    type: Object,
    default: () => ({}),
  },
  quickMessageEyebrow: {
    type: String,
    default: "",
  },
  quickMessageSuccessHandlers: {
    type: Object,
    default: () => ({}),
  },
  quickReminderEyebrow: {
    type: String,
    default: "",
  },
  quickSegmentEyebrow: {
    type: String,
    default: "",
  },
  reminderSuccessHandlers: {
    type: Object,
    default: () => ({}),
  },
  runCampaignExecution: {
    type: Function,
    required: true,
  },
  segmentPreviewError: {
    type: String,
    default: "",
  },
  segmentPreviewLoading: {
    type: Boolean,
    default: false,
  },
  segmentPreviewPayload: {
    type: Object,
    default: null,
  },
  segmentPreviewRows: {
    type: Array,
    default: () => [],
  },
  segmentPreviewSegment: {
    type: String,
    default: "",
  },
  segmentPreviewSummary: {
    type: Object,
    default: null,
  },
  segmentSuccessHandlers: {
    type: Object,
    default: () => ({}),
  },
  showCallNoteDialog: {
    type: Boolean,
    default: false,
  },
  showCampaignDialog: {
    type: Boolean,
    default: false,
  },
  showCampaignRunDialog: {
    type: Boolean,
    default: false,
  },
  showQuickMessageDialog: {
    type: Boolean,
    default: false,
  },
  showReminderDialog: {
    type: Boolean,
    default: false,
  },
  showSegmentDialog: {
    type: Boolean,
    default: false,
  },
  showSegmentPreviewDialog: {
    type: Boolean,
    default: false,
  },
  t: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits([
  "update:campaignRunSelection",
  "update:showCallNoteDialog",
  "update:showCampaignDialog",
  "update:showCampaignRunDialog",
  "update:showQuickMessageDialog",
  "update:showReminderDialog",
  "update:showSegmentDialog",
  "update:showSegmentPreviewDialog",
  "update:segmentPreviewSegment",
]);

const campaignRunSelectionModel = computed({
  get: () => props.campaignRunSelection,
  set: (value) => emit("update:campaignRunSelection", value),
});
const segmentPreviewSegmentModel = computed({
  get: () => props.segmentPreviewSegment,
  set: (value) => emit("update:segmentPreviewSegment", value),
});
const showCallNoteDialogModel = computed({
  get: () => props.showCallNoteDialog,
  set: (value) => emit("update:showCallNoteDialog", value),
});
const showCampaignDialogModel = computed({
  get: () => props.showCampaignDialog,
  set: (value) => emit("update:showCampaignDialog", value),
});
const showCampaignRunDialogModel = computed({
  get: () => props.showCampaignRunDialog,
  set: (value) => emit("update:showCampaignRunDialog", value),
});
const showQuickMessageDialogModel = computed({
  get: () => props.showQuickMessageDialog,
  set: (value) => emit("update:showQuickMessageDialog", value),
});
const showReminderDialogModel = computed({
  get: () => props.showReminderDialog,
  set: (value) => emit("update:showReminderDialog", value),
});
const showSegmentDialogModel = computed({
  get: () => props.showSegmentDialog,
  set: (value) => emit("update:showSegmentDialog", value),
});
const showSegmentPreviewDialogModel = computed({
  get: () => props.showSegmentPreviewDialog,
  set: (value) => emit("update:showSegmentPreviewDialog", value),
});
</script>
