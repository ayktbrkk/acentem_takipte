<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="formatCount(isListView ? offerListTotal : offers.length)"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <OfferBoardToolbar
        :is-list-view="isListView"
        :labels="{
          viewList: t('viewList'),
          viewBoard: t('viewBoard'),
          newOffer: t('newOffer'),
          refresh: t('refresh'),
          focusFilters: t('focusFilters'),
          exportXlsx: t('exportXlsx'),
        }"
        :loading="offersResource.loading || offerListResource.loading"
        @view-list="setOfferViewMode('list')"
        @view-board="setOfferViewMode('board')"
        @new-offer="openQuickOfferDialog"
        @refresh="refreshOffers"
        @focus-filters="focusOfferSearch"
        @export-xlsx="downloadOfferExport('xlsx')"
      />
    </template>

    <template #metrics>
      <OfferBoardSummaryMetrics
        v-if="isListView"
        :summary="offerSummary"
        :conversion-rate="offerConversionRate"
        :labels="{
          total: t('summaryTotal'),
          draft: t('summaryDraft'),
          sent: t('summarySent'),
          accepted: t('summaryAccepted'),
          conversion: t('summaryConversion'),
        }"
        :format-count="formatCount"
      />
    </template>

    <OfferBoardFilterSection
      v-if="isListView"
      v-model:search="offerListSearchQuery"
      :title="t('filtersTitle')"
      :count="`${offerListFilterBarActiveCount} ${t('activeFilters')}`"
      :filters="offerListFilterConfig"
      :active-count="offerListFilterBarActiveCount"
      @filter-change="onOfferListFilterBarChange"
      @reset="onOfferListFilterBarReset"
    >
      <template #actions>
        <button class="btn btn-sm" @click="setOfferViewMode('list')">{{ t("viewList") }}</button>
        <button class="btn btn-sm" @click="setOfferViewMode('board')">{{ t("viewBoard") }}</button>
        <button class="btn btn-sm" :disabled="offersResource.loading || offerListResource.loading" @click="refreshOffers">{{ t("refresh") }}</button>
        <button v-if="offerListFilterBarActiveCount > 0" class="btn btn-outline btn-sm" @click="onOfferListFilterBarReset">{{ t("clearFilters") }}</button>
      </template>
    </OfferBoardFilterSection>

    <OfferBoardListSection
      v-if="isListView"
      :title="t('offerTableTitle')"
      :count="formatCount(offerListTotal)"
      :columns="offerListColumns"
      :rows="offerListRowsWithUrgency"
      :locale="activeLocale"
      :loading="isOfferListInitialLoading"
      :empty-message="t('empty')"
      :row-count="pagedOfferRows.length"
      :total="offerListTotal"
      :showing-label="t('showingRecords')"
      :page="offerListPagination.page"
      :has-next-page="offerListHasNextPage"
      @row-click="(row) => openOfferDetail(row.name)"
      @previous-page="previousOfferPage"
      @next-page="nextOfferPage"
    />

    <OfferBoardPipelineSection
      v-if="!isListView"
      :title="t('pipelineTitle')"
      :count="formatCount(offers.length)"
      :lanes="lanes"
      :loading="offersResource.loading"
      :error-text="offersLoadErrorText"
      :empty="offers.length === 0"
      :empty-title="t('emptyTitle')"
      :empty-description="t('empty')"
      :loading-label="t('loading')"
      :load-error-title="t('loadErrorTitle')"
      :stage-label="t('stage')"
      :empty-lane-label="t('emptyLane')"
      :convert-label="t('convert')"
      :open-policy-label="t('openPolicy')"
      :rows-for-lane="laneRows"
      :row-count-for-lane="(laneKey) => laneRows(laneKey).length"
      :offer-card-facts="offerCardFacts"
      :is-convertible="isConvertible"
      @lane-drop="onLaneDrop"
      @drag-start="onCardDragStart"
      @drag-end="onCardDragEnd"
      @open-offer="openOfferDetail"
      @convert-offer="openConvertDialog"
      @open-policy="openPolicyDetail"
    />

    <QuickCreateOffer
      v-model="showQuickOfferDialog"
      :locale="activeLocale"
      :title-override="t('quickOfferTitle')"
      :subtitle-override="offerQuickUi.subtitle"
      :labels="{ cancel: t('cancel'), save: t('createQuickOffer'), saveAndOpen: t('createQuickOfferAndOpen') }"
      :options-map="offerQuickOptionsMap"
      :return-to="quickOfferOpenedFromIntent ? quickOfferReturnTo : ''"
      :validate="validateQuickOfferManaged"
      :build-payload="buildQuickOfferManagedPayload"
      :success-handlers="quickOfferSuccessHandlers"
      @cancel="cancelQuickOfferDialog"
      @created="onQuickOfferManagedCreated"
    />

    <OfferBoardConvertDialog
      v-model="showConvertDialog"
      :title="t('convertDialogTitle')"
      :eyebrow="convertDialogEyebrow"
      :error="convertError"
      :selected-offer-name="selectedOffer?.name || '-'"
      :selected-label="t('selectedOffer')"
      :loading="convertLoading"
      :has-selected-offer="Boolean(selectedOffer)"
      :model="convertForm"
      :cancel-label="t('cancel')"
      :confirm-label="t('createPolicy')"
      :net-premium-label="t('netPremium')"
      :tax-amount-label="t('taxAmount')"
      :commission-amount-label="t('commissionAmount')"
      :policy-no-label="t('policyNo')"
      @confirm="convertOffer"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, reactive, ref, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Dialog, createResource } from "frappe-ui";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import StatusBadge from "../components/ui/StatusBadge.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import QuickCreateDialogShell from "../components/app-shell/QuickCreateDialogShell.vue";
import QuickCreateFormRenderer from "../components/app-shell/QuickCreateFormRenderer.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import QuickCreateOffer from "../components/QuickCreateOffer.vue";
import { buildQuickCreateDraft, getQuickCreateConfig, getLocalizedText } from "../config/quickCreate";
import { mutedFact, subtleFact } from "../utils/factItems";
import { useOfferBoardState } from "../composables/offerBoard/state";
import { useOfferBoardFilters } from "../composables/offerBoard/filters";
import { useOfferBoardQuickOffer } from "../composables/offerBoard/quickOffer";
import { useOfferBoardConversion } from "../composables/offerBoard/conversion";
import OfferBoardToolbar from "../components/offer-board/OfferBoardToolbar.vue";
import OfferBoardSummaryMetrics from "../components/offer-board/OfferBoardSummaryMetrics.vue";
import OfferBoardFilterSection from "../components/offer-board/OfferBoardFilterSection.vue";
import OfferBoardListSection from "../components/offer-board/OfferBoardListSection.vue";
import OfferBoardPipelineSection from "../components/offer-board/OfferBoardPipelineSection.vue";
import OfferBoardConvertDialog from "../components/offer-board/OfferBoardConvertDialog.vue";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const branchStore = useBranchStore();

function buildOfficeBranchLookupFilters() {
  const officeBranch = branchStore.requestBranch || "";
  return officeBranch ? { office_branch: officeBranch } : {};
}

const copy = {
  tr: {
    breadcrumb: "Sigorta Operasyonları → Teklifler",
    recordCount: "kayıt",
    title: "Teklif Panosu",
    subtitle: "Tekliflerinizi kanban görünümünde yönetin",
    focusFilters: "Filtrele",
    filtersTitle: "Filtreler",
    offerTableTitle: "Teklif Listesi",
    pipelineTitle: "Teklif Panosu",
    summaryTotal: "Toplam Teklif",
    summaryDraft: "Taslak",
    summarySent: "Gönderildi",
    summaryAccepted: "Kabul Edildi",
    summaryConversion: "Dönüşüm Oranı",
    viewList: "Liste",
    viewBoard: "Pano",
    newOffer: "Yeni Teklif",
    quickOfferTitle: "Hızlı Teklif Oluştur",
    customerField: "Müşteri",
    customerPlaceholder: "Müşteri ara veya yaz",
    createCustomerCta: "+ Yeni Müşteri Oluştur",
    noCustomersFound: "Müşteri bulunamadı. Yeni müşteri olarak oluşturabilirsiniz.",
    selectedCustomer: "Seçili Müşteri",
    clearSelection: "Temizle",
    branchField: "Sigorta Branşı",
    branchPlaceholder: "Branş seçin (opsiyonel)",
    notesField: "Notlar",
    createQuickOffer: "Teklifi Oluştur",
    createQuickOfferAndOpen: "Kaydet ve Aç",
    quickCreateValidationFailed: "Lütfen gerekli alanları kontrol edin.",
    refresh: "Yenile",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    searchPlaceholder: "Teklif / Müşteri / Kayıt ara",
    allCompanies: "Tüm Sigorta Şirketleri",
    allBranches: "Tüm Branşlar",
    allStatuses: "Tüm Durumlar",
    validUntilFilter: "Geçerlilik Tarihi",
    advancedFilters: "Gelişmiş Filtreler",
    hideAdvancedFilters: "Gelişmiş Filtreleri Gizle",
    activeFilters: "aktif filtre",
    presetLabel: "Filtre Şablonu",
    presetDefault: "Standart",
    presetActionable: "Aksiyon Bekleyenler",
    presetConverted: "Poliçeye Dönüşenler",
    presetExpiring7: "7 Gün İçerisinde Geçerlilik",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    savePresetPrompt: "Filtre şablonu adı",
    deletePresetConfirm: "Seçili özel filtre şablonu silinsin mi?",
    applyFilters: "Uygula",
    clearFilters: "Filtreleri Temizle",
    grossMinFilter: "Min Brüt Prim",
    grossMaxFilter: "Max Brüt Prim",
    actionableOnly: "Sadece Aksiyon Bekleyen",
    showingRecords: "kayıt gösteriliyor",
    showing: "Gösterilen",
    page: "Sayfa",
    previous: "Önceki",
    next: "Sonraki",
    colOffer: "Teklif",
    colDetails: "Detaylar",
    colStatus: "Durum",
    colPremiums: "Primler",
    colActions: "Aksiyon",
    offerDate: "Teklif Tarihi",
    validUntil: "Geçerlilik",
    grossPremium: "Brüt Prim",
    netPremiumShort: "Net Prim",
    commissionShort: "Komisyon",
    recordId: "Kayıt",
    openDesk: "Yönetim Ekranını Aç",
    sortModifiedDesc: "Son Güncellenen",
    sortValidUntilAsc: "Geçerlilik (Yakın)",
    sortValidUntilDesc: "Geçerlilik (Uzak)",
    sortGrossDesc: "Brüt Prim (Yüksek)",
    stage: "Aşama",
    loading: "Yükleniyor...",
    loadErrorTitle: "Teklifler Yüklenemedi",
    loadError: "Teklif panosu verileri yüklenirken bir hata oluştu. Lütfen tekrar deneyin.",
    emptyTitle: "Teklif Bulunamadı",
    empty: "Teklif kaydı bulunamadı.",
    emptyLane: "Bu asamada teklif yok.",
    customerName: "Müşteri Adı",
    premiumAmount: "Prim Tutarı",
    company: "Sigorta Şirketi",
    draftLane: "Taslak",
    sentLane: "Müşteriye Gönderildi",
    acceptedLane: "Kabul Edildi",
    convertedLane: "Poliçeye Dönüştü",
    convert: "Poliçeye Çevir",
    openPolicy: "Poliçeyi Aç",
    convertDialogTitle: "Teklif -> Poliçe",
    selectedOffer: "Seçili Teklif",
    netPremium: "Net Prim",
    taxAmount: "Vergi Tutarı",
    commissionAmount: "Komisyon Tutarı",
    policyNo: "Sigorta Şirketi Poliçe No (Opsiyonel)",
    cancel: "İptal",
    createPolicy: "Poliçe Oluştur",
    statusDraft: "Taslak",
    statusSent: "Gönderildi",
    statusAccepted: "Kabul Edildi",
    statusConverted: "Dönüştü",
    statusRejected: "Reddedildi",
    customerSearchFailed: "Müşteri araması başarısız oldu.",
    quickOfferCreateFailed: "Hızlı teklif oluşturma işlemi başarısız oldu.",
    statusUpdateFailed: "Teklif durumu güncellenemedi.",
    conversionFailed: "Teklif poliçeye dönüştürülemedi.",
  },
  en: {
    breadcrumb: "Insurance Operations → Offers",
    recordCount: "records",
    title: "Offer Board",
    subtitle: "Manage your offers in a Kanban view",
    focusFilters: "Focus Filters",
    filtersTitle: "Filters",
    offerTableTitle: "Offer List",
    pipelineTitle: "Offer Pipeline",
    summaryTotal: "Total Offers",
    summaryDraft: "Draft",
    summarySent: "Sent",
    summaryAccepted: "Accepted",
    summaryConversion: "Conversion Rate",
    viewList: "List",
    viewBoard: "Board",
    newOffer: "New Offer",
    quickOfferTitle: "Create Quick Offer",
    customerField: "Customer",
    customerPlaceholder: "Search or type customer",
    createCustomerCta: "+ Create New Customer",
    noCustomersFound: "No matching customer found. You can create a new one.",
    selectedCustomer: "Selected Customer",
    clearSelection: "Clear",
    branchField: "Insurance Branch",
    branchPlaceholder: "Select branch (optional)",
    notesField: "Notes",
    createQuickOffer: "Create Offer",
    createQuickOfferAndOpen: "Save & Open",
    quickCreateValidationFailed: "Please check required fields.",
    refresh: "Refresh",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    searchPlaceholder: "Search offer / customer / record",
    allCompanies: "All Insurance Companies",
    allBranches: "All Branches",
    allStatuses: "All Statuses",
    validUntilFilter: "Valid Until",
    advancedFilters: "Advanced Filters",
    hideAdvancedFilters: "Hide Advanced Filters",
    activeFilters: "active filters",
    presetLabel: "Filter Preset",
    presetDefault: "Standard",
    presetActionable: "Action Waiting",
    presetConverted: "Converted to Policy",
    presetExpiring7: "Valid in 7 Days",
    savePreset: "Save",
    deletePreset: "Delete",
    savePresetPrompt: "Filter preset name",
    deletePresetConfirm: "Delete selected custom filter preset?",
    applyFilters: "Apply",
    clearFilters: "Clear Filters",
    grossMinFilter: "Min Gross Premium",
    grossMaxFilter: "Max Gross Premium",
    actionableOnly: "Action Waiting Only",
    showingRecords: "records shown",
    showing: "Showing",
    page: "Page",
    previous: "Previous",
    next: "Next",
    colOffer: "Offer",
    colDetails: "Details",
    colStatus: "Status",
    colPremiums: "Premiums",
    colActions: "Actions",
    offerDate: "Offer Date",
    validUntil: "Valid Until",
    grossPremium: "Gross Premium",
    netPremiumShort: "Net Premium",
    commissionShort: "Commission",
    recordId: "Record",
    openDesk: "Open Desk",
    sortModifiedDesc: "Last Modified",
    sortValidUntilAsc: "Valid Until (Soonest)",
    sortValidUntilDesc: "Valid Until (Latest)",
    sortGrossDesc: "Gross Premium (High)",
    stage: "Stage",
    loading: "Loading...",
    loadErrorTitle: "Failed to Load Offers",
    loadError: "An error occurred while loading offer board data. Please try again.",
    emptyTitle: "No Offers Found",
    empty: "No offer records found.",
    emptyLane: "No offers in this stage.",
    customerName: "Customer Name",
    premiumAmount: "Premium Amount",
    company: "Insurance Company",
    draftLane: "Draft",
    sentLane: "Sent to Customer",
    acceptedLane: "Accepted",
    convertedLane: "Converted to Policy",
    convert: "Convert to Policy",
    openPolicy: "Open Policy",
    convertDialogTitle: "Offer -> Policy",
    selectedOffer: "Selected offer",
    netPremium: "Net Premium",
    taxAmount: "Tax Amount",
    commissionAmount: "Commission Amount",
    policyNo: "Carrier Policy Number (Optional)",
    cancel: "Cancel",
    createPolicy: "Create Policy",
    statusDraft: "Draft",
    statusSent: "Sent",
    statusAccepted: "Accepted",
    statusConverted: "Converted",
    statusRejected: "Rejected",
    customerSearchFailed: "Customer search failed.",
    quickOfferCreateFailed: "Quick offer creation failed.",
    statusUpdateFailed: "Status update failed.",
    conversionFailed: "Conversion failed.",
  },
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

function resolveFieldValue(source, field) {
  if (typeof source === "function") {
    return source({
      field,
      model: quickOffer,
      locale: activeLocale.value,
      text: (value) => getLocalizedText(value, activeLocale.value),
    });
  }
  return source;
}

function isFieldRequired(field) {
  return Boolean(resolveFieldValue(field?.required, field));
}
const activeLocale = computed(() => unref(authStore.locale) || "en");
const QUICK_OPTION_LIMIT = 2000;

const offersResource = createResource({
  url: "frappe.client.get_list",
  params: {
    doctype: "AT Offer",
    fields: [
      "name",
      "customer",
      "insurance_company",
      "status",
      "currency",
      "offer_date",
      "valid_until",
      "net_premium",
      "tax_amount",
      "commission_amount",
      "gross_premium",
      "converted_policy",
    ],
    order_by: "modified desc",
    limit_page_length: 100,
  },
  auto: true,
  transform(data) {
    if (Array.isArray(data)) {
      return Object.freeze(data.map(item => Object.freeze({...item})));
    }
    return data;
  },
});

const convertResource = createResource({
  url: "acentem_takipte.doctype.at_offer.at_offer.convert_to_policy",
});
const updateOfferStatusResource = createResource({
  url: "frappe.client.set_value",
});
const branchResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Branch",
    fields: ["name", "branch_name"],
    filters: {
      is_active: 1,
    },
    order_by: "branch_name asc",
    limit_page_length: QUICK_OPTION_LIMIT,
  },
});
const insuranceCompanyResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Insurance Company",
    fields: ["name", "company_name"],
    filters: { is_active: 1 },
    order_by: "company_name asc",
    limit_page_length: QUICK_OPTION_LIMIT,
  },
});
const salesEntityResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Sales Entity",
    fields: ["name", "full_name"],
    order_by: "full_name asc",
    limit_page_length: QUICK_OPTION_LIMIT,
  },
});
const customerSearchResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
});
const createQuickOfferResource = createResource({
  url: "acentem_takipte.doctype.at_offer.at_offer.create_quick_offer",
});
const offerLookupResource = createResource({
  url: "frappe.client.get",
  auto: false,
});
const offerListResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
  transform(data) {
    if (Array.isArray(data)) {
      return Object.freeze(data.map(item => Object.freeze({...item})));
    }
    return data;
  },
});
const offerListCountResource = createResource({
  url: "frappe.client.get_count",
  auto: false,
});
const offerPresetServerReadResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.filter_presets.get_filter_preset_state",
  auto: false,
});
const offerPresetServerWriteResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.filter_presets.set_filter_preset_state",
  auto: false,
});
const offerBoardState = useOfferBoardState({
  t,
  activeLocale,
  localeCode: computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US")),
  branchStore,
  offersResource,
  branchResource,
  insuranceCompanyResource,
  salesEntityResource,
  customerSearchResource,
  offerListResource,
  offerListCountResource,
});

const {
  localeCode,
  offers,
  offerListRows,
  branches,
  insuranceCompaniesForQuickCreate,
  salesEntitiesForQuickCreate,
  customerSearchRows,
  customerOptions,
  customerSearchLoading,
  offerQuickConfig,
  offerQuickFields,
  offerQuickFormFields,
  offerQuickUi,
  offerQuickOptionsMap,
  customerSearchErrorText,
  offersLoadErrorText,
  offerListLoadErrorText,
  showCustomerSuggestions,
  showCustomerNoResults,
  offerViewMode,
  offerListFilters,
  offerPresetKey,
  offerCustomPresets,
  offerListPagination,
  isListView,
  offerCompanies,
  offerStatusOptions,
  offerSortOptions,
  offerPresetOptions,
  canDeleteOfferPreset,
  offerListTotal,
  offerListTotalPages,
  offerListHasNextPage,
  offerListStartRow,
  offerListEndRow,
  pagedOfferRows,
  isOfferListInitialLoading,
  offerActiveFilterCount,
  offerListSearchQuery,
  offerListFilterConfig,
  offerListRowsWithUrgency,
  offerSummary,
  offerConversionRate,
  offerListFilterBarActiveCount,
  lanes,
  showConvertDialog,
  showQuickOfferDialog,
  selectedOffer,
  convertLoading,
  convertError,
  quickOfferLoading,
  quickOfferError,
  quickOfferFieldErrors,
  draggedOfferName,
  quickOfferReturnTo,
  quickOfferOpenedFromIntent,
  quickOffer,
  convertForm,
  convertDialogEyebrow,
  canCreateQuickOffer,
  formatCurrency,
  formatCount,
  formatDisplayDate,
  today,
  oneYearLater,
  computeOfferRemainingDays,
  offerCardFacts,
  offerIdentityFacts,
  offerDetailsFacts,
  offerPremiumFacts,
} = offerBoardState;

const offerBoardFilters = useOfferBoardFilters({
  t,
  localeCode,
  branchStore,
  isListView,
  offerViewMode,
  offerListFilters,
  offerListPagination,
  offerPresetKey,
  offerCustomPresets,
  offerListHasNextPage,
  offerListResource,
  offerListCountResource,
  offersResource,
  offerPresetServerReadResource,
  offerPresetServerWriteResource,
});

const {
  applyOfferPreset,
  onOfferPresetChange,
  currentOfferPresetPayload,
  saveOfferPreset,
  deleteOfferPreset,
  buildOfferBoardParams,
  buildOfferListParams,
  buildOfferExportQuery,
  downloadOfferExport,
  buildOfferListCountParams,
  refreshOfferList,
  refreshOffers,
  applyOfferListFilters,
  resetOfferListFilters,
  persistOfferPresetStateToServer,
  hydrateOfferPresetStateFromServer,
  previousOfferPage,
  nextOfferPage,
  setOfferViewMode,
} = offerBoardFilters;

const offerBoardConversion = useOfferBoardConversion({
  t,
  router,
  route,
  offers,
  offerListRows,
  offerLookupResource,
  convertResource,
  updateOfferStatusResource,
  refreshOfferList,
  refreshOffers,
  setOfferViewMode,
  selectedOffer,
  convertLoading,
  convertError,
  convertForm,
  showConvertDialog,
  draggedOfferName,
  today,
  oneYearLater,
});

const {
  normalizeLane,
  laneRows,
  isConvertible,
  onCardDragStart,
  onCardDragEnd,
  onLaneDrop,
  laneToStatus,
  openConvertDialog,
  convertOffer,
  openPolicyDetail,
  openOfferDetail,
  consumeConvertOfferRouteIntent,
  consumeOfferRouteIntents,
} = offerBoardConversion;

const offerBoardQuickOffer = useOfferBoardQuickOffer({
  t,
  router,
  route,
  activeLocale,
  offerQuickConfig,
  offerQuickFields,
  offerQuickFormFields,
  quickOffer,
  quickOfferFieldErrors,
  quickOfferError,
  quickOfferLoading,
  quickOfferOpenedFromIntent,
  quickOfferReturnTo,
  showQuickOfferDialog,
  customerSearchResource,
  createQuickOfferResource,
  offersResource,
  offerQuickSuccessTargets: offerQuickConfig?.successRefreshTargets,
  buildOfficeBranchLookupFilters,
  refreshOfferList,
  buildOfferBoardParams,
  openOfferDetail,
});

const {
  clearQuickOfferFieldErrors,
  validateQuickOfferForm,
  validateQuickOfferManaged,
  buildQuickOfferPayload,
  buildQuickOfferManagedPayload,
  onQuickOfferManagedCreated,
  openQuickOfferDialog,
  openQuickOfferDialogForCustomer,
  applyQuickOfferPrefills,
  buildQuickOfferReturnTo,
  onOfferRelatedCreateRequested,
  cancelQuickOfferDialog,
  onCustomerInput,
  onCustomerQuery,
  selectCustomerOption,
  clearSelectedCustomer,
  getSelectedCustomerName,
  createQuickOffer,
  resetQuickOfferForm,
  consumeQuickOfferRouteIntent,
  quickOfferSuccessHandlers,
} = offerBoardQuickOffer;

const offerListColumns = [
  { key: "name", label: "Teklif No", width: "160px", type: "mono" },
  { key: "insurance_company", label: "Sigorta Şirketi", width: "200px" },
  { key: "branch", label: "Branş", width: "150px" },
  { key: "status", label: "Durum", width: "120px", type: "status" },
  { key: "customer_type_label", label: "Müşteri Türü", width: "130px" },
  { key: "customer_tax_id", label: "TC/VNO", width: "140px", type: "mono" },
  { key: "customer_label", label: "Müşteri Ad Soyad", width: "220px" },
  { key: "customer_birth_date", label: "Doğum Tarihi", width: "120px", type: "date" },
  { key: "valid_until", label: "Geçerlilik Tarihi", width: "120px", type: "date" },
  { key: "remaining_days", label: "Kalan Gün", width: "100px", type: "urgency", align: "right" },
  { key: "gross_premium", label: "Brüt Prim", width: "120px", type: "amount", align: "right" },
  { key: "commission_amount", label: "Komisyon", width: "120px", type: "amount", align: "right" },
];

function onOfferListFilterBarChange({ key, value }) {
  if (key === "insurance_company") offerListFilters.insurance_company = String(value || "");
  if (key === "status") offerListFilters.status = String(value || "");
  offerListPagination.page = 1;
  void applyOfferListFilters();
}

function onOfferListFilterBarReset() {
  offerListFilters.query = "";
  offerListFilters.insurance_company = "";
  offerListFilters.status = "";
  offerListPagination.page = 1;
  void applyOfferListFilters();
}

function focusOfferSearch() {
  const searchInput = document.querySelector('input[placeholder*="ara"]');
  if (searchInput instanceof HTMLInputElement) {
    searchInput.focus();
    searchInput.select();
  }
}

applyOfferPreset(offerPresetKey.value, { refresh: false });
void refreshOffers();
watch(
  () => branchStore.selected,
  () => {
    customerSearchResource.setData([]);
    customerSearchResource.error = null;
    offerListPagination.page = 1;
    void refreshOffers();
  }
);
void hydrateOfferPresetStateFromServer();
void consumeOfferRouteIntents(consumeQuickOfferRouteIntent);
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 px-3 py-2 text-sm;
}
</style>

