<template>
  <section class="space-y-4">
    <div class="surface-card rounded-2xl p-5">
      <PageToolbar
        :title="t('title')"
        :subtitle="t('subtitle')"
        :show-refresh="true"
        :busy="customerListResource.loading"
        :refresh-label="t('refresh')"
        @refresh="refreshCustomerList"
      >
        <template #actions>
          <div class="flex flex-wrap items-center gap-2">
            <QuickCreateLauncher variant="primary" size="sm" :label="quickCustomerUi.newLabel" @launch="openQuickCustomerDialog" />
            <ActionButton variant="secondary" size="sm" :disabled="customerListResource.loading" @click="refreshCustomerList">
              {{ t("refresh") }}
            </ActionButton>
            <ActionButton variant="secondary" size="sm" :disabled="customerListResource.loading" @click="downloadCustomerExport('xlsx')">
              {{ t("exportXlsx") }}
            </ActionButton>
            <ActionButton variant="primary" size="sm" :disabled="customerListResource.loading" @click="downloadCustomerExport('pdf')">
              {{ t("exportPdf") }}
            </ActionButton>
          </div>
        </template>
        <template #filters>
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
            @apply="applyFilters"
            @reset="resetFilters"
          >
            <input
              v-model.trim="filters.query"
              class="input"
              type="search"
              :placeholder="t('searchPlaceholder')"
              @keyup.enter="applyFilters"
            />

            <select v-model="filters.consent_status" class="input">
              <option value="">{{ t("allConsentStatuses") }}</option>
              <option v-for="item in consentStatusOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>

            <select v-model="filters.gender" class="input">
              <option value="">{{ t("allGenders") }}</option>
              <option v-for="item in genderOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>

            <select v-model="filters.sort" class="input">
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>

            <select v-model.number="pagination.pageLength" class="input">
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>

            <template #advanced>
              <select v-model="filters.marital_status" class="input">
                <option value="">{{ t("allMaritalStatuses") }}</option>
                <option v-for="item in maritalStatusOptions" :key="item.value" :value="item.value">
                  {{ item.label }}
                </option>
              </select>

              <input
                v-model.trim="filters.assigned_agent"
                class="input"
                type="search"
                :placeholder="t('assignedAgentFilter')"
                @keyup.enter="applyFilters"
              />

              <input
                v-model.trim="filters.occupation"
                class="input"
                type="search"
                :placeholder="t('occupationFilter')"
                @keyup.enter="applyFilters"
              />

              <label class="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                <input v-model="filters.has_phone" class="h-4 w-4" type="checkbox" />
                <span>{{ t("hasPhoneOnly") }}</span>
              </label>

              <label class="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                <input v-model="filters.has_email" class="h-4 w-4" type="checkbox" />
                <span>{{ t("hasEmailOnly") }}</span>
              </label>

              <label class="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                <input v-model="filters.has_active_policy" class="h-4 w-4" type="checkbox" />
                <span>{{ t("hasActivePolicyOnly") }}</span>
              </label>

              <label class="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                <input v-model="filters.has_open_offer" class="h-4 w-4" type="checkbox" />
                <span>{{ t("hasOpenOfferOnly") }}</span>
              </label>
            </template>

          </WorkbenchFilterToolbar>
        </template>
      </PageToolbar>
    </div>

    <article class="surface-card rounded-2xl p-4 md:hidden">
      <SectionCardHeader :title="t('mobileSummaryTitle')" :show-count="false" />
      <div class="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t("showing") }}</p>
          <p class="mt-1 font-semibold text-slate-900">{{ startRow }}-{{ endRow }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t("activeFilters") }}</p>
          <p class="mt-1 font-semibold text-slate-900">{{ activeFilterCount }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t("pageSize") }}</p>
          <p class="mt-1 font-semibold text-slate-900">{{ pagination.pageLength }}</p>
        </div>
      </div>
    </article>

    <DataTableShell
      :loading="isInitialLoading"
      :error="loadErrorText"
      :empty="rows.length === 0"
      :loading-label="t('loading')"
      :error-title="t('loadErrorTitle')"
      :empty-title="t('emptyTitle')"
      :empty-description="t('emptyDescription')"
    >
      <template #header>
        <p class="text-sm text-slate-600">
          {{ t("showing") }} {{ startRow }}-{{ endRow }} / {{ pagination.total }}
        </p>
      </template>

      <template #default>
        <div class="at-table-wrap">
          <table class="at-table min-h-[460px]">
            <thead>
              <tr class="at-table-head-row">
                <th class="at-table-head-cell">{{ t("colCustomer") }}</th>
                <th class="at-table-head-cell">{{ t("colContact") }}</th>
                <th class="at-table-head-cell">{{ t("colProfile") }}</th>
                <th class="at-table-head-cell">{{ t("colConsentOwner") }}</th>
                <th class="at-table-head-cell">{{ t("colPortfolio") }}</th>
                <th class="at-table-head-cell">{{ t("colActions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in rows"
                :key="row.name"
                class="at-table-row cursor-pointer"
                @click="openCustomer360(row.name)"
              >
                <DataTableCell cell-class="min-w-[220px]">
                  <TableEntityCell :title="row.full_name || row.name" :facts="customerIdentityFacts(row)" />
                </DataTableCell>
                <TableFactsCell :items="customerContactFacts(row)" cell-class="min-w-[240px]" />
                <TableFactsCell :items="customerProfileFacts(row)" cell-class="min-w-[240px]" />
                <DataTableCell cell-class="min-w-[220px]">
                  <div class="space-y-2">
                    <StatusBadge type="consent" :status="normalizeConsentValue(row.consent_status)" />
                    <MiniFactList :items="customerOwnerFacts(row)" />
                  </div>
                </DataTableCell>
                <TableFactsCell :items="customerPortfolioFacts(row)" cell-class="min-w-[220px]" />
                <DataTableCell @click.stop>
                  <InlineActionRow>
                    <ActionButton variant="primary" size="xs" @click.stop="openCustomer360(row.name)">
                      {{ t("open360") }}
                    </ActionButton>
                    <ActionButton variant="link" size="xs" @click.stop="openQuickOfferForCustomer(row)">
                      {{ t("newOffer") }}
                    </ActionButton>
                  </InlineActionRow>
                </DataTableCell>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template #footer>
        <TablePagerFooter
          :page="pagination.page"
          :total-pages="totalPages"
          :page-label="t('page')"
          :previous-label="t('previous')"
          :next-label="t('next')"
          :prev-disabled="pagination.page <= 1 || customerListResource.loading"
          :next-disabled="!hasNextPage || customerListResource.loading"
          @previous="previousPage"
          @next="nextPage"
        />
      </template>
    </DataTableShell>

    <Dialog v-model="showQuickCustomerDialog" :options="{ title: quickCustomerUi.title, size: 'xl' }">
      <template #body-content>
        <QuickCreateDialogShell
          :error="quickCustomerError"
          :subtitle="quickCustomerUi.subtitle"
          :labels="quickCreateCommon"
          :loading="quickCustomerLoading"
          @cancel="cancelQuickCustomerDialog"
          @save="submitQuickCustomer(false)"
          @save-and-open="submitQuickCustomer(true)"
        >
          <QuickCreateFormRenderer
            :fields="customerQuickFields"
            :model="quickCustomerForm"
            :field-errors="quickCustomerFieldErrors"
            :disabled="quickCustomerLoading"
            :locale="activeLocale"
            :options-map="{}"
            @submit="submitQuickCustomer(false)"
          />
        </QuickCreateDialogShell>
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
import { useCustomerStore } from "../stores/customer";
import ActionButton from "../components/app-shell/ActionButton.vue";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import DataTableShell from "../components/app-shell/DataTableShell.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import MiniFactList from "../components/app-shell/MiniFactList.vue";
import PageToolbar from "../components/app-shell/PageToolbar.vue";
import QuickCreateDialogShell from "../components/app-shell/QuickCreateDialogShell.vue";
import QuickCreateFormRenderer from "../components/app-shell/QuickCreateFormRenderer.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import TablePagerFooter from "../components/app-shell/TablePagerFooter.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { buildQuickCreateDraft, getQuickCreateConfig, getLocalizedText } from "../config/quickCreateRegistry";
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
    title: "Müşteri Yönetimi",
    subtitle: "Müşteri workbench: filtre, preset ve 360 erisim",
    refresh: "Yenile",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    searchPlaceholder: "Müşteri / TC-VKN / telefon / e-posta ara",
    allConsentStatuses: "Tüm İzin Durumları",
    allGenders: "Tüm Cinsiyetler",
    allMaritalStatuses: "Tüm Medeni Durumlar",
    advancedFilters: "Gelismis Filtreler",
    hideAdvancedFilters: "Gelismis Filtreleri Gizle",
    activeFilters: "aktif filtre",
    presetLabel: "Filtre Şablonu",
    presetDefault: "Standart",
    presetConsentUnknown: "İzin Durumu Bilinmeyen",
    presetConsentGranted: "Onaylilar",
    presetAssignedToMe: "Bana Atananlar",
    presetAssignedUnknownConsent: "Bana Atanan + Onaysiz",
    presetWithPhone: "Telefonu Olanlar",
    presetWithEmail: "E-postasi Olanlar",
    presetContactReady: "İletişim Bilgisi Tam",
    presetUnknownGender: "Cinsiyeti Bilinmeyen",
    presetHasPortfolio: "Portföyü Olanlar",
    presetHasOpenOffer: "Açık Teklifi Olanlar",
    presetHighPortfolio: "Yüksek Portföy",
    presetPortfolioAndOpenOffer: "Portföy + Açık Teklif",
    presetAssignedPortfolio: "Bana Atanan + Portföy",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    savePresetPrompt: "Filtre sablonu adi",
    deletePresetConfirm: "Seçili özel filtre sablonu silinsin mi?",
    applyFilters: "Uygula",
    clearFilters: "Filtreleri Temizle",
    mobileSummaryTitle: "Liste Özeti",
    pageSize: "Sayfa Boyutu",
    assignedAgentFilter: "Temsilci (içerir)",
    occupationFilter: "Meslek (içerir)",
    hasPhoneOnly: "Sadece telefonu olanlar",
    hasEmailOnly: "Sadece e-postasi olanlar",
    hasActivePolicyOnly: "Aktif poliçesi olanlar",
    hasOpenOfferOnly: "Açık teklifi olanlar",
    loading: "Yükleniyor...",
    loadErrorTitle: "Liste Yüklenemedi",
    loadError: "Müşteri listesi yüklenirken hata oluştu. Lütfen tekrar deneyin.",
    emptyTitle: "Müşteri Bulunamadi",
    emptyDescription: "Filtrelere uygun müşteri kaydı bulunamadı.",
    showing: "Gösterilen",
    page: "Sayfa",
    previous: "Onceki",
    next: "Sonraki",
    open360: "360 Aç",
    newOffer: "Yeni Teklif",
    openDesk: "Yönetim",
    colCustomer: "Müşteri",
    colContact: "İletişim",
    colProfile: "Profil",
    colConsentOwner: "İzin / Temsilci",
    colPortfolio: "Portföy Özet",
    colActions: "Aksiyon",
    taxId: "TC/VKN",
    phone: "Telefon",
    email: "E-posta",
    birthDate: "Doğum",
    gender: "Cinsiyet",
    maritalStatus: "Medeni Durum",
    occupation: "Meslek",
    assignedAgent: "Temsilci",
    customerFolder: "Klasor",
    activePolicies: "Aktif Poliçe",
    openOffers: "Açık Teklif",
    activeGrossPremium: "Aktif Brüt",
    sortModifiedDesc: "Son Güncellenen",
    sortNameAsc: "Ada Gore (A-Z)",
    sortNameDesc: "Ada Gore (Z-A)",
    sortActivePolicyDesc: "Aktif Poliçe (Yüksek)",
    sortOpenOfferDesc: "Açık Teklif (Yüksek)",
    sortActiveGrossDesc: "Aktif Brüt Prim (Yüksek)",
    consentUnknown: "Bilinmiyor",
    consentGranted: "Onayli",
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
  },
  en: {
    title: "Customer Workbench",
    subtitle: "Customer workbench with filters, presets and 360 access",
    refresh: "Refresh",
    exportXlsx: "Excel",
    exportPdf: "PDF",
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
    openDesk: "Desk",
    colCustomer: "Customer",
    colContact: "Contact",
    colProfile: "Profile",
    colConsentOwner: "Consent / Owner",
    colPortfolio: "Portfolio",
    colActions: "Actions",
    taxId: "Tax ID",
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
const customerQuickFields = computed(() => quickCustomerConfig?.fields || []);
const quickCustomerUi = computed(() => ({
  title: getLocalizedText(quickCustomerConfig?.title, activeLocale.value),
  subtitle: getLocalizedText(quickCustomerConfig?.subtitle, activeLocale.value),
  newLabel: activeLocale.value === "tr" ? "Yeni Müşteri" : "New Customer",
}));
const quickCreateCommon = computed(() => ({
  cancel: activeLocale.value === "tr" ? "Vazgeç" : "Cancel",
  save: activeLocale.value === "tr" ? "Kaydet" : "Save",
  saveAndOpen: activeLocale.value === "tr" ? "Kaydet ve Aç" : "Save & Open",
  validation: activeLocale.value === "tr" ? "Lütfen gerekli alanlari ve formatlari kontrol edin." : "Please check required fields and formats.",
  failed: activeLocale.value === "tr" ? "Hızlı müşteri oluşturma başarısız oldu." : "Quick customer create failed.",
}));
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
    if (!field?.required) continue;
    if (String(quickCustomerForm[field.name] ?? "").trim() === "") {
      quickCustomerFieldErrors[field.name] = getLocalizedText(field.label, activeLocale.value);
      valid = false;
    }
  }

  const email = String(quickCustomerForm.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    quickCustomerFieldErrors.email = activeLocale.value === "tr" ? "Gecerli e-posta girin." : "Enter a valid email.";
    valid = false;
  }
  const birthDate = String(quickCustomerForm.birth_date || "");
  if (birthDate) {
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

function buildQuickCustomerPayload() {
  return Object.fromEntries(
    Object.entries(quickCustomerForm).map(([key, value]) => [key, String(value ?? "").trim() === "" ? null : value])
  );
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
  return [
    subtleFact("record", "ID", row?.name || "-"),
    ...(row?.customer_folder ? [subtleFact("folder", t("customerFolder"), row.customer_folder)] : []),
  ];
}

function customerContactFacts(row) {
  return [
    mutedFact("tax", t("taxId"), row?.tax_id || row?.masked_tax_id || "-"),
    mutedFact("phone", t("phone"), row?.phone || row?.masked_phone || "-"),
    mutedFact("email", t("email"), row?.email || "-"),
  ];
}

function customerProfileFacts(row) {
  return [
    mutedFact("birth", t("birthDate"), formatDate(row?.birth_date)),
    mutedFact("gender", t("gender"), genderLabel(row?.gender)),
    mutedFact("marital", t("maritalStatus"), maritalLabel(row?.marital_status)),
    mutedFact("occupation", t("occupation"), row?.occupation || "-"),
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
