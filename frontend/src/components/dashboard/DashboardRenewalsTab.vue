<template>
  <div v-if="isRenewalsTab" class="space-y-4 lg:space-y-5">
    <div class="grid gap-3 md:gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SaaSMetricCard
        v-for="card in renewalSummaryCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :value-class="card.valueClass"
      />
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
    <div class="grid gap-4 content-start">
      <SectionPanel :title="t('offerWaitingRenewalsTitle')" :count="formatNumber(offerWaitingRenewals.length)" panel-class="surface-card h-full rounded-xl p-3.5 sm:p-4">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="offerWaitingRenewals.length === 0" :title="t('noOfferWaitingRenewals')" compact compact-container-class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center" />
        <ul v-else class="overflow-hidden rounded-xl border border-slate-100 bg-white">
          <MetaListCard
            v-for="task in pagedPreviewItems(offerWaitingRenewals, 'renewalsOfferWaiting')"
            :key="task.name"
            :title="task.name || '-'"
            :description="renewalTaskPolicy(task)"
            :meta="renewalTaskMeta(task)"
            layout="dense"
            emphasis-class="border-l-4 border-l-amber-300"
            clickable
            @click="openRenewalTaskItem(task)"
          >
            <template #caption>
              <div class="flex items-center gap-1.5 overflow-hidden">
                <span :class="renewalTypePillClass('offer')">{{ renewalTypePillToken('offer') }}</span>
              </div>
            </template>
            <template #date>
              <p class="text-[10px] text-slate-500">{{ renewalTaskDate(task) }}</p>
            </template>
            <template #trailing>
              <StatusBadge v-if="task.status" domain="renewal" :status="task.status" size="xs" />
            </template>
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

      <SectionPanel :title="t('renewalQueue')" :count="formatNumber(displayRenewalTasks.length)" panel-class="surface-card h-full rounded-xl p-3.5 sm:p-4">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="displayRenewalTasks.length === 0" :title="t('noRenewal')" compact compact-container-class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center" />
        <ul v-else class="overflow-hidden rounded-xl border border-slate-100 bg-white">
          <MetaListCard
            v-for="task in pagedPreviewItems(displayRenewalTasks, 'renewalsQueue')"
            :key="task.name"
            :title="task.name || '-'"
            :description="renewalTaskPolicy(task)"
            :meta="renewalTaskMeta(task)"
            layout="dense"
            clickable
            @click="openRenewalTaskItem(task)"
          >
            <template #caption>
              <div class="flex items-center gap-1.5 overflow-hidden">
                <span :class="renewalTypePillClass('renewal')">{{ renewalTypePillToken('renewal') }}</span>
              </div>
            </template>
            <template #date>
              <p class="text-[10px] text-slate-500">{{ renewalTaskDate(task) }}</p>
            </template>
            <template #trailing>
              <StatusBadge v-if="task.status" domain="renewal" :status="task.status" size="xs" />
            </template>
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

    <div class="grid gap-4 content-start">
      <SectionPanel :title="t('renewalStatusOverviewTitle')" :show-count="false" panel-class="surface-card h-full rounded-xl p-3.5 sm:p-4">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="renewalStatusSummary.length === 0" :title="t('noRenewalStatus')" compact compact-container-class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-6 text-center" />
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

      <SectionPanel :title="t('renewalOutcomeTitle')" :show-count="false" panel-class="surface-card h-full rounded-xl p-3.5 sm:p-4">
        <p class="mb-3 text-xs text-slate-500">{{ t("renewalOutcomeHint") }}</p>
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="renewalOutcomeSummary.length === 0" :title="t('noRenewalOutcome')" compact compact-container-class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center" />
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
        panel-class="surface-card h-full rounded-xl p-3.5 sm:p-4"
      >
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="renewalLinkedPolicies.length === 0" :title="t('noLinkedPolicies')" compact compact-container-class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center" />
        <ul v-else class="overflow-hidden rounded-xl border border-slate-100 bg-white">
          <EntityPreviewCard
            v-for="policy in pagedPreviewItems(renewalLinkedPolicies, 'renewalsPolicies')"
            :key="policy.name"
            :title="policy.policy_no || policy.name"
            layout="dense"
            clickable
            @click="openPolicyItem(policy)"
          >
            <p class="truncate text-sm font-semibold text-slate-900">{{ renewalPolicyCustomer(policy) }}</p>
            <template #caption>
              <div class="flex items-center gap-1.5 overflow-hidden">
                <span :class="renewalTypePillClass('policy')">{{ renewalTypePillToken('policy') }}</span>
              </div>
            </template>
            <template #footer>
              <p class="truncate text-xs text-slate-600">{{ renewalPolicyMeta(policy) }}</p>
            </template>
            <template #date>
              <p class="text-[10px] text-slate-500">{{ renewalPolicyDate(policy) }}</p>
            </template>
            <template #trailing>
              <StatusBadge domain="policy" :status="policy.status" size="xs" />
            </template>
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

function normalizeText(value) {
  return String(value ?? "").trim();
}

function compactDate(value) {
  const raw = normalizeText(value);
  if (!raw) return "-";
  const match = raw.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : raw.slice(0, 10);
}

function renewalTypePillToken(value) {
  const key = normalizeText(value).toLowerCase();
  const tokens = { offer: "OFR", renewal: "REN", policy: "PLC" };
  return tokens[key] || (key.replace(/[^a-z0-9]/g, "").slice(0, 4).toUpperCase() || "ROW");
}

function renewalTypePillClass(value) {
  const key = normalizeText(value).toLowerCase();
  const palette = {
    offer: "bg-amber-100 text-amber-700",
    renewal: "bg-sky-100 text-sky-700",
    policy: "bg-emerald-100 text-emerald-700",
  };
  return `inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${palette[key] || 'bg-slate-200 text-slate-700'}`;
}

function renewalTaskPolicy(task) {
  return task?.policy || task?.name || "-";
}

function renewalTaskMeta(task) {
  const due = compactDate(task?.due_date);
  const renewal = compactDate(task?.renewal_date);
  if (due !== "-" && renewal !== "-" && due !== renewal) return `${props.t("dueDate")}: ${due} • ${props.t("renewalDate")}: ${renewal}`;
  if (due !== "-") return `${props.t("dueDate")}: ${due}`;
  if (renewal !== "-") return `${props.t("renewalDate")}: ${renewal}`;
  return "-";
}

function renewalTaskDate(task) {
  return compactDate(task?.due_date || task?.renewal_date);
}

function renewalPolicyCustomer(policy) {
  return policy?.customer || policy?.customer_name || policy?.party_name || policy?.policyholder || policy?.name || "-";
}

function renewalPolicyMeta(policy) {
  return `${props.formatCurrencyBy(policy?.gross_premium, policy?.currency || "TRY")} / ${props.formatCurrencyBy(policy?.commission_amount || policy?.commission, policy?.currency || "TRY")}`;
}

function renewalPolicyDate(policy) {
  return compactDate(policy?.issue_date || policy?.start_date || policy?.modified);
}
</script>
