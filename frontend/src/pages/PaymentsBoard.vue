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
                  <StatusBadge type="payment_direction" :status="payment.payment_direction" />
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
      :locale="sessionState.locale"
      :options-map="paymentQuickOptionsMap"
      :show-save-and-open="false"
      :before-open="prepareQuickPaymentDialog"
      :success-handlers="quickPaymentSuccessHandlers"
    />
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { createResource } from "frappe-ui";

import { sessionState } from "../state/session";
import ActionButton from "../components/app-shell/ActionButton.vue";
import DataTableShell from "../components/app-shell/DataTableShell.vue";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import DocSummaryGrid from "../components/app-shell/DocSummaryGrid.vue";
import FormattedCurrencyValue from "../components/app-shell/FormattedCurrencyValue.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import PageToolbar from "../components/app-shell/PageToolbar.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import StatusBadge from "../components/StatusBadge.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import { useCustomFilterPresets } from "../composables/useCustomFilterPresets";
import { mutedFact, pushMutedFactIf, subtleFact } from "../utils/factItems";

const copy = {
  tr: {
    title: "Tahsilatlar",
    subtitle: "Tahsilat ve odeme hareketleri",
    refresh: "Yenile",
    newPayment: "Yeni Odeme/Tahsilat",
    loading: "Yukleniyor...",
    loadErrorTitle: "Tahsilatlar Yuklenemedi",
    loadError: "Tahsilat ve odeme kayitlari yuklenirken bir hata olustu.",
    emptyTitle: "Tahsilat Kaydi Yok",
    empty: "Kayit bulunamadi.",
    showing: "Gosterilen kayit",
    metricCount: "Kayit Sayisi",
    metricInbound: "Tahsilat Toplami",
    metricOutbound: "Odeme Toplami",
    metricNet: "Net Akis",
    payment: "Odeme",
    direction: "Yon",
    amount: "Tutar",
    details: "Detaylar",
    date: "Tarih",
    customer: "Musteri",
    policy: "Police",
    purpose: "Amac",
    recordId: "Kayit",
    openDesk: "Yonetim",
    openRelated: "Iliskili Kaydi Ac",
    actions: "Aksiyon",
    inbound: "Tahsilat",
    outbound: "Odeme",
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
    searchPlaceholder: "Odeme no / musteri / police ara",
    allDirections: "Tum yonler",
    customerFilter: "Musteri (icerir)",
    policyFilter: "Police (icerir)",
    purposeFilter: "Amac (icerir)",
    sortModifiedDesc: "Son Guncellenen",
    sortPaymentDateDesc: "Tarih (Yeni -> Eski)",
    sortPaymentDateAsc: "Tarih (Eski -> Yeni)",
    sortAmountDesc: "Tutar (Yuksek -> Dusuk)",
  },
  en: {
    title: "Payments",
    subtitle: "Collection and payout transactions",
    refresh: "Refresh",
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
  },
};

function t(key) {
  return copy[sessionState.locale]?.[key] || copy.en[key] || key;
}

const filters = reactive({
  query: "",
  direction: "",
  customerQuery: "",
  policyQuery: "",
  purposeQuery: "",
  sort: "modified desc",
  limit: 24,
});
const paymentSortOptions = computed(() => [
  { value: "modified desc", label: t("sortModifiedDesc") },
  { value: "payment_date desc", label: t("sortPaymentDateDesc") },
  { value: "payment_date asc", label: t("sortPaymentDateAsc") },
  { value: "amount_try desc", label: t("sortAmountDesc") },
]);
const activeFilterCount = computed(() => {
  let count = 0;
  if (filters.query) count += 1;
  if (filters.direction) count += 1;
  if (filters.customerQuery) count += 1;
  if (filters.policyQuery) count += 1;
  if (filters.purposeQuery) count += 1;
  if (filters.sort !== "modified desc") count += 1;
  if (Number(filters.limit) !== 24) count += 1;
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
  screen: "payments_board",
  presetStorageKey: "at:payments-board:preset",
  presetListStorageKey: "at:payments-board:preset-list",
  t,
  getCurrentPayload: currentPaymentPresetPayload,
  setFilterStateFromPayload: setPaymentFilterStateFromPayload,
  resetFilterState: resetPaymentFilterState,
  refresh: reloadPayments,
  getSortLocale: () => (sessionState.locale === "tr" ? "tr-TR" : "en-US"),
});

const paymentsResource = createResource({
  url: "frappe.client.get_list",
  params: buildPaymentListParams(),
  auto: true,
});

const paymentQuickCustomerResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Customer",
    fields: ["name", "full_name"],
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

const paymentsRaw = computed(() => paymentsResource.data || []);
const payments = computed(() => {
  let rows = paymentsRaw.value.slice();
  const query = normalizeText(filters.query);
  if (query) {
    rows = rows.filter((row) =>
      [row?.payment_no, row?.name, row?.customer, row?.policy]
        .some((value) => normalizeText(value).includes(query))
    );
  }
  const customerQuery = normalizeText(filters.customerQuery);
  if (customerQuery) {
    rows = rows.filter((row) => normalizeText(row?.customer).includes(customerQuery));
  }
  const policyQuery = normalizeText(filters.policyQuery);
  if (policyQuery) {
    rows = rows.filter((row) => normalizeText(row?.policy).includes(policyQuery));
  }
  const purposeQuery = normalizeText(filters.purposeQuery);
  if (purposeQuery) {
    rows = rows.filter((row) => normalizeText(row?.payment_purpose).includes(purposeQuery));
  }
  return rows;
});
const localeCode = computed(() => (sessionState.locale === "tr" ? "tr-TR" : "en-US"));
const showQuickPaymentDialog = ref(false);
const paymentQuickOptionsMap = computed(() => ({
  customers: (paymentQuickCustomerResource.data || []).map((row) => ({ value: row.name, label: row.full_name || row.name })),
  policies: (paymentQuickPolicyResource.data || []).map((row) => ({
    value: row.name,
    label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
  })),
  claims: (paymentQuickClaimResource.data || []).map((row) => ({
    value: row.name,
    label: `${row.claim_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
  })),
  salesEntities: (paymentQuickSalesEntityResource.data || []).map((row) => ({ value: row.name, label: row.full_name || row.name })),
}));
const quickPaymentSuccessHandlers = {
  payment_list: async () => {
    await reloadPayments();
  },
};
const paymentsErrorText = computed(() => {
  const err = paymentsResource.error;
  if (!err) return "";
  return err?.messages?.join(" ") || err?.message || t("loadError");
});
const inboundTotal = computed(() =>
  payments.value
    .filter((row) => row.payment_direction === "Inbound")
    .reduce((sum, row) => sum + Number(row.amount_try || 0), 0)
);
const outboundTotal = computed(() =>
  payments.value
    .filter((row) => row.payment_direction === "Outbound")
    .reduce((sum, row) => sum + Number(row.amount_try || 0), 0)
);
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

function normalizeText(value) {
  return String(value || "").trim().toLocaleLowerCase(sessionState.locale === "tr" ? "tr-TR" : "en-US");
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
    ],
    order_by: filters.sort || "modified desc",
    limit_page_length: Number(filters.limit) || 24,
  };
  if (filters.direction) {
    params.filters = { payment_direction: filters.direction };
  }
  return params;
}

function reloadPayments() {
  paymentsResource.params = buildPaymentListParams();
  return paymentsResource.reload();
}

function applyPaymentFilters() {
  return reloadPayments();
}

function resetPaymentFilterState() {
  filters.query = "";
  filters.direction = "";
  filters.customerQuery = "";
  filters.policyQuery = "";
  filters.purposeQuery = "";
  filters.sort = "modified desc";
  filters.limit = 24;
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
  return items;
}

function openRelatedRecord(payment) {
  if (payment?.policy) {
    window.location.href = `/at/policies/${encodeURIComponent(payment.policy)}`;
    return;
  }
  if (payment?.customer) {
    window.location.href = `/at/customers/${encodeURIComponent(payment.customer)}`;
  }
}

onMounted(() => {
  applyPreset(presetKey.value, { refresh: false });
  if (String(presetKey.value || "default") !== "default") void reloadPayments();
  void hydratePresetStateFromServer();
});
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>
