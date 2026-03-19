<template>
  <section class="page-shell space-y-4">
    <div class="detail-topbar">
      <div>
        <p class="detail-breadcrumb">Sigorta Operasyonları → Hasarlar</p>
        <h1 class="text-xl font-medium text-gray-900">{{ t("title") }}</h1>
        <p class="detail-subtitle">{{ t("subtitle") }}</p>
      </div>
      <span class="text-sm text-gray-400">{{ claims.length }} kayıt</span>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
      <div class="mini-metric">
        <p class="mini-metric-label">{{ t("summaryTotal") }}</p>
        <p class="mini-metric-value">{{ formatCount(claimSummary.total) }}</p>
      </div>
      <div class="mini-metric">
        <p class="mini-metric-label">{{ t("summaryOpen") }}</p>
        <p class="mini-metric-value text-brand-600">{{ formatCount(claimSummary.open) }}</p>
      </div>
      <div class="mini-metric">
        <p class="mini-metric-label">{{ t("summaryApproved") }}</p>
        <p class="mini-metric-value text-amber-600">{{ formatCount(claimSummary.approved) }}</p>
      </div>
      <div class="mini-metric">
        <p class="mini-metric-label">{{ t("summaryPaid") }}</p>
        <p class="mini-metric-value text-green-600">{{ formatCount(claimSummary.paid) }}</p>
      </div>
      <div class="mini-metric">
        <p class="mini-metric-label">{{ t("summaryReservePaid") }}</p>
        <p class="mini-metric-value text-slate-900">{{ claimSummary.reserveVsPaid }}</p>
      </div>
    </div>

    <div v-if="claimsErrorText" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <p class="font-medium">{{ t("loadErrorTitle") }}</p>
      <p>{{ claimsErrorText }}</p>
    </div>

    <div class="border-b border-gray-200 bg-white px-5 py-3">
      <FilterBar
        v-model:search="claimsListSearchQuery"
        :filters="claimsListFilterConfig"
        :active-count="claimsListActiveCount"
        @filter-change="onClaimsListFilterChange"
        @reset="onClaimsListFilterReset"
      >
        <template #actions>
          <button class="btn btn-primary btn-sm" @click="showQuickClaimDialog = true">+ {{ t("newClaim") }}</button>
          <button class="btn btn-sm" :disabled="claimsLoading" @click="reloadClaims">{{ t("refresh") }}</button>
          <button class="btn btn-sm" :disabled="claimsLoading" @click="downloadClaimExport('xlsx')">{{ t("exportXlsx") }}</button>
          <button class="btn btn-sm" :disabled="claimsLoading" @click="downloadClaimExport('pdf')">{{ t("exportPdf") }}</button>
        </template>
      </FilterBar>
    </div>

    <div class="flex-1 p-5">
      <ListTable
        :columns="claimsTableColumns"
        :rows="claimsListRowsWithActions"
        :loading="claimsLoading"
        empty-message="Hasar bulunamadı."
        @row-click="openClaimDetail"
      />
    </div>

    <QuickCreateClaim
      v-model="showQuickClaimDialog"
      :locale="activeLocale"
      :options-map="claimQuickOptionsMap"
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
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import QuickCreateClaim from "../components/QuickCreateClaim.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import ListTable from "../components/ui/ListTable.vue";
import FilterBar from "../components/ui/FilterBar.vue";
import { useCustomFilterPresets } from "../composables/useCustomFilterPresets";
import { subtleFact } from "../utils/factItems";
import { openTabularExport } from "../utils/listExport";

const copy = {
  tr: {
    title: "Hasarlar",
    subtitle: "Hasar dosyaları ve ödeme durumunu izleyin",
    recordCount: "kayıt",
    summaryTotal: "Toplam Hasar",
    summaryOpen: "Açık",
    summaryApproved: "Onayda",
    summaryPaid: "Ödendi",
    summaryReservePaid: "Toplam Rezerv / Ödeme",
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
    viewClaimFile: "Dosya Görüntüle",
    createPayment: "Ödeme Yap",
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
    appealStatus: "İtiraz",
    nextFollowUpOn: "Sonraki Takip",
    documentSummary: "Doküman",
    documentNone: "Dosya yok",
    lastUpload: "Son Yükleme",
    noExpert: "Atanmadı",
    assignmentSummary: "Atama",
    assignmentNone: "Açık atama yok",
    assignmentOpenCount: "açık",
  },
  en: {
    title: "Claims",
    subtitle: "Track claim files and payment status",
    recordCount: "records",
    summaryTotal: "Total Claims",
    summaryOpen: "Open",
    summaryApproved: "Approved",
    summaryPaid: "Paid",
    summaryReservePaid: "Reserve / Paid",
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
    viewClaimFile: "View File",
    createPayment: "Create Payment",
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
const claimsListSearchQuery = ref("");
const claimsListLocalFilters = ref({ status: "", amountState: "" });
const showQuickClaimDialog = ref(false);
const showOwnershipAssignmentDialog = ref(false);
const selectedClaimForAssignment = ref(null);

const claimsTableColumns = [
  { key: "claim_no", label: "Hasar No", width: "140px", type: "mono" },
  { key: "customer", label: "Müşteri", width: "220px" },
  { key: "policy", label: "Poliçe No", width: "140px", type: "mono" },
  { key: "incident_date_label", label: "Hasar Tarihi", width: "120px", type: "date" },
  { key: "office_branch_label", label: "Şube", width: "120px" },
  { key: "claim_type", label: "Hasar Tipi", width: "120px" },
  { key: "reserve_amount_label", label: "Rezerv Tutar", width: "140px", type: "amount", align: "right" },
  { key: "paid_amount_label", label: "Ödenen", width: "140px", type: "amount", align: "right" },
  { key: "claim_status", label: "Durum", width: "130px", type: "status", domain: "claim" },
  { key: "_actions", label: "Actions", width: "280px", type: "actions", align: "right" },
];

const claimsListColumns = [
  { key: "claim_no", label: "Hasar No", width: "140px", type: "mono" },
  { key: "policy", label: "Poliçe", width: "140px", type: "mono" },
  { key: "customer", label: "Müşteri", width: "220px" },
  { key: "claim_status", label: "Durum", width: "130px", type: "status" },
  { key: "approved_amount", label: "Onaylanan", width: "120px", type: "amount", align: "right" },
  { key: "paid_amount", label: "Ödenen", width: "120px", type: "amount", align: "right" },
  { key: "remaining_days", label: "Takip Günü", width: "110px", type: "urgency", align: "right" },
];

const claimsListFilterConfig = computed(() => [
  {
    key: "status",
    label: "Durum",
    options: claimStatusOptions.value.map((item) => ({ value: item.value, label: item.label })),
  },
  {
    key: "amountState",
    label: "Tutar Durumu",
    options: [
      { value: "paid", label: t("amountStatePaid") },
      { value: "unpaid", label: t("amountStateUnpaid") },
      { value: "approved_only", label: t("amountStateApprovedOnly") },
      { value: "pending_payment", label: t("amountStatePendingPayment") },
    ],
  },
]);

const claimsListFilteredRows = computed(() => {
  const q = claimsListSearchQuery.value.trim().toLocaleLowerCase(localeCode.value);
  return claims.value
    .map((claim) => ({
      ...claim,
      remaining_days: computeRemainingFollowUpDays(claim.next_follow_up_on),
    }))
    .filter((claim) => {
      const matchesQuery =
        !q ||
        [claim.claim_no, claim.name, claim.policy, claim.customer]
          .map((value) => String(value || "").toLocaleLowerCase(localeCode.value))
          .some((value) => value.includes(q));
      const matchesStatus = !claimsListLocalFilters.value.status || claim.claim_status === claimsListLocalFilters.value.status;
      const matchesAmountState =
        !claimsListLocalFilters.value.amountState || matchAmountState(claim, claimsListLocalFilters.value.amountState);
      return matchesQuery && matchesStatus && matchesAmountState;
    });
});

const claimsListRowsWithUrgency = computed(() =>
  claimsListFilteredRows.value.map((claim) => ({
    ...claim,
    _urgency: claim.remaining_days <= 0 ? "row-critical" : claim.remaining_days <= 7 ? "row-warning" : "",
  }))
);

const claimSummary = computed(() => {
  const rows = claimsListFilteredRows.value;
  const reserveTotal = rows.reduce((sum, claim) => sum + Number(claim.estimated_amount || 0), 0);
  const paidTotal = rows.reduce((sum, claim) => sum + Number(claim.paid_amount || 0), 0);
  return {
    total: rows.length,
    open: rows.filter((claim) => String(claim.claim_status || "").trim() === "Open").length,
    approved: rows.filter((claim) => String(claim.claim_status || "").trim() === "Approved").length,
    paid: rows.filter((claim) => String(claim.claim_status || "").trim() === "Paid").length,
    reserveVsPaid: `${formatCurrency(reserveTotal)} / ${formatCurrency(paidTotal)}`,
  };
});

const claimsListRowsWithActions = computed(() =>
  claimsListFilteredRows.value.map((claim) => ({
    ...claim,
    incident_date_label: formatDate(claim.incident_date),
    office_branch_label: claim.office_branch || "-",
    reserve_amount_label: formatCurrency(claim.estimated_amount || 0),
    paid_amount_label: formatCurrency(claim.paid_amount || 0),
    _urgency: claim.remaining_days <= 0 ? "row-critical" : claim.remaining_days <= 7 ? "row-warning" : "",
    _actions: buildClaimRowActions(claim),
  }))
);

const claimsListActiveCount = computed(
  () =>
    (claimsListSearchQuery.value.trim() ? 1 : 0) +
    Object.values(claimsListLocalFilters.value).filter((value) => String(value || "").trim() !== "").length
);

function onClaimsListFilterChange({ key, value }) {
  claimsListLocalFilters.value = {
    ...claimsListLocalFilters.value,
    [key]: String(value || ""),
  };
}

function onClaimsListFilterReset() {
  claimsListSearchQuery.value = "";
  claimsListLocalFilters.value = { status: "", amountState: "" };
}

function computeRemainingFollowUpDays(nextFollowUpOn) {
  if (!nextFollowUpOn) return null;
  const target = new Date(nextFollowUpOn);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86400000);
}

function matchAmountState(claim, amountState) {
  const approved = Number(claim.approved_amount || 0);
  const paid = Number(claim.paid_amount || 0);
  if (amountState === "paid") return paid > 0;
  if (amountState === "unpaid") return paid <= 0;
  if (amountState === "approved_only") return approved > 0 && paid <= 0;
  if (amountState === "pending_payment") return approved > paid;
  return true;
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat(localeCode.value, {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(localeCode.value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatCount(value) {
  return new Intl.NumberFormat(localeCode.value).format(Number(value || 0));
}

function canOpenClaimPayment(claim) {
  const status = String(claim?.claim_status || "").trim();
  return status === "Approved" && Number(claim?.approved_amount || 0) > Number(claim?.paid_amount || 0);
}

function buildClaimRowActions(claim) {
  return [
    {
      key: "file",
      label: t("viewClaimFile"),
      variant: "outline",
      onClick: () => openClaimDetail(claim),
    },
    {
      key: "documents",
      label: t("openDocuments"),
      variant: "outline",
      onClick: () => openClaimDocuments(claim),
    },
    {
      key: "payment",
      label: t("createPayment"),
      variant: "primary",
      disabled: !canOpenClaimPayment(claim),
      onClick: () => openClaimPayment(claim),
    },
  ];
}

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
      "office_branch",
      "claim_type",
      "assigned_expert",
      "rejection_reason",
      "appeal_status",
      "incident_date",
      "next_follow_up_on",
      "estimated_amount",
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

function openClaimPayment(claim) {
  if (!canOpenClaimPayment(claim)) return;
  const query = new URLSearchParams({
    policy: claim?.policy || "",
    query: claim?.claim_no || claim?.name || "",
  });
  window.location.assign(`/at/payments?${query.toString()}`);
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
