<template>
  <section class="space-y-4">
    <article class="surface-card rounded-2xl p-5">
      <PageToolbar
      :title="t('title')"
      :subtitle="t('subtitle')"
      :show-refresh="true"
      :busy="claimsLoading"
      :refresh-label="t('refresh')"
      @refresh="reloadClaims"
    >
      <template #actions>
        <div class="flex flex-wrap items-center gap-2">
          <QuickCreateLauncher
            variant="primary"
            size="sm"
            :label="t('newClaim')"
            @launch="showQuickClaimDialog = true"
          />
          <ActionButton variant="secondary" size="sm" :disabled="claimsLoading" @click="reloadClaims">
            {{ t("refresh") }}
          </ActionButton>
          <ActionButton
            variant="secondary"
            size="sm"
            :disabled="claimsLoading"
            @click="downloadClaimExport('xlsx')"
          >
            {{ t("exportXlsx") }}
          </ActionButton>
          <ActionButton
            variant="primary"
            size="sm"
            :disabled="claimsLoading"
            @click="downloadClaimExport('pdf')"
          >
            {{ t("exportPdf") }}
          </ActionButton>
        </div>
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
          @apply="applyClaimFilters"
          @reset="resetClaimFilters"
        >
          <input
            v-model.trim="filters.query"
            class="input"
            type="search"
            :placeholder="t('searchPlaceholder')"
            @keyup.enter="applyClaimFilters"
          />
          <select v-model="filters.status" class="input">
          <option value="">{{ t("allStatuses") }}</option>
          <option v-for="option in claimStatusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
            </option>
          </select>
          <select v-model.number="filters.limit" class="input">
            <option :value="20">20</option>
            <option :value="30">30</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>

          <template #advanced>
            <input
              v-model.trim="filters.policyQuery"
              class="input"
              type="search"
              :placeholder="t('policyFilter')"
              @keyup.enter="applyClaimFilters"
            />
            <select v-model="filters.amountState" class="input">
              <option value="">{{ t("allAmountStates") }}</option>
              <option value="paid">{{ t("amountStatePaid") }}</option>
              <option value="unpaid">{{ t("amountStateUnpaid") }}</option>
              <option value="approved_only">{{ t("amountStateApprovedOnly") }}</option>
              <option value="pending_payment">{{ t("amountStatePendingPayment") }}</option>
            </select>
          </template>
        </WorkbenchFilterToolbar>
      </template>
      </PageToolbar>
    </article>

    <article class="surface-card rounded-2xl p-5">
      <DataTableShell
      :loading="claimsLoading"
      :error="claimsErrorText"
      :empty="claims.length === 0"
      :loading-label="t('loading')"
      :error-title="t('loadErrorTitle')"
      :empty-title="t('emptyTitle')"
      :empty-description="t('empty')"
    >
      <template #default>
        <div class="overflow-auto">
          <table class="at-table">
            <thead>
              <tr class="at-table-head-row">
                <th class="at-table-head-cell">{{ t("claim") }}</th>
                <th class="at-table-head-cell">{{ t("policy") }}</th>
                <th class="at-table-head-cell">{{ t("status") }}</th>
                <th class="at-table-head-cell">{{ t("operations") }}</th>
                <th class="at-table-head-cell">{{ t("amounts") }}</th>
                <th class="at-table-head-cell">{{ t("actions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="claim in claims" :key="claim.name" class="at-table-row">
                <DataTableCell>
                  <TableEntityCell :title="claim.claim_no || claim.name" :facts="claimIdentityFacts(claim)" />
                </DataTableCell>
                <TableFactsCell :items="claimPolicyFacts(claim)" />
                <DataTableCell>
                  <StatusBadge domain="claim" :status="claim.claim_status" />
                </DataTableCell>
                <TableFactsCell :items="claimOperationalFacts(claim)" />
                <DataTableCell cell-class="min-w-[220px]">
                  <AmountPairSummary
                    :left-label="t('approved')"
                    :left-value="claim.approved_amount"
                    :right-label="t('paid')"
                    :right-value="claim.paid_amount"
                    :locale="localeCode"
                  />
                </DataTableCell>
                <DataTableCell>
                  <div class="mb-2 text-xs text-slate-500">
                    {{ notificationHint(claim) }}
                  </div>
                  <div class="mb-2 text-xs text-slate-500">
                    {{ notificationStatusLabel(claim) }}
                  </div>
                  <div class="mb-2 text-xs text-slate-500">
                    {{ assignmentHint(claim) }}
                  </div>
                  <InlineActionRow>
                    <ActionButton
                      v-if="canMoveClaimToStatus(claim, 'Under Review')"
                      variant="secondary"
                      size="xs"
                      :disabled="mutationLoading"
                      @click="updateClaimStatus(claim, 'Under Review')"
                    >
                      {{ t("markUnderReview") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canMoveClaimToStatus(claim, 'Approved')"
                      variant="secondary"
                      size="xs"
                      :disabled="mutationLoading"
                      @click="updateClaimStatus(claim, 'Approved')"
                    >
                      {{ t("markApproved") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canMoveClaimToStatus(claim, 'Closed')"
                      variant="secondary"
                      size="xs"
                      :disabled="mutationLoading"
                      @click="updateClaimStatus(claim, 'Closed')"
                    >
                      {{ t("markClosed") }}
                    </ActionButton>
                    <ActionButton
                      v-if="canRejectClaim(claim)"
                      variant="secondary"
                      size="xs"
                      :disabled="mutationLoading"
                      @click="rejectClaim(claim)"
                    >
                      {{ t("markRejected") }}
                    </ActionButton>
                    <ActionButton
                      v-if="claim.next_follow_up_on"
                      variant="secondary"
                      size="xs"
                      :disabled="mutationLoading"
                      @click="clearClaimFollowUp(claim)"
                    >
                      {{ t("clearFollowUp") }}
                    </ActionButton>
                    <ActionButton
                      variant="secondary"
                      size="xs"
                      @click="openClaimNotifications(claim)"
                    >
                      {{ t("openNotifications") }}
                    </ActionButton>
                    <ActionButton
                      variant="secondary"
                      size="xs"
                      @click="openClaimAssignment(claim)"
                    >
                      {{ t("newAssignment") }}
                    </ActionButton>
                    <ActionButton
                      v-if="claim.policy"
                      variant="secondary"
                      size="xs"
                      @click="openPolicy(claim.policy)"
                    >
                      {{ t("openPolicy") }}
                    </ActionButton>
                    <ActionButton variant="secondary" size="xs" @click="openClaimDetail(claim)">
                      {{ t("openClaimDetail") }}
                    </ActionButton>
                    <ActionButton variant="secondary" size="xs" @click="openClaimDocuments(claim)">
                      {{ t("openDocuments") }}
                    </ActionButton>
                  </InlineActionRow>
                </DataTableCell>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      </DataTableShell>
    </article>

    <QuickCreateManagedDialog
      v-model="showQuickClaimDialog"
      config-key="claim"
      :locale="activeLocale"
      :options-map="claimQuickOptionsMap"
      :show-save-and-open="false"
      :before-open="prepareQuickClaimDialog"
      :success-handlers="quickClaimSuccessHandlers"
    />
    <QuickCreateManagedDialog
      v-model="showOwnershipAssignmentDialog"
      config-key="ownership_assignment"
      :locale="activeLocale"
      :options-map="claimQuickOptionsMap"
      :show-save-and-open="false"
      :before-open="prepareOwnershipAssignmentDialog"
      :success-handlers="ownershipAssignmentSuccessHandlers"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRoute } from "vue-router";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useClaimStore } from "../stores/claim";
import ActionButton from "../components/app-shell/ActionButton.vue";
import AmountPairSummary from "../components/app-shell/AmountPairSummary.vue";
import DataTableShell from "../components/app-shell/DataTableShell.vue";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import PageToolbar from "../components/app-shell/PageToolbar.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import { useCustomFilterPresets } from "../composables/useCustomFilterPresets";
import { subtleFact } from "../utils/factItems";
import { openTabularExport } from "../utils/listExport";

const copy = {
  tr: {
    title: "Hasarlar",
    subtitle: "Hasar dosyaları ve ödeme durumunu izleyin",
    refresh: "Yenile",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    newClaim: "Yeni Hasar",
    loading: "Yükleniyor...",
    loadErrorTitle: "Hasarlar Yüklenemedi",
    loadError: "Hasar kayıtları yüklenirken bir hata oluştu.",
    emptyTitle: "Hasar Kaydı Yok",
    empty: "Kayıt bulunamadı.",
    claim: "Hasar",
    policy: "Poliçe",
    status: "Durum",
    operations: "Operasyon",
    amounts: "Tutarlar",
    approved: "Onaylanan",
    paid: "Ödenen",
    recordId: "Kayıt",
    actions: "Aksiyon",
    newAssignment: "Atama",
    markUnderReview: "Incelemeye Al",
    markApproved: "Onayla",
    markClosed: "Kapat",
    markRejected: "Reddet",
    clearFollowUp: "Takibi Temizle",
    notificationDraft: "Bildirim Taslagi",
    notificationMissing: "Bildirim Akisi Yok",
    notificationQueue: "Bildirim Kuyrugu",
    notificationNone: "Bildirim Kaydı Yok",
    openNotifications: "Bildirimler",
    openDocuments: "Dokümanlar",
    rejectReasonPrompt: "Red sebebini girin",
    openDesk: "Yönetim",
    openPolicy: "Poliçeyi Aç",
    openClaimDetail: "Hasar Detayı",
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
    searchPlaceholder: "Hasar no / kayıt no / poliçe ara",
    allStatuses: "Tüm durumlar",
    policyFilter: "Poliçe (içerir)",
    allAmountStates: "Tüm tutar durumları",
    amountStatePaid: "Ödenen kayıtlar",
    amountStateUnpaid: "Ödenmeyen kayıtlar",
    amountStateApprovedOnly: "Onaylı tutarı olanlar",
    amountStatePendingPayment: "Onaylı ama eksik ödeme",
    assignedExpert: "Eksper",
    rejectionReason: "Red Sebebi",
    appealStatus: "Itiraz",
    nextFollowUpOn: "Sonraki Takip",
    documentSummary: "Doküman",
    documentNone: "Dosya yok",
    lastUpload: "Son Yükleme",
    noExpert: "Atanmadi",
    assignmentSummary: "Atama",
    assignmentNone: "Açık atama yok",
    assignmentOpenCount: "acik",
  },
  en: {
    title: "Claims",
    subtitle: "Track claim files and payment status",
    refresh: "Refresh",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    newClaim: "New Claim",
    loading: "Loading...",
    loadErrorTitle: "Failed to Load Claims",
    loadError: "An error occurred while loading claim records.",
    emptyTitle: "No Claim Records",
    empty: "No records found.",
    claim: "Claim",
    policy: "Policy",
    status: "Status",
    operations: "Operations",
    amounts: "Amounts",
    approved: "Approved",
    paid: "Paid",
    recordId: "Record",
    actions: "Actions",
    newAssignment: "Assignment",
    markUnderReview: "Move to Review",
    markApproved: "Approve",
    markClosed: "Close",
    markRejected: "Reject",
    clearFollowUp: "Clear Follow-up",
    notificationDraft: "Notification Draft",
    notificationMissing: "No Notification Flow",
    notificationQueue: "Notification Queue",
    notificationNone: "No Notification Records",
    openNotifications: "Notifications",
    openDocuments: "Documents",
    rejectReasonPrompt: "Enter rejection reason",
    openDesk: "Desk",
    openPolicy: "Open Policy",
    openClaimDetail: "Claim Detail",
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
    searchPlaceholder: "Search claim no / record id / policy",
    allStatuses: "All statuses",
    policyFilter: "Policy (contains)",
    allAmountStates: "All amount states",
    amountStatePaid: "Paid claims",
    amountStateUnpaid: "Unpaid claims",
    amountStateApprovedOnly: "Approved amount exists",
    amountStatePendingPayment: "Approved but underpaid",
    assignedExpert: "Assigned Expert",
    rejectionReason: "Rejection Reason",
    appealStatus: "Appeal Status",
    nextFollowUpOn: "Next Follow Up",
    documentSummary: "Documents",
    documentNone: "No files",
    lastUpload: "Last Upload",
    noExpert: "Unassigned",
    assignmentSummary: "Assignment",
    assignmentNone: "No open assignment",
    assignmentOpenCount: "open",
  },
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const authStore = useAuthStore();
const branchStore = useBranchStore();
const claimStore = useClaimStore();
const route = useRoute();
const activeLocale = computed(() => unref(authStore.locale) || "en");

function buildOfficeBranchLookupFilters() {
  const officeBranch = branchStore.requestBranch || "";
  return officeBranch ? { office_branch: officeBranch } : {};
}

const filters = claimStore.state.filters;

const claimStatusOptions = computed(() =>
  [
    "Open",
    "Under Review",
    "Approved",
    "Paid",
    "Closed",
    "Rejected",
    "Cancelled",
  ].map((value) => ({ value, label: value }))
);
const activeFilterCount = computed(() => claimStore.activeFilterCount);
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
  screen: "claims_board",
  presetStorageKey: "at:claims-board:preset",
  presetListStorageKey: "at:claims-board:preset-list",
  t,
  getCurrentPayload: currentClaimPresetPayload,
  setFilterStateFromPayload: setClaimFilterStateFromPayload,
  resetFilterState: resetClaimFilterState,
  refresh: reloadClaims,
  getSortLocale: () => localeCode.value,
});

const claimsResource = createResource({
  url: "frappe.client.get_list",
  params: buildClaimListParams(),
  auto: true,
});
const claimMutationResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.quick_create.update_quick_aux_record",
  auto: false,
});
const claimNotificationDraftResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
});
const claimNotificationOutboxResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
});
const claimAssignmentResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
});
const claimFileResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
});

const claimQuickPolicyResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Policy",
    fields: ["name", "policy_no", "customer"],
    filters: buildOfficeBranchLookupFilters(),
    order_by: "modified desc",
    limit_page_length: 500,
  },
});

const claimQuickCustomerResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Customer",
    fields: ["name", "full_name"],
    filters: buildOfficeBranchLookupFilters(),
    order_by: "modified desc",
    limit_page_length: 500,
  },
});

const claimsLoading = computed(() => Boolean(unref(claimsResource.loading)));
const mutationLoading = computed(() => Boolean(unref(claimMutationResource.loading)));

const claims = computed(() => claimStore.filteredItems);
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
const showQuickClaimDialog = ref(false);
const showOwnershipAssignmentDialog = ref(false);
const selectedClaimForAssignment = ref(null);

function resourceValue(resource, fallback) {
  const value = unref(resource?.data);
  return value == null ? fallback : value;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

const claimQuickOptionsMap = computed(() => ({
  policies: asArray(resourceValue(claimQuickPolicyResource, [])).map((row) => ({
    value: row.name,
    label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
  })),
  customers: asArray(resourceValue(claimQuickCustomerResource, [])).map((row) => ({
    value: row.name,
    label: row.full_name || row.name,
  })),
}));
const quickClaimSuccessHandlers = {
  claim_list: async () => {
    await reloadClaims();
  },
};
const ownershipAssignmentSuccessHandlers = {
  "ownership-assignments-list": async () => {
    await reloadClaims();
  },
};
const claimsErrorText = computed(() => {
  if (claimStore.state.error) return claimStore.state.error;
  const err = unref(claimsResource.error);
  if (!err) return "";
  return err?.messages?.join(" ") || err?.message || t("loadError");
});
const claimNotificationDraftMap = computed(() => buildClaimNotificationMap(unref(claimNotificationDraftResource.data) || []));
const claimNotificationOutboxMap = computed(() => buildClaimNotificationMap(unref(claimNotificationOutboxResource.data) || []));
const claimAssignmentMap = computed(() => buildClaimAssignmentMap(unref(claimAssignmentResource.data) || []));
const claimFileMap = computed(() => buildClaimFileMap(unref(claimFileResource.data) || []));

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeText(value) {
  return String(value || "").trim().toLocaleLowerCase(localeCode.value);
}

function buildClaimListParams() {
  const params = {
    doctype: "AT Claim",
    fields: [
      "name",
      "claim_no",
      "policy",
      "customer",
      "claim_status",
      "assigned_expert",
      "rejection_reason",
      "appeal_status",
      "next_follow_up_on",
      "approved_amount",
      "paid_amount",
    ],
    order_by: "modified desc",
    limit_page_length: Number(filters.limit) || 30,
  };
  if (filters.status) {
    params.filters = { claim_status: filters.status };
  }
  return withOfficeBranchFilter(params);
}

function withOfficeBranchFilter(params) {
  const officeBranch = branchStore.requestBranch || "";
  if (!officeBranch) return params;
  return {
    ...params,
    filters: {
      ...(params.filters || {}),
      office_branch: officeBranch,
    },
  };
}

function reloadClaims() {
  claimsResource.params = buildClaimListParams();
  claimStore.setLocaleCode(localeCode.value);
  claimStore.setLoading(true);
  claimStore.clearError();
  return claimsResource
    .reload()
    .then((result) => {
      claimStore.setItems(result || []);
      void Promise.allSettled([reloadClaimNotifications(result || []), reloadClaimAssignments(result || []), reloadClaimFiles(result || [])]);
      claimStore.setLoading(false);
      return result;
    })
    .catch((error) => {
      claimStore.setItems([]);
      claimStore.setError(error?.messages?.join(" ") || error?.message || t("loadError"));
      claimStore.setLoading(false);
      throw error;
    });
}

function downloadClaimExport(format) {
  openTabularExport({
    permissionDoctypes: ["AT Claim"],
    exportKey: "claims_board",
    title: t("title"),
    columns: [
      t("claim"),
      t("policy"),
      t("status"),
      t("approved"),
      t("paid"),
      t("assignedExpert"),
      t("appealStatus"),
      t("nextFollowUpOn"),
      t("rejectionReason"),
    ],
    rows: claims.value.map((claim) => ({
      [t("claim")]: claim.claim_no || claim.name || "-",
      [t("policy")]: claim.policy || "-",
      [t("status")]: claim.claim_status || "-",
      [t("approved")]: claim.approved_amount ?? "-",
      [t("paid")]: claim.paid_amount ?? "-",
      [t("assignedExpert")]: claim.assigned_expert || t("noExpert"),
      [t("appealStatus")]: claim.appeal_status || "-",
      [t("nextFollowUpOn")]: claim.next_follow_up_on || "-",
      [t("rejectionReason")]: claim.rejection_reason || "-",
    })),
    filters: currentClaimPresetPayload(),
    format,
  });
}

function applyClaimFilters() {
  return reloadClaims();
}

function resetClaimFilterState() {
  claimStore.resetFilters();
}

function currentClaimPresetPayload() {
  return {
    query: filters.query,
    status: filters.status,
    policyQuery: filters.policyQuery,
    amountState: filters.amountState,
    limit: Number(filters.limit) || 30,
  };
}

function setClaimFilterStateFromPayload(payload) {
  filters.query = String(payload?.query || "");
  filters.status = String(payload?.status || "");
  filters.policyQuery = String(payload?.policyQuery || "");
  filters.amountState = String(payload?.amountState || "");
  filters.limit = Number(payload?.limit || 30) || 30;
}

function resetClaimFilters() {
  applyPreset("default", { refresh: false });
  void persistPresetStateToServer();
  return reloadClaims();
}

function prepareQuickClaimDialog({ form }) {
  if (!form.incident_date) form.incident_date = todayIso();
  if (!form.reported_date) form.reported_date = todayIso();
}

function claimIdentityFacts(claim) {
  return [subtleFact("record", t("recordId"), claim?.name || "-")];
}

function claimPolicyFacts(claim) {
  return [subtleFact("policy", t("policy"), claim?.policy || "-")];
}

function claimOperationalFacts(claim) {
  return [
    subtleFact("expert", t("assignedExpert"), claim?.assigned_expert || t("noExpert")),
    subtleFact("documents", t("documentSummary"), claimDocumentSummary(claim)),
    claim?.rejection_reason
      ? subtleFact("rejection", t("rejectionReason"), claim.rejection_reason)
      : null,
    claim?.appeal_status
      ? subtleFact("appeal", t("appealStatus"), claim.appeal_status)
      : null,
    claim?.next_follow_up_on
      ? subtleFact("follow-up", t("nextFollowUpOn"), claim.next_follow_up_on)
      : null,
  ].filter(Boolean);
}

const claimStatusTemplateKeys = {
  Open: "claim_status_open",
  "Under Review": "claim_status_under_review",
  Approved: "claim_status_approved",
  Rejected: "claim_status_rejected",
  Paid: "claim_status_paid",
  Closed: "claim_status_closed",
};

function notificationHint(claim) {
  const templateKey = claimStatusTemplateKeys[String(claim?.claim_status || "").trim()];
  return templateKey ? `${t("notificationDraft")}: ${templateKey}` : t("notificationMissing");
}

function buildClaimNotificationMap(rows) {
  return (rows || []).reduce((acc, row) => {
    const referenceName = String(row?.reference_name || "").trim();
    if (!referenceName) return acc;
    const current = acc[referenceName] || { count: 0, latestStatus: "" };
    current.count += 1;
    current.latestStatus = current.latestStatus || String(row?.status || "").trim();
    acc[referenceName] = current;
    return acc;
  }, {});
}

function buildClaimAssignmentMap(rows) {
  return (rows || []).reduce((acc, row) => {
    const sourceName = String(row?.source_name || "").trim();
    if (!sourceName) return acc;
    const current = acc[sourceName] || { count: 0, openCount: 0, latestAssignee: "" };
    current.count += 1;
    if (["Open", "In Progress", "Blocked"].includes(String(row?.status || "").trim())) current.openCount += 1;
    if (!current.latestAssignee) current.latestAssignee = String(row?.assigned_to || "").trim();
    acc[sourceName] = current;
    return acc;
  }, {});
}

function buildClaimFileMap(rows) {
  return (rows || []).reduce((acc, row) => {
    const claimName = String(row?.attached_to_name || "").trim();
    if (!claimName) return acc;
    const current = acc[claimName] || { count: 0, lastUploadedOn: "" };
    current.count += 1;
    if (!current.lastUploadedOn) current.lastUploadedOn = String(row?.creation || "").trim();
    acc[claimName] = current;
    return acc;
  }, {});
}

function claimDocumentSummary(claim) {
  const fileInfo = claimFileMap.value[String(claim?.name || "").trim()];
  if (!fileInfo) return t("documentNone");
  const parts = [`${fileInfo.count}`];
  if (fileInfo.lastUploadedOn) parts.push(`${t("lastUpload")}: ${fmtDate(fileInfo.lastUploadedOn)}`);
  return parts.join(" / ");
}

function notificationStatusLabel(claim) {
  const claimName = String(claim?.name || "").trim();
  const draft = claimNotificationDraftMap.value[claimName];
  const outbox = claimNotificationOutboxMap.value[claimName];
  if (!draft && !outbox) return t("notificationNone");
  const parts = [];
  if (draft) parts.push(`${t("notificationDraft")}: ${draft.count}${draft.latestStatus ? ` (${draft.latestStatus})` : ""}`);
  if (outbox) parts.push(`${t("notificationQueue")}: ${outbox.count}${outbox.latestStatus ? ` (${outbox.latestStatus})` : ""}`);
  return parts.join(" / ");
}

function assignmentHint(claim) {
  const assignment = claimAssignmentMap.value[String(claim?.name || "").trim()];
  if (!assignment) return `${t("assignmentSummary")}: ${t("assignmentNone")}`;
  const parts = [`${t("assignmentSummary")}: ${assignment.count}`];
  if (assignment.openCount) parts.push(`${assignment.openCount} ${t("assignmentOpenCount")}`);
  if (assignment.latestAssignee) parts.push(assignment.latestAssignee);
  return parts.join(" / ");
}

function canMoveClaimToStatus(claim, nextStatus) {
  const current = String(claim?.claim_status || "").trim();
  if (!current || current === nextStatus) return false;
  const transitions = {
    Open: ["Under Review", "Approved", "Closed"],
    "Under Review": ["Approved", "Closed"],
    Approved: ["Closed"],
    Paid: ["Closed"],
  };
  return Boolean(transitions[current]?.includes(nextStatus));
}

function canRejectClaim(claim) {
  return ["Open", "Under Review", "Approved"].includes(String(claim?.claim_status || "").trim());
}

async function updateClaimStatus(claim, nextStatus) {
  if (!claim?.name || !nextStatus) return;
  await claimMutationResource.submit({
    doctype: "AT Claim",
    name: claim.name,
    data: {
      claim_status: nextStatus,
    },
  });
  await reloadClaims();
}

async function rejectClaim(claim) {
  const rejectionReason = String(window.prompt(t("rejectReasonPrompt"), claim?.rejection_reason || "") || "").trim();
  if (!rejectionReason) return;
  await claimMutationResource.submit({
    doctype: "AT Claim",
    name: claim.name,
    data: {
      claim_status: "Rejected",
      rejection_reason: rejectionReason,
      appeal_status: "",
    },
  });
  await reloadClaims();
}

async function clearClaimFollowUp(claim) {
  if (!claim?.name) return;
  await claimMutationResource.submit({
    doctype: "AT Claim",
    name: claim.name,
    data: {
      next_follow_up_on: null,
    },
  });
  await reloadClaims();
}

async function reloadClaimNotifications(claimRows) {
  const claimNames = (claimRows || []).map((row) => row?.name).filter(Boolean);
  if (!claimNames.length) {
    setNotificationResourceData(claimNotificationDraftResource, []);
    setNotificationResourceData(claimNotificationOutboxResource, []);
    return;
  }
  claimNotificationDraftResource.params = {
    doctype: "AT Notification Draft",
    fields: ["name", "status", "reference_name"],
    filters: {
      reference_doctype: "AT Claim",
      reference_name: ["in", claimNames],
    },
    limit_page_length: 200,
  };
  claimNotificationOutboxResource.params = {
    doctype: "AT Notification Outbox",
    fields: ["name", "status", "reference_name"],
    filters: {
      reference_doctype: "AT Claim",
      reference_name: ["in", claimNames],
    },
    limit_page_length: 200,
  };
  await Promise.all([claimNotificationDraftResource.reload(), claimNotificationOutboxResource.reload()]);
}

async function reloadClaimAssignments(claimRows) {
  const claimNames = (claimRows || []).map((row) => row?.name).filter(Boolean);
  if (!claimNames.length) {
    setNotificationResourceData(claimAssignmentResource, []);
    return;
  }
  claimAssignmentResource.params = {
    doctype: "AT Ownership Assignment",
    fields: ["name", "status", "source_name", "assigned_to"],
    filters: {
      source_doctype: "AT Claim",
      source_name: ["in", claimNames],
    },
    limit_page_length: 200,
  };
  await claimAssignmentResource.reload();
}

async function reloadClaimFiles(claimRows) {
  const claimNames = (claimRows || []).map((row) => row?.name).filter(Boolean);
  if (!claimNames.length) {
    setNotificationResourceData(claimFileResource, []);
    return;
  }
  claimFileResource.params = {
    doctype: "File",
    fields: ["name", "attached_to_name", "file_name", "creation"],
    filters: {
      attached_to_doctype: "AT Claim",
      attached_to_name: ["in", claimNames],
      is_folder: 0,
    },
    order_by: "creation desc",
    limit_page_length: 500,
  };
  await claimFileResource.reload();
}

function setNotificationResourceData(resource, value) {
  if (resource?.data && typeof resource.data === "object" && "value" in resource.data) {
    resource.data.value = value;
    return;
  }
  resource.data = value;
}

function openClaimNotifications(claim) {
  if (!claim?.name) return;
  const query = new URLSearchParams({
    reference_doctype: "AT Claim",
    reference_name: claim.name,
    return_to: route.fullPath || route.path || "",
  });
  window.location.assign(`/at/communication?${query.toString()}`);
}

function openClaimDocuments(claim) {
  if (!claim?.name) return;
  const query = new URLSearchParams({
    attached_to_doctype: "AT Claim",
    attached_to_name: claim.name,
  });
  window.location.assign(`/at/files?${query.toString()}`);
}

function openClaimAssignment(claim) {
  selectedClaimForAssignment.value = claim || null;
  showOwnershipAssignmentDialog.value = true;
}

async function prepareOwnershipAssignmentDialog({ form }) {
  const claim = selectedClaimForAssignment.value;
  form.source_doctype = "AT Claim";
  form.source_name = claim?.name || "";
  form.customer = claim?.customer || "";
  form.policy = claim?.policy || "";
}

function openPolicy(policyName) {
  if (!policyName) return;
  window.location.assign(`/at/policies/${encodeURIComponent(policyName)}`);
}

function openClaimDetail(claim) {
  if (!claim?.name) return;
  window.location.assign(`/at/claims/${encodeURIComponent(claim.name)}`);
}

function syncClaimsRouteFilters({ refresh = true } = {}) {
  const routeClaim = String(route.query.claim || "").trim();
  if (!routeClaim || filters.query === routeClaim) return;
  claimStore.setFilters({ query: routeClaim });
  if (refresh) void reloadClaims();
}

onMounted(() => {
  claimStore.setLocaleCode(localeCode.value);
  syncClaimsRouteFilters({ refresh: false });
  applyPreset(presetKey.value, { refresh: false });
  if (String(presetKey.value || "default") !== "default") void reloadClaims();
  void hydratePresetStateFromServer();
});

watch(
  () => branchStore.selected,
  () => {
    claimStore.setLocaleCode(localeCode.value);
    const officeFilters = buildOfficeBranchLookupFilters();
    claimQuickPolicyResource.params = {
      doctype: "AT Policy",
      fields: ["name", "policy_no", "customer"],
      filters: officeFilters,
      order_by: "modified desc",
      limit_page_length: 500,
    };
    claimQuickCustomerResource.params = {
      doctype: "AT Customer",
      fields: ["name", "full_name"],
      filters: officeFilters,
      order_by: "modified desc",
      limit_page_length: 500,
    };
    void claimQuickPolicyResource.reload();
    void claimQuickCustomerResource.reload();
    void reloadClaims();
  }
);

watch(
  () => route.query.claim,
  () => {
    syncClaimsRouteFilters();
  },
  { immediate: true }
);

</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>
