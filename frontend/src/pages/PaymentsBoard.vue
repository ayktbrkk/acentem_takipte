<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="formatCount(payments.length)"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <PaymentsBoardActionBar
        :loading="paymentsLoading"
        :t="t"
        @launch="showQuickPaymentDialog = true"
        @refresh="reloadPayments"
        @export-xlsx="downloadPaymentExport('xlsx')"
        @export-pdf="downloadPaymentExport('pdf')"
      />
    </template>

    <template #metrics>
      <PaymentsBoardMetricsPanel
        :payment-summary="paymentSummary"
        :format-count="formatCount"
        :format-currency="formatCurrency"
        :t="t"
      />
    </template>

    <PaymentsBoardFilterSection
      v-model="presetKey"
      :filters="filters"
      :payment-sort-options="paymentSortOptions"
      :preset-options="presetOptions"
      :can-delete-preset="canDeletePreset"
      :active-count="activeFilterCount"
      :t="t"
      @preset-change="onPresetChange"
      @preset-save="savePreset"
      @preset-delete="deletePreset"
      @apply="applyPaymentFilters"
      @reset="resetPaymentFilters"
    />

    <article v-if="paymentsErrorText" class="qc-error-banner">
      <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
      <p class="qc-error-banner__text mt-1">{{ paymentsErrorText }}</p>
    </article>

    <PaymentsBoardTableSection
      :payments="payments"
      :payment-list-columns="paymentListColumns"
      :payments-with-actions="paymentsWithActions"
      :loading="paymentsLoading"
      :error-text="paymentsErrorText"
      :t="t"
      @row-click="openPaymentDetail"
    />

    <PaymentsBoardQuickPaymentDialog
      v-model="showQuickPaymentDialog"
      :locale="activeLocale"
      :options-map="paymentQuickOptionsMap"
      :eyebrow="quickPaymentEyebrow"
      :before-open="prepareQuickPaymentDialog"
      :success-handlers="quickPaymentSuccessHandlers"
    />
  </WorkbenchPageLayout>
</template>
<script setup>
import { useRoute, useRouter } from "vue-router";

import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { usePaymentStore } from "../stores/payment";
import { usePaymentsBoardRuntime } from "../composables/usePaymentsBoardRuntime";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import PaymentsBoardActionBar from "../components/payments-board/PaymentsBoardActionBar.vue";
import PaymentsBoardFilterSection from "../components/payments-board/PaymentsBoardFilterSection.vue";
import PaymentsBoardMetricsPanel from "../components/payments-board/PaymentsBoardMetricsPanel.vue";
import PaymentsBoardQuickPaymentDialog from "../components/payments-board/PaymentsBoardQuickPaymentDialog.vue";
import PaymentsBoardTableSection from "../components/payments-board/PaymentsBoardTableSection.vue";

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
    customerFullName: "Müşteri Ad Soyad",
    customerType: "Müşteri Türü",
    taxIdLabel: "TC/VNO",
    birthDate: "Doğum Tarihi",
    policy: "Poliçe",
    insuranceCompany: "Sigorta Şirketi",
    carrierPolicyNo: "Sigorta Şirketi Poliçe No",
    branch: "Branş",
    dueDate: "Vade Tarihi",
    status: "Durum",
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
    customerFullName: "Customer Full Name",
    customerType: "Customer Type",
    taxIdLabel: "National ID / Tax ID",
    birthDate: "Birth Date",
    policy: "Policy",
    insuranceCompany: "Insurance Company",
    carrierPolicyNo: "Carrier Policy No",
    branch: "Line of Business",
    dueDate: "Due Date",
    status: "Status",
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
