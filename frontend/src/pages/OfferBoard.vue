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
        :loading="Boolean(offersResource.loading) || Boolean(offerListResource.loading)"
        :labels="toolbarLabels"
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
        :labels="summaryLabels"
        :format-count="formatCount"
      />
    </template>

    <OfferBoardFilterSection
      v-if="isListView"
      :search="offerListSearchQuery"
      :title="t('filtersTitle')"
      :count="`${offerListFilterBarActiveCount} ${t('activeFilters')}`"
      :filters="offerListFilterConfig"
      :active-count="offerListFilterBarActiveCount"
      @update:search="onOfferSearchChange"
      @filter-change="onOfferListFilterBarChange"
      @reset="onOfferListFilterBarReset"
    >
      <template #actions>
        <button class="btn btn-sm" type="button" @click="refreshOffers">{{ t("refresh") }}</button>
        <button v-if="offerListFilterBarActiveCount > 0" class="btn btn-outline btn-sm" type="button" @click="onOfferListFilterBarReset">
          {{ t("clearFilters") }}
        </button>
      </template>
    </OfferBoardFilterSection>

    <OfferBoardListSection
      v-if="isListView"
      :title="t('offerTableTitle')"
      :count="formatCount(offerListTotal)"
      :columns="offerListColumns"
      :rows="offerListRowsWithUrgency"
      :locale="localeCode"
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
      :loading="Boolean(offersResource.loading)"
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
      :labels="quickOfferLabels"
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
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { createResource } from "frappe-ui";

import QuickCreateOffer from "../components/QuickCreateOffer.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import OfferBoardConvertDialog from "../components/offer-board/OfferBoardConvertDialog.vue";
import OfferBoardFilterSection from "../components/offer-board/OfferBoardFilterSection.vue";
import OfferBoardListSection from "../components/offer-board/OfferBoardListSection.vue";
import OfferBoardPipelineSection from "../components/offer-board/OfferBoardPipelineSection.vue";
import OfferBoardSummaryMetrics from "../components/offer-board/OfferBoardSummaryMetrics.vue";
import OfferBoardToolbar from "../components/offer-board/OfferBoardToolbar.vue";
import { useOfferBoardConversion } from "../composables/offerBoard/conversion";
import { useOfferBoardFilters } from "../composables/offerBoard/filters";
import { useOfferBoardQuickOffer } from "../composables/offerBoard/quickOffer";
import { useOfferBoardState } from "../composables/offerBoard/state";
import { OFFER_TRANSLATIONS } from "../config/offer_translations";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const branchStore = useBranchStore();

const PAGE_COPY = {
  tr: {
    breadcrumb: "Sigorta Operasyonları → Teklifler",
    recordCount: "kayıt",
    title: "Teklif Panosu",
    subtitle: "Teklifleri liste ve pano görünümünde yönetin",
    viewList: "Liste",
    viewBoard: "Pano",
    newOffer: "Yeni Teklif",
    focusFilters: "Filtrele",
    exportXlsx: "Excel",
    filtersTitle: "Filtreler",
    offerTableTitle: "Teklif Listesi",
    pipelineTitle: "Teklif Panosu",
    summaryTotal: "Toplam Teklif",
    summaryDraft: "Taslak",
    summarySent: "Gönderildi",
    summaryAccepted: "Kabul Edildi",
    summaryConversion: "Dönüşüm Oranı",
    activeFilters: "aktif filtre",
    clearFilters: "Filtreleri Temizle",
    showingRecords: "kayıt gösteriliyor",
    emptyTitle: "Teklif Bulunamadı",
    empty: "Teklif kaydı bulunamadı.",
    loading: "Yükleniyor...",
    loadErrorTitle: "Teklifler Yüklenemedi",
    stage: "Aşama",
    emptyLane: "Bu aşamada teklif yok.",
    convert: "Poliçeye Çevir",
    openPolicy: "Poliçeyi Aç",
    quickOfferTitle: "Hızlı Teklif Oluştur",
    cancel: "İptal",
    createQuickOffer: "Teklif Oluştur",
    createQuickOfferAndOpen: "Kaydet ve Aç",
    convertDialogTitle: "Tekliften Poliçeye",
    selectedOffer: "Seçili Teklif",
    createPolicy: "Poliçe Oluştur",
    taxAmount: "Vergi Tutarı",
    commissionAmount: "Komisyon Tutarı",
    policyNo: "Sigorta Şirketi Poliçe No",
  },
  en: {
    breadcrumb: "Insurance Operations → Offers",
    recordCount: "records",
    title: "Offer Board",
    subtitle: "Manage offers in list and board views",
    viewList: "List",
    viewBoard: "Board",
    newOffer: "New Offer",
    focusFilters: "Focus Filters",
    exportXlsx: "Excel",
    filtersTitle: "Filters",
    offerTableTitle: "Offer List",
    pipelineTitle: "Offer Pipeline",
    summaryTotal: "Total Offers",
    summaryDraft: "Draft",
    summarySent: "Sent",
    summaryAccepted: "Accepted",
    summaryConversion: "Conversion Rate",
    activeFilters: "active filters",
    clearFilters: "Clear Filters",
    showingRecords: "records shown",
    emptyTitle: "No Offers Found",
    empty: "No offers found.",
    loading: "Loading...",
    loadErrorTitle: "Offers Could Not Load",
    stage: "Stage",
    emptyLane: "No offers in this lane.",
    convert: "Convert to Policy",
    openPolicy: "Open Policy",
    quickOfferTitle: "Create Quick Offer",
    cancel: "Cancel",
    createQuickOffer: "Create Offer",
    createQuickOfferAndOpen: "Save and Open",
    convertDialogTitle: "Offer to Policy",
    selectedOffer: "Selected Offer",
    createPolicy: "Create Policy",
    taxAmount: "Tax Amount",
    commissionAmount: "Commission Amount",
    policyNo: "Carrier Policy No",
  },
};

const activeLocale = computed(() => (String(authStore.locale || "tr").toLowerCase().startsWith("tr") ? "tr" : "en"));
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));

function t(key) {
  return PAGE_COPY[activeLocale.value]?.[key] || OFFER_TRANSLATIONS[activeLocale.value]?.[key] || key;
}

function buildOfficeBranchLookupFilters() {
  const officeBranch = branchStore.requestBranch || "";
  return officeBranch ? { office_branch: officeBranch } : {};
}

function openOfferDetail(name) {
  if (!name) return;
  router.push({ name: "offer-detail", params: { name } });
}

const offersResource = createResource({ url: "frappe.client.get_list", auto: false });
const convertResource = createResource({ url: "acentem_takipte.acentem_takipte.api.offers.convert_offer_to_policy", auto: false });
const updateOfferStatusResource = createResource({ url: "frappe.client.set_value", auto: false });
const branchResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: { doctype: "AT Branch", fields: ["name", "branch_name"], filters: { is_active: 1 }, order_by: "branch_name asc" },
});
const insuranceCompanyResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: { doctype: "AT Insurance Company", fields: ["name", "company_name"], order_by: "company_name asc" },
});
const salesEntityResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: { doctype: "AT Sales Entity", fields: ["name", "full_name"], order_by: "full_name asc" },
});
const customerSearchResource = createResource({ url: "frappe.client.get_list", auto: false });
const createQuickOfferResource = createResource({ url: "acentem_takipte.acentem_takipte.api.offers.quick_create_offer", auto: false });
const offerLookupResource = createResource({ url: "frappe.client.get", auto: false });
const offerListResource = createResource({ url: "frappe.client.get_list", auto: false });
const offerListCountResource = createResource({ url: "frappe.client.get_count", auto: false });
const offerPresetServerReadResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.filter_presets.get_filter_preset_state",
  auto: false,
});
const offerPresetServerWriteResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.filter_presets.set_filter_preset_state",
  auto: false,
});

const state = useOfferBoardState({
  t,
  activeLocale,
  localeCode,
  branchStore,
  offersResource,
  branchResource,
  insuranceCompanyResource,
  salesEntityResource,
  customerSearchResource,
  offerListResource,
  offerListCountResource,
});

const filtersRuntime = useOfferBoardFilters({
  t,
  localeCode,
  branchStore,
  isListView: state.isListView,
  offerViewMode: state.offerViewMode,
  offerListFilters: state.offerListFilters,
  offerListPagination: state.offerListPagination,
  offerPresetKey: state.offerPresetKey,
  offerCustomPresets: state.offerCustomPresets,
  offerListHasNextPage: state.offerListHasNextPage,
  offerListResource,
  offerListCountResource,
  offersResource,
  offerPresetServerReadResource,
  offerPresetServerWriteResource,
});

const quickOfferRuntime = useOfferBoardQuickOffer({
  t,
  router,
  route,
  activeLocale,
  offerQuickConfig: state.offerQuickConfig,
  offerQuickFields: state.offerQuickFields,
  offerQuickFormFields: state.offerQuickFormFields,
  quickOffer: state.quickOffer,
  quickOfferFieldErrors: state.quickOfferFieldErrors,
  quickOfferError: state.quickOfferError,
  quickOfferLoading: state.quickOfferLoading,
  quickOfferOpenedFromIntent: state.quickOfferOpenedFromIntent,
  quickOfferReturnTo: state.quickOfferReturnTo,
  showQuickOfferDialog: state.showQuickOfferDialog,
  customerSearchResource,
  createQuickOfferResource,
  offersResource,
  offerQuickSuccessTargets: {
    offer_list: filtersRuntime.refreshOfferList,
    offer_board: filtersRuntime.refreshOffers,
  },
  buildOfficeBranchLookupFilters,
  refreshOfferList: filtersRuntime.refreshOfferList,
  buildOfferBoardParams: filtersRuntime.buildOfferBoardParams,
  openOfferDetail,
});

const conversionRuntime = useOfferBoardConversion({
  t,
  router,
  route,
  offers: state.offers,
  offerListRows: state.offerListRows,
  offerLookupResource,
  convertResource,
  updateOfferStatusResource,
  refreshOfferList: filtersRuntime.refreshOfferList,
  refreshOffers: filtersRuntime.refreshOffers,
  setOfferViewMode: filtersRuntime.setOfferViewMode,
  selectedOffer: state.selectedOffer,
  convertLoading: state.convertLoading,
  convertError: state.convertError,
  convertForm: state.convertForm,
  showConvertDialog: state.showConvertDialog,
  draggedOfferName: state.draggedOfferName,
  today: state.today,
  oneYearLater: state.oneYearLater,
});

const toolbarLabels = computed(() => ({
  viewList: t("viewList"),
  viewBoard: t("viewBoard"),
  newOffer: t("newOffer"),
  refresh: t("refresh"),
  focusFilters: t("focusFilters"),
  exportXlsx: t("exportXlsx"),
}));

const summaryLabels = computed(() => ({
  total: t("summaryTotal"),
  draft: t("summaryDraft"),
  sent: t("summarySent"),
  accepted: t("summaryAccepted"),
  conversion: t("summaryConversion"),
}));

const quickOfferLabels = computed(() => ({
  cancel: t("cancel"),
  save: t("createQuickOffer"),
  saveAndOpen: t("createQuickOfferAndOpen"),
}));

const offerListColumns = computed(() => [
  { key: "offer_primary", secondaryKey: "offer_secondary", label: t("colOffer"), type: "stacked" },
  { key: "customer_label", secondaryKey: "customer_secondary", label: t("colCustomer"), type: "stacked" },
  { key: "validity_primary", secondaryKey: "validity_secondary", label: t("colValidity"), type: "stacked" },
  { key: "finance_primary", secondaryKey: "finance_secondary", label: t("colPremium"), type: "stacked" },
  { key: "status", label: t("colStatus"), type: "status", domain: "AT Offer" },
]);

function focusOfferSearch() {
  const searchInput = document.querySelector('input[placeholder*="Teklif"], input[placeholder*="Offer"]');
  if (searchInput instanceof HTMLInputElement) searchInput.focus();
}

function onOfferSearchChange(value) {
  offerListSearchQuery.value = value;
  filtersRuntime.applyOfferListFilters();
}

function onOfferListFilterBarChange({ key, value }) {
  state.offerListFilters[key] = value;
  filtersRuntime.applyOfferListFilters();
}

function onOfferListFilterBarReset() {
  filtersRuntime.resetOfferListFilters();
}

const {
  offers,
  offerQuickUi,
  offerQuickOptionsMap,
  offersLoadErrorText,
  isListView,
  offerListTotal,
  offerListHasNextPage,
  pagedOfferRows,
  isOfferListInitialLoading,
  offerListFilterBarActiveCount,
  offerListFilterConfig,
  offerListRowsWithUrgency,
  offerListSearchQuery,
  offerSummary,
  offerConversionRate,
  lanes,
  showConvertDialog,
  showQuickOfferDialog,
  selectedOffer,
  convertLoading,
  convertError,
  quickOfferOpenedFromIntent,
  quickOfferReturnTo,
  convertForm,
  convertDialogEyebrow,
  formatCount,
  offerCardFacts,
  offerListPagination,
} = state;

const {
  downloadOfferExport,
  refreshOffers,
  hydrateOfferPresetStateFromServer,
  previousOfferPage,
  nextOfferPage,
  setOfferViewMode,
} = filtersRuntime;

const {
  validateQuickOfferManaged,
  buildQuickOfferManagedPayload,
  onQuickOfferManagedCreated,
  openQuickOfferDialog,
  cancelQuickOfferDialog,
  consumeQuickOfferRouteIntent,
  quickOfferSuccessHandlers,
} = quickOfferRuntime;

const {
  laneRows,
  isConvertible,
  onCardDragStart,
  onCardDragEnd,
  onLaneDrop,
  openConvertDialog,
  convertOffer,
  openPolicyDetail,
  consumeOfferRouteIntents,
} = conversionRuntime;

onMounted(async () => {
  await hydrateOfferPresetStateFromServer();
  await consumeOfferRouteIntents(consumeQuickOfferRouteIntent);
  await refreshOffers();
});
</script>
