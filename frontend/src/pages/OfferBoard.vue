<template>
  <section class="page-shell space-y-4">
    <div class="detail-topbar" v-if="isListView">
      <div>
        <h1 class="detail-title">Teklifler</h1>
        <p class="detail-subtitle">{{ offerListTotal }} teklif</p>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-outline btn-sm" type="button" @click="focusOfferSearch">Filtrele</button>
        <button class="btn btn-outline btn-sm" type="button" :disabled="offersResource.loading || offerListResource.loading" @click="downloadOfferExport('xlsx')">Disa Aktar</button>
        <button class="btn btn-primary btn-sm" type="button" @click="openQuickOfferDialog">+ Yeni Teklif</button>
      </div>
    </div>

    <div v-if="isListView" class="grid grid-cols-1 gap-4 px-5 md:grid-cols-5">
      <div class="mini-metric">
        <p class="mini-metric-label">Toplam Teklif</p>
        <p class="mini-metric-value">{{ formatCount(offerSummary.total) }}</p>
      </div>
      <div class="mini-metric">
        <p class="mini-metric-label">Taslak</p>
        <p class="mini-metric-value text-gray-600">{{ formatCount(offerSummary.draft) }}</p>
      </div>
      <div class="mini-metric">
        <p class="mini-metric-label">Gonderildi</p>
        <p class="mini-metric-value text-blue-600">{{ formatCount(offerSummary.sent) }}</p>
      </div>
      <div class="mini-metric">
        <p class="mini-metric-label">Kabul Edildi</p>
        <p class="mini-metric-value text-green-600">{{ formatCount(offerSummary.accepted) }}</p>
      </div>
      <div class="mini-metric">
        <p class="mini-metric-label">Donusum Orani</p>
        <p class="mini-metric-value text-brand-600">{{ offerConversionRate }}%</p>
      </div>
    </div>

    <div v-if="isListView" class="border-b border-gray-200 bg-white px-5 py-3">
      <FilterBar
        v-model:search="offerListSearchQuery"
        :filters="offerListFilterConfig"
        :active-count="offerListFilterBarActiveCount"
        @filter-change="onOfferListFilterBarChange"
        @reset="onOfferListFilterBarReset"
      >
        <template #actions>
          <button class="btn btn-sm" @click="setOfferViewMode('list')">Liste</button>
          <button class="btn btn-sm" @click="setOfferViewMode('board')">Pano</button>
          <button class="btn btn-sm" :disabled="offersResource.loading || offerListResource.loading" @click="refreshOffers">Yenile</button>
          <button v-if="offerListFilterBarActiveCount > 0" class="btn btn-outline btn-sm" @click="onOfferListFilterBarReset">Temizle</button>
        </template>
      </FilterBar>
    </div>

    <div v-if="isListView" class="flex-1 p-5">
      <ListTable
        :columns="offerListColumns"
        :rows="offerListRowsWithUrgency"
        :loading="isOfferListInitialLoading"
        empty-message="Teklif bulunamadı."
        @row-click="(row) => openOfferDetail(row.name)"
      />
      <div class="mt-4 flex items-center justify-between">
        <p class="text-xs text-gray-400">{{ pagedOfferRows.length }} / {{ offerListTotal }} kayıt gösteriliyor</p>
        <div class="flex items-center gap-1">
          <button class="btn btn-sm" :disabled="offerListPagination.page <= 1" @click="previousOfferPage">←</button>
          <span class="px-2 text-xs text-gray-600">{{ offerListPagination.page }}</span>
          <button class="btn btn-sm" :disabled="!offerListHasNextPage" @click="nextOfferPage">→</button>
        </div>
      </div>
    </div>

    <div v-if="!isListView" class="flex-1 p-5">
      <div class="detail-topbar mb-4">
        <div>
          <p class="detail-breadcrumb">Sigorta Operasyonları → Teklif Panosu</p>
          <h1 class="text-xl font-medium text-gray-900">{{ t("subtitle") }}</h1>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button class="btn btn-sm" @click="setOfferViewMode('list')">Liste</button>
          <button class="btn btn-sm" @click="setOfferViewMode('board')">Pano</button>
          <button class="btn btn-primary btn-sm" @click="openQuickOfferDialog">+ Yeni Teklif</button>
          <button class="btn btn-sm" :disabled="offersResource.loading" @click="refreshOffers">Yenile</button>
        </div>
      </div>
      
      <div v-if="offersResource.loading" class="surface-card rounded-2xl p-6 text-sm text-slate-500">
        {{ t("loading") }}
      </div>
      <div
        v-else-if="offersLoadErrorText"
        class="surface-card rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-rose-700"
      >
        <p class="text-sm font-semibold">{{ t("loadErrorTitle") }}</p>
        <p class="mt-1 text-sm">{{ offersLoadErrorText }}</p>
      </div>
      <div v-else-if="offers.length === 0" class="surface-card rounded-2xl p-5">
        <EmptyState :title="t('emptyTitle')" :description="t('empty')" />
      </div>
      <div v-else class="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <article
          v-for="lane in lanes"
          :key="lane.key"
          class="surface-card flex min-h-[500px] flex-col rounded-2xl border-t-4 p-3"
          :class="lane.borderClass"
          @dragover.prevent
          @drop="onLaneDrop(lane.key)"
        >
          <header class="mb-3 flex items-center justify-between">
            <div>
              <p class="text-xs uppercase tracking-wide text-slate-500">{{ t("stage") }}</p>
              <h3 class="text-base font-semibold text-slate-900">{{ lane.label }}</h3>
            </div>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {{ laneRows(lane.key).length }}
            </span>
          </header>

          <div class="space-y-3 overflow-y-auto pr-1">
            <article
              v-for="offer in laneRows(lane.key)"
              :key="offer.name"
              class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              draggable="true"
              @dragstart="onCardDragStart(offer)"
              @dragend="onCardDragEnd"
            >
              <div class="flex items-start justify-between gap-2">
                <button
                  class="text-left text-sm font-semibold text-slate-900 hover:text-sky-700"
                  type="button"
                  @click.stop="openOfferDetail(offer.name)"
                >
                  {{ offer.name }}
                </button>
                <StatusBadge domain="offer" :status="offer.status" />
              </div>

              <div class="mt-3">
                <MiniFactList :items="offerCardFacts(offer)" />
              </div>

              <InlineActionRow class="mt-4">
                <ActionButton
                  v-if="isConvertible(offer)"
                  variant="primary"
                  size="xs"
                  @click="openConvertDialog(offer)"
                >
                  {{ t("convert") }}
                </ActionButton>
                <ActionButton
                  v-if="offer.converted_policy"
                  variant="secondary"
                  size="xs"
                  @click="openPolicyDetail(offer.converted_policy)"
                >
                  {{ t("openPolicy") }}
                </ActionButton>
              </InlineActionRow>
            </article>

            <div
              v-if="laneRows(lane.key).length === 0"
              class="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500"
            >
              {{ t("emptyLane") }}
            </div>
          </div>
        </article>
      </div>
    </div>

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

    <Dialog v-model="showConvertDialog" :options="{ title: t('convertDialogTitle'), size: 'xl' }">
      <template #body-content>
        <QuickCreateDialogShell :error="convertError" :show-footer="false">
          <p class="text-sm text-slate-600">
            {{ t("selectedOffer") }}: <strong class="text-slate-900">{{ selectedOffer?.name || "-" }}</strong>
          </p>
          <input v-model="convertForm.start_date" class="input" type="date" />
          <input v-model="convertForm.end_date" class="input" type="date" />
          <input
            v-model="convertForm.net_premium"
            class="input"
            :placeholder="t('netPremium')"
            type="number"
            min="0"
            step="0.01"
          />
          <input
            v-model="convertForm.tax_amount"
            class="input"
            :placeholder="t('taxAmount')"
            type="number"
            min="0"
            step="0.01"
          />
          <input
            v-model="convertForm.commission_amount"
            class="input"
            :placeholder="t('commissionAmount')"
            type="number"
            min="0"
            step="0.01"
          />
          <input v-model="convertForm.policy_no" class="input" :placeholder="t('policyNo')" type="text" />
        </QuickCreateDialogShell>
      </template>

      <template #actions>
        <button
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
          type="button"
          @click="showConvertDialog = false"
        >
          {{ t("cancel") }}
        </button>
        <button
          class="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          :disabled="convertLoading || !selectedOffer"
          type="button"
          @click="convertOffer"
        >
          {{ t("createPolicy") }}
        </button>
      </template>
    </Dialog>
  </section>
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
import EmptyStatefrom "../components/app-shell/EmptyState.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import MiniFactList from "../components/app-shell/MiniFactList.vue";
import QuickCreateDialogShellfrom "../components/app-shell/QuickCreateDialogShell.vue";
import QuickCreateFormRenderer from "../components/app-shell/QuickCreateFormRenderer.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import TablePagerFooter from "../components/app-shell/TablePagerFooter.vue";
import ListTablefrom "../components/ui/ListTable.vue";
import FilterBar from "../components/ui/FilterBar.vue";
import QuickCreateOffer from "../components/QuickCreateOffer.vue";
import { buildQuickCreateDraft, getQuickCreateConfig, getLocalizedText } from "../config/quickCreateRegistry";
import { mutedFact, subtleFact } from "../utils/factItems";
import { runQuickCreateSuccessTargets } from "../utils/quickCreateSuccess";
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
    title: "Teklif Panosu",
    subtitle: "Tekliflerinizi kanban görünümünde yönetin",
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
    quickCreateValidationFailed: "Lütfen gerekli alanlari kontrol edin.",
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
    presetExpiring7: "7 Gun Icerisinde Geçerlilik",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    savePresetPrompt: "Filtre şablonu adı",
    deletePresetConfirm: "Seçili özel filtre şablonu silinsin mi?",
    applyFilters: "Uygula",
    clearFilters: "Filtreleri Temizle",
    grossMinFilter: "Min Brüt Prim",
    grossMaxFilter: "Max Brüt Prim",
    actionableOnly: "Sadece Aksiyon Bekleyen",
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
    openDesk: "Yönetim",
    sortModifiedDesc: "Son Güncellenen",
    sortValidUntilAsc: "Geçerlilik (Yakın)",
    sortValidUntilDesc: "Geçerlilik (Uzak)",
    sortGrossDesc: "Brüt Prim (Yüksek)",
    stage: "Asama",
    loading: "Yükleniyor...",
    loadErrorTitle: "Teklifler Yüklenemedi",
    loadError: "Teklif panosu verileri yüklenirken bir hata oluştu. Lütfen tekrar deneyin.",
    emptyTitle: "Teklif Bulunamadı",
    empty: "Teklif kaydı bulunamadı.",
    emptyLane: "Bu asamada teklif yok.",
    customerName: "Müşteri Adi",
    premiumAmount: "Prim Tutarı",
    company: "Sigorta Şirketi",
    draftLane: "Taslak",
    sentLane: "Müşteriye Gönderildi",
    acceptedLane: "Kabul Edildi",
    convertedLane: "Poliçeye Dönüştü",
    convert: "Poliçeye Cevir",
    openPolicy: "Poliçe Detayını Aç",
    convertDialogTitle: "Teklif -> Poliçe",
    selectedOffer: "Seçili Teklif",
    netPremium: "Net Prim",
    taxAmount: "Vergi Tutarı",
    commissionAmount: "Komisyon Tutarı",
    policyNo: "Sigorta Şirketi Poliçe No (Opsiyonel)",
    cancel: "Vazgeç",
    createPolicy: "Poliçe Oluştur",
    statusDraft: "Taslak",
    statusSent: "Gönderildi",
    statusAçcepted: "Kabul Edildi",
    statusConverted: "Dönüştü",
    statusRejected: "Reddedildi",
    customerSearchFailed: "Müşteri araması başarısız oldu.",
    quickOfferCreateFailed: "Hızlı teklif oluşturma işlemi başarısız oldu.",
    statusUpdateFailed: "Teklif durumu güncellenemedi.",
    conversionFailed: "Teklif poliçeye dönüştürülemedi.",
  },
  en: {
    title: "Offer Board",
    subtitle: "Manage your offers in a Kanban view",
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
    openDesk: "Desk",
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
    openPolicy: "Open Policy Detail",
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
    statusAçcepted: "Accepted",
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
  url: "acentem_takipte.acentem_takipte.doctype.at_offer.at_offer.convert_to_policy",
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
  url: "acentem_takipte.acentem_takipte.doctype.at_offer.at_offer.create_quick_offer",
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

const offers = computed(() => offersResource.data || []);
const offerListRows = computed(() => offerListResource.data || []);
const branches = computed(() => branchResource.data || []);
const insuranceCompaniesForQuickCreate = computed(() =>
  (insuranceCompanyResource.data || []).map((row) => ({
    value: row.name,
    label: row.company_name || row.name,
  }))
);
const salesEntitiesForQuickCreate = computed(() =>
  (salesEntityResource.data || []).map((row) => ({
    value: row.name,
    label: row.full_name || row.name,
  }))
);
const customerSearchRows = computed(() => customerSearchResource.data || []);
const customerOptions = computed(() =>
  customerSearchRows.value.map((row) => ({
    label: row.full_name || row.name,
    value: row.name,
    description: row.tax_id || "",
  }))
);
const customerSearchLoading = computed(() => Boolean(customerSearchResource.loading));
const offerQuickConfig = getQuickCreateConfig("offer");
const offerQuickFields = computed(() => offerQuickConfig?.fields || []);
const offerQuickFormFields = computed(() =>
  offerQuickFields.value.filter((field) => !["customer_type", "tax_id", "phone", "email"].includes(field.name))
);
const offerQuickUi = computed(() => ({
  subtitle: getLocalizedText(offerQuickConfig?.subtitle, activeLocale.value),
}));
const offerQuickOptionsMap = computed(() => ({
  branches: branches.value.map((row) => ({ value: row.name, label: row.branch_name || row.name })),
  insuranceCompanies: insuranceCompaniesForQuickCreate.value,
  salesEntities: salesEntitiesForQuickCreate.value,
}));
const customerSearchErrorText = computed(() => {
  const err = customerSearchResource.error;
  if (!err) return "";
  return err?.messages?.join(" ") || err?.message || t("customerSearchFailed");
});
const offersLoadErrorText = computed(() => {
  const err = offersResource.error;
  if (!err) return "";
  return err?.messages?.join(" ") || err?.message || t("loadError");
});
const offerListLoadErrorText = computed(() => {
  const err = offerListResource.error;
  if (!err) return "";
  return err?.messages?.join(" ") || err?.message || t("loadError");
});
const showCustomerSuggestions = computed(() => {
  return (
    quickOffer.queryText.trim().length >= 2 &&
    !customerSearchLoading.value &&
    customerOptions.value.length > 0
  );
});
const showCustomerNoResults = computed(() => {
  return (
    quickOffer.queryText.trim().length >= 2 &&
    !customerSearchLoading.value &&
    !customerSearchErrorText.value &&
    customerOptions.value.length === 0
  );
});
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
const offerViewMode = ref("list");
const offerListFilters = reactive({
  query: "",
  insurance_company: "",
  status: "",
  valid_until: "",
  branch: "",
  actionable_only: false,
  gross_min: "",
  gross_max: "",
  sort: "modified_desc",
});
const OFFER_PRESET_STORAGE_KEY = "at:offer-list:preset";
const OFFER_PRESET_LIST_STORAGE_KEY = "at:offer-list:preset-list";
const offerPresetKey = ref(readFilterPresetKey(OFFER_PRESET_STORAGE_KEY, "default"));
const offerCustomPresets = ref(readFilterPresetList(OFFER_PRESET_LIST_STORAGE_KEY));
const offerListPagination = reactive({
  page: 1,
  pageLength: 20,
  total: 0,
});
const isListView = computed(() => offerViewMode.value === "list");
const offerCompanies = computed(() =>
  [...new Set(offers.value.map((row) => row.insurance_company).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)))
);
const offerStatusOptions = computed(() => [
  { value: "Draft", label: t("statusDraft") },
  { value: "Sent", label: t("statusSent") },
  { value: "Accepted", label: t("statusAçcepted") },
  { value: "Converted", label: t("statusConverted") },
  { value: "Rejected", label: t("statusRejected") },
]);
const offerSortOptions = computed(() => [
  { value: "modified_desc", label: t("sortModifiedDesc") },
  { value: "valid_until_asc", label: t("sortValidUntilAsc") },
  { value: "valid_until_desc", label: t("sortValidUntilDesc") },
  { value: "gross_premium_desc", label: t("sortGrossDesc") },
]);
const offerPresetOptions = computed(() => [
  { value: "default", label: t("presetDefault") },
  { value: "actionable", label: t("presetActionable") },
  { value: "converted", label: t("presetConverted") },
  { value: "expiring7", label: t("presetExpiring7") },
  ...offerCustomPresets.value.map((preset) => ({
    value: makeCustomFilterPresetValue(preset.id),
    label: preset.label,
  })),
]);
const canDeleteOfferPreset = computed(() => isCustomFilterPresetValue(offerPresetKey.value));
const offerListTotal = computed(() => Number(offerListPagination.total || 0));
const offerListTotalPages = computed(() => Math.max(1, Math.ceil((offerListTotal.value || 0) / offerListPagination.pageLength)));
const offerListHasNextPage = computed(() => offerListPagination.page < offerListTotalPages.value);
const offerListStartRow = computed(() => {
  if (!offerListTotal.value) return 0;
  return (offerListPagination.page - 1) * offerListPagination.pageLength + 1;
});
const offerListEndRow = computed(() => {
  if (!offerListTotal.value) return 0;
  return Math.min(offerListTotal.value, offerListPagination.page * offerListPagination.pageLength);
});
const pagedOfferRows = computed(() => offerListRows.value);
const isOfferListInitialLoading = computed(() => offerListResource.loading && offerListRows.value.length === 0);
const offerActiveFilterCount = computed(() =>
  [
    offerListFilters.query,
    offerListFilters.insurance_company,
    offerListFilters.status,
    offerListFilters.valid_until,
    offerListFilters.branch,
    offerListFilters.actionable_only ? "1" : "",
    offerListFilters.gross_min,
    offerListFilters.gross_max,
  ].filter((value) => String(value ?? "").trim() !== "").length
);

const offerListSearchQuery = computed({
  get: () => String(offerListFilters.query || ""),
  set: (value) => {
    offerListFilters.query = String(value || "");
  },
});

const offerListColumns = [
  { key: "name", label: "Teklif No", width: "160px", type: "mono" },
  { key: "customer", label: "Müşteri", width: "220px" },
  { key: "insurance_company", label: "Sigorta Şirketi", width: "200px" },
  { key: "status", label: "Durum", width: "120px", type: "status" },
  { key: "gross_premium", label: "Brüt Prim", width: "120px", type: "amount", align: "right" },
  { key: "remaining_days", label: "Kalan Gün", width: "100px", type: "urgency", align: "right" },
  { key: "valid_until", label: "Geçerlilik", width: "120px", type: "date" },
];

const offerListFilterConfig = computed(() => [
  {
    key: "insurance_company",
    label: "Sigorta Şirketi",
    options: offerCompanies.value.map((company) => ({ value: company, label: company })),
  },
  {
    key: "status",
    label: "Durum",
    options: offerStatusOptions.value.map((item) => ({ value: item.value, label: item.label })),
  },
]);

const offerListRowsWithUrgency = computed(() =>
  pagedOfferRows.value.map((row) => {
    const remainingDays = computeOfferRemainingDays(row.valid_until);
    return {
      ...row,
      remaining_days: remainingDays,
      _urgency: remainingDays <= 7 ? "row-critical" : remainingDays <= 30 ? "row-warning" : "",
    };
  })
);

const offerSummary = computed(() => {
  const rows = Array.isArray(offerListRows.value) ? offerListRows.value : [];
  let draft = 0;
  let sent = 0;
  let accepted = 0;
  let rejected = 0;
  let expired = 0;

  rows.forEach((row) => {
    const status = String(row?.status || "").toLocaleLowerCase(localeCode.value);
    if (status.includes("draft")) draft += 1;
    if (status.includes("sent")) sent += 1;
    if (status.includes("accepted")) accepted += 1;
    if (status.includes("rejected")) rejected += 1;
    if (status.includes("expired")) expired += 1;
  });

  return {
    total: offerListTotal.value,
    draft,
    sent,
    accepted,
    rejected,
    expired,
  };
});

const offerConversionRate = computed(() => {
  const total = Number(offerSummary.value.total || 0);
  if (!total) return "0.0";
  return ((Number(offerSummary.value.accepted || 0) / total) * 100).toFixed(1);
});

const offerListFilterBarActiveCount = computed(
  () =>
    (offerListSearchQuery.value.trim() ? 1 : 0) +
    (offerListFilters.insurance_company ? 1 : 0) +
    (offerListFilters.status ? 1 : 0)
);

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

function computeOfferRemainingDays(validUntil) {
  if (!validUntil) return null;
  const target = new Date(validUntil);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86400000);
}

const lanes = computed(() => [
  { key: "Draft", label: t("draftLane"), borderClass: "border-t-amber-400" },
  { key: "Sent", label: t("sentLane"), borderClass: "border-t-sky-400" },
  { key: "Accepted", label: t("acceptedLane"), borderClass: "border-t-emerald-400" },
  { key: "Converted", label: t("convertedLane"), borderClass: "border-t-indigo-400" },
]);

const showConvertDialog = ref(false);
const showQuickOfferDialog = ref(false);
const selectedOffer = ref(null);
const convertLoading = ref(false);
const convertError = ref("");
const quickOfferLoading = ref(false);
const quickOfferError = ref("");
const quickOfferFieldErrors = reactive({});
const draggedOfferName = ref("");
const quickOfferReturnTo = ref("");
const quickOfferOpenedFromIntent = ref(false);
const quickOfferSuccessHandlers = {
  offer_list: refreshOfferList,
  offer_board: async () => {
    offersResource.params = buildOfferBoardParams();
    await offersResource.reload();
  },
};
const quickOffer = reactive({
  queryText: "",
  customerOption: null,
  createCustomerMode: false,
  ...buildQuickCreateDraft(offerQuickConfig),
});
const convertForm = reactive({
  start_date: today(),
  end_date: oneYearLater(),
  net_premium: "",
  tax_amount: "0",
  commission_amount: "0",
  policy_no: "",
});

const canCreateQuickOffer = computed(() => {
  const selectedName = getSelectedCustomerName();
  const typedName = quickOffer.queryText.trim();
  return Boolean(selectedName || (quickOffer.createCustomerMode && typedName));
});

function clearQuickOfferFieldErrors() {
  Object.keys(quickOfferFieldErrors).forEach((key) => {
    delete quickOfferFieldErrors[key];
  });
}

function validateQuickOfferForm() {
  clearQuickOfferFieldErrors();
  quickOfferError.value = "";
  let valid = true;

  const selectedCustomerName = getSelectedCustomerName();
  const typedName = quickOffer.queryText.trim();
  const shouldCreateCustomer = !selectedCustomerName && Boolean(quickOffer.createCustomerMode);
  if (!selectedCustomerName && !shouldCreateCustomer) {
    quickOfferFieldErrors.customer =
      activeLocale.value === "tr"
        ? "Bir müşteri seçin veya yeni müşteri ekleyin."
        : "Select a customer or add a new customer.";
    valid = false;
  }
  if (shouldCreateCustomer && !typedName) {
    quickOfferFieldErrors.customer =
      activeLocale.value === "tr" ? "Yeni müşteri adı gerekli." : "New customer name is required.";
    valid = false;
  }

  for (const field of offerQuickFormFields.value) {
    if (!isFieldRequired(field)) continue;
    const rawValue = quickOffer[field.name];
    const empty = typeof rawValue === "boolean" ? false : String(rawValue ?? "").trim() === "";
    if (empty) {
      quickOfferFieldErrors[field.name] =
        getLocalizedText(field.label, activeLocale.value) || t("quickCreateValidationFailed");
      valid = false;
    }
  }

  if (shouldCreateCustomer) {
    const customerType = normalizeCustomerType(quickOffer.customer_type, quickOffer.tax_id);
    const identityNumber = normalizeIdentityNumber(quickOffer.tax_id);
    if (customerType === "Corporate") {
      if (identityNumber.length !== 10) {
        quickOfferFieldErrors.tax_id = activeLocale.value === "tr"
          ? "Vergi numarası 10 haneli olmalıdır."
          : "Tax number must be 10 digits.";
        valid = false;
      }
    } else if (identityNumber.length !== 11) {
      quickOfferFieldErrors.tax_id = activeLocale.value === "tr"
        ? "TC kimlik numarası 11 haneli olmalıdır."
        : "T.R. identity number must be 11 digits.";
      valid = false;
    } else if (!isValidTckn(identityNumber)) {
      quickOfferFieldErrors.tax_id = activeLocale.value === "tr"
        ? "Geçerli bir TC kimlik numarası girin."
        : "Enter a valid T.R. identity number.";
      valid = false;
    }
  }

  const gross = Number(quickOffer.gross_premium || 0);
  const status = String(quickOffer.status || "Draft");
  if (["Sent", "Accepted", "Rejected"].includes(status) && gross <= 0) {
    quickOfferFieldErrors.gross_premium = t("grossPremium");
    valid = false;
  }

  if (!valid && !quickOfferError.value) {
    quickOfferError.value = t("quickCreateValidationFailed");
  }
  return valid;
}

function validateQuickOfferManaged({ form, fieldErrors, setError }) {
  Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key]);
  let valid = true;

  for (const field of offerQuickFormFields.value) {
    if (!isFieldRequired(field)) continue;
    const rawValue = form?.[field.name];
    const empty = typeof rawValue === "boolean" ? false : String(rawValue ?? "").trim() === "";
    if (empty) {
      fieldErrors[field.name] = getLocalizedText(field.label, activeLocale.value) || t("quickCreateValidationFailed");
      valid = false;
    }
  }

  const gross = Number(form?.gross_premium || 0);
  const status = String(form?.status || "Draft");
  if (["Sent", "Accepted", "Rejected"].includes(status) && gross <= 0) {
    fieldErrors.gross_premium = t("grossPremium");
    valid = false;
  }

  if (!valid) setError(t("quickCreateValidationFailed"));
  return valid;
}

function buildQuickOfferPayload() {
  const selectedCustomerName = getSelectedCustomerName();
  const hasSelectedCustomer = Boolean(selectedCustomerName);
  const shouldCreateCustomer = !hasSelectedCustomer && Boolean(quickOffer.createCustomerMode);
  const customerType = normalizeCustomerType(quickOffer.customer_type, quickOffer.tax_id);
  const taxId = normalizeIdentityNumber(quickOffer.tax_id);
  return {
    customer: selectedCustomerName || null,
    customer_name: shouldCreateCustomer ? quickOffer.queryText.trim() : null,
    customer_type: shouldCreateCustomer ? customerType : null,
    tax_id: shouldCreateCustomer ? taxId || null : null,
    phone: shouldCreateCustomer ? String(quickOffer.phone || "").trim() || null : null,
    email: shouldCreateCustomer ? String(quickOffer.email || "").trim() || null : null,
    branch: quickOffer.branch || null,
    notes: quickOffer.notes || null,
    currency: quickOffer.currency || "TRY",
    offer_date: quickOffer.offer_date || null,
    valid_until: quickOffer.valid_until || null,
    insurance_company: quickOffer.insurance_company || null,
    sales_entity: quickOffer.sales_entity || null,
    status: quickOffer.status || "Draft",
    gross_premium: quickOffer.gross_premium === "" ? null : Number(quickOffer.gross_premium || 0),
    net_premium: quickOffer.net_premium === "" ? null : Number(quickOffer.net_premium || 0),
    tax_amount: quickOffer.tax_amount === "" ? null : Number(quickOffer.tax_amount || 0),
    commission_amount: quickOffer.commission_amount === "" ? null : Number(quickOffer.commission_amount || 0),
  };
}

function buildQuickOfferManagedPayload({ form }) {
  const payload = {};
  for (const field of offerQuickFormFields.value) {
    const fieldName = field?.name;
    if (!fieldName) continue;
    const value = form?.[fieldName];
    payload[fieldName] = String(value ?? "").trim() === "" ? null : value;
  }

  payload.currency = payload.currency || "TRY";
  payload.status = payload.status || "Draft";
  payload.gross_premium = payload.gross_premium == null ? null : Number(payload.gross_premium || 0);
  payload.net_premium = payload.net_premium == null ? null : Number(payload.net_premium || 0);
  payload.tax_amount = payload.tax_amount == null ? null : Number(payload.tax_amount || 0);
  payload.commission_amount = payload.commission_amount == null ? null : Number(payload.commission_amount || 0);

  return payload;
}

function onQuickOfferManagedCreated({ recordName, openAfter }) {
  const returnTarget = quickOfferOpenedFromIntent.value ? quickOfferReturnTo.value : "";
  quickOfferOpenedFromIntent.value = false;
  quickOfferReturnTo.value = "";
  if (!openAfter && returnTarget) {
    router.push(returnTarget).catch(() => {});
    return;
  }
  if (openAfter && recordName) openOfferDetail(recordName);
}

function normalizeLane(status, convertedPolicy) {
  if (convertedPolicy || status === "Converted") return "Converted";
  if (status === "Accepted") return "Accepted";
  if (status === "Sent") return "Sent";
  return "Draft";
}

function laneRows(laneKey) {
  return offers.value.filter((offer) => normalizeLane(offer.status, offer.converted_policy) === laneKey);
}

function offerCardFacts(offer) {
  return [
    {
      key: "customer",
      label: t("customerName"),
      value: offer?.customer || "-",
    },
    {
      key: "premium",
      label: t("premiumAmount"),
      value: formatCurrency(offer?.gross_premium, offer?.currency || "TRY"),
      valueClass: "font-semibold text-slate-900",
    },
    {
      key: "company",
      label: t("company"),
      value: offer?.insurance_company || "-",
      valueClass: "text-xs text-slate-500",
      wrapperClass: "pt-1",
    },
  ];
}

function buildOfferListOrderBy() {
  if (offerListFilters.sort === "valid_until_asc") return "valid_until asc";
  if (offerListFilters.sort === "valid_until_desc") return "valid_until desc";
  if (offerListFilters.sort === "gross_premium_desc") return "gross_premium desc";
  return "modified desc";
}

function buildOfferFilterPayload() {
  const filters = {};
  const out = { filters };
  const officeBranch = branchStore.requestBranch || "";

  if (offerListFilters.insurance_company) filters.insurance_company = offerListFilters.insurance_company;
  if (offerListFilters.valid_until) filters.valid_until = ["<=", offerListFilters.valid_until];
  if (offerListFilters.branch) filters.branch = offerListFilters.branch;
  if (officeBranch) filters.office_branch = officeBranch;
  if (offerListFilters.gross_min !== "") filters.gross_premium = [">=", Number(offerListFilters.gross_min || 0)];
  if (offerListFilters.gross_max !== "") {
    if (Array.isArray(filters.gross_premium)) {
      filters.gross_premium = ["between", [Number(offerListFilters.gross_min || 0), Number(offerListFilters.gross_max || 0)]];
    } else {
      filters.gross_premium = ["<=", Number(offerListFilters.gross_max || 0)];
    }
  }

  if (offerListFilters.actionable_only) {
    filters.status = ["in", ["Sent", "Accepted"]];
    filters.converted_policy = ["is", "not set"];
  } else if (offerListFilters.status) {
    if (offerListFilters.status === "Converted") {
      filters.converted_policy = ["is", "set"];
    } else {
      filters.status = offerListFilters.status;
    }
  }
  if (offerListFilters.query) {
    out.or_filters = [
      ["AT Offer", "name", "like", `%${offerListFilters.query}%`],
      ["AT Offer", "customer", "like", `%${offerListFilters.query}%`],
      ["AT Offer", "insurance_company", "like", `%${offerListFilters.query}%`],
    ];
  }

  return out;
}

function isoDateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return formatDate(date);
}

function applyOfferPreset(key, { refresh = true } = {}) {
  const requested = String(key || "default");

  if (isCustomFilterPresetValue(requested)) {
    const customId = extractCustomFilterPresetId(requested);
    const presetRow = offerCustomPresets.value.find((item) => item.id === customId);
    if (!presetRow) {
      applyOfferPreset("default", { refresh });
      return;
    }
    const payload = presetRow.payload || {};
    offerPresetKey.value = requested;
    writeFilterPresetKey(OFFER_PRESET_STORAGE_KEY, requested);
    offerListFilters.query = String(payload.query || "");
    offerListFilters.insurance_company = String(payload.insurance_company || "");
    offerListFilters.status = String(payload.status || "");
    offerListFilters.valid_until = String(payload.valid_until || "");
    offerListFilters.branch = String(payload.branch || "");
    offerListFilters.actionable_only = Boolean(payload.actionable_only);
    offerListFilters.gross_min = payload.gross_min != null ? String(payload.gross_min) : "";
    offerListFilters.gross_max = payload.gross_max != null ? String(payload.gross_max) : "";
    offerListFilters.sort = String(payload.sort || "modified_desc");
    offerListPagination.pageLength = Number(payload.pageLength || 20) || 20;
    offerListPagination.page = 1;
    if (refresh) refreshOffers();
    return;
  }

  const preset = requested;
  offerPresetKey.value = preset;
  writeFilterPresetKey(OFFER_PRESET_STORAGE_KEY, preset);

  offerListFilters.query = "";
  offerListFilters.insurance_company = "";
  offerListFilters.status = "";
  offerListFilters.valid_until = "";
  offerListFilters.branch = "";
  offerListFilters.actionable_only = false;
  offerListFilters.gross_min = "";
  offerListFilters.gross_max = "";
  offerListFilters.sort = "modified_desc";
  offerListPagination.pageLength = 20;

  if (preset === "actionable") {
    offerListFilters.actionable_only = true;
    offerListFilters.sort = "valid_until_asc";
  } else if (preset === "converted") {
    offerListFilters.status = "Converted";
  } else if (preset === "expiring7") {
    offerListFilters.valid_until = isoDateOffset(7);
    offerListFilters.sort = "valid_until_asc";
  }

  offerListPagination.page = 1;
  if (refresh) refreshOffers();
}

function onOfferPresetChange() {
  applyOfferPreset(offerPresetKey.value, { refresh: true });
  void persistOfferPresetStateToServer();
}

function currentOfferPresetPayload() {
  return {
    query: offerListFilters.query,
    insurance_company: offerListFilters.insurance_company,
    status: offerListFilters.status,
    valid_until: offerListFilters.valid_until,
    branch: offerListFilters.branch,
    actionable_only: Boolean(offerListFilters.actionable_only),
    gross_min: offerListFilters.gross_min,
    gross_max: offerListFilters.gross_max,
    sort: offerListFilters.sort,
    pageLength: offerListPagination.pageLength,
  };
}

function saveOfferPreset() {
  const currentCustomId = extractCustomFilterPresetId(offerPresetKey.value);
  const currentCustom = currentCustomId ? offerCustomPresets.value.find((item) => item.id === currentCustomId) : null;
  const initialName = currentCustom?.label || "";
  const name = String(window.prompt(t("savePresetPrompt"), initialName) || "").trim();
  if (!name) return;

  const existing = offerCustomPresets.value.find((item) => item.label.toLowerCase() === name.toLowerCase());
  const targetId = currentCustomId || existing?.id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const nextList = offerCustomPresets.value.filter((item) => item.id !== targetId);
  nextList.push({
    id: targetId,
    label: name,
    payload: currentOfferPresetPayload(),
  });
  offerCustomPresets.value = nextList.sort((a, b) => a.label.localeCompare(b.label, localeCode.value));
  writeFilterPresetList(OFFER_PRESET_LIST_STORAGE_KEY, offerCustomPresets.value);
  offerPresetKey.value = makeCustomFilterPresetValue(targetId);
  writeFilterPresetKey(OFFER_PRESET_STORAGE_KEY, offerPresetKey.value);
  void persistOfferPresetStateToServer();
}

function deleteOfferPreset() {
  if (!canDeleteOfferPreset.value) return;
  if (!window.confirm(t("deletePresetConfirm"))) return;
  const customId = extractCustomFilterPresetId(offerPresetKey.value);
  if (!customId) return;
  offerCustomPresets.value = offerCustomPresets.value.filter((item) => item.id !== customId);
  writeFilterPresetList(OFFER_PRESET_LIST_STORAGE_KEY, offerCustomPresets.value);
  applyOfferPreset("default", { refresh: true });
  void persistOfferPresetStateToServer();
}

function buildOfferBoardParams() {
  const payload = buildOfferFilterPayload();
  return {
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
    filters: payload.filters,
    ...(payload.or_filters ? { or_filters: payload.or_filters } : {}),
    order_by: buildOfferListOrderBy(),
    limit_page_length: 100,
  };
}

function buildOfferListParams() {
  const payload = buildOfferFilterPayload();
  return {
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
    filters: payload.filters,
    ...(payload.or_filters ? { or_filters: payload.or_filters } : {}),
    order_by: buildOfferListOrderBy(),
    limit_start: (offerListPagination.page - 1) * offerListPagination.pageLength,
    limit_page_length: offerListPagination.pageLength,
  };
}

function buildOfferExportQuery() {
  const payload = buildOfferFilterPayload();
  return {
    filters: payload.filters,
    ...(payload.or_filters ? { or_filters: payload.or_filters } : {}),
    order_by: buildOfferListOrderBy(),
  };
}

function downloadOfferExport(format) {
  openListExport({
    screen: "offer_list",
    query: buildOfferExportQuery(),
    format,
    limit: 1000,
  });
}

function buildOfferListCountParams() {
  const payload = buildOfferFilterPayload();
  return {
    doctype: "AT Offer",
    filters: payload.filters,
    ...(payload.or_filters ? { or_filters: payload.or_filters } : {}),
  };
}

async function refreshOfferList() {
  offerListResource.params = buildOfferListParams();
  offerListCountResource.params = buildOfferListCountParams();

  const [recordsResult, countResult] = await Promise.allSettled([
    offerListResource.reload(),
    offerListCountResource.reload(),
  ]);

  if (recordsResult.status === "fulfilled") {
    const records = recordsResult.value || [];
    offerListResource.setData(records);

    if (countResult.status === "fulfilled") {
      const total = Number(countResult.value || 0);
      offerListPagination.total = Number.isFinite(total) ? total : 0;
    } else {
      offerListPagination.total = records.length;
    }
    return;
  }

  offerListPagination.total = 0;
  offerListResource.setData([]);
}

async function refreshOffers() {
  offersResource.params = buildOfferBoardParams();
  const tasks = [offersResource.reload()];
  if (isListView.value) tasks.push(refreshOfferList());
  await Promise.allSettled(tasks);
}

function setOfferViewMode(mode) {
  offerViewMode.value = mode === "board" ? "board" : "list";
  refreshOffers();
}

function applyOfferListFilters() {
  offerListPagination.page = 1;
  refreshOffers();
}

function resetOfferListFilters() {
  offerPresetKey.value = "default";
  writeFilterPresetKey(OFFER_PRESET_STORAGE_KEY, "default");
  offerListFilters.query = "";
  offerListFilters.insurance_company = "";
  offerListFilters.status = "";
  offerListFilters.valid_until = "";
  offerListFilters.branch = "";
  offerListFilters.actionable_only = false;
  offerListFilters.gross_min = "";
  offerListFilters.gross_max = "";
  offerListFilters.sort = "modified_desc";
  offerListPagination.pageLength = 20;
  offerListPagination.page = 1;
  void persistOfferPresetStateToServer();
  refreshOffers();
}

function hasMeaningfulOfferPresetState(selectedKey, presets) {
  return String(selectedKey || "default") !== "default" || (Array.isArray(presets) && presets.length > 0);
}

async function persistOfferPresetStateToServer() {
  try {
    await offerPresetServerWriteResource.submit({
      screen: "offer_list",
      selected_key: offerPresetKey.value,
      custom_presets: offerCustomPresets.value,
    });
  } catch {
    // Keep localStorage as fallback; server sync is best-effort.
  }
}

async function hydrateOfferPresetStateFromServer() {
  try {
    const remote = await offerPresetServerReadResource.reload({ screen: "offer_list" });
    const remoteSelectedKey = String(remote?.selected_key || "default");
    const remoteCustomPresets = Array.isArray(remote?.custom_presets) ? remote.custom_presets : [];

    const localHasState = hasMeaningfulOfferPresetState(offerPresetKey.value, offerCustomPresets.value);
    const remoteHasState = hasMeaningfulOfferPresetState(remoteSelectedKey, remoteCustomPresets);

    if (!remoteHasState) {
      if (localHasState) {
        void persistOfferPresetStateToServer();
      }
      return;
    }

    const localSnapshot = JSON.stringify({
      selected_key: offerPresetKey.value,
      custom_presets: offerCustomPresets.value,
    });
    const remoteSnapshot = JSON.stringify({
      selected_key: remoteSelectedKey,
      custom_presets: remoteCustomPresets,
    });

    if (localSnapshot === remoteSnapshot) return;

    offerCustomPresets.value = remoteCustomPresets;
    writeFilterPresetList(OFFER_PRESET_LIST_STORAGE_KEY, offerCustomPresets.value);
    applyOfferPreset(remoteSelectedKey, { refresh: true });
  } catch {
    // Keep local-only behavior on any API error.
  }
}

function previousOfferPage() {
  if (offerListPagination.page <= 1) return;
  offerListPagination.page -= 1;
  refreshOfferList();
}

function nextOfferPage() {
  if (!offerListHasNextPage.value) return;
  offerListPagination.page += 1;
  refreshOfferList();
}

function offerIdentityFacts(offer) {
  return [
    subtleFact("record", t("recordId"), offer?.name || "-"),
    mutedFact("offerDate", t("offerDate"), formatDisplayDate(offer?.offer_date)),
  ];
}

function offerDetailsFacts(offer) {
  return [
    mutedFact("customer", t("customerName"), offer?.customer || "-"),
    mutedFact("company", t("company"), offer?.insurance_company || "-"),
    mutedFact("validUntil", t("validUntil"), formatDisplayDate(offer?.valid_until)),
  ];
}

function offerPremiumFacts(offer) {
  return [
    mutedFact("grossPremium", t("grossPremium"), formatCurrency(offer?.gross_premium, offer?.currency || "TRY")),
    mutedFact("netPremium", t("netPremiumShort"), formatCurrency(offer?.net_premium, offer?.currency || "TRY")),
    mutedFact(
      "commission",
      t("commissionShort"),
      formatCurrency(offer?.commission_amount, offer?.currency || "TRY")
    ),
  ];
}

function openQuickOfferDialog({ fromIntent = false, returnTo = "" } = {}) {
  resetQuickOfferForm();
  quickOfferOpenedFromIntent.value = !!fromIntent;
  quickOfferReturnTo.value = returnTo || "";
  showQuickOfferDialog.value = true;
}
function openQuickOfferDialogForCustomer(prefill, options = {}) {
  openQuickOfferDialog(options);
  const customerName = String(prefill?.customer || "").trim();
  const customerLabel = String(prefill?.customer_label || customerName).trim();
  if (!customerName) return;
  quickOffer.customerOption = {
    value: customerName,
    label: customerLabel || customerName,
  };
  quickOffer.queryText = customerLabel || customerName;
}

function applyQuickOfferPrefills(prefills = {}) {
  if (!prefills || typeof prefills !== "object") return;
  for (const field of offerQuickFields.value) {
    const fieldName = String(field?.name || "").trim();
    if (!fieldName || !(fieldName in prefills)) continue;
    quickOffer[fieldName] = String(prefills[fieldName] ?? "").trim();
  }
  if ("createCustomerMode" in prefills) {
    quickOffer.createCustomerMode = String(prefills.createCustomerMode || "") === "1";
  }
}

function buildQuickOfferReturnTo() {
  const prefills = {};
  for (const field of offerQuickFields.value) {
    const fieldName = String(field?.name || "").trim();
    if (!fieldName) continue;
    const value = String(quickOffer[fieldName] ?? "").trim();
    if (!value) continue;
    prefills[fieldName] = value;
  }
  const customerName = String(quickOffer?.customerOption?.value || "").trim();
  const customerLabel = String(quickOffer.queryText || quickOffer?.customerOption?.label || "").trim();
  if (customerName) prefills.customer = customerName;
  if (customerLabel) prefills.customer_label = customerLabel;
  if (!customerName && customerLabel) prefills.queryText = customerLabel;
  if (quickOffer.createCustomerMode) prefills.createCustomerMode = "1";

  return router.resolve({
    name: "offer-board",
    query: buildQuickCreateIntentQuery({ prefills }),
  }).fullPath;
}

function onOfferRelatedCreateRequested(request = {}) {
  const navigation = buildRelatedQuickCreateNavigation({
    optionsSource: request?.optionsSource,
    query: request?.query,
    returnTo: buildQuickOfferReturnTo(),
  });
  if (!navigation) return;
  router.push(navigation).catch(() => {});
}

function cancelQuickOfferDialog() {
  showQuickOfferDialog.value = false;
  if (quickOfferOpenedFromIntent.value && quickOfferReturnTo.value) {
    const target = quickOfferReturnTo.value;
    quickOfferOpenedFromIntent.value = false;
    quickOfferReturnTo.value = "";
    router.push(target).catch(() => {});
    return;
  }
  quickOfferOpenedFromIntent.value = false;
  quickOfferReturnTo.value = "";
}

function onCustomerInput(event) {
  const value = String(event?.target?.value || "");
  quickOffer.queryText = value;

  const selectedOption = quickOffer.customerOption;
  if (selectedOption && typeof selectedOption === "object") {
    const selectedLabel = String(selectedOption.label || selectedOption.value || "").trim();
    if (selectedLabel !== value.trim()) {
      quickOffer.customerOption = null;
    }
  }

  onCustomerQuery(value);
}

function onCustomerQuery(value) {
  quickOffer.queryText = String(value || "");
  const query = quickOffer.queryText.trim();
  customerSearchResource.error = null;
  if (query.length < 2) {
    customerSearchResource.setData([]);
    customerSearchResource.error = null;
    return;
  }

  customerSearchResource
    .reload({
      doctype: "AT Customer",
      fields: ["name", "full_name", "tax_id"],
      filters: buildOfficeBranchLookupFilters(),
      or_filters: [
        ["AT Customer", "full_name", "like", `%${query}%`],
        ["AT Customer", "name", "like", `%${query}%`],
        ["AT Customer", "tax_id", "like", `%${query}%`],
      ],
      order_by: "modified desc",
      limit_page_length: 20,
    })
    .catch(() => {
      customerSearchResource.setData([]);
    });
}

function selectCustomerOption(option) {
  quickOffer.customerOption = option;
  quickOffer.queryText = String(option?.label || option?.value || "");
  customerSearchResource.setData([]);
  customerSearchResource.error = null;
}

function clearSelectedCustomer() {
  quickOffer.customerOption = null;
  onCustomerQuery(quickOffer.queryText);
}

function getSelectedCustomerName() {
  const option = quickOffer.customerOption;
  if (!option) return "";
  if (typeof option === "string") return option.trim();
  if (typeof option === "object") {
    return String(option.value || option.name || "").trim();
  }
  return "";
}

async function createQuickOffer(openAfter = false) {
  if (!canCreateQuickOffer.value) return;
  if (!validateQuickOfferForm()) return;
  quickOfferLoading.value = true;
  quickOfferError.value = "";
  try {
    const response = await createQuickOfferResource.submit(buildQuickOfferPayload());
    const offerName = response?.offer || createQuickOfferResource.data?.offer;
    showQuickOfferDialog.value = false;
    resetQuickOfferForm();
    await runQuickCreateSuccessTargets(offerQuickConfig?.successRefreshTargets, {
      offer_list: refreshOfferList,
      offer_board: async () => {
        offersResource.params = buildOfferBoardParams();
        await offersResource.reload();
      },
    });
    const returnTarget = quickOfferOpenedFromIntent.value ? quickOfferReturnTo.value : "";
    quickOfferOpenedFromIntent.value = false;
    quickOfferReturnTo.value = "";
    if (!openAfter && returnTarget) {
      router.push(returnTarget).catch(() => {});
      return;
    }
    if (offerName && openAfter) openOfferDetail(offerName);
  } catch (error) {
    quickOfferError.value = error?.messages?.join(" ") || error?.message || t("quickOfferCreateFailed");
  } finally {
    quickOfferLoading.value = false;
  }
}

function resetQuickOfferForm() {
  quickOffer.customerOption = null;
  quickOffer.queryText = "";
  quickOffer.createCustomerMode = false;
  Object.assign(quickOffer, buildQuickCreateDraft(offerQuickConfig));
  quickOfferError.value = "";
  clearQuickOfferFieldErrors();
  customerSearchResource.setData([]);
  customerSearchResource.error = null;
}

function consumeQuickOfferRouteIntent() {
  const intent = readQuickCreateIntent(route.query);
  const legacyCustomerName = String(route.query?.customer || "").trim();
  const legacyCustomerLabel = String(route.query?.customer_label || legacyCustomerName).trim();
  const customerName = String(intent?.prefills?.customer || legacyCustomerName).trim();
  const customerLabel = String(intent?.prefills?.customer_label || legacyCustomerLabel || customerName).trim();
  if (!intent.quick) return;
  if (customerName) {
    openQuickOfferDialogForCustomer(
      { customer: customerName, customer_label: customerLabel },
      { fromIntent: true, returnTo: intent.returnTo }
    );
  } else {
    openQuickOfferDialog({ fromIntent: true, returnTo: intent.returnTo });
  }
  applyQuickOfferPrefills(intent.prefills || {});
  const nextQuery = stripQuickCreateIntentQuery(route.query, ["customer", "customer_label"]);
  router.replace({ name: "offer-board", query: nextQuery }).catch(() => {});
}

async function consumeConvertOfferRouteIntent() {
  const offerName = String(route.query?.convert_offer || "").trim();
  if (!offerName) return;

  const clearIntent = () => {
    const nextQuery = { ...route.query };
    delete nextQuery.convert_offer;
    router.replace({ name: "offer-board", query: nextQuery }).catch(() => {});
  };

  try {
    let targetOffer =
      offers.value.find((row) => row.name === offerName) ||
      offerListRows.value.find((row) => row.name === offerName) ||
      null;

    if (!targetOffer) {
      targetOffer = await offerLookupResource.reload({ doctype: "AT Offer", name: offerName });
    }

    if (!targetOffer) {
      convertError.value = t("conversionFailed");
      return;
    }
    if (!isConvertible(targetOffer)) {
      convertError.value = t("conversionFailed");
      return;
    }

    setOfferViewMode("list");
    openConvertDialog(targetOffer);
  } catch (error) {
    convertError.value = error?.messages?.join(" ") || error?.message || t("conversionFailed");
  } finally {
    clearIntent();
  }
}

async function consumeOfferRouteIntents() {
  if (String(route.query?.convert_offer || "").trim()) {
    await consumeConvertOfferRouteIntent();
    return;
  }
  consumeQuickOfferRouteIntent();
}

function isConvertible(offer) {
  return !offer.converted_policy && ["Sent", "Accepted"].includes(offer.status);
}

function onCardDragStart(offer) {
  draggedOfferName.value = offer?.name || "";
}

function onCardDragEnd() {
  draggedOfferName.value = "";
}

async function onLaneDrop(laneKey) {
  try {
    const offerName = draggedOfferName.value;
    onCardDragEnd();
    if (!offerName) return;

    const current = offers.value.find((offer) => offer.name === offerName);
    if (!current || current.converted_policy) return;

    const targetStatus = laneToStatus(laneKey);
    if (!targetStatus) return;

    let nextOffer = current;
    if (current.status !== targetStatus) {
      await updateOfferStatusResource.submit({
        doctype: "AT Offer",
        name: current.name,
        fieldname: {
          status: targetStatus,
        },
      });
      await offersResource.reload();
      await refreshOfferList();
      nextOffer = (offersResource.data || []).find((offer) => offer.name === offerName) || {
        ...current,
        status: targetStatus,
      };
    }

    if (laneKey === "Accepted" && !nextOffer.converted_policy) {
      openConvertDialog(nextOffer);
    }
  } catch (error) {
    convertError.value = error?.messages?.join(" ") || error?.message || t("statusUpdateFailed");
  }
}

function laneToStatus(laneKey) {
  if (laneKey === "Draft") return "Draft";
  if (laneKey === "Sent") return "Sent";
  if (laneKey === "Accepted") return "Accepted";
  return null;
}

function openConvertDialog(offer) {
  selectedOffer.value = offer;
  convertError.value = "";
  convertForm.start_date = today();
  convertForm.end_date = oneYearLater();
  convertForm.net_premium = Number(offer.net_premium || 0) > 0 ? String(offer.net_premium) : "";
  convertForm.tax_amount = String(Number(offer.tax_amount || 0));
  convertForm.commission_amount = String(Number(offer.commission_amount || 0));
  convertForm.policy_no = "";
  showConvertDialog.value = true;
}

async function convertOffer() {
  if (!selectedOffer.value) return;
  convertLoading.value = true;
  convertError.value = "";
  try {
    const payload = await convertResource.submit({
      offer_name: selectedOffer.value.name,
      start_date: convertForm.start_date,
      end_date: convertForm.end_date,
      net_premium: convertForm.net_premium ? Number(convertForm.net_premium) : null,
      tax_amount: Number(convertForm.tax_amount || 0),
      commission_amount: Number(convertForm.commission_amount || 0),
      policy_no: convertForm.policy_no || null,
    });

    const policyName = payload?.policy || convertResource.data?.policy || null;
    showConvertDialog.value = false;
    await offersResource.reload();
    await refreshOfferList();
    if (policyName) {
      openPolicyDetail(policyName);
    }
  } catch (error) {
    convertError.value = error?.messages?.join(" ") || error?.message || t("conversionFailed");
  } finally {
    convertLoading.value = false;
  }
}

function openPolicyDetail(policyName) {
  router.push({ name: "policy-detail", params: { name: policyName } });
}
function openOfferDetail(offerName) {
  if (!offerName) return;
  router.push({ name: "offer-detail", params: { name: offerName } });
}

function compareDateValues(a, b, direction = "asc") {
  const aTs = a ? new Date(a).getTime() : null;
  const bTs = b ? new Date(b).getTime() : null;

  if (!Number.isFinite(aTs) && !Number.isFinite(bTs)) return 0;
  if (!Number.isFinite(aTs)) return direction === "asc" ? 1 : -1;
  if (!Number.isFinite(bTs)) return direction === "asc" ? -1 : 1;

  return direction === "asc" ? aTs - bTs : bTs - aTs;
}

function formatCurrency(value, currency) {
  return new Intl.NumberFormat(localeCode.value, {
    style: "currency",
    currency: currency || "TRY",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatCount(value) {
  return Number(value || 0).toLocaleString(localeCode.value);
}

function formatDisplayDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(localeCode.value).format(new Date(value));
}

function today() {
  return formatDate(new Date());
}

function oneYearLater() {
  const date = new Date();
  date.setDate(date.getDate() + 365);
  return formatDate(date);
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
void consumeOfferRouteIntents();
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 px-3 py-2 text-sm;
}
</style>
