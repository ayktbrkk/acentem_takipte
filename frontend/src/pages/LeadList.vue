<template>
  <section class="space-y-4">
    <div class="surface-card rounded-2xl p-5">
      <PageToolbar
        :title="t('title')"
        :subtitle="t('subtitle')"
        :show-refresh="true"
        :busy="leadListResource.loading"
        :refresh-label="t('refresh')"
        @refresh="refreshLeadList"
      >
        <template #actions>
          <div class="flex flex-wrap items-center gap-2">
            <QuickCreateLauncher variant="primary" size="sm" :label="quickLeadUi.newLabel" @launch="openQuickLeadDialog" />
            <ActionButton variant="secondary" size="sm" :disabled="leadListResource.loading" @click="refreshLeadList">
              {{ t("refresh") }}
            </ActionButton>
            <ActionButton variant="secondary" size="sm" :disabled="leadListResource.loading" @click="downloadLeadExport('xlsx')">
              {{ t("exportXlsx") }}
            </ActionButton>
            <ActionButton variant="primary" size="sm" :disabled="leadListResource.loading" @click="downloadLeadExport('pdf')">
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
            <input v-model.trim="filters.query" class="input" type="search" :placeholder="t('searchPlaceholder')" @keyup.enter="applyFilters" />

            <select v-model="filters.status" class="input">
              <option value="">{{ t('allStatuses') }}</option>
              <option v-for="option in leadStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>

            <select v-model="filters.sort" class="input">
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>

            <select v-model.number="pagination.pageLength" class="input">
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>

            <template #advanced>
              <input v-model.trim="filters.branch" class="input" type="search" :placeholder="t('branchFilter')" @keyup.enter="applyFilters" />
              <input v-model.trim="filters.sales_entity" class="input" type="search" :placeholder="t('salesEntityFilter')" @keyup.enter="applyFilters" />
              <input v-model.trim="filters.insurance_company" class="input" type="search" :placeholder="t('companyFilter')" @keyup.enter="applyFilters" />

              <select v-model="filters.conversion_state" class="input">
                <option value="">{{ t('allConversionStates') }}</option>
                <option v-for="option in conversionStateOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>

              <select v-model="filters.stale_state" class="input">
                <option value="">{{ t('allStaleStates') }}</option>
                <option v-for="option in staleStateOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>

              <input v-model="filters.estimated_min" class="input" type="number" min="0" step="0.01" :placeholder="t('estimatedMinFilter')" @keyup.enter="applyFilters" />
              <input v-model="filters.estimated_max" class="input" type="number" min="0" step="0.01" :placeholder="t('estimatedMaxFilter')" @keyup.enter="applyFilters" />

              <label class="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                <input v-model="filters.has_customer" class="h-4 w-4" type="checkbox" />
                <span>{{ t('hasCustomerOnly') }}</span>
              </label>

              <label class="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                <input v-model="filters.can_convert_to_offer" class="h-4 w-4" type="checkbox" />
                <span>{{ t('canConvertOnly') }}</span>
              </label>
            </template>

          </WorkbenchFilterToolbar>
        </template>
      </PageToolbar>
    </div>

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
        <div class="space-y-2">
          <p
            v-if="actionErrorText"
            class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
          >
            {{ actionErrorText }}
          </p>
          <p
            v-else-if="actionSuccessText && !lastConvertedOfferName"
            class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"
          >
            {{ actionSuccessText }}
          </p>
          <div v-if="lastConvertedOfferName" class="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
            <p class="text-xs font-medium text-emerald-700">{{ t('convertLeadSuccess') }}</p>
            <ActionButton variant="link" size="xs" @click="openOfferDetail(lastConvertedOfferName)">{{ t('openOffer') }}</ActionButton>
          </div>
          <p class="text-sm text-slate-600">{{ t('showing') }} {{ startRow }}-{{ endRow }} / {{ pagination.total }}</p>
        </div>
      </template>

      <template #default>
        <div class="at-table-wrap">
          <table class="at-table min-h-[460px]">
            <thead>
              <tr class="at-table-head-row">
                <th class="at-table-head-cell">{{ t('colLead') }}</th>
                <th class="at-table-head-cell">{{ t('colDetails') }}</th>
                <th class="at-table-head-cell">{{ t('colStatus') }}</th>
                <th class="at-table-head-cell">{{ t('colConversion') }}</th>
                <th class="at-table-head-cell">{{ t('colActions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.name" class="at-table-row cursor-pointer" @click="openLeadDetail(row.name)">
                <DataTableCell cell-class="min-w-[220px]">
                  <TableEntityCell :title="leadDisplayName(row)" :facts="leadIdentityFacts(row)" />
                </DataTableCell>
                <TableFactsCell :items="leadDetailsFacts(row)" cell-class="min-w-[260px]" />
                <DataTableCell cell-class="min-w-[148px]">
                  <div class="space-y-2">
                    <StatusBadge type="lead" :status="row.status || 'Draft'" />
                    <StatusBadge type="lead_stale" :status="leadStaleState(row)" />
                  </div>
                </DataTableCell>
                <DataTableCell cell-class="min-w-[240px]">
                  <div class="space-y-2">
                    <StatusBadge type="lead_conversion" :status="leadConversionState(row)" />
                    <MiniFactList :items="leadConversionFacts(row)" />
                  </div>
                </DataTableCell>
                <DataTableCell @click.stop>
                  <InlineActionRow>
                    <ActionButton
                      v-if="canConvertLead(row)"
                      variant="primary"
                      size="xs"
                      :disabled="leadConvertResource.loading && convertingLeadName === row.name"
                      @click.stop="convertLeadToOffer(row)"
                    >
                      {{
                        leadConvertResource.loading && convertingLeadName === row.name
                          ? t('converting')
                          : t('convertToOffer')
                      }}
                    </ActionButton>
                    <ActionButton v-if="row.customer" variant="link" size="xs" @click.stop="openCustomer360(row.customer)">{{ t('openCustomer360') }}</ActionButton>
                    <ActionButton v-if="row.converted_policy" variant="link" size="xs" @click.stop="openPolicyDetail(row.converted_policy)">{{ t('openPolicy') }}</ActionButton>
                    <ActionButton v-if="row.converted_offer" variant="link" size="xs" @click.stop="openOfferDetail(row.converted_offer)">{{ t('openOffer') }}</ActionButton>
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
          :prev-disabled="pagination.page <= 1 || leadListResource.loading"
          :next-disabled="!hasNextPage || leadListResource.loading"
          @previous="previousPage"
          @next="nextPage"
        />
      </template>
    </DataTableShell>

    <Dialog v-model="showQuickLeadDialog" :options="{ title: quickLeadUi.title, size: 'xl' }">
      <template #body-content>
        <QuickCreateDialogShell
          :error="quickLeadError"
          :subtitle="quickLeadUi.subtitle"
          :labels="quickCreateCommon"
          :loading="quickLeadLoading"
          @cancel="cancelQuickLeadDialog"
          @save="submitQuickLead(false)"
          @save-and-open="submitQuickLead(true)"
        >
          <QuickCreateFormRenderer
            :fields="leadQuickFields"
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
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Dialog, createResource } from "frappe-ui";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import ActionButton from "../components/app-shell/ActionButton.vue";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import DataTableShell from "../components/app-shell/DataTableShell.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import MiniFactList from "../components/app-shell/MiniFactList.vue";
import PageToolbar from "../components/app-shell/PageToolbar.vue";
import QuickCreateDialogShell from "../components/app-shell/QuickCreateDialogShell.vue";
import QuickCreateFormRenderer from "../components/app-shell/QuickCreateFormRenderer.vue";
import QuickCreateLauncher from "../components/app-shell/QuickCreateLauncher.vue";
import StatusBadge from "../components/StatusBadge.vue";
import TableEntityCell from "../components/app-shell/TableEntityCell.vue";
import TableFactsCell from "../components/app-shell/TableFactsCell.vue";
import TablePagerFooter from "../components/app-shell/TablePagerFooter.vue";
import WorkbenchFilterToolbar from "../components/app-shell/WorkbenchFilterToolbar.vue";
import { buildQuickCreateDraft, getQuickCreateConfig, getLocalizedText } from "../config/quickCreateRegistry";
import { runQuickCreateSuccessTargets } from "../utils/quickCreateSuccess";
import { mutedFact, subtleFact } from "../utils/factItems";
import { openListExport } from "../utils/listExport";
import { buildQuickCreateIntentQuery, readQuickCreateIntent, stripQuickCreateIntentQuery } from "../utils/quickRouteIntent";
import { buildRelatedQuickCreateNavigation } from "../utils/relatedQuickCreate";
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
const activeLocale = computed(() => unref(authStore.locale) || "en");
const safeRouteQuery = computed(() => {
  const query = route && typeof route === "object" ? route.query : null;
  return query && typeof query === "object" ? query : {};
});

function buildOfficeBranchLookupFilters() {
  const officeBranch = branchStore.requestBranch || "";
  return officeBranch ? { office_branch: officeBranch } : {};
}
const copy = {
  tr: {
    title: "Fırsat Yönetimi",
    subtitle: "Fırsat workbench: filtre, preset ve dönüşüm takibi",
    refresh: "Yenile",
    exportXlsx: "Excel",
    exportPdf: "PDF",
    searchPlaceholder: "Fırsat / e-posta / müşteri / kayıt ara",
    allStatuses: "Tüm Durumlar",
    allConversionStates: "Tüm Dönüşüm Durumları",
    allStaleStates: "Tüm Takip Durumları",
    advancedFilters: "Gelismis Filtreler",
    hideAdvancedFilters: "Gelismis Filtreleri Gizle",
    activeFilters: "aktif filtre",
    presetLabel: "Filtre Şablonu",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    savePresetPrompt: "Filtre sablonu adi",
    deletePresetConfirm: "Seçili özel filtre sablonu silinsin mi?",
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
    showing: "Gösterilen",
    page: "Sayfa",
    previous: "Onceki",
    next: "Sonraki",
    colLead: "Fırsat",
    colDetails: "Detaylar",
    colStatus: "Durum",
    colConversion: "Dönüşüm",
    colActions: "Aksiyon",
    openDesk: "Yönetim",
    openCustomer360: "Müşteri 360",
    openPolicy: "Poliçe Detayı",
    openOffer: "Teklif",
    convertToOffer: "Teklife Cevir",
    converting: "Cevriliyor...",
    convertLeadSuccess: "Fırsat teklife dönüştürüldü.",
    convertLeadError: "Fırsat teklife dönüştürülemedi. Eksik alanları kontrol edin.",
    presetDefault: "Standart",
    presetOpen: "Açık Fırsatlar",
    presetHighPotential: "Yüksek Potansiyel",
    presetUnconverted: "Dönüşmeyenler",
    presetConvertedPolicy: "Poliçeye Dönüşenler",
    presetFollowUpQueue: "Takip Kuyrugu",
    presetWaitingLeads: "Bekleyen Fırsatlar",
    presetConvertible: "Teklife Cevrilebilir",
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
    noConversion: "Henuz donusum yok",
    nextAction: "Sonraki Aksiyon",
    missingFields: "Eksik Alanlar",
    conversionActionConvert: "Teklife Cevir",
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
  },
  en: {
    title: "Lead Workbench",
    subtitle: "Lead workbench with filters, presets and conversion tracking",
    refresh: "Refresh",
    exportXlsx: "Excel",
    exportPdf: "PDF",
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
    showing: "Showing",
    page: "Page",
    previous: "Previous",
    next: "Next",
    colLead: "Lead",
    colDetails: "Details",
    colStatus: "Status",
    colConversion: "Conversion",
    colActions: "Actions",
    openDesk: "Desk",
    openCustomer360: "Customer 360",
    openPolicy: "Policy Detail",
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
  },
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const filters = reactive({
  query: "",
  status: "",
  branch: "",
  sales_entity: "",
  insurance_company: "",
  conversion_state: "",
  stale_state: "",
  estimated_min: "",
  estimated_max: "",
  has_customer: false,
  can_convert_to_offer: false,
  sort: "modified desc",
});

const pagination = reactive({ page: 1, pageLength: 20, total: 0 });
const PRESET_STORAGE_KEY = "at:lead-list:preset";
const PRESET_LIST_STORAGE_KEY = "at:lead-list:preset-list";
const presetKey = ref(readFilterPresetKey(PRESET_STORAGE_KEY, "default"));
const customPresets = ref(readFilterPresetList(PRESET_LIST_STORAGE_KEY));
const loadErrorText = ref("");
const actionSuccessText = ref("");
const actionErrorText = ref("");
const convertingLeadName = ref("");
const lastConvertedOfferName = ref("");
let actionFlashTimer = null;
const quickLeadConfig = getQuickCreateConfig("lead");
const showQuickLeadDialog = ref(false);
const quickLeadLoading = ref(false);
const quickLeadError = ref("");
const quickLeadFieldErrors = reactive({});
const quickLeadForm = reactive(buildQuickCreateDraft(quickLeadConfig));
const quickLeadReturnTo = ref("");
const quickLeadOpenedFromIntent = ref(false);
const QUICK_OPTION_LIMIT = 2000;

const leadListResource = createResource({ url: "acentem_takipte.acentem_takipte.api.dashboard.get_lead_workbench_rows", auto: false });
const quickLeadCreateResource = createResource({ url: quickLeadConfig.submitUrl, auto: false });
const leadConvertResource = createResource({
  url: "acentem_takipte.acentem_takipte.doctype.at_lead.at_lead.convert_to_offer",
  auto: false,
});
const leadQuickBranchResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: { doctype: "AT Branch", fields: ["name", "branch_name"], filters: { is_active: 1 }, order_by: "branch_name asc", limit_page_length: QUICK_OPTION_LIMIT },
});
const leadQuickCompanyResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: { doctype: "AT Insurance Company", fields: ["name", "company_name"], filters: { is_active: 1 }, order_by: "company_name asc", limit_page_length: QUICK_OPTION_LIMIT },
});
const leadQuickSalesEntityResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: { doctype: "AT Sales Entity", fields: ["name", "full_name"], order_by: "full_name asc", limit_page_length: QUICK_OPTION_LIMIT },
});
const leadQuickCustomerResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Customer",
    fields: ["name", "full_name"],
    filters: buildOfficeBranchLookupFilters(),
    order_by: "modified desc",
    limit_page_length: QUICK_OPTION_LIMIT,
  },
});
const presetServerReadResource = createResource({ url: "acentem_takipte.acentem_takipte.api.filter_presets.get_filter_preset_state", auto: false });
const presetServerWriteResource = createResource({ url: "acentem_takipte.acentem_takipte.api.filter_presets.set_filter_preset_state", auto: false });

const rows = computed(() => leadListResource.data?.rows || []);
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
const leadQuickFields = computed(() => quickLeadConfig?.fields || []);
const leadQuickOptionsMap = computed(() => ({
  branches: (leadQuickBranchResource.data || []).map((row) => ({ value: row.name, label: row.branch_name || row.name })),
  insuranceCompanies: (leadQuickCompanyResource.data || []).map((row) => ({ value: row.name, label: row.company_name || row.name })),
  salesEntities: (leadQuickSalesEntityResource.data || []).map((row) => ({ value: row.name, label: row.full_name || row.name })),
  customers: (leadQuickCustomerResource.data || []).map((row) => ({ value: row.name, label: row.full_name || row.name })),
}));
const quickLeadUi = computed(() => ({
  title: getLocalizedText(quickLeadConfig?.title, activeLocale.value),
  subtitle: getLocalizedText(quickLeadConfig?.subtitle, activeLocale.value),
  newLabel: activeLocale.value === "tr" ? "Yeni Fırsat" : "New Lead",
}));
const quickCreateCommon = computed(() => ({
  cancel: activeLocale.value === "tr" ? "Vazgeç" : "Cancel",
  save: activeLocale.value === "tr" ? "Kaydet" : "Save",
  saveAndOpen: activeLocale.value === "tr" ? "Kaydet ve Aç" : "Save & Open",
  validation: activeLocale.value === "tr" ? "Lütfen gerekli alanlari doldurun." : "Please fill required fields.",
  failed: activeLocale.value === "tr" ? "Hızlı kayıt oluşturulamadı." : "Quick create failed.",
}));
const isInitialLoading = computed(() => leadListResource.loading && rows.value.length === 0);
const leadStatusOptions = computed(() => [
  { value: "Draft", label: t("statusDraft") },
  { value: "Open", label: t("statusOpen") },
  { value: "Replied", label: t("statusReplied") },
  { value: "Closed", label: t("statusClosed") },
]);
const conversionStateOptions = computed(() => [
  { value: "unconverted", label: t("conversionStateUnconverted") },
  { value: "any_converted", label: t("conversionStateAnyConverted") },
  { value: "offer", label: t("conversionStateOffer") },
  { value: "policy", label: t("conversionStatePolicy") },
]);
const staleStateOptions = computed(() => [
  { value: "Fresh", label: t("staleStateFresh") },
  { value: "FollowUp", label: t("staleStateFollowUp") },
  { value: "Stale", label: t("staleStateStale") },
]);
const sortOptions = computed(() => [
  { value: "modified desc", label: t("sortModifiedDesc") },
  { value: "first_name asc", label: t("sortNameAsc") },
  { value: "first_name desc", label: t("sortNameDesc") },
  { value: "estimated_gross_premium desc", label: t("sortEstimatedDesc") },
  { value: "estimated_gross_premium asc", label: t("sortEstimatedAsc") },
  { value: "stale_state desc", label: t("sortStalePriority") },
  { value: "can_convert_to_offer desc", label: t("sortActionableFirst") },
  { value: "conversion_state desc", label: t("sortConversionPriority") },
]);
const presetOptions = computed(() => [
  { value: "default", label: t("presetDefault") },
  { value: "openLeads", label: t("presetOpen") },
  { value: "highPotential", label: t("presetHighPotential") },
  { value: "unconverted", label: t("presetUnconverted") },
  { value: "convertedPolicy", label: t("presetConvertedPolicy") },
  { value: "followUpQueue", label: t("presetFollowUpQueue") },
  { value: "waitingLeads", label: t("presetWaitingLeads") },
  { value: "convertible", label: t("presetConvertible") },
  ...customPresets.value.map((preset) => ({
    value: makeCustomFilterPresetValue(preset.id),
    label: preset.label,
  })),
]);
const canDeletePreset = computed(() => isCustomFilterPresetValue(presetKey.value));
const activeFilterCount = computed(() => [
  filters.query,
  filters.status,
  filters.branch,
  filters.sales_entity,
  filters.insurance_company,
  filters.conversion_state,
  filters.stale_state,
  filters.estimated_min,
  filters.estimated_max,
  filters.has_customer ? "1" : "",
  filters.can_convert_to_offer ? "1" : "",
].filter((v) => String(v ?? "").trim() !== "").length);
const totalPages = computed(() => Math.max(1, Math.ceil((pagination.total || 0) / pagination.pageLength || 1)));
const hasNextPage = computed(() => pagination.page < totalPages.value);
const startRow = computed(() => (pagination.total ? (pagination.page - 1) * pagination.pageLength + 1 : 0));
const endRow = computed(() => (pagination.total ? Math.min(pagination.total, pagination.page * pagination.pageLength) : 0));

function leadDisplayName(row) {
  return `${String(row?.first_name || "").trim()} ${String(row?.last_name || "").trim()}`.trim() || row?.name || "-";
}
function fmtDateTime(value) {
  if (!value) return "-";
  try { return new Intl.DateTimeFormat(localeCode.value, { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); }
  catch { return String(value); }
}
function fmtCurrency(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat(localeCode.value, { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n);
}
function buildQueryOrFilters() {
  if (!filters.query) return null;
  const q = `%${filters.query}%`;
  return [
    ["AT Lead", "name", "like", q],
    ["AT Lead", "first_name", "like", q],
    ["AT Lead", "last_name", "like", q],
    ["AT Lead", "email", "like", q],
    ["AT Lead", "customer", "like", q],
  ];
}
function buildFilterPayload() {
  const out = { filters: {} };
  if (filters.status) out.filters.status = filters.status;
  if (filters.branch) out.filters.branch = ["like", `%${filters.branch}%`];
  if (filters.sales_entity) out.filters.sales_entity = ["like", `%${filters.sales_entity}%`];
  if (filters.insurance_company) out.filters.insurance_company = ["like", `%${filters.insurance_company}%`];
  if (filters.has_customer) out.filters.customer = ["is", "set"];
  const min = Number(filters.estimated_min);
  const max = Number(filters.estimated_max);
  const hasMin = String(filters.estimated_min).trim() !== "" && Number.isFinite(min);
  const hasMax = String(filters.estimated_max).trim() !== "" && Number.isFinite(max);
  if (hasMin && hasMax) out.filters.estimated_gross_premium = ["between", [min, max]];
  else if (hasMin) out.filters.estimated_gross_premium = [">=", min];
  else if (hasMax) out.filters.estimated_gross_premium = ["<=", max];
  if (filters.conversion_state === "unconverted") {
    out.filters.converted_offer = ["is", "not set"];
    out.filters.converted_policy = ["is", "not set"];
  } else if (filters.conversion_state === "offer") {
    out.filters.converted_offer = ["is", "set"];
  } else if (filters.conversion_state === "policy") {
    out.filters.converted_policy = ["is", "set"];
  } else if (filters.conversion_state === "any_converted") {
    out.or_filters = [["AT Lead", "converted_offer", "is", "set"], ["AT Lead", "converted_policy", "is", "set"]];
  }
  if (filters.query && filters.conversion_state !== "any_converted") out.or_filters = buildQueryOrFilters();
  return out;
}
function buildListParams() {
  return withOfficeBranchFilter({
    page: pagination.page,
    page_length: pagination.pageLength,
    filters: {
      ...buildFilterPayload().filters,
      query: filters.query || "",
      conversion_state: filters.conversion_state || "",
      stale_state: filters.stale_state || "",
      estimated_min: filters.estimated_min,
      estimated_max: filters.estimated_max,
      has_customer: Boolean(filters.has_customer),
      can_convert_to_offer: Boolean(filters.can_convert_to_offer),
      sort: filters.sort,
      branch: filters.branch || "",
      sales_entity: filters.sales_entity || "",
      insurance_company: filters.insurance_company || "",
      status: filters.status || "",
    },
  });
}

function buildLeadExportQuery() {
  return {
    filters: {
      ...(buildListParams().filters || {}),
    },
  };
}

function downloadLeadExport(format) {
  openListExport({
    screen: "lead_list",
    query: buildLeadExportQuery(),
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
async function refreshLeadList() {
  const params = buildListParams();
  leadListResource.params = params;
  const result = await leadListResource.reload(params).catch((error) => ({ __error: error }));
  if (!result?.__error) {
    const payload = result || {};
    leadListResource.setData(payload);
    loadErrorText.value = "";
    const total = Number(payload?.total || 0);
    pagination.total = Number.isFinite(total) ? total : 0;
    return;
  }
  leadListResource.setData({ rows: [], total: 0 });
  pagination.total = 0;
  loadErrorText.value = t("loadError");
}
function clearActionFeedback() {
  if (actionFlashTimer) {
    window.clearTimeout(actionFlashTimer);
    actionFlashTimer = null;
  }
  actionSuccessText.value = "";
  actionErrorText.value = "";
  lastConvertedOfferName.value = "";
}
function scheduleActionFeedbackClear() {
  if (actionFlashTimer) window.clearTimeout(actionFlashTimer);
  actionFlashTimer = window.setTimeout(() => {
    actionSuccessText.value = "";
    actionErrorText.value = "";
    lastConvertedOfferName.value = "";
    actionFlashTimer = null;
  }, 4000);
}
function applyFilters() { pagination.page = 1; refreshLeadList(); }
function previousPage() { if (pagination.page <= 1) return; pagination.page -= 1; refreshLeadList(); }
function nextPage() { if (!hasNextPage.value) return; pagination.page += 1; refreshLeadList(); }
function currentPresetPayload() {
  return {
    query: filters.query,
    status: filters.status,
    branch: filters.branch,
    sales_entity: filters.sales_entity,
    insurance_company: filters.insurance_company,
    conversion_state: filters.conversion_state,
    stale_state: filters.stale_state,
    estimated_min: filters.estimated_min,
    estimated_max: filters.estimated_max,
    has_customer: Boolean(filters.has_customer),
    can_convert_to_offer: Boolean(filters.can_convert_to_offer),
    sort: filters.sort,
    pageLength: pagination.pageLength,
  };
}
function applyPreset(key, { refresh = true } = {}) {
  const preset = String(key || "default");
  if (isCustomFilterPresetValue(preset)) {
    const customId = extractCustomFilterPresetId(preset);
    const custom = customPresets.value.find((row) => row.id === customId);
    if (!custom) {
      applyPreset("default", { refresh });
      return;
    }
    const payload = custom.payload || {};
    presetKey.value = preset;
    writeFilterPresetKey(PRESET_STORAGE_KEY, preset);
    filters.query = String(payload.query || "");
    filters.status = String(payload.status || "");
    filters.branch = String(payload.branch || "");
    filters.sales_entity = String(payload.sales_entity || "");
    filters.insurance_company = String(payload.insurance_company || "");
    filters.conversion_state = String(payload.conversion_state || "");
    filters.stale_state = String(payload.stale_state || "");
    filters.estimated_min = payload.estimated_min ?? "";
    filters.estimated_max = payload.estimated_max ?? "";
    filters.has_customer = Boolean(payload.has_customer);
    filters.can_convert_to_offer = Boolean(payload.can_convert_to_offer);
    filters.sort = String(payload.sort || "modified desc");
    pagination.pageLength = Number(payload.pageLength || 20) || 20;
    pagination.page = 1;
    if (refresh) refreshLeadList();
    return;
  }

  presetKey.value = preset;
  writeFilterPresetKey(PRESET_STORAGE_KEY, preset);
  filters.query = "";
  filters.status = "";
  filters.branch = "";
  filters.sales_entity = "";
  filters.insurance_company = "";
  filters.conversion_state = "";
  filters.stale_state = "";
  filters.estimated_min = "";
  filters.estimated_max = "";
  filters.has_customer = false;
  filters.can_convert_to_offer = false;
  filters.sort = "modified desc";
  pagination.pageLength = 20;
  if (preset === "openLeads") filters.status = "Open";
  if (preset === "highPotential") { filters.status = "Open"; filters.estimated_min = 10000; }
  if (preset === "unconverted") filters.conversion_state = "unconverted";
  if (preset === "convertedPolicy") filters.conversion_state = "policy";
  if (preset === "followUpQueue") {
    filters.status = "Open";
    filters.stale_state = "FollowUp";
    filters.sort = "stale_state desc";
  }
  if (preset === "waitingLeads") {
    filters.stale_state = "Stale";
    filters.sort = "stale_state desc";
  }
  if (preset === "convertible") {
    filters.conversion_state = "unconverted";
    filters.can_convert_to_offer = true;
    filters.sort = "can_convert_to_offer desc";
  }
  pagination.page = 1;
  if (refresh) refreshLeadList();
}
function onPresetChange() {
  applyPreset(presetKey.value, { refresh: true });
  void persistPresetStateToServer();
}
function resetFilters() {
  applyPreset("default", { refresh: false });
  void persistPresetStateToServer();
  refreshLeadList();
}
function hasMeaningfulPresetState(selectedKey) {
  return String(selectedKey || "default") !== "default" || customPresets.value.length > 0;
}
async function persistPresetStateToServer() {
  try {
    await presetServerWriteResource.submit({
      screen: "lead_list",
      selected_key: presetKey.value,
      custom_presets: customPresets.value,
    });
  } catch {
    // local fallback
  }
}
async function hydratePresetStateFromServer() {
  try {
    const remote = await presetServerReadResource.reload({ screen: "lead_list" });
    const remoteSelectedKey = String(remote?.selected_key || "default");
    const remoteCustomPresets = Array.isArray(remote?.custom_presets) ? remote.custom_presets : [];
    const remoteHasState =
      String(remoteSelectedKey || "default") !== "default" || remoteCustomPresets.length > 0;
    const localHasState = hasMeaningfulPresetState(presetKey.value);
    if (!remoteHasState) {
      if (localHasState) void persistPresetStateToServer();
      return;
    }
    const localSnapshot = JSON.stringify({ selected_key: presetKey.value, custom_presets: customPresets.value });
    const remoteSnapshot = JSON.stringify({ selected_key: remoteSelectedKey, custom_presets: remoteCustomPresets });
    if (localSnapshot === remoteSnapshot) return;
    customPresets.value = remoteCustomPresets;
    writeFilterPresetList(PRESET_LIST_STORAGE_KEY, customPresets.value);
    applyPreset(remoteSelectedKey, { refresh: true });
  } catch {
    // local fallback
  }
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
  writeFilterPresetList(PRESET_LIST_STORAGE_KEY, customPresets.value);
  presetKey.value = makeCustomFilterPresetValue(targetId);
  writeFilterPresetKey(PRESET_STORAGE_KEY, presetKey.value);
  void persistPresetStateToServer();
}
function deletePreset() {
  if (!canDeletePreset.value) return;
  if (!window.confirm(t("deletePresetConfirm"))) return;
  const customId = extractCustomFilterPresetId(presetKey.value);
  if (!customId) return;
  customPresets.value = customPresets.value.filter((item) => item.id !== customId);
  writeFilterPresetList(PRESET_LIST_STORAGE_KEY, customPresets.value);
  applyPreset("default", { refresh: true });
  void persistPresetStateToServer();
}
function clearQuickLeadFieldErrors() {
  Object.keys(quickLeadFieldErrors).forEach((key) => delete quickLeadFieldErrors[key]);
}
function resetQuickLeadForm() {
  Object.assign(quickLeadForm, buildQuickCreateDraft(quickLeadConfig));
  quickLeadError.value = "";
  clearQuickLeadFieldErrors();
}
function openQuickLeadDialog({ fromIntent = false, returnTo = "" } = {}) {
  resetQuickLeadForm();
  quickLeadOpenedFromIntent.value = !!fromIntent;
  quickLeadReturnTo.value = returnTo || "";
  showQuickLeadDialog.value = true;
}
function cancelQuickLeadDialog() {
  showQuickLeadDialog.value = false;
  if (quickLeadOpenedFromIntent.value && quickLeadReturnTo.value) {
    const target = quickLeadReturnTo.value;
    quickLeadOpenedFromIntent.value = false;
    quickLeadReturnTo.value = "";
    router.push(target).catch(() => {});
    return;
  }
  quickLeadOpenedFromIntent.value = false;
  quickLeadReturnTo.value = "";
}
function validateQuickLeadForm() {
  clearQuickLeadFieldErrors();
  quickLeadError.value = "";
  let valid = true;
  for (const field of leadQuickFields.value) {
    if (!field?.required) continue;
    const value = quickLeadForm[field.name];
    if (String(value ?? "").trim() === "") {
      quickLeadFieldErrors[field.name] = getLocalizedText(field.label, activeLocale.value);
      valid = false;
    }
  }
  if (!valid) quickLeadError.value = quickCreateCommon.value.validation;
  return valid;
}
function buildQuickLeadPayload() {
  return {
    first_name: quickLeadForm.first_name || null,
    last_name: quickLeadForm.last_name || null,
    phone: quickLeadForm.phone || null,
    tax_id: quickLeadForm.tax_id || null,
    email: quickLeadForm.email || null,
    status: quickLeadForm.status || "Open",
    customer: quickLeadForm.customer || null,
    sales_entity: quickLeadForm.sales_entity || null,
    insurance_company: quickLeadForm.insurance_company || null,
    branch: quickLeadForm.branch || null,
    estimated_gross_premium:
      quickLeadForm.estimated_gross_premium === "" ? null : Number(quickLeadForm.estimated_gross_premium || 0),
    notes: quickLeadForm.notes || null,
  };
}
async function submitQuickLead(openAfter = false) {
  if (quickLeadLoading.value) return;
  if (!validateQuickLeadForm()) return;
  quickLeadLoading.value = true;
  quickLeadError.value = "";
  try {
    const result = await quickLeadCreateResource.submit(buildQuickLeadPayload());
    const leadName = result?.lead || quickLeadCreateResource.data?.lead || null;
    showQuickLeadDialog.value = false;
    resetQuickLeadForm();
    await runQuickCreateSuccessTargets(quickLeadConfig?.successRefreshTargets, {
      lead_list: refreshLeadList,
    });
    const returnTarget = quickLeadOpenedFromIntent.value ? quickLeadReturnTo.value : "";
    quickLeadOpenedFromIntent.value = false;
    quickLeadReturnTo.value = "";
    if (!openAfter && returnTarget) {
      router.push(returnTarget).catch(() => {});
      return;
    }
    if (openAfter && leadName) openLeadDetail(leadName);
  } catch (error) {
    quickLeadError.value = parseActionError(error) || quickCreateCommon.value.failed;
  } finally {
    quickLeadLoading.value = false;
  }
}

function applyQuickLeadPrefills(prefills = {}) {
  if (!prefills || typeof prefills !== "object") return;
  for (const field of leadQuickFields.value) {
    const fieldName = String(field?.name || "").trim();
    if (!fieldName || !(fieldName in prefills)) continue;
    quickLeadForm[fieldName] = String(prefills[fieldName] ?? "").trim();
  }
}

function buildLeadQuickReturnTo() {
  const prefills = {};
  for (const field of leadQuickFields.value) {
    const fieldName = String(field?.name || "").trim();
    if (!fieldName) continue;
    const value = String(quickLeadForm[fieldName] ?? "").trim();
    if (!value) continue;
    prefills[fieldName] = value;
  }
  return router.resolve({
    name: "lead-list",
    query: buildQuickCreateIntentQuery({ prefills }),
  }).fullPath;
}

function onLeadRelatedCreateRequested(request = {}) {
  const navigation = buildRelatedQuickCreateNavigation({
    optionsSource: request?.optionsSource,
    query: request?.query,
    returnTo: buildLeadQuickReturnTo(),
  });
  if (!navigation) return;
  router.push(navigation).catch(() => {});
}

function consumeQuickLeadRouteIntent() {
  const intent = readQuickCreateIntent(safeRouteQuery.value);
  if (!intent.quick) return;
  openQuickLeadDialog({ fromIntent: true, returnTo: intent.returnTo });
  applyQuickLeadPrefills(intent.prefills || {});
  const nextQuery = stripQuickCreateIntentQuery(safeRouteQuery.value);
  router.replace({ name: "lead-list", query: nextQuery }).catch(() => {});
}
function openLeadDetail(name) { router.push({ name: "lead-detail", params: { name } }); }
function openOfferDetail(name) { router.push({ name: "offer-detail", params: { name } }); }
function openCustomer360(name) { router.push({ name: "customer-detail", params: { name } }); }
function openPolicyDetail(name) { router.push({ name: "policy-detail", params: { name } }); }
function canConvertLead(row) {
  if (typeof row?.can_convert_to_offer === "boolean") return row.can_convert_to_offer;
  if (!row || row.converted_offer || row.converted_policy) return false;
  if (String(row.status || "") === "Closed") return false;
  if (!row.customer || !row.sales_entity || !row.insurance_company || !row.branch) return false;
  const estimated = Number(row.estimated_gross_premium || 0);
  return Number.isFinite(estimated) && estimated > 0;
}
async function convertLeadToOffer(row) {
  if (!canConvertLead(row) || !row?.name || leadConvertResource.loading) return;
  clearActionFeedback();
  convertingLeadName.value = row.name;
  try {
    const result = await leadConvertResource.submit({ lead_name: row.name });
    lastConvertedOfferName.value = result?.offer || "";
    actionSuccessText.value = lastConvertedOfferName.value ? "" : (result?.message || t("convertLeadSuccess"));
    await refreshLeadList();
    scheduleActionFeedbackClear();
  } catch (error) {
    actionErrorText.value = parseActionError(error) || t("convertLeadError");
    scheduleActionFeedbackClear();
  } finally {
    convertingLeadName.value = "";
  }
}
function parseActionError(error) {
  const direct = error?.message || error?.exc_type;
  if (direct) return String(direct);
  const serverMessage =
    error?._server_messages ||
    error?.messages?.[0] ||
    error?.response?._server_messages ||
    error?.response?.message;
  if (!serverMessage) return "";
  try {
    const parsed = typeof serverMessage === "string" ? JSON.parse(serverMessage) : serverMessage;
    if (Array.isArray(parsed) && parsed.length) {
      return String(parsed[0]).replace(/<[^>]*>/g, "").trim();
    }
  } catch {
    return String(serverMessage).replace(/<[^>]*>/g, "").trim();
  }
  return "";
}
function leadIdentityFacts(row) {
  return [subtleFact("record", t("record"), row?.name || "-"), subtleFact("modified", t("modified"), fmtDateTime(row?.modified))];
}
function leadDetailsFacts(row) {
  return [
    mutedFact("email", t("email"), row?.email || "-"),
    mutedFact("customer", t("customer"), row?.customer || "-"),
    mutedFact("sales", t("salesEntity"), row?.sales_entity || "-"),
    mutedFact("company", t("company"), row?.insurance_company || "-"),
    mutedFact("branch", t("branch"), row?.branch || "-"),
    mutedFact("est", t("estimatedGross"), fmtCurrency(row?.estimated_gross_premium)),
  ];
}
function leadConversionFacts(row) {
  const items = [];
  if (row?.converted_offer) items.push(mutedFact("offer", t("convertedOffer"), row.converted_offer));
  if (row?.converted_policy) items.push(mutedFact("policy", t("convertedPolicy"), row.converted_policy));
  if (!items.length) {
    const missing = leadConversionMissingFields(row);
    const nextAction =
      String(row?.status || "") === "Closed"
        ? t("conversionActionClosed")
        : canConvertLead(row)
          ? t("conversionActionConvert")
          : t("conversionActionReview");
    items.push(mutedFact("none", t("convertedPolicy"), t("noConversion")));
    items.push(subtleFact("next", t("nextAction"), nextAction));
    if (missing) items.push(subtleFact("missing", t("missingFields"), missing));
  }
  return items;
}
function leadConversionState(row) {
  if (row?.conversion_state) return row.conversion_state;
  if (row?.converted_policy) return "Policy";
  if (row?.converted_offer) return "Offer";
  if (String(row?.status || "") === "Closed") return "Closed";
  if (canConvertLead(row)) return "Actionable";
  return "Incomplete";
}
function leadConversionMissingFields(row) {
  if (Array.isArray(row?.conversion_missing_fields) && row.conversion_missing_fields.length) {
    const mapping = {
      customer: t("customer"),
      sales_entity: t("salesEntity"),
      insurance_company: t("company"),
      branch: t("branch"),
      estimated_gross_premium: t("estimatedGross"),
    };
    return row.conversion_missing_fields.map((field) => mapping[field] || field).join(", ");
  }
  if (!row || row.converted_offer || row.converted_policy) return "";
  const missing = [];
  if (!row.customer) missing.push(t("customer"));
  if (!row.sales_entity) missing.push(t("salesEntity"));
  if (!row.insurance_company) missing.push(t("company"));
  if (!row.branch) missing.push(t("branch"));
  const estimated = Number(row.estimated_gross_premium || 0);
  if (!(Number.isFinite(estimated) && estimated > 0)) missing.push(t("estimatedGross"));
  return missing.join(", ");
}
function leadStaleState(row) {
  if (row?.stale_state) return row.stale_state;
  const days = leadAgeDays(row?.modified);
  if (days >= 8) return "Stale";
  if (days >= 3) return "FollowUp";
  return "Fresh";
}
function leadAgeDays(value) {
  if (!value) return 999;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 999;
  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

applyPreset(presetKey.value, { refresh: false });
void refreshLeadList();
watch(
  () => branchStore.selected,
  () => {
    pagination.page = 1;
    leadQuickCustomerResource.params = {
      doctype: "AT Customer",
      fields: ["name", "full_name"],
      filters: buildOfficeBranchLookupFilters(),
      order_by: "modified desc",
      limit_page_length: QUICK_OPTION_LIMIT,
    };
    void leadQuickCustomerResource.reload();
    void refreshLeadList();
  }
);
void hydratePresetStateFromServer();
void consumeQuickLeadRouteIntent();
onBeforeUnmount(() => {
  if (actionFlashTimer) window.clearTimeout(actionFlashTimer);
});
</script>

<style scoped>
.input { @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm; }
</style>
