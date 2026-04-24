<template>
  <section class="page-shell space-y-6">
    <DashboardHeader
      :active-dashboard-tab="activeDashboardTab"
      :dashboard-tabs="dashboardTabs"
      :hero-subtitle="dashboardHeroSubtitle"
      :hero-tag="t('heroTag')"
      :hero-title="dashboardHeroTitle"
      :new-lead-label="t('newLead')"
      :range-label="rangeLabel"
      :range-label-text="t('rangeLabel')"
      :range-options="rangeOptions"
      :refresh-label="t('refresh')"
      :selected-range="selectedRange"
      :show-new-lead-action="showNewLeadAction"
      :visible-range="visibleRange"
      @apply-range="applyRange"
      @new-lead="openLeadDialog"
      @reload="reloadData"
      @set-dashboard-tab="setDashboardTab"
    />

    <div
      v-if="dashboardAccessMessage"
      :class="dashboardAccessMessageKind === 'permission' ? 'qc-error-banner' : 'qc-warning-banner'"
      role="alert"
      aria-live="polite"
    >
      <p :class="dashboardAccessMessageKind === 'permission' ? 'qc-error-banner__text' : 'qc-warning-banner__text'">
        {{ dashboardAccessMessage }}
      </p>
    </div>

    <!-- audit(perf/P-04): Skeleton loader hides the blank white screen while KPIs load -->
    <SkeletonLoader
      v-if="dashboardLoading && !visibleQuickStatCards.length"
      variant="card"
      :count="4"
    />
    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardStatCard
        v-for="card in visibleQuickStatCards"
        :key="card.key"
        :title="card.title"
        :value="card.value"
        :trend-text="card.trendText"
        :trend-class="card.trendClass"
        :trend-hint="card.trendHint"
        :icon="card.icon"
      />
    </div>

    <DashboardAnalyticsRow
      :commission-trend="commissionTrend"
      :dashboard-loading="dashboardLoading"
      :format-currency="formatCurrency"
      :format-month-key="formatMonthKey"
      :format-number="formatNumber"
      :lead-status-summary="leadStatusSummary"
      :sales-offer-status-summary="salesOfferStatusSummary"
      :show-analytics-row="showAnalyticsRow"
      :t="t"
      :trend-ratio="trendRatio"
    />

    <DashboardDailyTab
      :activity-facts="activityFacts"
      :dashboard-loading="dashboardLoading"
      :display-recent-policies="displayRecentPolicies"
      :display-renewal-alert-items="displayRenewalAlertItems"
      :follow-up-description="followUpDescription"
      :follow-up-facts="followUpFacts"
      :follow-up-loading="followUpLoading"
      :follow-up-summary="followUpSummary"
      :follow-up-title="followUpTitle"
      :format-currency-by="formatCurrencyBy"
      :format-days-to-due="formatDaysToDue"
      :format-number="formatNumber"
      :is-daily-tab="isDailyTab"
      :my-activities-loading="myActivitiesLoading"
      :my-task-summary="myTaskSummary"
      :my-tasks-loading="myTasksLoading"
      :open-activity-item="openActivityItem"
      :open-claim-item="openClaimItem"
      :open-claims-preview-rows="openClaimsPreviewRows"
      :open-follow-up-item="openFollowUpItem"
      :open-page="openPage"
      :open-policy-item="openPolicyItem"
      :open-preview-list="openPreviewList"
      :open-renewal-task-item="openRenewalTaskItem"
      :open-task-item="openTaskItem"
      :paged-preview-items="pagedPreviewItems"
      :prioritized-follow-up-items="prioritizedFollowUpItems"
      :priority-task-items="priorityTaskItems"
      :preview-page-count="previewPageCount"
      :preview-resolved-page="previewResolvedPage"
      :recent-activity-items="recentActivityItems"
      :recent-policy-facts="recentPolicyFacts"
      :renewal-alert-facts="renewalAlertFacts"
      :set-preview-page="setPreviewPage"
      :should-show-view-all="shouldShowViewAll"
      :claim-facts="claimFacts"
      :task-facts="taskFacts"
      :t="t"
      :locale="activeLocale"
      :visible-quick-actions="visibleQuickActions"
    />

    <DashboardCollectionsTab
      :collection-payment-direction-summary="collectionPaymentDirectionSummary"
      :collection-payment-status-summary="collectionPaymentStatusSummary"
      :collection-risk-facts="collectionRiskFacts"
      :collection-risk-rows="collectionRiskRows"
      :dashboard-loading="dashboardLoading"
      :dashboard-payment-facts="dashboardPaymentFacts"
      :dashboard-reconciliation-facts="dashboardReconciliationFacts"
      :due-today-collection-payments="dueTodayCollectionPayments"
      :format-currency="formatCurrency"
      :format-number="formatNumber"
      :is-collections-tab="isCollectionsTab"
      :open-collection-risk-item="openCollectionRiskItem"
      :open-payment-item="openPaymentItem"
      :open-preview-list="openPreviewList"
      :open-reconciliation-item="openReconciliationItem"
      :overdue-collection-payments="overdueCollectionPayments"
      :paged-preview-items="pagedPreviewItems"
      :preview-page-count="previewPageCount"
      :preview-resolved-page="previewResolvedPage"
      :reconciliation-preview-metrics="reconciliationPreviewMetrics"
      :reconciliation-preview-open-difference="reconciliationPreviewOpenDifference"
      :reconciliation-preview-rows="reconciliationPreviewRows"
      :set-preview-page="setPreviewPage"
      :should-show-view-all="shouldShowViewAll"
      :t="t"
    />

    <DashboardRenewalsTab
      :dashboard-loading="dashboardLoading"
      :display-renewal-tasks="displayRenewalTasks"
      :format-currency-by="formatCurrencyBy"
      :format-number="formatNumber"
      :is-renewals-tab="isRenewalsTab"
      :open-policy-item="openPolicyItem"
      :open-preview-list="openPreviewList"
      :open-renewal-task-item="openRenewalTaskItem"
      :paged-preview-items="pagedPreviewItems"
      :preview-page-count="previewPageCount"
      :preview-resolved-page="previewResolvedPage"
      :recent-policy-facts="recentPolicyFacts"
      :renewal-linked-policies="renewalLinkedPolicies"
      :renewal-outcome-summary="renewalOutcomeSummary"
      :renewal-retention-rate="renewalRetentionRate"
      :renewal-status-summary="renewalStatusSummary"
      :renewal-task-facts-detailed="renewalTaskFactsDetailed"
      :offer-waiting-renewals="offerWaitingRenewals"
      :set-preview-page="setPreviewPage"
      :should-show-view-all="shouldShowViewAll"
      :t="t"
    />

    <DashboardSalesTab
      :converted-sales-offers="convertedSalesOffers"
      :dashboard-loading="dashboardLoading"
      :display-recent-leads="displayRecentLeads"
      :display-recent-policies="displayRecentPolicies"
      :format-currency-by="formatCurrencyBy"
      :format-number="formatNumber"
      :is-sales-tab="isSalesTab"
      :my-reminders-loading="myRemindersLoading"
      :my-tasks-loading="myTasksLoading"
      :open-converted-policy-item="openConvertedPolicyItem"
      :open-lead-item="openLeadItem"
      :open-offer-item="openOfferItem"
      :open-policy-item="openPolicyItem"
      :open-preview-list="openPreviewList"
      :open-sales-action-item="openSalesActionItem"
      :open-sales-action-list="openSalesActionList"
      :paged-preview-items="pagedPreviewItems"
      :preview-page-count="previewPageCount"
      :preview-resolved-page="previewResolvedPage"
      :recent-lead-facts="recentLeadFacts"
      :recent-offer-facts="recentOfferFacts"
      :recent-policy-facts="recentPolicyFacts"
      :sales-action-description="salesActionDescription"
      :sales-action-facts="salesActionFacts"
      :sales-action-title="salesActionTitle"
      :sales-candidate-actions="salesCandidateActions"
      :sales-pipeline-offers="salesPipelineOffers"
      :set-preview-page="setPreviewPage"
      :should-show-view-all="shouldShowViewAll"
      :t="t"
    />



    <Dialog
      v-model="showLeadDialog"
      :options="{ title: quickLeadDialogTitle, size: 'xl' }"
    >
      <template #body-content>
        <div class="grid gap-3 p-4">
          <div v-if="leadDialogError" class="qc-error-banner" role="alert" aria-live="polite">
            <p class="qc-error-banner__text">{{ leadDialogError }}</p>
          </div>
          <QuickCustomerPicker
            :model="newLead"
            :field-errors="leadDialogFieldErrors"
            :disabled="isSubmitting"
            :locale="activeLocale"
            :office-branch="branchStore.requestBranch || ''"
            :customer-label="{ tr: 'Müşteri / Ad Soyad', en: 'Customer / Full Name' }"
          />
          <input
            v-model="newLead.estimated_gross_premium"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            :placeholder="t('estPremiumInput')"
            min="0"
            step="0.01"
            type="number"
          />
          <textarea
            v-model="newLead.notes"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            :placeholder="t('note')"
            rows="3"
          />
        </div>
      </template>
      <template #actions>
        <ActionButton variant="secondary" size="sm" @click="resetLeadForm(); showLeadDialog = false">
          {{ t("cancel") }}
        </ActionButton>
        <ActionButton
          variant="primary"
          size="sm"
          class="!bg-brand-700 hover:!bg-brand-600"
          :disabled="isSubmitting"
          @click="createLead"
        >
          {{ t("save") }}
        </ActionButton>
      </template>
    </Dialog>
  </section>
</template>

<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Dialog, createResource } from "frappe-ui";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useDashboardStore } from "../stores/dashboard";
import ActionButton from "../components/app-shell/ActionButton.vue";
import DashboardHeader from "../components/dashboard/DashboardHeader.vue";
import DashboardStatCard from "../components/DashboardStatCard.vue";
import SkeletonLoader from "../components/ui/SkeletonLoader.vue";
import QuickCustomerPicker from "../components/app-shell/QuickCustomerPicker.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";

// audit(perf/P-01): Heavy tab components are lazy-loaded with defineAsyncComponent.
// These are only fetched from the server when the user first activates the respective
// dashboard tab, significantly reducing the initial Time-to-Interactive (TTI).
const DashboardAnalyticsRow = defineAsyncComponent(() =>
  import("../components/dashboard/DashboardAnalyticsRow.vue")
);
const DashboardDailyTab = defineAsyncComponent(() =>
  import("../components/dashboard/DashboardDailyTab.vue")
);
const DashboardCollectionsTab = defineAsyncComponent(() =>
  import("../components/dashboard/DashboardCollectionsTab.vue")
);
const DashboardRenewalsTab = defineAsyncComponent(() =>
  import("../components/dashboard/DashboardRenewalsTab.vue")
);
const DashboardSalesTab = defineAsyncComponent(() =>
  import("../components/dashboard/DashboardSalesTab.vue")
);
const DashboardQuickActions = defineAsyncComponent(() =>
  import("../components/dashboard/DashboardQuickActions.vue")
);
const SectionPanel = defineAsyncComponent(() =>
  import("../components/app-shell/SectionPanel.vue")
);
const PreviewPager = defineAsyncComponent(() =>
  import("../components/app-shell/PreviewPager.vue")
);
import { getQuickCreateConfig, getLocalizedText } from "../config/quickCreateRegistry";
import { useDashboardPresentation } from "../composables/useDashboardPresentation";
import { useDashboardFormatters } from "../composables/useDashboardFormatters";
import { useDashboardFacts } from "../composables/useDashboardFacts";
import { useDashboardSales } from "../composables/useDashboardSales";
import { useDashboardSummary } from "../composables/useDashboardSummary";
import { useDashboardOrchestration } from "../composables/useDashboardOrchestration";
import { useDashboardItemActions } from "../composables/useDashboardItemActions";
import { useDashboardLeadDialog } from "../composables/useDashboardLeadDialog";
import { useDashboardLeadSubmission } from "../composables/useDashboardLeadSubmission";
import { useDashboardLeadState } from "../composables/useDashboardLeadState";
import { useDashboardPreviewData } from "../composables/useDashboardPreviewData";
import { useDashboardPreviewPager } from "../composables/useDashboardPreviewPager";
import { useDashboardStatus } from "../composables/useDashboardStatus";
import { useDashboardTabHelpers } from "../composables/useDashboardTabHelpers";
import { useDashboardVisibleRange } from "../composables/useDashboardVisibleRange";
import {
  asArray,
  buildInitialClaimListParams,
  buildInitialKpiParams,
  buildInitialTabPayloadParams,
  isPermissionDeniedError,
  normalizeResourcePayload,
  normalizeDashboardTab,
  withDashboardOfficeBranchFilter,
} from "../utils/dashboardHelpers";
import { isValidTckn, normalizeCustomerType, normalizeIdentityNumber } from "../utils/customerIdentity";
import { translateText } from "../utils/i18n";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const branchStore = useBranchStore();
const dashboardStore = useDashboardStore();
const DASHBOARD_TAB_STORAGE_KEY = "at.dashboard.active-tab";

function readPersistedDashboardTab() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return normalizeDashboardTab(window.sessionStorage.getItem(DASHBOARD_TAB_STORAGE_KEY));
  } catch {
    return null;
  }
}

function persistDashboardTab(tab) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const normalizedTab = normalizeDashboardTab(tab);
    if (normalizedTab === "daily") {
      window.sessionStorage.removeItem(DASHBOARD_TAB_STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(DASHBOARD_TAB_STORAGE_KEY, normalizedTab);
  } catch {
    // Ignore storage errors; dashboard state still works from route/query alone.
  }
}

const dashboardTabKey = ref(normalizeDashboardTab(route.query?.tab || readPersistedDashboardTab()));
const activeLocale = computed(() => unref(authStore.locale) || "en");
const quickLeadConfig = getQuickCreateConfig("lead");
const quickLeadDialogTitle = computed(() => getLocalizedText(quickLeadConfig?.title, activeLocale.value));

// i18n: Local copy removed, using centralized i18n util.
function t(key) {
  return translateText(key, activeLocale);
}

const rangeOptions = [1, 7, 15, 30];
const selectedRange = computed({
  get: () => dashboardStore.state.range || 30,
  set: (value) => dashboardStore.setRange(value),
});
const {
  showLeadDialog,
  isSubmitting,
  leadDialogError,
  leadDialogFieldErrors,
  newLead,
} = useDashboardLeadState();

const kpiResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_dashboard_kpis",
  params: buildInitialKpiParams(branchStore, selectedRange),
  auto: false,
});

const followUpResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_follow_up_sla_payload",
  params: withDashboardOfficeBranchFilter(branchStore, { filters: {} }),
  auto: true,
});

const myTasksResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_my_tasks_payload",
  params: withDashboardOfficeBranchFilter(branchStore, { filters: {} }),
  auto: true,
});
const myActivitiesResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_my_activities_payload",
  params: withDashboardOfficeBranchFilter(branchStore, { filters: {} }),
  auto: true,
});
const myRemindersResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_my_reminders_payload",
  params: withDashboardOfficeBranchFilter(branchStore, { filters: {} }),
  auto: true,
});

const myTaskMutationResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.quick_create.update_quick_aux_record",
  auto: false,
});

const leadListResource = createResource({
  url: "frappe.client.get_list",
  params: {
    doctype: "AT Lead",
    fields: [
      "name",
      "first_name",
      "last_name",
      "email",
      "status",
      "estimated_gross_premium",
      "notes",
    ],
    order_by: "modified desc",
    limit_page_length: 8,
  },
  auto: false,
});

const renewalTaskResource = createResource({
  url: "frappe.client.get_list",
  params: {
    doctype: "AT Renewal Task",
    fields: ["name", "policy", "status", "due_date", "renewal_date"],
    order_by: "due_date asc",
    limit_page_length: 40,
  },
  auto: false,
});

const policyListResource = createResource({
  url: "frappe.client.get_list",
  params: {
    doctype: "AT Policy",
    fields: [
      "name",
      "policy_no",
      "customer",
      "status",
      "currency",
      "issue_date",
      "gross_premium",
      "commission_amount",
      "commission",
    ],
    order_by: "modified desc",
    limit_page_length: 6,
  },
  auto: false,
});

const offerListResource = createResource({
  url: "frappe.client.get_list",
  params: {
    doctype: "AT Offer",
    fields: [
      "name",
      "customer",
      "status",
      "currency",
      "valid_until",
      "gross_premium",
      "converted_policy",
    ],
    order_by: "modified desc",
    limit_page_length: 8,
  },
  auto: false,
});

const claimListResource = createResource({
  url: "frappe.client.get_list",
  params: buildInitialClaimListParams(branchStore),
  auto: true,
});

const reconciliationPreviewResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.accounting.get_reconciliation_workbench",
  params: {
    status: "Open",
    mismatch_type: null,
    limit: 8,
  },
  auto: true,
});

const dashboardTabPayloadResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_dashboard_tab_payload",
  params: buildInitialTabPayloadParams(branchStore, selectedRange, "daily"),
  auto: true,
});

const createLeadResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_lead",
});

const localeCode = computed(() => (unref(authStore.locale) === "tr" ? "tr-TR" : "en-US"));
const dashboardTabPayload = computed(() => dashboardStore.state.tabPayload || {});
const dashboardTabCards = computed(() => dashboardTabPayload.value.cards || {});
const dashboardTabMetrics = computed(() => dashboardTabPayload.value.metrics || {});
const dashboardTabSeries = computed(() => dashboardTabPayload.value.series || {});
const dashboardTabPreviews = computed(() => dashboardTabPayload.value.previews || {});
const leads = computed(() => asArray(dashboardTabPreviews.value.leads).length ? asArray(dashboardTabPreviews.value.leads) : asArray(leadListResource.data));
const renewalTasks = computed(() =>
  asArray(dashboardTabPreviews.value.renewal_tasks).length
    ? asArray(dashboardTabPreviews.value.renewal_tasks)
    : asArray(renewalTaskResource.data)
);
const activeRenewalTasks = computed(() =>
  renewalTasks.value.filter((task) => ["Open", "In Progress"].includes(String(task?.status || "")))
);
const recentPolicies = computed(() =>
  asArray(dashboardTabPreviews.value.policies).length
    ? asArray(dashboardTabPreviews.value.policies)
    : asArray(policyListResource.data)
);
const recentOffers = computed(() =>
  asArray(dashboardTabPreviews.value.offers).length
    ? asArray(dashboardTabPreviews.value.offers)
    : asArray(offerListResource.data)
);

const {
  acceptedOfferCount,
  commissionTrend,
  convertedOfferCount,
  dashboardAccessReason,
  dashboardAccessScope,
  dashboardCards,
  dashboardComparisonTrendHint,
  dashboardData,
  maxTrendValue,
  policyStatusRows,
  previousDashboardCards,
  topCompanies,
} = useDashboardSummary({
  branchStore,
  dashboardStore,
  dashboardTabCards,
  dashboardTabMetrics,
  dashboardTabSeries,
  t,
});

const {
  activeDashboardTab,
  dashboardAccessMessage,
  dashboardAccessMessageKind,
  dashboardLoading,
  dashboardLoadingRaw,
  dashboardPermissionError,
  dashboardScopeMessage,
  followUpLoading,
  isCollectionsTab,
  isDailyTab,
  isRenewalsTab,
  isSalesTab,
  myActivitiesLoading,
  myRemindersLoading,
  myTasksLoading,
  readyOfferCount,
} = useDashboardStatus({
  dashboardAccessReason,
  dashboardAccessScope,
  dashboardTabMetrics,
  dashboardTabPayloadResource,
  dashboardStore,
  followUpResource,
  isPermissionDeniedError,
  kpiResource,
  myActivitiesResource,
  myRemindersResource,
  myTasksResource,
  recentOffers,
  dashboardTabKey,
  route,
  selectedRange,
  t,
});

const {
  dashboardHeroSubtitle,
  dashboardHeroTitle,
  dashboardTabs,
  showAnalyticsRow,
  showNewLeadAction,
  showPoliciesOffersRow,
  showRenewalAlertsTopRow,
  visibleQuickActions,
} = useDashboardPresentation({
  t,
  isDailyTab,
  isSalesTab,
  isCollectionsTab,
  isRenewalsTab,
});

const {
  applyRange,
  buildKpiParams,
  buildTabPayloadParams,
  openPage,
  openPreviewList,
  reloadData,
  setDashboardTab,
  triggerDashboardReload,
} = useDashboardOrchestration({
  activeDashboardTab,
  branchStore,
  buildClaimListParams: buildInitialClaimListParams,
  claimListResource,
  dashboardTabPayloadResource,
  dashboardStore,
  dashboardTabKey,
  followUpResource,
  kpiResource,
  myActivitiesResource,
  myRemindersResource,
  myTasksResource,
  route,
  router,
  selectedRange,
});

const {
  pagedPreviewItems,
  previewPageCount,
  previewResolvedPage,
  setPreviewPage,
  shouldShowViewAll,
} = useDashboardPreviewPager();

const {
  dueTodayCollectionAmount,
  dueTodayCollectionCount,
  dueTodayCollectionPayments,
  offerWaitingRenewalCount,
  offerWaitingRenewals,
  openClaimsPreviewRows,
  overdueCollectionAmount,
  overdueCollectionCount,
  overdueCollectionPayments,
  reconciliationPreviewMetrics,
  reconciliationPreviewOpenDifference,
  reconciliationPreviewRows,
  } = useDashboardPreviewData({
  claimListResource,
  dashboardTabMetrics,
  dashboardTabPreviews,
  reconciliationPreviewResource,
});

const {
  canBlockTask,
  canCancelReminder,
  canCancelTask,
  canCompleteReminder,
  canCompleteTask,
  canStartTask,
  cancelReminder,
  cancelTask,
  completeReminder,
  completeTask,
  openActivityItem,
  openClaimItem,
  openCollectionRiskItem,
  openFollowUpItem,
  openPaymentItem,
  openPolicyItem,
  openReconciliationItem,
  openRenewalTaskItem,
  openTaskItem,
} = useDashboardItemActions({
  myTaskMutationResource,
  openPreviewList,
  router,
  triggerDashboardReload,
});

const { openLeadDialog, resetLeadForm } = useDashboardLeadDialog({
  leadDialogError,
  leadDialogFieldErrors,
  newLead,
  showLeadDialog,
});

const { createLead } = useDashboardLeadSubmission({
  activeLocale,
  createLeadResource,
  isSubmitting,
  leadDialogError,
  leadDialogFieldErrors,
  newLead,
  normalizeCustomerType,
  normalizeIdentityNumber,
  resetLeadForm,
  showLeadDialog,
  triggerDashboardReload,
  t,
  isValidTckn,
});

const renewalBucketCounts = computed(() => dashboardStore.renewalBucketCounts || { overdue: 0, due7: 0, due30: 0 });

const {
  buildQuickStatCard,
  compareDateDesc,
  compareDueDateAsc,
  formatCurrency,
  formatCurrencyBy,
  formatDate,
  formatDaysToDue,
  formatMonthKey,
  formatNumber,
  rangeLabel,
  trendRatio,
} = useDashboardFormatters({
  dashboardComparisonTrendHint,
  localeCode,
  maxTrendValue,
});

const visibleRange = useDashboardVisibleRange({
  formatDate,
  selectedRange,
});

const {
  displayRenewalAlertItems,
  displayRenewalTasks,
  followUpSummary,
  myReminderItems,
  myTaskItems,
  myTaskSummary,
  prioritizedFollowUpItems,
  priorityTaskItems,
  recentActivityItems,
  renewalAlertItems,
  renewalLinkedPolicies,
} = useDashboardTabHelpers({
  activeRenewalTasks,
  compareDateDesc,
  compareDueDateAsc,
  followUpResource,
  myActivitiesResource,
  myRemindersResource,
  myTasksResource,
  displayRecentPolicies: recentPolicies,
});

const {
  convertedSalesOffers,
  displayRecentLeads,
  displayRecentPolicies,
  leadStatusSummary,
  openConvertedPolicyItem,
  openLeadItem,
  openOfferItem,
  openSalesActionItem,
  openSalesActionList,
  recentLeadFacts,
  recentOfferFacts,
  recentPolicyFacts,
  salesActionDescription,
  salesActionFacts,
  salesActionTitle,
  salesCandidateActions,
  salesOfferStatusSummary,
  salesPipelineOffers,
} = useDashboardSales({
  dashboardData,
  dashboardTabSeries,
  formatCurrency,
  formatDate,
  leads,
  myReminderItems,
  myTaskItems,
  openPreviewList,
  openTaskItem,
  recentOffers,
  recentPolicies,
  router,
  t,
});

const {
  activityFacts,
  claimFacts,
  collectionPaymentDirectionSummary,
  collectionPaymentStatusSummary,
  collectionRiskFacts,
  collectionRiskRows,
  dashboardPaymentFacts,
  dashboardReconciliationFacts,
  followUpDescription,
  followUpFacts,
  followUpTitle,
  policyStatusSummary,
  renewalAlertFacts,
  renewalOutcomeSummary,
  renewalRetentionRate,
  renewalStatusSummary,
  renewalTaskFactsDetailed,
  taskFacts,
  visibleQuickStatCards,
} = useDashboardFacts({
  acceptedOfferCount,
  buildQuickStatCard,
  dashboardCards,
  dashboardTabSeries,
  dueTodayCollectionAmount,
  dueTodayCollectionCount,
  formatCurrency,
  formatDate,
  formatNumber,
  overdueCollectionAmount,
  overdueCollectionCount,
  overdueCollectionPayments,
  dueTodayCollectionPayments,
  followUpSummary,
  isCollectionsTab,
  isDailyTab,
  isRenewalsTab,
  isSalesTab,
  myTaskSummary,
  offerWaitingRenewalCount,
  previousDashboardCards,
  readyOfferCount,
  renewalBucketCounts,
  renewalTasks,
  t,
  policyStatusRows,
  convertedOfferCount,
});

watch(
  () => unref(kpiResource.data),
  (payload) => {
    dashboardStore.setKpiPayload(normalizeResourcePayload(payload));
  },
  { immediate: true }
);

watch(
  () => unref(dashboardTabPayloadResource.data),
  (payload) => {
    dashboardStore.setTabPayload(normalizeResourcePayload(payload));
  },
  { immediate: true }
);

watch(
  dashboardLoadingRaw,
  (value) => {
    dashboardStore.setLoading(value);
  },
  { immediate: true }
);

watch(
  activeDashboardTab,
  (value) => {
    persistDashboardTab(value);
    dashboardStore.setActiveTab(value);
    triggerDashboardReload({ includeKpis: false });
  },
  { immediate: true }
);

watch(
  () => normalizeDashboardTab(route.query?.tab),
  (routeTab) => {
    const currentTab = normalizeDashboardTab(unref(dashboardTabKey) || dashboardStore.state.activeTab);
    if (!dashboardRouteReady) {
      if (route.query?.tab && routeTab !== currentTab) {
        dashboardTabKey.value = routeTab;
        dashboardStore.setActiveTab(routeTab);
      }
      return;
    }
    if (routeTab === currentTab) {
      persistDashboardTab(currentTab);
      return;
    }
    persistDashboardTab(routeTab);
    dashboardTabKey.value = routeTab;
    dashboardStore.setActiveTab(routeTab);
  },
  { immediate: true }
);

const selectedFilterValues = computed(() => {
  return unref(filterStore.activeFilters);
});

let recordChangeHandler = null;

function bindRecordRealtimeListener() {
  const realtime = window?.frappe?.realtime;
  if (!realtime || typeof realtime.on !== "function") {
    return;
  }

  recordChangeHandler = (payload) => {
    // Only reload if the change is relevant to the dashboard (Policy, Payment, Claim)
    const dashboardDocTypes = ["AT Policy", "AT Payment", "AT Claim", "AT Offer", "AT Lead"];
    if (dashboardDocTypes.includes(payload?.doctype)) {
      reloadData();
    }
  };
  realtime.on("at_record_changed", recordChangeHandler);
}

function unbindRecordRealtimeListener() {
  const realtime = window?.frappe?.realtime;
  if (!realtime || typeof realtime.off !== "function" || !recordChangeHandler) {
    return;
  }
  realtime.off("at_record_changed", recordChangeHandler);
  recordChangeHandler = null;
}

onMounted(() => {
  bindRecordRealtimeListener();
  dashboardRouteReady = true;
  if (route.query?.tab) {
    return;
  }
  const persistedTab = normalizeDashboardTab(readPersistedDashboardTab());
  if (persistedTab === "daily") {
    return;
  }
  dashboardTabKey.value = persistedTab;
  dashboardStore.setActiveTab(persistedTab);
  router.replace({
    name: "dashboard",
    query: { ...route.query, tab: persistedTab },
    hash: route.hash || "",
  });
});

onBeforeUnmount(() => {
  unbindRecordRealtimeListener();
});

watch(
  () => branchStore.selected,
  () => {
    triggerDashboardReload();
  }
);
</script>

