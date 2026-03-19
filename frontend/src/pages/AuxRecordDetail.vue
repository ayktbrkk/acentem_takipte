<template>
  <section role="main" class="page-shell space-y-4">
    <div class="detail-topbar">
      <div>
        <p class="detail-breadcrumb">{{ localize(config.labels?.list) }}</p>
        <h1 class="text-xl font-medium text-gray-900">{{ recordTitle }}</h1>
      </div>
      <div class="flex items-center gap-2">
        <ActionButton variant="secondary" size="xs" @click="goBack">{{ t("backToList") }}</ActionButton>
        <ActionButton
          v-if="canOpenCommunicationContext"
          variant="secondary"
          size="xs"
          @click="openCommunicationContext"
        >
          {{ t("openCommunication") }}
        </ActionButton>
        <ActionButton
          v-if="canSendDraftLifecycle"
          variant="secondary"
          size="xs"
          @click="sendDraftLifecycle"
        >
          {{ t("sendNow") }}
        </ActionButton>
        <ActionButton
          v-if="canRetryOutboxLifecycle"
          variant="secondary"
          size="xs"
          @click="retryOutboxLifecycle"
        >
          {{ t("retry") }}
        </ActionButton>
        <ActionButton
          v-if="canRequeueOutboxLifecycle"
          variant="secondary"
          size="xs"
          @click="requeueOutboxLifecycle"
        >
          {{ t("requeue") }}
        </ActionButton>
        <ActionButton
          v-if="canStartTaskLifecycle"
          variant="secondary"
          size="xs"
          @click="markTaskLifecycle('In Progress')"
        >
          {{ t("startTask") }}
        </ActionButton>
        <ActionButton
          v-if="canBlockTaskLifecycle"
          variant="secondary"
          size="xs"
          @click="markTaskLifecycle('Blocked')"
        >
          {{ t("blockTaskAction") }}
        </ActionButton>
        <ActionButton
          v-if="canCompleteTaskLifecycle"
          variant="secondary"
          size="xs"
          @click="markTaskLifecycle('Done')"
        >
          {{ t("completeTaskAction") }}
        </ActionButton>
        <ActionButton
          v-if="canCancelTaskLifecycle"
          variant="secondary"
          size="xs"
          @click="markTaskLifecycle('Cancelled')"
        >
          {{ t("cancelTaskAction") }}
        </ActionButton>
        <ActionButton
          v-if="canCompleteReminderLifecycle"
          variant="secondary"
          size="xs"
          @click="markReminderLifecycle('Done')"
        >
          {{ t("completeTaskAction") }}
        </ActionButton>
        <ActionButton
          v-if="canCancelReminderLifecycle"
          variant="secondary"
          size="xs"
          @click="markReminderLifecycle('Cancelled')"
        >
          {{ t("cancelTaskAction") }}
        </ActionButton>
        <ActionButton
          v-if="canStartAssignmentLifecycle"
          variant="secondary"
          size="xs"
          @click="markAssignmentLifecycle('In Progress')"
        >
          {{ t("startAssignment") }}
        </ActionButton>
        <ActionButton
          v-if="canBlockAssignmentLifecycle"
          variant="secondary"
          size="xs"
          @click="markAssignmentLifecycle('Blocked')"
        >
          {{ t("blockAssignment") }}
        </ActionButton>
        <ActionButton
          v-if="canCloseAssignmentLifecycle"
          variant="secondary"
          size="xs"
          @click="markAssignmentLifecycle('Done')"
        >
          {{ t("closeAssignment") }}
        </ActionButton>
        <ActionButton v-if="quickEditConfig && canUseQuickEdit" variant="secondary" size="xs" @click="showQuickEditDialog = true">{{ t("quickEdit") }}</ActionButton>
        <ActionButton v-if="panelConfig" variant="link" size="xs" trailing-icon=">" @click="openPanel">{{ t("panel") }}</ActionButton>
        <ActionButton v-if="deskActionsEnabled()" variant="secondary" size="xs" @click="openDesk">{{ t("openDesk") }}</ActionButton>
      </div>
    </div>

    <div class="flex-1 px-5 pb-5">
      <!-- Loading -->
      <div v-if="activeLoading && !doc" class="flex items-center justify-center py-16 text-sm text-slate-500">
        <span class="animate-pulse">{{ t("loading") }}</span>
      </div>
      <!-- Error -->
      <div v-else-if="errorText" class="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        <p class="font-semibold">{{ t("loadErrorTitle") }}</p>
        <p class="mt-1">{{ errorText }}</p>
      </div>
      <!-- Empty -->
      <div v-else-if="isEmpty" class="flex flex-col items-center justify-center py-16 text-sm text-slate-400">
        <p class="font-medium text-slate-600">{{ t("emptyTitle") }}</p>
        <p class="mt-1">{{ t("emptyDescription") }}</p>
      </div>
      <template v-else-if="doc">
        <DocSummaryGrid :items="summaryItems" />

        <div v-if="specialBadges.length" class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('stateSummary')" :show-count="false" />
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge
              v-for="badge in specialBadges"
              :key="badge.key"
              :domain="badge.type"
              :status="badge.status"
            />
          </div>
        </div>

        <article class="surface-card rounded-2xl p-4">
          <DetailTabsBar v-model="activeDetailTab" :tabs="detailTabs" />
        </article>

        <div v-for="group in visibleGroups" :key="group.key" class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="group.title || groupTitle(group.key)" :show-count="false" />
          <div class="mt-3">
            <DocSummaryGrid :items="group.items || groupItems(group.fields)" />
          </div>
        </div>

        <article v-if="activeDetailTab === 'related'" class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('relatedTitle')" :count="relatedRecordCards.length" />
          <div v-if="relatedRecordCards.length" class="mt-3 grid gap-3 lg:grid-cols-2">
            <MetaListCard
              v-for="item in relatedRecordCards"
              :key="item.key"
              :title="item.title"
              :subtitle="item.subtitle"
              :description="item.description"
              :meta="item.meta"
            >
              <template #trailing>
                <ActionButton v-if="item.open" variant="link" size="xs" @click="item.open()">{{ t("panel") }}</ActionButton>
              </template>
            </MetaListCard>
          </div>
          <div v-else class="mt-3 at-empty-block">{{ t("noRelatedRecords") }}</div>
        </article>

        <article v-if="activeDetailTab === 'activity'" class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('activityTitle')" :count="activityItems.length" />
          <div v-if="activityItems.length" class="mt-3 space-y-3">
            <MetaListCard
              v-for="item in activityItems"
              :key="item.key"
              :title="item.title"
              :description="item.description"
              :meta="item.meta"
            />
          </div>
          <div v-else class="mt-3 at-empty-block">{{ t("noActivity") }}</div>
        </article>

        <div v-if="visibleTextBlocks.length" class="grid gap-4 lg:grid-cols-2">
          <article
            v-for="block in visibleTextBlocks"
            :key="block.key || block.field"
            class="surface-card rounded-2xl p-5"
            :class="block.fullWidth ? 'lg:col-span-2' : ''"
          >
            <SectionCardHeader :title="block.title || fieldLabel(block.field)" :show-count="false" />
            <pre class="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{{ block.value }}</pre>
          </article>
        </div>
      </template>
    </div>

    <QuickCreateManagedDialog
      v-if="quickEditConfig && canUseQuickEdit"
      v-model="showQuickEditDialog"
      :config-key="quickEditConfig.registryKey"
      :locale="activeLocale"
      :options-map="quickEditOptionsMap"
      :show-save-and-open="false"
      :before-open="prepareQuickEditDialog"
      :build-payload="buildQuickEditPayload"
      :after-submit="afterQuickEditSubmit"
      :success-handlers="quickEditSuccessHandlers"
      :labels="{ save: t('saveChanges'), cancel: t('cancel') }"
    />
  </section>
</template>

<script setup>
import { computed, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { getAuxWorkbenchConfig } from "../config/auxWorkbenchConfigs";
import { getSourcePanelConfig } from "../utils/sourcePanel";
import { navigateToSameOriginPath } from "../utils/safeNavigation";
import { getQuickCreateConfig } from "../config/quickCreateRegistry";
import { deskActionsEnabled } from "../utils/deskActions";
import DetailTabsBar from "../components/app-shell/DetailTabsBar.vue";
import DocSummaryGrid from "../components/app-shell/DocSummaryGrid.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import MetaListCard from "../components/app-shell/MetaListCard.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import SectionCardHeader from "../components/app-shell/SectionCardHeader.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";

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

if (!config) {
  throw new Error(`Unknown aux workbench screen: ${props.screenKey}`);
}

const copy = {
  tr: {
    backToList: "Listeye Dön",
    quickEdit: "Hızlı Düzenle",
    openDesk: "Yönetim",
    panel: "Panel",
    saveChanges: "Değişiklikleri Kaydet",
    cancel: "Vazgeç",
    openCommunication: "İletişim Merkezi",
    sendNow: "Hemen Gönder",
    retry: "Tekrar Dene",
    requeue: "Kuyruğa Al",
    startTask: "Takibe Al",
    blockTaskAction: "Bloke Et",
    completeTaskAction: "Tamamla",
    cancelTaskAction: "İptal Et",
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
    openDesk: "Desk",
    panel: "Panel",
    saveChanges: "Save Changes",
    cancel: "Cancel",
    openCommunication: "Communication Center",
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

const resource = createResource({ url: "frappe.client.get", auto: false });
const activeResource = computed(() => resource);
const activeLoading = computed(() => Boolean(unref(activeResource.value?.loading)));
const doc = computed(() => {
  const payload = unref(resource.data);
  return payload?.docs?.[0] || payload?.message || payload || null;
});
const errorText = computed(() => {
  const current = activeResource.value;
  const err = unref(current?.error);
  return err?.messages?.[0] || err?.message || "";
});
const isEmpty = computed(() => !activeLoading.value && !doc.value && !errorText.value);
const showQuickEditDialog = ref(false);
const activeDetailTab = ref("overview");
const quickEditConfig = computed(() => config.quickEdit || null);
const canUseQuickEdit = computed(() => {
  const registryKey = quickEditConfig.value?.registryKey;
  if (!registryKey) return false;
  return authStore.can(["quickEdit", registryKey]);
});

const auxQuickCustomerResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  params: {
    doctype: "AT Customer",
    fields: ["name", "full_name"],
    filters: buildOfficeBranchLookupFilters("AT Customer"),
    order_by: "modified desc",
    limit_page_length: 500,
  },
});
const auxQuickPolicyResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  params: {
    doctype: "AT Policy",
    fields: ["name", "policy_no", "customer"],
    filters: buildOfficeBranchLookupFilters("AT Policy"),
    order_by: "modified desc",
    limit_page_length: 500,
  },
});
const auxQuickInsuranceCompanyResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  params: {
    doctype: "AT Insurance Company",
    fields: ["name", "company_name", "company_code"],
    order_by: "company_name asc",
    limit_page_length: 500,
  },
});
const auxQuickSalesEntityResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  params: {
    doctype: "AT Sales Entity",
    fields: ["name", "full_name", "entity_type"],
    order_by: "full_name asc",
    limit_page_length: 500,
  },
});
const auxQuickAccountingEntryResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  params: {
    doctype: "AT Accounting Entry",
    fields: ["name", "source_doctype", "source_name", "status"],
    filters: buildOfficeBranchLookupFilters("AT Accounting Entry"),
    order_by: "modified desc",
    limit_page_length: 500,
  },
});
const auxMutationResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.quick_create.update_quick_aux_record",
  auto: false,
});
const campaignDraftsResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  params: {
    doctype: "AT Notification Draft",
    fields: ["name", "status", "channel", "recipient", "modified"],
    filters: {},
    order_by: "modified desc",
    limit_page_length: 20,
  },
});
const campaignOutboxResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  params: {
    doctype: "AT Notification Outbox",
    fields: ["name", "status", "channel", "recipient", "attempt_count", "modified"],
    filters: {},
    order_by: "modified desc",
    limit_page_length: 20,
  },
});
const sendDraftNowResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.communication.send_draft_now",
  auto: false,
});
const retryOutboxResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.communication.retry_outbox_item",
  auto: false,
});
const requeueOutboxResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.communication.requeue_outbox_item",
  auto: false,
});

function resourceValue(resource, fallback) {
  const value = unref(resource?.data);
  return value == null ? fallback : value;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

const quickEditOptionsMap = computed(() => ({
  customers: asArray(resourceValue(auxQuickCustomerResource, [])).map((row) => ({ value: row.name, label: row.full_name || row.name })),
  policies: asArray(resourceValue(auxQuickPolicyResource, [])).map((row) => ({ value: row.name, label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}` })),
  insuranceCompanies: asArray(resourceValue(auxQuickInsuranceCompanyResource, [])).map((row) => ({ value: row.name, label: `${row.company_name || row.name}${row.company_code ? ` (${row.company_code})` : ""}` })),
  salesEntities: asArray(resourceValue(auxQuickSalesEntityResource, [])).map((row) => ({ value: row.name, label: `${row.full_name || row.name}${row.entity_type ? ` (${row.entity_type})` : ""}` })),
  accountingEntries: asArray(resourceValue(auxQuickAccountingEntryResource, [])).map((row) => ({ value: row.name, label: `${row.name}${row.source_doctype ? ` (${row.source_doctype})` : ""}` })),
}));

const quickEditSuccessHandlers = {
  aux_detail: async () => {
    await reloadDetail();
  },
};
const isDraftDetail = computed(() => config.doctype === "AT Notification Draft");
const isOutboxDetail = computed(() => config.doctype === "AT Notification Outbox");
const canOpenCommunicationContext = computed(
  () => (isDraftDetail.value || isOutboxDetail.value || isReminderDetail.value || isTaskDetail.value || isOwnershipAssignmentDetail.value) && Boolean(doc.value?.name)
);
const isTaskDetail = computed(() => config.doctype === "AT Task");
const isReminderDetail = computed(() => config.doctype === "AT Reminder");
const isOwnershipAssignmentDetail = computed(() => config.doctype === "AT Ownership Assignment");
const draftLifecycleStatus = computed(() => String(doc.value?.status || "").trim());
const canSendDraftLifecycle = computed(() => isDraftDetail.value && Boolean(doc.value?.name) && draftLifecycleStatus.value !== "Sent");
const outboxLifecycleStatus = computed(() => String(doc.value?.status || "").trim());
const canRetryOutboxLifecycle = computed(() => isOutboxDetail.value && Boolean(doc.value?.name) && ["Failed", "Dead"].includes(outboxLifecycleStatus.value));
const canRequeueOutboxLifecycle = computed(() => isOutboxDetail.value && Boolean(doc.value?.name) && ["Queued", "Processing", "Failed", "Dead"].includes(outboxLifecycleStatus.value));
const taskLifecycleStatus = computed(() => String(doc.value?.status || "").trim());
const reminderLifecycleStatus = computed(() => String(doc.value?.status || "").trim());
const canStartTaskLifecycle = computed(() => isTaskDetail.value && Boolean(doc.value?.name) && taskLifecycleStatus.value === "Open");
const canBlockTaskLifecycle = computed(() => isTaskDetail.value && Boolean(doc.value?.name) && ["Open", "In Progress"].includes(taskLifecycleStatus.value));
const canCompleteTaskLifecycle = computed(() => isTaskDetail.value && Boolean(doc.value?.name) && ["Open", "In Progress", "Blocked"].includes(taskLifecycleStatus.value));
const canCancelTaskLifecycle = computed(() => isTaskDetail.value && Boolean(doc.value?.name) && ["Open", "In Progress", "Blocked"].includes(taskLifecycleStatus.value));
const canCompleteReminderLifecycle = computed(() => isReminderDetail.value && Boolean(doc.value?.name) && reminderLifecycleStatus.value === "Open");
const canCancelReminderLifecycle = computed(() => isReminderDetail.value && Boolean(doc.value?.name) && reminderLifecycleStatus.value === "Open");
const assignmentLifecycleStatus = computed(() => String(doc.value?.status || "").trim());
const canStartAssignmentLifecycle = computed(() => isOwnershipAssignmentDetail.value && Boolean(doc.value?.name) && assignmentLifecycleStatus.value !== "In Progress");
const canBlockAssignmentLifecycle = computed(() => isOwnershipAssignmentDetail.value && Boolean(doc.value?.name) && assignmentLifecycleStatus.value !== "Blocked");
const canCloseAssignmentLifecycle = computed(() => isOwnershipAssignmentDetail.value && Boolean(doc.value?.name) && assignmentLifecycleStatus.value !== "Done");

function humanizeField(field) {
  return String(field || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
const AUX_DETAIL_VALUE_LABELS = {
  tr: {
    Synced: "Senkron",
    Draft: "Taslak",
    Failed: "Başarısız",
    Claim: "Hasar",
    Policy: "Poliçe",
    Payment: "Ödeme",
    Resolved: "Çözüldü",
    Open: "Açık",
    Ignored: "Yoksayıldı",
    Amount: "Tutar",
    Currency: "Döviz",
    "Missing External": "Harici Kayıt Eksik",
    "Missing Local": "Yerel Kayıt Eksik",
    Status: "Durum",
    Other: "Diğer",
    Matched: "Eşleşti",
    Adjusted: "Düzeltildi",
    "Manual Override": "Manuel Geçersiz Kılma",
    "AT Policy": "Poliçe",
    "AT Claim": "Hasar",
    "AT Payment": "Ödeme",
    "AT Customer": "Müşteri",
    "AT Accounting Entry": "Muhasebe Kaydı",
    "AT Reconciliation Item": "Mutabakat Kalemi",
  },
  en: {},
};
const AUX_DETAIL_FIELD_LABELS = {
  "accounting-entries": {
    tr: {
      name: "Kayıt",
      status: "Durum",
      entry_type: "Kayıt Türü",
      currency: "Döviz",
      source_doctype: "Kaynak Tipi",
      source_name: "Kaynak Kayıt",
      source_label: "Kaynak Etiketi",
      source_status: "Kaynak Durumu",
      accounting_entry: "Muhasebe Kaydı",
      local_amount_try: "Yerel Tutar (TRY)",
      external_amount_try: "Harici Tutar (TRY)",
      difference_try: "Fark (TRY)",
      policy: "Poliçe",
      customer: "Müşteri",
      insurance_company: "Sigorta Şirketi",
      office_branch: "Ofis Şubesi",
      external_ref: "Harici Referans",
      integration_hash: "Entegrasyon Özet Değeri",
      payload_json: "Payload",
      synced_on: "Senkronizasyon Tarihi",
      local_amount: "Yerel Tutar",
      external_amount: "Harici Tutar",
      owner: "Kayıt Sahibi",
      modified: "Güncellendi",
    },
    en: {
      name: "Record",
      status: "Status",
      entry_type: "Entry Type",
      currency: "Currency",
      source_doctype: "Source DocType",
      source_name: "Source Record",
      source_label: "Source Label",
      source_status: "Source Status",
      accounting_entry: "Accounting Entry",
      local_amount_try: "Local Amount (TRY)",
      external_amount_try: "External Amount (TRY)",
      difference_try: "Difference (TRY)",
      policy: "Policy",
      customer: "Customer",
      insurance_company: "Insurance Company",
      office_branch: "Office Branch",
      external_ref: "External Reference",
      integration_hash: "Integration Hash",
      payload_json: "Payload",
      synced_on: "Synced On",
      local_amount: "Local Amount",
      external_amount: "External Amount",
      owner: "Owner",
      modified: "Modified",
    },
  },
  "reconciliation-items": {
    tr: {
      name: "Kayıt",
      status: "Durum",
      accounting_entry: "Muhasebe Kaydı",
      source_doctype: "Kaynak Tipi",
      source_name: "Kaynak Kayıt",
      mismatch_type: "Uyumsuzluk Tipi",
      difference_try: "Fark (TRY)",
      resolution_action: "Çözüm İşlemi",
      resolved_on: "Çözüm Tarihi",
      needs_reconciliation: "Mutabakat Gerekli",
      notes: "Notlar",
      details_json: "Detaylar",
      unique_key: "Benzersiz Anahtar",
      local_amount_try: "Yerel Tutar (TRY)",
      external_amount_try: "Harici Tutar (TRY)",
      resolved_by: "Çözen Kullanıcı",
      owner: "Kayıt Sahibi",
      modified: "Güncellendi",
    },
    en: {
      name: "Record",
      status: "Status",
      accounting_entry: "Accounting Entry",
      source_doctype: "Source DocType",
      source_name: "Source Record",
      mismatch_type: "Mismatch Type",
      difference_try: "Difference (TRY)",
      resolution_action: "Resolution Action",
      resolved_on: "Resolved On",
      needs_reconciliation: "Needs Reconciliation",
      notes: "Notes",
      details_json: "Details",
      unique_key: "Unique Key",
      local_amount_try: "Local Amount (TRY)",
      external_amount_try: "External Amount (TRY)",
      resolved_by: "Resolved By",
      owner: "Owner",
      modified: "Modified",
    },
  },
};
function fieldLabel(field) {
  const localized = AUX_DETAIL_FIELD_LABELS[config.key]?.[activeLocale.value]?.[field] || AUX_DETAIL_FIELD_LABELS[config.key]?.en?.[field];
  return localized || humanizeField(field);
}
function isFieldType(field, kind) { return Array.isArray(config[`${kind}Fields`]) && config[`${kind}Fields`].includes(field); }
function translateDetailValue(value) {
  const key = String(value ?? "");
  return AUX_DETAIL_VALUE_LABELS[activeLocale.value]?.[key] || key;
}
function formatValue(field, value) {
  if (value == null || value === "") return "-";
  if (isFieldType(field, "bool")) {
    const active = value === true || String(value) === "1";
    return active ? (activeLocale.value === "tr" ? "Evet" : "Yes") : (activeLocale.value === "tr" ? "Hayır" : "No");
  }
  if (isFieldType(field, "currency")) {
    const n = Number(value);
    return Number.isFinite(n)
      ? new Intl.NumberFormat(localeCode.value, { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n)
      : String(value);
  }
  if (isFieldType(field, "number")) {
    const n = Number(value);
    return Number.isFinite(n) ? new Intl.NumberFormat(localeCode.value).format(n) : String(value);
  }
  if (isFieldType(field, "date")) {
    try { return new Intl.DateTimeFormat(localeCode.value, { dateStyle: "short" }).format(new Date(value)); } catch { return String(value); }
  }
  if (isFieldType(field, "dateTime")) {
    try { return new Intl.DateTimeFormat(localeCode.value, { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); } catch { return String(value); }
  }
  if (["modified", "creation", "resolved_on", "sent_at", "next_retry_on", "last_attempt_on"].includes(field)) {
    try { return new Intl.DateTimeFormat(localeCode.value, { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); } catch { /* noop */ }
  }
  if (["due_date", "renewal_date", "policy_end_date"].includes(field)) {
    try { return new Intl.DateTimeFormat(localeCode.value, { dateStyle: "short" }).format(new Date(value)); } catch { /* noop */ }
  }
  if (["status", "entry_type", "source_doctype", "mismatch_type", "resolution_action"].includes(field)) {
    return translateDetailValue(value);
  }
  return String(value);
}

const recordTitle = computed(() => {
  const d = doc.value;
  return d ? String(d[config.titleField] || d.name || "-") : localize(config.labels.detail);
});
const recordSubtitle = computed(() => {
  const d = doc.value;
  if (!d) return localize(config.subtitle);
  const officeBranch = String(d.office_branch || "").trim();
  const localizedDoctype = localize(config.labels?.list) || config.doctype;
  return officeBranch ? `${localizedDoctype} | ${d.name} | ${officeBranch}` : `${localizedDoctype} | ${d.name}`;
});

const summaryItems = computed(() =>
  [
    ...(config.summaryFields || ["name", "owner", "modified"]),
    ...(doc.value?.office_branch ? ["office_branch"] : []),
  ]
    .filter((field, index, all) => all.indexOf(field) === index)
    .map((field) => ({
      key: field,
      label: field === "office_branch" ? t("officeBranch") : fieldLabel(field),
      value: formatValue(field, doc.value?.[field]),
    }))
);

const detailGroups = computed(() => config.detailGroups || []);
const detailFieldSet = computed(() => {
  const fieldSet = new Set([
    "name",
    config.titleField,
    config.statusField,
    config.secondaryStatusField,
    ...(config.summaryFields || []),
    ...(config.textFields || []),
  ]);
  for (const group of config.detailGroups || []) {
    for (const field of group.fields || []) fieldSet.add(field);
  }
  if (config.panelRef?.doctypeField) fieldSet.add(config.panelRef.doctypeField);
  if (config.panelRef?.nameField) fieldSet.add(config.panelRef.nameField);
  fieldSet.add("owner");
  fieldSet.add("modified");
  return Array.from(fieldSet).filter(Boolean);
});
const specialDetailMode = computed(() => {
  if (config.key === "accounting-entries") return "accounting";
  if (config.key === "reconciliation-items") return "reconciliation";
  if (config.key === "templates") return "template";
  if (config.key === "notification-outbox") return "outbox";
  if (config.key === "customer-segment-snapshots") return "segment_snapshot";
  if (config.key === "ownership-assignments") return "ownership_assignment";
  if (config.key === "access-logs") return "access_log";
  return "";
});

function item(field, customLabel = "") {
  return {
    key: field,
    label: customLabel || fieldLabel(field),
    value: formatValue(field, doc.value?.[field]),
  };
}

const specialBadges = computed(() => {
  if (!doc.value) return [];
  if (specialDetailMode.value === "reconciliation") {
    const badges = [];
    if (doc.value.status) badges.push({ key: "status", type: "reconciliation", status: String(doc.value.status) });
    return badges;
  }
  if (specialDetailMode.value === "template") {
    const badges = [];
    if (doc.value.channel) badges.push({ key: "channel", type: "notification_channel", status: String(doc.value.channel) });
    if (doc.value.is_active !== undefined && doc.value.is_active !== null && doc.value.is_active !== "") {
      badges.push({ key: "is_active", type: "boolean_active", status: String(doc.value.is_active) });
    }
    return badges;
  }
  if (specialDetailMode.value === "outbox") {
    const badges = [];
    if (doc.value.status) badges.push({ key: "status", type: "notification_status", status: String(doc.value.status) });
    if (doc.value.channel) badges.push({ key: "channel", type: "notification_channel", status: String(doc.value.channel) });
    return badges;
  }
  return [];
});

const specialGroups = computed(() => {
  if (!doc.value) return [];
  if (specialDetailMode.value === "segment_snapshot") {
    return [
      {
        key: "snapshot-context",
        title: t("snapshotContext"),
        items: [
          item("customer"),
          item("office_branch", t("officeBranch")),
          item("snapshot_date"),
          item("segment"),
          item("value_band"),
          item("claim_risk"),
          item("score"),
          item("source_version"),
        ],
      },
      {
        key: "snapshot-signals",
        title: t("snapshotSignals"),
        items: [
          { key: "strength_count", label: t("strengthSignals"), value: String(parseSignalEntries(doc.value?.strengths_json).length) },
          { key: "risk_count", label: t("riskSignals"), value: String(parseSignalEntries(doc.value?.risks_json).length) },
          { key: "reason_count", label: t("scoreReasons"), value: String(parseSignalEntries(doc.value?.score_reason_json).length) },
        ],
      },
    ];
  }
  if (specialDetailMode.value === "ownership_assignment") {
    return [
      {
        key: "assignment-context",
        title: t("assignmentContext"),
        items: [
          item("source_doctype"),
          item("source_name"),
          item("customer"),
          item("policy"),
          item("office_branch", t("officeBranch")),
        ],
      },
      {
        key: "assignment-lifecycle",
        title: t("assignmentLifecycle"),
        items: [
          item("assigned_to"),
          item("assignment_role"),
          item("status"),
          item("priority"),
          item("due_date"),
        ],
      },
    ];
  }
  if (specialDetailMode.value === "access_log") {
    return [
      {
        key: "audit-context",
        title: t("auditContext"),
        items: [
          item("reference_doctype"),
          item("reference_name"),
          item("viewed_by"),
          item("action"),
          item("viewed_on"),
          item("ip_address"),
        ],
      },
      {
        key: "audit-decision",
        title: t("auditDecision"),
        items: [
          item("action_summary", t("auditActionSummary")),
          {
            key: "decision_context_count",
            label: t("auditDecisionContext"),
            value: String(parseSignalEntries(doc.value?.decision_context).length || 0),
          },
        ],
      },
    ];
  }
  if (specialDetailMode.value === "accounting") {
    return [
      {
        key: "accounting-amounts",
        title: t("accountingAmounts"),
        items: [
          item("local_amount_try"),
          item("external_amount_try"),
          item("difference_try"),
          item("currency"),
          item("local_amount"),
          item("external_amount"),
        ],
      },
      {
        key: "accounting-source",
        title: t("accountingSource"),
        items: [
          item("source_doctype"),
          item("source_name"),
          item("policy"),
          item("customer"),
          item("insurance_company"),
          item("external_ref"),
        ],
      },
      {
        key: "accounting-sync",
        title: t("accountingSync"),
        items: [
          item("status"),
          item("entry_type"),
          item("needs_reconciliation"),
          item("last_synced_on"),
          item("sync_attempt_count"),
          item("modified"),
        ],
      },
    ];
  }
  if (specialDetailMode.value === "reconciliation") {
    return [
      {
        key: "reconciliation-context",
        title: activeLocale.value === "tr" ? "Kaynak ve Kayıt Bağlamı" : "Source & Record Context",
        items: [
          item("accounting_entry"),
          item("source_doctype"),
          item("source_name"),
          item("status"),
          item("unique_key"),
        ],
      },
      {
        key: "reconciliation-amounts",
        title: activeLocale.value === "tr" ? "Mutabakat Tutar Özeti" : "Reconciliation Amount Summary",
        items: [
          item("mismatch_type"),
          item("local_amount_try"),
          item("external_amount_try"),
          item("difference_try"),
          item("resolution_action"),
        ],
      },
      {
        key: "reconciliation-resolution",
        title: activeLocale.value === "tr" ? "Çözüm ve Yaşam Döngüsü" : "Resolution & Lifecycle",
        items: [
          item("resolved_by"),
          item("resolved_on"),
          item("owner"),
          item("modified"),
        ],
      },
    ];
  }
  if (specialDetailMode.value === "template") {
    return [
      {
        key: "template-meta",
        title: t("templateMeta"),
        items: [
          item("template_key"),
          item("event_key"),
          item("channel"),
          item("language"),
          item("subject"),
          item("is_active"),
        ],
      },
      {
        key: "template-lifecycle",
        title: t("templateLifecycle"),
        items: [
          item("owner"),
          item("modified"),
          item("name"),
        ],
      },
    ];
  }
  if (specialDetailMode.value === "outbox") {
    return [
      {
        key: "outbox-delivery",
        title: t("outboxDelivery"),
        items: [
          item("provider"),
          item("priority"),
          item("attempt_count"),
          item("max_attempts"),
          item("status"),
          item("channel"),
        ],
      },
      {
        key: "outbox-retry",
        title: t("outboxRetry"),
        items: [
          item("next_retry_on"),
          item("last_attempt_on"),
          item("provider_message_id"),
          item("modified"),
        ],
      },
      {
        key: "outbox-reference",
        title: t("outboxReference"),
        items: [
          item("reference_doctype"),
          item("reference_name"),
          item("customer"),
          item("draft"),
        ],
      },
      {
        key: "outbox-queue",
        title: t("outboxQueue"),
        items: [
          item("owner"),
          item("name"),
        ],
      },
    ];
  }
  return [];
});

const renderedGroups = computed(() => {
  if (specialGroups.value.length) return specialGroups.value;
  return detailGroups.value.map((group) => ({ ...group, title: groupTitle(group.key), items: groupItems(group.fields) }));
});

function isOperationGroup(group) {
  const key = String(group?.key || "");
  return ["accounting-sync", "outbox-delivery", "outbox-retry", "outbox-queue"].includes(key);
}
function isRelatedGroup(group) {
  const key = String(group?.key || "");
  return ["accounting-source", "outbox-reference", "reference"].includes(key);
}

const generalGroups = computed(() => renderedGroups.value.filter((g) => !isOperationGroup(g) && !isRelatedGroup(g)));
const relatedGroups = computed(() => renderedGroups.value.filter((g) => isRelatedGroup(g)));
const operationGroups = computed(() => renderedGroups.value.filter((g) => isOperationGroup(g)));

function groupTitle(key) {
  const titles = {
    base: activeLocale.value === "tr" ? "Temel Bilgiler" : "Base Info",
    schedule: activeLocale.value === "tr" ? "Takvim" : "Schedule",
    assignment: activeLocale.value === "tr" ? "Atama" : "Assignment",
    draft: activeLocale.value === "tr" ? "Taslak Bilgisi" : "Draft Info",
    delivery: activeLocale.value === "tr" ? "Gönderim Bilgisi" : "Delivery Info",
    reference: activeLocale.value === "tr" ? "Kaynak Bağlamı" : "Reference Context",
  };
  return titles[key] || humanizeField(key);
}
function groupItems(fields) {
  return (fields || []).map((field) => ({
    key: field,
    label: fieldLabel(field),
    value: formatValue(field, doc.value?.[field]),
  }));
}

const textBlocks = computed(() =>
  (config.textFields || [])
    .map((field) => ({ field, value: doc.value?.[field] }))
    .filter((item) => item.value != null && String(item.value).trim() !== "")
);

const specialTextBlocks = computed(() => {
  if (!doc.value) return [];
  if (specialDetailMode.value === "accounting") {
    return [
      { key: "payload_json", field: "payload_json", title: t("payloadJson"), value: doc.value?.payload_json, fullWidth: true },
      { key: "error_message", field: "error_message", title: fieldLabel("error_message"), value: doc.value?.error_message },
    ].filter((item) => item.value != null && String(item.value).trim() !== "");
  }
  if (specialDetailMode.value === "reconciliation") {
    return [
      { key: "notes", field: "notes", title: fieldLabel("notes"), value: doc.value?.notes, fullWidth: true },
      { key: "details_json", field: "details_json", title: fieldLabel("details_json"), value: doc.value?.details_json, fullWidth: true },
    ].filter((item) => item.value != null && String(item.value).trim() !== "");
  }
  if (specialDetailMode.value === "template") {
    return [
      { key: "body_template", field: "body_template", title: t("bodyTemplate"), value: doc.value?.body_template, fullWidth: true },
    ].filter((item) => item.value != null && String(item.value).trim() !== "");
  }
  if (specialDetailMode.value === "outbox") {
    return [
      { key: "error_message", field: "error_message", title: fieldLabel("error_message"), value: doc.value?.error_message },
      { key: "response_log", field: "response_log", title: t("responseLog"), value: doc.value?.response_log, fullWidth: true },
    ].filter((item) => item.value != null && String(item.value).trim() !== "");
  }
  if (specialDetailMode.value === "segment_snapshot") {
    return [
      {
        key: "strengths_json",
        field: "strengths_json",
        title: t("strengthSignals"),
        value: formatSignalText(doc.value?.strengths_json),
      },
      {
        key: "risks_json",
        field: "risks_json",
        title: t("riskSignals"),
        value: formatSignalText(doc.value?.risks_json),
      },
      {
        key: "score_reason_json",
        field: "score_reason_json",
        title: t("scoreReasons"),
        value: formatSignalText(doc.value?.score_reason_json),
        fullWidth: true,
      },
    ].filter((item) => item.value != null && String(item.value).trim() !== "");
  }
  if (specialDetailMode.value === "ownership_assignment") {
    return [
      { key: "notes", field: "notes", title: t("assignmentNotes"), value: doc.value?.notes, fullWidth: true },
    ].filter((item) => item.value != null && String(item.value).trim() !== "");
  }
  if (specialDetailMode.value === "access_log") {
    return [
      {
        key: "action_summary",
        field: "action_summary",
        title: t("auditActionSummary"),
        value: doc.value?.action_summary,
        fullWidth: true,
      },
      {
        key: "decision_context",
        field: "decision_context",
        title: t("auditDecisionContext"),
        value: formatSignalText(doc.value?.decision_context) || t("noDecisionContext"),
        fullWidth: true,
      },
    ].filter((item) => item.value != null && String(item.value).trim() !== "");
  }
  return [];
});

const renderedTextBlocks = computed(() => {
  if (specialTextBlocks.value.length) return specialTextBlocks.value;
  return textBlocks.value.map((block) => ({
    key: block.field,
    field: block.field,
    title: fieldLabel(block.field),
    value: block.value,
    fullWidth: false,
  }));
});

const relatedRecordCards = computed(() => {
  if (!doc.value) return [];
  const d = doc.value;
  const items = [];
  const pushRef = (key, title, doctype, recName, subtitle = "") => {
    if (!recName) return;
    const panel = getSourcePanelConfig(doctype, recName);
    items.push({
      key,
      title,
      subtitle: subtitle || doctype || "-",
      description: recName,
      meta: doctype || "-",
      open: panel?.url ? () => { navigateToSameOriginPath(panel.url); } : null,
    });
  };
  pushRef("customer", t("relatedCustomer"), "AT Customer", d.customer);
  pushRef("policy", t("relatedPolicy"), "AT Policy", d.policy);
  pushRef("draft", t("relatedDraft"), "AT Notification Draft", d.draft);
  pushRef("outbox", t("relatedOutbox"), "AT Notification Outbox", d.outbox_record);
  pushRef("accounting_entry", t("relatedAccountingEntry"), "AT Accounting Entry", d.accounting_entry);
  if (d.reference_doctype && d.reference_name) pushRef("reference", t("relatedReference"), d.reference_doctype, d.reference_name);
  if (d.source_doctype && d.source_name) pushRef("source", t("relatedSource"), d.source_doctype, d.source_name);
  if (config.doctype === "AT Campaign") {
    for (const draft of asArray(resourceValue(campaignDraftsResource, []))) {
      items.push({
        key: `campaign-draft-${draft.name}`,
        title: `${t("relatedDraft")} - ${draft.name}`,
        subtitle: [draft.channel, draft.status].filter(Boolean).join(" / ") || "AT Notification Draft",
        description: draft.recipient || draft.name,
        meta: formatValue("modified", draft.modified),
        open: () => {
          const panel = getSourcePanelConfig("AT Notification Draft", draft.name);
          if (panel?.url) navigateToSameOriginPath(panel.url);
        },
      });
    }
    for (const outbox of asArray(resourceValue(campaignOutboxResource, []))) {
      items.push({
        key: `campaign-outbox-${outbox.name}`,
        title: `${t("relatedOutbox")} - ${outbox.name}`,
        subtitle: [outbox.channel, outbox.status].filter(Boolean).join(" / ") || "AT Notification Outbox",
        description: outbox.recipient || outbox.name,
        meta: outbox.attempt_count != null ? `${outbox.attempt_count}` : formatValue("modified", outbox.modified),
        open: () => {
          const panel = getSourcePanelConfig("AT Notification Outbox", outbox.name);
          if (panel?.url) navigateToSameOriginPath(panel.url);
        },
      });
    }
  }
  return items;
});

const activityItems = computed(() => {
  if (!doc.value) return [];
  const d = doc.value;
  const rows = [];
  const add = (fieldKey, title, value, meta = "") => {
    if (!value) return;
    rows.push({
      key: fieldKey,
      title,
      description: formatValue(fieldKey, value),
      meta: meta || "-",
    });
  };
  add("creation", t("createdAt"), d.creation, d.owner || "");
  add("modified", t("modifiedAt"), d.modified, d.modified_by || d.owner || "");
  add("resolved_on", t("resolvedAt"), d.resolved_on, d.resolved_by || "");
  add("sent_at", t("sentAt"), d.sent_at, d.channel || "");
  add("last_attempt_on", t("lastAttemptAt"), d.last_attempt_on, d.provider || "");
  add("next_retry_on", t("nextRetryAt"), d.next_retry_on, d.status || "");
  add("last_synced_on", t("lastSyncedAt"), d.last_synced_on, d.status || "");
  return rows;
});

const detailTabs = computed(() => {
  const tabs = [{ value: "overview", label: t("tabOverview") }];
  if (relatedGroups.value.length || relatedRecordCards.value.length) tabs.push({ value: "related", label: t("tabRelated"), count: relatedRecordCards.value.length || undefined });
  if (activityItems.value.length) tabs.push({ value: "activity", label: t("tabActivity"), count: activityItems.value.length });
  if (operationGroups.value.length) tabs.push({ value: "operations", label: t("tabOperations"), count: operationGroups.value.length });
  if (renderedTextBlocks.value.length) tabs.push({ value: "logs", label: t("tabLogs"), count: renderedTextBlocks.value.length });
  return tabs;
});

const visibleGroups = computed(() => {
  if (activeDetailTab.value === "overview") return generalGroups.value;
  if (activeDetailTab.value === "related") return relatedGroups.value;
  if (activeDetailTab.value === "operations") return operationGroups.value;
  return [];
});

const visibleTextBlocks = computed(() => (activeDetailTab.value === "logs" ? renderedTextBlocks.value : []));

const panelConfig = computed(() => {
  if (!doc.value || !config.panelRef) return null;
  return getSourcePanelConfig(doc.value?.[config.panelRef.doctypeField], doc.value?.[config.panelRef.nameField]);
});

function getQuickEditRegistryCfg() {
  return quickEditConfig.value?.registryKey ? getQuickCreateConfig(quickEditConfig.value.registryKey) : null;
}

function buildOfficeBranchLookupFilters(doctype) {
  const officeBranch = branchStore.requestBranch;
  if (!officeBranch) return {};
  if (!["AT Customer", "AT Policy", "AT Accounting Entry"].includes(String(doctype || "").trim())) return {};
  return { office_branch: officeBranch };
}

async function ensureQuickEditOptionSources() {
  const registryKey = quickEditConfig.value?.registryKey;
  if (!registryKey) return;
  auxQuickCustomerResource.params = {
    ...auxQuickCustomerResource.params,
    filters: buildOfficeBranchLookupFilters("AT Customer"),
  };
  auxQuickPolicyResource.params = {
    ...auxQuickPolicyResource.params,
    filters: buildOfficeBranchLookupFilters("AT Policy"),
  };
  auxQuickAccountingEntryResource.params = {
    ...auxQuickAccountingEntryResource.params,
    filters: buildOfficeBranchLookupFilters("AT Accounting Entry"),
  };
  if (["accounting_entry_edit", "reconciliation_item_edit"].includes(registryKey)) {
    await auxQuickAccountingEntryResource.reload().catch(() => {});
  }
  if (["accounting_entry_edit"].includes(registryKey)) {
    await Promise.allSettled([
      auxQuickCustomerResource.reload(),
      auxQuickPolicyResource.reload(),
      auxQuickInsuranceCompanyResource.reload(),
      auxQuickSalesEntityResource.reload(),
    ]);
  }
  if (["branch_master_edit"].includes(registryKey)) {
    await auxQuickInsuranceCompanyResource.reload().catch(() => {});
  }
  if (["sales_entity_master_edit"].includes(registryKey)) {
    await auxQuickSalesEntityResource.reload().catch(() => {});
  }
}

function normalizeQuickEditFormValue(field, value) {
  if (field?.type === "checkbox") return value === true || String(value) === "1";
  if (value == null) return "";
  return value;
}

async function prepareQuickEditDialog({ form, resetForm }) {
  await ensureQuickEditOptionSources();
  const reg = getQuickEditRegistryCfg();
  const current = doc.value || {};
  const overrides = {};
  for (const field of reg?.fields || []) {
    overrides[field.name] = normalizeQuickEditFormValue(field, current[field.name]);
  }
  resetForm(overrides);
}

async function buildQuickEditPayload({ form }) {
  const reg = getQuickEditRegistryCfg();
  const data = {};
  for (const field of reg?.fields || []) {
    let value = form[field.name];
    if (field.type === "number") {
      value = value === "" || value == null ? null : Number(value);
    } else if (field.type === "checkbox") {
      value = Boolean(value);
    } else if (typeof value === "string") {
      value = value.trim();
      if (!value) value = null;
    }
    data[field.name] = value;
  }
  return {
    doctype: config.doctype,
    name: props.name,
    data,
  };
}

async function afterQuickEditSubmit() {
  await reloadDetail();
}

async function sendDraftLifecycle() {
  if (!canSendDraftLifecycle.value || !doc.value?.name) return;
  await sendDraftNowResource.submit({
    draft_name: doc.value.name,
  });
  await reloadDetail();
}

async function retryOutboxLifecycle() {
  if (!canRetryOutboxLifecycle.value || !doc.value?.name) return;
  await retryOutboxResource.submit({
    outbox_name: doc.value.name,
  });
  await reloadDetail();
}

async function requeueOutboxLifecycle() {
  if (!canRequeueOutboxLifecycle.value || !doc.value?.name) return;
  await requeueOutboxResource.submit({
    outbox_name: doc.value.name,
  });
  await reloadDetail();
}

async function markTaskLifecycle(status) {
  if (!isTaskDetail.value || !doc.value?.name || !String(status || "").trim()) return;
  await auxMutationResource.submit({
    doctype: "AT Task",
    name: doc.value.name,
    data: {
      status,
    },
  });
  await reloadDetail();
}

async function markReminderLifecycle(status) {
  if (!isReminderDetail.value || !doc.value?.name || !String(status || "").trim()) return;
  await auxMutationResource.submit({
    doctype: "AT Reminder",
    name: doc.value.name,
    data: {
      status,
    },
  });
  await reloadDetail();
}

async function markAssignmentLifecycle(status) {
  if (!isOwnershipAssignmentDetail.value || !doc.value?.name || !String(status || "").trim()) return;
  await auxMutationResource.submit({
    doctype: "AT Ownership Assignment",
    name: doc.value.name,
    data: {
      status,
    },
  });
  await reloadDetail();
}

function reloadDetail() {
  const detailPromise = resource.reload({ doctype: config.doctype, name: props.name });
  if (config.doctype !== "AT Campaign") return detailPromise;
  campaignDraftsResource.params = {
    ...campaignDraftsResource.params,
    filters: {
      reference_doctype: "AT Campaign",
      reference_name: props.name,
    },
  };
  campaignOutboxResource.params = {
    ...campaignOutboxResource.params,
    filters: {
      reference_doctype: "AT Campaign",
      reference_name: props.name,
    },
  };
  return Promise.allSettled([
    detailPromise,
    campaignDraftsResource.reload(),
    campaignOutboxResource.reload(),
  ]).then(([detailResult]) => detailResult.value);
}

function goBack() {
  router.push({ name: `${config.key}-list` });
}
function openCommunicationContext() {
  if (!canOpenCommunicationContext.value || !doc.value?.name) return;
  router.push({
    name: "communication-center",
    query: {
      reference_doctype: config.doctype,
      reference_name: doc.value.name,
      reference_label: recordTitle.value || doc.value.name,
      return_to: route.fullPath || route.path,
    },
  });
}
function openDesk() {
  navigateToSameOriginPath(`/app/Form/${encodeURIComponent(config.doctype)}/${encodeURIComponent(props.name)}`);
}
function openPanel() {
  if (!panelConfig.value?.url) return;
  navigateToSameOriginPath(panelConfig.value.url);
}

function parseSignalEntries(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      return parseSignalEntries(JSON.parse(value));
    } catch {
      return value
        .split(/\r?\n/)
        .map((entry) => entry.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean);
    }
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, entry]) => `${humanizeField(key)}: ${entry}`)
      .filter(Boolean);
  }
  return [String(value)];
}

function formatSignalText(value) {
  const entries = parseSignalEntries(value);
  return entries.length ? entries.map((entry) => `- ${entry}`).join("\n") : t("noSignals");
}

watch(
  () => branchStore.selected,
  () => {
    if (!showQuickEditDialog.value) return;
    void ensureQuickEditOptionSources();
  }
);

reloadDetail();
</script>
