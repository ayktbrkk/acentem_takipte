<template>
  <div class="space-y-6">
    <DocHeaderCard :eyebrow="label('list')" :title="recordTitle" :subtitle="recordSubtitle">
      <template #actions>
        <DetailActionRow>
          <ActionButton variant="secondary" size="xs" @click="goBack">{{ t("backToList") }}</ActionButton>
          <ActionButton v-if="quickEditConfig && canUseQuickEdit" variant="secondary" size="xs" @click="showQuickEditDialog = true">{{ t("quickEdit") }}</ActionButton>
          <ActionButton v-if="panelConfig" variant="link" size="xs" trailing-icon=">" @click="openPanel">{{ t("panel") }}</ActionButton>
          <ActionButton v-if="deskActionsEnabled()" variant="secondary" size="xs" @click="openDesk">{{ t("openDesk") }}</ActionButton>
        </DetailActionRow>
      </template>
    </DocHeaderCard>

    <DataTableShell
      :loading="resource.loading && !doc"
      :error="errorText"
      :loading-label="t('loading')"
      :error-title="t('loadErrorTitle')"
      :empty="!resource.loading && !doc && !errorText"
      :empty-title="t('emptyTitle')"
      :empty-description="t('emptyDescription')"
    >
      <template v-if="doc">
        <DocSummaryGrid :items="summaryItems" />

        <div v-if="specialBadges.length" class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('stateSummary')" :show-count="false" />
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge
              v-for="badge in specialBadges"
              :key="badge.key"
              :type="badge.type"
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
    </DataTableShell>

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
  </div>
</template>

<script setup>
import { computed, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { getAuxWorkbenchConfig } from "../config/auxWorkbenchConfigs";
import { getSourcePanelConfig } from "../utils/sourcePanel";
import { getQuickCreateConfig } from "../config/quickCreateRegistry";
import { deskActionsEnabled } from "../utils/deskActions";
import DocHeaderCard from "../components/app-shell/DocHeaderCard.vue";
import DetailActionRow from "../components/app-shell/DetailActionRow.vue";
import DetailTabsBar from "../components/app-shell/DetailTabsBar.vue";
import DocSummaryGrid from "../components/app-shell/DocSummaryGrid.vue";
import DataTableShell from "../components/app-shell/DataTableShell.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import MetaListCard from "../components/app-shell/MetaListCard.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import SectionCardHeader from "../components/app-shell/SectionCardHeader.vue";
import StatusBadge from "../components/StatusBadge.vue";

const props = defineProps({
  screenKey: { type: String, required: true },
  name: { type: String, required: true },
});

const router = useRouter();
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
    backToList: "Listeye Don",
    quickEdit: "Hizli Duzenle",
    openDesk: "Yonetim",
    panel: "Panel",
    saveChanges: "Degisiklikleri Kaydet",
    cancel: "Vazgec",
    loading: "Kayit yukleniyor...",
    loadErrorTitle: "Kayit Yuklenemedi",
    emptyTitle: "Kayit bulunamadi",
    emptyDescription: "Kayit silinmis veya erisim yetkiniz olmayabilir.",
    stateSummary: "Durum Ozet",
    accountingAmounts: "Tutarlar",
    accountingSource: "Kaynak Baglami",
    accountingSync: "Senkronizasyon",
    templateMeta: "Sablon Ozeti",
    templateLifecycle: "Yayin ve Kayit",
    outboxDelivery: "Gonderim Ozeti",
    outboxRetry: "Deneme ve Zamanlama",
    outboxReference: "Bagli Kayitlar",
    outboxQueue: "Kuyruk ve Islem",
    bodyTemplate: "Sablon Icerigi",
    payloadJson: "Payload (JSON)",
    responseLog: "Saglayici Yaniti",
    tabOverview: "Genel",
    tabRelated: "Iliskili",
    tabActivity: "Aktivite",
    tabOperations: "Operasyon",
    tabLogs: "Loglar",
    relatedTitle: "Iliskili Kayitlar",
    noRelatedRecords: "Iliskili kayit bulunamadi.",
    activityTitle: "Aktivite",
    noActivity: "Aktivite kaydi bulunamadi.",
    relatedCustomer: "Musteri",
    relatedPolicy: "Police",
    relatedDraft: "Bildirim Taslagi",
    relatedOutbox: "Giden Bildirim",
    relatedAccountingEntry: "Muhasebe Kaydi",
    relatedReference: "Referans Kayit",
    relatedSource: "Kaynak Kayit",
    snapshotContext: "Snapshot Baglami",
    snapshotSignals: "Segment Sinyalleri",
    strengthSignals: "Guclu Sinyaller",
    riskSignals: "Risk Sinyalleri",
    scoreReasons: "Skor Gerekceleri",
    noSignals: "Kayitli sinyal bulunamadi.",
    assignmentContext: "Atama Baglami",
    assignmentLifecycle: "Atama Yasam Dongusu",
    assignmentNotes: "Atama Notlari",
    createdAt: "Olusturma",
    modifiedAt: "Guncelleme",
    resolvedAt: "Cozulme",
    sentAt: "Gonderim",
    lastAttemptAt: "Son Deneme",
    nextRetryAt: "Sonraki Deneme",
    lastSyncedAt: "Son Senkron",
    officeBranch: "Ofis Sube",
  },
  en: {
    backToList: "Back to List",
    quickEdit: "Quick Edit",
    openDesk: "Desk",
    panel: "Panel",
    saveChanges: "Save Changes",
    cancel: "Cancel",
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
const doc = computed(() => resource.data?.docs?.[0] || resource.data?.message || resource.data || null);
const errorText = computed(() => resource.error?.messages?.[0] || resource.error?.message || "");
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

const quickEditOptionsMap = computed(() => ({
  customers: (auxQuickCustomerResource.data || []).map((row) => ({ value: row.name, label: row.full_name || row.name })),
  policies: (auxQuickPolicyResource.data || []).map((row) => ({ value: row.name, label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}` })),
  insuranceCompanies: (auxQuickInsuranceCompanyResource.data || []).map((row) => ({ value: row.name, label: `${row.company_name || row.name}${row.company_code ? ` (${row.company_code})` : ""}` })),
  salesEntities: (auxQuickSalesEntityResource.data || []).map((row) => ({ value: row.name, label: `${row.full_name || row.name}${row.entity_type ? ` (${row.entity_type})` : ""}` })),
  accountingEntries: (auxQuickAccountingEntryResource.data || []).map((row) => ({ value: row.name, label: `${row.name}${row.source_doctype ? ` (${row.source_doctype})` : ""}` })),
}));

const quickEditSuccessHandlers = {
  aux_detail: async () => {
    await reloadDetail();
  },
};

function humanizeField(field) {
  return String(field || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
function fieldLabel(field) { return humanizeField(field); }
function isFieldType(field, kind) { return Array.isArray(config[`${kind}Fields`]) && config[`${kind}Fields`].includes(field); }
function formatValue(field, value) {
  if (value == null || value === "") return "-";
  if (isFieldType(field, "bool")) {
    const active = value === true || String(value) === "1";
    return active ? (activeLocale.value === "tr" ? "Evet" : "Yes") : (activeLocale.value === "tr" ? "Hayir" : "No");
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
  return officeBranch ? `${config.doctype} • ${d.name} • ${officeBranch}` : `${config.doctype} • ${d.name}`;
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
const specialDetailMode = computed(() => {
  if (config.key === "accounting-entries") return "accounting";
  if (config.key === "templates") return "template";
  if (config.key === "notification-outbox") return "outbox";
  if (config.key === "customer-segment-snapshots") return "segment_snapshot";
  if (config.key === "ownership-assignments") return "ownership_assignment";
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
  return [];
});

const specialGroups = computed(() => {
  if (!doc.value) return [];
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
    delivery: activeLocale.value === "tr" ? "Gonderim Bilgisi" : "Delivery Info",
    reference: activeLocale.value === "tr" ? "Kaynak Baglami" : "Reference Context",
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
      open: panel?.url ? () => { window.location.href = panel.url; } : null,
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
    for (const draft of campaignDraftsResource.data || []) {
      items.push({
        key: `campaign-draft-${draft.name}`,
        title: `${t("relatedDraft")} • ${draft.name}`,
        subtitle: [draft.channel, draft.status].filter(Boolean).join(" / ") || "AT Notification Draft",
        description: draft.recipient || draft.name,
        meta: formatValue("modified", draft.modified),
        open: () => {
          const panel = getSourcePanelConfig("AT Notification Draft", draft.name);
          if (panel?.url) window.location.href = panel.url;
        },
      });
    }
    for (const outbox of campaignOutboxResource.data || []) {
      items.push({
        key: `campaign-outbox-${outbox.name}`,
        title: `${t("relatedOutbox")} • ${outbox.name}`,
        subtitle: [outbox.channel, outbox.status].filter(Boolean).join(" / ") || "AT Notification Outbox",
        description: outbox.recipient || outbox.name,
        meta: outbox.attempt_count != null ? `${outbox.attempt_count}` : formatValue("modified", outbox.modified),
        open: () => {
          const panel = getSourcePanelConfig("AT Notification Outbox", outbox.name);
          if (panel?.url) window.location.href = panel.url;
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
function openDesk() {
  window.location.href = `/app/Form/${encodeURIComponent(config.doctype)}/${encodeURIComponent(props.name)}`;
}
function openPanel() {
  if (!panelConfig.value?.url) return;
  window.location.href = panelConfig.value.url;
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
