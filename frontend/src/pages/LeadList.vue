<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="formatCount(pagination.total)"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <button class="btn btn-primary btn-sm" type="button" @click="openQuickLeadDialog">{{ t("newLead") }}</button>
      <button class="btn btn-outline btn-sm" type="button" @click="focusLeadSearch">{{ t("focusFilters") }}</button>
      <button class="btn btn-outline btn-sm" :disabled="leadListResource.loading" @click="refreshLeadList">{{ t("refresh") }}</button>
      <button class="btn btn-outline btn-sm" :disabled="leadListResource.loading" @click="downloadLeadExport('xlsx')">{{ t("exportXlsx") }}</button>
      <button class="btn btn-outline btn-sm" :disabled="leadListResource.loading" @click="downloadLeadExport('pdf')">{{ t("exportPdf") }}</button>
    </template>

    <template #metrics>
      <div class="w-full grid grid-cols-1 gap-4 md:grid-cols-5">
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryTotal") }}</p>
          <p class="mini-metric-value">{{ formatCount(pagination.total) }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryOpen") }}</p>
          <p class="mini-metric-value text-brand-600">{{ formatCount(leadPageSummary.open) }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryFollowUp") }}</p>
          <p class="mini-metric-value text-amber-600">{{ formatCount(leadPageSummary.followUp) }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryActionable") }}</p>
          <p class="mini-metric-value text-blue-600">{{ formatCount(leadPageSummary.actionable) }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryConversion") }}</p>
          <p class="mini-metric-value text-green-600">{{ formatPercent(leadPageSummary.conversionRate) }}</p>
        </div>
      </div>
    </template>

    <SectionPanel :title="t('statusFiltersTitle')" :count="leadVisibleStatusOptions.length" panel-class="surface-card rounded-2xl p-3">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="option in leadVisibleStatusOptions"
          :key="option.value || 'all'"
          class="btn btn-sm"
          :class="filters.status === option.value ? 'btn-primary' : 'btn-outline'"
          type="button"
          @click="applyLeadStatusFilter(option.value)"
        >
          {{ option.label }}
          <span class="badge badge-gray">{{ formatCount(option.count) }}</span>
        </button>
      </div>
    </SectionPanel>

    <SectionPanel :title="t('filtersTitle')" :count="`${activeFilterCount} ${t('activeFilters')}`" panel-class="surface-card rounded-2xl p-4">
      <FilterBar
        v-model:search="filters.query"
        :filters="leadListFilterConfig"
        :active-count="activeFilterCount"
        @filter-change="onLeadListFilterChange"
        @reset="onLeadListFilterReset"
      >
        <template #actions>
          <button v-if="hasLeadActiveFilters" class="btn btn-outline btn-sm" @click="onLeadListFilterReset">{{ t("clearFilters") }}</button>
          <button class="btn btn-outline btn-sm" @click="focusLeadSearch">{{ t("searchAction") }}</button>
        </template>
      </FilterBar>
    </SectionPanel>

    <SectionPanel :title="t('leadTableTitle')" :count="formatCount(pagination.total)" panel-class="surface-card rounded-2xl p-5">
      <div v-if="loadErrorText" class="qc-error-banner mb-4">
        <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
        <p class="qc-error-banner__text mt-1">{{ loadErrorText }}</p>
      </div>
      <div v-else-if="actionErrorText" class="qc-error-banner mb-4">
        <p class="qc-error-banner__text">{{ actionErrorText }}</p>
      </div>
      <div v-else-if="actionSuccessText && !lastConvertedOfferName" class="qc-success-banner mb-4">
        <p class="qc-success-banner__text">{{ actionSuccessText }}</p>
      </div>
      <div v-if="lastConvertedOfferName" class="qc-success-banner mb-4 flex flex-wrap items-center gap-2">
        <p class="qc-success-banner__text">{{ t('convertLeadSuccess') }}</p>
        <ActionButton variant="link" size="xs" @click="openOfferDetail(lastConvertedOfferName)">{{ t('openOffer') }}</ActionButton>
      </div>

      <ListTable
        :columns="leadListColumns"
        :rows="leadListRows"
        :loading="isInitialLoading"
        :empty-message="t('emptyDescription')"
        @row-click="(row) => openLeadDetail(row.name)"
      />

      <div class="mt-4 flex items-center justify-between">
        <p class="text-xs text-gray-400">{{ leadListRows.length }} / {{ pagination.total }} {{ t("showingRecords") }}</p>
        <div class="flex items-center gap-1">
          <button class="btn btn-sm" :disabled="pagination.page <= 1 || leadListResource.loading" @click="previousPage">←</button>
          <span class="px-2 text-xs text-gray-600">{{ pagination.page }}</span>
          <button class="btn btn-sm" :disabled="!hasNextPage || leadListResource.loading" @click="nextPage">→</button>
        </div>
      </div>
    </SectionPanel>

    <Dialog
      v-model="showQuickLeadDialog"
      :options="{ title: quickLeadUi.title, size: 'xl' }"
    >
      <template #body-content>
        <QuickCreateDialogShell
          :error="quickLeadError"
          :eyebrow="quickLeadUi.eyebrow"
          :subtitle="quickLeadUi.subtitle"
          :labels="quickCreateCommon"
          :loading="quickLeadLoading"
          @cancel="cancelQuickLeadDialog"
          @save="submitQuickLead(false)"
          @save-and-open="submitQuickLead(true)"
        >
          <QuickCustomerPicker
            :model="quickLeadForm"
            :field-errors="quickLeadFieldErrors"
            :disabled="quickLeadLoading"
            :locale="activeLocale"
            :office-branch="branchStore.requestBranch || ''"
            :customer-label="{ tr: 'Müşteri / Ad Soyad', en: 'Customer / Full Name' }"
          />
          <QuickCreateFormRenderer
            :fields="leadQuickFormFields"
            :model="quickLeadForm"
            :field-errors="quickLeadFieldErrors"
            :disabled="quickLeadLoading"
            :locale="activeLocale"
            :options-map="leadQuickOptionsMap"
            @submit="submitQuickLead(false)"
            @request-related-create="onLeadRelatedCreateRequested"
          />
        </QuickCreateDialogShell>
      </template>
    </Dialog>
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Dialog, createResource } from "frappe-ui";

import { useAuthStore } from "../stores/auth";
import ActionButton from "../components/app-shell/ActionButton.vue";
import { useLeadListRuntime } from "../composables/useLeadListRuntime";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import MiniFactList from "../components/app-shell/MiniFactList.vue";
import QuickCustomerPicker from "../components/app-shell/QuickCustomerPicker.vue";
import QuickCreateDialogShell from "../components/app-shell/QuickCreateDialogShell.vue";
import QuickCreateFormRenderer from "../components/app-shell/QuickCreateFormRenderer.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import ListTable from "../components/ui/ListTable.vue";
import FilterBar from "../components/ui/FilterBar.vue";
import { buildQuickCreateDraft, getQuickCreateConfig, getLocalizedText } from "../config/quickCreateRegistry";
import { getQuickCreateEyebrow, getQuickCreateLabels } from "../utils/quickCreateCopy";
import { runQuickCreateSuccessTargets } from "../utils/quickCreateSuccess";
import { mutedFact, subtleFact } from "../utils/factItems";
import { openListExport } from "../utils/listExport";
import { buildQuickCreateIntentQuery, readQuickCreateIntent, stripQuickCreateIntentQuery } from "../utils/quickRouteIntent";
import { buildRelatedQuickCreateNavigation } from "../utils/relatedQuickCreate";
import { isValidTckn, normalizeCustomerType, normalizeIdentityNumber } from "../utils/customerIdentity";
import {
  extractCustomFilterPresetId,
  isCustomFilterPresetValue,
  makeCustomFilterPresetValue,
  readFilterPresetKey,
  readFilterPresetList,
  writeFilterPresetKey,
  writeFilterPresetList,
} from "../utils/filterPresetState";

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





