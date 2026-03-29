<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="formatCount(isListView ? offerListTotal : offers.length)"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <OfferBoardActionBar
        :is-list-view="isListView"
        :offers-loading="offersResource.loading"
        :offer-list-loading="offerListResource.loading"
        :t="t"
        @view-list="setOfferViewMode('list')"
        @view-board="setOfferViewMode('board')"
        @new-offer="openQuickOfferDialog"
        @refresh="refreshOffers"
        @focus-search="focusOfferSearch"
        @export-xlsx="downloadOfferExport('xlsx')"
      />
    </template>

    <template #metrics>
      <OfferBoardMetricsPanel
        :conversion-rate="offerConversionRate"
        :format-count="formatCount"
        :is-list-view="isListView"
        :summary="offerSummary"
        :t="t"
      />
    </template>

    <OfferBoardFilterSection
      v-model:search="offerListSearchQuery"
      :active-count="offerListFilterBarActiveCount"
      :filters="offerListFilterConfig"
      :is-list-view="isListView"
      :offer-list-loading="offerListResource.loading"
      :offers-loading="offersResource.loading"
      :t="t"
      @filter-change="onOfferListFilterBarChange"
      @reset="onOfferListFilterBarReset"
      @view-list="setOfferViewMode('list')"
      @view-board="setOfferViewMode('board')"
      @refresh="refreshOffers"
    />

    <OfferBoardListSection
      :columns="offerListColumns"
      :format-count="formatCount"
      :has-next-page="offerListHasNextPage"
      :is-list-view="isListView"
      :loading="isOfferListInitialLoading"
      :offer-list-total="offerListTotal"
      :pagination="offerListPagination"
      :rows="offerListRowsWithUrgency"
      :t="t"
      @row-click="(row) => openOfferDetail(row.name)"
      @previous-page="previousOfferPage"
      @next-page="nextOfferPage"
    />

    <OfferBoardPipelineSection
      :format-count="formatCount"
      :is-convertible="isConvertible"
      :is-list-view="isListView"
      :lanes="lanes"
      :lane-rows="laneRows"
      :load-error-text="offersLoadErrorText"
      :offer-card-facts="offerCardFacts"
      :offers="offers"
      :offers-loading="offersResource.loading"
      :t="t"
      @card-drag-start="onCardDragStart"
      @card-drag-end="onCardDragEnd"
      @lane-drop="onLaneDrop"
      @open-convert-dialog="openConvertDialog"
      @open-offer-detail="openOfferDetail"
      @open-policy-detail="openPolicyDetail"
    />

    <OfferBoardQuickOfferDialog
      v-model="showQuickOfferDialog"
      :active-locale="activeLocale"
      :build-payload="buildQuickOfferManagedPayload"
      :options-map="offerQuickOptionsMap"
      :return-to="quickOfferOpenedFromIntent ? quickOfferReturnTo : ''"
      :success-handlers="quickOfferSuccessHandlers"
        :subtitle="quickOfferUi.subtitle"
      :t="t"
      :validate="validateQuickOfferManaged"
      @cancel="cancelQuickOfferDialog"
      @created="onQuickOfferManagedCreated"
    />

    <OfferBoardConvertDialog
      v-model="showConvertDialog"
      :convert-dialog-eyebrow="convertDialogEyebrow"
      :convert-error="convertError"
      :convert-form="convertForm"
      :convert-loading="convertLoading"
      :selected-offer="selectedOffer"
      :t="t"
      @convert="convertOffer"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import OfferBoardActionBar from "../components/offer-board/OfferBoardActionBar.vue";
import OfferBoardMetricsPanel from "../components/offer-board/OfferBoardMetricsPanel.vue";
import OfferBoardFilterSection from "../components/offer-board/OfferBoardFilterSection.vue";
import OfferBoardListSection from "../components/offer-board/OfferBoardListSection.vue";
import OfferBoardPipelineSection from "../components/offer-board/OfferBoardPipelineSection.vue";
import OfferBoardQuickOfferDialog from "../components/offer-board/OfferBoardQuickOfferDialog.vue";
import OfferBoardConvertDialog from "../components/offer-board/OfferBoardConvertDialog.vue";
import { buildQuickCreateDraft, getLocalizedText } from "../config/quickCreateRegistry";
import { useOfferBoardListRuntime } from "../composables/useOfferBoardListRuntime";
import { useOfferBoardConversion } from "../composables/useOfferBoardConversion";
import { useOfferBoardListState } from "../composables/useOfferBoardListState";
import { useOfferBoardNavigation } from "../composables/useOfferBoardNavigation";
import { useOfferBoardLocale } from "../composables/useOfferBoardLocale";
import { useOfferBoardResources } from "../composables/useOfferBoardResources";
import { useOfferBoardBootstrap } from "../composables/useOfferBoardBootstrap";
import { useOfferBoardDragDrop } from "../composables/useOfferBoardDragDrop";
import { useOfferBoardQuickOffer } from "../composables/useOfferBoardQuickOffer";
import { isValidTckn, normalizeCustomerType, normalizeIdentityNumber } from "../utils/customerIdentity";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const branchStore = useBranchStore();
const {
  activeLocale,
  convertDialogEyebrow,
  formatCount,
  localeCode,
  t,
} = useOfferBoardLocale(computed(() => unref(authStore.locale)));

const {
  branches,
  convertResource,
  insuranceCompaniesForQuickCreate,
  offerBoardBranchRequest,
  offerCustomPresets,
  offerListCountResource,
  offerListFilters,
  offerListPagination,
  offerListResource,
  offerListRows,
  offerLookupResource,
  offerPresetServerReadResource,
  offerPresetServerWriteResource,
  offerQuickConfig,
  offerQuickFields,
  offerQuickFormFields,
  offerViewMode,
  offers,
  offersLoadErrorText,
  offersResource,
  salesEntitiesForQuickCreate,
  updateOfferStatusResource,
} = useOfferBoardResources({
  branchRequest: computed(() => branchStore.requestBranch || ""),
  t,
});
const {
  applyOfferListFilters,
  applyOfferPreset,
  buildOfferBoardParams,
  buildOfferBoardQuickExport,
  buildOfferFilterPayload,
  buildOfferListCountParams,
  buildOfferListOrderBy,
  buildOfferListOrderByRaw,
  buildOfferListParams,
  canDeleteOfferPreset,
  currentOfferPresetPayload,
  deleteOfferPreset,
  downloadOfferExport,
  focusOfferSearch,
  hasMeaningfulOfferPresetState,
  hydrateOfferPresetStateFromServer,
  isListView,
  nextOfferPage,
  onOfferListFilterBarChange,
  onOfferListFilterBarReset,
  onOfferPresetChange,
  offerCompanies,
  offerPresetKey,
  offerPresetOptions,
  offerSortOptions,
  offerStatusOptions,
  previousOfferPage,
  refreshOfferList,
  refreshOffers,
  resetOfferListFilters,
  saveOfferPreset,
  setOfferViewMode,
} = useOfferBoardListRuntime({
  branchRequest: offerBoardBranchRequest,
  localeCode,
  offerCustomPresets,
  offerListCountResource,
  offerListFilters,
  offerListPagination,
  offerListResource,
  offerPresetServerReadResource,
  offerPresetServerWriteResource,
  offerViewMode,
  t,
});
const {
  isOfferListInitialLoading,
  offerConversionRate,
  offerListColumns,
  offerListEndRow,
  offerListFilterBarActiveCount,
  offerListFilterConfig,
  offerListHasNextPage,
  offerListSearchQuery,
  offerListStartRow,
  offerListRowsWithUrgency,
  offerListTotal,
  offerListTotalPages,
  offerSummary,
  pagedOfferRows,
} = useOfferBoardListState({
  localeCode,
  offerCompanies,
  offerListFilters,
  offerListPagination,
  offerListResource,
  offerListRows,
  offerStatusOptions,
  t,
});

const {
  lanes,
  laneRows,
  openOfferDetail,
  openPolicyDetail,
} = useOfferBoardNavigation({
  offers,
  router,
  t,
});

const {
  canCreateQuickOffer,
  cancelQuickOfferDialog,
  clearSelectedCustomer,
  createQuickOffer,
  customerOptions,
  customerSearchErrorText,
  customerSearchLoading,
  customerSearchRows,
  offerQuickOptionsMap,
    quickOfferUi,
  quickOffer,
  quickOfferError,
  quickOfferFieldErrors,
  quickOfferLoading,
  quickOfferOpenedFromIntent,
  quickOfferReturnTo,
  quickOfferSuccessHandlers,
  resetQuickOfferForm,
  selectCustomerOption,
  showCustomerNoResults,
  showCustomerSuggestions,
  showQuickOfferDialog,
  applyQuickOfferPrefills,
  buildQuickOfferManagedPayload,
  buildQuickOfferPayload,
  buildQuickOfferReturnTo,
  consumeQuickOfferRouteIntent,
  getSelectedCustomerName,
  onCustomerInput,
  onCustomerQuery,
  onOfferRelatedCreateRequested,
  onQuickOfferManagedCreated,
  validateQuickOfferForm,
  validateQuickOfferManaged,
} = useOfferBoardQuickOffer({
  activeLocale,
  buildOfferBoardParams,
  buildQuickCreateDraft,
  branches,
  getLocalizedText,
  isValidTckn,
  normalizeCustomerType,
  normalizeIdentityNumber,
  offerQuickConfig,
  offerQuickFields,
  offerQuickFormFields,
  offersResource,
  openOfferDetail,
  refreshOfferList,
  route,
  router,
  salesEntities: salesEntitiesForQuickCreate,
  t,
  insuranceCompanies: insuranceCompaniesForQuickCreate,
});
const {
  convertError,
  convertForm,
  convertLoading,
  convertOffer,
  consumeOfferRouteIntents,
  isConvertible,
  openConvertDialog,
  selectedOffer,
  showConvertDialog,
} = useOfferBoardConversion({
  offerListRows,
  offerLookupResource,
  offers,
  offersResource,
  openOfferDetail,
  openPolicyDetail,
  refreshOfferList,
  route,
  router,
  setOfferViewMode,
  t,
  convertResource,
});

const {
  onCardDragEnd,
  onCardDragStart,
  onLaneDrop,
} = useOfferBoardDragDrop({
  offers,
  offersResource,
  openConvertDialog,
  refreshOfferList,
  setDragDropError: (message) => {
    convertError.value = message;
  },
  t,
  updateOfferStatusResource,
});

useOfferBoardBootstrap({
  applyOfferPreset,
  branchSelected: computed(() => branchStore.selected),
  hydrateOfferPresetStateFromServer,
  offerListPagination,
  offerPresetKey,
  consumeQuickOfferRouteIntent,
  consumeOfferRouteIntents,
  refreshOffers,
});
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 px-3 py-2 text-sm;
}
</style>

