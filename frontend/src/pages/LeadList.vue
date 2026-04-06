<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="formatCount(pagination.total)"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <LeadListActionBar
        :lead-list-loading="leadListResource.loading"
        :t="t"
        @new-lead="openQuickLeadDialog"
        @focus-search="focusLeadSearch"
        @refresh="refreshLeadList"
        @download-xlsx="downloadLeadExport('xlsx')"
        @download-pdf="downloadLeadExport('pdf')"
      />
    </template>

    <template #metrics>
      <LeadListMetricsPanel
        :pagination="pagination"
        :lead-page-summary="leadPageSummary"
        :format-count="formatCount"
        :format-percent="formatPercent"
        :t="t"
      />
    </template>

    <LeadListStatusChips
      :lead-visible-status-options="leadVisibleStatusOptions"
      :status-value="filters.status"
      :format-count="formatCount"
      :t="t"
      @apply-status="applyLeadStatusFilter"
    />

    <LeadListFilterSection
      v-model:search="filters.query"
      :lead-list-filter-config="leadListFilterConfig"
      :active-filter-count="activeFilterCount"
      :has-lead-active-filters="hasLeadActiveFilters"
      :t="t"
      @filter-change="onLeadListFilterChange"
      @reset="onLeadListFilterReset"
      @focus-search="focusLeadSearch"
    />

    <LeadListTableSection
      :lead-list-columns="leadListColumns"
      :lead-list-rows="leadListRows"
      :locale="activeLocale"
      :pagination="pagination"
      :is-initial-loading="isInitialLoading"
      :lead-list-loading="leadListResource.loading"
      :has-next-page="hasNextPage"
      :load-error-text="loadErrorText"
      :action-error-text="actionErrorText"
      :action-success-text="actionSuccessText"
      :last-converted-offer-name="lastConvertedOfferName"
      :format-count="formatCount"
      :t="t"
      @row-click="(row) => openLeadDetail(row.name)"
      @previous="previousPage"
      @next="nextPage"
      @open-offer="openOfferDetail"
    />

    <LeadListQuickLeadDialog
      v-model:show-quick-lead-dialog="showQuickLeadDialog"
      :quick-lead-ui="quickLeadUi"
      :quick-lead-error="quickLeadError"
      :quick-create-common="quickCreateCommon"
      :quick-lead-loading="quickLeadLoading"
      :quick-lead-form="quickLeadForm"
      :quick-lead-field-errors="quickLeadFieldErrors"
      :active-locale="activeLocale"
      :office-branch="branchStore.requestBranch || ''"
      :lead-quick-form-fields="leadQuickFormFields"
      :lead-quick-options-map="leadQuickOptionsMap"
      @cancel="cancelQuickLeadDialog"
      @save="submitQuickLead"
      @request-related-create="onLeadRelatedCreateRequested"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";

import { useAuthStore } from "../stores/auth";
import { useLeadListRuntime } from "../composables/useLeadListRuntime";
import LeadListActionBar from "../components/lead-list/LeadListActionBar.vue";
import LeadListFilterSection from "../components/lead-list/LeadListFilterSection.vue";
import LeadListMetricsPanel from "../components/lead-list/LeadListMetricsPanel.vue";
import LeadListQuickLeadDialog from "../components/lead-list/LeadListQuickLeadDialog.vue";
import LeadListStatusChips from "../components/lead-list/LeadListStatusChips.vue";
import LeadListTableSection from "../components/lead-list/LeadListTableSection.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import { getAppPinia } from "../pinia";

const copy = {
  tr: {
    breadcrumb: "Sigorta Operasyonları → Fırsatlar",
    recordCount: "kayıt",
    title: "Fırsat Yönetimi",
    subtitle: "Fırsat çalışma ekranı: filtre, şablon ve dönüşüm takibi",
    newLead: "+ Yeni Fırsat",
    focusFilters: "Filtrele",
    filtersTitle: "Filtreler",
    statusFiltersTitle: "Durum Kısayolları",
    leadTableTitle: "Fırsat Listesi",
    summaryTotal: "Toplam Fırsat",
    summaryOpen: "Bu Sayfa Açık",
    summaryFollowUp: "Takip Bekleyen",
    summaryActionable: "Teklife Çevrilebilir",
    summaryConversion: "Bu Sayfa Dönüşüm",
    refresh: "Yenile",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    searchAction: "Ara",
    searchPlaceholder: "Fırsat / e-posta / müşteri / kayıt ara",
    allStatuses: "Tüm Durumlar",
    allConversionStates: "Tüm Dönüşüm Durumları",
    allStaleStates: "Tüm Takip Durumları",
    advancedFilters: "Gelişmiş Filtreler",
    hideAdvancedFilters: "Gelişmiş Filtreleri Gizle",
    activeFilters: "aktif filtre",
    presetLabel: "Filtre Şablonu",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    savePresetPrompt: "Filtre şablonu adı",
    deletePresetConfirm: "Seçili özel filtre şablonu silinsin mi?",
    applyFilters: "Uygula",
    clearFilters: "Filtreleri Temizle",
    branchFilter: "Branş (içerir)",
    salesEntityFilter: "Satış birimi (içerir)",
    companyFilter: "Sigorta şirketi (içerir)",
    estimatedMinFilter: "Min Tahmini Brüt Prim",
    estimatedMaxFilter: "Max Tahmini Brüt Prim",
    hasCustomerOnly: "Sadece müşterisi olanlar",
    canConvertOnly: "Sadece teklife cevrilebilir",
    loading: "Yükleniyor...",
    loadErrorTitle: "Liste Yüklenemedi",
    loadError: "Fırsat listesi yüklenirken hata oluştu. Lütfen tekrar deneyin.",
    emptyTitle: "Fırsat Bulunamadı",
    emptyDescription: "Filtrelere uygun fırsat kaydı bulunamadı.",
    showingRecords: "kayıt gösteriliyor",
    showing: "Gösterilen",
    page: "Sayfa",
    previous: "Önceki",
    next: "Sonraki",
    colLead: "Fırsat",
    colDetails: "Detaylar",
    colStatus: "Durum",
    colConversion: "Dönüşüm",
    colActions: "Aksiyon",
    openDesk: "Yönetim Ekranını Aç",
    openCustomer360: "Müşteri Detayını Aç",
    openPolicy: "Poliçeyi Aç",
    openOffer: "Teklif",
    convertToOffer: "Teklife Çevir",
    converting: "Çevriliyor...",
    convertLeadSuccess: "Fırsat teklife dönüştürüldü.",
    convertLeadError: "Fırsat teklife dönüştürülemedi. Eksik alanları kontrol edin.",
    presetDefault: "Standart",
    presetOpen: "Açık Fırsatlar",
    presetHighPotential: "Yüksek Potansiyel",
    presetUnconverted: "Dönüşmeyenler",
    presetConvertedPolicy: "Poliçeye Dönüşenler",
    presetFollowUpQueue: "Takip Kuyruğu",
    presetWaitingLeads: "Bekleyen Fırsatlar",
    presetConvertible: "Teklife Çevrilebilir",
    record: "Kayıt",
    modified: "Güncellendi",
    email: "E-posta",
    customer: "Müşteri",
    salesEntity: "Satış Birimi",
    company: "Sigorta Şirketi",
    branch: "Branş",
    estimatedGross: "Tahmini Brüt",
    convertedOffer: "Dönüşen Teklif",
    convertedPolicy: "Dönüşen Poliçe",
    noConversion: "Henüz dönüşüm yok",
    nextAction: "Sonraki Aksiyon",
    missingFields: "Eksik Alanlar",
    conversionActionConvert: "Teklife Çevir",
    conversionActionReview: "Bilgileri Tamamla",
    conversionActionClosed: "Kapalı Fırsat",
    sortModifiedDesc: "Son Güncellenen",
    sortNameAsc: "Ada Göre (A-Z)",
    sortNameDesc: "Ada Göre (Z-A)",
    sortEstimatedDesc: "Tahmini Brüt (Yüksek)",
    sortEstimatedAsc: "Tahmini Brüt (Düşük)",
    sortStalePriority: "Takip Önceliği",
    sortActionableFirst: "Aksiyon Bekleyen İlk",
    sortConversionPriority: "Dönüşüm Durumu (Öncelik)",
    conversionStateUnconverted: "Dönüşmeyenler",
    conversionStateAnyConverted: "Dönüşenler",
    conversionStateOffer: "Teklife Dönüşen",
    conversionStatePolicy: "Poliçeye Dönüşen",
    staleStateFresh: "Güncel",
    staleStateFollowUp: "Takip Et",
    staleStateStale: "Bekliyor",
    statusDraft: "Taslak",
    statusOpen: "Açık",
    statusReplied: "Görüşüldü",
    statusClosed: "Kapandı",
    validationTaxNumberLength: "Vergi numarası 10 haneli olmalıdır.",
    validationTcLength: "TC kimlik numarası 11 haneli olmalıdır.",
    validationTcInvalid: "Geçerli bir TC kimlik numarası girin.",
  },
  en: {
    breadcrumb: "Insurance Operations → Leads",
    recordCount: "records",
    title: "Lead Workbench",
    subtitle: "Lead workspace with filters, presets, and conversion tracking",
    newLead: "+ New Lead",
    focusFilters: "Focus Filters",
    filtersTitle: "Filters",
    statusFiltersTitle: "Status Shortcuts",
    leadTableTitle: "Lead List",
    summaryTotal: "Total Leads",
    summaryOpen: "Open On Page",
    summaryFollowUp: "Need Follow-up",
    summaryActionable: "Convertible",
    summaryConversion: "Page Conversion",
    refresh: "Refresh",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    searchAction: "Search",
    searchPlaceholder: "Search lead / email / customer / record",
    allStatuses: "All Statuses",
    allConversionStates: "All Conversion States",
    allStaleStates: "All Follow-up States",
    advancedFilters: "Advanced Filters",
    hideAdvancedFilters: "Hide Advanced Filters",
    activeFilters: "active filters",
    presetLabel: "Filter Preset",
    savePreset: "Save",
    deletePreset: "Delete",
    savePresetPrompt: "Filter preset name",
    deletePresetConfirm: "Delete selected custom filter preset?",
    applyFilters: "Apply",
    clearFilters: "Clear Filters",
    branchFilter: "Branch (contains)",
    salesEntityFilter: "Sales entity (contains)",
    companyFilter: "Insurance company (contains)",
    estimatedMinFilter: "Min Estimated Gross",
    estimatedMaxFilter: "Max Estimated Gross",
    hasCustomerOnly: "Only with customer",
    canConvertOnly: "Only convertible to offer",
    loading: "Loading...",
    loadErrorTitle: "Failed to Load List",
    loadError: "An error occurred while loading leads. Please try again.",
    emptyTitle: "No Leads Found",
    emptyDescription: "No lead records found for current filters.",
    showingRecords: "records shown",
    showing: "Showing",
    page: "Page",
    previous: "Previous",
    next: "Next",
    colLead: "Lead",
    colDetails: "Details",
    colStatus: "Status",
    colConversion: "Conversion",
    colActions: "Actions",
    openDesk: "Open Desk",
    openCustomer360: "Open Customer Details",
    openPolicy: "Open Policy",
    openOffer: "Offer",
    convertToOffer: "Convert to Offer",
    converting: "Converting...",
    convertLeadSuccess: "Lead converted to offer.",
    convertLeadError: "Failed to convert lead to offer. Check required fields.",
    presetDefault: "Standard",
    presetOpen: "Open Leads",
    presetHighPotential: "High Potential",
    presetUnconverted: "Not Converted",
    presetConvertedPolicy: "Converted to Policy",
    presetFollowUpQueue: "Follow-up Queue",
    presetWaitingLeads: "Waiting Leads",
    presetConvertible: "Convertible to Offer",
    record: "Record",
    modified: "Modified",
    email: "Email",
    customer: "Customer",
    salesEntity: "Sales Entity",
    company: "Insurance Company",
    branch: "Branch",
    estimatedGross: "Est. Gross",
    convertedOffer: "Converted Offer",
    convertedPolicy: "Converted Policy",
    noConversion: "No conversion yet",
    nextAction: "Next Action",
    missingFields: "Missing Fields",
    conversionActionConvert: "Convert to Offer",
    conversionActionReview: "Complete Fields",
    conversionActionClosed: "Closed Lead",
    sortModifiedDesc: "Last Modified",
    sortNameAsc: "Name (A-Z)",
    sortNameDesc: "Name (Z-A)",
    sortEstimatedDesc: "Estimated Gross (High)",
    sortEstimatedAsc: "Estimated Gross (Low)",
    sortStalePriority: "Follow-up Priority",
    sortActionableFirst: "Actionable First",
    sortConversionPriority: "Conversion State (Priority)",
    conversionStateUnconverted: "Not Converted",
    conversionStateAnyConverted: "Any Converted",
    conversionStateOffer: "Converted to Offer",
    conversionStatePolicy: "Converted to Policy",
    staleStateFresh: "Fresh",
    staleStateFollowUp: "Follow Up",
    staleStateStale: "Waiting",
    statusDraft: "Draft",
    statusOpen: "Open",
    statusReplied: "Replied",
    statusClosed: "Closed",
    validationTaxNumberLength: "Tax number must be 10 digits.",
    validationTcLength: "National ID number must be 11 digits.",
    validationTcInvalid: "Enter a valid Turkish national ID number.",
  },
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}


const authStore = useAuthStore();
const activeLocale = computed(() => unref(authStore.locale) || "en");

const leadListRuntime = useLeadListRuntime({ t, activeLocale });
const {
  branchStore,
  filters,
  pagination,
  leadStatusOptions,
  conversionStateOptions,
  staleStateOptions,
  sortOptions,
  presetKey,
  presetOptions,
  canDeletePreset,
  activeFilterCount,
  hasLeadActiveFilters,
  totalPages,
  hasNextPage,
  startRow,
  endRow,
  leadStatusCountMap,
  leadVisibleStatusOptions,
  leadPageSummary,
  leadListFilterConfig,
  leadListRows,
  leadListColumns,
  rows,
  loadErrorText,
  actionSuccessText,
  actionErrorText,
  convertingLeadName,
  lastConvertedOfferName,
  quickLeadConfig,
  showQuickLeadDialog,
  quickLeadLoading,
  quickLeadError,
  quickLeadFieldErrors,
  quickLeadForm,
  leadQuickFormFields,
  leadQuickOptionsMap,
  quickLeadUi,
  quickCreateCommon,
  isInitialLoading,
  leadListResource,
  leadConvertResource,
  applyLeadStatusFilter,
  onLeadListFilterChange,
  onLeadListFilterReset,
  formatCount,
  formatPercent,
  focusLeadSearch,
  refreshLeadList,
  downloadLeadExport,
  clearActionFeedback,
  scheduleActionFeedbackClear,
  applyFilters,
  previousPage,
  nextPage,
  currentPresetPayload,
  applyPreset,
  onPresetChange,
  resetFilters,
  hasMeaningfulPresetState,
  persistPresetStateToServer,
  hydratePresetStateFromServer,
  savePreset,
  deletePreset,
  clearQuickLeadFieldErrors,
  resetQuickLeadForm,
  openQuickLeadDialog,
  cancelQuickLeadDialog,
  validateQuickLeadForm,
  buildQuickLeadPayload,
  submitQuickLead,
  applyQuickLeadPrefills,
  buildLeadQuickReturnTo,
  onLeadRelatedCreateRequested,
  consumeQuickLeadRouteIntent,
  openLeadDetail,
  openOfferDetail,
  openCustomer360,
  openPolicyDetail,
  canConvertLead,
  convertLeadToOffer,
  parseActionError,
} = leadListRuntime;
</script>

<style scoped>
.input { @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm; }
</style>





