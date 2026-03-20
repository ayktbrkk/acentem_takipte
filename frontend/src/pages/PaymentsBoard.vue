<template>
  <WorkbenchPageLayout
    breadcrumb="Sigorta Operasyonları → Ödemeler"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="formatCount(payments.length)"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <QuickCreateLauncher
        variant="primary"
        size="sm"
        :label="t('newPayment')"
        @launch="showQuickPaymentDialog = true"
      />
      <ActionButton variant="secondary" size="sm" :disabled="paymentsLoading" @click="reloadPayments">
        {{ t("refresh") }}
      </ActionButton>
      <ActionButton
        variant="secondary"
        size="sm"
        :disabled="paymentsLoading"
        @click="downloadPaymentExport('xlsx')"
      >
        {{ t("exportXlsx") }}
      </ActionButton>
      <ActionButton
        variant="primary"
        size="sm"
        :disabled="paymentsLoading"
        @click="downloadPaymentExport('pdf')"
      >
        {{ t("exportPdf") }}
      </ActionButton>
    </template>

    <template #metrics>
      <div class="w-full grid grid-cols-1 gap-4 md:grid-cols-5">
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryTotal") }}</p>
          <p class="mini-metric-value">{{ formatCount(paymentSummary.total) }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryPending") }}</p>
          <p class="mini-metric-value text-amber-600">{{ formatCount(paymentSummary.pending) }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryCollected") }}</p>
          <p class="mini-metric-value text-green-600">{{ formatCount(paymentSummary.collected) }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryOverdue") }}</p>
          <p class="mini-metric-value text-amber-700">{{ formatCount(paymentSummary.overdue) }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryTotalAmount") }}</p>
          <p class="mini-metric-value text-slate-900">{{ formatCurrency(paymentSummary.totalAmount) }}</p>
        </div>
      </div>
    </template>

    <article class="surface-card rounded-2xl p-5">
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
        @apply="applyPaymentFilters"
        @reset="resetPaymentFilters"
      >
        <input v-model.trim="filters.query" class="input" type="search" :placeholder="t('searchPlaceholder')" @keyup.enter="applyPaymentFilters" />
        <select v-model="filters.direction" class="input">
          <option value="">{{ t("allDirections") }}</option>
          <option value="Inbound">{{ t("inbound") }}</option>
          <option value="Outbound">{{ t("outbound") }}</option>
        </select>
        <select v-model="filters.sort" class="input">
          <option v-for="option in paymentSortOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <select v-model.number="filters.limit" class="input">
          <option :value="24">24</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <template #advanced>
          <input v-model.trim="filters.customerQuery" class="input" type="search" :placeholder="t('customerFilter')" @keyup.enter="applyPaymentFilters" />
          <input v-model.trim="filters.policyQuery" class="input" type="search" :placeholder="t('policyFilter')" @keyup.enter="applyPaymentFilters" />
          <input v-model.trim="filters.purposeQuery" class="input" type="search" :placeholder="t('purposeFilter')" @keyup.enter="applyPaymentFilters" />
        </template>
      </WorkbenchFilterToolbar>
    </article>

    <article v-if="paymentsErrorText" class="qc-error-banner">
      <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
      <p class="qc-error-banner__text mt-1">{{ paymentsErrorText }}</p>
    </article>

    <article class="surface-card rounded-2xl p-5">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h3 class="text-base font-semibold text-slate-900">{{ t("title") }}</h3>
          <p class="text-xs text-slate-500">{{ t("showing") }} {{ payments.length }}</p>
        </div>
      </div>
      <div v-if="paymentsLoading" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
        {{ t("loading") }}
      </div>
      <article v-else-if="paymentsErrorText" class="qc-error-banner mt-4">
        <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
        <p class="qc-error-banner__text mt-1">{{ paymentsErrorText }}</p>
      </article>
      <div v-else-if="payments.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <EmptyState :title="t('emptyTitle')" :description="t('empty')" />
      </div>
      <div v-else class="mt-4">
          <ListTable
            :columns="paymentListColumns"
            :rows="paymentsWithActions"
            :loading="false"
            :empty-message="t('empty')"
            @row-click="openPaymentDetail"
          />
      </div>
    </article>

    <QuickCreateManagedDialog
      v-model="showQuickPaymentDialog"
      config-key="payment"
      :locale="activeLocale"
      :options-map="paymentQuickOptionsMap"
      :eyebrow="quickPaymentEyebrow"
      :show-save-and-open="false"
      :before-open="prepareQuickPaymentDialog"
      :success-handlers="quickPaymentSuccessHandlers"
    />
  </WorkbenchPageLayout>
</template>
<script setup>
import { computed, onMounted, ref, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { createResource } from "frappe-ui";

import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { usePaymentStore } from "../stores/payment";
import ActionButton from "../components/app-shell/ActionButton.vue";
import EmptyState from "../components/app-shell/EmptyState.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import ListTable from "../components/ui/ListTable.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import { useCustomFilterPresets } from "../composables/useCustomFilterPresets";
import { mutedFact, pushMutedFactIf, subtleFact } from "../utils/factItems";
import { openTabularExport } from "../utils/listExport";

const copy = {
  tr: {
    title: "Ödemeler",
    subtitle: "Tahsilat, bekleyen ödeme ve gecikmiş vadeleri izleyin",
    recordCount: "kayıt",
    refresh: "Yenile",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    newPayment: "Yeni Ödeme/Tahsilat",
    loading: "Yükleniyor...",
    loadErrorTitle: "Tahsilatlar Yüklenemedi",
    loadError: "Tahsilat ve ödeme kayıtları yüklenirken bir hata oluştu.",
    emptyTitle: "Tahsilat Kaydı Yok",
    empty: "Kayıt bulunamadı.",
    showing: "Gösterilen kayıt",
    summaryTotal: "Toplam Ödeme",
    summaryPending: "Bekleyen",
    summaryCollected: "Tahsil Edildi",
    summaryOverdue: "Gecikmiş",
    summaryTotalAmount: "Toplam Tutar",
    paymentNo: "Ödeme No",
    collected: "Tahsil Edilen",
    remaining: "Kalan",
    collectPayment: "Tahsilat Kaydet",
    addReceipt: "Dekont Ekle",
    sendReminder: "Hatırlatma Gönder",
    metricCount: "Kayıt Sayısı",
    metricInbound: "Tahsilat Toplamı",
    metricOutbound: "Ödeme Toplamı",
    metricNet: "Net Akış",
    payment: "Ödeme",
    direction: "Yön",
    amount: "Tutar",
    details: "Detaylar",
    date: "Tarih",
    customer: "Müşteri",
    policy: "Poliçe",
    purpose: "Amaç",
    recordId: "Kayıt",
    openDesk: "Yönetim Ekranını Aç",
    openRelated: "İlişkili Kaydı Aç",
    openPaymentDetail: "Ödeme Kaydını Aç",
    actions: "Aksiyon",
    inbound: "Tahsilat",
    outbound: "Ödeme",
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
    searchPlaceholder: "Ödeme no / müşteri / poliçe ara",
    allDirections: "Tüm yönler",
    customerFilter: "Müşteri (içerir)",
    policyFilter: "Poliçe (içerir)",
    purposeFilter: "Amaç (içerir)",
    sortModifiedDesc: "Son Güncellenen",
    sortPaymentDateDesc: "Tarih (Yeni -> Eski)",
    sortPaymentDateAsc: "Tarih (Eski -> Yeni)",
    sortAmountDesc: "Tutar (Yüksek -> Düşük)",
    installments: "Taksit",
    overdueInstallments: "Geciken Taksit",
    nextInstallmentDue: "Sonraki Vade",
    paidInstallments: "Ödenen Taksit",
  },
  en: {
    title: "Payments",
    subtitle: "Track collection, pending payments, and overdue due dates",
    recordCount: "records",
    refresh: "Refresh",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    newPayment: "New Payment",
    loading: "Loading...",
    loadErrorTitle: "Failed to Load Payments",
    loadError: "An error occurred while loading payment records.",
    emptyTitle: "No Payment Records",
    empty: "No records found.",
    showing: "Showing rows",
    summaryTotal: "Total Payments",
    summaryPending: "Pending",
    summaryCollected: "Collected",
    summaryOverdue: "Overdue",
    summaryTotalAmount: "Total Amount",
    paymentNo: "Payment No",
    collected: "Collected",
    remaining: "Remaining",
    collectPayment: "Record Collection",
    addReceipt: "Add Receipt",
    sendReminder: "Send Reminder",
    metricCount: "Record Count",
    metricInbound: "Inbound Total",
    metricOutbound: "Outbound Total",
    metricNet: "Net Flow",
    payment: "Payment",
    direction: "Direction",
    amount: "Amount",
    details: "Details",
    date: "Date",
    customer: "Customer",
    policy: "Policy",
    purpose: "Purpose",
    recordId: "Record",
    openDesk: "Open Desk",
    openRelated: "Open Related",
    openPaymentDetail: "Open Payment Record",
    actions: "Actions",
    inbound: "Inbound",
    outbound: "Outbound",
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
    searchPlaceholder: "Search payment no / customer / policy",
    allDirections: "All directions",
    customerFilter: "Customer (contains)",
    policyFilter: "Policy (contains)",
    purposeFilter: "Purpose (contains)",
    sortModifiedDesc: "Last Modified",
    sortPaymentDateDesc: "Payment Date (New -> Old)",
    sortPaymentDateAsc: "Payment Date (Old -> New)",
    sortAmountDesc: "Amount (High -> Low)",
    installments: "Installments",
    overdueInstallments: "Overdue Installments",
    nextInstallmentDue: "Next Due",
    paidInstallments: "Paid Installments",
  },
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const appPinia = getAppPinia();
const authStore = useAuthStore(appPinia);
const branchStore = useBranchStore(appPinia);
const paymentStore = usePaymentStore(appPinia);
const route = useRoute();
const router = useRouter();
const activeLocale = computed(() => unref(authStore.locale) || "en");

function buildOfficeBranchLookupFilters() {
  const officeBranch = branchStore.requestBranch || "";
  return officeBranch ? { office_branch: officeBranch } : {};
}

const filters = paymentStore.state.filters;
const paymentSortOptions = computed(() => [
  { value: "modified desc", label: t("sortModifiedDesc") },
  { value: "payment_date desc", label: t("sortPaymentDateDesc") },
  { value: "payment_date asc", label: t("sortPaymentDateAsc") },
  { value: "amount_try desc", label: t("sortAmountDesc") },
]);
const activeFilterCount = computed(() => paymentStore.activeFilterCount);
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
  screen: "payments_board",
  presetStorageKey: "at:payments-board:preset",
  presetListStorageKey: "at:payments-board:preset-list",
  t,
  getCurrentPayload: currentPaymentPresetPayload,
  setFilterStateFromPayload: setPaymentFilterStateFromPayload,
  resetFilterState: resetPaymentFilterState,
  refresh: reloadPayments,
  getSortLocale: () => localeCode.value,
});

const paymentsResource = createResource({
  url: "frappe.client.get_list",
  params: buildPaymentListParams(),
  auto: true,
});
const paymentsLoading = computed(() => Boolean(unref(paymentsResource.loading)));
const paymentsResourceError = computed(() => unref(paymentsResource.error));
const paymentInstallmentResource = createResource({
  url: "frappe.client.get_list",
  params: buildPaymentInstallmentListParams(),
  auto: true,
});

const paymentQuickCustomerResource = createResource({
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
const paymentQuickPolicyResource = createResource({
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
const paymentQuickClaimResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Claim",
    fields: ["name", "claim_no", "customer", "policy"],
    filters: buildOfficeBranchLookupFilters(),
    order_by: "modified desc",
    limit_page_length: 500,
  },
});
const paymentQuickSalesEntityResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Sales Entity",
    fields: ["name", "full_name"],
    order_by: "full_name asc",
    limit_page_length: 500,
  },
});

const resourceValue = (resource, fallback = null) => {
  const value = unref(resource?.data);
  return value == null ? fallback : value;
};
const asArray = (value) => (Array.isArray(value) ? value : []);
const payments = computed(() => paymentStore.filteredItems);
const installmentSummaryByPayment = computed(() => {
  const grouped = new Map();
  for (const installment of asArray(resourceValue(paymentInstallmentResource, []))) {
    if (!installment?.payment) continue;
    const current = grouped.get(installment.payment) || {
      total: 0,
      paid: 0,
      overdue: 0,
      nextDue: "",
      paidAmount: 0,
    };
    current.total = Math.max(
      Number(current.total || 0),
      Number(installment.installment_count || installment.installment_no || 0)
    );
    if (installment.status === "Paid") {
      current.paid += 1;
      current.paidAmount += Number(installment.amount_try || 0);
    }
    if (installment.status === "Overdue") current.overdue += 1;
    if (
      (installment.status === "Scheduled" || installment.status === "Overdue") &&
      installment.due_date &&
      (!current.nextDue || installment.due_date < current.nextDue)
    ) {
      current.nextDue = installment.due_date;
    }
    grouped.set(installment.payment, current);
  }
  return grouped;
});
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
const showQuickPaymentDialog = ref(false);
const paymentQuickOptionsMap = computed(() => ({
  customers: asArray(resourceValue(paymentQuickCustomerResource, [])).map((row) => ({ value: row.name, label: row.full_name || row.name })),
  policies: asArray(resourceValue(paymentQuickPolicyResource, [])).map((row) => ({
    value: row.name,
    label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
  })),
  claims: asArray(resourceValue(paymentQuickClaimResource, [])).map((row) => ({
    value: row.name,
    label: `${row.claim_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
  })),
  salesEntities: asArray(resourceValue(paymentQuickSalesEntityResource, [])).map((row) => ({ value: row.name, label: row.full_name || row.name })),
}));
const quickPaymentEyebrow = computed(() => (activeLocale.value === "tr" ? "Hızlı Ödeme" : "Quick Payment"));
const quickPaymentSuccessHandlers = {
  payment_list: async () => {
    await reloadPayments();
  },
};
const paymentsErrorText = computed(() => {
  if (paymentStore.state.error) return paymentStore.state.error;
  const err = paymentsResourceError.value;
  if (!err) return "";
  return err?.messages?.join(" ") || err?.message || t("loadError");
});
const paymentSnapshots = computed(() => payments.value.map((payment) => buildPaymentSnapshot(payment)));
const paymentSummary = computed(() => {
  const rows = paymentSnapshots.value;
  return {
    total: rows.length,
    pending: rows.filter((row) => row.isPending).length,
    collected: rows.filter((row) => row.isCollected).length,
    overdue: rows.filter((row) => row.isOverdue).length,
    totalAmount: rows.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0),
  };
});
const paymentListColumns = computed(() => [
  { key: "payment_no", label: t("paymentNo"), width: "180px", type: "mono" },
  { key: "customer", label: t("customer"), width: "220px" },
  { key: "policy", label: t("policy"), width: "160px", type: "mono" },
  { key: "due_date_label", label: t("dueDate"), width: "135px", type: "date" },
  { key: "amount_label", label: t("amount"), width: "140px", type: "amount", align: "right" },
  { key: "collected_amount_label", label: t("collected"), width: "150px", type: "amount", align: "right" },
  { key: "remaining_amount_label", label: t("remaining"), width: "130px", type: "amount", align: "right" },
  { key: "status", label: t("status"), width: "130px", type: "status", domain: "payment" },
  { key: "_actions", label: t("actions"), width: "340px", type: "actions", align: "right" },
]);
const paymentsWithActions = computed(() => paymentSnapshots.value.map((row) => ({
  ...row,
  _actions: buildPaymentRowActions(row),
})));
const inboundTotal = computed(() => paymentStore.inboundTotal);
const outboundTotal = computed(() => paymentStore.outboundTotal);
function formatCurrency(value) {
  return new Intl.NumberFormat(localeCode.value, {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatCount(value) {
  return new Intl.NumberFormat(localeCode.value).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(localeCode.value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function parseDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isPastDate(value) {
  const date = parseDateOnly(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
}

function isDueSoon(value) {
  const date = parseDateOnly(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((date.getTime() - today.getTime()) / 86400000);
  return diffDays >= 0 && diffDays <= 7;
}

function buildPaymentStatus(payment, collectedAmount, remainingAmount, isOverdue) {
  const rawStatus = String(payment?.status || "").trim();
  if (rawStatus === "Cancelled") return rawStatus;
  if (remainingAmount <= 0 && Number(payment?.amount_try || payment?.amount || 0) > 0) return "Paid";
  if (isOverdue) return "Overdue";
  if (collectedAmount > 0 && remainingAmount > 0) return "Partially Paid";
  if (rawStatus) return rawStatus;
  return "Outstanding";
}

function buildPaymentSnapshot(payment) {
  const installmentSummary = installmentSummaryByPayment.value.get(payment?.name) || {};
  const totalAmount = Number(payment?.amount_try || payment?.amount || 0);
  const collectedAmount = Number(installmentSummary.paidAmount || 0);
  const remainingAmount = Math.max(totalAmount - collectedAmount, 0);
  const dueDate = String(payment?.due_date || payment?.payment_date || "").trim();
  const isOverdue = Boolean(installmentSummary.overdue > 0) || (isPastDate(dueDate) && remainingAmount > 0);
  const status = buildPaymentStatus(payment, collectedAmount, remainingAmount, isOverdue);
  const isCollected = status === "Paid" || collectedAmount >= totalAmount;
  const isPending = !isCollected && !isOverdue && status !== "Cancelled";

  return {
    ...payment,
    status,
    totalAmount,
    collectedAmount,
    remainingAmount,
    due_date_label: formatDate(dueDate),
    amount_label: formatCurrency(totalAmount),
    collected_amount_label: formatCurrency(collectedAmount),
    remaining_amount_label: formatCurrency(remainingAmount),
    isOverdue,
    isCollected,
    isPending,
    _urgency: isOverdue ? "row-critical" : remainingAmount > 0 && isDueSoon(dueDate) ? "row-warning" : "",
  };
}

function buildPaymentRowActions(payment) {
  return [
    { key: "collect", label: t("collectPayment"), variant: "primary", onClick: () => openCollectPayment(payment) },
    { key: "receipt", label: t("addReceipt"), variant: "secondary", onClick: () => addReceipt(payment) },
    { key: "reminder", label: t("sendReminder"), variant: "secondary", onClick: () => sendReminder(payment) },
  ];
}

function buildPaymentListParams() {
  const params = {
    doctype: "AT Payment",
    fields: [
      "name",
      "payment_no",
      "status",
      "payment_direction",
      "payment_purpose",
      "amount",
      "amount_try",
      "payment_date",
      "due_date",
      "customer",
      "policy",
      "reference_no",
      "installment_count",
      "office_branch",
      "sales_entity",
    ],
    order_by: filters.sort || "modified desc",
    limit_page_length: Number(filters.limit) || 24,
  };
  if (filters.direction) {
    params.filters = { payment_direction: filters.direction };
  }
  return withOfficeBranchFilter(params);
}

function buildPaymentInstallmentListParams() {
  return withOfficeBranchFilter({
    doctype: "AT Payment Installment",
    fields: ["payment", "installment_no", "installment_count", "status", "due_date", "amount_try"],
    order_by: "due_date asc",
    limit_page_length: 1000,
  });
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

function reloadPayments() {
  paymentsResource.params = buildPaymentListParams();
  paymentInstallmentResource.params = buildPaymentInstallmentListParams();
  paymentStore.setLocaleCode(localeCode.value);
  paymentStore.setLoading(true);
  paymentStore.clearError();
  return Promise.all([paymentsResource.reload(), paymentInstallmentResource.reload()])
    .then(([result]) => {
      paymentStore.setItems(result || []);
      paymentStore.setLoading(false);
      return result;
    })
    .catch((error) => {
      paymentStore.setItems([]);
      paymentStore.setError(error?.messages?.join(" ") || error?.message || t("loadError"));
      paymentStore.setLoading(false);
      throw error;
    });
}

function downloadPaymentExport(format) {
  openTabularExport({
    permissionDoctypes: ["AT Payment"],
    exportKey: "payments_board",
    title: t("title"),
    columns: [
      t("paymentNo"),
      t("customer"),
      t("policy"),
      t("dueDate"),
      t("amount"),
      t("collected"),
      t("remaining"),
      t("status"),
    ],
    rows: paymentSnapshots.value.map((payment) => ({
      [t("paymentNo")]: payment.payment_no || payment.name || "-",
      [t("customer")]: payment.customer || "-",
      [t("policy")]: payment.policy || "-",
      [t("dueDate")]: payment.due_date_label || "-",
      [t("amount")]: payment.amount_label || formatCurrency(payment.totalAmount),
      [t("collected")]: payment.collected_amount_label || formatCurrency(payment.collectedAmount),
      [t("remaining")]: payment.remaining_amount_label || formatCurrency(payment.remainingAmount),
      [t("status")]: payment.status || "-",
    })),
    filters: currentPaymentPresetPayload(),
    format,
  });
}

function applyPaymentFilters() {
  return reloadPayments();
}

function resetPaymentFilterState() {
  paymentStore.resetFilters();
}

function currentPaymentPresetPayload() {
  return {
    query: filters.query,
    direction: filters.direction,
    customerQuery: filters.customerQuery,
    policyQuery: filters.policyQuery,
    purposeQuery: filters.purposeQuery,
    sort: filters.sort,
    limit: Number(filters.limit) || 24,
  };
}

function setPaymentFilterStateFromPayload(payload) {
  filters.query = String(payload?.query || "");
  filters.direction = String(payload?.direction || "");
  filters.customerQuery = String(payload?.customerQuery || "");
  filters.policyQuery = String(payload?.policyQuery || "");
  filters.purposeQuery = String(payload?.purposeQuery || "");
  filters.sort = String(payload?.sort || "modified desc");
  filters.limit = Number(payload?.limit || 24) || 24;
}

function applyRouteFilters() {
  const query = String(route.query?.query || "").trim();
  const customerQuery = String(route.query?.customer || "").trim();
  const policyQuery = String(route.query?.policy || "").trim();
  const purposeQuery = String(route.query?.purpose || "").trim();
  const direction = String(route.query?.direction || "").trim();
  const hasRouteFilters = Boolean(query || customerQuery || policyQuery || purposeQuery || direction);
  if (!hasRouteFilters) return false;

  filters.query = query;
  filters.customerQuery = customerQuery;
  filters.policyQuery = policyQuery;
  filters.purposeQuery = purposeQuery;
  filters.direction = direction;
  return true;
}

function resetPaymentFilters() {
  applyPreset("default", { refresh: false });
  void persistPresetStateToServer();
  return reloadPayments();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function prepareQuickPaymentDialog({ form }) {
  if (!form.payment_date) form.payment_date = todayIso();
}

function paymentIdentityFacts(payment) {
  return [
    mutedFact("purpose", t("purpose"), payment?.payment_purpose || "-", "at-clamp-2"),
    subtleFact("record", t("recordId"), payment?.name || "-"),
  ];
}

function paymentDetailFacts(payment) {
  const items = [
    mutedFact("date", t("date"), payment?.payment_date || "-"),
    mutedFact("customer", t("customer"), payment?.customer || "-"),
  ];
  pushMutedFactIf(items, Boolean(payment?.policy), "policy", t("policy"), payment?.policy);
  const installmentSummary = installmentSummaryByPayment.value.get(payment?.name);
  const installmentCount = Number(installmentSummary?.total || payment?.installment_count || 0);
  pushMutedFactIf(items, installmentCount > 1, "installments", t("installments"), `${installmentCount}`);
  pushMutedFactIf(
    items,
    Number(installmentSummary?.paid || 0) > 0,
    "paid_installments",
    t("paidInstallments"),
    `${installmentSummary?.paid}/${installmentCount || installmentSummary?.paid}`
  );
  pushMutedFactIf(
    items,
    Number(installmentSummary?.overdue || 0) > 0,
    "overdue_installments",
    t("overdueInstallments"),
    `${installmentSummary?.overdue}`
  );
  pushMutedFactIf(
    items,
    Boolean(installmentSummary?.nextDue),
    "next_due",
    t("nextInstallmentDue"),
    installmentSummary?.nextDue
  );
  return items;
}

function openRelatedRecord(payment) {
  if (payment?.policy) {
    window.location.assign(`/at/policies/${encodeURIComponent(payment.policy)}`);
    return;
  }
  if (payment?.customer) {
    window.location.assign(`/at/customers/${encodeURIComponent(payment.customer)}`);
  }
}

function openPaymentDetail(payment) {
  if (!payment?.name) return;
  router.push({ name: "payment-detail", params: { name: payment.name } });
}

function openCollectPayment(payment) {
  if (!payment?.name) return;
  router.push({
    name: "payment-detail",
    params: { name: payment.name },
    query: { action: "collect" },
  });
}

function addReceipt(payment) {
  if (!payment?.name) return;
  router.push({
    name: "payment-detail",
    params: { name: payment.name },
    query: { action: "receipt" },
  });
}

function sendReminder(payment) {
  if (!payment?.name) return;
  router.push({
    name: "reminders-list",
    query: {
      sourceDoctype: "AT Payment",
      sourceName: payment.name,
      customer: payment.customer || "",
      policy: payment.policy || "",
    },
  });
}

onMounted(() => {
  paymentStore.setLocaleCode(localeCode.value);
  applyPreset(presetKey.value, { refresh: false });
  applyRouteFilters();
  void reloadPayments();
  void hydratePresetStateFromServer();
});

watch(
  () => [route.query?.query, route.query?.customer, route.query?.policy, route.query?.purpose, route.query?.direction],
  () => {
    if (!applyRouteFilters()) return;
    void reloadPayments();
  }
);

watch(
  () => branchStore.selected,
  () => {
    paymentStore.setLocaleCode(localeCode.value);
    const officeFilters = buildOfficeBranchLookupFilters();
    paymentQuickCustomerResource.params = {
      doctype: "AT Customer",
      fields: ["name", "full_name"],
      filters: officeFilters,
      order_by: "modified desc",
      limit_page_length: 500,
    };
    paymentQuickPolicyResource.params = {
      doctype: "AT Policy",
      fields: ["name", "policy_no", "customer"],
      filters: officeFilters,
      order_by: "modified desc",
      limit_page_length: 500,
    };
    paymentQuickClaimResource.params = {
      doctype: "AT Claim",
      fields: ["name", "claim_no", "customer", "policy"],
      filters: officeFilters,
      order_by: "modified desc",
      limit_page_length: 500,
    };
    void paymentQuickCustomerResource.reload();
    void paymentQuickPolicyResource.reload();
    void paymentQuickClaimResource.reload();
    void reloadPayments();
  }
);
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>


