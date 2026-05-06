<template>
  <div v-if="isSalesTab" class="grid grid-cols-1 gap-6 xl:grid-cols-12">
    <div class="grid gap-4 sm:grid-cols-2 xl:col-span-12 xl:grid-cols-4">
      <SaaSMetricCard
        v-for="card in salesSummaryCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :value-class="card.valueClass"
      />
    </div>

    <!-- Left: Pipelines (8 units) -->
    <div class="space-y-5 xl:col-span-8">
      <SectionPanel :title="t('offerPipeline')" :count="formatNumber(salesPipelineOffers.length)" panel-class="surface-card rounded-xl p-4">
        <p class="mb-3 text-xs text-slate-500">{{ t("salesPipelineHint") }}</p>
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="salesPipelineOffers.length === 0" :title="t('noOffer')" compact />
        <ul v-else class="space-y-2">
          <EntityPreviewCard
            v-for="offer in pagedPreviewItems(salesPipelineOffers, 'salesOffers')"
            :key="offer.name"
            :title="offer.name"
            dense
            clickable
            @click="openOfferItem(offer)"
          >
            <template #trailing>
              <StatusBadge domain="offer" :status="offer.status" size="xs" />
            </template>
            <MiniFactList :items="recentOfferFacts(offer)" dense />
            <p class="mt-1 text-xs text-slate-600">{{ formatCurrencyBy(offer.gross_premium, offer.currency || "TRY") }}</p>
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

      <SectionPanel :title="t('convertedOffersTitle')" :count="formatNumber(convertedSalesOffers.length)" panel-class="surface-card rounded-xl p-4">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="convertedSalesOffers.length === 0" :title="t('noConvertedOffers')" compact />
        <ul v-else class="space-y-2">
          <EntityPreviewCard
            v-for="offer in pagedPreviewItems(convertedSalesOffers, 'salesConvertedOffers')"
            :key="offer.name"
            :title="offer.name"
            dense
            clickable
            @click="openOfferItem(offer)"
          >
            <template #trailing>
              <ActionButton
                v-if="offer.converted_policy"
                size="xs"
                trailing-icon="↗"
                @click="handleOpenConvertedPolicy(offer, $event)"
              >
                {{ t("openPolicyAction") }}
              </ActionButton>
            </template>
            <MiniFactList :items="recentOfferFacts(offer)" dense />
            <p class="mt-1 text-xs text-slate-600">{{ formatCurrencyBy(offer.gross_premium, offer.currency || "TRY") }}</p>
            <p v-if="offer.converted_policy" class="mt-1 text-xs font-semibold text-emerald-600">
              {{ t("converted") }}: {{ offer.converted_policy }}
            </p>
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

    <!-- Right: Context & Actions (4 units) -->
    <div class="space-y-5 xl:col-span-4">
      <SectionPanel :title="t('recentLeads')" :count="formatNumber(displayRecentLeads.length)" panel-class="surface-card rounded-xl p-4">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="displayRecentLeads.length === 0" :title="t('noLead')" compact />
        <ul v-else class="space-y-2">
          <EntityPreviewCard
            v-for="lead in pagedPreviewItems(displayRecentLeads, 'salesLeads')"
            :key="lead.name"
            :title="[lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.name"
            dense
            clickable
            @click="openLeadItem(lead)"
          >
            <template #trailing>
              <StatusBadge domain="lead" :status="lead.status" size="xs" />
            </template>
            <MiniFactList :items="recentLeadFacts(lead)" dense />
            <p class="mt-1 max-h-9 overflow-hidden text-xs text-slate-700">{{ lead.notes || t("noNote") }}</p>
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

      <SectionPanel :title="t('salesCandidateActionTitle')" :count="formatNumber(salesCandidateActions.length)" panel-class="surface-card rounded-xl p-4">
        <p class="mb-3 text-xs text-slate-500">{{ t("salesCandidateActionHint") }}</p>
        <div v-if="myTasksLoading || myRemindersLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="salesCandidateActions.length === 0" :title="t('noSalesCandidateAction')" compact />
        <ul v-else class="space-y-2">
          <MetaListCard
            v-for="action in pagedPreviewItems(salesCandidateActions, 'salesActions')"
            :key="`${action.kind}-${action.name}`"
            :title="salesActionTitle(action)"
            :description="salesActionDescription(action)"
            description-class="mt-2 text-xs font-semibold text-slate-600"
            dense
            clickable
            @click="openSalesActionItem(action)"
          >
            <MiniFactList :items="salesActionFacts(action)" dense />
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
</template>

<script setup>
import { computed } from "vue";
import ActionButton from "../app-shell/ActionButton.vue";
import EmptyState from "../app-shell/EmptyState.vue";
import EntityPreviewCard from "../app-shell/EntityPreviewCard.vue";
import MetaListCard from "../app-shell/MetaListCard.vue";
import MiniFactList from "../app-shell/MiniFactList.vue";
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

function handleOpenConvertedPolicy(offer, event) {
  event?.stopPropagation?.();
  props.openConvertedPolicyItem(offer);
}
</script>
