<template>
  <div v-if="isDailyTab" class="space-y-4 lg:space-y-5">
    <div class="grid gap-3 md:gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SaaSMetricCard
        v-for="card in dailySummaryCards"
        :key="card.label"
        :label="card.label"
        :value="card.value"
        :value-class="card.valueClass"
      />
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
      <div class="grid gap-4 content-start">
      <SectionPanel
        :title="t('followUpSlaTitle')"
        :count="formatNumber(prioritizedFollowUpItems.length)"
        panel-class="surface-card h-full rounded-xl p-3.5 sm:p-4"
      >
        <p class="mb-2 text-[11px] text-slate-500">{{ t("followUpSlaHint") }}</p>
        <p v-if="followUpSettingsHint" class="mb-2 text-[11px] font-medium text-slate-600">{{ followUpSettingsHint }}</p>
        <div v-if="followUpLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <div v-else class="space-y-3">
          <ul v-if="prioritizedFollowUpItems.length > 0" class="overflow-hidden rounded-xl border border-slate-100 bg-white">
            <MetaListCard
              v-for="item in pagedPreviewItems(prioritizedFollowUpItems, 'dailyFollowUp')"
              :key="`${item.source_type}-${item.source_name}`"
              :title="followUpRowId(item)"
              :description="followUpCustomer(item)"
              :meta="followUpReference(item)"
              layout="dense"
              :emphasis-class="followUpIsOverdue(item) ? 'border-l-4 border-l-red-500' : ''"
              clickable
              @click="openFollowUpItem(item)"
            >
              <template #caption>
                <div class="flex items-center gap-1.5 overflow-hidden">
                  <span :class="typePillClass(followUpType(item))">{{ typePillToken(followUpType(item)) }}</span>
                  <span v-if="followUpDelay(item)" class="truncate text-[10px] font-semibold text-red-600">{{ followUpDelay(item) }}</span>
                </div>
              </template>
              <template #date>
                <p class="text-[10px] text-slate-500">{{ followUpDate(item) }}</p>
              </template>
              <template #trailing>
                <StatusBadge v-if="followUpStatus(item)" :domain="followUpStatusDomain(item)" :status="followUpStatus(item)" size="xs" />
              </template>
            </MetaListCard>
          </ul>
          <EmptyState v-else :title="t('noFollowUpItems')" compact compact-container-class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center" />
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
        panel-class="surface-card h-full rounded-xl p-3.5 sm:p-4"
      >
        <p class="mb-2 text-[11px] text-slate-500">{{ t("renewalAlertHint") }}</p>
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <ul v-else-if="displayRenewalAlertItems.length > 0" class="overflow-hidden rounded-xl border border-slate-100 bg-white">
          <MetaListCard
            v-for="task in pagedPreviewItems(displayRenewalAlertItems, 'dailyRenewalAlerts')"
            :key="task.name"
            :title="task.name || '-'"
            :description="renewalAlertCustomer(task)"
            :meta="renewalAlertReference(task)"
            layout="dense"
            :emphasis-class="renewalAlertIsHot(task) ? 'border-l-4 border-l-red-500' : ''"
            clickable
            @click="openRenewalTaskItem(task)"
          >
            <template #caption>
              <div class="flex items-center gap-1.5 overflow-hidden">
                <span :class="typePillClass('renewal')">{{ typePillToken('renewal') }}</span>
                <span v-if="renewalAlertDelay(task)" class="truncate text-[10px] font-semibold text-red-600">{{ renewalAlertDelay(task) }}</span>
              </div>
            </template>
            <template #date>
              <p class="text-[10px] text-slate-500">{{ renewalAlertDate(task) }}</p>
            </template>
            <template #trailing>
              <StatusBadge v-if="task.status" domain="renewal" :status="task.status" size="xs" />
            </template>
          </MetaListCard>
        </ul>
        <EmptyState v-else :title="t('noRenewalAlert')" compact compact-container-class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center" />
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
      </div>

      <div class="grid gap-4 content-start">
        <SectionPanel
          :title="t('todayTasksTitle')"
          :count="formatNumber(priorityTaskItems.length)"
          panel-class="surface-card h-full rounded-xl p-3.5 sm:p-4"
        >
          <p class="mb-2 text-[11px] text-slate-500">{{ t("myTasksHint") }}</p>
          <div v-if="myTasksLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else class="space-y-3">
            <ul v-if="priorityTaskItems.length > 0" class="overflow-hidden rounded-xl border border-slate-100 bg-white">
              <MetaListCard
                v-for="task in pagedPreviewItems(priorityTaskItems, 'dailyTasks')"
                :key="task.name"
                :title="task.name || '-'"
                :description="task.task_title || task.name || '-'"
                :meta="taskReference(task)"
                layout="dense"
                :emphasis-class="taskIsOverdue(task) ? 'border-l-4 border-l-red-500' : ''"
                clickable
                @click="openTaskItem(task)"
              >
                <template #caption>
                  <div class="flex items-center gap-1.5 overflow-hidden">
                    <span :class="typePillClass(task.task_type || 'task')">{{ typePillToken(task.task_type || 'task') }}</span>
                    <span v-if="taskDelayLabel(task)" class="truncate text-[10px] font-semibold text-red-600">{{ taskDelayLabel(task) }}</span>
                  </div>
                </template>
                <template #date>
                  <p class="text-[10px] text-slate-500">{{ taskDate(task) }}</p>
                </template>
                <template #trailing>
                  <StatusBadge v-if="task.status" domain="task" :status="task.status" size="xs" />
                </template>
              </MetaListCard>
            </ul>
            <EmptyState v-else :title="t('todayTasksEmpty')" compact compact-container-class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center" />
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

      <SectionPanel
        :title="t('recentActivitiesTitle')"
        :count="formatNumber(recentActivityItems.length)"
        panel-class="surface-card h-full rounded-xl p-3.5 sm:p-4"
      >
        <div v-if="myActivitiesLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="recentActivityItems.length === 0" :title="t('recentActivitiesEmpty')" compact compact-container-class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center" />
        <ul v-else class="overflow-hidden rounded-xl border border-slate-100 bg-white">
          <MetaListCard
            v-for="activity in pagedPreviewItems(recentActivityItems, 'dailyActivities')"
            :key="activity.name"
            :title="activity.name || '-'"
            :description="activity.activity_title || activity.activity_type || activity.name || '-'"
            :meta="activityReference(activity)"
            layout="dense"
            clickable
            @click="openActivityItem(activity)"
          >
            <template #caption>
              <div class="flex items-center gap-1.5 overflow-hidden">
                <span :class="typePillClass(activity.activity_type || 'activity')">{{ typePillToken(activity.activity_type || 'activity') }}</span>
                <span v-if="activityDelayLabel(activity)" class="truncate text-[10px] font-semibold text-red-600">{{ activityDelayLabel(activity) }}</span>
              </div>
            </template>
            <template #date>
              <p class="text-[10px] text-slate-500">{{ activityDate(activity) }}</p>
            </template>
            <template #trailing>
              <StatusBadge v-if="activity.status" domain="activity" :status="activity.status" size="xs" />
            </template>
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
        panel-class="surface-card h-full rounded-xl p-3.5 sm:p-4"
      >
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <EmptyState v-else-if="openClaimsPreviewRows.length === 0" :title="t('noOpenClaims')" compact compact-container-class="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-5 text-center" />
        <ul v-else class="overflow-hidden rounded-xl border border-slate-100 bg-white">
          <EntityPreviewCard
            v-for="claim in pagedPreviewItems(openClaimsPreviewRows, 'dailyClaims')"
            :key="claim.name"
            :title="claim.claim_no || claim.name"
            layout="dense"
            :emphasis-class="claimIsHot(claim) ? 'border-l-4 border-l-red-500' : ''"
            clickable
            @click="openClaimItem(claim)"
          >
            <p class="truncate text-sm font-semibold text-slate-900">{{ claimCustomer(claim) }}</p>
            <template #caption>
              <div class="flex items-center gap-1.5 overflow-hidden">
                <span :class="typePillClass('claim')">{{ typePillToken('claim') }}</span>
                <span v-if="claimDelayLabel(claim)" class="truncate text-[10px] font-semibold text-red-600">{{ claimDelayLabel(claim) }}</span>
              </div>
            </template>
            <template #footer>
              <p class="truncate text-xs text-slate-600">{{ claimReference(claim) }}</p>
            </template>
            <template #date>
              <p class="text-[10px] text-slate-500">{{ claimDate(claim) }}</p>
            </template>
            <template #trailing>
              <StatusBadge domain="claim" :status="claim.claim_status" size="xs" />
            </template>
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

function normalizeText(value) {
  return String(value ?? "").trim();
}

function customerDisplay(row) {
  return (
    normalizeText(row?.customer_full_name) ||
    normalizeText(row?.customer_name) ||
    normalizeText(row?.customer_label) ||
    normalizeText(row?.party_name) ||
    normalizeText(row?.full_name) ||
    normalizeText(row?.customer) ||
    ""
  );
}

function compactDate(value) {
  const raw = normalizeText(value);
  if (!raw) return "";
  const match = raw.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : raw.slice(0, 10);
}

function typePillToken(value) {
  const key = normalizeText(value).toLowerCase();
  const tokens = {
    activity: "ACT",
    call_note: "CALL",
    claim: "CLM",
    lead: "LED",
    reminder: "REM",
    renewal: "REN",
    task: "TSK",
    todo: "TODO",
  };
  return tokens[key] || (key.replace(/[^a-z0-9]/g, "").slice(0, 4).toUpperCase() || "ROW");
}

function typePillClass(value) {
  const key = normalizeText(value).toLowerCase();
  const palette = {
    activity: "bg-slate-200 text-slate-700",
    call_note: "bg-sky-100 text-sky-700",
    claim: "bg-emerald-100 text-emerald-700",
    lead: "bg-fuchsia-100 text-fuchsia-700",
    reminder: "bg-amber-100 text-amber-700",
    renewal: "bg-orange-100 text-orange-700",
    task: "bg-indigo-100 text-indigo-700",
    todo: "bg-indigo-100 text-indigo-700",
  };
  return `inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${palette[key] || 'bg-slate-200 text-slate-700'}`;
}

function dayDelayLabel(days) {
  const numericDays = Number(days);
  if (!Number.isFinite(numericDays) || numericDays <= 0) return "";
  return `${numericDays} ${props.t("followUpDeltaDays")}`;
}

function followUpRowId(item) {
  return item?.source_name || item?.reference_name || item?.reference_no || item?.name || "";
}

function followUpType(item) {
  return item?.source_type || item?.reference_type || "task";
}

function followUpCustomer(item) {
  return customerDisplay(item);
}

function followUpReference(item) {
  return item?.policy || item?.assigned_to || item?.reference_name || item?.reference_no || "";
}

function followUpDate(item) {
  return compactDate(item?.follow_up_on);
}

function followUpStatus(item) {
  return item?.status || "";
}

function followUpStatusDomain(item) {
  const type = normalizeText(followUpType(item)).toLowerCase();
  if (type.includes("renewal")) return "renewal";
  if (type.includes("claim")) return "claim";
  if (type.includes("activity") || type.includes("call")) return "activity";
  return "task";
}

function followUpIsOverdue(item) {
  return Number(item?.days_delta ?? 0) > 0;
}

function followUpDelay(item) {
  return dayDelayLabel(item?.days_delta);
}

function renewalAlertCustomer(task) {
  return customerDisplay(task);
}

function renewalAlertReference(task) {
  return task?.policy || task?.assigned_to || task?.status || "";
}

function renewalAlertDelay(task) {
  return dayDelayLabel(task?.days_to_due ? Math.abs(Number(task.days_to_due)) : task?.days_delta);
}

function renewalAlertIsHot(task) {
  return Boolean(renewalAlertDelay(task));
}

function renewalAlertDate(task) {
  return compactDate(task?.due_date || task?.renewal_date);
}

function taskDate(task) {
  return compactDate(task?.due_date);
}

function taskReference(task) {
  return task?.task_type || task?.assigned_to || "";
}

function taskIsOverdue(task) {
  return normalizeText(task?.status).toLowerCase() === "open" && Boolean(taskDelayLabel(task));
}

function taskDelayLabel(task) {
  return task?.days_delta ? dayDelayLabel(task.days_delta) : "";
}

function activityDate(activity) {
  return compactDate(activity?.activity_at || activity?.creation);
}

function activityDelayLabel(activity) {
  return dayDelayLabel(activity?.days_delta);
}

function activityReference(activity) {
  return activity?.assigned_to || activity?.owner || activity?.status || "";
}

function claimCustomer(claim) {
  return customerDisplay(claim);
}

function claimReference(claim) {
  return claim?.claim_type || claim?.incident_type || claim?.company || "";
}

function claimDate(claim) {
  return compactDate(claim?.loss_date || claim?.modified);
}

function claimDelayLabel(claim) {
  const days = Number(claim?.days_open ?? claim?.days_delta ?? 0);
  if (days > 0) return `${days} ${props.t("followUpDeltaDays")}`;
  return "";
}

function claimIsHot(claim) {
  return Boolean(claimDelayLabel(claim));
}
</script>
