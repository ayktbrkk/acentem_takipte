<template>
  <section class="space-y-4">
    <article class="surface-card rounded-2xl p-5">
      <PageToolbar
      :title="t('title')"
      :subtitle="t('subtitle')"
      :show-refresh="true"
      :busy="paymentsResource.loading"
      :refresh-label="t('refresh')"
      @refresh="reloadPayments"
    >
      <template #actions>
        <div class="flex flex-wrap items-center gap-2">
          <QuickCreateLauncher
            variant="primary"
            size="sm"
            :label="t('newPayment')"
            @launch="showQuickPaymentDialog = true"
          />
          <ActionButton variant="secondary" size="sm" :disabled="paymentsResource.loading" @click="reloadPayments">
            {{ t("refresh") }}
          </ActionButton>
          <ActionButton
            variant="secondary"
            size="sm"
            :disabled="paymentsResource.loading"
            @click="downloadPaymentExport('xlsx')"
          >
            {{ t("exportXlsx") }}
          </ActionButton>
          <ActionButton
            variant="primary"
            size="sm"
            :disabled="paymentsResource.loading"
            @click="downloadPaymentExport('pdf')"
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
          @apply="applyPaymentFilters"
          @reset="resetPaymentFilters"
        >
          <input
            v-model.trim="filters.query"
            class="input"
            type="search"
            :placeholder="t('searchPlaceholder')"
            @keyup.enter="applyPaymentFilters"
          />
          <select v-model="filters.direction" class="input">
            <option value="">{{ t("allDirections") }}</option>
            <option value="Inbound">{{ t("inbound") }}</option>
            <option value="Outbound">{{ t("outbound") }}</option>
          </select>
          <select v-model="filters.sort" class="input">
            <option v-for="option in paymentSortOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <select v-model.number="filters.limit" class="input">
            <option :value="24">24</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>

          <template #advanced>
            <input
              v-model.trim="filters.customerQuery"
              class="input"
              type="search"
              :placeholder="t('customerFilter')"
              @keyup.enter="applyPaymentFilters"
            />
            <input
              v-model.trim="filters.policyQuery"
              class="input"
              type="search"
              :placeholder="t('policyFilter')"
              @keyup.enter="applyPaymentFilters"
            />
            <input
              v-model.trim="filters.purposeQuery"
              class="input"
              type="search"
              :placeholder="t('purposeFilter')"
              @keyup.enter="applyPaymentFilters"
            />
          </template>
        </WorkbenchFilterToolbar>
      </template>
      </PageToolbar>
    </article>

    <DocSummaryGrid v-if="showSummaryGrid" :items="paymentsSummaryItems" />

    <article class="surface-card rounded-2xl p-5">
      <DataTableShell
      :loading="paymentsResource.loading"
      :error="paymentsErrorText"
      :empty="payments.length === 0"
      :loading-label="t('loading')"
      :error-title="t('loadErrorTitle')"
      :empty-title="t('emptyTitle')"
      :empty-description="t('empty')"
    >
      <template #header>
        <div class="text-xs text-slate-500">{{ t("showing") }} {{ payments.length }}</div>
      </template>

      <template #default>
        <div class="overflow-auto">
          <table class="at-table">
            <thead>
              <tr class="at-table-head-row">
                <th class="at-table-head-cell">{{ t("payment") }}</th>
                <th class="at-table-head-cell">{{ t("direction") }}</th>
                <th class="at-table-head-cell">{{ t("amount") }}</th>
                <th class="at-table-head-cell">{{ t("details") }}</th>
                <th class="at-table-head-cell">{{ t("actions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="payment in payments" :key="payment.name" class="at-table-row">
                <DataTableCell cell-class="min-w-[240px]">
                  <TableEntityCell :title="payment.payment_no || payment.name" :facts="paymentIdentityFacts(payment)" />
                </DataTableCell>
                <DataTableCell>
                  <StatusBadge domain="payment_direction" :status="payment.payment_direction" />
                </DataTableCell>
                <DataTableCell>
                  <FormattedCurrencyValue :value="payment.amount_try" :locale="localeCode" />
                </DataTableCell>
                <TableFactsCell :items="paymentDetailFacts(payment)" cell-class="min-w-[220px]" />
                <DataTableCell>
                  <InlineActionRow>
                    <ActionButton
                      v-if="payment.policy || payment.customer"
                      variant="secondary"
                      size="xs"
                      @click="openRelatedRecord(payment)"
                    >
                      {{ t("openRelated") }}
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
      v-model="showQuickPaymentDialog"
      config-key="payment"
      :locale="activeLocale"
      :options-map="paymentQuickOptionsMap"
      :show-save-and-open="false"
      :before-open="prepareQuickPaymentDialog"
      :success-handlers="quickPaymentSuccessHandlers"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, ref, unref, watch } from "vue";
import { useRoute } from "vue-router";
import { createResource } from "frappe-ui";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { usePaymentStore } from "../stores/payment";
import ActionButton from "../components/app-shell/ActionButton.vue";
import DataTableShell from "../components/app-shell/DataTableShell.vue";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import DocSummaryGrid from "../components/app-shell/DocSummaryGrid.vue";
import FormattedCurrencyValue from "../components/app-shell/FormattedCurrencyValue.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import PageToolbar from "../components/app-shell/PageToolbar.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import { useCustomFilterPresets } from "../composables/useCustomFilterPresets";
import { mutedFact, pushMutedFactIf, subtleFact } from "../utils/factItems";
import { openTabularExport } from "../utils/listExport";

const copy = {
  tr: {
    title: "Tahsilatlar",
    subtitle: "Tahsilat ve ödeme hareketlerini takip edin",
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
    metricCount: "Kayıt Sayısı",
    metricInbound: "Tahsilat Toplami",
    metricOutbound: "Ödeme Toplamı",
    metricNet: "Net Akis",
    payment: "Ödeme",
    direction: "Yön",
    amount: "Tutar",
    details: "Detaylar",
    date: "Tarih",
    customer: "Müşteri",
    policy: "Poliçe",
    purpose: "Amac",
    recordId: "Kayıt",
    openDesk: "Yönetim",
    openRelated: "İlişkili Kaydı Aç",
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
    purposeFilter: "Amac (içerir)",
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
    subtitle: "Track collection and payout transactions",
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
    openDesk: "Desk",
    openRelated: "Open Related",
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

const authStore = useAuthStore();
const branchStore = useBranchStore();
const paymentStore = usePaymentStore();
const route = useRoute();
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
    };
    current.total = Math.max(
      Number(current.total || 0),
      Number(installment.installment_count || installment.installment_no || 0)
    );
    if (installment.status === "Paid") current.paid += 1;
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
const quickPaymentSuccessHandlers = {
  payment_list: async () => {
    await reloadPayments();
  },
};
const paymentsErrorText = computed(() => {
  if (paymentStore.state.error) return paymentStore.state.error;
  const err = paymentsResource.error;
  if (!err) return "";
  return err?.messages?.join(" ") || err?.message || t("loadError");
});
const inboundTotal = computed(() => paymentStore.inboundTotal);
const outboundTotal = computed(() => paymentStore.outboundTotal);
const showSummaryGrid = computed(
  () => !paymentsResource.loading && !paymentsErrorText.value && payments.value.length > 0
);
const paymentsSummaryItems = computed(() => [
  { key: "count", label: t("metricCount"), value: String(payments.value.length) },
  { key: "inbound", label: t("metricInbound"), value: formatCurrency(inboundTotal.value), valueClass: "text-emerald-700" },
  { key: "outbound", label: t("metricOutbound"), value: formatCurrency(outboundTotal.value), valueClass: "text-amber-700" },
  { key: "net", label: t("metricNet"), value: formatCurrency(inboundTotal.value - outboundTotal.value) },
]);

function formatCurrency(value) {
  return new Intl.NumberFormat(localeCode.value, {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function buildPaymentListParams() {
  const params = {
    doctype: "AT Payment",
    fields: [
      "name",
      "payment_no",
      "payment_direction",
      "payment_purpose",
      "amount_try",
      "payment_date",
      "customer",
      "policy",
      "installment_count",
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
      t("payment"),
      t("direction"),
      t("amount"),
      t("date"),
      t("customer"),
      t("policy"),
      t("purpose"),
      t("installments"),
      t("overdueInstallments"),
      t("nextInstallmentDue"),
    ],
    rows: payments.value.map((payment) => {
      const installmentSummary = installmentSummaryByPayment.value.get(payment?.name) || {};
      const installmentCount = Number(installmentSummary?.total || payment?.installment_count || 0);
      return {
        [t("payment")]: payment.payment_no || payment.name || "-",
        [t("direction")]: payment.payment_direction === "Inbound" ? t("inbound") : payment.payment_direction === "Outbound" ? t("outbound") : "-",
        [t("amount")]: formatCurrency(payment.amount_try),
        [t("date")]: payment.payment_date || "-",
        [t("customer")]: payment.customer || "-",
        [t("policy")]: payment.policy || "-",
        [t("purpose")]: payment.payment_purpose || "-",
        [t("installments")]: installmentCount || "-",
        [t("overdueInstallments")]: Number(installmentSummary?.overdue || 0) || "-",
        [t("nextInstallmentDue")]: installmentSummary?.nextDue || "-",
      };
    }),
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
