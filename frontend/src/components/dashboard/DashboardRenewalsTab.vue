<template>
  <div v-if="isRenewalsTab" class="grid grid-cols-1 gap-6 xl:grid-cols-12">
    <div class="grid gap-4 sm:grid-cols-2 xl:col-span-12 xl:grid-cols-4">
      <SaaSMetricCard
        v-for="card in renewalSummaryCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :value-class="card.valueClass"
      />
    </div>

    <!-- Left: Renewals Pipeline (8 units) -->
    <div class="space-y-5 xl:col-span-8">
      <SectionPanel :title="t('offerWaitingRenewalsTitle')" :count="formatNumber(offerWaitingRenewals.length)" panel-class="surface-card rounded-xl p-4">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="offerWaitingRenewals.length === 0" :title="t('noOfferWaitingRenewals')" compact />
        <ul v-else class="space-y-2">
          <MetaListCard
            v-for="task in pagedPreviewItems(offerWaitingRenewals, 'renewalsOfferWaiting')"
            :key="task.name"
            :title="task.policy || '-'"
            dense
            emphasis-class="border-l-4 border-l-amber-300"
            clickable
            @click="openRenewalTaskItem(task)"
          >
            <template #trailing>
              <StatusBadge v-if="task.status" domain="renewal" :status="task.status" size="xs" />
            </template>
            <MiniFactList :items="renewalTaskFactsDetailed(task)" dense />
          </MetaListCard>
        </ul>
        <PreviewPager
          v-if="offerWaitingRenewals.length > 0"
          :current-page="previewResolvedPage('renewalsOfferWaiting', offerWaitingRenewals)"
          :total-pages="previewPageCount(offerWaitingRenewals)"
          :show-view-all="shouldShowViewAll(offerWaitingRenewals)"
          :view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('renewalsOfferWaiting', $event, offerWaitingRenewals)"
          @view-all="openPreviewList('renewals')"
        />
      </SectionPanel>

      <SectionPanel :title="t('renewalQueue')" :count="formatNumber(displayRenewalTasks.length)" panel-class="surface-card rounded-xl p-4">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="displayRenewalTasks.length === 0" :title="t('noRenewal')" compact />
        <ul v-else class="space-y-2">
          <MetaListCard
            v-for="task in pagedPreviewItems(displayRenewalTasks, 'renewalsQueue')"
            :key="task.name"
            :title="task.policy || '-'"
            dense
            clickable
            @click="openRenewalTaskItem(task)"
          >
            <template #trailing>
              <StatusBadge v-if="task.status" domain="renewal" :status="task.status" size="xs" />
            </template>
            <MiniFactList :items="renewalTaskFactsDetailed(task)" dense />
          </MetaListCard>
        </ul>
        <PreviewPager
          v-if="displayRenewalTasks.length > 0"
          :current-page="previewResolvedPage('renewalsQueue', displayRenewalTasks)"
          :total-pages="previewPageCount(displayRenewalTasks)"
          :show-view-all="shouldShowViewAll(displayRenewalTasks)"
          :view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('renewalsQueue', $event, displayRenewalTasks)"
          @view-all="openPreviewList('renewals')"
        />
      </SectionPanel>
    </div>

    <!-- Right: Metrics & Linked Records (4 units) -->
    <div class="space-y-5 xl:col-span-4">
      <SectionPanel :title="t('renewalStatusOverviewTitle')" :show-count="false" panel-class="surface-card rounded-xl p-4">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="renewalStatusSummary.length === 0" :title="t('noRenewalStatus')" compact />
        <div v-else class="space-y-3">
          <ProgressMetricRow
            v-for="item in renewalStatusSummary"
            :key="item.key"
            :label="item.label"
            :value="formatNumber(item.value)"
            :ratio="item.ratio"
            :bar-class="item.colorClass"
          />
        </div>
      </SectionPanel>

      <SectionPanel :title="t('renewalOutcomeTitle')" :show-count="false" panel-class="surface-card rounded-xl p-4">
        <p class="mb-3 text-xs text-slate-500">{{ t("renewalOutcomeHint") }}</p>
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="renewalOutcomeSummary.length === 0" :title="t('noRenewalOutcome')" compact />
        <div v-else class="space-y-3">
          <ProgressMetricRow
            v-for="item in renewalOutcomeSummary"
            :key="item.key"
            :label="item.label"
            :value="formatNumber(item.value)"
            :ratio="item.ratio"
            :bar-class="item.colorClass"
          />
        </div>
      </SectionPanel>

      <SectionPanel
        v-if="showLinkedPolicies"
        :title="t('linkedPoliciesTitle')"
        :count="formatNumber(renewalLinkedPolicies.length)"
        panel-class="surface-card rounded-xl p-4"
      >
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="renewalLinkedPolicies.length === 0" :title="t('noLinkedPolicies')" compact />
        <ul v-else class="space-y-2">
          <EntityPreviewCard
            v-for="policy in pagedPreviewItems(renewalLinkedPolicies, 'renewalsPolicies')"
            :key="policy.name"
            :title="policy.policy_no || policy.name"
            dense
            clickable
            @click="openPolicyItem(policy)"
          >
            <template #trailing>
              <StatusBadge domain="policy" :status="policy.status" size="xs" />
            </template>
            <MiniFactList :items="recentPolicyFacts(policy)" dense />
            <p class="mt-1 text-xs text-slate-600">
              {{ formatCurrencyBy(policy.gross_premium, policy.currency || "TRY") }}
              /
              {{ formatCurrencyBy(policy.commission_amount || policy.commission, policy.currency || "TRY") }}
            </p>
          </EntityPreviewCard>
        </ul>
        <PreviewPager
          v-if="renewalLinkedPolicies.length > 0"
          :current-page="previewResolvedPage('renewalsPolicies', renewalLinkedPolicies)"
          :total-pages="previewPageCount(renewalLinkedPolicies)"
          :show-view-all="shouldShowViewAll(renewalLinkedPolicies)"
          :view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('renewalsPolicies', $event, renewalLinkedPolicies)"
          @view-all="openPreviewList('policies')"
        />
      </SectionPanel>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import EmptyState from "../app-shell/EmptyState.vue";
import EntityPreviewCard from "../app-shell/EntityPreviewCard.vue";
import MetaListCard from "../app-shell/MetaListCard.vue";
import MiniFactList from "../app-shell/MiniFactList.vue";
import PreviewPager from "../app-shell/PreviewPager.vue";
import ProgressMetricRow from "../app-shell/ProgressMetricRow.vue";
import SaaSMetricCard from "../app-shell/SaaSMetricCard.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import StatusBadge from "../ui/StatusBadge.vue";

const props = defineProps({
  dashboardLoading: { type: Boolean, required: true },
  displayRenewalTasks: { type: Array, required: true },
  formatCurrencyBy: { type: Function, required: true },
  formatNumber: { type: Function, required: true },
  isRenewalsTab: { type: Boolean, required: true },
  openPolicyItem: { type: Function, required: true },
  openPreviewList: { type: Function, required: true },
  openRenewalTaskItem: { type: Function, required: true },
  pagedPreviewItems: { type: Function, required: true },
  previewPageCount: { type: Function, required: true },
  previewResolvedPage: { type: Function, required: true },
  recentPolicyFacts: { type: Function, required: true },
  renewalLinkedPolicies: { type: Array, required: true },
  renewalOutcomeSummary: { type: Array, required: true },
  renewalRetentionRate: { type: Number, required: true },
  renewalStatusSummary: { type: Array, required: true },
  renewalTaskFactsDetailed: { type: Function, required: true },
  offerWaitingRenewals: { type: Array, required: true },
  setPreviewPage: { type: Function, required: true },
  shouldShowViewAll: { type: Function, required: true },
  t: { type: Function, required: true },
});

const renewalSummaryCards = computed(() => [
  { label: props.t("renewalQueue"), value: props.formatNumber(props.displayRenewalTasks.length), valueClass: "text-brand-600" },
  { label: props.t("offerWaitingRenewalsTitle"), value: props.formatNumber(props.offerWaitingRenewals.length), valueClass: "text-at-amber" },
  { label: props.t("kpiRenewalRetention"), value: `${props.formatNumber(props.renewalRetentionRate)}%`, valueClass: "text-at-green" },
  { label: props.t("linkedPoliciesTitle"), value: props.formatNumber(props.renewalLinkedPolicies.length), valueClass: "text-slate-900" },
]);

const showLinkedPolicies = computed(() => props.dashboardLoading || props.renewalLinkedPolicies.length > 0);
</script>
