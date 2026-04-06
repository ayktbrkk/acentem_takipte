<template>
  <QuickCreateManagedDialog
    v-model="segmentDialogModel"
    config-key="segment"
    :locale="activeLocale"
    :options-map="communicationQuickOptionsMap"
    :eyebrow="quickSegmentEyebrow"
    :title-override="t('quickSegment')"
    :subtitle-override="t('quickSegmentSubtitle')"
    :show-save-and-open="false"
    :success-handlers="quickDialogs.segmentSuccessHandlers"
  />

  <QuickCreateManagedDialog
    v-model="campaignDialogModel"
    config-key="campaign"
    :locale="activeLocale"
    :options-map="communicationQuickOptionsMap"
    :eyebrow="quickCampaignEyebrow"
    :title-override="t('quickCampaign')"
    :subtitle-override="t('quickCampaignSubtitle')"
    :show-save-and-open="false"
    :success-handlers="quickDialogs.campaignSuccessHandlers"
  />

  <Dialog
    v-model="campaignRunDialogModel"
    :options="{
      title: t('campaignRunTitle'),
      size: '3xl',
    }"
  >
    <template #body-content>
      <div class="space-y-4">
        <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
          <select v-model="campaignRunSelection" class="input" data-testid="campaign-run-select">
            <option value="">{{ t('selectCampaign') }}</option>
            <option v-for="option in communicationQuickOptionsMap.campaigns" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <ActionButton
            variant="primary"
            size="sm"
            :disabled="!campaignRunSelection || campaignRunLoading"
            data-testid="campaign-run-submit"
            @click="runtime.runCampaignExecution"
          >
            {{ campaignRunLoading ? t('dispatching') : t('runCampaign') }}
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
              <p class="text-xs tracking-wide text-slate-500">{{ t('createdDrafts') }}</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ campaignRunResult.created || 0 }}</p>
            </div>
            <div>
              <p class="text-xs tracking-wide text-slate-500">{{ t('skippedRows') }}</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ campaignRunResult.skipped || 0 }}</p>
            </div>
            <div>
              <p class="text-xs tracking-wide text-slate-500">{{ t('matchedCustomers') }}</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ campaignRunResult.matched_customers || 0 }}</p>
            </div>
          </div>
        </article>
      </div>
    </template>
  </Dialog>

  <Dialog
    v-model="segmentPreviewDialogModel"
    :options="{
      title: t('segmentPreviewTitle'),
      size: '4xl',
    }"
  >
    <template #body-content>
      <div class="space-y-4">
        <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
          <select v-model="segmentPreviewSegment" class="input" data-testid="segment-preview-select">
            <option value="">{{ t('selectSegment') }}</option>
            <option v-for="option in communicationQuickOptionsMap.segments" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <ActionButton
            variant="primary"
            size="sm"
            :disabled="!segmentPreviewSegment || segmentPreviewLoading"
            data-testid="segment-preview-submit"
            @click="runtime.loadSegmentPreview"
          >
            {{ segmentPreviewLoading ? t('loading') : t('previewSegment') }}
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
              <p class="text-xs tracking-wide text-slate-500">{{ t('matchedCustomers') }}</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ segmentPreviewSummary.matched_count || 0 }}</p>
            </div>
            <div>
              <p class="text-xs tracking-wide text-slate-500">{{ t('previewRows') }}</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ segmentPreviewSummary.preview_count || 0 }}</p>
            </div>
            <div>
              <p class="text-xs tracking-wide text-slate-500">{{ t('hasMore') }}</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ segmentPreviewSummary.has_more ? t('yes') : t('no') }}</p>
            </div>
          </div>
        </article>

        <div v-if="segmentPreviewRows.length" class="overflow-auto">
          <table class="at-table">
            <thead>
              <tr class="at-table-head-row">
                <th class="at-table-head-cell">{{ t('customer') }}</th>
                <th class="at-table-head-cell">{{ t('policies') }}</th>
                <th class="at-table-head-cell">{{ t('overdueInstallments') }}</th>
                <th class="at-table-head-cell">{{ t('renewalWindow') }}</th>
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
                  <span class="text-slate-700">{{ row.has_overdue_installment ? t('yes') : t('no') }}</span>
                </DataTableCell>
                <DataTableCell>
                  <span class="text-slate-700">{{ row.in_renewal_window ? t('yes') : t('no') }}</span>
                </DataTableCell>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </Dialog>

  <QuickCreateManagedDialog
    v-model="callNoteDialogModel"
    config-key="call_note"
    :locale="activeLocale"
    :options-map="communicationQuickOptionsMap"
    :eyebrow="quickCallNoteEyebrow"
    :title-override="t('quickCallNote')"
    :subtitle-override="t('quickCallNoteSubtitle')"
    :show-save-and-open="false"
    :before-open="quickDialogs.prepareCallNoteDialog"
    :success-handlers="quickDialogs.callNoteSuccessHandlers"
  />

  <QuickCreateManagedDialog
    v-model="reminderDialogModel"
    config-key="reminder"
    :locale="activeLocale"
    :options-map="communicationQuickOptionsMap"
    :eyebrow="quickReminderEyebrow"
    :title-override="t('quickReminder')"
    :subtitle-override="t('quickReminderSubtitle')"
    :show-save-and-open="false"
    :before-open="quickDialogs.prepareReminderDialog"
    :success-handlers="quickDialogs.reminderSuccessHandlers"
  />

  <QuickCreateManagedDialog
    v-if="canCreateQuickMessage"
    v-model="quickMessageDialogModel"
    config-key="communication_message"
    :locale="activeLocale"
    :options-map="communicationQuickOptionsMap"
    :eyebrow="quickMessageEyebrow"
    :title-override="t('quickMessage')"
    :subtitle-override="t('quickMessageSubtitle')"
    :labels="quickMessageDialogLabels"
    :show-save-and-open="canSendDraftNowAction"
    :before-open="quickDialogs.prepareQuickMessageDialog"
    :build-payload="quickDialogs.buildQuickMessagePayload"
    :success-handlers="quickDialogs.quickMessageSuccessHandlers"
  />
</template>

<script setup>
import { computed, unref } from "vue";
import { Dialog } from "frappe-ui";

import ActionButton from "../app-shell/ActionButton.vue";
import DataTableCell from "../app-shell/DataTableCell.vue";
import QuickCreateManagedDialog from "../app-shell/QuickCreateManagedDialog.vue";

const props = defineProps({
  activeLocale: {
    type: String,
    required: true,
  },
  quickDialogs: {
    type: Object,
    required: true,
  },
  runtime: {
    type: Object,
    required: true,
  },
  state: {
    type: Object,
    required: true,
  },
  t: {
    type: Function,
    required: true,
  },
});

const communicationQuickOptionsMap = computed(() => unref(props.state.communicationQuickOptionsMap));
const quickSegmentEyebrow = computed(() => unref(props.state.quickSegmentEyebrow));
const quickCampaignEyebrow = computed(() => unref(props.state.quickCampaignEyebrow));
const quickCallNoteEyebrow = computed(() => unref(props.state.quickCallNoteEyebrow));
const quickReminderEyebrow = computed(() => unref(props.state.quickReminderEyebrow));
const quickMessageEyebrow = computed(() => unref(props.state.quickMessageEyebrow));
const quickMessageDialogLabels = computed(() => unref(props.state.quickMessageDialogLabels));
const canCreateQuickMessage = computed(() => unref(props.state.canCreateQuickMessage));
const canSendDraftNowAction = computed(() => unref(props.state.canSendDraftNowAction));
const campaignRunSelection = computed({
  get() {
    return props.runtime.campaignRunSelection.value;
  },
  set(value) {
    props.runtime.campaignRunSelection.value = value;
  },
});
const campaignRunLoading = computed(() => unref(props.runtime.campaignRunLoading));
const campaignRunError = computed(() => unref(props.runtime.campaignRunError));
const campaignRunResult = computed(() => unref(props.runtime.campaignRunResult));
const segmentPreviewSegment = computed({
  get() {
    return props.runtime.segmentPreviewSegment.value;
  },
  set(value) {
    props.runtime.segmentPreviewSegment.value = value;
  },
});
const segmentPreviewLoading = computed(() => unref(props.runtime.segmentPreviewLoading));
const segmentPreviewError = computed(() => unref(props.runtime.segmentPreviewError));
const segmentPreviewSummary = computed(() => unref(props.state.segmentPreviewSummary));
const segmentPreviewRows = computed(() => unref(props.state.segmentPreviewRows));

const segmentDialogModel = computed({
  get() {
    return props.runtime.showSegmentDialog.value;
  },
  set(value) {
    props.runtime.showSegmentDialog.value = value;
  },
});

const campaignDialogModel = computed({
  get() {
    return props.runtime.showCampaignDialog.value;
  },
  set(value) {
    props.runtime.showCampaignDialog.value = value;
  },
});

const campaignRunDialogModel = computed({
  get() {
    return props.runtime.showCampaignRunDialog.value;
  },
  set(value) {
    props.runtime.showCampaignRunDialog.value = value;
  },
});

const segmentPreviewDialogModel = computed({
  get() {
    return props.runtime.showSegmentPreviewDialog.value;
  },
  set(value) {
    props.runtime.showSegmentPreviewDialog.value = value;
  },
});

const callNoteDialogModel = computed({
  get() {
    return props.runtime.showCallNoteDialog.value;
  },
  set(value) {
    props.runtime.showCallNoteDialog.value = value;
  },
});

const reminderDialogModel = computed({
  get() {
    return props.runtime.showReminderDialog.value;
  },
  set(value) {
    props.runtime.showReminderDialog.value = value;
  },
});

const quickMessageDialogModel = computed({
  get() {
    return props.runtime.showQuickMessageDialog.value;
  },
  set(value) {
    props.runtime.showQuickMessageDialog.value = value;
  },
});
</script>
