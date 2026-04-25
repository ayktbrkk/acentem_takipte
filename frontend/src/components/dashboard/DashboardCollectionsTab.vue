<template>
  <div v-if="isCollectionsTab" class="grid grid-cols-1 gap-6 xl:grid-cols-12">
    <!-- Left: Collections Queue (8 units) -->
    <div class="space-y-6 xl:col-span-8">
      <SectionPanel :title="t('todayCollectionsTitle')" :count="formatNumber(dueTodayCollectionPayments.length)">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="dueTodayCollectionPayments.length === 0" :title="t('noTodayCollections')" />
        <ul v-else class="space-y-3">
          <EntityPreviewCard
            v-for="payment in pagedPreviewItems(dueTodayCollectionPayments, 'collectionsDueToday')"
            :key="payment.name"
            :title="payment.payment_no || payment.name"
            clickable
            @click="openPaymentItem(payment)"
          >
            <template #trailing>
              <StatusBadge domain="payment_direction" :status="payment.payment_direction" />
            </template>
            <MiniFactList :items="dashboardPaymentFacts(payment)" />
            <p class="mt-1 text-xs text-slate-600">{{ formatCurrency(payment.amount_try) }}</p>
          </EntityPreviewCard>
        </ul>
        <PreviewPager
          v-if="dueTodayCollectionPayments.length > 0"
          :current-page="previewResolvedPage('collectionsDueToday', dueTodayCollectionPayments)"
          :total-pages="previewPageCount(dueTodayCollectionPayments)"
          :show-view-all="shouldShowViewAll(dueTodayCollectionPayments)"
          :view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('collectionsDueToday', $event, dueTodayCollectionPayments)"
          @view-all="openPreviewList('payments')"
        />
      </SectionPanel>

      <SectionPanel :title="t('overdueCollectionsTitle')" :count="formatNumber(overdueCollectionPayments.length)">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="overdueCollectionPayments.length === 0" :title="t('noOverdueCollections')" />
        <ul v-else class="space-y-3">
          <EntityPreviewCard
            v-for="payment in pagedPreviewItems(overdueCollectionPayments, 'collectionsOverdue')"
            :key="payment.name"
            :title="payment.payment_no || payment.name"
            clickable
            @click="openPaymentItem(payment)"
          >
            <template #trailing>
              <StatusBadge domain="payment_direction" :status="payment.payment_direction" />
            </template>
            <MiniFactList :items="dashboardPaymentFacts(payment)" />
            <p class="mt-1 text-xs text-slate-600">{{ formatCurrency(payment.amount_try) }}</p>
          </EntityPreviewCard>
        </ul>
        <PreviewPager
          v-if="overdueCollectionPayments.length > 0"
          :current-page="previewResolvedPage('collectionsOverdue', overdueCollectionPayments)"
          :total-pages="previewPageCount(overdueCollectionPayments)"
          :show-view-all="shouldShowViewAll(overdueCollectionPayments)"
          :view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('collectionsOverdue', $event, overdueCollectionPayments)"
          @view-all="openPreviewList('payments')"
        />
      </SectionPanel>
    </div>

    <!-- Right: Metrics & Risk (4 units) -->
    <div class="space-y-6 xl:col-span-4">
      <SectionPanel :title="t('collectionsPerformanceTitle')" :show-count="false">
        <p class="mb-3 text-xs text-slate-500">{{ t("collectionsPerformanceHint") }}</p>
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState
          v-else-if="collectionPaymentStatusSummary.length === 0 && collectionPaymentDirectionSummary.length === 0"
          :title="t('noCollectionPerformance')"
        />
        <div v-else class="space-y-4">
          <div>
            <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t("paymentStatusBreakdownTitle") }}</p>
            <div v-if="collectionPaymentStatusSummary.length === 0" class="card-empty-compact text-sm">{{ t("noCollectionPerformance") }}</div>
            <div v-else class="space-y-2">
              <ProgressMetricRow
                v-for="item in collectionPaymentStatusSummary"
                :key="item.key"
                :label="item.label"
                :value="formatNumber(item.value)"
                :ratio="item.ratio"
                :bar-class="item.colorClass"
              />
            </div>
          </div>

          <div>
            <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t("paymentDirectionBreakdownTitle") }}</p>
            <div v-if="collectionPaymentDirectionSummary.length === 0" class="card-empty-compact text-sm">{{ t("noCollectionPerformance") }}</div>
            <div v-else class="space-y-2">
              <ProgressMetricRow
                v-for="item in collectionPaymentDirectionSummary"
                :key="item.key"
                :label="item.label"
                :value="formatNumber(item.value)"
                :ratio="item.ratio"
                :bar-class="item.colorClass"
                :meta="`${t('paymentPaidAmount')}: ${formatCurrency(item.paidAmount)}`"
              />
            </div>
          </div>
        </div>
      </SectionPanel>

      <SectionPanel :title="t('collectionsRiskTitle')" :count="formatNumber(collectionRiskRows.length)">
        <p class="mb-3 text-xs text-slate-500">{{ t("collectionsRiskHint") }}</p>
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="collectionRiskRows.length === 0" :title="t('noCollectionsRisk')" />
        <ul v-else class="space-y-2">
          <MetaListCard
            v-for="row in pagedPreviewItems(collectionRiskRows, 'collectionsRisk')"
            :key="row.key"
            :title="row.title"
            :description="row.description"
            description-class="mt-2 text-xs font-semibold text-slate-600"
            clickable
            @click="openCollectionRiskItem(row)"
          >
            <MiniFactList :items="collectionRiskFacts(row)" />
          </MetaListCard>
        </ul>
        <PreviewPager
          v-if="collectionRiskRows.length > 0"
          :current-page="previewResolvedPage('collectionsRisk', collectionRiskRows)"
          :total-pages="previewPageCount(collectionRiskRows)"
          :show-view-all="shouldShowViewAll(collectionRiskRows)"
          :view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('collectionsRisk', $event, collectionRiskRows)"
          @view-all="openPreviewList('payments')"
        />
      </SectionPanel>

      <SectionPanel :title="t('reconciliationPreview')" :count="formatNumber(reconciliationPreviewRows.length)">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="reconciliationPreviewRows.length === 0" :title="t('noReconciliationPreview')" />
        <div v-else class="space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <div class="at-mini-stat">
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">{{ t("mismatchRows") }}</p>
              <p class="mt-1 text-2xl font-black text-slate-900 tracking-tight">{{ formatNumber(reconciliationPreviewMetrics.open || 0) }}</p>
            </div>
            <div class="at-mini-stat">
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">{{ t("openDifference") }}</p>
              <p class="mt-1 text-2xl font-black text-slate-900 tracking-tight">{{ formatCurrency(reconciliationPreviewOpenDifference) }}</p>
            </div>
          </div>
          <ul class="space-y-2">
            <MetaListCard
              v-for="row in pagedPreviewItems(reconciliationPreviewRows, 'collectionsReconciliation')"
              :key="row.name"
              :title="`${row.source_doctype || '-'} / ${row.source_name || '-'}`"
              clickable
              @click="openReconciliationItem(row)"
            >
              <template #trailing>
                <StatusBadge domain="reconciliation" :status="row.status" />
              </template>
              <MiniFactList :items="dashboardReconciliationFacts(row)" />
            </MetaListCard>
          </ul>
          <PreviewPager
            v-if="reconciliationPreviewRows.length > 0"
            :current-page="previewResolvedPage('collectionsReconciliation', reconciliationPreviewRows)"
            :total-pages="previewPageCount(reconciliationPreviewRows)"
            :show-view-all="shouldShowViewAll(reconciliationPreviewRows)"
            :view-all-label="t('viewAllItems')"
            @change-page="setPreviewPage('collectionsReconciliation', $event, reconciliationPreviewRows)"
            @view-all="openPreviewList('reconciliation')"
          />
        </div>
      </SectionPanel>
    </div>
  </div>
</template>

<script setup>
import EmptyState from "../app-shell/EmptyState.vue";
import EntityPreviewCard from "../app-shell/EntityPreviewCard.vue";
import MetaListCard from "../app-shell/MetaListCard.vue";
import MiniFactList from "../app-shell/MiniFactList.vue";
import PreviewPager from "../app-shell/PreviewPager.vue";
import ProgressMetricRow from "../app-shell/ProgressMetricRow.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import StatusBadge from "../ui/StatusBadge.vue";

defineProps({
  collectionPaymentDirectionSummary: { type: Array, required: true },
  collectionPaymentStatusSummary: { type: Array, required: true },
  collectionRiskFacts: { type: Function, required: true },
  collectionRiskRows: { type: Array, required: true },
  dashboardLoading: { type: Boolean, required: true },
  dashboardPaymentFacts: { type: Function, required: true },
  dashboardReconciliationFacts: { type: Function, required: true },
  dueTodayCollectionPayments: { type: Array, required: true },
  formatCurrency: { type: Function, required: true },
  formatNumber: { type: Function, required: true },
  isCollectionsTab: { type: Boolean, required: true },
  openCollectionRiskItem: { type: Function, required: true },
  openPaymentItem: { type: Function, required: true },
  openPreviewList: { type: Function, required: true },
  openReconciliationItem: { type: Function, required: true },
  overdueCollectionPayments: { type: Array, required: true },
  pagedPreviewItems: { type: Function, required: true },
  previewPageCount: { type: Function, required: true },
  previewResolvedPage: { type: Function, required: true },
  reconciliationPreviewMetrics: { type: Object, required: true },
  reconciliationPreviewOpenDifference: { type: Number, required: true },
  reconciliationPreviewRows: { type: Array, required: true },
  setPreviewPage: { type: Function, required: true },
  shouldShowViewAll: { type: Function, required: true },
  t: { type: Function, required: true },
});
</script>
