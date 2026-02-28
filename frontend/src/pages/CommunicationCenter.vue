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
        <ActionButton variant="link" size="xs" @click="clearContextFilters">{{ t("clearContext") }}</ActionButton>
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
      v-if="canCreateQuickMessage"
      v-model="showQuickMessageDialog"
      config-key="communication_message"
      :locale="sessionState.locale"
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
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { createResource } from "frappe-ui";

import { hasSessionCapability, sessionState } from "../state/session";
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

const copy = {
  tr: {
    title: "Iletisim Merkezi",
    subtitle: "Bildirim kuyrugu, dagitim ve tekrar deneme operasyonlari",
    refresh: "Yenile",
    dispatch: "Dagitimi Calistir",
    dispatching: "Calisiyor...",
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
  },
  en: {
    title: "Communication Center",
    subtitle: "Notification queue, dispatch and retry operations",
    refresh: "Refresh",
    dispatch: "Run Dispatch",
    dispatching: "Running...",
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
  },
};

function t(key) {
  return copy[sessionState.locale]?.[key] || copy.en[key] || key;
}

const filters = reactive({
  customer: "",
  status: "",
  channel: "",
  referenceDoctype: "",
  referenceName: "",
  limit: 50,
});

const dispatching = ref(false);
const showQuickMessageDialog = ref(false);
const operationError = ref("");

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
    order_by: "modified desc",
    limit_page_length: 500,
  },
});

const snapshotData = computed(() => snapshotResource.data || {});
const snapshotErrorMessage = computed(() => {
  const raw = snapshotResource.error;
  if (!raw) return "";
  if (isPermissionDeniedError(raw)) return t("permissionDeniedRead");
  if (typeof raw === "string") return raw;
  return raw?.message || raw?.exc || t("loadErrorTitle");
});
const outboxItems = computed(() => snapshotData.value.outbox || []);
const draftItems = computed(() => snapshotData.value.drafts || []);
const breakdown = computed(() => snapshotData.value.status_breakdown || []);
const activeFilterCount = computed(() => {
  let count = 0;
  if (filters.customer) count += 1;
  if (filters.status) count += 1;
  if (filters.channel) count += 1;
  if (filters.referenceDoctype) count += 1;
  if (filters.referenceName) count += 1;
  if (Number(filters.limit) !== 50) count += 1;
  return count;
});
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
  getSortLocale: () => (sessionState.locale === "tr" ? "tr-TR" : "en-US"),
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
}));
const canCreateQuickMessage = computed(() => hasSessionCapability(["quickCreate", "communication_message"]));
const canSendDraftNowAction = computed(() => hasSessionCapability(["actions", "communication", "sendDraftNow"]));
const canRetryOutboxAction = computed(() => hasSessionCapability(["actions", "communication", "retryOutbox"]));
const canRunDispatchCycle = computed(() => hasSessionCapability(["actions", "communication", "runDispatchCycle"]));
const quickMessageDialogLabels = computed(() => ({
  save: t("saveDraft"),
  saveAndOpen: t("sendImmediately"),
}));
const quickMessageSuccessHandlers = {
  communication_snapshot: async () => {
    await reloadSnapshot();
  },
};

const statusCards = computed(() => [
  { key: "queued", label: t("queued"), value: statusCount("Queued") },
  { key: "processing", label: t("processing"), value: statusCount("Processing") },
  { key: "sent", label: t("sent"), value: statusCount("Sent") },
  { key: "failed", label: t("failed"), value: statusCount("Failed") },
  { key: "dead", label: t("dead"), value: statusCount("Dead") },
]);

function buildParams() {
  return {
    customer: filters.customer || null,
    status: filters.status || null,
    channel: filters.channel || null,
    reference_doctype: filters.referenceDoctype || null,
    reference_name: filters.referenceName || null,
    limit: filters.limit,
  };
}

function resetCommunicationFilterState() {
  filters.customer = "";
  filters.status = "";
  filters.channel = "";
  filters.referenceDoctype = "";
  filters.referenceName = "";
  filters.limit = 50;
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

function statusCount(status) {
  const row = breakdown.value.find((item) => item.status === status);
  return Number(row?.total || 0);
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
  return channel || "-";
}

function reloadSnapshot() {
  operationError.value = "";
  snapshotResource.params = buildParams();
  return snapshotResource.reload();
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
  filters.customer = "";
  filters.status = "";
  filters.channel = "";
  filters.referenceDoctype = "";
  filters.referenceName = "";
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
  if (!form.language) form.language = sessionState.locale === "tr" ? "tr" : "en";
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
    filters.customer = nextCustomer;
    filters.status = nextStatus;
    filters.channel = nextChannel;
    filters.referenceDoctype = nextReferenceDoctype;
    filters.referenceName = nextReferenceName;
    reloadSnapshot();
  },
  { immediate: true }
);
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>

