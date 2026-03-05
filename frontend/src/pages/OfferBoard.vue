<template>
  <section class="space-y-4">
    <div class="surface-card rounded-2xl p-5">
      <PageToolbar :title="t('title')" :subtitle="t('subtitle')" :busy="offersResource.loading">
        <template #actions>
          <div class="flex flex-wrap items-center gap-2">
            <ActionButton :variant="isListView ? 'primary' : 'secondary'" size="sm" @click="setOfferViewMode('list')">
              {{ t("viewList") }}
            </ActionButton>
            <ActionButton :variant="isListView ? 'secondary' : 'primary'" size="sm" @click="setOfferViewMode('board')">
              {{ t("viewBoard") }}
            </ActionButton>
            <QuickCreateLauncher variant="primary" size="sm" :label="t('newOffer')" @launch="openQuickOfferDialog" />
            <ActionButton variant="secondary" size="sm" @click="refreshOffers">
              {{ t("refresh") }}
            </ActionButton>
          </div>
        </template>
        <template #filters>
          <WorkbenchFilterToolbar
            v-if="isListView"
            v-model="offerPresetKey"
            :advanced-label="t('advancedFilters')"
            :collapse-label="t('hideAdvancedFilters')"
            :active-count="offerActiveFilterCount"
            :active-count-label="t('activeFilters')"
            :preset-label="t('presetLabel')"
            :preset-options="offerPresetOptions"
            :can-delete-preset="canDeleteOfferPreset"
            :save-label="t('savePreset')"
            :delete-label="t('deletePreset')"
            :apply-label="t('applyFilters')"
            :reset-label="t('clearFilters')"
            @preset-change="onOfferPresetChange"
            @preset-save="saveOfferPreset"
            @preset-delete="deleteOfferPreset"
            @apply="applyOfferListFilters"
            @reset="resetOfferListFilters"
          >
            <input
              v-model.trim="offerListFilters.query"
              class="input"
              type="search"
              :placeholder="t('searchPlaceholder')"
              @keyup.enter="applyOfferListFilters"
            />

            <select v-model="offerListFilters.insurance_company" class="input">
              <option value="">{{ t("allCompanies") }}</option>
              <option v-for="company in offerCompanies" :key="company" :value="company">
                {{ company }}
              </option>
            </select>

            <input
              v-model="offerListFilters.valid_until"
              class="input"
              type="date"
              :placeholder="t('validUntilFilter')"
            />

            <select v-model="offerListFilters.status" class="input">
              <option value="">{{ t("allStatuses") }}</option>
              <option v-for="status in offerStatusOptions" :key="status.value" :value="status.value">
                {{ status.label }}
              </option>
            </select>

            <select v-model="offerListFilters.sort" class="input">
              <option v-for="option in offerSortOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>

            <select v-model.number="offerListPagination.pageLength" class="input">
              <option :value="20">20</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>

            <template #advanced>
              <select v-model="offerListFilters.branch" class="input">
                <option value="">{{ t("allBranches") }}</option>
                <option v-for="branch in branches" :key="branch.name" :value="branch.name">
                  {{ branch.branch_name || branch.name }}
                </option>
              </select>
              <label class="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                <input v-model="offerListFilters.actionable_only" class="h-4 w-4" type="checkbox" />
                <span>{{ t("actionableOnly") }}</span>
              </label>
              <input
                v-model="offerListFilters.gross_min"
                class="input"
                type="number"
                min="0"
                step="0.01"
                :placeholder="t('grossMinFilter')"
                @keyup.enter="applyOfferListFilters"
              />
              <input
                v-model="offerListFilters.gross_max"
                class="input"
                type="number"
                min="0"
                step="0.01"
                :placeholder="t('grossMaxFilter')"
                @keyup.enter="applyOfferListFilters"
              />
            </template>

          </WorkbenchFilterToolbar>
        </template>
      </PageToolbar>
    </div>

    <DataTableShell
      v-if="isListView"
      :loading="isOfferListInitialLoading"
      :error="offerListLoadErrorText"
      :empty="pagedOfferRows.length === 0"
      :loading-label="t('loading')"
      :error-title="t('loadErrorTitle')"
      :empty-title="t('emptyTitle')"
      :empty-description="t('empty')"
    >
      <template #header>
        <p class="text-sm text-slate-600">
          {{ t("showing") }} {{ offerListStartRow }}-{{ offerListEndRow }} / {{ offerListTotal }}
        </p>
      </template>

      <template #default>
        <div class="at-table-wrap">
          <table class="at-table">
            <thead>
              <tr class="at-table-head-row">
                <th class="at-table-head-cell">{{ t("colOffer") }}</th>
                <th class="at-table-head-cell">{{ t("colDetails") }}</th>
                <th class="at-table-head-cell">{{ t("colStatus") }}</th>
                <th class="at-table-head-cell">{{ t("colPremiums") }}</th>
                <th class="at-table-head-cell">{{ t("colActions") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="offer in pagedOfferRows"
                :key="offer.name"
                class="at-table-row cursor-pointer"
                @click="openOfferDetail(offer.name)"
              >
                <DataTableCell cell-class="min-w-[220px]">
                  <TableEntityCell :title="offer.name" :facts="offerIdentityFacts(offer)" />
                </DataTableCell>
                <TableFactsCell :items="offerDetailsFacts(offer)" cell-class="min-w-[240px]" />
                <DataTableCell>
                  <StatusBadge type="offer" :status="offer.status" />
                </DataTableCell>
                <TableFactsCell :items="offerPremiumFacts(offer)" cell-class="min-w-[220px]" />
                <DataTableCell @click.stop>
                  <InlineActionRow>
                    <ActionButton
                      v-if="isConvertible(offer)"
                      variant="primary"
                      size="xs"
                      @click.stop="openConvertDialog(offer)"
                    >
                      {{ t("convert") }}
                    </ActionButton>
                    <ActionButton
                      v-if="offer.converted_policy"
                      variant="secondary"
                      size="xs"
                      @click.stop="openPolicyDetail(offer.converted_policy)"
                    >
                      {{ t("openPolicy") }}
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
          :page="offerListPagination.page"
          :total-pages="offerListTotalPages"
          :page-label="t('page')"
          :previous-label="t('previous')"
          :next-label="t('next')"
          :prev-disabled="offerListPagination.page <= 1 || offersResource.loading"
          :next-disabled="!offerListHasNextPage || offersResource.loading"
          @previous="previousOfferPage"
          @next="nextOfferPage"
        />
      </template>
    </DataTableShell>

    <template v-else>
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
                <StatusBadge type="offer" :status="offer.status" />
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
    </template>

    <Dialog v-model="showQuickOfferDialog" :options="{ title: t('quickOfferTitle'), size: 'xl' }">
      <template #body-content>
        <QuickCreateDialogShell
          :error="quickOfferError"
          :subtitle="offerQuickUi.subtitle"
          :labels="{ cancel: t('cancel'), save: t('createQuickOffer'), saveAndOpen: t('createQuickOfferAndOpen') }"
          :loading="quickOfferLoading"
          :save-disabled="!canCreateQuickOffer"
          :save-and-open-disabled="!canCreateQuickOffer"
          @cancel="cancelQuickOfferDialog"
          @save="createQuickOffer(false)"
          @save-and-open="createQuickOffer(true)"
        >
          <div class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("customerField") }}</p>
            <div class="space-y-2">
              <input
                class="input"
                :value="quickOffer.queryText"
                :placeholder="t('customerPlaceholder')"
                type="text"
                autocomplete="off"
                @input="onCustomerInput"
              />

              <div
                v-if="showCustomerSuggestions"
                class="max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white"
              >
                <button
                  v-for="option in customerOptions"
                  :key="option.value"
                  class="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                  type="button"
                  @mousedown.prevent="selectCustomerOption(option)"
                >
                  <span class="truncate text-slate-800">{{ option.label }}</span>
                  <span v-if="option.description" class="ml-3 shrink-0 text-xs text-slate-500">
                    {{ option.description }}
                  </span>
                </button>
              </div>

              <p v-else-if="showCustomerNoResults" class="text-xs text-slate-500">
                {{ t("noCustomersFound") }}
              </p>
              <p v-if="customerSearchErrorText" class="text-xs text-rose-600">
                {{ customerSearchErrorText }}
              </p>

              <div
                v-if="quickOffer.customerOption?.value"
                class="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs"
              >
                <span class="truncate text-emerald-800">
                  {{ t("selectedCustomer") }}: {{ quickOffer.queryText }}
                </span>
                <button
                  class="ml-2 shrink-0 font-semibold text-emerald-700 hover:text-emerald-900"
                  type="button"
                  @click="clearSelectedCustomer"
                >
                  {{ t("clearSelection") }}
                </button>
              </div>
            </div>
            <button
              v-if="showCreateCustomerAction"
              class="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              type="button"
              @click="selectCreateCustomerOption"
            >
              {{ t("createCustomerCta") }}: {{ quickOffer.queryText }}
            </button>
          </div>

          <QuickCreateFormRenderer
            :fields="offerQuickFields"
            :model="quickOffer"
            :field-errors="quickOfferFieldErrors"
            :disabled="quickOfferLoading"
            :locale="sessionState.locale"
            :options-map="offerQuickOptionsMap"
            @submit="createQuickOffer(false)"
          />
        </QuickCreateDialogShell>
      </template>
    </Dialog>

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
import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Dialog, createResource } from "frappe-ui";

import { sessionState } from "../state/session";
import StatusBadge from "../components/StatusBadge.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import DataTableCell from "../components/app-shell/DataTableCell.vue";
import DataTableShell from "../components/app-shell/DataTableShell.vue";
import EmptyState from "../components/app-shell/EmptyState.vue";
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
import { buildQuickCreateDraft, getQuickCreateConfig, getLocalizedText } from "../config/quickCreateRegistry";
import { mutedFact, subtleFact } from "../utils/factItems";
import { runQuickCreateSuccessTargets } from "../utils/quickCreateSuccess";
import { readQuickCreateIntent, stripQuickCreateIntentQuery } from "../utils/quickRouteIntent";
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

const copy = {
  tr: {
    title: "Teklif Panosu",
    subtitle: "Frappe CRM Kanban yapisinda teklif yonetimi",
    viewList: "Liste",
    viewBoard: "Pano",
    newOffer: "Yeni Teklif",
    quickOfferTitle: "Hizli Teklif Olustur",
    customerField: "Musteri",
    customerPlaceholder: "Musteri ara veya yaz",
    createCustomerCta: "+ Yeni Musteri Olustur",
    noCustomersFound: "Musteri bulunamadi. Yeni musteri olarak olusturabilirsiniz.",
    selectedCustomer: "Secili Musteri",
    clearSelection: "Temizle",
    branchField: "Sigorta Bransi",
    branchPlaceholder: "Brans secin (opsiyonel)",
    notesField: "Notlar",
    createQuickOffer: "Teklifi Olustur",
    createQuickOfferAndOpen: "Kaydet ve Ac",
    quickCreateValidationFailed: "Lutfen gerekli alanlari kontrol edin.",
    refresh: "Yenile",
    searchPlaceholder: "Teklif / Musteri / Kayit ara",
    allCompanies: "Tum Sigorta Sirketleri",
    allBranches: "Tum Branslar",
    allStatuses: "Tum Durumlar",
    validUntilFilter: "Gecerlilik Tarihi",
    advancedFilters: "Gelismis Filtreler",
    hideAdvancedFilters: "Gelismis Filtreleri Gizle",
    activeFilters: "aktif filtre",
    presetLabel: "Filtre Sablonu",
    presetDefault: "Standart",
    presetActionable: "Aksiyon Bekleyenler",
    presetConverted: "Policeye Donusenler",
    presetExpiring7: "7 Gun Icerisinde Gecerlilik",
    savePreset: "Kaydet",
    deletePreset: "Sil",
    savePresetPrompt: "Filtre sablonu adi",
    deletePresetConfirm: "Secili ozel filtre sablonu silinsin mi?",
    applyFilters: "Uygula",
    clearFilters: "Filtreleri Temizle",
    grossMinFilter: "Min Brut Prim",
    grossMaxFilter: "Max Brut Prim",
    actionableOnly: "Sadece Aksiyon Bekleyen",
    showing: "Gosterilen",
    page: "Sayfa",
    previous: "Onceki",
    next: "Sonraki",
    colOffer: "Teklif",
    colDetails: "Detaylar",
    colStatus: "Durum",
    colPremiums: "Primler",
    colActions: "Aksiyon",
    offerDate: "Teklif Tarihi",
    validUntil: "Gecerlilik",
    grossPremium: "Brut Prim",
    netPremiumShort: "Net Prim",
    commissionShort: "Komisyon",
    recordId: "Kayit",
    openDesk: "Yonetim",
    sortModifiedDesc: "Son Guncellenen",
    sortValidUntilAsc: "Gecerlilik (Yakin)",
    sortValidUntilDesc: "Gecerlilik (Uzak)",
    sortGrossDesc: "Brut Prim (Yuksek)",
    stage: "Asama",
    loading: "Yukleniyor...",
    loadErrorTitle: "Teklifler Yuklenemedi",
    loadError: "Teklif panosu verileri yuklenirken bir hata olustu. Lutfen tekrar deneyin.",
    emptyTitle: "Teklif Bulunamadi",
    empty: "Teklif kaydi bulunamadi.",
    emptyLane: "Bu asamada teklif yok.",
    customerName: "Musteri Adi",
    premiumAmount: "Prim Tutari",
    company: "Sigorta Sirketi",
    draftLane: "Taslak",
    sentLane: "Musteriye Gonderildi",
    acceptedLane: "Kabul Edildi",
    convertedLane: "Policeye Donustu",
    convert: "Policeye Cevir",
    openPolicy: "Police Detayini Ac",
    convertDialogTitle: "Teklif -> Police",
    selectedOffer: "Secili Teklif",
    netPremium: "Net Prim",
    taxAmount: "Vergi Tutari",
    commissionAmount: "Komisyon Tutari",
    policyNo: "Police Numarasi (Opsiyonel)",
    cancel: "Vazgec",
    createPolicy: "Police Olustur",
    statusDraft: "Taslak",
    statusSent: "Gonderildi",
    statusAccepted: "Kabul Edildi",
    statusConverted: "Donustu",
    statusRejected: "Reddedildi",
    customerSearchFailed: "Musteri aramasi basarisiz oldu.",
    quickOfferCreateFailed: "Hizli teklif olusturma islemi basarisiz oldu.",
    statusUpdateFailed: "Teklif durumu guncellenemedi.",
    conversionFailed: "Teklif policeye donusturulemedi.",
  },
  en: {
    title: "Offer Board",
    subtitle: "Frappe CRM style Kanban workflow for offers",
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
    policyNo: "Policy Number (Optional)",
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
  return copy[sessionState.locale]?.[key] || copy.en[key] || key;
}

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
    limit_page_length: 200,
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
    limit_page_length: 500,
  },
});
const salesEntityResource = createResource({
  url: "frappe.client.get_list",
  auto: true,
  params: {
    doctype: "AT Sales Entity",
    fields: ["name", "full_name"],
    order_by: "full_name asc",
    limit_page_length: 500,
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
const offerQuickUi = computed(() => ({
  subtitle: getLocalizedText(offerQuickConfig?.subtitle, sessionState.locale),
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
const localeCode = computed(() => (sessionState.locale === "tr" ? "tr-TR" : "en-US"));
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
  { value: "Accepted", label: t("statusAccepted") },
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
const quickOffer = reactive({
  customerOption: null,
  queryText: "",
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
  return Boolean(selectedName || typedName);
});

const showCreateCustomerAction = computed(() => {
  const query = quickOffer.queryText.trim();
  if (!query) return false;
  const alreadySelected = Boolean(quickOffer.customerOption?.value);
  if (alreadySelected) return false;
  return !customerOptions.value.some((item) => String(item.label || "").toLowerCase() === query.toLowerCase());
});

function clearQuickOfferFieldErrors() {
  Object.keys(quickOfferFieldErrors).forEach((key) => {
    delete quickOfferFieldErrors[key];
  });
}

function validateQuickOfferForm() {
  clearQuickOfferFieldErrors();
  let valid = true;

  const selectedCustomerName = getSelectedCustomerName();
  if (!selectedCustomerName && !quickOffer.queryText.trim()) {
    quickOfferFieldErrors.customer = t("customerPlaceholder");
    valid = false;
  }

  for (const field of offerQuickFields.value) {
    if (!field?.required) continue;
    const rawValue = quickOffer[field.name];
    const empty = typeof rawValue === "boolean" ? false : String(rawValue ?? "").trim() === "";
    if (empty) {
      quickOfferFieldErrors[field.name] =
        getLocalizedText(field.label, sessionState.locale) || t("quickCreateValidationFailed");
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

function buildQuickOfferPayload() {
  const selectedCustomerName = getSelectedCustomerName();
  return {
    customer: selectedCustomerName || null,
    customer_name: selectedCustomerName ? null : quickOffer.queryText.trim(),
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

  if (offerListFilters.insurance_company) filters.insurance_company = offerListFilters.insurance_company;
  if (offerListFilters.valid_until) filters.valid_until = ["<=", offerListFilters.valid_until];
  if (offerListFilters.branch) filters.branch = offerListFilters.branch;
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
      or_filters: [
        ["AT Customer", "full_name", "like", `%${query}%`],
        ["AT Customer", "name", "like", `%${query}%`],
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

function selectCreateCustomerOption() {
  const fullName = quickOffer.queryText.trim();
  if (!fullName) return;
  quickOffer.customerOption = null;
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
void hydrateOfferPresetStateFromServer();
void consumeOfferRouteIntents();
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 px-3 py-2 text-sm;
}
</style>
