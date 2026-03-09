<template>
  <section class="space-y-4">
    <article class="surface-card rounded-2xl p-5">
      <PageToolbar
        :title="t('title')"
        :subtitle="t('subtitle')"
        :show-refresh="true"
        :busy="snapshotResource.loading || dispatching"
        :refresh-label="t('refresh')"
        @refresh="reloadSnapshot"
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
            v-if="canCreateQuickMessage"
            variant="primary"
            size="sm"
            :label="t('quickMessage')"
            @launch="showQuickMessageDialog = true"
          />
          <ActionButton variant="secondary" size="sm" @click="reloadSnapshot">
            {{ t("refresh") }}
          </ActionButton>
          <ActionButton v-if="canRunDispatchCycle" variant="primary" size="sm" :disabled="dispatching" @click="runDispatchCycle">
            {{ dispatching ? t("dispatching") : t("dispatch") }}
          </ActionButton>
        </template>

        <template #filters>
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
        </template>
      </PageToolbar>
    </article>

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
          <ActionButton variant="link" size="xs" @click="clearContextFilters">{{ t("clearContext") }}</ActionButton>
        </div>
      </div>
    </article>

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <article v-for="card in statusCards" :key="card.key" class="surface-card rounded-xl p-4">
        <p class="text-xs uppercase tracking-wide text-slate-500">{{ card.label }}</p>
        <p class="mt-2 text-2xl font-semibold text-slate-900">{{ card.value }}</p>
      </article>
    </div>

    <article
      v-if="snapshotErrorMessage"
      class="surface-card rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-rose-700"
    >
      <p class="text-sm font-semibold">{{ t("loadErrorTitle") }}</p>
      <p class="mt-1 text-sm">{{ snapshotErrorMessage }}</p>
    </article>

    <article
      v-if="operationError"
      class="surface-card rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-rose-700"
    >
      <p class="text-sm font-semibold">{{ t("actions") }}</p>
      <p class="mt-1 text-sm">{{ operationError }}</p>
    </article>

    <DataTableShell
      :loading="snapshotResource.loading"
      :empty="outboxItems.length === 0"
      :loading-label="t('loading')"
      :empty-title="t('emptyOutboxTitle')"
      :empty-description="t('emptyOutbox')"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-slate-900">{{ t("outboxTitle") }}</h3>
          <span class="text-xs text-slate-500">{{ outboxItems.length }}</span>
        </div>
      </template>
      <template #default>
        <div class="overflow-auto">
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
                  <StatusBadge v-if="row.channel" type="notification_channel" :status="row.channel" />
                  <span v-else class="text-slate-700">-</span>
                </DataTableCell>
                <DataTableCell cell-class="min-w-[220px]">
                  <StatusBadge v-if="row.status" type="notification_status" :status="row.status" />
                  <span v-else class="text-slate-700">-</span>
                  <p v-if="row.error_message" class="mt-1 max-w-[320px] truncate text-xs text-rose-600">
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
      </template>
    </DataTableShell>

    <DataTableShell
      :loading="snapshotResource.loading"
      :empty="draftItems.length === 0"
      :loading-label="t('loading')"
      :empty-title="t('emptyDraftsTitle')"
      :empty-description="t('emptyDrafts')"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-slate-900">{{ t("draftTitle") }}</h3>
          <span class="text-xs text-slate-500">{{ draftItems.length }}</span>
        </div>
      </template>
      <template #default>
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="draft in draftItems"
            :key="draft.name"
            class="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
          >
            <div class="flex items-start justify-between gap-2">
              <p class="text-sm font-semibold text-slate-900">{{ draft.event_key }}</p>
              <StatusBadge v-if="draft.status" type="notification_status" :status="draft.status" />
            </div>
            <div class="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
              <StatusBadge v-if="draft.channel" type="notification_channel" :status="draft.channel" />
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
            <p v-if="draft.error_message" class="mt-2 max-h-10 overflow-hidden text-xs text-rose-600">
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
      </template>
    </DataTableShell>

    <QuickCreateManagedDialog
      v-model="showSegmentDialog"
      config-key="segment"
      :locale="activeLocale"
      :options-map="communicationQuickOptionsMap"
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

          <article
            v-if="campaignRunError"
            class="surface-card rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700"
          >
            {{ campaignRunError }}
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

          <article
            v-if="segmentPreviewError"
            class="surface-card rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700"
          >
            {{ segmentPreviewError }}
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
      :title-override="t('quickCallNote')"
      :subtitle-override="t('quickCallNoteSubtitle')"
      :show-save-and-open="false"
      :before-open="prepareCallNoteDialog"
      :success-handlers="callNoteSuccessHandlers"
    />

    <QuickCreateManagedDialog
      v-if="canCreateQuickMessage"
      v-model="showQuickMessageDialog"
      config-key="communication_message"
      :locale="activeLocale"
      :options-map="communicationQuickOptionsMap"
      :title-override="t('quickMessage')"
      :subtitle-override="t('quickMessageSubtitle')"
      :labels="quickMessageDialogLabels"
      :show-save-and-open="canSendDraftNowAction"
      :before-open="prepareQuickMessageDialog"
      :build-payload="buildQuickMessagePayload"
      :success-handlers="quickMessageSuccessHandlers"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, ref, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Dialog, createResource } from "frappe-ui";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useCommunicationStore } from "../stores/communication";
import ActionButton from "../components/app-shell/ActionButton.vue";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import DataTableShell from "../components/app-shell/DataTableShell.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import PageToolbar from "../components/app-shell/PageToolbar.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { useCustomFilterPresets } from "../composables/useCustomFilterPresets";
import { getSourcePanelConfig } from "../utils/sourcePanel";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const branchStore = useBranchStore();
const communicationStore = useCommunicationStore();

const copy = {
  tr: {
    title: "Iletisim Merkezi",
    subtitle: "Bildirim kuyrugu, dagitim ve tekrar deneme operasyonlari",
    refresh: "Yenile",
    dispatch: "Dagitimi Calistir",
    dispatching: "Calisiyor...",
    runCampaign: "Kampanyayi Calistir",
    campaignRunTitle: "Kampanya Calistir",
    selectCampaign: "Kampanya secin",
    previewSegment: "Segment Onizleme",
    segmentPreviewTitle: "Segment Uye Onizleme",
    selectSegment: "Segment secin",
    quickSegment: "Segment",
    quickSegmentSubtitle: "Hedef musteri segmenti olustur",
    quickCampaign: "Kampanya",
    quickCampaignSubtitle: "Segmente bagli kampanya olustur",
    quickCallNote: "Arama Notu",
    quickCallNoteSubtitle: "Telefon gorusmesini not olarak kaydet",
    closeAssignmentContext: "Atamayi Kapat",
    clearCallFollowUpContext: "Arama Takibini Temizle",
    quickMessage: "Hizli Iletisim",
    quickMessageSubtitle: "Taslak kaydet veya secili kanal ile hemen gonder",
    saveDraft: "Taslak Kaydet",
    sendImmediately: "Hemen Gonder",
    advancedFilters: "Gelismis Filtreler",
    hideAdvancedFilters: "Gelismis Filtreleri Gizle",
    activeFilters: "aktif filtre",
    presetLabel: "Filtre Sablonu",
    presetDefault: "Standart",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    savePresetPrompt: "Filtre sablonu adi",
    deletePresetConfirm: "Secili ozel filtre sablonu silinsin mi?",
    applyFilters: "Uygula",
    clearFilters: "Filtreleri Temizle",
    customerFilter: "Musteri (AT Customer)",
    customerContext: "Musteri Filtresi",
    clearCustomer: "Musteri Filtresini Temizle",
    referenceContext: "Kayit Baglami",
    clearContext: "Baglam Filtrelerini Temizle",
    allStatuses: "Tum durumlar",
    allChannels: "Tum kanallar",
    allReferenceTypes: "Tum kayit tipleri",
    referenceNameFilter: "Kayit adi / ID",
    outboxTitle: "Gonderim Kuyrugu",
    draftTitle: "Bildirim Taslaklari",
    loading: "Yukleniyor...",
    loadErrorTitle: "Iletisim Verileri Yuklenemedi",
    permissionDeniedRead: "Iletisim verilerini gormek icin yetkiniz yok.",
    permissionDeniedAction: "Bu iletisim islemini yapmaya yetkiniz yok.",
    emptyOutbox: "Gonderim kuyrugu kaydi bulunamadi.",
    emptyOutboxTitle: "Kuyruk Kaydi Yok",
    emptyDrafts: "Taslak kaydi bulunamadi.",
    emptyDraftsTitle: "Taslak Kaydi Yok",
    recipient: "Alici",
    channel: "Kanal",
    status: "Durum",
    attempts: "Deneme",
    nextRetry: "Sonraki Deneme",
    actions: "Aksiyon",
    retry: "Tekrar Dene",
    sendNow: "Hemen Gonder",
    openRef: "Kaydi Ac",
    queued: "Kuyrukta",
    processing: "Isleniyor",
    sent: "Gonderildi",
    failed: "Basarisiz",
    dead: "Kalici Hata",
    sms: "SMS",
    email: "E-posta",
    whatsapp: "WhatsApp",
    openPolicyPanel: "Policeyi Ac",
    openCustomerPanel: "Musteriyi Ac",
    openOffersPanel: "Teklif Panosu",
    openClaimsPanel: "Hasar Panosu",
    openPaymentsPanel: "Odeme Panosu",
    openRenewalsPanel: "Yenileme Panosu",
    openReconciliationPanel: "Mutabakat Panosu",
    openCommunicationPanel: "Iletisim Kaydi",
    openMasterDataPanel: "Ana Veri Kaydi",
    referenceLead: "Lead",
    referenceOffer: "Teklif",
    referencePolicy: "Police",
    referenceCustomer: "Musteri",
    referenceClaim: "Hasar",
    referencePayment: "Odeme",
    referenceRenewalTask: "Yenileme",
    referenceAccountingEntry: "Muhasebe",
    referenceReconciliationItem: "Mutabakat",
    matchedCustomers: "Eslesen Musteriler",
    createdDrafts: "Uretilen Taslaklar",
    skippedRows: "Atlanan Kayitlar",
    previewRows: "Onizleme Satiri",
    hasMore: "Devami Var",
    yes: "Evet",
    no: "Hayir",
    policies: "Police",
    overdueInstallments: "Geciken Taksit",
    renewalWindow: "Yenileme Penceresi",
  },
  en: {
    title: "Communication Center",
    subtitle: "Notification queue, dispatch and retry operations",
    refresh: "Refresh",
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
    closeAssignmentContext: "Close Assignment",
    clearCallFollowUpContext: "Clear Call Follow-up",
    quickMessage: "Quick Message",
    quickMessageSubtitle: "Save as draft or send immediately",
    saveDraft: "Save Draft",
    sendImmediately: "Send Now",
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
    attempts: "Attempts",
    nextRetry: "Next Retry",
    actions: "Actions",
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

const filters = communicationStore.state.filters;

const dispatching = ref(false);
const showSegmentDialog = ref(false);
const showCampaignDialog = ref(false);
const showCampaignRunDialog = ref(false);
const showSegmentPreviewDialog = ref(false);
const showCallNoteDialog = ref(false);
const showQuickMessageDialog = ref(false);
const operationError = ref("");
const campaignRunSelection = ref("");
const campaignRunLoading = ref(false);
const campaignRunError = ref("");
const campaignRunResult = ref(null);
const segmentPreviewSegment = ref("");
const segmentPreviewLoading = ref(false);
const segmentPreviewError = ref("");
const segmentPreviewPayload = ref(null);

const snapshotResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.communication.get_queue_snapshot",
  params: buildParams(),
  auto: true,
});

const runCycleResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.communication.run_dispatch_cycle",
});

const sendDraftResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.communication.send_draft_now",
});

const retryOutboxResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.communication.retry_outbox_item",
});
const auxMutationResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.quick_create.update_quick_aux_record",
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
    filters: buildCustomerQuickFilters(),
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
    filters: buildCustomerQuickFilters(),
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
    filters: buildCustomerQuickFilters(),
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
    filters: buildCustomerQuickFilters(),
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
    filters: buildCustomerQuickFilters(),
    order_by: "modified desc",
    limit_page_length: 500,
  },
});
const segmentPreviewResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.communication.preview_segment_members",
});
const campaignRunResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.communication.execute_campaign",
});

const snapshotData = computed(() => communicationStore.state.snapshot || {});
const snapshotErrorMessage = computed(() => {
  if (communicationStore.state.error) return communicationStore.state.error;
  const raw = snapshotResource.error;
  if (!raw) return "";
  if (isPermissionDeniedError(raw)) return t("permissionDeniedRead");
  if (typeof raw === "string") return raw;
  return raw?.message || raw?.exc || t("loadErrorTitle");
});
const outboxItems = computed(() => communicationStore.outboxItems);
const draftItems = computed(() => communicationStore.draftItems);
const breakdown = computed(() => communicationStore.breakdown);
const activeFilterCount = computed(() => communicationStore.activeFilterCount);
const {
  presetKey,
  presetOptions,
  canDeletePreset,
  applyPreset,
  onPresetChange,
  savePreset,
  deletePreset,
  persistPresetStateToServer,
  hydratePresetStateFromServer,
} = useCustomFilterPresets({
  screen: "communication_center",
  presetStorageKey: "at:communication-center:preset",
  presetListStorageKey: "at:communication-center:preset-list",
  t,
  getCurrentPayload: currentCommunicationPresetPayload,
  setFilterStateFromPayload: setCommunicationFilterStateFromPayload,
  resetFilterState: resetCommunicationFilterState,
  refresh: reloadSnapshot,
  getSortLocale: () => (activeLocale.value === "tr" ? "tr-TR" : "en-US"),
});
const customerContextLabel = computed(
  () => String(route.query.customer_label || filters.customer || "").trim() || String(filters.customer || "").trim()
);
const referenceContextLabel = computed(() => {
  const doctype = String(route.query.reference_label || filters.referenceDoctype || "").trim();
  const name = String(filters.referenceName || "").trim();
  if (!doctype && !name) return "";
  if (!doctype) return name;
  if (!name) return doctype;
  return `${doctype} / ${name}`;
});
const channelStatusContextLabel = computed(() => {
  const parts = [];
  if (filters.channel) parts.push(`${t("channel")}: ${channelLabel(filters.channel)}`);
  if (filters.status) parts.push(`${t("status")}: ${statusLabel(filters.status)}`);
  return parts.join(" • ");
});
const hasContextFilters = computed(
  () => Boolean(filters.customer || filters.referenceDoctype || filters.referenceName || filters.channel || filters.status)
);
const canCloseAssignmentContext = computed(
  () => filters.referenceDoctype === "AT Ownership Assignment" && Boolean(String(filters.referenceName || "").trim())
);
const canClearCallNoteContext = computed(
  () => filters.referenceDoctype === "AT Call Note" && Boolean(String(filters.referenceName || "").trim())
);
const statusOptions = computed(() => [
  { value: "Queued", label: t("queued") },
  { value: "Processing", label: t("processing") },
  { value: "Sent", label: t("sent") },
  { value: "Failed", label: t("failed") },
  { value: "Dead", label: t("dead") },
]);
const channelOptions = computed(() => [
  { value: "SMS", label: t("sms") },
  { value: "Email", label: t("email") },
  { value: "WHATSAPP", label: t("whatsapp") },
]);
const referenceDoctypeOptions = computed(() => [
  { value: "AT Customer", label: referenceTypeLabel("AT Customer") },
  { value: "AT Lead", label: referenceTypeLabel("AT Lead") },
  { value: "AT Offer", label: referenceTypeLabel("AT Offer") },
  { value: "AT Policy", label: referenceTypeLabel("AT Policy") },
  { value: "AT Claim", label: referenceTypeLabel("AT Claim") },
  { value: "AT Payment", label: referenceTypeLabel("AT Payment") },
  { value: "AT Renewal Task", label: referenceTypeLabel("AT Renewal Task") },
  { value: "AT Accounting Entry", label: referenceTypeLabel("AT Accounting Entry") },
  { value: "AT Reconciliation Item", label: referenceTypeLabel("AT Reconciliation Item") },
  { value: "AT Segment", label: referenceTypeLabel("AT Segment") },
  { value: "AT Campaign", label: referenceTypeLabel("AT Campaign") },
]);
const communicationQuickOptionsMap = computed(() => ({
  notificationTemplates: (communicationQuickTemplateResource.data || []).map((row) => ({
    value: row.name,
    label: `${row.template_key || row.name}${row.channel ? ` (${channelLabel(row.channel)})` : ""}`,
  })),
  customers: (communicationQuickCustomerResource.data || []).map((row) => ({
    value: row.name,
    label: row.full_name || row.name,
  })),
  policies: (communicationQuickPolicyResource.data || []).map((row) => ({
    value: row.name,
    label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
  })),
  claims: (communicationQuickClaimResource.data || []).map((row) => ({
    value: row.name,
    label: `${row.claim_no || row.name}${row.policy ? ` - ${row.policy}` : ""}`,
  })),
  segments: (communicationQuickSegmentResource.data || []).map((row) => ({
    value: row.name,
    label: `${row.segment_name || row.name}${row.channel_focus ? ` - ${channelLabel(row.channel_focus)}` : ""}`,
  })),
  campaigns: (communicationQuickCampaignResource.data || []).map((row) => ({
    value: row.name,
    label: `${row.campaign_name || row.name}${row.channel ? ` - ${channelLabel(row.channel)}` : ""}`,
  })),
}));
const canCreateQuickMessage = computed(() => authStore.can(["quickCreate", "communication_message"]));
const canSendDraftNowAction = computed(() => authStore.can(["actions", "communication", "sendDraftNow"]));
const canRetryOutboxAction = computed(() => authStore.can(["actions", "communication", "retryOutbox"]));
const canRunDispatchCycle = computed(() => authStore.can(["actions", "communication", "runDispatchCycle"]));
const quickMessageDialogLabels = computed(() => ({
  save: t("saveDraft"),
  saveAndOpen: t("sendImmediately"),
}));
const segmentPreviewSummary = computed(() => segmentPreviewPayload.value?.summary || null);
const segmentPreviewRows = computed(() => segmentPreviewPayload.value?.customers || []);
const quickMessageSuccessHandlers = {
  communication_snapshot: async () => {
    await reloadSnapshot();
  },
};
const callNoteSuccessHandlers = {
  "call-notes-list": async () => {},
};
const segmentSuccessHandlers = {
  "segments-list": async () => {},
};
const campaignSuccessHandlers = {
  "campaigns-list": async () => {},
};

const statusCards = computed(() =>
  communicationStore.statusCards.map((item) => ({
    key: item.key,
    label: statusLabel(item.status),
    value: item.value,
  }))
);

function buildParams() {
  return {
    customer: filters.customer || null,
    status: filters.status || null,
    channel: filters.channel || null,
    reference_doctype: filters.referenceDoctype || null,
    reference_name: filters.referenceName || null,
    office_branch: branchStore.requestBranch || null,
    limit: filters.limit,
  };
}

function buildCustomerQuickFilters() {
  if (!branchStore.requestBranch) return {};
  return { office_branch: branchStore.requestBranch };
}

function resetCommunicationFilterState() {
  communicationStore.resetFilters();
}

function currentCommunicationPresetPayload() {
  return {
    customer: filters.customer,
    status: filters.status,
    channel: filters.channel,
    referenceDoctype: filters.referenceDoctype,
    referenceName: filters.referenceName,
    limit: Number(filters.limit) || 50,
  };
}

function setCommunicationFilterStateFromPayload(payload) {
  filters.customer = String(payload?.customer || "");
  filters.status = String(payload?.status || "");
  filters.channel = String(payload?.channel || "");
  filters.referenceDoctype = String(payload?.referenceDoctype || "");
  filters.referenceName = String(payload?.referenceName || "");
  filters.limit = Number(payload?.limit || 50) || 50;
}

function statusClass(status) {
  if (status === "Sent") return "bg-emerald-100 text-emerald-700";
  if (status === "Queued") return "bg-sky-100 text-sky-700";
  if (status === "Processing") return "bg-indigo-100 text-indigo-700";
  if (status === "Failed") return "bg-amber-100 text-amber-700";
  if (status === "Dead") return "bg-rose-100 text-rose-700";
  return "bg-slate-200 text-slate-700";
}

function statusLabel(status) {
  if (status === "Queued") return t("queued");
  if (status === "Processing") return t("processing");
  if (status === "Sent") return t("sent");
  if (status === "Failed") return t("failed");
  if (status === "Dead") return t("dead");
  return status || "-";
}

function channelLabel(channel) {
  if (channel === "SMS") return t("sms");
  if (channel === "Email") return t("email");
  if (channel === "WHATSAPP") return t("whatsapp");
  return channel || "-";
}

function reloadSnapshot() {
  operationError.value = "";
  snapshotResource.params = buildParams();
  communicationStore.setLoading(true);
  communicationStore.clearError();
  return snapshotResource
    .reload()
    .then((result) => {
      communicationStore.setSnapshot(result || {});
      communicationStore.setLoading(false);
      return result;
    })
    .catch((error) => {
      const message = isPermissionDeniedError(error)
        ? t("permissionDeniedRead")
        : error?.message || error?.exc || t("loadErrorTitle");
      communicationStore.setSnapshot({});
      communicationStore.setError(message);
      communicationStore.setLoading(false);
      throw error;
    });
}

function reloadQuickCustomers() {
  communicationQuickCustomerResource.params = {
    ...communicationQuickCustomerResource.params,
    filters: buildCustomerQuickFilters(),
  };
  communicationQuickPolicyResource.params = {
    ...communicationQuickPolicyResource.params,
    filters: buildCustomerQuickFilters(),
  };
  communicationQuickClaimResource.params = {
    ...communicationQuickClaimResource.params,
    filters: buildCustomerQuickFilters(),
  };
  communicationQuickSegmentResource.params = {
    ...communicationQuickSegmentResource.params,
    filters: buildCustomerQuickFilters(),
  };
  communicationQuickCampaignResource.params = {
    ...communicationQuickCampaignResource.params,
    filters: buildCustomerQuickFilters(),
  };
  return Promise.all([
    communicationQuickCustomerResource.reload(),
    communicationQuickPolicyResource.reload(),
    communicationQuickClaimResource.reload(),
    communicationQuickSegmentResource.reload(),
    communicationQuickCampaignResource.reload(),
  ]);
}
function applySnapshotFilters() {
  return reloadSnapshot();
}
function resetSnapshotFilters() {
  applyPreset("default", { refresh: false });
  void persistPresetStateToServer();
  return clearContextFilters();
}
function clearCustomerFilter() {
  filters.customer = "";
  const nextQuery = { ...route.query };
  delete nextQuery.customer;
  delete nextQuery.customer_label;
  router.replace({ query: nextQuery });
  reloadSnapshot();
}
function clearContextFilters() {
  communicationStore.setFilters({
    customer: "",
    status: "",
    channel: "",
    referenceDoctype: "",
    referenceName: "",
  });
  const nextQuery = { ...route.query };
  delete nextQuery.customer;
  delete nextQuery.customer_label;
  delete nextQuery.status;
  delete nextQuery.channel;
  delete nextQuery.reference_doctype;
  delete nextQuery.reference_name;
  delete nextQuery.reference_label;
  router.replace({ query: nextQuery });
  reloadSnapshot();
}

async function runDispatchCycle() {
  if (!canRunDispatchCycle.value) return;
  dispatching.value = true;
  operationError.value = "";
  try {
    await runCycleResource.submit({ limit: filters.limit, include_failed: 1 });
    await reloadSnapshot();
  } catch (error) {
    operationError.value = isPermissionDeniedError(error)
      ? t("permissionDeniedAction")
      : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
  } finally {
    dispatching.value = false;
  }
}

async function retryOutbox(outboxName) {
  if (!canRetryOutboxAction.value) return;
  operationError.value = "";
  try {
    await retryOutboxResource.submit({ outbox_name: outboxName });
    await reloadSnapshot();
  } catch (error) {
    operationError.value = isPermissionDeniedError(error)
      ? t("permissionDeniedAction")
      : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
  }
}

async function sendDraftNow(draftName) {
  if (!canSendDraftNowAction.value) return;
  operationError.value = "";
  try {
    await sendDraftResource.submit({ draft_name: draftName });
    await reloadSnapshot();
  } catch (error) {
    operationError.value = isPermissionDeniedError(error)
      ? t("permissionDeniedAction")
      : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
  }
}

async function closeAssignmentContext() {
  if (!canCloseAssignmentContext.value) return;
  operationError.value = "";
  try {
    await auxMutationResource.submit({
      doctype: "AT Ownership Assignment",
      name: filters.referenceName,
      data: {
        status: "Done",
      },
    });
    await reloadSnapshot();
  } catch (error) {
    operationError.value = isPermissionDeniedError(error)
      ? t("permissionDeniedAction")
      : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
  }
}

async function clearCallNoteContext() {
  if (!canClearCallNoteContext.value) return;
  operationError.value = "";
  try {
    await auxMutationResource.submit({
      doctype: "AT Call Note",
      name: filters.referenceName,
      data: {
        next_follow_up_on: null,
      },
    });
    await reloadSnapshot();
  } catch (error) {
    operationError.value = isPermissionDeniedError(error)
      ? t("permissionDeniedAction")
      : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
  }
}

function canRetryOutboxRow(row) {
  return canRetryOutboxAction.value && ["Failed", "Dead"].includes(String(row?.status || ""));
}

function canSendDraftFromOutboxRow(row) {
  return canSendDraftNowAction.value && row?.status !== "Sent" && Boolean(row?.draft);
}

function canSendDraftCard(draft) {
  return canSendDraftNowAction.value && draft?.status !== "Sent";
}

function sourcePanelConfig(item) {
  return getSourcePanelConfig(item?.reference_doctype, item?.reference_name);
}
function canOpenPanel(item) {
  return Boolean(sourcePanelConfig(item));
}
function panelActionLabel(item) {
  const cfg = sourcePanelConfig(item);
  return cfg ? t(cfg.labelKey) : "";
}
function openPanel(item) {
  const cfg = sourcePanelConfig(item);
  if (!cfg?.url) return;
  router.push(cfg.url);
}
function referenceTypeLabel(doctype) {
  const value = String(doctype || "").trim();
  if (value === "AT Lead") return t("referenceLead");
  if (value === "AT Offer") return t("referenceOffer");
  if (value === "AT Policy") return t("referencePolicy");
  if (value === "AT Customer") return t("referenceCustomer");
  if (value === "AT Claim") return t("referenceClaim");
  if (value === "AT Payment") return t("referencePayment");
  if (value === "AT Renewal Task") return t("referenceRenewalTask");
  if (value === "AT Accounting Entry") return t("referenceAccountingEntry");
  if (value === "AT Reconciliation Item") return t("referenceReconciliationItem");
  return value || "-";
}

function buildQuickMessagePayload({ form, openAfter }) {
  return {
    template: form.template || null,
    channel: form.channel || null,
    language: form.language || null,
    customer: form.customer || null,
    office_branch: branchStore.requestBranch || null,
    recipient: form.recipient || null,
    reference_doctype: form.reference_doctype || null,
    reference_name: form.reference_name || null,
    subject: form.subject || null,
    body: form.body || null,
    send_now: openAfter ? 1 : 0,
  };
}

function isPermissionDeniedError(error) {
  const status = Number(
    error?.statusCode ??
      error?.status ??
      error?.httpStatus ??
      error?.response?.status ??
      0
  );
  const text = String(error?.message || error?.messages?.join(" ") || error?.exc_type || "").toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    text.includes("permission") ||
    text.includes("not permitted") ||
    text.includes("not authorized")
  );
}

async function prepareQuickMessageDialog({ form }) {
  if (filters.customer && !form.customer) form.customer = filters.customer;
  if (filters.channel && !form.channel) form.channel = filters.channel;
  if (filters.referenceDoctype && !form.reference_doctype) form.reference_doctype = filters.referenceDoctype;
  if (filters.referenceName && !form.reference_name) form.reference_name = filters.referenceName;
  if (!form.language) form.language = activeLocale.value === "tr" ? "tr" : "en";
}

async function loadSegmentPreview() {
  if (!segmentPreviewSegment.value) return;
  segmentPreviewLoading.value = true;
  segmentPreviewError.value = "";
  try {
    const result = await segmentPreviewResource.submit({
      segment_name: segmentPreviewSegment.value,
      limit: 20,
    });
    segmentPreviewPayload.value = result || null;
  } catch (error) {
    segmentPreviewPayload.value = null;
    segmentPreviewError.value = isPermissionDeniedError(error)
      ? t("permissionDeniedRead")
      : error?.message || error?.exc || t("loadErrorTitle");
  } finally {
    segmentPreviewLoading.value = false;
  }
}

async function runCampaignExecution() {
  if (!campaignRunSelection.value) return;
  campaignRunLoading.value = true;
  campaignRunError.value = "";
  try {
    const result = await campaignRunResource.submit({
      campaign_name: campaignRunSelection.value,
      limit: 200,
    });
    campaignRunResult.value = result || null;
    await reloadSnapshot();
  } catch (error) {
    campaignRunResult.value = null;
    campaignRunError.value = isPermissionDeniedError(error)
      ? t("permissionDeniedAction")
      : error?.message || error?.exc || t("loadErrorTitle");
  } finally {
    campaignRunLoading.value = false;
  }
}

async function prepareCallNoteDialog({ form }) {
  if (filters.customer && !form.customer) form.customer = filters.customer;
  if (filters.referenceDoctype === "AT Policy" && filters.referenceName && !form.policy) form.policy = filters.referenceName;
  if (filters.referenceDoctype === "AT Claim" && filters.referenceName && !form.claim) form.claim = filters.referenceName;
  if (!form.note_at) form.note_at = new Date().toISOString().slice(0, 16);
}

function hasRouteContextQuery() {
  return Boolean(
    route.query.customer ||
      route.query.status ||
      route.query.channel ||
      route.query.reference_doctype ||
      route.query.reference_name
  );
}

onMounted(() => {
  if (hasRouteContextQuery()) return;
  applyPreset(presetKey.value, { refresh: false });
  if (String(presetKey.value || "default") !== "default") void reloadSnapshot();
  void hydratePresetStateFromServer();
});

watch(
  () => [
    route.query.customer,
    route.query.customer_label,
    route.query.status,
    route.query.channel,
    route.query.reference_doctype,
    route.query.reference_name,
    route.query.reference_label,
  ],
  ([customer, _customerLabel, status, channel, referenceDoctype, referenceName]) => {
    const nextCustomer = String(customer || "").trim();
    const nextStatus = String(status || "").trim();
    const nextChannel = String(channel || "").trim();
    const nextReferenceDoctype = String(referenceDoctype || "").trim();
    const nextReferenceName = String(referenceName || "").trim();
    if (
      filters.customer === nextCustomer &&
      filters.status === nextStatus &&
      filters.channel === nextChannel &&
      filters.referenceDoctype === nextReferenceDoctype &&
      filters.referenceName === nextReferenceName
    ) {
      return;
    }
    communicationStore.setFilters({
      customer: nextCustomer,
      status: nextStatus,
      channel: nextChannel,
      referenceDoctype: nextReferenceDoctype,
      referenceName: nextReferenceName,
    });
    reloadSnapshot();
  },
  { immediate: true }
);

watch(
  () => branchStore.selected,
  () => {
    void reloadQuickCustomers();
    void reloadSnapshot();
  }
);
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>

