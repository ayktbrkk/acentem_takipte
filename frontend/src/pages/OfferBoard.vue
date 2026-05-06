<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="formatCount(isListView ? offerListTotal : offers.length)"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <div class="flex items-center gap-2">
        <div class="mr-2 flex rounded-lg border border-slate-200 bg-white p-1" role="group" :aria-label="t('viewMode')">
          <button
            type="button"
            class="rounded px-3 py-1 text-xs font-medium transition-all"
            :class="isListView ? 'bg-brand-50 text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
            :aria-pressed="isListView"
            :aria-label="t('viewList')"
            @click="setOfferViewMode('list')"
          >
            {{ t('viewList') }}
          </button>
          <button
            type="button"
            class="rounded px-3 py-1 text-xs font-medium transition-all"
            :class="!isListView ? 'bg-brand-50 text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
            :aria-pressed="!isListView"
            :aria-label="t('viewBoard')"
            @click="setOfferViewMode('board')"
          >
            {{ t('viewBoard') }}
          </button>
        </div>
        <ActionButton variant="secondary" size="sm" @click="downloadOfferExport('xlsx')">
          <FeatherIcon name="download" class="h-4 w-4" />
          {{ t("exportXlsx") }}
        </ActionButton>
        <ActionButton variant="secondary" size="sm" @click="refreshOffers">
          <FeatherIcon name="refresh-cw" class="h-4 w-4" />
          {{ t("refresh") }}
        </ActionButton>
        <ActionButton variant="primary" size="sm" @click="openQuickOfferDialog">
          <FeatherIcon name="plus" class="h-4 w-4" />
          {{ t("newOffer") }}
        </ActionButton>
      </div>
    </template>

    <template #metrics>
      <div v-if="isListView" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SaaSMetricCard :label="t('summaryTotal')" :value="formatCount(offerSummary.total)" />
        <SaaSMetricCard :label="t('summaryDraft')" :value="formatCount(offerSummary.draft)" value-class="text-gray-500" />
        <SaaSMetricCard :label="t('summarySent')" :value="formatCount(offerSummary.sent)" value-class="text-at-amber" />
        <SaaSMetricCard :label="t('summaryAccepted')" :value="formatCount(offerSummary.accepted)" value-class="text-at-green" />
        <SaaSMetricCard :label="t('summaryConversion')" :value="`${offerConversionRate}%`" value-class="text-brand-600" />
      </div>
    </template>

    <div v-if="isListView" class="space-y-4">
      <SmartFilterBar
        v-model="offerListSearchQuery"
        :placeholder="t('searchPlaceholder')"
        :advanced-label="t('filtersTitle')"
        @open-advanced="showAdvancedFilters = !showAdvancedFilters"
      >
        <template #primary-filters>
          <select
            class="input h-9 py-1 text-sm"
            @change="onOfferListFilterBarChange({ key: 'status', value: $event.target.value })"
          >
            <option value="">{{ t("colStatus") }}: {{ t("all") || 'Hepsi' }}</option>
            <option v-for="opt in offerListFilterConfig[1].options" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </template>
      </SmartFilterBar>

      <div v-if="showAdvancedFilters" class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label class="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            <span>{{ t("insurance_company") }}</span>
            <input v-model="state.offerListFilters.insurance_company" class="input" type="text" />
          </label>
          <label class="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            <span>{{ t("branch") }}</span>
            <input v-model="state.offerListFilters.branch" class="input" type="text" />
          </label>
          <label class="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            <span>{{ t("valid_until") }}</span>
            <input v-model="state.offerListFilters.valid_until" class="input" type="date" />
          </label>
          <label class="flex flex-col gap-1.5 text-sm font-medium text-gray-700">
            <span>{{ t("gross_premium") }}</span>
            <div class="grid grid-cols-2 gap-2">
              <input v-model="state.offerListFilters.gross_min" class="input" type="number" min="0" placeholder="Min" />
              <input v-model="state.offerListFilters.gross_max" class="input" type="number" min="0" placeholder="Max" />
            </div>
          </label>
        </div>
        <label class="mt-4 flex items-center gap-2 text-sm text-gray-700">
          <input v-model="state.offerListFilters.actionable_only" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
          <span>{{ t("presetActionable") }}</span>
        </label>
        <div class="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <ActionButton variant="secondary" size="sm" @click="onOfferListFilterBarReset">
            {{ t("clearFilters") }}
          </ActionButton>
          <ActionButton variant="primary" size="sm" class="px-6" @click="filtersRuntime.applyOfferListFilters()">
            {{ t("applyFilters") }}
          </ActionButton>
        </div>
      </div>
    </div>

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
import ActionButton from "../components/app-shell/ActionButton.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import SmartFilterBar from "../components/app-shell/SmartFilterBar.vue";
import OfferBoardConvertDialog from "../components/offer-board/OfferBoardConvertDialog.vue";
import OfferBoardListSection from "../components/offer-board/OfferBoardListSection.vue";
import OfferBoardPipelineSection from "../components/offer-board/OfferBoardPipelineSection.vue";
import { FeatherIcon } from "frappe-ui";
import { useOfferBoardConversion } from "../composables/offerBoard/conversion";
import { useOfferBoardFilters } from "../composables/offerBoard/filters";
import { useOfferBoardQuickOffer } from "../composables/offerBoard/quickOffer";
import { useOfferBoardState } from "../composables/offerBoard/state";
import { OFFER_TRANSLATIONS } from "../config/offer_translations";
import { translateText } from "../utils/i18n";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const branchStore = useBranchStore();

const activeLocale = computed(() => (String(authStore.locale || "tr").toLowerCase().startsWith("tr") ? "tr" : "en"));
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
const showAdvancedFilters = ref(false);

function t(key) {
  const locale = activeLocale.value === "tr" ? "tr" : "en";
  return OFFER_TRANSLATIONS[locale]?.[key] || translateText(key, activeLocale.value);
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
  { key: "finance_primary", secondaryKey: "finance_secondary", label: t("colPremium"), type: "stacked", align: "right" },
  { key: "status", label: t("colStatus"), type: "status", domain: "offer" },
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
