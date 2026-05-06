<template>
  <div v-if="isCollectionsTab" class="space-y-4 lg:space-y-5">
    <div class="grid gap-3 md:gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SaaSMetricCard
        v-for="card in collectionsSummaryCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :value-class="card.valueClass"
      />
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
      <div class="grid gap-4 content-start">
      <SectionPanel :title="t('todayCollectionsTitle')" :count="formatNumber(dueTodayCollectionPayments.length)" panel-class="surface-card h-full rounded-xl p-3.5 sm:p-4">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="dueTodayCollectionPayments.length === 0" :title="t('noTodayCollections')" compact compact-container-class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center" />
        <ul v-else class="overflow-hidden rounded-xl border border-slate-100 bg-white">
          <EntityPreviewCard
            v-for="payment in pagedPreviewItems(dueTodayCollectionPayments, 'collectionsDueToday')"
            :key="payment.name"
            :title="payment.payment_no || payment.name"
            layout="dense"
            clickable
            @click="openPaymentItem(payment)"
          >
            <p class="truncate text-sm font-semibold text-slate-900">{{ paymentCustomer(payment) }}</p>
            <template #caption>
              <div class="flex items-center gap-1.5 overflow-hidden">
                <span :class="typePillClass(payment.payment_direction || 'payment')">{{ typePillToken(payment.payment_direction || 'payment') }}</span>
                <span v-if="paymentDelayLabel(payment)" class="truncate text-[10px] font-semibold text-red-600">{{ paymentDelayLabel(payment) }}</span>
              </div>
            </template>
            <template #footer>
              <p class="truncate text-xs text-slate-600">{{ formatCurrency(payment.amount_try) }}</p>
            </template>
            <template #date>
              <p class="text-[10px] text-slate-500">{{ paymentDate(payment) }}</p>
            </template>
            <template #trailing>
              <StatusBadge domain="payment_direction" :status="payment.payment_direction" size="xs" />
            </template>
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

      <SectionPanel :title="t('overdueCollectionsTitle')" :count="formatNumber(overdueCollectionPayments.length)" panel-class="surface-card h-full rounded-xl p-3.5 sm:p-4">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="overdueCollectionPayments.length === 0" :title="t('noOverdueCollections')" compact compact-container-class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center" />
        <ul v-else class="overflow-hidden rounded-xl border border-slate-100 bg-white">
          <EntityPreviewCard
            v-for="payment in pagedPreviewItems(overdueCollectionPayments, 'collectionsOverdue')"
            :key="payment.name"
            :title="payment.payment_no || payment.name"
            layout="dense"
            emphasis-class="border-l-4 border-l-red-500"
            clickable
            @click="openPaymentItem(payment)"
          >
            <p class="truncate text-sm font-semibold text-slate-900">{{ paymentCustomer(payment) }}</p>
            <template #caption>
              <div class="flex items-center gap-1.5 overflow-hidden">
                <span :class="typePillClass(payment.payment_direction || 'payment')">{{ typePillToken(payment.payment_direction || 'payment') }}</span>
                <span v-if="paymentDelayLabel(payment)" class="truncate text-[10px] font-semibold text-red-600">{{ paymentDelayLabel(payment) }}</span>
              </div>
            </template>
            <template #footer>
              <p class="truncate text-xs text-slate-600">{{ formatCurrency(payment.amount_try) }}</p>
            </template>
            <template #date>
              <p class="text-[10px] text-slate-500">{{ paymentDate(payment) }}</p>
            </template>
            <template #trailing>
              <StatusBadge domain="payment_direction" :status="payment.payment_direction" size="xs" />
            </template>
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

      <div class="grid gap-4 content-start">
      <SectionPanel v-if="showCollectionsPerformance" :title="t('collectionsPerformanceTitle')" :show-count="false" panel-class="surface-card h-full rounded-xl p-3.5 sm:p-4">
        <p class="mb-3 text-xs text-slate-500">{{ t("collectionsPerformanceHint") }}</p>
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <div v-else class="space-y-3">
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

      <SectionPanel :title="t('collectionsRiskTitle')" :count="formatNumber(collectionRiskRows.length)" panel-class="surface-card h-full rounded-xl p-3.5 sm:p-4">
        <p class="mb-2 text-[11px] text-slate-500">{{ t("collectionsRiskHint") }}</p>
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="collectionRiskRows.length === 0" :title="t('noCollectionsRisk')" compact compact-container-class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center" />
        <ul v-else class="overflow-hidden rounded-xl border border-slate-100 bg-white">
          <MetaListCard
            v-for="row in pagedPreviewItems(collectionRiskRows, 'collectionsRisk')"
            :key="row.key"
            :title="row.title || '-'"
            :description="row.description"
            :meta="riskReference(row)"
            layout="dense"
            :emphasis-class="Number(row?.score || 0) >= 6 ? 'border-l-4 border-l-red-500' : ''"
            clickable
            @click="openCollectionRiskItem(row)"
          >
            <template #caption>
              <div class="flex items-center gap-1.5 overflow-hidden">
                <span :class="typePillClass('risk')">{{ typePillToken('risk') }}</span>
                <span v-if="riskDelayLabel(row)" class="truncate text-[10px] font-semibold text-red-600">{{ riskDelayLabel(row) }}</span>
              </div>
            </template>
            <template #date>
              <p class="text-[10px] text-slate-500">{{ riskDate(row) }}</p>
            </template>
            <template #trailing>
              <StatusBadge domain="risk_level" :status="riskBadge(row)" size="xs" />
            </template>
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

      <SectionPanel :title="t('reconciliationPreview')" :count="formatNumber(reconciliationPreviewRows.length)" panel-class="surface-card h-full rounded-xl p-3.5 sm:p-4">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="reconciliationPreviewRows.length === 0" :title="t('noReconciliationPreview')" compact compact-container-class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center" />
        <div v-else class="space-y-2">
          <ul class="overflow-hidden rounded-xl border border-slate-100 bg-white">
            <MetaListCard
              v-for="row in pagedPreviewItems(reconciliationPreviewRows, 'collectionsReconciliation')"
              :key="row.name"
              :title="row.name || row.source_name || '-'"
              :description="reconciliationCustomer(row)"
              :meta="reconciliationReference(row)"
              layout="dense"
              clickable
              @click="openReconciliationItem(row)"
            >
              <template #caption>
                <div class="flex items-center gap-1.5 overflow-hidden">
                  <span :class="typePillClass('reconciliation')">{{ typePillToken('reconciliation') }}</span>
                  <span v-if="reconciliationDelayLabel(row)" class="truncate text-[10px] font-semibold text-red-600">{{ reconciliationDelayLabel(row) }}</span>
                </div>
              </template>
              <template #date>
                <p class="text-[10px] text-slate-500">{{ reconciliationDate(row) }}</p>
              </template>
              <template #trailing>
                <StatusBadge domain="reconciliation" :status="row.status" size="xs" />
              </template>
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
  </div>
</template>

<script setup>
import { computed } from "vue";
import EmptyState from "../app-shell/EmptyState.vue";
import EntityPreviewCard from "../app-shell/EntityPreviewCard.vue";
import MetaListCard from "../app-shell/MetaListCard.vue";
import PreviewPager from "../app-shell/PreviewPager.vue";
import ProgressMetricRow from "../app-shell/ProgressMetricRow.vue";
import SaaSMetricCard from "../app-shell/SaaSMetricCard.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import StatusBadge from "../ui/StatusBadge.vue";

const props = defineProps({
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

const collectionsSummaryCards = computed(() => [
  { label: props.t("todayCollectionsTitle"), value: props.formatNumber(props.dueTodayCollectionPayments.length), valueClass: "text-brand-600" },
  { label: props.t("overdueCollectionsTitle"), value: props.formatNumber(props.overdueCollectionPayments.length), valueClass: "text-at-amber" },
  { label: props.t("reconciliationPreview"), value: props.formatNumber(props.reconciliationPreviewRows.length), valueClass: "text-slate-900" },
  { label: props.t("openDifference"), value: props.formatCurrency(props.reconciliationPreviewOpenDifference), valueClass: "text-at-green" },
]);

const showCollectionsPerformance = computed(() => {
  if (props.dashboardLoading) return true;
  return props.collectionPaymentStatusSummary.length > 0 || props.collectionPaymentDirectionSummary.length > 0;
});

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
  const tokens = {
    inbound: "COL",
    outbound: "PAY",
    payment: "PMT",
    reconciliation: "REC",
    risk: "RSK",
  };
  return tokens[key] || (key.replace(/[^a-z0-9]/g, "").slice(0, 4).toUpperCase() || "ROW");
}

function typePillClass(value) {
  const key = normalizeText(value).toLowerCase();
  const palette = {
    inbound: "bg-emerald-100 text-emerald-700",
    outbound: "bg-rose-100 text-rose-700",
    payment: "bg-slate-200 text-slate-700",
    reconciliation: "bg-violet-100 text-violet-700",
    risk: "bg-amber-100 text-amber-700",
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

function paymentCustomer(payment) {
  return payment?.customer_full_name || payment?.customer_name || payment?.customer || payment?.party_name || "-";
}

function paymentDate(payment) {
  return compactDate(payment?.due_date || payment?.payment_date);
}

function paymentDelayLabel(payment) {
  return delayFromDate(payment?.due_date);
}

function riskReference(row) {
  const overdue = `${props.t('overdueCount')}: ${props.formatNumber(row?.overdueCount || 0)}`;
  const dueToday = `${props.t('dueTodayCount')}: ${props.formatNumber(row?.dueTodayCount || 0)}`;
  return `${overdue} · ${dueToday}`;
}

function riskDate(row) {
  return props.formatCurrency(row?.overdueAmount || 0);
}

function riskBadge(row) {
  const score = Number(row?.score || 0);
  if (score >= 6) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

function riskDelayLabel(row) {
  return Number(row?.overdueCount || 0) > 0 ? `${props.formatNumber(row?.overdueCount || 0)} ${props.t('followUpDeltaDays')}` : "";
}

function reconciliationCustomer(row) {
  return row?.party_name || row?.customer || row?.source_doctype || '-';
}

function reconciliationReference(row) {
  return row?.source_name || props.formatCurrency(row?.difference_try || 0);
}

function reconciliationDate(row) {
  return compactDate(row?.posting_date || row?.modified);
}

function reconciliationDelayLabel(row) {
  return row?.mismatch_type || '';
}
</script>
