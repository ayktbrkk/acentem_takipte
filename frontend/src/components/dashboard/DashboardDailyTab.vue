<template>
  <div v-if="isDailyTab" class="grid grid-cols-1 gap-6 xl:grid-cols-12">
    <div class="grid gap-4 sm:grid-cols-2 xl:col-span-12 xl:grid-cols-4">
      <SaaSMetricCard
        v-for="card in dailySummaryCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :value-class="card.valueClass"
      />
    </div>

    <!-- Main Content: Detailed Lists (8 units) -->
    <div class="space-y-5 xl:col-span-8">
      <SectionPanel
        :title="t('followUpSlaTitle')"
        :count="formatNumber(prioritizedFollowUpItems.length)"
        panel-class="surface-card rounded-xl p-4"
      >
        <p class="mb-3 text-xs text-slate-500">{{ t("followUpSlaHint") }}</p>
        <p v-if="followUpSettingsHint" class="mb-3 text-xs font-medium text-slate-600">{{ followUpSettingsHint }}</p>
        <div v-if="followUpLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <div v-else class="space-y-3">
          <ul v-if="prioritizedFollowUpItems.length > 0" class="space-y-2">
            <MetaListCard
              v-for="item in pagedPreviewItems(prioritizedFollowUpItems, 'dailyFollowUp')"
              :key="`${item.source_type}-${item.source_name}`"
              :title="followUpTitle(item)"
              :description="followUpDescription(item)"
              description-class="mt-2 text-xs font-semibold text-slate-600"
              dense
              clickable
              @click="openFollowUpItem(item)"
            >
              <MiniFactList :items="followUpFacts(item)" dense />
            </MetaListCard>
          </ul>
          <EmptyState v-else :title="t('noFollowUpItems')" />
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

      <SectionPanel
        :title="t('renewalAlertTitle')"
        :count="displayRenewalAlertItems.length"
        panel-class="surface-card rounded-xl p-4"
      >
        <p class="mb-3 text-xs text-slate-500">{{ t("renewalAlertHint") }}</p>
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <ul v-else-if="displayRenewalAlertItems.length > 0" class="space-y-2">
          <MetaListCard
            v-for="task in pagedPreviewItems(displayRenewalAlertItems, 'dailyRenewalAlerts')"
            :key="task.name"
            :title="task.policy || '-'"
            :description="formatDaysToDue(task.due_date)"
            description-class="mt-2 text-xs font-semibold text-amber-700"
            dense
            emphasis-class="border-l-4 border-l-amber-300"
            clickable
            @click="openRenewalTaskItem(task)"
          >
            <template #trailing>
              <StatusBadge v-if="task.status" domain="renewal" :status="task.status" size="xs" />
            </template>
            <MiniFactList :items="renewalAlertFacts(task)" dense />
          </MetaListCard>
        </ul>
        <EmptyState v-else :title="t('noRenewalAlert')" />
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

      <SectionPanel
        :title="t('todayTasksTitle')"
        :count="formatNumber(priorityTaskItems.length)"
        panel-class="surface-card rounded-xl p-4"
      >
        <p class="mb-3 text-xs text-slate-500">{{ t("myTasksHint") }}</p>
        <div v-if="myTasksLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <div v-else class="space-y-3">
          <ul v-if="priorityTaskItems.length > 0" class="space-y-2">
            <MetaListCard
              v-for="task in pagedPreviewItems(priorityTaskItems, 'dailyTasks')"
              :key="task.name"
              :title="task.task_title || task.name || '-'"
              :description="localizeStatus(task.status)"
              description-class="mt-2 text-xs font-semibold text-slate-600"
              dense
              clickable
              @click="openTaskItem(task)"
            >
              <MiniFactList :items="taskFacts(task)" dense />
            </MetaListCard>
          </ul>
          <EmptyState v-else :title="t('todayTasksEmpty')" />
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

    <!-- Sidebar: Actions & Summaries (4 units) -->
    <div class="space-y-5 xl:col-span-4">
      <SectionPanel
        :title="t('recentActivitiesTitle')"
        :count="formatNumber(recentActivityItems.length)"
        panel-class="surface-card rounded-xl p-4"
      >
        <div v-if="myActivitiesLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="recentActivityItems.length === 0" :title="t('recentActivitiesEmpty')" compact />
        <ul v-else class="space-y-2">
          <MetaListCard
            v-for="activity in pagedPreviewItems(recentActivityItems, 'dailyActivities')"
            :key="activity.name"
            :title="activity.activity_title || activity.activity_type || activity.name || '-'"
            :description="localizeStatus(activity.status)"
            description-class="mt-2 text-xs font-semibold text-slate-600"
            dense
            clickable
            @click="openActivityItem(activity)"
          >
            <MiniFactList :items="activityFacts(activity)" dense />
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

      <SectionPanel
        :title="t('openClaimsTitle')"
        :count="formatNumber(openClaimsPreviewRows.length)"
        panel-class="surface-card rounded-xl p-4"
      >
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="openClaimsPreviewRows.length === 0" :title="t('noOpenClaims')" compact />
        <ul v-else class="space-y-2">
          <EntityPreviewCard
            v-for="claim in pagedPreviewItems(openClaimsPreviewRows, 'dailyClaims')"
            :key="claim.name"
            :title="claim.claim_no || claim.name"
            dense
            clickable
            @click="openClaimItem(claim)"
          >
            <template #trailing>
              <StatusBadge domain="claim" :status="claim.claim_status" size="xs" />
            </template>
            <MiniFactList :items="claimFacts(claim)" dense />
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
import SaaSMetricCard from "../app-shell/SaaSMetricCard.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import StatusBadge from "../ui/StatusBadge.vue";



const props = defineProps({
  activityFacts: { type: Function, required: true },
  dashboardLoading: { type: Boolean, required: true },
  displayRecentPolicies: { type: Array, required: true },
  displayRenewalAlertItems: { type: Array, required: true },
  followUpDescription: { type: Function, required: true },
  followUpFacts: { type: Function, required: true },
  followUpLoading: { type: Boolean, required: true },
  followUpMeta: { type: Object, default: () => ({}) },
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
});

const dailySummaryCards = computed(() => [
  { label: props.t("followUpSlaTitle"), value: props.formatNumber(props.prioritizedFollowUpItems.length), valueClass: "text-brand-600" },
  { label: props.t("todayTasksTitle"), value: props.formatNumber(props.priorityTaskItems.length), valueClass: "text-slate-900" },
  { label: props.t("renewalAlertTitle"), value: props.formatNumber(props.displayRenewalAlertItems.length), valueClass: "text-at-amber" },
  { label: props.t("openClaimsTitle"), value: props.formatNumber(props.openClaimsPreviewRows.length), valueClass: "text-at-green" },
]);

const followUpSettingsHint = computed(() => {
  const settings = props.followUpMeta?.settings || {};
  const dueSoonDays = Number(settings.follow_up_due_soon_days || 0);
  const previewLimit = Number(settings.follow_up_preview_limit || 0);
  if (!dueSoonDays || !previewLimit) return "";
  return `${props.t("followUpSettingsLead")} ${props.t("followUpWindowInfoLabel")}: ${props.formatNumber(dueSoonDays)} ${props.t("followUpDaysUnit")} • ${props.t("followUpPreviewInfoLabel")}: ${props.formatNumber(previewLimit)} ${props.t("followUpRecordsUnit")}`;
});

function upperLabel(text) {
  const loc = String(props.locale || "en").toLowerCase();
  return loc.startsWith("tr") ? String(text ?? "").toLocaleUpperCase("tr-TR") : String(text ?? "").toUpperCase();
}

function localizeStatus(rawStatus) {
  const s = String(rawStatus || "").trim();
  if (!s || s === "-") return s || "-";
  return props.t(s) || s;
}
</script>
