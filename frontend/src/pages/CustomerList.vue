<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="formatCount(customerListTotalCount)"
    :record-count-label="t('recordCount')"
  >
    <template #actions>
      <button class="btn btn-primary btn-sm" @click="openQuickCustomerDialog">+ {{ t('newCustomer') }}</button>
      <button class="btn btn-outline btn-sm" :disabled="customerListLoading" @click="refreshCustomerList">{{ t('refresh') }}</button>
      <button class="btn btn-outline btn-sm" :disabled="customerListLoading" @click="downloadCustomerExport('xlsx')">{{ t('exportXlsx') }}</button>
      <button class="btn btn-outline btn-sm" :disabled="customerListLoading" @click="downloadCustomerExport('pdf')">{{ t('exportPdf') }}</button>
    </template>

    <template #metrics>
      <div class="w-full grid grid-cols-1 gap-4 md:grid-cols-4">
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryTotal") }}</p>
          <p class="mini-metric-value">{{ formatCount(customerListSummary.total) }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryActive") }}</p>
          <p class="mini-metric-value text-brand-600">{{ formatCount(customerListSummary.active) }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryIndividual") }}</p>
          <p class="mini-metric-value text-blue-600">{{ formatCount(customerListSummary.individual) }}</p>
        </div>
        <div class="mini-metric">
          <p class="mini-metric-label">{{ t("summaryCorporate") }}</p>
          <p class="mini-metric-value text-violet-600">{{ formatCount(customerListSummary.corporate) }}</p>
        </div>
      </div>
    </template>

    <article v-if="loadErrorText" class="qc-error-banner">
      <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
      <p class="qc-error-banner__text mt-1">{{ loadErrorText }}</p>
    </article>

    <SectionPanel
      :title="t('filtersTitle')"
      :count="`${customerListActiveCount} ${t('activeFilters')}`"
      panel-class="surface-card rounded-2xl p-4"
    >
      <FilterBar
        v-model:search="customerListSearchQuery"
        :filters="customerListFilterConfig"
        :active-count="customerListActiveCount"
        @filter-change="onCustomerListFilterChange"
        @reset="onCustomerListFilterReset"
      >
        <template #actions>
          <button v-if="hasCustomerListActiveFilters" class="btn btn-outline btn-sm" @click="onCustomerListFilterReset">{{ t("clearFilters") }}</button>
          <button class="btn btn-outline btn-sm" @click="focusCustomerSearch">{{ t("searchAction") }}</button>
        </template>
      </FilterBar>
    </SectionPanel>

    <SectionPanel
      :title="t('customerTableTitle')"
      :count="formatCount(customerListTotalCount)"
      panel-class="surface-card rounded-2xl p-5"
    >
      <ListTable
        :columns="customerListColumns"
        :rows="customerListPagedRows"
        :loading="isInitialLoading"
        :empty-message="t('emptyDescription')"
        @row-click="(row) => openCustomer360(row.name)"
      />

      <div class="mt-4 flex items-center justify-between">
        <p class="text-xs text-gray-500">{{ t("mobileSummaryTitle") }} · {{ t("pageSize") }} {{ pagination.pageLength }}</p>
        <p class="text-xs text-gray-400">{{ customerListPagedRows.length }} / {{ customerListTotalCount }} {{ t("showingRecords") }}</p>
        <div class="flex items-center gap-1">
          <button class="btn btn-sm" :disabled="customerListPage <= 1" @click="customerListPage--">←</button>
          <span class="px-2 text-xs text-gray-600">{{ customerListPage }}</span>
          <button class="btn btn-sm" :disabled="customerListPage >= customerListTotalPages" @click="customerListPage++">→</button>
        </div>
      </div>

      <div class="sr-only" aria-hidden="true">
        <input class="input" :value="filters.query" @input="filters.query = $event.target.value" />
        <input class="input" :value="filters.consent_status" @input="filters.consent_status = $event.target.value" />
        <input class="input" :value="filters.gender" @input="filters.gender = $event.target.value" />
        <input class="input" :value="filters.marital_status" @input="filters.marital_status = $event.target.value" />
        <input
          class="input"
          :value="pagination.pageLength"
          @input="
            pagination.pageLength = Number($event.target.value) || 20;
            customerListPage = 1;
          "
        />
      </div>
    </SectionPanel>

    <QuickCreateCustomer
      v-model="showQuickCustomerDialog"
      :locale="activeLocale"
      :title-override="quickCustomerUi.title"
      :subtitle-override="quickCustomerUi.subtitle"
      :labels="quickCreateCommon"
      :return-to="quickCustomerOpenedFromIntent ? quickCustomerReturnTo : ''"
      :validate="validateQuickCustomerManaged"
      :build-payload="buildQuickCustomerManagedPayload"
      :success-handlers="quickCustomerSuccessHandlers"
      @cancel="cancelQuickCustomerDialog"
      @created="onQuickCustomerManagedCreated"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, reactive, ref, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { createResource } from "frappe-ui";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useCustomerStore } from "../stores/customer";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import MiniFactList from "../components/app-shell/MiniFactList.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import ListTable from "../components/ui/ListTable.vue";
import FilterBar from "../components/ui/FilterBar.vue";
import QuickCreateCustomer from "../components/QuickCreateCustomer.vue";
import { buildQuickCreateDraft, getQuickCreateConfig, getLocalizedText } from "../config/quickCreate";
import { getQuickCreateLabels } from "../utils/quickCreateCopy";
import { runQuickCreateSuccessTargets } from "../utils/quickCreateSuccess";
import { mutedFact, subtleFact } from "../utils/factItems";
import { openListExport } from "../utils/listExport";
import { buildQuickCreateIntentQuery, readQuickCreateIntent, stripQuickCreateIntentQuery } from "../utils/quickRouteIntent";
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
const branchStore = useBranchStore();
const authStore = useAuthStore();
const customerStore = useCustomerStore();

const copy = {
  tr: {
    breadcrumb: "Sigorta Operasyonları → Müşteriler",
    recordCount: "kayıt",
    newCustomer: "Yeni Müşteri",
    title: "Müşteri Yönetimi",
    subtitle: "Müşteri çalışma ekranı: filtre, şablon ve 360 erişim",
    filtersTitle: "Filtreler",
    customerTableTitle: "Müşteri Listesi",
    summaryTotal: "Toplam Müşteri",
    summaryActive: "Aktif Portföylü",
    summaryIndividual: "Bireysel",
    summaryCorporate: "Kurumsal",
    refresh: "Yenile",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    searchAction: "Ara",
    searchPlaceholder: "Müşteri / TC-VKN / telefon / e-posta ara",
    allConsentStatuses: "Tüm İzin Durumları",
    allGenders: "Tüm Cinsiyetler",
    allMaritalStatuses: "Tüm Medeni Durumlar",
    advancedFilters: "Gelişmiş Filtreler",
    hideAdvancedFilters: "Gelişmiş Filtreleri Gizle",
    activeFilters: "aktif filtre",
    presetLabel: "Filtre Şablonu",
    presetDefault: "Standart",
    presetConsentUnknown: "İzin Durumu Bilinmeyen",
    presetConsentGranted: "Onaylılar",
    presetAssignedToMe: "Bana Atananlar",
    presetAssignedUnknownConsent: "Bana Atanan + Onaysız",
    presetWithPhone: "Telefonu Olanlar",
    presetWithEmail: "E-postası Olanlar",
    presetContactReady: "İletişim Bilgisi Tam",
    presetUnknownGender: "Cinsiyeti Bilinmeyen",
    presetHasPortfolio: "Portföyü Olanlar",
    presetHasOpenOffer: "Açık Teklifi Olanlar",
    presetHighPortfolio: "Yüksek Portföy",
    presetPortfolioAndOpenOffer: "Portföy + Açık Teklif",
    presetAssignedPortfolio: "Bana Atanan + Portföy",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    savePresetPrompt: "Filtre şablonu adı",
    deletePresetConfirm: "Seçili özel filtre şablonu silinsin mi?",
    applyFilters: "Uygula",
    clearFilters: "Filtreleri Temizle",
    mobileSummaryTitle: "Liste Özeti",
    pageSize: "Sayfa Boyutu",
    showingRecords: "kayıt gösteriliyor",
    assignedAgentFilter: "Temsilci (içerir)",
    occupationFilter: "Meslek (içerir)",
    hasPhoneOnly: "Sadece telefonu olanlar",
    hasEmailOnly: "Sadece e-postası olanlar",
    hasActivePolicyOnly: "Aktif poliçesi olanlar",
    hasOpenOfferOnly: "Açık teklifi olanlar",
    loading: "Yükleniyor...",
    loadErrorTitle: "Liste Yüklenemedi",
    loadError: "Müşteri listesi yüklenirken hata oluştu. Lütfen tekrar deneyin.",
    emptyTitle: "Müşteri Bulunamadı",
    emptyDescription: "Filtrelere uygun müşteri kaydı bulunamadı.",
    showing: "Gösterilen",
    page: "Sayfa",
    previous: "Önceki",
    next: "Sonraki",
    open360: "360 Aç",
    newOffer: "Yeni Teklif",
    openDesk: "Yönetim Ekranını Aç",
    colCustomer: "Müşteri",
    colContact: "İletişim",
    colProfile: "Profil",
    colConsentOwner: "İzin / Temsilci",
    colPortfolio: "Portföy Özet",
    colActions: "Aksiyon",
    taxId: "Kimlik / Vergi No",
    nationalId: "TC Kimlik No",
    taxNumber: "Vergi No",
    customerType: "Müşteri Tipi",
    customerTypeIndividual: "Bireysel",
    customerTypeCorporate: "Kurumsal",
    recordId: "Kayıt No",
    phone: "Telefon",
    email: "E-posta",
    birthDate: "Doğum",
    gender: "Cinsiyet",
    maritalStatus: "Medeni Durum",
    occupation: "Meslek",
    assignedAgent: "Temsilci",
    customerFolder: "Klasör",
    activePolicies: "Aktif Poliçe",
    openOffers: "Açık Teklif",
    activeGrossPremium: "Aktif Brüt",
    sortModifiedDesc: "Son Güncellenen",
    sortNameAsc: "Ada Göre (A-Z)",
    sortNameDesc: "Ada Göre (Z-A)",
    sortActivePolicyDesc: "Aktif Poliçe (Yüksek)",
    sortOpenOfferDesc: "Açık Teklif (Yüksek)",
    sortActiveGrossDesc: "Aktif Brüt Prim (Yüksek)",
    consentUnknown: "Bilinmiyor",
    consentGranted: "Onaylı",
    consentRevoked: "İptal",
    genderUnknown: "Bilinmiyor",
    genderMale: "Erkek",
    genderFemale: "Kadın",
    genderOther: "Diğer",
    maritalUnknown: "Bilinmiyor",
    maritalSingle: "Bekar",
    maritalMarried: "Evli",
    maritalDivorced: "Boşanmış",
    maritalWidowed: "Dul",
    genderOptMale: "Erkek",
    genderOptFemale: "Kadın",
    genderOptOther: "Diğer",
    genderOptUnknown: "Bilinmiyor",
    maritalOptSingle: "Bekar",
    maritalOptMarried: "Evli",
    maritalOptDivorced: "Boşanmış",
    maritalOptWidowed: "Dul",
    maritalOptUnknown: "Bilinmiyor",
    validationIdentityRequired: "Kimlik veya vergi numarası zorunludur.",
    validationTaxNumberLength: "Vergi numarası 10 haneli olmalıdır.",
    validationTcLength: "TC kimlik numarası 11 haneli olmalıdır.",
    validationTcInvalid: "Geçerli bir TC kimlik numarası girin.",
  },
  en: {
    breadcrumb: "Insurance Operations → Customers",
    recordCount: "records",
    newCustomer: "New Customer",
    title: "Customer Workbench",
    subtitle: "Customer workspace with filters, presets, and 360 access",
    filtersTitle: "Filters",
    customerTableTitle: "Customer List",
    summaryTotal: "Total Customers",
    summaryActive: "With Active Portfolio",
    summaryIndividual: "Individual",
    summaryCorporate: "Corporate",
    refresh: "Refresh",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    searchAction: "Search",
    searchPlaceholder: "Search customer / tax id / phone / email",
    allConsentStatuses: "All Consent Statuses",
    allGenders: "All Genders",
    allMaritalStatuses: "All Marital Statuses",
    advancedFilters: "Advanced Filters",
    hideAdvancedFilters: "Hide Advanced Filters",
    activeFilters: "active filters",
    presetLabel: "Filter Preset",
    presetDefault: "Standard",
    presetConsentUnknown: "Consent Unknown",
    presetConsentGranted: "Granted Consent",
    presetAssignedToMe: "Assigned To Me",
    presetAssignedUnknownConsent: "Assigned + Consent Unknown",
    presetWithPhone: "Has Phone",
    presetWithEmail: "Has Email",
    presetContactReady: "Contact Ready",
    presetUnknownGender: "Unknown Gender",
    presetHasPortfolio: "Has Portfolio",
    presetHasOpenOffer: "Has Open Offer",
    presetHighPortfolio: "High Portfolio",
    presetPortfolioAndOpenOffer: "Portfolio + Open Offer",
    presetAssignedPortfolio: "Assigned To Me + Portfolio",
    savePreset: "Save",
    deletePreset: "Delete",
    savePresetPrompt: "Filter preset name",
    deletePresetConfirm: "Delete selected custom filter preset?",
    applyFilters: "Apply",
    clearFilters: "Clear Filters",
    mobileSummaryTitle: "List Summary",
    pageSize: "Page Size",
    showingRecords: "records shown",
    assignedAgentFilter: "Assigned Agent (contains)",
    occupationFilter: "Occupation (contains)",
    hasPhoneOnly: "Only with phone",
    hasEmailOnly: "Only with email",
    hasActivePolicyOnly: "Only with active policy",
    hasOpenOfferOnly: "Only with open offer",
    loading: "Loading...",
    loadErrorTitle: "Failed to Load List",
    loadError: "An error occurred while loading customers. Please try again.",
    emptyTitle: "No Customers Found",
    emptyDescription: "No customer records found for current filters.",
    showing: "Showing",
    page: "Page",
    previous: "Previous",
    next: "Next",
    open360: "Open 360",
    newOffer: "New Offer",
    openDesk: "Open Desk",
    colCustomer: "Customer",
    colContact: "Contact",
    colProfile: "Profile",
    colConsentOwner: "Consent / Owner",
    colPortfolio: "Portfolio",
    colActions: "Actions",
    taxId: "Identity / Tax Number",
    nationalId: "National ID Number",
    taxNumber: "Tax Number",
    customerType: "Customer Type",
    customerTypeIndividual: "Individual",
    customerTypeCorporate: "Corporate",
    recordId: "Record ID",
    phone: "Phone",
    email: "Email",
    birthDate: "Birth Date",
    gender: "Gender",
    maritalStatus: "Marital Status",
    occupation: "Occupation",
    assignedAgent: "Assigned Agent",
    customerFolder: "Folder",
    activePolicies: "Active Policies",
    openOffers: "Open Offers",
    activeGrossPremium: "Active Gross",
    sortModifiedDesc: "Last Modified",
    sortNameAsc: "Name (A-Z)",
    sortNameDesc: "Name (Z-A)",
    sortActivePolicyDesc: "Active Policies (High)",
    sortOpenOfferDesc: "Open Offers (High)",
    sortActiveGrossDesc: "Active Gross Premium (High)",
    consentUnknown: "Unknown",
    consentGranted: "Granted",
    consentRevoked: "Revoked",
    genderUnknown: "Unknown",
    genderMale: "Male",
    genderFemale: "Female",
    genderOther: "Other",
    maritalUnknown: "Unknown",
    maritalSingle: "Single",
    maritalMarried: "Married",
    maritalDivorced: "Divorced",
    maritalWidowed: "Widowed",
    genderOptMale: "Male",
    genderOptFemale: "Female",
    genderOptOther: "Other",
    genderOptUnknown: "Unknown",
    maritalOptSingle: "Single",
    maritalOptMarried: "Married",
    maritalOptDivorced: "Divorced",
    maritalOptWidowed: "Widowed",
    maritalOptUnknown: "Unknown",
    validationIdentityRequired: "Identity or tax number is required.",
    validationTaxNumberLength: "Tax number must be 10 digits.",
    validationTcLength: "National ID number must be 11 digits.",
    validationTcInvalid: "Enter a valid national ID number.",
  },
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const filters = customerStore.state.filters;
const pagination = customerStore.state.pagination;

const CUSTOMER_PRESET_STORAGE_KEY = "at:customer-list:preset";
const CUSTOMER_PRESET_LIST_STORAGE_KEY = "at:customer-list:preset-list";
const presetKey = ref(readFilterPresetKey(CUSTOMER_PRESET_STORAGE_KEY, "default"));
const customPresets = ref(readFilterPresetList(CUSTOMER_PRESET_LIST_STORAGE_KEY));
const loadErrorText = ref("");
const quickCustomerConfig = getQuickCreateConfig("customer");
const showQuickCustomerDialog = ref(false);
const quickCustomerLoading = ref(false);
const quickCustomerError = ref("");
const quickCustomerFieldErrors = reactive({});
const quickCustomerForm = reactive(buildQuickCreateDraft(quickCustomerConfig));
const quickCustomerReturnTo = ref("");
const quickCustomerOpenedFromIntent = ref(false);
const quickCustomerSuccessHandlers = {
  customer_list: refreshCustomerList,
};

const customerListResource = createResource({ url: "acentem_takipte.acentem_takipte.api.dashboard.get_customer_workbench_rows", auto: false });
const quickCustomerCreateResource = createResource({ url: quickCustomerConfig.submitUrl, auto: false });
const presetServerReadResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.filter_presets.get_filter_preset_state",
  auto: false,
});
const presetServerWriteResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.filter_presets.set_filter_preset_state",
  auto: false,
});

const rows = computed(() => customerStore.state.items);
const activeLocale = computed(() => unref(authStore.locale) || "en");
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
const currentUserId = computed(() => unref(authStore.userId) || "");
const customerListLoading = computed(() => Boolean(unref(customerListResource.loading)));
const customerQuickFields = computed(() => quickCustomerConfig?.fields || []);
const quickCustomerUi = computed(() => ({
  title: getLocalizedText(quickCustomerConfig?.title, activeLocale.value),
  subtitle: getLocalizedText(quickCustomerConfig?.subtitle, activeLocale.value),
  newLabel: activeLocale.value === "tr" ? "Yeni Müşteri" : "New Customer",
}));
const quickCreateCommon = computed(() => ({
  ...getQuickCreateLabels("create", activeLocale.value),
  validation: activeLocale.value === "tr" ? "Lütfen gerekli alanları ve formatları kontrol edin." : "Please check required fields and formats.",
  failed: activeLocale.value === "tr" ? "Hızlı müşteri oluşturma başarısız oldu." : "Quick customer create failed.",
}));
const quickCustomerType = computed(() => normalizeCustomerType(quickCustomerForm.customer_type, quickCustomerForm.tax_id));
const isCorporateQuickCustomer = computed(() => quickCustomerType.value === "Corporate");
const isInitialLoading = computed(() => customerStore.state.loading && rows.value.length === 0);

const consentStatusOptions = computed(() => [
  { value: "Unknown", label: t("consentUnknown") },
  { value: "Granted", label: t("consentGranted") },
  { value: "Revoked", label: t("consentRevoked") },
]);
const genderOptions = computed(() => [
  { value: "Unknown", label: t("genderOptUnknown") },
  { value: "Male", label: t("genderOptMale") },
  { value: "Female", label: t("genderOptFemale") },
  { value: "Other", label: t("genderOptOther") },
]);
const maritalStatusOptions = computed(() => [
  { value: "Unknown", label: t("maritalOptUnknown") },
  { value: "Single", label: t("maritalOptSingle") },
  { value: "Married", label: t("maritalOptMarried") },
  { value: "Divorced", label: t("maritalOptDivorced") },
  { value: "Widowed", label: t("maritalOptWidowed") },
]);
const sortOptions = computed(() => [
  { value: "modified desc", label: t("sortModifiedDesc") },
  { value: "full_name asc", label: t("sortNameAsc") },
  { value: "full_name desc", label: t("sortNameDesc") },
  { value: "active_policy_count desc", label: t("sortActivePolicyDesc") },
  { value: "open_offer_count desc", label: t("sortOpenOfferDesc") },
  { value: "active_policy_gross_premium desc", label: t("sortActiveGrossDesc") },
]);
const presetOptions = computed(() => [
  { value: "default", label: t("presetDefault") },
  { value: "consentUnknown", label: t("presetConsentUnknown") },
  { value: "consentGranted", label: t("presetConsentGranted") },
  { value: "assignedToMe", label: t("presetAssignedToMe") },
  { value: "assignedUnknownConsent", label: t("presetAssignedUnknownConsent") },
  { value: "withPhone", label: t("presetWithPhone") },
  { value: "withEmail", label: t("presetWithEmail") },
  { value: "contactReady", label: t("presetContactReady") },
  { value: "unknownGender", label: t("presetUnknownGender") },
  { value: "hasPortfolio", label: t("presetHasPortfolio") },
  { value: "hasOpenOffer", label: t("presetHasOpenOffer") },
  { value: "highPortfolio", label: t("presetHighPortfolio") },
  { value: "portfolioAndOpenOffer", label: t("presetPortfolioAndOpenOffer") },
  { value: "assignedPortfolio", label: t("presetAssignedPortfolio") },
  ...customPresets.value.map((preset) => ({
    value: makeCustomFilterPresetValue(preset.id),
    label: preset.label,
  })),
]);
const canDeletePreset = computed(() => isCustomFilterPresetValue(presetKey.value));
const activeFilterCount = computed(() => customerStore.activeFilterCount);
const totalPages = computed(() => customerStore.totalPages);
const hasNextPage = computed(() => customerStore.hasNextPage);
const startRow = computed(() => customerStore.startRow);
const endRow = computed(() => customerStore.endRow);

const customerListSearchQuery = ref("");
const customerListPage = ref(1);
const customerListPageSize = 20;
const customerListLocalFilters = reactive({ consent_status: "", gender: "" });

const customerListColumns = [
  { key: "name", label: "Müşteri No", width: "150px", type: "mono" },
  { key: "full_name", label: "Müşteri", width: "220px" },
  { key: "mobile_no", label: "Telefon", width: "160px" },
  { key: "email_id", label: "E-posta", width: "220px" },
  { key: "gender", label: "Cinsiyet", width: "90px" },
  { key: "consent_status", label: "İzin", width: "120px", type: "badge" },
];

const customerListFilterConfig = computed(() => [
  {
    key: "consent_status",
    label: "İzin",
    options: consentStatusOptions.value.map((item) => ({ value: item.value, label: item.label })),
  },
  {
    key: "gender",
    label: "Cinsiyet",
    options: genderOptions.value.map((item) => ({ value: item.value, label: item.label })),
  },
]);

const customerListFilteredRows = computed(() => {
  const q = customerListSearchQuery.value.trim().toLocaleLowerCase(localeCode.value);
  return rows.value.filter((row) => {
    const matchesQuery =
      !q ||
      [row.name, row.full_name, row.mobile_no, row.email_id]
        .map((value) => String(value || "").toLocaleLowerCase(localeCode.value))
        .some((value) => value.includes(q));
    const matchesConsent =
      !customerListLocalFilters.consent_status || String(row.consent_status || "") === customerListLocalFilters.consent_status;
    const matchesGender = !customerListLocalFilters.gender || String(row.gender || "") === customerListLocalFilters.gender;
    return matchesQuery && matchesConsent && matchesGender;
  });
});

const customerListTotalCount = computed(() => customerListFilteredRows.value.length);
const customerListTotalPages = computed(() => Math.max(1, Math.ceil(customerListTotalCount.value / customerListPageSize)));
const customerListPagedRows = computed(() => {
  const start = (customerListPage.value - 1) * customerListPageSize;
  return customerListFilteredRows.value.slice(start, start + customerListPageSize);
});

const customerListSummary = computed(() => {
  let active = 0;
  let individual = 0;
  let corporate = 0;

  customerListFilteredRows.value.forEach((row) => {
    if (Number(row?.active_policy_count || 0) > 0) active += 1;
    if (normalizeCustomerType(row?.customer_type, row?.tax_id || row?.masked_tax_id) === "Corporate") {
      corporate += 1;
    } else {
      individual += 1;
    }
  });

  return {
    total: customerListFilteredRows.value.length,
    active,
    individual,
    corporate,
  };
});

const customerListActiveCount = computed(
  () =>
    (customerListSearchQuery.value.trim() ? 1 : 0) +
    Object.values(customerListLocalFilters).filter((value) => String(value || "").trim() !== "").length
);

const hasCustomerListActiveFilters = computed(() => customerListActiveCount.value > 0);

function formatCount(value) {
  return new Intl.NumberFormat(localeCode.value).format(Number(value || 0));
}

function focusCustomerSearch() {
  const el = document.querySelector(".filter-bar input[type='search'], .filter-bar input[type='text']");
  if (el && typeof el.focus === "function") el.focus();
}

function onCustomerListFilterChange({ key, value }) {
  customerListLocalFilters[key] = String(value || "");
  customerListPage.value = 1;
}

function onCustomerListFilterReset() {
  customerListSearchQuery.value = "";
  customerListLocalFilters.consent_status = "";
  customerListLocalFilters.gender = "";
  customerListPage.value = 1;
}

function normalizeConsentValue(value) {
  const status = String(value || "Unknown");
  if (status === "Granted" || status === "Revoked") return status;
  return "Unknown";
}

function genderLabel(value) {
  const normalized = String(value || "Unknown");
  if (normalized === "Male") return t("genderMale");
  if (normalized === "Female") return t("genderFemale");
  if (normalized === "Other") return t("genderOther");
  return t("genderUnknown");
}

function maritalLabel(value) {
  const normalized = String(value || "Unknown");
  if (normalized === "Single") return t("maritalSingle");
  if (normalized === "Married") return t("maritalMarried");
  if (normalized === "Divorced") return t("maritalDivorced");
  if (normalized === "Widowed") return t("maritalWidowed");
  return t("maritalUnknown");
}

function normalizeIdentityNumber(value) {
  return String(value || "").replace(/\D+/g, "");
}

function normalizeCustomerType(value, identityNumber = "") {
  const normalized = String(value || "").trim();
  if (normalized === "Individual" || normalized === "Corporate") return normalized;
  return normalizeIdentityNumber(identityNumber).length === 10 ? "Corporate" : "Individual";
}

function isValidTckn(value) {
  const digits = normalizeIdentityNumber(value);
  if (digits.length !== 11 || digits.startsWith("0")) return false;
  const list = digits.split("").map((item) => Number(item));
  const tenth = ((list[0] + list[2] + list[4] + list[6] + list[8]) * 7 - (list[1] + list[3] + list[5] + list[7])) % 10;
  const eleventh = list.slice(0, 10).reduce((sum, item) => sum + item, 0) % 10;
  return list[9] === tenth && list[10] === eleventh;
}

function customerTypeLabel(value) {
  return normalizeCustomerType(value) === "Corporate" ? t("customerTypeCorporate") : t("customerTypeIndividual");
}

function customerIdentityLabel(customerType) {
  return normalizeCustomerType(customerType) === "Corporate" ? t("taxNumber") : t("nationalId");
}

function buildListParams() {
  return withOfficeBranchFilter({
    page: pagination.page,
    page_length: pagination.pageLength,
    filters: {
      query: filters.query || "",
      consent_status: filters.consent_status || "",
      gender: filters.gender || "",
      marital_status: filters.marital_status || "",
      assigned_agent: filters.assigned_agent || "",
      occupation: filters.occupation || "",
      has_phone: Boolean(filters.has_phone),
      has_email: Boolean(filters.has_email),
      has_active_policy: Boolean(filters.has_active_policy),
      has_open_offer: Boolean(filters.has_open_offer),
      sort: filters.sort || "modified desc",
    },
  });
}

function buildCustomerExportQuery() {
  return {
    filters: {
      ...(buildListParams().filters || {}),
    },
  };
}

function downloadCustomerExport(format) {
  openListExport({
    screen: "customer_list",
    query: buildCustomerExportQuery(),
    format,
    limit: 1000,
  });
}

function withOfficeBranchFilter(params) {
  const officeBranch = branchStore.requestBranch || "";
  if (!officeBranch) return params;
  return {
    ...params,
    filters: {
      ...(params.filters || {}),
      office_branch: officeBranch,
    },
  };
}

async function refreshCustomerList() {
  const params = buildListParams();
  customerListResource.params = params;
  customerStore.setLoading(true);
  customerStore.clearError();
  const result = await customerListResource.reload(params).catch((error) => ({ __error: error }));

  if (!result?.__error) {
    const payload = result || {};
    customerListResource.setData(payload);
    customerStore.applyListPayload(payload);
    loadErrorText.value = "";
    customerStore.setLoading(false);
    return;
  }

  customerListResource.setData({ rows: [], total: 0 });
  customerStore.applyListPayload({ rows: [], total: 0 });
  customerStore.setError(t("loadError"));
  customerStore.setLoading(false);
  loadErrorText.value = t("loadError");
}

function applyFilters() {
  pagination.page = 1;
  refreshCustomerList();
}

function resetFilters() {
  presetKey.value = "default";
  writeFilterPresetKey(CUSTOMER_PRESET_STORAGE_KEY, "default");
  filters.query = "";
  filters.consent_status = "";
  filters.gender = "";
  filters.marital_status = "";
  filters.assigned_agent = "";
  filters.occupation = "";
  filters.has_phone = false;
  filters.has_email = false;
  filters.has_active_policy = false;
  filters.has_open_offer = false;
  filters.sort = "modified desc";
  pagination.pageLength = 20;
  pagination.page = 1;
  void persistPresetStateToServer();
  refreshCustomerList();
}

function previousPage() {
  if (pagination.page <= 1) return;
  pagination.page -= 1;
  refreshCustomerList();
}

function nextPage() {
  if (!hasNextPage.value) return;
  pagination.page += 1;
  refreshCustomerList();
}

function currentPresetPayload() {
  return {
    query: filters.query,
    consent_status: filters.consent_status,
    gender: filters.gender,
    marital_status: filters.marital_status,
    assigned_agent: filters.assigned_agent,
    occupation: filters.occupation,
    has_phone: Boolean(filters.has_phone),
    has_email: Boolean(filters.has_email),
    has_active_policy: Boolean(filters.has_active_policy),
    has_open_offer: Boolean(filters.has_open_offer),
    sort: filters.sort,
    pageLength: pagination.pageLength,
  };
}

function applyPreset(key, { refresh = true } = {}) {
  const requested = String(key || "default");

  if (isCustomFilterPresetValue(requested)) {
    const customId = extractCustomFilterPresetId(requested);
    const presetRow = customPresets.value.find((item) => item.id === customId);
    if (!presetRow) {
      applyPreset("default", { refresh });
      return;
    }
    const payload = presetRow.payload || {};
    presetKey.value = requested;
    writeFilterPresetKey(CUSTOMER_PRESET_STORAGE_KEY, requested);
    filters.query = String(payload.query || "");
    filters.consent_status = String(payload.consent_status || "");
    filters.gender = String(payload.gender || "");
    filters.marital_status = String(payload.marital_status || "");
    filters.assigned_agent = String(payload.assigned_agent || "");
    filters.occupation = String(payload.occupation || "");
    filters.has_phone = Boolean(payload.has_phone);
    filters.has_email = Boolean(payload.has_email);
    filters.has_active_policy = Boolean(payload.has_active_policy);
    filters.has_open_offer = Boolean(payload.has_open_offer);
    filters.sort = String(payload.sort || "modified desc");
    pagination.pageLength = Number(payload.pageLength || 20) || 20;
    pagination.page = 1;
    if (refresh) refreshCustomerList();
    return;
  }

  presetKey.value = requested;
  writeFilterPresetKey(CUSTOMER_PRESET_STORAGE_KEY, requested);
  filters.query = "";
  filters.consent_status = "";
  filters.gender = "";
  filters.marital_status = "";
  filters.assigned_agent = "";
  filters.occupation = "";
  filters.has_phone = false;
  filters.has_email = false;
  filters.has_active_policy = false;
  filters.has_open_offer = false;
  filters.sort = "modified desc";
  pagination.pageLength = 20;

  if (requested === "consentUnknown") {
    filters.consent_status = "Unknown";
  } else if (requested === "consentGranted") {
    filters.consent_status = "Granted";
  } else if (requested === "assignedToMe") {
    filters.assigned_agent = currentUserId.value;
  } else if (requested === "assignedUnknownConsent") {
    filters.assigned_agent = currentUserId.value;
    filters.consent_status = "Unknown";
  } else if (requested === "withPhone") {
    filters.has_phone = true;
  } else if (requested === "withEmail") {
    filters.has_email = true;
  } else if (requested === "contactReady") {
    filters.has_phone = true;
    filters.has_email = true;
  } else if (requested === "unknownGender") {
    filters.gender = "Unknown";
  } else if (requested === "hasPortfolio") {
    filters.has_active_policy = true;
  } else if (requested === "hasOpenOffer") {
    filters.has_open_offer = true;
  } else if (requested === "highPortfolio") {
    filters.has_active_policy = true;
    filters.sort = "active_policy_gross_premium desc";
  } else if (requested === "portfolioAndOpenOffer") {
    filters.has_active_policy = true;
    filters.has_open_offer = true;
    filters.sort = "open_offer_count desc";
  } else if (requested === "assignedPortfolio") {
    filters.assigned_agent = currentUserId.value;
    filters.has_active_policy = true;
    filters.sort = "active_policy_count desc";
  }

  pagination.page = 1;
  if (refresh) refreshCustomerList();
}

function onPresetChange() {
  applyPreset(presetKey.value, { refresh: true });
  void persistPresetStateToServer();
}

function savePreset() {
  const currentCustomId = extractCustomFilterPresetId(presetKey.value);
  const currentCustom = currentCustomId ? customPresets.value.find((item) => item.id === currentCustomId) : null;
  const initialName = currentCustom?.label || "";
  const name = String(window.prompt(t("savePresetPrompt"), initialName) || "").trim();
  if (!name) return;

  const existing = customPresets.value.find((item) => item.label.toLowerCase() === name.toLowerCase());
  const targetId =
    currentCustomId || existing?.id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const nextList = customPresets.value.filter((item) => item.id !== targetId);
  nextList.push({ id: targetId, label: name, payload: currentPresetPayload() });
  customPresets.value = nextList.sort((a, b) => a.label.localeCompare(b.label, localeCode.value));
  writeFilterPresetList(CUSTOMER_PRESET_LIST_STORAGE_KEY, customPresets.value);
  presetKey.value = makeCustomFilterPresetValue(targetId);
  writeFilterPresetKey(CUSTOMER_PRESET_STORAGE_KEY, presetKey.value);
  void persistPresetStateToServer();
}

function deletePreset() {
  if (!canDeletePreset.value) return;
  if (!window.confirm(t("deletePresetConfirm"))) return;
  const customId = extractCustomFilterPresetId(presetKey.value);
  if (!customId) return;
  customPresets.value = customPresets.value.filter((item) => item.id !== customId);
  writeFilterPresetList(CUSTOMER_PRESET_LIST_STORAGE_KEY, customPresets.value);
  applyPreset("default", { refresh: true });
  void persistPresetStateToServer();
}

function hasMeaningfulPresetState(selectedKey, presets) {
  return String(selectedKey || "default") !== "default" || (Array.isArray(presets) && presets.length > 0);
}

async function persistPresetStateToServer() {
  try {
    await presetServerWriteResource.submit({
      screen: "customer_list",
      selected_key: presetKey.value,
      custom_presets: customPresets.value,
    });
  } catch {
    // local fallback
  }
}

async function hydratePresetStateFromServer() {
  try {
    const remote = await presetServerReadResource.reload({ screen: "customer_list" });
    const remoteSelectedKey = String(remote?.selected_key || "default");
    const remoteCustomPresets = Array.isArray(remote?.custom_presets) ? remote.custom_presets : [];

    const localHasState = hasMeaningfulPresetState(presetKey.value, customPresets.value);
    const remoteHasState = hasMeaningfulPresetState(remoteSelectedKey, remoteCustomPresets);
    if (!remoteHasState) {
      if (localHasState) void persistPresetStateToServer();
      return;
    }

    const localSnapshot = JSON.stringify({ selected_key: presetKey.value, custom_presets: customPresets.value });
    const remoteSnapshot = JSON.stringify({ selected_key: remoteSelectedKey, custom_presets: remoteCustomPresets });
    if (localSnapshot === remoteSnapshot) return;

    customPresets.value = remoteCustomPresets;
    writeFilterPresetList(CUSTOMER_PRESET_LIST_STORAGE_KEY, customPresets.value);
    applyPreset(remoteSelectedKey, { refresh: true });
  } catch {
    // local fallback
  }
}

function clearQuickCustomerFieldErrors() {
  Object.keys(quickCustomerFieldErrors).forEach((key) => delete quickCustomerFieldErrors[key]);
}

function resetQuickCustomerForm() {
  Object.assign(quickCustomerForm, buildQuickCreateDraft(quickCustomerConfig));
  quickCustomerError.value = "";
  clearQuickCustomerFieldErrors();
}

function openQuickCustomerDialog({ fromIntent = false, returnTo = "" } = {}) {
  resetQuickCustomerForm();
  quickCustomerOpenedFromIntent.value = !!fromIntent;
  quickCustomerReturnTo.value = returnTo || "";
  showQuickCustomerDialog.value = true;
}

function cancelQuickCustomerDialog() {
  showQuickCustomerDialog.value = false;
  if (quickCustomerOpenedFromIntent.value && quickCustomerReturnTo.value) {
    const target = quickCustomerReturnTo.value;
    quickCustomerOpenedFromIntent.value = false;
    quickCustomerReturnTo.value = "";
    router.push(target).catch(() => {});
    return;
  }
  quickCustomerOpenedFromIntent.value = false;
  quickCustomerReturnTo.value = "";
}

function validateQuickCustomerForm() {
  clearQuickCustomerFieldErrors();
  quickCustomerError.value = "";
  let valid = true;
  for (const field of customerQuickFields.value) {
    const fieldDisabled =
      typeof field?.disabled === "function"
        ? field.disabled({ field, model: quickCustomerForm, locale: activeLocale.value })
        : Boolean(field?.disabled);
    if (field?.name !== "tax_id" && field?.name !== "customer_type" && fieldDisabled) {
      continue;
    }
    if (!field?.required) continue;
    if (String(quickCustomerForm[field.name] ?? "").trim() === "") {
      quickCustomerFieldErrors[field.name] = getLocalizedText(field.label, activeLocale.value);
      valid = false;
    }
  }

  const customerType = normalizeCustomerType(quickCustomerForm.customer_type, quickCustomerForm.tax_id);
  const identityNumber = normalizeIdentityNumber(quickCustomerForm.tax_id);
  if (!identityNumber) {
    quickCustomerFieldErrors.tax_id = t("validationIdentityRequired");
    valid = false;
  } else if (customerType === "Corporate") {
    if (identityNumber.length !== 10) {
      quickCustomerFieldErrors.tax_id = t("validationTaxNumberLength");
      valid = false;
    }
  } else if (identityNumber.length !== 11) {
    quickCustomerFieldErrors.tax_id = t("validationTcLength");
    valid = false;
  } else if (!isValidTckn(identityNumber)) {
    quickCustomerFieldErrors.tax_id = t("validationTcInvalid");
    valid = false;
  }

  const email = String(quickCustomerForm.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    quickCustomerFieldErrors.email = activeLocale.value === "tr" ? "Geçerli e-posta girin." : "Enter a valid email.";
    valid = false;
  }
  const birthDate = String(quickCustomerForm.birth_date || "");
  if (!isCorporateQuickCustomer.value && birthDate) {
    const parsed = new Date(birthDate);
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
      quickCustomerFieldErrors.birth_date =
        activeLocale.value === "tr" ? "Doğum tarihi gelecekte olamaz." : "Birth date cannot be in the future.";
      valid = false;
    }
  }

  if (!valid) quickCustomerError.value = quickCreateCommon.value.validation;
  return valid;
}

function validateQuickCustomerManaged({ form, fieldErrors, setError }) {
  Object.keys(fieldErrors).forEach((key) => delete fieldErrors[key]);
  let valid = true;
  const fields = customerQuickFields.value;

  for (const field of fields) {
    const fieldDisabled =
      typeof field?.disabled === "function"
        ? field.disabled({ field, model: form, locale: activeLocale.value })
        : Boolean(field?.disabled);
    if (field?.name !== "tax_id" && field?.name !== "customer_type" && fieldDisabled) continue;
    if (!field?.required) continue;
    if (String(form[field.name] ?? "").trim() === "") {
      fieldErrors[field.name] = getLocalizedText(field.label, activeLocale.value);
      valid = false;
    }
  }

  const customerType = normalizeCustomerType(form.customer_type, form.tax_id);
  const identityNumber = normalizeIdentityNumber(form.tax_id);
  if (!identityNumber) {
    fieldErrors.tax_id = t("validationIdentityRequired");
    valid = false;
  } else if (customerType === "Corporate") {
    if (identityNumber.length !== 10) {
      fieldErrors.tax_id = t("validationTaxNumberLength");
      valid = false;
    }
  } else if (identityNumber.length !== 11) {
    fieldErrors.tax_id = t("validationTcLength");
    valid = false;
  } else if (!isValidTckn(identityNumber)) {
    fieldErrors.tax_id = t("validationTcInvalid");
    valid = false;
  }

  const email = String(form.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldErrors.email = activeLocale.value === "tr" ? "Geçerli e-posta girin." : "Enter a valid email.";
    valid = false;
  }
  const birthDate = String(form.birth_date || "");
  if (customerType !== "Corporate" && birthDate) {
    const parsed = new Date(birthDate);
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
      fieldErrors.birth_date =
        activeLocale.value === "tr" ? "Doğum tarihi gelecekte olamaz." : "Birth date cannot be in the future.";
      valid = false;
    }
  }

  if (!valid) setError(quickCreateCommon.value.validation);
  return valid;
}

function buildQuickCustomerPayload() {
  const payload = Object.fromEntries(
    Object.entries(quickCustomerForm).map(([key, value]) => [key, String(value ?? "").trim() === "" ? null : value])
  );
  payload.customer_type = normalizeCustomerType(payload.customer_type, payload.tax_id);
  payload.tax_id = normalizeIdentityNumber(payload.tax_id);
  if (payload.customer_type === "Corporate") {
    payload.birth_date = null;
    payload.gender = "Unknown";
    payload.marital_status = "Unknown";
    payload.occupation = null;
  }
  return payload;
}

function buildQuickCustomerManagedPayload({ form }) {
  const payload = Object.fromEntries(
    Object.entries(form || {}).map(([key, value]) => [key, String(value ?? "").trim() === "" ? null : value])
  );
  payload.customer_type = normalizeCustomerType(payload.customer_type, payload.tax_id);
  payload.tax_id = normalizeIdentityNumber(payload.tax_id);
  if (payload.customer_type === "Corporate") {
    payload.birth_date = null;
    payload.gender = "Unknown";
    payload.marital_status = "Unknown";
    payload.occupation = null;
  }
  return payload;
}

function onQuickCustomerManagedCreated() {
  quickCustomerOpenedFromIntent.value = false;
  quickCustomerReturnTo.value = "";
}

async function submitQuickCustomer(openAfter = false) {
  if (quickCustomerLoading.value) return;
  if (!validateQuickCustomerForm()) return;
  quickCustomerLoading.value = true;
  quickCustomerError.value = "";
  try {
    const result = await quickCustomerCreateResource.submit(buildQuickCustomerPayload());
    const customerName = result?.customer || quickCustomerCreateResource.data?.customer || null;
    showQuickCustomerDialog.value = false;
    resetQuickCustomerForm();
    await runQuickCreateSuccessTargets(quickCustomerConfig?.successRefreshTargets, {
      customer_list: refreshCustomerList,
    });
    const returnTarget = quickCustomerOpenedFromIntent.value ? quickCustomerReturnTo.value : "";
    quickCustomerOpenedFromIntent.value = false;
    quickCustomerReturnTo.value = "";
    if (!openAfter && returnTarget) {
      router.push(returnTarget).catch(() => {});
      return;
    }
    if (openAfter && customerName) openCustomer360(customerName);
  } catch (error) {
    quickCustomerError.value = error?.messages?.join(" ") || error?.message || quickCreateCommon.value.failed;
  } finally {
    quickCustomerLoading.value = false;
  }
}

function consumeQuickCustomerRouteIntent() {
  const intent = readQuickCreateIntent(route.query);
  if (!intent.quick) return;
  openQuickCustomerDialog({ fromIntent: true, returnTo: intent.returnTo });
  const nextQuery = stripQuickCreateIntentQuery(route.query);
  router.replace({ name: "customer-list", query: nextQuery }).catch(() => {});
}

function openCustomer360(customerName) {
  router.push({ name: "customer-detail", params: { name: customerName } });
}

function openQuickOfferForCustomer(row) {
  const customerName = String(row?.name || "").trim();
  if (!customerName) return;
  router.push({
    name: "offer-board",
    query: buildQuickCreateIntentQuery({
      prefills: {
        customer: customerName,
        customer_label: String(row?.full_name || customerName),
      },
      returnTo: route.fullPath,
    }),
  });
}

function customerIdentityFacts(row) {
  const customerType = normalizeCustomerType(row?.customer_type, row?.tax_id || row?.masked_tax_id);
  return [
    subtleFact("record", t("recordId"), row?.name || "-"),
    subtleFact("customer_type", t("customerType"), customerTypeLabel(customerType)),
    ...(row?.customer_folder ? [subtleFact("folder", t("customerFolder"), row.customer_folder)] : []),
  ];
}

function customerContactFacts(row) {
  return [
    mutedFact("tax", customerIdentityLabel(row?.customer_type), row?.tax_id || row?.masked_tax_id || "-"),
    mutedFact("phone", t("phone"), row?.phone || row?.masked_phone || "-"),
    mutedFact("email", t("email"), row?.email || "-"),
  ];
}

function customerProfileFacts(row) {
  const isCorporate = normalizeCustomerType(row?.customer_type, row?.tax_id || row?.masked_tax_id) === "Corporate";
  return [
    mutedFact("birth", t("birthDate"), isCorporate ? "-" : formatDate(row?.birth_date)),
    mutedFact("gender", t("gender"), isCorporate ? "-" : genderLabel(row?.gender)),
    mutedFact("marital", t("maritalStatus"), isCorporate ? "-" : maritalLabel(row?.marital_status)),
    mutedFact("occupation", t("occupation"), isCorporate ? "-" : row?.occupation || "-"),
  ];
}

function customerOwnerFacts(row) {
  return [mutedFact("agent", t("assignedAgent"), row?.assigned_agent || "-")];
}

function customerPortfolioFacts(row) {
  return [
    mutedFact("active_policies", t("activePolicies"), Number(row?.active_policy_count || 0)),
    mutedFact("open_offers", t("openOffers"), Number(row?.open_offer_count || 0)),
    mutedFact("active_gross", t("activeGrossPremium"), formatCurrency(row?.active_policy_gross_premium)),
  ];
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(localeCode.value).format(new Date(value));
}

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return new Intl.NumberFormat(localeCode.value, {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2,
  }).format(amount);
}

applyPreset(presetKey.value, { refresh: false });
void refreshCustomerList();
watch(
  quickCustomerType,
  (type) => {
    if (type !== "Corporate") return;
    quickCustomerForm.birth_date = "";
    quickCustomerForm.gender = "Unknown";
    quickCustomerForm.marital_status = "Unknown";
    quickCustomerForm.occupation = "";
  },
  { immediate: true }
);
watch(
  () => branchStore.selected,
  () => {
    pagination.page = 1;
    void refreshCustomerList();
  }
);
void hydratePresetStateFromServer();
void consumeQuickCustomerRouteIntent();
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>

