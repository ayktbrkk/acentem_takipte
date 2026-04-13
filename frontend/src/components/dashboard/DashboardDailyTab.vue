<template>
  <div v-if="isDailyTab" class="grid gap-4 xl:grid-cols-3">
    <div class="space-y-4">
      <SectionPanel :title="t('followUpSlaTitle')" :count="formatNumber(prioritizedFollowUpItems.length)">
        <p class="mb-3 text-xs text-slate-500">{{ t("followUpSlaHint") }}</p>
        <div v-if="followUpLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <div v-else class="space-y-3">
          <div class="grid grid-cols-3 gap-2">
            <div class="qc-warning-card">
              <p class="text-[11px] font-semibold tracking-wide text-amber-700">{{ upperLabel(t("followUpOverdue")) }}</p>
              <p class="mt-1 text-lg font-semibold text-amber-800">{{ formatNumber(followUpSummary.overdue) }}</p>
            </div>
            <div class="qc-warning-card">
              <p class="text-[11px] font-semibold tracking-wide text-amber-700">{{ upperLabel(t("followUpToday")) }}</p>
              <p class="mt-1 text-lg font-semibold text-amber-800">{{ formatNumber(followUpSummary.due_today) }}</p>
            </div>
            <div class="qc-warning-card">
              <p class="text-[11px] font-semibold tracking-wide text-sky-700">{{ upperLabel(t("followUpSoon")) }}</p>
              <p class="mt-1 text-lg font-semibold text-sky-800">{{ formatNumber(followUpSummary.due_soon) }}</p>
            </div>
          </div>
          <ul v-if="prioritizedFollowUpItems.length > 0" class="space-y-2">
            <MetaListCard
              v-for="item in pagedPreviewItems(prioritizedFollowUpItems, 'dailyFollowUp')"
              :key="`${item.source_type}-${item.source_name}`"
              :title="followUpTitle(item)"
              :description="followUpDescription(item)"
              description-class="mt-2 text-xs font-semibold text-slate-600"
              clickable
              @click="openFollowUpItem(item)"
            >
              <MiniFactList :items="followUpFacts(item)" />
            </MetaListCard>
          </ul>
          <div v-else class="at-empty-block text-sm">{{ t("noFollowUpItems") }}</div>
          <PreviewPager
            v-if="prioritizedFollowUpItems.length > 0"
            :current-page="previewResolvedPage('dailyFollowUp', prioritizedFollowUpItems)"
            :total-pages="previewPageCount(prioritizedFollowUpItems)"
            :show-view-all="shouldShowViewAll(prioritizedFollowUpItems)"
            :view-all-label="t('viewAllItems')"
            @change-page="setPreviewPage('dailyFollowUp', $event, prioritizedFollowUpItems)"
            @view-all="openPreviewList('communication')"
          />
        </div>
      </SectionPanel>

      <SectionPanel :title="t('todayTasksTitle')" :count="formatNumber(priorityTaskItems.length)">
        <p class="mb-3 text-xs text-slate-500">{{ t("myTasksHint") }}</p>
        <div v-if="myTasksLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <div v-else class="space-y-3">
          <div class="grid grid-cols-3 gap-2">
            <div class="qc-warning-card">
              <p class="text-[11px] font-semibold tracking-wide text-amber-700">{{ upperLabel(t("taskOverdue")) }}</p>
              <p class="mt-1 text-lg font-semibold text-amber-800">{{ formatNumber(myTaskSummary.overdue) }}</p>
            </div>
            <div class="qc-warning-card">
              <p class="text-[11px] font-semibold tracking-wide text-amber-700">{{ upperLabel(t("taskToday")) }}</p>
              <p class="mt-1 text-lg font-semibold text-amber-800">{{ formatNumber(myTaskSummary.due_today) }}</p>
            </div>
            <div class="qc-warning-card">
              <p class="text-[11px] font-semibold tracking-wide text-sky-700">{{ upperLabel(t("taskSoon")) }}</p>
              <p class="mt-1 text-lg font-semibold text-sky-800">{{ formatNumber(myTaskSummary.due_soon) }}</p>
            </div>
          </div>
          <ul v-if="priorityTaskItems.length > 0" class="space-y-2">
            <MetaListCard
              v-for="task in pagedPreviewItems(priorityTaskItems, 'dailyTasks')"
              :key="task.name"
              :title="task.task_title || task.name || '-'"
              :description="localizeStatus(task.status)"
              description-class="mt-2 text-xs font-semibold text-slate-600"
              clickable
              @click="openTaskItem(task)"
            >
              <MiniFactList :items="taskFacts(task)" />
            </MetaListCard>
          </ul>
          <div v-else class="at-empty-block text-sm">{{ t("noMyTasks") }}</div>
          <PreviewPager
            v-if="priorityTaskItems.length > 0"
            :current-page="previewResolvedPage('dailyTasks', priorityTaskItems)"
            :total-pages="previewPageCount(priorityTaskItems)"
            :show-view-all="shouldShowViewAll(priorityTaskItems)"
            :view-all-label="t('viewAllItems')"
            @change-page="setPreviewPage('dailyTasks', $event, priorityTaskItems)"
            @view-all="openPreviewList('tasks')"
          />
        </div>
      </SectionPanel>
    </div>

    <div class="space-y-4">
      <SectionPanel :title="t('renewalAlertTitle')" :count="displayRenewalAlertItems.length">
        <p class="mb-3 text-xs text-slate-500">{{ t("renewalAlertHint") }}</p>
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <ul v-else-if="displayRenewalAlertItems.length > 0" class="space-y-2">
          <MetaListCard
            v-for="task in pagedPreviewItems(displayRenewalAlertItems, 'dailyRenewalAlerts')"
            :key="task.name"
            :title="task.policy || '-'"
            :description="formatDaysToDue(task.due_date)"
            description-class="mt-2 text-xs font-semibold text-amber-700"
            clickable
            @click="openRenewalTaskItem(task)"
          >
            <template #trailing>
              <StatusBadge v-if="task.status" domain="renewal" :status="task.status" />
            </template>
            <MiniFactList :items="renewalAlertFacts(task)" />
          </MetaListCard>
        </ul>
        <div v-else class="at-empty-block text-sm">{{ t("noRenewalAlert") }}</div>
        <PreviewPager
          v-if="displayRenewalAlertItems.length > 0"
          :current-page="previewResolvedPage('dailyRenewalAlerts', displayRenewalAlertItems)"
          :total-pages="previewPageCount(displayRenewalAlertItems)"
          :show-view-all="shouldShowViewAll(displayRenewalAlertItems)"
          :view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('dailyRenewalAlerts', $event, displayRenewalAlertItems)"
          @view-all="openPreviewList('renewals')"
        />
      </SectionPanel>

      <DashboardQuickActions :actions="visibleQuickActions" :open-page="openPage" :t="t" />
    </div>

    <div class="space-y-4">
      <SectionPanel :title="t('recentActivitiesTitle')" :count="formatNumber(recentActivityItems.length)">
        <div v-if="myActivitiesLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <div v-else-if="recentActivityItems.length === 0" class="at-empty-block">{{ t("recentActivitiesEmpty") }}</div>
        <ul v-else class="space-y-2">
          <MetaListCard
            v-for="activity in pagedPreviewItems(recentActivityItems, 'dailyActivities')"
            :key="activity.name"
            :title="activity.activity_title || activity.activity_type || activity.name || '-'"
              :description="localizeStatus(activity.status)"
            description-class="mt-2 text-xs font-semibold text-slate-600"
            clickable
            @click="openActivityItem(activity)"
          >
            <MiniFactList :items="activityFacts(activity)" />
          </MetaListCard>
        </ul>
        <PreviewPager
          v-if="recentActivityItems.length > 0"
          :current-page="previewResolvedPage('dailyActivities', recentActivityItems)"
          :total-pages="previewPageCount(recentActivityItems)"
          :show-view-all="shouldShowViewAll(recentActivityItems)"
          :view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('dailyActivities', $event, recentActivityItems)"
          @view-all="openPreviewList('activities')"
        />
      </SectionPanel>

      <SectionPanel :title="t('openClaimsTitle')" :count="formatNumber(openClaimsPreviewRows.length)">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">
          {{ t("loading") }}
        </div>
        <div v-else-if="openClaimsPreviewRows.length === 0" class="at-empty-block">
          {{ t("noOpenClaims") }}
        </div>
        <ul v-else class="space-y-3">
          <EntityPreviewCard
            v-for="claim in pagedPreviewItems(openClaimsPreviewRows, 'dailyClaims')"
            :key="claim.name"
            :title="claim.claim_no || claim.name"
            clickable
            @click="openClaimItem(claim)"
          >
            <template #trailing>
              <StatusBadge domain="claim" :status="claim.claim_status" />
            </template>
            <MiniFactList :items="claimFacts(claim)" />
          </EntityPreviewCard>
        </ul>
        <PreviewPager
          v-if="openClaimsPreviewRows.length > 0"
          :current-page="previewResolvedPage('dailyClaims', openClaimsPreviewRows)"
          :total-pages="previewPageCount(openClaimsPreviewRows)"
          :show-view-all="shouldShowViewAll(openClaimsPreviewRows)"
          :view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('dailyClaims', $event, openClaimsPreviewRows)"
          @view-all="openPreviewList('claims')"
        />
      </SectionPanel>

      <SectionPanel :title="t('recentPolicies')" :count="formatNumber(displayRecentPolicies.length)">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">
          {{ t("loading") }}
        </div>
        <div v-else-if="displayRecentPolicies.length === 0" class="at-empty-block">
          {{ t("noPolicy") }}
        </div>
        <ul v-else class="space-y-3">
          <EntityPreviewCard
            v-for="policy in pagedPreviewItems(displayRecentPolicies, 'dailyPolicies')"
            :key="policy.name"
            :title="policy.policy_no || policy.name"
            clickable
            @click="openPolicyItem(policy)"
          >
            <template #trailing>
              <StatusBadge domain="policy" :status="policy.status" />
            </template>
            <MiniFactList :items="recentPolicyFacts(policy)" />
            <p class="mt-1 text-xs text-slate-600">
              {{ formatCurrencyBy(policy.gross_premium, policy.currency || "TRY") }}
              /
              {{ formatCurrencyBy(policy.commission_amount || policy.commission, policy.currency || "TRY") }}
            </p>
          </EntityPreviewCard>
        </ul>
        <PreviewPager
          v-if="displayRecentPolicies.length > 0"
          :current-page="previewResolvedPage('dailyPolicies', displayRecentPolicies)"
          :total-pages="previewPageCount(displayRecentPolicies)"
          :show-view-all="shouldShowViewAll(displayRecentPolicies)"
          :view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('dailyPolicies', $event, displayRecentPolicies)"
          @view-all="openPreviewList('policies')"
        />
      </SectionPanel>
    </div>
  </div>
</template>

<script setup>
import EntityPreviewCard from "../app-shell/EntityPreviewCard.vue";
import MetaListCard from "../app-shell/MetaListCard.vue";
import MiniFactList from "../app-shell/MiniFactList.vue";
import PreviewPager from "../app-shell/PreviewPager.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import StatusBadge from "../ui/StatusBadge.vue";
import DashboardQuickActions from "./DashboardQuickActions.vue";

import { translateText } from "@/generated/translations";

const props = defineProps({
  activityFacts: { type: Function, required: true },
  dashboardLoading: { type: Boolean, required: true },
  displayRecentPolicies: { type: Array, required: true },
  displayRenewalAlertItems: { type: Array, required: true },
  followUpDescription: { type: Function, required: true },
  followUpFacts: { type: Function, required: true },
  followUpLoading: { type: Boolean, required: true },
  followUpSummary: { type: Object, required: true },
  followUpTitle: { type: Function, required: true },
  formatCurrencyBy: { type: Function, required: true },
  formatDaysToDue: { type: Function, required: true },
  formatNumber: { type: Function, required: true },
  isDailyTab: { type: Boolean, required: true },
  myActivitiesLoading: { type: Boolean, required: true },
  myTaskSummary: { type: Object, required: true },
  myTasksLoading: { type: Boolean, required: true },
  openActivityItem: { type: Function, required: true },
  openClaimItem: { type: Function, required: true },
  openClaimsPreviewRows: { type: Array, required: true },
  openFollowUpItem: { type: Function, required: true },
  openPage: { type: Function, required: true },
  openPolicyItem: { type: Function, required: true },
  openPreviewList: { type: Function, required: true },
  openRenewalTaskItem: { type: Function, required: true },
  openTaskItem: { type: Function, required: true },
  pagedPreviewItems: { type: Function, required: true },
  prioritizedFollowUpItems: { type: Array, required: true },
  priorityTaskItems: { type: Array, required: true },
  previewPageCount: { type: Function, required: true },
  previewResolvedPage: { type: Function, required: true },
  recentActivityItems: { type: Array, required: true },
  recentPolicyFacts: { type: Function, required: true },
  renewalAlertFacts: { type: Function, required: true },
  setPreviewPage: { type: Function, required: true },
  shouldShowViewAll: { type: Function, required: true },
  claimFacts: { type: Function, required: true },
  taskFacts: { type: Function, required: true },
  t: { type: Function, required: true },
  locale: { type: String, default: "en" },
  visibleQuickActions: { type: Array, required: true },
});

function upperLabel(text) {
  const loc = String(props.locale || "en").toLowerCase();
  return loc.startsWith("tr") ? String(text ?? "").toLocaleUpperCase("tr-TR") : String(text ?? "").toUpperCase();
}

function localizeStatus(rawStatus) {
  const s = String(rawStatus || "").trim();
  if (!s || s === "-") return s || "-";
  return translateText(s, props.locale) || s;
}
</script>
