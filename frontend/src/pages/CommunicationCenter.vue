<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="outboxItems.length + draftItems.length"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <QuickCreateLauncher
        variant="secondary"
        size="sm"
        :label="t('quickSegment')"
        @launch="showSegmentDialog = true"
      />
      <QuickCreateLauncher
        variant="secondary"
        size="sm"
        :label="t('quickCampaign')"
        @launch="showCampaignDialog = true"
      />
      <QuickCreateLauncher
        variant="secondary"
        size="sm"
        :label="t('runCampaign')"
        @launch="showCampaignRunDialog = true"
      />
      <QuickCreateLauncher
        variant="secondary"
        size="sm"
        :label="t('previewSegment')"
        @launch="showSegmentPreviewDialog = true"
      />
      <QuickCreateLauncher
        variant="secondary"
        size="sm"
        :label="t('quickCallNote')"
        @launch="showCallNoteDialog = true"
      />
      <QuickCreateLauncher
        variant="secondary"
        size="sm"
        :label="t('quickReminder')"
        @launch="showReminderDialog = true"
      />
      <QuickCreateLauncher
        v-if="canCreateQuickMessage"
        variant="primary"
        size="sm"
        :label="t('quickMessage')"
        @launch="showQuickMessageDialog = true"
      />
      <ActionButton
        v-if="canReturnToContext"
        variant="secondary"
        size="sm"
        @click="returnToContext"
      >
        {{ returnToLabel }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" @click="reloadSnapshot">
        {{ t("refresh") }}
      </ActionButton>
      <ActionButton
        variant="secondary"
        size="sm"
        :disabled="snapshotResource.loading"
        @click="downloadCommunicationExport('xlsx')"
      >
        {{ t("exportXlsx") }}
      </ActionButton>
      <ActionButton
        variant="primary"
        size="sm"
        :disabled="snapshotResource.loading"
        @click="downloadCommunicationExport('pdf')"
      >
        {{ t("exportPdf") }}
      </ActionButton>
      <ActionButton v-if="canRunDispatchCycle" variant="primary" size="sm" :disabled="dispatching" @click="runDispatchCycle">
        {{ dispatching ? t("dispatching") : t("dispatch") }}
      </ActionButton>
    </template>

    <SectionPanel :title="t('filtersTitle')" :count="activeFilterCount" panel-class="surface-card rounded-2xl p-5">
      <WorkbenchFilterToolbar
        v-model="presetKey"
        :advanced-label="t('advancedFilters')"
        :collapse-label="t('hideAdvancedFilters')"
        :active-count="activeFilterCount"
        :active-count-label="t('activeFilters')"
        :preset-label="t('presetLabel')"
        :preset-options="presetOptions"
        :can-delete-preset="canDeletePreset"
        :save-label="t('savePreset')"
        :delete-label="t('deletePreset')"
        :apply-label="t('applyFilters')"
        :reset-label="t('clearFilters')"
        @preset-change="onPresetChange"
        @preset-save="savePreset"
        @preset-delete="deletePreset"
        @apply="applySnapshotFilters"
        @reset="resetSnapshotFilters"
      >
        <input
          v-model.trim="filters.customer"
          class="input"
          type="search"
          :placeholder="t('customerFilter')"
          @keyup.enter="applySnapshotFilters"
        />
        <select v-model="filters.status" class="input">
          <option value="">{{ t("allStatuses") }}</option>
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
        <select v-model="filters.channel" class="input">
          <option value="">{{ t("allChannels") }}</option>
          <option v-for="option in channelOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>

        <template #advanced>
          <select v-model="filters.referenceDoctype" class="input">
            <option value="">{{ t("allReferenceTypes") }}</option>
            <option v-for="option in referenceDoctypeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <input
            v-model.trim="filters.referenceName"
            class="input"
            type="search"
            :placeholder="t('referenceNameFilter')"
            @keyup.enter="applySnapshotFilters"
          />
          <select v-model.number="filters.limit" class="input">
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </template>

        <template #actionsSuffix>
          <ActionButton v-if="hasContextFilters" variant="link" size="xs" @click="clearContextFilters">
            {{ t("clearContext") }}
          </ActionButton>
        </template>
      </WorkbenchFilterToolbar>
    </SectionPanel>

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
            @click="startAssignmentContext"
          >
            {{ t("startAssignmentContext") }}
          </ActionButton>
          <ActionButton
            v-if="canBlockAssignmentContext"
            variant="secondary"
            size="xs"
            @click="blockAssignmentContext"
          >
            {{ t("blockAssignmentContext") }}
          </ActionButton>
          <ActionButton
            v-if="canCloseAssignmentContext"
            variant="secondary"
            size="xs"
            @click="closeAssignmentContext"
          >
            {{ t("closeAssignmentContext") }}
          </ActionButton>
          <ActionButton
            v-if="canClearCallNoteContext"
            variant="secondary"
            size="xs"
            @click="clearCallNoteContext"
          >
            {{ t("clearCallFollowUpContext") }}
          </ActionButton>
          <ActionButton
            v-if="canCompleteReminderContext"
            variant="secondary"
            size="xs"
            @click="completeReminderContext"
          >
            {{ t("completeReminderContext") }}
          </ActionButton>
          <ActionButton
            v-if="canCancelReminderContext"
            variant="secondary"
            size="xs"
            @click="cancelReminderContext"
          >
            {{ t("cancelReminderContext") }}
          </ActionButton>
          <ActionButton
            v-if="canReturnToContext"
            variant="link"
            size="xs"
            @click="returnToContext"
          >
            {{ returnToLabel }}
          </ActionButton>
          <ActionButton variant="link" size="xs" @click="clearContextFilters">{{ t("clearContext") }}</ActionButton>
        </div>
      </div>
    </article>

    <template #metrics>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div v-for="card in statusCards" :key="card.key" class="mini-metric">
          <p class="mini-metric-label">{{ card.label }}</p>
          <p class="mini-metric-value">{{ card.value }}</p>
        </div>
      </div>
    </template>

    <article v-if="snapshotErrorMessage" class="qc-error-banner">
      <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
      <p class="qc-error-banner__text mt-1">{{ snapshotErrorMessage }}</p>
    </article>

    <article v-if="operationError" class="qc-error-banner">
      <p class="qc-error-banner__text font-semibold">{{ t("actions") }}</p>
      <p class="qc-error-banner__text mt-1">{{ operationError }}</p>
    </article>

    <SectionPanel :title="t('outboxTitle')" :count="outboxItems.length" panel-class="surface-card rounded-2xl p-5">
      <div v-if="snapshotResource.loading" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
        {{ t("loading") }}
      </div>
      <div v-else-if="outboxItems.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <EmptyState :title="t('emptyOutboxTitle')" :description="t('emptyOutbox')" />
      </div>
      <div v-else class="mt-4 overflow-auto">
        <table class="at-table">
          <thead>
            <tr class="at-table-head-row">
              <th class="at-table-head-cell">{{ t("recipient") }}</th>
              <th class="at-table-head-cell">{{ t("channel") }}</th>
              <th class="at-table-head-cell">{{ t("status") }}</th>
              <th class="at-table-head-cell">{{ t("attempts") }}</th>
              <th class="at-table-head-cell">{{ t("nextRetry") }}</th>
              <th class="at-table-head-cell">{{ t("actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in outboxItems" :key="row.name" class="at-table-row">
              <DataTableCell cell-class="min-w-[280px]">
                <p class="font-medium text-slate-800">{{ row.recipient || "-" }}</p>
                <p class="text-xs text-slate-500">{{ row.name }}</p>
                <div v-if="row.reference_doctype || row.reference_name" class="mt-1 flex flex-wrap items-center gap-1">
                  <span
                    v-if="row.reference_doctype"
                    class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700"
                  >
                    {{ referenceTypeLabel(row.reference_doctype) }}
                  </span>
                  <span v-if="row.reference_name" class="text-xs text-slate-500">{{ row.reference_name }}</span>
                </div>
              </DataTableCell>
              <DataTableCell>
                <StatusBadge v-if="row.channel" domain="notification_channel" :status="row.channel" />
                <span v-else class="text-slate-700">-</span>
              </DataTableCell>
              <DataTableCell cell-class="min-w-[220px]">
                <StatusBadge v-if="row.status" domain="notification_status" :status="row.status" />
                <span v-else class="text-slate-700">-</span>
                <p v-if="row.error_message" class="mt-1 max-w-[320px] truncate qc-inline-error">
                  {{ row.error_message }}
                </p>
              </DataTableCell>
              <DataTableCell>
                <span class="text-slate-700">{{ row.attempt_count || 0 }}/{{ row.max_attempts || 0 }}</span>
              </DataTableCell>
              <DataTableCell>
                <span class="text-xs text-slate-600">{{ row.next_retry_on || "-" }}</span>
              </DataTableCell>
              <DataTableCell cell-class="min-w-[240px]">
                <InlineActionRow>
                  <ActionButton
                    v-if="canRetryOutboxRow(row)"
                    variant="secondary"
                    size="xs"
                    @click="retryOutbox(row.name)"
                  >
                    {{ t("retry") }}
                  </ActionButton>
                  <ActionButton
                    v-if="canSendDraftFromOutboxRow(row)"
                    variant="secondary"
                    size="xs"
                    @click="sendDraftNow(row.draft)"
                  >
                    {{ t("sendNow") }}
                  </ActionButton>
                  <ActionButton
                    v-if="canOpenPanel(row)"
                    variant="link"
                    size="xs"
                    trailing-icon=">"
                    @click="openPanel(row)"
                  >
                    {{ panelActionLabel(row) }}
                  </ActionButton>
                </InlineActionRow>
              </DataTableCell>
            </tr>
          </tbody>
        </table>
      </div>
    </SectionPanel>

    <SectionPanel :title="t('draftTitle')" :count="draftItems.length" panel-class="surface-card rounded-2xl p-5">
      <div v-if="snapshotResource.loading" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
        {{ t("loading") }}
      </div>
      <div v-else-if="draftItems.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <EmptyState :title="t('emptyDraftsTitle')" :description="t('emptyDrafts')" />
      </div>
      <div v-else class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="draft in draftItems"
          :key="draft.name"
          class="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="text-sm font-semibold text-slate-900">{{ draft.event_key }}</p>
            <StatusBadge v-if="draft.status" domain="notification_status" :status="draft.status" />
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
            <StatusBadge v-if="draft.channel" domain="notification_channel" :status="draft.channel" />
            <span>{{ draft.recipient || "-" }}</span>
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
            <span
              v-if="draft.reference_doctype"
              class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700"
            >
              {{ referenceTypeLabel(draft.reference_doctype) }}
            </span>
            <span v-if="draft.reference_name">{{ draft.reference_name }}</span>
          </div>
          <p v-if="draft.error_message" class="mt-2 max-h-10 overflow-hidden qc-inline-error">
            {{ draft.error_message }}
          </p>
          <InlineActionRow class="mt-3">
            <ActionButton
              v-if="canSendDraftCard(draft)"
              variant="secondary"
              size="xs"
              @click="sendDraftNow(draft.name)"
            >
              {{ t("sendNow") }}
            </ActionButton>
            <ActionButton
              v-if="canOpenPanel(draft)"
              variant="link"
              size="xs"
              trailing-icon=">"
              @click="openPanel(draft)"
            >
              {{ panelActionLabel(draft) }}
            </ActionButton>
          </InlineActionRow>
        </article>
      </div>
    </SectionPanel>

    <QuickCreateManagedDialog
      v-model="showSegmentDialog"
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
      v-model="showCampaignDialog"
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
      v-model="showCampaignRunDialog"
      :options="{
        title: t('campaignRunTitle'),
        size: '3xl',
      }"
    >
      <template #body-content>
        <div class="space-y-4">
          <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
            <select v-model="campaignRunSelection" class="input" data-testid="campaign-run-select">
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
      v-model="showSegmentPreviewDialog"
      :options="{
        title: t('segmentPreviewTitle'),
        size: '4xl',
      }"
    >
      <template #body-content>
        <div class="space-y-4">
          <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
            <select v-model="segmentPreviewSegment" class="input" data-testid="segment-preview-select">
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
      v-model="showCallNoteDialog"
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
      v-model="showReminderDialog"
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
      v-model="showQuickMessageDialog"
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
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Dialog, createResource } from "frappe-ui";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useCommunicationStore } from "../stores/communication";
import ActionButton from "../components/app-shell/ActionButton.vue";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import EmptyState from "../components/app-shell/EmptyState.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import { useCommunicationCenterState } from "../composables/communicationCenter/state";
import { useCommunicationCenterOperations } from "../composables/communicationCenter/operations";
import { useCommunicationCenterCampaignFlow } from "../composables/communicationCenter/campaignFlow";
import { useCommunicationCenterSegmentFlow } from "../composables/communicationCenter/segmentFlow";

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
const officeBranchFilters = branchStore.requestBranch ? { office_branch: branchStore.requestBranch } : {};
const snapshotResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.communication.get_queue_snapshot",
  params: {
    customer: null,
    status: null,
    channel: null,
    reference_doctype: null,
    reference_name: null,
    office_branch: branchStore.requestBranch || null,
    limit: 50,
  },
  auto: true,
});
const communicationQuickTemplateResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Notification Template",
    fields: ["name", "template_key", "channel", "is_active"],
    filters: { is_active: 1 },
    order_by: "template_key asc",
    limit_page_length: 500,
  },
});
const communicationQuickCustomerResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Customer",
    fields: ["name", "full_name"],
    filters: officeBranchFilters,
    order_by: "modified desc",
    limit_page_length: 500,
  },
});
const communicationQuickPolicyResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Policy",
    fields: ["name", "policy_no", "customer"],
    filters: officeBranchFilters,
    order_by: "modified desc",
    limit_page_length: 500,
  },
});
const communicationQuickClaimResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Claim",
    fields: ["name", "claim_no", "policy", "customer"],
    filters: officeBranchFilters,
    order_by: "modified desc",
    limit_page_length: 500,
  },
});
const communicationQuickSegmentResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Segment",
    fields: ["name", "segment_name", "channel_focus", "status"],
    filters: officeBranchFilters,
    order_by: "modified desc",
    limit_page_length: 500,
  },
});
const communicationQuickCampaignResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Campaign",
    fields: ["name", "campaign_name", "channel", "status"],
    filters: officeBranchFilters,
    order_by: "modified desc",
    limit_page_length: 500,
  },
});

const communicationCenterState = useCommunicationCenterState({
  t,
  activeLocale,
  route,
  router,
  authStore,
  branchStore,
  communicationStore,
  snapshotResource,
  communicationQuickTemplateResource,
  communicationQuickCustomerResource,
  communicationQuickPolicyResource,
  communicationQuickClaimResource,
  communicationQuickSegmentResource,
  communicationQuickCampaignResource,
});

const {
  filters,
  quickSegmentEyebrow,
  quickCampaignEyebrow,
  quickCallNoteEyebrow,
  quickReminderEyebrow,
  quickMessageEyebrow,
  canCreateQuickMessage,
  canSendDraftNowAction,
  canRetryOutboxAction,
  canRunDispatchCycle,
  returnToTarget,
  safeReturnTo,
  canReturnToContext,
  returnToLabel,
  snapshotData,
  snapshotErrorMessage,
  outboxItems,
  draftItems,
  breakdown,
  activeFilterCount,
  statusOptions,
  channelOptions,
  referenceDoctypeOptions,
  communicationQuickOptionsMap,
  customerContextLabel,
  referenceContextLabel,
  channelStatusContextLabel,
  hasContextFilters,
  canStartAssignmentContext,
  canBlockAssignmentContext,
  canCloseAssignmentContext,
  canClearCallNoteContext,
  canCompleteReminderContext,
  canCancelReminderContext,
  presetKey,
  presetOptions,
  canDeletePreset,
  onPresetChange,
  savePreset,
  deletePreset,
  statusCards,
  reloadSnapshot,
  reloadQuickCustomers,
  clearCustomerFilter,
  clearContextFilters,
  applySnapshotFilters,
  resetSnapshotFilters,
  returnToContext,
  downloadCommunicationExport,
  sourcePanelConfig,
  canOpenPanel,
  panelActionLabel,
  openPanel,
  referenceTypeLabel,
} = communicationCenterState;

const {
  dispatching,
  operationError,
  showSegmentDialog,
  showCampaignDialog,
  showCallNoteDialog,
  showReminderDialog,
  showQuickMessageDialog,
  runCycleResource,
  sendDraftResource,
  retryOutboxResource,
  auxMutationResource,
  runDispatchCycle,
  retryOutbox,
  sendDraftNow,
  startAssignmentContext,
  blockAssignmentContext,
  closeAssignmentContext,
  clearCallNoteContext,
  completeReminderContext,
  cancelReminderContext,
  canRetryOutboxRow,
  canSendDraftFromOutboxRow,
  canSendDraftCard,
  buildQuickMessagePayload,
  prepareQuickMessageDialog,
  prepareCallNoteDialog,
  prepareReminderDialog,
  quickMessageDialogLabels,
  quickMessageSuccessHandlers,
  callNoteSuccessHandlers,
  reminderSuccessHandlers,
  segmentSuccessHandlers,
  campaignSuccessHandlers,
} = useCommunicationCenterOperations({
  t,
  filters,
  activeLocale,
  branchStore,
  router,
  reloadSnapshot,
  canSendDraftNowAction,
  canRetryOutboxAction,
  canRunDispatchCycle,
  canCloseAssignmentContext,
  canClearCallNoteContext,
  canCompleteReminderContext,
  canCancelReminderContext,
  canReturnToContext,
  safeReturnTo,
});

const {
  showSegmentPreviewDialog,
  segmentPreviewSegment,
  segmentPreviewLoading,
  segmentPreviewError,
  segmentPreviewPayload,
  segmentPreviewResource,
  loadSegmentPreview,
  segmentPreviewSummary,
  segmentPreviewRows,
} = useCommunicationCenterSegmentFlow({ t });

const {
  showCampaignRunDialog,
  campaignRunSelection,
  campaignRunLoading,
  campaignRunError,
  campaignRunResult,
  campaignRunResource,
  runCampaignExecution,
} = useCommunicationCenterCampaignFlow({ t, reloadSnapshot });
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>

