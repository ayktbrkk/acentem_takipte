<template>
  <section class="page-shell space-y-6">
    <div class="detail-topbar">
      <div>
        <p class="detail-breadcrumb">{{ t("heroTag") }}</p>
        <h1 class="detail-title">{{ dashboardHeroTitle }}</h1>
        <p class="detail-subtitle">{{ dashboardHeroSubtitle }}</p>
        <p class="detail-meta">{{ t("rangeLabel") }}: {{ visibleRange }}</p>
      </div>

      <ActionToolbarGroup>
        <FilterChipButton
          v-for="days in rangeOptions"
          :key="days"
          theme="hero"
          :active="selectedRange === days"
          @click="applyRange(days)"
        >
          {{ rangeLabel(days) }}
        </FilterChipButton>

        <ActionButton
          variant="secondary"
          size="sm"
          class="!border-white/30 !bg-white/10 !text-white hover:!bg-white/20"
          @click="reloadData"
        >
          {{ t("refresh") }}
        </ActionButton>
        <ActionButton
          v-if="showNewLeadAction"
          variant="secondary"
          size="sm"
          class="!border-white/30 !bg-white !text-slate-900 hover:!bg-slate-100"
          @click="resetLeadForm(); showLeadDialog = true"
        >
          {{ t("newLead") }}
        </ActionButton>
      </ActionToolbarGroup>
    </div>

    <div class="surface-card rounded-2xl p-2">
      <div class="flex gap-2 overflow-x-auto whitespace-nowrap px-1 py-1">
        <button
          v-for="tab in dashboardTabs"
          :key="tab.key"
          class="at-tab-chip shrink-0"
          :class="activeDashboardTab === tab.key ? 'at-tab-chip-active' : 'at-tab-chip-idle'"
          type="button"
          @click="setDashboardTab(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

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

    <DashboardStatGrid :cards="visibleQuickStatCards" />

    <div v-if="showAnalyticsRow" class="grid gap-4 xl:grid-cols-3">
      <DashboardSummaryPanel
        :title="t('leadPipeline')"
        :show-count="false"
        :meta="t('liveData')"
        :loading="dashboardLoading"
        :loading-text="t('loading')"
        :is-empty="leadStatusSummary.length === 0"
        :empty-text="t('noOfferStatus')"
        body-class="space-y-4"
      >
        <ProgressMetricRow
          v-for="item in leadStatusSummary"
          :key="item.key"
          :label="item.label"
          :value="formatNumber(item.value)"
          :ratio="item.ratio"
          :bar-class="item.colorClass"
        />
      </DashboardSummaryPanel>

      <DashboardSummaryPanel
        :title="t('offerStatusOverviewTitle')"
        :show-count="false"
        :meta="t('liveData')"
        :loading="dashboardLoading"
        :loading-text="t('loading')"
        :is-empty="salesOfferStatusSummary.length === 0"
        :empty-text="t('noOfferStatus')"
        body-class="space-y-4"
      >
        <ProgressMetricRow
          v-for="item in salesOfferStatusSummary"
          :key="item.key"
          :label="item.label"
          :value="formatNumber(item.value)"
          :ratio="item.ratio"
          :bar-class="item.colorClass"
        />
      </DashboardSummaryPanel>

      <DashboardSummaryPanel
        :title="t('commissionTrend')"
        :show-count="false"
        :meta="t('lastMonths')"
        :is-empty="commissionTrend.length === 0"
        :empty-text="t('noTrendData')"
        body-class="space-y-3"
      >
        <TrendMetricRow
          v-for="entry in commissionTrend"
          :key="entry.month_key"
          :label="formatMonthKey(entry.month_key)"
          :value="formatCurrency(entry.total_commission)"
          :ratio="trendRatio(entry.total_commission)"
        />
      </DashboardSummaryPanel>
    </div>

    <div v-if="isDailyTab" class="grid gap-4 xl:grid-cols-3">
      <div class="space-y-4">
        <DashboardSectionList
          :title="t('followUpSlaTitle')"
          :count="formatNumber(prioritizedFollowUpItems.length)"
          :loading="followUpLoading"
          :loading-text="t('loading')"
          :items="pagedPreviewItems(prioritizedFollowUpItems, 'dailyFollowUp')"
          :item-key="(item) => `${item.source_type}-${item.source_name}`"
          :empty-text="t('noFollowUpItems')"
          :pager-current-page="previewResolvedPage('dailyFollowUp', prioritizedFollowUpItems)"
          :pager-total-pages="previewPageCount(prioritizedFollowUpItems)"
          :pager-show-view-all="shouldShowViewAll(prioritizedFollowUpItems)"
          :pager-view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('dailyFollowUp', $event, prioritizedFollowUpItems)"
          @view-all="openPreviewList('communication')"
        >
          <template #intro>
            <p class="mb-3 text-xs text-slate-500">{{ t("followUpSlaHint") }}</p>
          </template>
          <template #summary>
            <div class="grid grid-cols-3 gap-2">
              <div class="qc-warning-card">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-amber-700">{{ t("followUpOverdue") }}</p>
                <p class="mt-1 text-lg font-semibold text-amber-800">{{ formatNumber(followUpSummary.overdue) }}</p>
              </div>
              <div class="qc-warning-card">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-amber-700">{{ t("followUpToday") }}</p>
                <p class="mt-1 text-lg font-semibold text-amber-800">{{ formatNumber(followUpSummary.due_today) }}</p>
              </div>
              <div class="qc-warning-card">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{{ t("followUpSoon") }}</p>
                <p class="mt-1 text-lg font-semibold text-sky-800">{{ formatNumber(followUpSummary.due_soon) }}</p>
              </div>
            </div>
          </template>
          <template #item="{ item }">
            <MetaListCard
              :title="followUpTitle(item)"
              :description="followUpDescription(item)"
              description-class="mt-2 text-xs font-semibold text-slate-600"
              clickable
              @click="openFollowUpItem(item)"
            >
              <MiniFactList :items="followUpFacts(item)" />
            </MetaListCard>
          </template>
        </DashboardSectionList>

        <DashboardSectionList
          :title="t('todayTasksTitle')"
          :count="formatNumber(priorityTaskItems.length)"
          :loading="myTasksLoading"
          :loading-text="t('loading')"
          :items="pagedPreviewItems(priorityTaskItems, 'dailyTasks')"
          item-key="name"
          :empty-text="t('noMyTasks')"
          :pager-current-page="previewResolvedPage('dailyTasks', priorityTaskItems)"
          :pager-total-pages="previewPageCount(priorityTaskItems)"
          :pager-show-view-all="shouldShowViewAll(priorityTaskItems)"
          :pager-view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('dailyTasks', $event, priorityTaskItems)"
          @view-all="openPreviewList('tasks')"
        >
          <template #intro>
            <p class="mb-3 text-xs text-slate-500">{{ t("myTasksHint") }}</p>
          </template>
          <template #summary>
            <div class="grid grid-cols-3 gap-2">
              <div class="qc-warning-card">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-amber-700">{{ t("taskOverdue") }}</p>
                <p class="mt-1 text-lg font-semibold text-amber-800">{{ formatNumber(myTaskSummary.overdue) }}</p>
              </div>
              <div class="qc-warning-card">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-amber-700">{{ t("taskToday") }}</p>
                <p class="mt-1 text-lg font-semibold text-amber-800">{{ formatNumber(myTaskSummary.due_today) }}</p>
              </div>
              <div class="qc-warning-card">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{{ t("taskSoon") }}</p>
                <p class="mt-1 text-lg font-semibold text-sky-800">{{ formatNumber(myTaskSummary.due_soon) }}</p>
              </div>
            </div>
          </template>
          <template #item="{ item: task }">
            <MetaListCard
              :title="task.task_title || task.name || '-'"
              :description="task.status || '-'"
              description-class="mt-2 text-xs font-semibold text-slate-600"
              clickable
              @click="openTaskItem(task)"
            >
              <MiniFactList :items="taskFacts(task)" />
            </MetaListCard>
          </template>
        </DashboardSectionList>
      </div>

      <div class="space-y-4">
        <DashboardSectionList
          :title="t('renewalAlertTitle')"
          :count="displayRenewalAlertItems.length"
          :loading="dashboardLoading"
          :loading-text="t('loading')"
          :items="pagedPreviewItems(displayRenewalAlertItems, 'dailyRenewalAlerts')"
          item-key="name"
          :empty-text="t('noRenewalAlert')"
          :pager-current-page="previewResolvedPage('dailyRenewalAlerts', displayRenewalAlertItems)"
          :pager-total-pages="previewPageCount(displayRenewalAlertItems)"
          :pager-show-view-all="shouldShowViewAll(displayRenewalAlertItems)"
          :pager-view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('dailyRenewalAlerts', $event, displayRenewalAlertItems)"
          @view-all="openPreviewList('renewals')"
        >
          <template #intro>
            <p class="mb-3 text-xs text-slate-500">{{ t("renewalAlertHint") }}</p>
          </template>
          <template #item="{ item: task }">
            <MetaListCard
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
          </template>
        </DashboardSectionList>

        <DashboardSummaryPanel :title="t('quickActions')" :show-count="false">
          <div class="space-y-2">
            <ActionPreviewCard
              v-for="action in visibleQuickActions"
              :key="action.key"
              :title="action.label"
              :description="action.description"
              @click="openPage(action.to)"
            />
          </div>
        </DashboardSummaryPanel>
      </div>

      <div class="space-y-4">
        <DashboardSectionList
          :title="t('recentActivitiesTitle')"
          :count="formatNumber(recentActivityItems.length)"
          :loading="myActivitiesLoading"
          :loading-text="t('loading')"
          :items="pagedPreviewItems(recentActivityItems, 'dailyActivities')"
          item-key="name"
          :empty-text="t('recentActivitiesEmpty')"
          :pager-current-page="previewResolvedPage('dailyActivities', recentActivityItems)"
          :pager-total-pages="previewPageCount(recentActivityItems)"
          :pager-show-view-all="shouldShowViewAll(recentActivityItems)"
          :pager-view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('dailyActivities', $event, recentActivityItems)"
          @view-all="openPreviewList('activities')"
        >
          <template #item="{ item: activity }">
            <MetaListCard
              :title="activity.activity_title || activity.activity_type || activity.name || '-'"
              :description="activity.status || '-'"
              description-class="mt-2 text-xs font-semibold text-slate-600"
              clickable
              @click="openActivityItem(activity)"
            >
              <MiniFactList :items="activityFacts(activity)" />
            </MetaListCard>
          </template>
        </DashboardSectionList>

        <DashboardSectionList
          :title="t('openClaimsTitle')"
          :count="formatNumber(openClaimsPreviewRows.length)"
          :loading="dashboardLoading"
          :loading-text="t('loading')"
          :items="pagedPreviewItems(openClaimsPreviewRows, 'dailyClaims')"
          item-key="name"
          :empty-text="t('noOpenClaims')"
          :pager-current-page="previewResolvedPage('dailyClaims', openClaimsPreviewRows)"
          :pager-total-pages="previewPageCount(openClaimsPreviewRows)"
          :pager-show-view-all="shouldShowViewAll(openClaimsPreviewRows)"
          :pager-view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('dailyClaims', $event, openClaimsPreviewRows)"
          @view-all="openPreviewList('claims')"
        >
          <template #item="{ item: claim }">
            <EntityPreviewCard
              :title="claim.claim_no || claim.name"
              clickable
              @click="openClaimItem(claim)"
            >
              <template #trailing>
                <StatusBadge domain="claim" :status="claim.claim_status" />
              </template>
              <MiniFactList :items="claimFacts(claim)" />
            </EntityPreviewCard>
          </template>
        </DashboardSectionList>

        <DashboardSectionList
          :title="t('recentPolicies')"
          :count="formatNumber(displayRecentPolicies.length)"
          :loading="dashboardLoading"
          :loading-text="t('loading')"
          :items="pagedPreviewItems(displayRecentPolicies, 'dailyPolicies')"
          item-key="name"
          :empty-text="t('noPolicy')"
          :pager-current-page="previewResolvedPage('dailyPolicies', displayRecentPolicies)"
          :pager-total-pages="previewPageCount(displayRecentPolicies)"
          :pager-show-view-all="shouldShowViewAll(displayRecentPolicies)"
          :pager-view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('dailyPolicies', $event, displayRecentPolicies)"
          @view-all="openPreviewList('policies')"
        >
          <template #item="{ item: policy }">
            <EntityPreviewCard
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
          </template>
        </DashboardSectionList>
      </div>
    </div>

    <div v-if="isCollectionsTab" class="grid gap-4 xl:grid-cols-3">
      <div class="space-y-4 xl:col-span-2">
        <DashboardSectionList
          :title="t('todayCollectionsTitle')"
          :count="formatNumber(dueTodayCollectionPayments.length)"
          panel-class="surface-card rounded-2xl p-5"
          :loading="dashboardLoading"
          :loading-text="t('loading')"
          :items="pagedPreviewItems(dueTodayCollectionPayments, 'collectionsDueToday')"
          item-key="name"
          :empty-text="t('noTodayCollections')"
          :pager-current-page="previewResolvedPage('collectionsDueToday', dueTodayCollectionPayments)"
          :pager-total-pages="previewPageCount(dueTodayCollectionPayments)"
          :pager-show-view-all="shouldShowViewAll(dueTodayCollectionPayments)"
          :pager-view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('collectionsDueToday', $event, dueTodayCollectionPayments)"
          @view-all="openPreviewList('payments')"
        >
          <template #item="{ item: payment }">
            <EntityPreviewCard
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
          </template>
        </DashboardSectionList>

        <DashboardSectionList
          :title="t('overdueCollectionsTitle')"
          :count="formatNumber(overdueCollectionPayments.length)"
          panel-class="surface-card rounded-2xl p-5"
          :loading="dashboardLoading"
          :loading-text="t('loading')"
          :items="pagedPreviewItems(overdueCollectionPayments, 'collectionsOverdue')"
          item-key="name"
          :empty-text="t('noOverdueCollections')"
          :pager-current-page="previewResolvedPage('collectionsOverdue', overdueCollectionPayments)"
          :pager-total-pages="previewPageCount(overdueCollectionPayments)"
          :pager-show-view-all="shouldShowViewAll(overdueCollectionPayments)"
          :pager-view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('collectionsOverdue', $event, overdueCollectionPayments)"
          @view-all="openPreviewList('payments')"
        >
          <template #item="{ item: payment }">
            <EntityPreviewCard
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
          </template>
        </DashboardSectionList>
      </div>

      <div class="space-y-4">
        <DashboardSummaryPanel
          :title="t('collectionsPerformanceTitle')"
          :show-count="false"
          :loading="dashboardLoading"
          :loading-text="t('loading')"
          :is-empty="collectionPaymentStatusSummary.length === 0 && collectionPaymentDirectionSummary.length === 0"
          :empty-text="t('noCollectionPerformance')"
        >
          <template #intro>
            <p class="mb-3 text-xs text-slate-500">{{ t("collectionsPerformanceHint") }}</p>
          </template>
          <div class="space-y-4">
            <div>
              <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t("paymentStatusBreakdownTitle") }}</p>
              <div v-if="collectionPaymentStatusSummary.length === 0" class="at-empty-block text-sm">{{ t("noCollectionPerformance") }}</div>
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
              <div v-if="collectionPaymentDirectionSummary.length === 0" class="at-empty-block text-sm">{{ t("noCollectionPerformance") }}</div>
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
        </DashboardSummaryPanel>

        <DashboardSectionList
          :title="t('collectionsRiskTitle')"
          :count="formatNumber(collectionRiskRows.length)"
          :loading="dashboardLoading"
          :loading-text="t('loading')"
          :items="pagedPreviewItems(collectionRiskRows, 'collectionsRisk')"
          item-key="key"
          :empty-text="t('noCollectionsRisk')"
          :pager-current-page="previewResolvedPage('collectionsRisk', collectionRiskRows)"
          :pager-total-pages="previewPageCount(collectionRiskRows)"
          :pager-show-view-all="shouldShowViewAll(collectionRiskRows)"
          :pager-view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('collectionsRisk', $event, collectionRiskRows)"
          @view-all="openPreviewList('payments')"
        >
          <template #intro>
            <p class="mb-3 text-xs text-slate-500">{{ t("collectionsRiskHint") }}</p>
          </template>
          <template #item="{ item: row }">
            <MetaListCard
              :title="row.title"
              :description="row.description"
              description-class="mt-2 text-xs font-semibold text-slate-600"
              clickable
              @click="openCollectionRiskItem(row)"
            >
              <MiniFactList :items="collectionRiskFacts(row)" />
            </MetaListCard>
          </template>
        </DashboardSectionList>

        <DashboardSectionList
          :title="t('reconciliationPreview')"
          :count="formatNumber(reconciliationPreviewRows.length)"
          :loading="dashboardLoading"
          :loading-text="t('loading')"
          :items="pagedPreviewItems(reconciliationPreviewRows, 'collectionsReconciliation')"
          item-key="name"
          :empty-text="t('noReconciliationPreview')"
          :pager-current-page="previewResolvedPage('collectionsReconciliation', reconciliationPreviewRows)"
          :pager-total-pages="previewPageCount(reconciliationPreviewRows)"
          :pager-show-view-all="shouldShowViewAll(reconciliationPreviewRows)"
          :pager-view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('collectionsReconciliation', $event, reconciliationPreviewRows)"
          @view-all="openPreviewList('reconciliation')"
        >
          <template #summary>
            <div class="grid grid-cols-2 gap-2">
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t("mismatchRows") }}</p>
                <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatNumber(reconciliationPreviewMetrics.open || 0) }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t("openDifference") }}</p>
                <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatCurrency(reconciliationPreviewOpenDifference) }}</p>
              </div>
            </div>
          </template>
          <template #item="{ item: row }">
            <MetaListCard
              :title="`${row.source_doctype || '-'} / ${row.source_name || '-'}`"
              clickable
              @click="openReconciliationItem(row)"
            >
              <template #trailing>
                <StatusBadge domain="reconciliation" :status="row.status" />
              </template>
              <MiniFactList :items="dashboardReconciliationFacts(row)" />
            </MetaListCard>
          </template>
        </DashboardSectionList>
      </div>
    </div>

    <div v-if="isRenewalsTab" class="grid gap-4 xl:grid-cols-3">
      <div class="space-y-4 xl:col-span-2">
        <DashboardSectionList
          :title="t('offerWaitingRenewalsTitle')"
          :count="formatNumber(offerWaitingRenewals.length)"
          :loading="dashboardLoading"
          :loading-text="t('loading')"
          :items="pagedPreviewItems(offerWaitingRenewals, 'renewalsOfferWaiting')"
          item-key="name"
          :empty-text="t('noOfferWaitingRenewals')"
          :pager-current-page="previewResolvedPage('renewalsOfferWaiting', offerWaitingRenewals)"
          :pager-total-pages="previewPageCount(offerWaitingRenewals)"
          :pager-show-view-all="shouldShowViewAll(offerWaitingRenewals)"
          :pager-view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('renewalsOfferWaiting', $event, offerWaitingRenewals)"
          @view-all="openPreviewList('renewals')"
        >
          <template #item="{ item: task }">
            <MetaListCard
              :title="task.policy || '-'"
              clickable
              @click="openRenewalTaskItem(task)"
            >
              <template #trailing>
                <StatusBadge v-if="task.status" domain="renewal" :status="task.status" />
              </template>
              <MiniFactList :items="renewalTaskFactsDetailed(task)" />
            </MetaListCard>
          </template>
        </DashboardSectionList>

        <DashboardSectionList
          :title="t('renewalQueue')"
          :count="formatNumber(displayRenewalTasks.length)"
          :loading="dashboardLoading"
          :loading-text="t('loading')"
          :items="pagedPreviewItems(displayRenewalTasks, 'renewalsQueue')"
          item-key="name"
          :empty-text="t('noRenewal')"
          :pager-current-page="previewResolvedPage('renewalsQueue', displayRenewalTasks)"
          :pager-total-pages="previewPageCount(displayRenewalTasks)"
          :pager-show-view-all="shouldShowViewAll(displayRenewalTasks)"
          :pager-view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('renewalsQueue', $event, displayRenewalTasks)"
          @view-all="openPreviewList('renewals')"
        >
          <template #item="{ item: task }">
            <MetaListCard
              :title="task.policy || '-'"
              clickable
              @click="openRenewalTaskItem(task)"
            >
              <template #trailing>
                <StatusBadge v-if="task.status" domain="renewal" :status="task.status" />
              </template>
              <MiniFactList :items="renewalTaskFactsDetailed(task)" />
            </MetaListCard>
          </template>
        </DashboardSectionList>
      </div>

      <div class="space-y-4">
        <DashboardSummaryPanel
          :title="t('renewalStatusOverviewTitle')"
          :show-count="false"
          :loading="dashboardLoading"
          :loading-text="t('loading')"
          :is-empty="renewalStatusSummary.length === 0"
          :empty-text="t('noRenewalStatus')"
        >
          <ProgressMetricRow
            v-for="item in renewalStatusSummary"
            :key="item.key"
            :label="item.label"
            :value="formatNumber(item.value)"
            :ratio="item.ratio"
            :bar-class="item.colorClass"
          />
        </DashboardSummaryPanel>

        <DashboardSummaryPanel
          :title="t('renewalOutcomeTitle')"
          :show-count="false"
          :loading="dashboardLoading"
          :loading-text="t('loading')"
          :is-empty="renewalOutcomeSummary.length === 0"
          :empty-text="t('noRenewalOutcome')"
        >
          <template #intro>
            <p class="mb-3 text-xs text-slate-500">{{ t("renewalOutcomeHint") }}</p>
          </template>
          <div class="space-y-3">
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t("kpiRenewalRetention") }}</p>
              <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatNumber(renewalRetentionRate) }}%</p>
            </div>
            <ProgressMetricRow
              v-for="item in renewalOutcomeSummary"
              :key="item.key"
              :label="item.label"
              :value="formatNumber(item.value)"
              :ratio="item.ratio"
              :bar-class="item.colorClass"
            />
          </div>
        </DashboardSummaryPanel>

        <DashboardSectionList
          :title="t('linkedPoliciesTitle')"
          :count="formatNumber(renewalLinkedPolicies.length)"
          :loading="dashboardLoading"
          :loading-text="t('loading')"
          :items="pagedPreviewItems(renewalLinkedPolicies, 'renewalsPolicies')"
          item-key="name"
          :empty-text="t('noLinkedPolicies')"
          :pager-current-page="previewResolvedPage('renewalsPolicies', renewalLinkedPolicies)"
          :pager-total-pages="previewPageCount(renewalLinkedPolicies)"
          :pager-show-view-all="shouldShowViewAll(renewalLinkedPolicies)"
          :pager-view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('renewalsPolicies', $event, renewalLinkedPolicies)"
          @view-all="openPreviewList('policies')"
        >
          <template #item="{ item: policy }">
            <EntityPreviewCard
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
          </template>
        </DashboardSectionList>
      </div>
    </div>

    <div v-if="isSalesTab" class="grid gap-4 xl:grid-cols-3">
      <div class="space-y-4">
        <DashboardSectionList
          :title="t('offerPipeline')"
          :count="formatNumber(salesPipelineOffers.length)"
          :loading="dashboardLoading"
          :loading-text="t('loading')"
          :items="pagedPreviewItems(salesPipelineOffers, 'salesOffers')"
          item-key="name"
          :empty-text="t('noOffer')"
          :pager-current-page="previewResolvedPage('salesOffers', salesPipelineOffers)"
          :pager-total-pages="previewPageCount(salesPipelineOffers)"
          :pager-show-view-all="shouldShowViewAll(salesPipelineOffers)"
          :pager-view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('salesOffers', $event, salesPipelineOffers)"
          @view-all="openPreviewList('offers')"
        >
          <template #intro>
            <p class="mb-3 text-xs text-slate-500">{{ t("salesPipelineHint") }}</p>
          </template>
          <template #item="{ item: offer }">
            <EntityPreviewCard
              :title="offer.name"
              clickable
              @click="openOfferItem(offer)"
            >
              <template #trailing>
                <StatusBadge domain="offer" :status="offer.status" />
              </template>
              <MiniFactList :items="recentOfferFacts(offer)" />
              <p class="mt-1 text-xs text-slate-600">{{ formatCurrencyBy(offer.gross_premium, offer.currency || "TRY") }}</p>
            </EntityPreviewCard>
          </template>
        </DashboardSectionList>
      </div>

      <div class="space-y-4">
        <DashboardSectionList
          :title="t('convertedOffersTitle')"
          :count="formatNumber(convertedSalesOffers.length)"
          :loading="dashboardLoading"
          :loading-text="t('loading')"
          :items="pagedPreviewItems(convertedSalesOffers, 'salesConvertedOffers')"
          item-key="name"
          :empty-text="t('noConvertedOffers')"
          :pager-current-page="previewResolvedPage('salesConvertedOffers', convertedSalesOffers)"
          :pager-total-pages="previewPageCount(convertedSalesOffers)"
          :pager-show-view-all="shouldShowViewAll(convertedSalesOffers)"
          :pager-view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('salesConvertedOffers', $event, convertedSalesOffers)"
          @view-all="openPreviewList('offers')"
        >
          <template #item="{ item: offer }">
            <EntityPreviewCard
              :title="offer.name"
              clickable
              @click="openOfferItem(offer)"
            >
              <template #trailing>
                <ActionButton
                  v-if="offer.converted_policy"
                  variant="ghost"
                  size="sm"
                  @click.stop="openConvertedPolicyItem(offer)"
                >
                  {{ t("openPolicyAction") }}
                </ActionButton>
              </template>
              <MiniFactList :items="recentOfferFacts(offer)" />
              <p class="mt-1 text-xs text-slate-600">{{ formatCurrencyBy(offer.gross_premium, offer.currency || "TRY") }}</p>
              <p v-if="offer.converted_policy" class="mt-1 text-xs font-semibold text-emerald-600">
                {{ t("converted") }}: {{ offer.converted_policy }}
              </p>
            </EntityPreviewCard>
          </template>
        </DashboardSectionList>
      </div>

      <div class="space-y-4">
        <DashboardSectionList
          :title="t('recentLeads')"
          :count="formatNumber(displayRecentLeads.length)"
          :loading="dashboardLoading"
          :loading-text="t('loading')"
          :items="pagedPreviewItems(displayRecentLeads, 'salesLeads')"
          item-key="name"
          :empty-text="t('noLead')"
          :pager-current-page="previewResolvedPage('salesLeads', displayRecentLeads)"
          :pager-total-pages="previewPageCount(displayRecentLeads)"
          :pager-show-view-all="shouldShowViewAll(displayRecentLeads)"
          :pager-view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('salesLeads', $event, displayRecentLeads)"
          @view-all="openPreviewList('leads')"
        >
          <template #empty>
            <div class="at-empty-block text-center">{{ t("noLead") }}</div>
          </template>
          <template #item="{ item: lead }">
            <EntityPreviewCard
              :title="[lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.name"
              clickable
              @click="openLeadItem(lead)"
            >
              <template #trailing>
                <StatusBadge domain="lead" :status="lead.status" />
              </template>
              <MiniFactList :items="recentLeadFacts(lead)" />
              <p class="mt-2 max-h-10 overflow-hidden text-sm text-slate-700">{{ lead.notes || t("noNote") }}</p>
            </EntityPreviewCard>
          </template>
        </DashboardSectionList>

        <DashboardSectionList
          :title="t('recentPolicies')"
          :count="formatNumber(displayRecentPolicies.length)"
          :loading="dashboardLoading"
          :loading-text="t('loading')"
          :items="pagedPreviewItems(displayRecentPolicies, 'salesPolicies')"
          item-key="name"
          :empty-text="t('noPolicy')"
          :pager-current-page="previewResolvedPage('salesPolicies', displayRecentPolicies)"
          :pager-total-pages="previewPageCount(displayRecentPolicies)"
          :pager-show-view-all="shouldShowViewAll(displayRecentPolicies)"
          :pager-view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('salesPolicies', $event, displayRecentPolicies)"
          @view-all="openPreviewList('policies')"
        >
          <template #item="{ item: policy }">
            <EntityPreviewCard
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
          </template>
        </DashboardSectionList>

        <DashboardSectionList
          :title="t('salesCandidateActionTitle')"
          :count="formatNumber(salesCandidateActions.length)"
          :loading="myTasksLoading || myRemindersLoading"
          :loading-text="t('loading')"
          :items="pagedPreviewItems(salesCandidateActions, 'salesActions')"
          item-key="name"
          :empty-text="t('noSalesCandidateAction')"
          :pager-current-page="previewResolvedPage('salesActions', salesCandidateActions)"
          :pager-total-pages="previewPageCount(salesCandidateActions)"
          :pager-show-view-all="shouldShowViewAll(salesCandidateActions)"
          :pager-view-all-label="t('viewAllItems')"
          @change-page="setPreviewPage('salesActions', $event, salesCandidateActions)"
          @view-all="openSalesActionList()"
        >
          <template #intro>
            <p class="mb-3 text-xs text-slate-500">{{ t("salesCandidateActionHint") }}</p>
          </template>
          <template #item="{ item: action }">
            <MetaListCard
              :title="salesActionTitle(action)"
              :description="salesActionDescription(action)"
              description-class="mt-2 text-xs font-semibold text-slate-600"
              clickable
              @click="openSalesActionItem(action)"
            >
              <MiniFactList :items="salesActionFacts(action)" />
            </MetaListCard>
          </template>
        </DashboardSectionList>
      </div>
    </div>



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
import { computed, reactive, ref, unref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Dialog } from "frappe-ui";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useDashboardStore } from "../stores/dashboard";
import { useDashboardNavigation } from "../composables/useDashboardNavigation";
import { useDashboardResources } from "../composables/useDashboardResources";
import { useDashboardPreviewPager } from "../composables/useDashboardPreviewPager";
import ActionButton from "../components/app-shell/ActionButton.vue";
import ActionPreviewCard from "../components/app-shell/ActionPreviewCard.vue";
import ActionToolbarGroup from "../components/app-shell/ActionToolbarGroup.vue";
import FilterChipButton from "../components/app-shell/FilterChipButton.vue";
import ProgressMetricRow from "../components/app-shell/ProgressMetricRow.vue";
import TrendMetricRow from "../components/app-shell/TrendMetricRow.vue";
import EntityPreviewCard from "../components/app-shell/EntityPreviewCard.vue";
import MetaListCard from "../components/app-shell/MetaListCard.vue";
import MiniFactList from "../components/app-shell/MiniFactList.vue";
import DashboardStatGrid from "../components/app-shell/DashboardStatGrid.vue";
import DashboardSectionList from "../components/app-shell/DashboardSectionList.vue";
import DashboardSummaryPanel from "../components/app-shell/DashboardSummaryPanel.vue";
import QuickCustomerPicker from "../components/app-shell/QuickCustomerPicker.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import { getQuickCreateConfig, getLocalizedText } from "../config/quickCreate";
import { isValidTckn, normalizeCustomerType, normalizeIdentityNumber } from "../utils/customerIdentity";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const branchStore = useBranchStore();
const dashboardStore = useDashboardStore();
const activeLocale = computed(() => unref(authStore.locale) || "en");
const quickLeadConfig = getQuickCreateConfig("lead");
const quickLeadDialogTitle = computed(() => getLocalizedText(quickLeadConfig?.title, activeLocale.value));
const localeCode = computed(() => (unref(authStore.locale) === "tr" ? "tr-TR" : "en-US"));

function cstr(value) {
  return String(value ?? "").trim();
}

function getDateRange(days) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - Number(days || 30));
  return { from, to };
}

const copy = {
  tr: {
    heroTag: "Sigorta Kontrol Merkezi",
    heroTitle: "Sigorta Operasyon Panosu",
    heroSubtitle: "Frappe CRM yapısına benzer panelde fırsat, poliçe, hasar ve ödeme akışlarını canlı takip edin.",
    heroTitleDaily: "Operasyon Panosu",
    heroSubtitleDaily: "Operasyon öncelikleri, bekleyen işler ve kritik kuyruklar için canlı operasyon görünümü.",
    heroTitleSales: "Satış Panosu",
    heroSubtitleSales: "Fırsat, teklif ve poliçe üretimini satış odağında izleyin.",
    heroTitleCollections: "Tahsilat Panosu",
    heroSubtitleCollections: "Tahsilat, ödeme ve mutabakat akışlarını tek ekranda yönetin.",
    heroTitleRenewals: "Yenileme Panosu",
    heroSubtitleRenewals: "Yaklaşan bitişler ve yenileme görevlerini önceliklendirin.",
    tabDaily: "Operasyon",
    tabSales: "Satış",
    tabCollections: "Tahsilat",
    tabRenewals: "Yenileme",
    rangeLabel: "Tarih aralığı",
    refresh: "Yenile",
    newLead: "Yeni Fırsat Ekle",
    leadPipeline: "Fırsat Süreci",
    offerStatusOverviewTitle: "Teklif Durum Dağılımı",
    liveData: "Canlı veri",
    loading: "Yükleniyor...",
    commissionTrend: "Aylık Komisyon Trendi",
    lastMonths: "Son aylar",
    noTrendData: "Trend verisi bulunamadı.",
    noOfferStatus: "Teklif durum verisi bulunamadı.",
    recentLeads: "Güncel Fırsat Kartları",
    salesCandidateActionTitle: "Müşteri Aday Aksiyonu",
    salesCandidateActionHint: "Fırsat ve teklif kaynaklı açık görevleri ile hatırlatıcıları tek listede izleyin.",
    noSalesCandidateAction: "Fırsat veya teklif kaynaklı açık aksiyon bulunamadı.",
    salesActionTask: "Görev",
    salesActionReminder: "Hatırlatıcı",
    salesActionLead: "Fırsat",
    salesActionOffer: "Teklif",
    recentActivitiesTitle: "Son Aktiviteler",
    recentActivitiesEmpty: "Henüz aktivite kaydı yok.",
    openClaimsTitle: "Açık Hasarlar",
    noOpenClaims: "Açık hasar kaydı bulunamadı.",
    monthlyPremiumTrendTitle: "Aylık Prim Trendi",
    branchDistributionTitle: "Branş Dağılımı",
    policySuffix: " poliçe",
    todayTasksTitle: "Bugün Yapılacaklar",
    todayTasksEmpty: "Bugün için görev yok.",
    upcomingRenewalsTitle: "Yaklaşan Yenilemeler",
    upcomingRenewalsEmpty: "30 gün içinde yenileme yok.",
    cardView: "Kart Görünümü",
    noLead: "Fırsat kaydı bulunamadı.",
    estPremium: "Tahmini Brüt Prim",
    noNote: "Not yok.",
    renewalQueue: "Yenileme Takip Listesi",
    noRenewal: "Bekleyen yenileme görevi yok.",
    actionOfferQueueTitle: "Aksiyon Bekleyen Teklifler",
    actionOfferQueueHint: "Gönderildi / kabul edildi ve poliçeye dönüşmesi beklenen teklifler",
    noActionOfferQueue: "Aksiyon bekleyen teklif bulunmuyor.",
    dueDate: "Son tarih",
    renewalDate: "Yenileme tarihi",
    status: "Durum",
    renewalAlertTitle: "Yakın Yenileme Uyarıları",
    renewalAlertHint: "Önümüzdeki 30 gün içinde sona erecek poliçeleri izleyin.",
    noRenewalAlert: "Bugün kritik yenileme bulunmuyor.",
    trendAgainstPrevious: "önceki döneme göre",
    trendAgainstPreviousPeriod: "önceki aynı süreye göre",
    trendAgainstPreviousMonth: "geçen aya göre",
    trendAgainstPreviousYear: "geçen yıla göre",
    trendAgainstCustomPeriod: "karşılaştırma dönemine göre",
    quickActions: "Hızlı İşlemler",
    quickPolicyAction: "Yeni Poliçe",
    quickOfferAction: "Yeni Teklif",
    quickCustomerAction: "Yeni Müşteri",
    quickClaimAction: "Hasar Bildirimi",
    firstName: "Ad",
    lastName: "Soyad",
    phone: "Telefon",
    customer: "Müşteri",
    customerType: "Müşteri Tipi",
    customerTypeIndividual: "Bireysel",
    customerTypeCorporate: "Kurumsal",
    tcknLabel: "TC Kimlik No",
    taxNumberLabel: "Vergi No",
    email: "E-posta",
    estPremiumInput: "Tahmini brut prim",
    note: "Not",
    cancel: "İptal",
    save: "Kaydet",
    draft: "Taslak",
    open: "Açık",
    replied: "Görüşüldü",
    closed: "Kapandı",
    kpiGwp: "Toplam GWP (TRY)",
    kpiCommission: "Toplam Komisyon",
    kpiPolicy: "Toplam Poliçe",
    kpiRenewal: "Bekleyen Yenileme",
    kpiRenewalRetention: "Yenileme Tutma Oranı",
    kpiRenewalOfferWaiting: "Teklif Bekleyen Yenileme",
    kpiCollect: "Tahsilat (TRY)",
    kpiPayout: "Ödeme (TRY)",
    kpiClaim: "Açık Hasar",
    kpiReadyOffers: "Hazır Teklif",
    kpiReconciliationOpen: "Açık Mutabakat",
    kpiCollectionDueTodayCount: "Bugün Vadesi Gelen Tahsilat",
    kpiCollectionDueTodayAmount: "Bugün Tahsilat Tutarı",
    kpiCollectionOverdueCount: "Gecikmiş Tahsilat",
    kpiCollectionOverdueAmount: "Gecikmiş Tutar",
    kpiAvgRate: "Ort. Komisyon Oranı",
    kpiFollowUpOverdue: "Geciken Takip",
    kpiFollowUpToday: "Bugün Takip",
    kpiTaskOverdue: "Geciken Görev",
    kpiTaskToday: "Bugün Görev",
    kpiAcceptedOffers: "Kabul Edilen Teklif",
    kpiConvertedOffers: "Poliçeye Dönüşen Teklif",
    renewalRetentionHint: "Yenilenen / kaybedilen kapanışlar",
    monthlySnapshot: "Seçili aralik",
    ratioSnapshot: "Oransal performans",
    quickPolicy: "Poliçe Yönetimi",
    quickPolicyDesc: "Poliçeleri listele ve versiyonlari izle",
    quickOffer: "Teklif Panosu",
    quickOfferDesc: "Teklifleri poliçe sürecine hazırla",
    quickClaim: "Hasar Panosu",
    quickClaimDesc: "Hasar dosyalarını ve ödemeleri yönet",
    quickPayment: "Ödeme Operasyonları",
    quickPaymentDesc: "Tahsilat ve payout hareketlerini takip et",
    quickRenewal: "Yenileme Panosu",
    quickRenewalDesc: "Bitişe 30 gün kalan poliçeleri denetle",
    quickCommunication: "İletişim Merkezi",
    quickCommunicationDesc: "Bildirim kuyruğunu ve gönderimleri yönet",
    quickReconciliation: "Mutabakat",
    quickReconciliationDesc: "Muhasebe farklarını eşleştir ve kapat",
    recentPaymentsPreview: "Son Tahsilat / Ödeme Hareketleri",
    noPaymentPreview: "Tahsilat veya ödeme kaydı bulunamadı.",
    todayCollectionsTitle: "Bugün Vadesi Gelen Tahsilatlar",
    noTodayCollections: "Bugün vadesi gelen tahsilat kaydı bulunamadı.",
    overdueCollectionsTitle: "Gecikmiş Tahsilatlar",
    noOverdueCollections: "Gecikmiş tahsilat kaydı bulunamadı.",
    collectionsPerformanceTitle: "Tahsilat Performansı",
    collectionsPerformanceHint: "Ödeme durumları ve tahsilat yönlerine göre dağılımı canlı izleyin.",
    noCollectionPerformance: "Tahsilat performans özeti için veri bulunamadı.",
    paymentStatusBreakdownTitle: "Duruma Göre Ödemeler",
    paymentDirectionBreakdownTitle: "Yöne Göre Ödemeler",
    paymentPaidAmount: "Ödenen Tutar",
    collectionsRiskTitle: "Riskli Müşteriler / Poliçeler",
    collectionsRiskHint: "Gecikmiş ve vadesi yaklaşan ödemelerden en riskli kayıtları önceliklendirin.",
    noCollectionsRisk: "Riskli müşteri veya poliçe kaydı bulunamadı.",
    riskScore: "Risk Skoru",
    overdueCount: "Gecikmiş",
    dueTodayCount: "Bugün Vade",
    riskOverdueAmount: "Gecikmiş Tutar",
    riskLevelHigh: "Yüksek Risk",
    riskLevelMedium: "Orta Risk",
    riskLevelLow: "Düşük Risk",
    reconciliationPreview: "Açık Mutabakat Farkları",
    noReconciliationPreview: "Açık mutabakat kaydı bulunamadı.",
    mismatchRows: "Açık Kayıt",
    openDifference: "Toplam Fark",
    paymentDate: "Tarih",
    paymentDirection: "Yön",
    policyLabel: "Poliçe",
    reconciliationType: "Uyumsuzluk",
    difference: "Fark",
    offerWaitingRenewalsTitle: "Teklif Bekleyen Yenilemeler",
    noOfferWaitingRenewals: "Teklif bekleyen yenileme kaydı bulunamadı.",
    renewalStatusOverviewTitle: "Yenileme Durum Özeti",
    noRenewalStatus: "Durum özeti oluşturulacak yenileme kaydı yok.",
    renewalOutcomeTitle: "Dönüşüm / Ödeme Sonucu",
    renewalOutcomeHint: "Yenilenen, kaybedilen ve iptal edilen sonuçları toplu izleyin.",
    noRenewalOutcome: "Sonuç özeti için kapanmış yenileme kaydı bulunamadı.",
    outcomeRenewed: "Yenilenen",
    outcomeLost: "Kaybedilen",
    outcomeCancelled: "İptal",
    linkedPoliciesTitle: "Bağlı Poliçeler",
    noLinkedPolicies: "Yenilemeyle bağlı poliçe kaydı bulunamadı.",
    dashboardPermissionDenied: "Bu pano verisini görmek için yetkiniz yok.",
    dashboardScopeNoAssignments: "Size atanmış müşteri bulunmadığı için pano verisi gösterilemiyor.",
    dashboardScopeRestrictedEmpty: "Mevcut veri kapsaminda pano verisi bulunamadı.",
    statusInProgress: "Devam Ediyor",
    statusCompleted: "Tamamlandı",
    statusCancelled: "İptal",
    statusPaid: "Ödendi",
    statusSent: "Gönderildi",
    statusAccepted: "Kabul Edildi",
    statusRejected: "Reddedildi",
    paymentDirectionInbound: "Tahsilat",
    paymentDirectionOutbound: "Ödeme",
    validationTaxNumberLength: "Vergi numarası 10 haneli olmalıdır.",
    validationTcLength: "TC kimlik numarası 11 haneli olmalıdır.",
    validationTcInvalid: "Geçerli bir TC kimlik numarası girin.",
    policyMix: "Poliçe Durum Dağılımı",
    noPolicyMix: "Poliçe durum verisi bulunamadı.",
    statusActive: "Aktif",
    statusKyt: "KYT",
    statusIpt: "IPT",
    topCompanies: "Öne Çıkan Sigorta Şirketleri",
    noTopCompanies: "Şirket bazlı üretim verisi bulunamadı.",
    followUpSlaHint: "Geciken, bugün yapılması gereken ve yaklaşan takip kayıtlarını tek listede izleyin.",
    followUpOverdue: "Geciken",
    followUpToday: "Bugün",
    followUpSoon: "7 Gün",
    noFollowUpItems: "Takip gerektiren kayıt yok.",
    followUpTypeClaim: "Hasar",
    followUpTypeRenewal: "Yenileme",
    followUpTypeAssignment: "Atama",
    followUpTypeCallNote: "Arama Notu",
    followUpDeltaOverdue: "Gecikme",
    followUpDeltaToday: "Bugün",
    followUpDeltaDays: "gün",
    followUpDate: "Takip",
    followUpAssignee: "Sorumlu",
    openItem: "Aç",
    viewAllItems: "Tümünü Gör",
    followUpClaimsAction: "Hasar Panosu",
    followUpRenewalsAction: "Yenileme Panosu",
    followUpCommunicationAction: "İletişim Merkezi",
    myTasksTitle: "Benim Görevlerim",
    myTasksHint: "Atanmış görevleri bugün ve gelecek hafta için izleyin.",
    noMyTasks: "Atanmış görev yok.",
    myRemindersTitle: "Benim Hatırlatıcılarim",
    myRemindersHint: "Zaman bazlı takip hatırlatıcılarını izleyin.",
    noMyReminders: "Açık hatırlatıcı bulunmuyor.",
    myActivitiesTitle: "Benim Aktivitelerim",
    myActivitiesHint: "Kaydedilen son aktiviteleri takip edin.",
    noMyActivities: "Kaydedilmis aktivite yok.",
    activityLogged: "Kayıtli",
    activityShared: "Paylaşıldı",
    activityArchived: "Arşiv",
    activityType: "Aktivite Tipi",
    activityAt: "Aktivite Tarihi",
    openActivitiesAction: "Aktivite Listesi",
    taskOverdue: "Geciken",
    taskToday: "Bugün",
    taskSoon: "7 Gün",
    reminderOverdue: "Geciken",
    reminderToday: "Bugün",
    reminderSoon: "7 Gün",
    taskType: "Tip",
    taskAssignee: "Atanan",
    startTaskAction: "Takibe Al",
    blockTaskAction: "Bloke Et",
    completeTaskAction: "Tamamla",
    cancelTaskAction: "İptal",
    openTasksAction: "Görev Listesi",
    openRemindersAction: "Hatırlatıcı Listesi",
    policyCount: "Poliçe Adedi",
    grossProduction: "Brüt Üretim",
    recentPolicies: "Son Poliçeler",
    kpiRenewalOverdue: "Geciken Yenilemeler",
    kpiRenewalDue7: "7 Gün İçinde Yenilenecekler",
    kpiRenewalDue30: "30 Gün İçinde Yenilenecekler",
    noPolicy: "Poliçe kaydı bulunamadı.",
    issueDate: "Tanzim",
    offerPipeline: "Teklif Süreci",
    salesPipelineHint: "Taslak, gönderilmiş ve kabul aşamasındaki teklifleri satış kuyruğu olarak izleyin.",
    readyOffers: "Hazır Teklifler",
    noOffer: "Teklif kaydı bulunamadı.",
    convertedOffersTitle: "Dönüşen Teklifler",
    noConvertedOffers: "Poliçeye dönüşen teklif kaydı bulunamadı.",
    openPolicyAction: "Poliçeyi Aç",
    validUntil: "Geçerlilik",
    converted: "Dönüştü",
    leadPipeline: "Fırsat Süreci",
    kpiGwp: "Toplam Brüt Prim",
    kpiCollect: "Toplam Tahsilat",
    kpiPayout: "Toplam Ödeme",
    todaySnapshot: "Güncel görünüm",
    followUpSlaTitle: "Öncelikli Takipler",
  },
  en: {
    heroTag: "Insurance Control Center",
    heroTitle: "Insurance Operations Dashboard",
    heroSubtitle: "Track lead, policy, claim and payment flows in a Frappe CRM style control panel.",
    heroTitleDaily: "Operations Dashboard",
    heroSubtitleDaily: "An operations view focused on daily priorities and action queues.",
    heroTitleSales: "Sales Dashboard",
    heroSubtitleSales: "Monitor lead, offer and policy production with a sales focus.",
    heroTitleCollections: "Collections Dashboard",
    heroSubtitleCollections: "Manage collections, payouts and reconciliation flows in one place.",
    heroTitleRenewals: "Renewals Dashboard",
    heroSubtitleRenewals: "Prioritize upcoming expiries and renewal tasks.",
    tabDaily: "Operations",
    tabSales: "Sales",
    tabCollections: "Collections",
    tabRenewals: "Renewals",
    rangeLabel: "Date range",
    refresh: "Refresh",
    newLead: "Add New Lead",
    leadPipeline: "Lead Pipeline",
    offerStatusOverviewTitle: "Offer Status Distribution",
    liveData: "Live data",
    loading: "Loading...",
    commissionTrend: "Monthly Commission Trend",
    lastMonths: "Last months",
    noTrendData: "No trend data found.",
    noOfferStatus: "No offer status data found.",
    recentLeads: "Recent Lead Cards",
    salesCandidateActionTitle: "Prospect Action Queue",
    salesCandidateActionHint: "Review open tasks and reminders tied to leads and offers in one list.",
    noSalesCandidateAction: "No open lead or offer actions were found.",
    salesActionTask: "Task",
    salesActionReminder: "Reminder",
    salesActionLead: "Lead",
    salesActionOffer: "Offer",
    recentActivitiesTitle: "Recent Activities",
    recentActivitiesEmpty: "No activity records yet.",
    openClaimsTitle: "Open Claims",
    noOpenClaims: "No open claim records found.",
    monthlyPremiumTrendTitle: "Monthly Premium Trend",
    branchDistributionTitle: "Branch Distribution",
    policySuffix: " policies",
    todayTasksTitle: "Today's Tasks",
    todayTasksEmpty: "No tasks for today.",
    upcomingRenewalsTitle: "Upcoming Renewals",
    upcomingRenewalsEmpty: "No renewals due within 30 days.",
    cardView: "Card View",
    noLead: "No lead record found.",
    estPremium: "Estimated Gross Premium",
    noNote: "No notes.",
    renewalQueue: "Renewal Follow-up List",
    noRenewal: "No pending renewal tasks.",
    actionOfferQueueTitle: "Offers Requiring Action",
    actionOfferQueueHint: "Sent / accepted offers waiting for policy conversion",
    noActionOfferQueue: "No offers waiting for action.",
    dueDate: "Due date",
    renewalDate: "Renewal date",
    status: "Status",
    renewalAlertTitle: "Upcoming Renewal Alerts",
    renewalAlertHint: "Review policies that will expire within the next 30 days.",
    noRenewalAlert: "No critical renewal alert for today.",
    trendAgainstPrevious: "vs previous period",
    trendAgainstPreviousPeriod: "vs previous period",
    trendAgainstPreviousMonth: "vs previous month",
    trendAgainstPreviousYear: "vs previous year",
    trendAgainstCustomPeriod: "vs comparison period",
    quickActions: "Quick Actions",
    quickPolicyAction: "New Policy",
    quickOfferAction: "New Offer",
    quickCustomerAction: "New Customer",
    quickClaimAction: "Report Claim",
    firstName: "First Name",
    lastName: "Last Name",
    phone: "Phone",
    customer: "Customer",
    customerType: "Customer Type",
    customerTypeIndividual: "Individual",
    customerTypeCorporate: "Corporate",
    tcknLabel: "T.R. Identity Number",
    taxNumberLabel: "Tax Number",
    email: "Email",
    estPremiumInput: "Estimated gross premium",
    note: "Notes",
    cancel: "Cancel",
    save: "Save",
    draft: "Draft",
    open: "Open",
    replied: "Replied",
    closed: "Closed",
    kpiGwp: "Total GWP (TRY)",
    kpiCommission: "Total Commission",
    kpiPolicy: "Total Policies",
    kpiRenewal: "Pending Renewals",
    kpiRenewalRetention: "Renewal Retention Rate",
    kpiRenewalOfferWaiting: "Renewals Waiting For Offer",
    kpiCollect: "Collections (TRY)",
    kpiPayout: "Payouts (TRY)",
    kpiClaim: "Open Claims",
    kpiReadyOffers: "Ready Offers",
    kpiReconciliationOpen: "Open Reconciliation",
    kpiCollectionDueTodayCount: "Due Today Collections",
    kpiCollectionDueTodayAmount: "Due Today Amount",
    kpiCollectionOverdueCount: "Overdue Collections",
    kpiCollectionOverdueAmount: "Overdue Amount",
    kpiAvgRate: "Avg Commission Rate",
    kpiFollowUpOverdue: "Overdue Follow-ups",
    kpiFollowUpToday: "Follow-ups Due Today",
    kpiTaskOverdue: "Overdue Tasks",
    kpiTaskToday: "Tasks Due Today",
    kpiAcceptedOffers: "Accepted Offers",
    kpiConvertedOffers: "Converted Offers",
    todaySnapshot: "Current snapshot",
    renewalRetentionHint: "Renewed / lost closed outcomes",
    monthlySnapshot: "Selected range",
    ratioSnapshot: "Rate performance",
    quickPolicy: "Policy Management",
    quickPolicyDesc: "List policies and monitor versions",
    quickOffer: "Offer Board",
    quickOfferDesc: "Prepare offers for policy conversion",
    quickClaim: "Claims Board",
    quickClaimDesc: "Manage claim files and payouts",
    quickPayment: "Payment Operations",
    quickPaymentDesc: "Track collections and payouts",
    quickRenewal: "Renewal Board",
    quickRenewalDesc: "Review policies ending in 30 days",
    quickCommunication: "Communication Center",
    quickCommunicationDesc: "Manage notification queue and deliveries",
    quickReconciliation: "Reconciliation",
    quickReconciliationDesc: "Match and close accounting differences",
    recentPaymentsPreview: "Recent Collection / Payout Activity",
    noPaymentPreview: "No collection or payout records found.",
    todayCollectionsTitle: "Collections Due Today",
    noTodayCollections: "No collections are due today.",
    overdueCollectionsTitle: "Overdue Collections",
    noOverdueCollections: "No overdue collections found.",
    collectionsPerformanceTitle: "Collection Performance",
    collectionsPerformanceHint: "Track the live breakdown by payment status and direction.",
    noCollectionPerformance: "No data found for the collection performance summary.",
    paymentStatusBreakdownTitle: "Payments By Status",
    paymentDirectionBreakdownTitle: "Payments By Direction",
    paymentPaidAmount: "Paid Amount",
    collectionsRiskTitle: "Risky Customers / Policies",
    collectionsRiskHint: "Prioritize the riskiest records from overdue and due-today payments.",
    noCollectionsRisk: "No risky customer or policy records were found.",
    riskScore: "Risk Score",
    overdueCount: "Overdue",
    dueTodayCount: "Due Today",
    riskOverdueAmount: "Overdue Amount",
    riskLevelHigh: "High Risk",
    riskLevelMedium: "Medium Risk",
    riskLevelLow: "Low Risk",
    reconciliationPreview: "Open Reconciliation Differences",
    noReconciliationPreview: "No open reconciliation items found.",
    mismatchRows: "Open Rows",
    openDifference: "Open Difference",
    paymentDate: "Date",
    paymentDirection: "Direction",
    policyLabel: "Policy",
    reconciliationType: "Mismatch",
    difference: "Difference",
    offerWaitingRenewalsTitle: "Renewals Waiting For Offer",
    noOfferWaitingRenewals: "No renewals are waiting for an offer.",
    renewalStatusOverviewTitle: "Renewal Status Summary",
    noRenewalStatus: "No renewal rows available for a status summary.",
    renewalOutcomeTitle: "Conversion / Payment Outcome",
    renewalOutcomeHint: "Track renewed, lost, and cancelled outcomes in one summary.",
    noRenewalOutcome: "No closed renewal outcomes are available for summary.",
    outcomeRenewed: "Renewed",
    outcomeLost: "Lost",
    outcomeCancelled: "Cancelled",
    linkedPoliciesTitle: "Linked Policies",
    noLinkedPolicies: "No policies linked to renewals were found.",
    dashboardPermissionDenied: "You do not have permission to access dashboard data.",
    dashboardScopeNoAssignments: "No customers are assigned to you, so dashboard data is not available.",
    dashboardScopeRestrictedEmpty: "No dashboard data is available for your current scope.",
    statusInProgress: "In Progress",
    statusCompleted: "Done",
    statusCancelled: "Cancelled",
    statusPaid: "Paid",
    statusSent: "Sent",
    statusAccepted: "Accepted",
    statusRejected: "Rejected",
    paymentDirectionInbound: "Inbound",
    paymentDirectionOutbound: "Outbound",
    validationTaxNumberLength: "Tax number must be 10 digits.",
    validationTcLength: "T.R. identity number must be 11 digits.",
    validationTcInvalid: "Enter a valid T.R. identity number.",
    policyMix: "Policy Status Mix",
    noPolicyMix: "No policy status data found.",
    statusActive: "Active",
    statusKyt: "KYT",
    statusIpt: "IPT",
    topCompanies: "Top Insurance Companies",
    noTopCompanies: "No company production data found.",
    followUpSlaHint: "Review overdue, due today, and upcoming follow-up records in one list.",
    followUpOverdue: "Overdue",
    followUpToday: "Today",
    followUpSoon: "7 Days",
    noFollowUpItems: "No items requiring follow-up.",
    followUpTypeClaim: "Claim",
    followUpTypeRenewal: "Renewal",
    followUpTypeAssignment: "Assignment",
    followUpTypeCallNote: "Call Note",
    followUpDeltaOverdue: "Overdue",
    followUpDeltaToday: "Today",
    followUpDeltaDays: "days",
    followUpDate: "Follow-up",
    followUpAssignee: "Assignee",
    openItem: "Open",
    viewAllItems: "View All",
    followUpClaimsAction: "Claims Board",
    followUpRenewalsAction: "Renewals Board",
    followUpCommunicationAction: "Communication Center",
    myTasksTitle: "My Tasks",
    myTasksHint: "Track assigned tasks for today and the coming week.",
    noMyTasks: "No assigned tasks.",
    myRemindersTitle: "My Reminders",
    myRemindersHint: "Track time-based follow-up reminders.",
    noMyReminders: "No open reminders found.",
    myActivitiesTitle: "My Activities",
    myActivitiesHint: "Track recently logged activities.",
    noMyActivities: "No logged activities.",
    activityLogged: "Logged",
    activityShared: "Shared",
    activityArchived: "Archived",
    activityType: "Activity Type",
    activityAt: "Activity Date",
    openActivitiesAction: "Activity List",
    taskOverdue: "Overdue",
    taskToday: "Today",
    taskSoon: "7 Days",
    reminderOverdue: "Overdue",
    reminderToday: "Today",
    reminderSoon: "7 Days",
    taskType: "Type",
    taskAssignee: "Assignee",
    startTaskAction: "Start",
    blockTaskAction: "Block",
    completeTaskAction: "Mark Done",
    cancelTaskAction: "Cancel",
    openTasksAction: "Task List",
    openRemindersAction: "Reminder List",
    policyCount: "Policy Count",
    grossProduction: "Gross Production",
    recentPolicies: "Recent Policies",
    kpiRenewalOverdue: "Overdue Renewals",
    kpiRenewalDue7: "Renewals Due in 7 Days",
    kpiRenewalDue30: "Renewals Due in 30 Days",
    noPolicy: "No policy records found.",
    issueDate: "Issue Date",
    offerPipeline: "Offer Pipeline",
    salesPipelineHint: "Track draft, sent and accepted offers as the active sales queue.",
    readyOffers: "Ready Offers",
    noOffer: "No offer records found.",
    convertedOffersTitle: "Converted Offers",
    noConvertedOffers: "No converted offers found.",
    openPolicyAction: "Open Policy",
    validUntil: "Valid Until",
    converted: "Converted",
    kpiGwp: "Total Gross Premium",
    kpiCollect: "Total Collections",
    kpiPayout: "Total Payouts",
    followUpSlaTitle: "Priority Follow-ups",
  },
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const DASHBOARD_TABS = ["daily", "sales", "collections", "renewals"];

function normalizeDashboardTab(value) {
  const candidate = String(value || "").toLowerCase();
  if (!candidate || candidate === "overview" || candidate === "operations") return "daily";
  return DASHBOARD_TABS.includes(candidate) ? candidate : "daily";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

const rangeOptions = [1, 7, 15, 30];
const selectedRange = computed({
  get: () => dashboardStore.state.range || 30,
  set: (value) => dashboardStore.setRange(value),
});
const showLeadDialog = ref(false);
const isSubmitting = ref(false);
const leadDialogError = ref("");
const leadDialogFieldErrors = reactive({});
const DASHBOARD_PREVIEW_PAGE_SIZE = 5;
const DASHBOARD_PREVIEW_FETCH_LIMIT = 20;

const newLead = reactive({
  customer: "",
  queryText: "",
  customerOption: null,
  createCustomerMode: false,
  customer_type: "Individual",
  tax_id: "",
  phone: "",
  email: "",
  estimated_gross_premium: "",
  notes: "",
});

const {
  kpiResource,
  followUpResource,
  myTasksResource,
  myActivitiesResource,
  myRemindersResource,
  myTaskMutationResource,
  leadListResource,
  renewalTaskResource,
  policyListResource,
  offerListResource,
  claimListResource,
  reconciliationPreviewResource,
  dashboardTabPayloadResource,
  createLeadResource,
  dashboardTabPayload,
  dashboardTabCards,
  dashboardTabCompareCards,
  dashboardTabMetrics,
  dashboardTabSeries,
  dashboardTabPreviews,
  leads,
  renewalTasks,
  activeRenewalTasks,
  recentPolicies,
  recentOffers,
  openClaimsPreviewRows,
  dueTodayCollectionPayments,
  overdueCollectionPayments,
  offerWaitingRenewals,
  reconciliationPreviewData,
  reconciliationPreviewRows,
  dueTodayCollectionCount,
  dueTodayCollectionAmount,
  overdueCollectionCount,
  overdueCollectionAmount,
  offerWaitingRenewalCount,
  reconciliationPreviewMetrics,
  dashboardData,
  dashboardComparison,
  dashboardMeta,
  dashboardAccessScope,
  dashboardAccessReason,
  dashboardCards,
  dashboardBranchLabel,
  previousDashboardCards,
  commissionTrend,
  policyStatusRows,
  topCompanies,
  dashboardLoadingRaw,
  followUpLoading,
  myTasksLoading,
  myActivitiesLoading,
  myRemindersLoading,
  dashboardLoading,
  dashboardPermissionError,
  readyOfferCount,
  activeDashboardTab,
  isDailyTab,
  isSalesTab,
  isCollectionsTab,
  isRenewalsTab,
  showNewLeadAction,
  showRenewalAlertsTopRow,
  showAnalyticsRow,
  showPoliciesOffersRow,
  triggerDashboardReload,
  reloadData,
} = useDashboardResources({
  route,
  selectedRange,
  normalizeDashboardTab,
});

const dashboardScopeMessage = computed(() => {
  if (dashboardLoadingRaw.value || dashboardPermissionError.value) return "";
  if (dashboardAccessScope.value !== "empty") return "";
  if (dashboardAccessReason.value === "agent_unassigned") return t("dashboardScopeNoAssignments");
  return t("dashboardScopeRestrictedEmpty");
});
const dashboardAccessMessage = computed(() => {
  if (dashboardPermissionError.value) return t("dashboardPermissionDenied");
  return dashboardScopeMessage.value;
});
const dashboardAccessMessageKind = computed(() => (dashboardPermissionError.value ? "permission" : "scope"));
const dashboardComparisonTrendHint = computed(() => {
  const mode = String(dashboardComparison.value?.mode || "").toLowerCase();
  if (mode === "previous_period") return t("trendAgainstPreviousPeriod");
  if (mode === "previous_month") return t("trendAgainstPreviousMonth");
  if (mode === "previous_year") return t("trendAgainstPreviousYear");
  if (mode === "custom") return t("trendAgainstCustomPeriod");
  return t("trendAgainstPrevious");
});

const {
  setDashboardTab,
  openPage,
  openPreviewList,
  openLeadItem,
  openOfferItem,
  openConvertedPolicyItem,
  openPolicyItem,
  openRenewalTaskItem,
  openPaymentItem,
  openReconciliationItem,
  openTaskItem,
  openActivityItem,
  openClaimItem,
  openReminderItem,
  openFollowUpItem,
  openSalesActionItem,
  openCollectionRiskItem,
} = useDashboardNavigation({ router, route, normalizeDashboardTab });

const {
  previewPageCount,
  previewResolvedPage,
  pagedPreviewItems,
  setPreviewPage,
  shouldShowViewAll,
} = useDashboardPreviewPager({
  pageSize: DASHBOARD_PREVIEW_PAGE_SIZE,
  fetchLimit: DASHBOARD_PREVIEW_FETCH_LIMIT,
});

const dashboardTabs = computed(() => [
  { key: "daily", label: t("tabDaily") },
  { key: "sales", label: t("tabSales") },
  { key: "collections", label: t("tabCollections") },
  { key: "renewals", label: t("tabRenewals") },
]);

const dashboardHeroTitle = computed(() => {
  if (isDailyTab.value) return t("heroTitleDaily");
  if (isSalesTab.value) return t("heroTitleSales");
  if (isCollectionsTab.value) return t("heroTitleCollections");
  if (isRenewalsTab.value) return t("heroTitleRenewals");
  return t("heroTitleDaily");
});

const dashboardHeroSubtitle = computed(() => {
  if (isDailyTab.value) return t("heroSubtitleDaily");
  if (isSalesTab.value) return t("heroSubtitleSales");
  if (isCollectionsTab.value) return t("heroSubtitleCollections");
  if (isRenewalsTab.value) return t("heroSubtitleRenewals");
  return t("heroSubtitleDaily");
});

const renewalAlertItems = computed(() =>
  activeRenewalTasks.value
    .slice()
    .sort((a, b) => new Date(a.due_date || a.renewal_date || 0).getTime() - new Date(b.due_date || b.renewal_date || 0).getTime())
);
const displayRenewalAlertItems = computed(() => renewalAlertItems.value);
const displayRenewalTasks = computed(() => activeRenewalTasks.value);
const displayRecentLeads = computed(() => leads.value);
const displayTopCompanies = computed(() => topCompanies.value);
const displayRecentPolicies = computed(() => recentPolicies.value);
const displayRecentOffers = computed(() => recentOffers.value);
const prioritizedFollowUpItems = computed(() =>
  followUpItems.value
    .slice()
    .sort((left, right) => Number(left?.days_delta ?? 999) - Number(right?.days_delta ?? 999))
);
const priorityTaskItems = computed(() =>
  myTaskItems.value
    .filter((task) => !["Done", "Completed", "Cancelled"].includes(String(task?.status || "")))
    .slice()
    .sort((left, right) => compareDueDateAsc(left?.due_date, right?.due_date))
);
const salesPipelineOffers = computed(() =>
  displayRecentOffers.value.filter((offer) => {
    const status = String(offer?.status || "");
    return !offer?.converted_policy && ["Draft", "Sent", "Accepted"].includes(status);
  })
);
const convertedSalesOffers = computed(() =>
  displayRecentOffers.value.filter((offer) => Boolean(offer?.converted_policy) || String(offer?.status || "") === "Converted")
);
const salesCandidateTaskActions = computed(() =>
  myTaskItems.value
    .filter((task) => isSalesActionSource(task?.source_doctype))
    .map((task) => ({ ...task, kind: "task", action_date: task?.due_date || null }))
);
const salesCandidateReminderActions = computed(() =>
  myReminderItems.value
    .filter((reminder) => isSalesActionSource(reminder?.source_doctype))
    .map((reminder) => ({ ...reminder, kind: "reminder", action_date: reminder?.remind_at || null }))
);
const salesCandidateActions = computed(() =>
  [...salesCandidateTaskActions.value, ...salesCandidateReminderActions.value]
    .slice()
    .sort((left, right) => compareDueDateAsc(left?.action_date, right?.action_date))
);
const recentActivityItems = computed(() =>
  myActivityItems.value
    .slice()
    .sort((left, right) => compareDateDesc(left?.activity_at || left?.modified || left?.creation, right?.activity_at || right?.modified || right?.creation))
);
const renewalLinkedPolicies = computed(() => {
  const linkedKeys = new Set(
    activeRenewalTasks.value
      .map((task) => normalizeLookupValue(task?.policy))
      .filter(Boolean)
  );

  if (!linkedKeys.size) return [];

  return displayRecentPolicies.value.filter((policy) => {
    const policyName = normalizeLookupValue(policy?.name);
    const policyNumber = normalizeLookupValue(policy?.policy_no);
    return linkedKeys.has(policyName) || linkedKeys.has(policyNumber);
  });
});
const displayReadyOfferCount = computed(
  () => readyOfferCount.value
);
const acceptedOfferCount = computed(() => Number(dashboardTabMetrics.value?.accepted_offer_count || 0));
const convertedOfferCount = computed(() => Number(dashboardTabMetrics.value?.converted_offer_count || 0));
const reconciliationPreviewOpenDifference = computed(() => {
  if (dashboardTabMetrics.value?.reconciliation_open_difference_try != null) {
    return Number(dashboardTabMetrics.value.reconciliation_open_difference_try || 0);
  }
  return reconciliationPreviewRows.value.reduce((sum, row) => sum + Number(row?.difference_try || 0), 0);
});
const dailyActionOffers = computed(() =>
  (dashboardTabPreviews.value.action_offers || recentOffers.value)
    .filter((offer) => ["Sent", "Accepted"].includes(String(offer?.status || "")) && !offer.converted_policy)
);

const renewalBucketCounts = computed(() => dashboardStore.renewalBucketCounts || { overdue: 0, due7: 0, due30: 0 });
const followUpPayload = computed(() => unref(followUpResource.data) || {});
const followUpSummary = computed(() => followUpPayload.value.summary || { total: 0, overdue: 0, due_today: 0, due_soon: 0 });
const followUpItems = computed(() => (Array.isArray(followUpPayload.value.items) ? followUpPayload.value.items : []));
const myTasksPayload = computed(() => unref(myTasksResource.data) || {});
const myTaskSummary = computed(() => myTasksPayload.value.summary || { total: 0, overdue: 0, due_today: 0, due_soon: 0 });
const myTaskItems = computed(() => (Array.isArray(myTasksPayload.value.items) ? myTasksPayload.value.items : []));
const myActivitiesPayload = computed(() => unref(myActivitiesResource.data) || {});
const myActivitySummary = computed(() => myActivitiesPayload.value.summary || { total: 0, logged: 0, shared: 0, archived: 0 });
const myActivityItems = computed(() => (Array.isArray(myActivitiesPayload.value.items) ? myActivitiesPayload.value.items : []));
const myRemindersPayload = computed(() => unref(myRemindersResource.data) || {});
const myReminderSummary = computed(() => myRemindersPayload.value.summary || { total: 0, overdue: 0, due_today: 0, due_soon: 0 });
const myReminderItems = computed(() => (Array.isArray(myRemindersPayload.value.items) ? myRemindersPayload.value.items : []));

const visibleRange = computed(() => {
  const range = getDateRange(selectedRange.value);
  return `${formatDate(range.from)} - ${formatDate(range.to)}`;
});

const quickStatCards = computed(() => [
  buildQuickStatCard({
    key: "quick-policy",
    title: t("kpiPolicy"),
    value: formatNumber(dashboardCards.value.total_policies),
    current: dashboardCards.value.total_policies,
    previous: previousDashboardCards.value.total_policies,
    icon: "shield",
  }),
  buildQuickStatCard({
    key: "quick-gwp",
    title: t("kpiGwp"),
    value: formatCurrency(dashboardCards.value.total_gwp_try),
    current: dashboardCards.value.total_gwp_try,
    previous: previousDashboardCards.value.total_gwp_try,
    icon: "bar-chart-2",
  }),
  buildQuickStatCard({
    key: "quick-commission",
    title: t("kpiCommission"),
    value: formatCurrency(dashboardCards.value.total_commission),
    current: dashboardCards.value.total_commission,
    previous: previousDashboardCards.value.total_commission,
    icon: "percent",
  }),
  buildQuickStatCard({
    key: "quick-renewal",
    title: t("kpiRenewal"),
    value: formatNumber(dashboardCards.value.pending_renewals),
    current: dashboardCards.value.pending_renewals,
    previous: previousDashboardCards.value.pending_renewals,
    icon: "alert-triangle",
    reverseTrend: true,
  }),
]);

function buildStaticQuickStatCard({ key, title, value, icon, hint = t("todaySnapshot") }) {
  return {
    key,
    title,
    value,
    trendText: "",
    trendClass: "text-slate-500",
    trendHint: hint,
    icon,
  };
}

const collectionQuickStatCards = computed(() => [
  buildStaticQuickStatCard({
    key: "quick-collect-due-today-count",
    title: t("kpiCollectionDueTodayCount"),
    value: formatNumber(dueTodayCollectionCount.value),
    icon: "calendar-days",
  }),
  buildStaticQuickStatCard({
    key: "quick-collect-due-today-amount",
    title: t("kpiCollectionDueTodayAmount"),
    value: formatCurrency(dueTodayCollectionAmount.value),
    icon: "banknote",
  }),
  buildStaticQuickStatCard({
    key: "quick-collect-overdue-count",
    title: t("kpiCollectionOverdueCount"),
    value: formatNumber(overdueCollectionCount.value),
    icon: "alert-triangle",
  }),
  buildStaticQuickStatCard({
    key: "quick-collect-overdue-amount",
    title: t("kpiCollectionOverdueAmount"),
    value: formatCurrency(overdueCollectionAmount.value),
    icon: "wallet",
  }),
]);

const renewalQuickStatCards = computed(() => [
  quickStatCards.value.find((card) => card.key === "quick-renewal"),
  buildStaticQuickStatCard({
    key: "quick-renewal-offer-waiting",
    title: t("kpiRenewalOfferWaiting"),
    value: formatNumber(offerWaitingRenewalCount.value),
    icon: "file-clock",
  }),
  buildStaticQuickStatCard({
    key: "quick-renewal-overdue",
    title: t("kpiRenewalOverdue"),
    value: formatNumber(renewalBucketCounts.value.overdue),
    icon: "alert-octagon",
  }),
  buildStaticQuickStatCard({
    key: "quick-renewal-due7",
    title: t("kpiRenewalDue7"),
    value: formatNumber(renewalBucketCounts.value.due7),
    icon: "clock",
  }),
].filter(Boolean));

const operationsQuickStatCards = computed(() => [
  buildStaticQuickStatCard({
    key: "quick-follow-up-overdue",
    title: t("kpiFollowUpOverdue"),
    value: formatNumber(followUpSummary.value.overdue),
    icon: "alert-triangle",
  }),
  buildStaticQuickStatCard({
    key: "quick-follow-up-today",
    title: t("kpiFollowUpToday"),
    value: formatNumber(followUpSummary.value.due_today),
    icon: "calendar-days",
  }),
  buildStaticQuickStatCard({
    key: "quick-task-overdue",
    title: t("kpiTaskOverdue"),
    value: formatNumber(myTaskSummary.value.overdue),
    icon: "briefcase",
  }),
  buildStaticQuickStatCard({
    key: "quick-task-today",
    title: t("kpiTaskToday"),
    value: formatNumber(myTaskSummary.value.due_today),
    icon: "list-todo",
  }),
]);

const salesQuickStatCards = computed(() => [
  buildStaticQuickStatCard({
    key: "quick-sales-ready-offers",
    title: t("kpiReadyOffers"),
    value: formatNumber(readyOfferCount.value),
    icon: "send",
  }),
  buildStaticQuickStatCard({
    key: "quick-sales-accepted-offers",
    title: t("kpiAcceptedOffers"),
    value: formatNumber(acceptedOfferCount.value),
    icon: "badge-check",
  }),
  buildStaticQuickStatCard({
    key: "quick-sales-converted-offers",
    title: t("kpiConvertedOffers"),
    value: formatNumber(convertedOfferCount.value),
    icon: "repeat",
  }),
  buildQuickStatCard({
    key: "quick-sales-gwp",
    title: t("kpiGwp"),
    value: formatCurrency(dashboardCards.value.total_gwp_try),
    current: dashboardCards.value.total_gwp_try,
    previous: previousDashboardCards.value.total_gwp_try,
    icon: "bar-chart-2",
  }),
]);

const visibleQuickStatCards = computed(() => {
  if (isCollectionsTab.value) return collectionQuickStatCards.value;
  if (isRenewalsTab.value) return renewalQuickStatCards.value;
  if (isDailyTab.value) return operationsQuickStatCards.value;
  if (isSalesTab.value) return salesQuickStatCards.value;
  return quickStatCards.value;
});

const leadStatusSummary = computed(() => {
  const source = dashboardTabSeries.value.lead_status || dashboardData.value.lead_status || [];
  const map = {};
  for (const row of source) {
    map[row.status] = Number(row.total || 0);
  }

  const total = Object.values(map).reduce((sum, value) => sum + value, 0) || 1;

  return [
    { key: "Draft", label: t("draft"), value: map.Draft || 0, colorClass: "bg-amber-500" },
    { key: "Open", label: t("open"), value: map.Open || 0, colorClass: "bg-sky-500" },
    { key: "Replied", label: t("replied"), value: map.Replied || 0, colorClass: "bg-emerald-500" },
    { key: "Closed", label: t("closed"), value: map.Closed || 0, colorClass: "bg-slate-500" },
  ].map((entry) => ({
    ...entry,
    ratio: entry.value ? Math.max(6, Math.round((entry.value / total) * 100)) : 0,
  }));
});

const salesOfferStatusSummary = computed(() => {
  const rows = Array.isArray(dashboardTabSeries.value?.offer_status) ? dashboardTabSeries.value.offer_status : [];
  const totalsByStatus = {};
  for (const row of rows) {
    totalsByStatus[String(row?.status || "")] = Number(row?.total || 0);
  }
  const total = Object.values(totalsByStatus).reduce((sum, value) => sum + Number(value || 0), 0) || 1;
  const colorMap = {
    Draft: "bg-amber-500",
    Sent: "bg-sky-500",
    Accepted: "bg-emerald-500",
    Rejected: "bg-amber-500",
    Converted: "bg-indigo-500",
  };
  const labelMap = {
    Draft: t("draft"),
    Sent: t("statusSent"),
    Accepted: t("statusAccepted"),
    Rejected: t("statusRejected"),
    Converted: t("converted"),
  };
  const order = ["Draft", "Sent", "Accepted", "Converted", "Rejected"];
  return order
    .map((status) => ({
      key: status,
      label: labelMap[status] || status,
      value: Number(totalsByStatus[status] || 0),
      colorClass: colorMap[status] || "bg-slate-400",
    }))
    .filter((row) => row.value > 0)
    .map((row) => ({
      ...row,
      ratio: row.value ? Math.max(6, Math.round((row.value / total) * 100)) : 0,
    }));
});

const policyStatusSummary = computed(() => {
  const map = {};
  for (const row of policyStatusRows.value) {
    map[row.status] = {
      total: Number(row.total || 0),
      gwp: Number(row.total_gwp_try || 0),
    };
  }

  const total = Object.values(map).reduce((sum, item) => sum + item.total, 0) || 1;

  return [
    {
      key: "Active",
      label: t("statusActive"),
      value: map.Active?.total || 0,
      gwp: map.Active?.gwp || 0,
      colorClass: "bg-emerald-500",
    },
    {
      key: "KYT",
      label: t("statusKyt"),
      value: map.KYT?.total || 0,
      gwp: map.KYT?.gwp || 0,
      colorClass: "bg-sky-500",
    },
    {
      key: "IPT",
      label: t("statusIpt"),
      value: map.IPT?.total || 0,
      gwp: map.IPT?.gwp || 0,
      colorClass: "bg-amber-400",
    },
  ].map((entry) => ({
    ...entry,
    ratio: entry.value ? Math.max(6, Math.round((entry.value / total) * 100)) : 0,
  }));
});

const maxTrendValue = computed(() => {
  const values = commissionTrend.value.map((entry) => Number(entry.total_commission || 0));
  return Math.max(1, ...values);
});

function trendPercent(currentValue, previousValue) {
  const current = Number(currentValue || 0);
  const previous = Number(previousValue || 0);
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

const renewalStatusSummary = computed(() => {
  const serverRows = Array.isArray(dashboardTabSeries.value?.renewal_status) ? dashboardTabSeries.value.renewal_status : null;
  if (serverRows) {
    const counts = {
      Open: 0,
      "In Progress": 0,
      Done: 0,
      Cancelled: 0,
    };
    for (const row of serverRows) {
      const rawKey = String(row?.status || "");
      const key = rawKey === "Completed" ? "Done" : rawKey;
      if (key in counts) counts[key] = Number(row?.total || 0);
    }
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1;
    return [
      { key: "Open", label: t("open"), value: counts.Open, colorClass: "bg-amber-500" },
      { key: "In Progress", label: t("statusInProgress"), value: counts["In Progress"], colorClass: "bg-sky-500" },
      { key: "Done", label: t("statusCompleted"), value: counts.Done, colorClass: "bg-emerald-500" },
      { key: "Cancelled", label: t("statusCancelled"), value: counts.Cancelled, colorClass: "bg-slate-400" },
    ]
      .filter((row) => row.value > 0 || isRenewalsTab.value)
      .map((row) => ({
        ...row,
        ratio: row.value ? Math.max(6, Math.round((row.value / total) * 100)) : 0,
      }));
  }
  const counts = {
    Open: 0,
    "In Progress": 0,
    Done: 0,
    Cancelled: 0,
  };
  for (const task of renewalTasks.value) {
    const rawStatus = String(task?.status || "");
    const status = rawStatus === "Completed" ? "Done" : rawStatus;
    if (status in counts) counts[status] += 1;
  }
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1;
  return [
    { key: "Open", label: t("open"), value: counts.Open, colorClass: "bg-amber-500" },
    { key: "In Progress", label: t("statusInProgress"), value: counts["In Progress"], colorClass: "bg-sky-500" },
    { key: "Done", label: t("statusCompleted"), value: counts.Done, colorClass: "bg-emerald-500" },
    { key: "Cancelled", label: t("statusCancelled"), value: counts.Cancelled, colorClass: "bg-slate-400" },
  ]
    .filter((row) => row.value > 0 || isRenewalsTab.value)
    .map((row) => ({
      ...row,
      ratio: row.value ? Math.max(6, Math.round((row.value / total) * 100)) : 0,
    }));
});

const collectionPaymentStatusSummary = computed(() => {
  const rows = Array.isArray(dashboardTabSeries.value?.payment_status) ? dashboardTabSeries.value.payment_status : [];
  const totalsByStatus = {};
  for (const row of rows) {
    totalsByStatus[String(row?.status || "")] = Number(row?.total || 0);
  }
  const total = Object.values(totalsByStatus).reduce((sum, value) => sum + Number(value || 0), 0) || 1;
  const order = ["Draft", "Paid", "Cancelled"];
  const colorMap = {
    Draft: "bg-amber-500",
    Paid: "bg-emerald-500",
    Cancelled: "bg-slate-400",
  };
  return order
    .map((status) => ({
      key: status,
      label: paymentStatusLabel(status),
      value: Number(totalsByStatus[status] || 0),
      colorClass: colorMap[status] || "bg-slate-400",
    }))
    .filter((row) => row.value > 0)
    .map((row) => ({
      ...row,
      ratio: row.value ? Math.max(6, Math.round((row.value / total) * 100)) : 0,
    }));
});

const collectionPaymentDirectionSummary = computed(() => {
  const rows = Array.isArray(dashboardTabSeries.value?.payment_direction) ? dashboardTabSeries.value.payment_direction : [];
  const map = {};
  for (const row of rows) {
    const key = String(row?.payment_direction || "");
    map[key] = {
      total: Number(row?.total || 0),
      paidAmount: Number(row?.paid_amount_try || 0),
    };
  }
  const totalRows = Object.values(map).reduce((sum, item) => sum + Number(item?.total || 0), 0) || 1;
  const order = ["Inbound", "Outbound"];
  const colorMap = {
    Inbound: "bg-sky-500",
    Outbound: "bg-fuchsia-500",
  };
  return order
    .map((direction) => ({
      key: direction,
      label: paymentDirectionLabel(direction),
      value: Number(map[direction]?.total || 0),
      paidAmount: Number(map[direction]?.paidAmount || 0),
      colorClass: colorMap[direction] || "bg-slate-400",
    }))
    .filter((row) => row.value > 0)
    .map((row) => ({
      ...row,
      ratio: row.value ? Math.max(6, Math.round((row.value / totalRows) * 100)) : 0,
    }));
});

const collectionRiskRows = computed(() => {
  const grouped = new Map();
  const pushPayment = (payment, bucket) => {
    const customer = cstr(payment?.customer);
    const policy = cstr(payment?.policy);
    const key = `${customer}::${policy}`;
    const current = grouped.get(key) || {
      key,
      customer,
      policy,
      overdueCount: 0,
      dueTodayCount: 0,
      overdueAmount: 0,
    };
    if (bucket === "overdue") {
      current.overdueCount += 1;
      current.overdueAmount += Number(payment?.amount_try || 0);
    } else {
      current.dueTodayCount += 1;
    }
    grouped.set(key, current);
  };

  for (const payment of overdueCollectionPayments.value) pushPayment(payment, "overdue");
  for (const payment of dueTodayCollectionPayments.value) pushPayment(payment, "due_today");

  return Array.from(grouped.values())
    .map((row) => {
      const score = row.overdueCount * 3 + row.dueTodayCount + Math.min(4, Math.ceil(row.overdueAmount / 5000));
      return {
        ...row,
        score,
        title: row.policy || row.customer || "-",
        description: `${riskLevelLabel(score)} · ${row.customer || row.policy || "-"}`,
      };
    })
    .filter((row) => row.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.overdueAmount !== left.overdueAmount) return right.overdueAmount - left.overdueAmount;
      return right.overdueCount - left.overdueCount;
    });
});

const renewalRetentionRate = computed(() => Number(dashboardTabSeries.value?.renewal_retention?.rate || 0));

const renewalOutcomeSummary = computed(() => {
  const retention = dashboardTabSeries.value?.renewal_retention || {};
  const rows = [
    {
      key: "renewed",
      label: t("outcomeRenewed"),
      value: Number(retention?.renewed || 0),
      colorClass: "bg-emerald-500",
    },
    {
      key: "lost",
      label: t("outcomeLost"),
      value: Number(retention?.lost || 0),
      colorClass: "bg-amber-500",
    },
    {
      key: "cancelled",
      label: t("outcomeCancelled"),
      value: Number(retention?.cancelled || 0),
      colorClass: "bg-slate-400",
    },
  ].filter((row) => row.value > 0);
  const total = rows.reduce((sum, row) => sum + row.value, 0) || 1;
  return rows.map((row) => ({
    ...row,
    ratio: row.value ? Math.max(6, Math.round((row.value / total) * 100)) : 0,
  }));
});

const quickActions = computed(() => [
  {
    key: "offers",
    label: t("quickOffer"),
    description: t("quickOfferDesc"),
    to: "/offers",
  },
  {
    key: "policies",
    label: t("quickPolicy"),
    description: t("quickPolicyDesc"),
    to: "/policies",
  },
  {
    key: "claims",
    label: t("quickClaim"),
    description: t("quickClaimDesc"),
    to: "/claims",
  },
  {
    key: "payments",
    label: t("quickPayment"),
    description: t("quickPaymentDesc"),
    to: "/payments",
  },
  {
    key: "renewals",
    label: t("quickRenewal"),
    description: t("quickRenewalDesc"),
    to: "/renewals",
  },
  {
    key: "communication",
    label: t("quickCommunication"),
    description: t("quickCommunicationDesc"),
    to: "/communication",
  },
  {
    key: "reconciliation",
    label: t("quickReconciliation"),
    description: t("quickReconciliationDesc"),
    to: "/reconciliation",
  },
]);

const visibleQuickActions = computed(() => {
  const actionMap = new Map(quickActions.value.map((action) => [action.key, action]));
  const pick = (keys) => keys.map((key) => actionMap.get(key)).filter(Boolean);
  if (isSalesTab.value) return pick(["offers", "policies", "communication"]);
  if (isCollectionsTab.value) return pick(["payments", "reconciliation", "communication"]);
  if (isRenewalsTab.value) return pick(["renewals", "offers", "policies", "communication"]);
  if (isDailyTab.value) return pick(["offers", "renewals", "claims", "payments", "communication"]);
  return pick(["offers", "renewals", "claims", "payments", "communication"]);
});

function buildQuickStatCard({ key, title, value, current, previous, icon, reverseTrend = false, trendHint }) {
  const trend = buildTrend(current, previous, reverseTrend);
  return {
    key,
    title,
    value,
    trendText: trend.text,
    trendClass: trend.className,
    trendHint: trendHint || dashboardComparisonTrendHint.value,
    icon,
  };
}

function buildTrend(currentValue, previousValue, reverseTrend = false) {
  const current = Number(currentValue || 0);
  const previous = Number(previousValue || 0);
  if (!previous && !current) {
    return { text: "0%", className: "text-slate-500" };
  }
  if (!previous && current) {
    return {
      text: "+100%",
      className: reverseTrend ? "text-amber-700" : "text-emerald-600",
    };
  }

  const rawPercent = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(rawPercent * 10) / 10;
  const positive = reverseTrend ? rounded <= 0 : rounded >= 0;
  const sign = rounded > 0 ? "+" : "";
  return {
    text: `${sign}${new Intl.NumberFormat(localeCode.value, { maximumFractionDigits: 1 }).format(rounded)}%`,
    className: positive ? "text-emerald-600" : "text-amber-700",
  };
}

function formatDate(dateValue) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthKey(monthKey) {
  if (!monthKey) return "-";
  const [year, month] = monthKey.split("-");
  if (!year || !month) return monthKey;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat(localeCode.value, { month: "short", year: "2-digit" }).format(date);
}

function formatNumber(value) {
  return new Intl.NumberFormat(localeCode.value).format(Number(value || 0));
}

function formatCurrency(value) {
  return formatCurrencyBy(value, "TRY");
}

function formatCurrencyBy(value, currency) {
  return new Intl.NumberFormat(localeCode.value, {
    style: "currency",
    currency: currency || "TRY",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function topCompanyFacts(company) {
  return [
    {
      key: "policyCount",
      label: t("policyCount"),
      value: formatNumber(company?.policy_count),
      valueClass: "text-xs text-slate-500",
    },
    {
      key: "grossProduction",
      label: t("grossProduction"),
      value: formatCurrency(company?.total_gwp_try),
      valueClass: "text-xs text-slate-500",
    },
  ];
}

function renewalTaskFacts(task) {
  return [
    {
      key: "dueDate",
      label: t("dueDate"),
      value: formatDate(task?.due_date),
      valueClass: "text-xs text-slate-500",
    },
  ];
}

function renewalTaskFactsDetailed(task) {
  return [
    {
      key: "dueDate",
      label: t("dueDate"),
      value: formatDate(task?.due_date),
      valueClass: "text-xs text-slate-500",
    },
    {
      key: "renewalDate",
      label: t("renewalDate"),
      value: formatDate(task?.renewal_date),
      valueClass: "text-xs text-slate-500",
    },
  ];
}

function renewalAlertFacts(task) {
  return [
    { label: t("dueDate"), value: formatDate(task.due_date) },
    { label: t("renewalDate"), value: formatDate(task.renewal_date) },
  ];
}

function dashboardPaymentFacts(payment) {
  return [
    {
      key: "dueDate",
      label: t("dueDate"),
      value: formatDate(payment?.due_date || payment?.payment_date),
      valueClass: "text-xs text-slate-500",
    },
    {
      key: "customer",
      label: t("customer"),
      value: payment?.customer || "-",
      valueClass: "text-xs text-slate-500",
    },
    {
      key: "policy",
      label: t("policyLabel"),
      value: payment?.policy || "-",
      valueClass: "text-xs text-slate-500",
    },
  ];
}

function dashboardReconciliationFacts(row) {
  return [
    {
      key: "type",
      label: t("reconciliationType"),
      value: row?.mismatch_type || "-",
      valueClass: "text-xs text-slate-500",
    },
    {
      key: "difference",
      label: t("difference"),
      value: formatCurrency(row?.difference_try || 0),
      valueClass: "text-xs text-slate-500",
    },
  ];
}

function followUpTitle(item) {
  return item?.source_name || "-";
}

function followUpDescription(item) {
  const delta = Number(item?.days_delta ?? 0);
  if (delta < 0) return `${t("followUpDeltaOverdue")} ${Math.abs(delta)} ${t("followUpDeltaDays")}`;
  if (delta === 0) return t("followUpDeltaToday");
  return `${delta} ${t("followUpDeltaDays")}`;
}

function followUpFacts(item) {
  return [
    { label: t("customer"), value: item?.customer || "-" },
    { label: t("status"), value: item?.status || "-" },
    { label: t("followUpDate"), value: formatDate(item?.follow_up_on) },
    ...(item?.assigned_to ? [{ label: t("followUpAssignee"), value: item.assigned_to }] : []),
  ];
}

function taskFacts(task) {
  return [
    { label: t("taskType"), value: task?.task_type || "-" },
    { label: t("taskAssignee"), value: task?.assigned_to || "-" },
    { label: t("dueDate"), value: formatDate(task?.due_date) },
  ];
}

function activityFacts(activity) {
  return [
    { label: t("activityType"), value: activity?.activity_type || "-" },
    { label: t("taskAssignee"), value: activity?.assigned_to || "-" },
    { label: t("activityAt"), value: formatDate(activity?.activity_at) },
  ];
}

function claimFacts(claim) {
  return [
    { label: t("customer"), value: claim?.customer || "-" },
    { label: t("policyLabel"), value: claim?.policy || "-" },
    { label: t("status"), value: claim?.claim_status || "-" },
  ];
}

function reminderFacts(reminder) {
  return [
    { label: t("customer"), value: reminder?.customer || "-" },
    { label: t("policyLabel"), value: reminder?.policy || "-" },
    { label: t("claimLabel"), value: reminder?.claim || "-" },
    { label: t("taskAssignee"), value: reminder?.assigned_to || "-" },
    { label: t("date"), value: formatDate(reminder?.remind_at) },
  ].filter((item) => item.value && item.value !== "-");
}

function salesActionFacts(action) {
  const actionDateLabel = action?.kind === "reminder" ? t("date") : t("dueDate");
  return [
    { label: t("taskType"), value: action?.kind === "reminder" ? t("salesActionReminder") : (action?.task_type || t("salesActionTask")) },
    { label: t("source"), value: salesActionSourceLabel(action?.source_doctype) },
    { label: actionDateLabel, value: formatDate(action?.action_date) },
  ].filter((item) => item.value && item.value !== "-");
}

function salesActionTitle(action) {
  return action?.task_title || action?.reminder_title || action?.source_name || action?.name || "-";
}

function salesActionDescription(action) {
  const actionType = action?.kind === "reminder" ? t("salesActionReminder") : t("salesActionTask");
  const sourceLabel = salesActionSourceLabel(action?.source_doctype);
  const sourceName = action?.source_name || "-";
  return `${actionType} · ${sourceLabel} · ${sourceName}`;
}

function salesActionSourceLabel(sourceDoctype) {
  const source = cstr(sourceDoctype);
  if (source === "AT Lead") return t("salesActionLead");
  if (source === "AT Offer") return t("salesActionOffer");
  return sourceDoctype || "-";
}

function paymentStatusLabel(status) {
  const normalized = cstr(status);
  if (normalized === "Draft") return t("draft");
  if (normalized === "Paid") return t("statusPaid");
  if (normalized === "Cancelled") return t("statusCancelled");
  if (normalized === "Open") return t("open");
  return normalized || "-";
}

function paymentDirectionLabel(direction) {
  const normalized = cstr(direction);
  if (normalized === "Inbound") return t("paymentDirectionInbound");
  if (normalized === "Outbound") return t("paymentDirectionOutbound");
  return normalized || "-";
}

function riskLevelLabel(score) {
  const numericScore = Number(score || 0);
  if (numericScore >= 6) return t("riskLevelHigh");
  if (numericScore >= 3) return t("riskLevelMedium");
  return t("riskLevelLow");
}

function collectionRiskFacts(row) {
  return [
    { label: t("riskScore"), value: formatNumber(row?.score || 0) },
    { label: t("overdueCount"), value: formatNumber(row?.overdueCount || 0) },
    { label: t("dueTodayCount"), value: formatNumber(row?.dueTodayCount || 0) },
    { label: t("riskOverdueAmount"), value: formatCurrency(row?.overdueAmount || 0) },
  ];
}

function isSalesActionSource(sourceDoctype) {
  const source = cstr(sourceDoctype);
  return source === "AT Lead" || source === "AT Offer";
}

function openSalesActionList() {
  if (salesCandidateTaskActions.value.length >= salesCandidateReminderActions.value.length) {
    openPreviewList("tasks");
    return;
  }
  openPreviewList("reminders");
}

function canCompleteReminder(reminder) {
  return cstr(reminder?.status) === "Open";
}

function canCancelReminder(reminder) {
  return cstr(reminder?.status) === "Open";
}

async function updateReminderStatus(reminder, nextStatus) {
  if (!reminder?.name || !nextStatus) return;
  await myTaskMutationResource.submit({
    doctype: "AT Reminder",
    name: reminder.name,
    data: { status: nextStatus },
  });
  triggerDashboardReload({ immediate: true });
}

async function completeReminder(reminder) {
  await updateReminderStatus(reminder, "Done");
}

async function cancelReminder(reminder) {
  await updateReminderStatus(reminder, "Cancelled");
}

function canStartTask(task) {
  return cstr(task?.status) === "Open";
}

function canBlockTask(task) {
  return ["Open", "In Progress"].includes(cstr(task?.status));
}

function canCompleteTask(task) {
  return ["Open", "In Progress", "Blocked"].includes(cstr(task?.status));
}

function canCancelTask(task) {
  return ["Open", "In Progress", "Blocked"].includes(cstr(task?.status));
}

async function updateTaskStatus(task, nextStatus) {
  if (!task?.name || !nextStatus) return;
  await myTaskMutationResource.submit({
    doctype: "AT Task",
    name: task.name,
    data: { status: nextStatus },
  });
  triggerDashboardReload({ immediate: true });
}

async function startTask(task) {
  await updateTaskStatus(task, "In Progress");
}

async function blockTask(task) {
  await updateTaskStatus(task, "Blocked");
}

async function completeTask(task) {
  await updateTaskStatus(task, "Done");
}

async function cancelTask(task) {
  await updateTaskStatus(task, "Cancelled");
}

function recentLeadFacts(lead) {
  return [
    { label: t("email"), value: lead.email || "-" },
    {
      label: t("estPremium"),
      value: formatCurrency(lead.estimated_gross_premium || 0),
    },
  ];
}

function recentPolicyFacts(policy) {
  return [
    {
      key: "customer",
      label: t("customer"),
      value: policy?.customer || "-",
      valueClass: "text-xs text-slate-500",
    },
    {
      key: "issueDate",
      label: t("issueDate"),
      value: policy?.issue_date || "-",
      valueClass: "text-xs text-slate-500",
    },
  ];
}

function recentOfferFacts(offer) {
  return [
    {
      key: "customer",
      label: t("customer"),
      value: offer?.customer || "-",
      valueClass: "text-xs text-slate-500",
    },
    {
      key: "validUntil",
      label: t("validUntil"),
      value: offer?.valid_until || "-",
      valueClass: "text-xs text-slate-500",
    },
  ];
}

function formatDaysToDue(dateValue) {
  if (!dateValue) return "-";
  const days = daysUntil(dateValue);
  if (days == null) return "-";
  if (days < 0) return `+${Math.abs(days)}d`;
  return `${days}d`;
}

function daysUntil(dateValue) {
  if (!dateValue) return null;
  const due = new Date(dateValue);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function compareDueDateAsc(leftDate, rightDate) {
  const leftDays = daysUntil(leftDate);
  const rightDays = daysUntil(rightDate);
  const safeLeft = leftDays == null ? Number.POSITIVE_INFINITY : leftDays;
  const safeRight = rightDays == null ? Number.POSITIVE_INFINITY : rightDays;
  return safeLeft - safeRight;
}

function compareDateDesc(leftDate, rightDate) {
  const leftTime = new Date(leftDate || 0).getTime();
  const rightTime = new Date(rightDate || 0).getTime();
  const safeLeft = Number.isFinite(leftTime) ? leftTime : 0;
  const safeRight = Number.isFinite(rightTime) ? rightTime : 0;
  return safeRight - safeLeft;
}

function normalizeLookupValue(value) {
  return String(value || "").trim().toLowerCase();
}

function trendRatio(value) {
  const numericValue = Number(value || 0);
  if (numericValue <= 0) return 0;
  return Math.max(4, Math.round((numericValue / maxTrendValue.value) * 100));
}

function rangeLabel(days) {
  return `${days}d`;
}

function applyRange(days) {
  selectedRange.value = days;
  triggerDashboardReload();
}

function resetLeadForm() {
  leadDialogError.value = "";
  Object.keys(leadDialogFieldErrors).forEach((key) => delete leadDialogFieldErrors[key]);
  newLead.customer = "";
  newLead.queryText = "";
  newLead.customerOption = null;
  newLead.createCustomerMode = false;
  newLead.customer_type = "Individual";
  newLead.tax_id = "";
  newLead.phone = "";
  newLead.email = "";
  newLead.estimated_gross_premium = "";
  newLead.notes = "";
}

async function createLead() {
  try {
    leadDialogError.value = "";
    Object.keys(leadDialogFieldErrors).forEach((key) => delete leadDialogFieldErrors[key]);
    const selectedCustomer = String(newLead.customer || "").trim();
    const shouldCreateCustomer = !selectedCustomer && Boolean(newLead.createCustomerMode);
    const fullName = String(newLead.queryText || "").trim();
    const customerType = normalizeCustomerType(newLead.customer_type, newLead.tax_id);
    const identityNumber = normalizeIdentityNumber(newLead.tax_id);
    if (!selectedCustomer && !shouldCreateCustomer) {
      leadDialogFieldErrors.customer =
        activeLocale.value === "tr"
          ? "Bir müşteri seçin veya yeni müşteri ekleyin."
          : "Select a customer or add a new customer.";
      leadDialogError.value = activeLocale.value === "tr" ? "Müşteri alanını tamamlayın." : "Complete the customer section.";
      return;
    }
    if (shouldCreateCustomer && !fullName) {
      leadDialogFieldErrors.customer =
        activeLocale.value === "tr" ? "Yeni müşteri adı gerekli." : "New customer name is required.";
      leadDialogError.value = activeLocale.value === "tr" ? "Müşteri alanını tamamlayın." : "Complete the customer section.";
      return;
    }
    if (shouldCreateCustomer) {
      if (customerType === "Corporate") {
        if (identityNumber.length !== 10) {
          leadDialogFieldErrors.tax_id = t("validationTaxNumberLength");
          leadDialogError.value = t("validationTaxNumberLength");
          return;
        }
      } else if (identityNumber.length !== 11) {
        leadDialogFieldErrors.tax_id = t("validationTcLength");
        leadDialogError.value = t("validationTcLength");
        return;
      } else if (!isValidTckn(identityNumber)) {
        leadDialogFieldErrors.tax_id = t("validationTcInvalid");
        leadDialogError.value = t("validationTcInvalid");
        return;
      }
    }

    isSubmitting.value = true;
    await createLeadResource.submit({
      full_name: fullName || null,
      customer: selectedCustomer || null,
      customer_type: shouldCreateCustomer ? customerType : null,
      tax_id: shouldCreateCustomer ? identityNumber : null,
      phone: shouldCreateCustomer ? newLead.phone : null,
      email: shouldCreateCustomer ? newLead.email : null,
      estimated_gross_premium: Number(newLead.estimated_gross_premium || 0),
      notes: newLead.notes,
      status: "Open",
    });
    showLeadDialog.value = false;
    resetLeadForm();
    triggerDashboardReload({ immediate: true });
  } catch (error) {
    leadDialogError.value = error?.messages?.join(" ") || error?.message || t("loadError");
  } finally {
    isSubmitting.value = false;
  }
}

</script>

