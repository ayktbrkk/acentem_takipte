<template>
  <div v-if="isSalesTab" class="space-y-4 lg:space-y-5">
    <div class="grid gap-3 md:gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SaaSMetricCard
        v-for="card in salesSummaryCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :value-class="card.valueClass"
      />
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
      <div class="grid gap-4 content-start">
      <SectionPanel :title="t('offerPipeline')" :count="formatNumber(salesPipelineOffers.length)" panel-class="surface-card h-full rounded-xl p-3.5 sm:p-4">
        <p class="mb-2 text-[11px] text-slate-500">{{ t("salesPipelineHint") }}</p>
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="salesPipelineOffers.length === 0" :title="t('noOffer')" compact compact-container-class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center" />
        <ul v-else class="overflow-hidden rounded-xl border border-slate-100 bg-white">
          <EntityPreviewCard
            v-for="offer in pagedPreviewItems(salesPipelineOffers, 'salesOffers')"
            :key="offer.name"
            :title="offer.name"
            layout="dense"
            clickable
            @click="openOfferItem(offer)"
          >
            <p class="truncate text-sm font-semibold text-slate-900">{{ offerCustomer(offer) }}</p>
            <template #caption>
              <div class="flex items-center gap-1.5 overflow-hidden">
                <span :class="typePillClass('offer')">{{ typePillToken('offer') }}</span>
                <span v-if="offerDelayLabel(offer)" class="truncate text-[10px] font-semibold text-red-600">{{ offerDelayLabel(offer) }}</span>
              </div>
            </template>
            <template #footer>
              <p class="truncate text-xs text-slate-600">{{ offerPolicyReference(offer) }}</p>
            </template>
            <template #date>
              <p class="text-[10px] text-slate-500">{{ offerDate(offer) }}</p>
            </template>
            <template #trailing>
              <StatusBadge domain="offer" :status="offer.status" size="xs" />
            </template>
          </EntityPreviewCard>
        </ul>
        <PreviewPager
          v-if="salesPipelineOffers.length > 0"
          :current-page="previewResolvedPage('salesOffers', salesPipelineOffers)"
          :total-pages="previewPageCount(salesPipelineOffers)"
          :show-view-all="shouldShowViewAll(salesPipelineOffers)"
          :view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('salesOffers', $event, salesPipelineOffers)"
          @view-all="openPreviewList('offers')"
        />
      </SectionPanel>

      <SectionPanel :title="t('convertedOffersTitle')" :count="formatNumber(convertedSalesOffers.length)" panel-class="surface-card h-full rounded-xl p-3.5 sm:p-4">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="convertedSalesOffers.length === 0" :title="t('noConvertedOffers')" compact compact-container-class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center" />
        <ul v-else class="overflow-hidden rounded-xl border border-slate-100 bg-white">
          <EntityPreviewCard
            v-for="offer in pagedPreviewItems(convertedSalesOffers, 'salesConvertedOffers')"
            :key="offer.name"
            :title="offer.name"
            layout="dense"
            clickable
            @click="openOfferItem(offer)"
          >
            <p class="truncate text-sm font-semibold text-slate-900">{{ offerCustomer(offer) }}</p>
            <template #caption>
              <div class="flex items-center gap-1.5 overflow-hidden">
                <span :class="typePillClass('offer')">{{ typePillToken('offer') }}</span>
                <span v-if="offerDelayLabel(offer)" class="truncate text-[10px] font-semibold text-red-600">{{ offerDelayLabel(offer) }}</span>
              </div>
            </template>
            <template #footer>
              <p class="truncate text-xs text-slate-600">{{ offer.converted_policy || offerPolicyReference(offer) }}</p>
            </template>
            <template #date>
              <p class="text-[10px] text-slate-500">{{ offerDate(offer) }}</p>
            </template>
            <template #trailing>
              <StatusBadge domain="offer" :status="offer.status" size="xs" />
            </template>
          </EntityPreviewCard>
        </ul>
        <PreviewPager
          v-if="convertedSalesOffers.length > 0"
          :current-page="previewResolvedPage('salesConvertedOffers', convertedSalesOffers)"
          :total-pages="previewPageCount(convertedSalesOffers)"
          :show-view-all="shouldShowViewAll(convertedSalesOffers)"
          :view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('salesConvertedOffers', $event, convertedSalesOffers)"
          @view-all="openPreviewList('offers')"
        />
      </SectionPanel>
      </div>

      <div class="grid gap-4 content-start">
      <SectionPanel :title="t('recentLeads')" :count="formatNumber(displayRecentLeads.length)" panel-class="surface-card h-full rounded-xl p-3.5 sm:p-4">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="displayRecentLeads.length === 0" :title="t('noLead')" compact compact-container-class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center" />
        <ul v-else class="overflow-hidden rounded-xl border border-slate-100 bg-white">
          <EntityPreviewCard
            v-for="lead in pagedPreviewItems(displayRecentLeads, 'salesLeads')"
            :key="lead.name"
            :title="lead.name"
            layout="dense"
            clickable
            @click="openLeadItem(lead)"
          >
            <p class="truncate text-sm font-semibold text-slate-900">{{ [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.name }}</p>
            <template #caption>
              <div class="flex items-center gap-1.5 overflow-hidden">
                <span :class="typePillClass('lead')">{{ typePillToken('lead') }}</span>
              </div>
            </template>
            <template #footer>
              <p class="truncate text-xs text-slate-600">{{ lead.email || t('noNote') }}</p>
            </template>
            <template #date>
              <p class="text-[10px] text-slate-500">{{ leadDate(lead) }}</p>
            </template>
            <template #trailing>
              <StatusBadge domain="lead" :status="lead.status" size="xs" />
            </template>
          </EntityPreviewCard>
        </ul>
        <PreviewPager
          v-if="displayRecentLeads.length > 0"
          :current-page="previewResolvedPage('salesLeads', displayRecentLeads)"
          :total-pages="previewPageCount(displayRecentLeads)"
          :show-view-all="shouldShowViewAll(displayRecentLeads)"
          :view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('salesLeads', $event, displayRecentLeads)"
          @view-all="openPreviewList('leads')"
        />
      </SectionPanel>

      <SectionPanel :title="t('salesCandidateActionTitle')" :count="formatNumber(salesCandidateActions.length)" panel-class="surface-card h-full rounded-xl p-3.5 sm:p-4">
        <p class="mb-2 text-[11px] text-slate-500">{{ t("salesCandidateActionHint") }}</p>
        <div v-if="myTasksLoading || myRemindersLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="salesCandidateActions.length === 0" :title="t('noSalesCandidateAction')" compact compact-container-class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center" />
        <ul v-else class="overflow-hidden rounded-xl border border-slate-100 bg-white">
          <MetaListCard
            v-for="action in pagedPreviewItems(salesCandidateActions, 'salesActions')"
            :key="`${action.kind}-${action.name}`"
            :title="action.name || salesActionSource(action)"
            :description="salesActionTitle(action)"
            :meta="salesActionSource(action)"
            layout="dense"
            clickable
            @click="openSalesActionItem(action)"
          >
            <template #caption>
              <div class="flex items-center gap-1.5 overflow-hidden">
                <span :class="typePillClass(action.kind || 'task')">{{ typePillToken(action.kind || 'task') }}</span>
                <span v-if="salesActionDelayLabel(action)" class="truncate text-[10px] font-semibold text-red-600">{{ salesActionDelayLabel(action) }}</span>
              </div>
            </template>
            <template #date>
              <p class="text-[10px] text-slate-500">{{ salesActionDate(action) }}</p>
            </template>
            <template #trailing>
              <StatusBadge domain="dashboard_action_kind" :status="salesActionBadge(action)" size="xs" />
            </template>
          </MetaListCard>
        </ul>
        <PreviewPager
          v-if="salesCandidateActions.length > 0"
          :current-page="previewResolvedPage('salesActions', salesCandidateActions)"
          :total-pages="previewPageCount(salesCandidateActions)"
          :show-view-all="shouldShowViewAll(salesCandidateActions)"
          :view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('salesActions', $event, salesCandidateActions)"
          @view-all="openSalesActionList()"
        />
      </SectionPanel>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import EmptyState from "../app-shell/EmptyState.vue";
import EntityPreviewCard from "../app-shell/EntityPreviewCard.vue";
import MetaListCard from "../app-shell/MetaListCard.vue";
import PreviewPager from "../app-shell/PreviewPager.vue";
import SaaSMetricCard from "../app-shell/SaaSMetricCard.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import StatusBadge from "../ui/StatusBadge.vue";

const props = defineProps({
  convertedSalesOffers: { type: Array, required: true },
  dashboardLoading: { type: Boolean, required: true },
  displayRecentLeads: { type: Array, required: true },
  displayRecentPolicies: { type: Array, required: true },
  formatCurrencyBy: { type: Function, required: true },
  formatNumber: { type: Function, required: true },
  isSalesTab: { type: Boolean, required: true },
  myRemindersLoading: { type: Boolean, required: true },
  myTasksLoading: { type: Boolean, required: true },
  openConvertedPolicyItem: { type: Function, required: true },
  openLeadItem: { type: Function, required: true },
  openOfferItem: { type: Function, required: true },
  openPolicyItem: { type: Function, required: true },
  openPreviewList: { type: Function, required: true },
  openSalesActionItem: { type: Function, required: true },
  openSalesActionList: { type: Function, required: true },
  pagedPreviewItems: { type: Function, required: true },
  previewPageCount: { type: Function, required: true },
  previewResolvedPage: { type: Function, required: true },
  recentLeadFacts: { type: Function, required: true },
  recentOfferFacts: { type: Function, required: true },
  recentPolicyFacts: { type: Function, required: true },
  salesActionDescription: { type: Function, required: true },
  salesActionFacts: { type: Function, required: true },
  salesActionTitle: { type: Function, required: true },
  salesCandidateActions: { type: Array, required: true },
  salesPipelineOffers: { type: Array, required: true },
  setPreviewPage: { type: Function, required: true },
  shouldShowViewAll: { type: Function, required: true },
  t: { type: Function, required: true },
});

const salesSummaryCards = computed(() => [
  { label: props.t("offerPipeline"), value: props.formatNumber(props.salesPipelineOffers.length), valueClass: "text-brand-600" },
  { label: props.t("convertedOffersTitle"), value: props.formatNumber(props.convertedSalesOffers.length), valueClass: "text-at-green" },
  { label: props.t("recentLeads"), value: props.formatNumber(props.displayRecentLeads.length), valueClass: "text-slate-900" },
  { label: props.t("salesCandidateActionTitle"), value: props.formatNumber(props.salesCandidateActions.length), valueClass: "text-at-amber" },
]);

function normalizeText(value) {
  return String(value ?? "").trim();
}

function compactDate(value) {
  const raw = normalizeText(value);
  if (!raw) return "-";
  const match = raw.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : raw.slice(0, 10);
}

function typePillToken(value) {
  const key = normalizeText(value).toLowerCase();
  const tokens = { lead: "LED", offer: "OFR", reminder: "REM", task: "TSK" };
  return tokens[key] || (key.replace(/[^a-z0-9]/g, "").slice(0, 4).toUpperCase() || "ROW");
}

function typePillClass(value) {
  const key = normalizeText(value).toLowerCase();
  const palette = {
    lead: "bg-fuchsia-100 text-fuchsia-700",
    offer: "bg-sky-100 text-sky-700",
    reminder: "bg-amber-100 text-amber-700",
    task: "bg-indigo-100 text-indigo-700",
  };
  return `inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${palette[key] || 'bg-slate-200 text-slate-700'}`;
}

function delayFromDate(value) {
  const raw = compactDate(value);
  if (raw === "-") return "";
  const due = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(due.getTime())) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const delta = Math.floor((today.getTime() - due.getTime()) / 86400000);
  return delta > 0 ? `${delta} ${props.t("followUpDeltaDays")}` : "";
}

function offerCustomer(offer) {
  return offer?.customer || "-";
}

function offerPolicyReference(offer) {
  return props.formatCurrencyBy(offer?.gross_premium, offer?.currency || "TRY");
}

function offerDate(offer) {
  return compactDate(offer?.valid_until);
}

function offerDelayLabel(offer) {
  return delayFromDate(offer?.valid_until);
}

function leadDate(lead) {
  return compactDate(lead?.modified || lead?.creation);
}

function salesActionSource(action) {
  return action?.source_name || action?.source_doctype || "-";
}

function salesActionDate(action) {
  return compactDate(action?.action_date);
}

function salesActionBadge(action) {
  return action?.kind === "reminder" ? "reminder" : "task";
}

function salesActionDelayLabel(action) {
  return delayFromDate(action?.action_date);
}
</script>
