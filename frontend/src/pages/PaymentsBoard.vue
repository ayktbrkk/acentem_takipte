<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
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
import { unref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { usePaymentStore } from "../stores/payment";
import { usePaymentsBoardRuntime } from "../composables/usePaymentsBoardRuntime";
import ActionButton from "../components/app-shell/ActionButton.vue";
import EmptyState from "../components/app-shell/EmptyState.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import ListTable from "../components/ui/ListTable.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";

const copy = {
  tr: {
    breadcrumb: "Sigorta Operasyonları → Ödemeler",
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
    payment: "Ödeme",
    direction: "Yön",
    amount: "Tutar",
    details: "Detaylar",
    date: "Tarih",
    customer: "Müşteri",
    policy: "Poliçe",
    purpose: "Amaç",
    recordId: "Kayıt",
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
    breadcrumb: "Insurance Operations → Payments",
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
    payment: "Payment",
    direction: "Direction",
    amount: "Amount",
    details: "Details",
    date: "Date",
    customer: "Customer",
    policy: "Policy",
    purpose: "Purpose",
    recordId: "Record",
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
const runtime = usePaymentsBoardRuntime({ t, route, router, authStore, branchStore, paymentStore });
const {
  activeLocale,
  localeCode,
  filters,
  paymentSortOptions,
  activeFilterCount,
  presetKey,
  presetOptions,
  canDeletePreset,
  onPresetChange,
  savePreset,
  deletePreset,
  reloadPayments,
  downloadPaymentExport,
  applyPaymentFilters,
  resetPaymentFilters,
  paymentsLoading,
  paymentsErrorText,
  payments,
  paymentSummary,
  paymentListColumns,
  paymentsWithActions,
  showQuickPaymentDialog,
  paymentQuickOptionsMap,
  quickPaymentEyebrow,
  quickPaymentSuccessHandlers,
  formatCurrency,
  formatCount,
  openPaymentDetail,
  prepareQuickPaymentDialog,
} = runtime;
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>
