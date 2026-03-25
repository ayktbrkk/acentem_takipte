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

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

    <div v-if="showAnalyticsRow" class="grid gap-4 xl:grid-cols-3">
      <SectionPanel :title="t('leadPipeline')" :show-count="false" :meta="t('liveData')">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">
          {{ t("loading") }}
        </div>
        <div v-else class="space-y-4">
          <ProgressMetricRow
            v-for="item in leadStatusSummary"
            :key="item.key"
            :label="item.label"
            :value="formatNumber(item.value)"
            :ratio="item.ratio"
            :bar-class="item.colorClass"
          />
        </div>
      </SectionPanel>

      <SectionPanel :title="t('offerStatusOverviewTitle')" :show-count="false" :meta="t('liveData')">
        <div v-if="dashboardLoading" class="text-sm text-slate-500">
          {{ t("loading") }}
        </div>
        <div v-else-if="salesOfferStatusSummary.length === 0" class="at-empty-block text-sm">
          {{ t("noOfferStatus") }}
        </div>
        <div v-else class="space-y-4">
          <ProgressMetricRow
            v-for="item in salesOfferStatusSummary"
            :key="item.key"
            :label="item.label"
            :value="formatNumber(item.value)"
            :ratio="item.ratio"
            :bar-class="item.colorClass"
          />
        </div>
      </SectionPanel>

      <SectionPanel :title="t('commissionTrend')" :show-count="false" :meta="t('lastMonths')">
        <div
          v-if="commissionTrend.length === 0"
          class="at-empty-block text-center"
        >
          {{ t("noTrendData") }}
        </div>
        <div v-else class="space-y-3">
          <TrendMetricRow
            v-for="entry in commissionTrend"
            :key="entry.month_key"
            :label="formatMonthKey(entry.month_key)"
            :value="formatCurrency(entry.total_commission)"
            :ratio="trendRatio(entry.total_commission)"
          />
        </div>
      </SectionPanel>
    </div>

    <div v-if="isDailyTab" class="grid gap-4 xl:grid-cols-3">
      <div class="space-y-4">
        <SectionPanel :title="t('followUpSlaTitle')" :count="formatNumber(prioritizedFollowUpItems.length)">
          <p class="mb-3 text-xs text-slate-500">{{ t("followUpSlaHint") }}</p>
          <div v-if="followUpLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else class="space-y-3">
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
            <ul v-if="priorityTaskItems.length > 0" class="space-y-2">
              <MetaListCard
                v-for="task in pagedPreviewItems(priorityTaskItems, 'dailyTasks')"
                :key="task.name"
                :title="task.task_title || task.name || '-'"
                :description="task.status || '-'"
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

        <SectionPanel :title="t('quickActions')" :show-count="false">
          <div class="space-y-2">
            <ActionPreviewCard
              v-for="action in visibleQuickActions"
              :key="action.key"
              :title="action.label"
              :description="action.description"
              @click="openPage(action.to)"
            />
          </div>
        </SectionPanel>
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
              :description="activity.status || '-'"
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

    <div v-if="isCollectionsTab" class="grid gap-4 xl:grid-cols-3">
      <div class="space-y-4 xl:col-span-2">
        <SectionPanel :title="t('todayCollectionsTitle')" :count="formatNumber(dueTodayCollectionPayments.length)" panel-class="surface-card rounded-2xl p-5">
          <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="dueTodayCollectionPayments.length === 0" class="at-empty-block">{{ t("noTodayCollections") }}</div>
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

        <SectionPanel :title="t('overdueCollectionsTitle')" :count="formatNumber(overdueCollectionPayments.length)" panel-class="surface-card rounded-2xl p-5">
          <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="overdueCollectionPayments.length === 0" class="at-empty-block">{{ t("noOverdueCollections") }}</div>
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

      <div class="space-y-4">
        <SectionPanel :title="t('collectionsPerformanceTitle')" :show-count="false">
          <p class="mb-3 text-xs text-slate-500">{{ t("collectionsPerformanceHint") }}</p>
          <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div
            v-else-if="collectionPaymentStatusSummary.length === 0 && collectionPaymentDirectionSummary.length === 0"
            class="at-empty-block"
          >
            {{ t("noCollectionPerformance") }}
          </div>
          <div v-else class="space-y-4">
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
        </SectionPanel>

        <SectionPanel :title="t('collectionsRiskTitle')" :count="formatNumber(collectionRiskRows.length)">
          <p class="mb-3 text-xs text-slate-500">{{ t("collectionsRiskHint") }}</p>
          <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="collectionRiskRows.length === 0" class="at-empty-block">{{ t("noCollectionsRisk") }}</div>
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
          <div v-else-if="reconciliationPreviewRows.length === 0" class="at-empty-block">{{ t("noReconciliationPreview") }}</div>
          <div v-else class="space-y-3">
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

    <div v-if="isRenewalsTab" class="grid gap-4 xl:grid-cols-3">
      <div class="space-y-4 xl:col-span-2">
        <SectionPanel :title="t('offerWaitingRenewalsTitle')" :count="formatNumber(offerWaitingRenewals.length)">
          <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="offerWaitingRenewals.length === 0" class="at-empty-block">{{ t("noOfferWaitingRenewals") }}</div>
          <ul v-else class="space-y-3">
            <MetaListCard
              v-for="task in pagedPreviewItems(offerWaitingRenewals, 'renewalsOfferWaiting')"
              :key="task.name"
              :title="task.policy || '-'"
              clickable
              @click="openRenewalTaskItem(task)"
            >
              <template #trailing>
                <StatusBadge v-if="task.status" domain="renewal" :status="task.status" />
              </template>
              <MiniFactList :items="renewalTaskFactsDetailed(task)" />
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

        <SectionPanel :title="t('renewalQueue')" :count="formatNumber(displayRenewalTasks.length)">
          <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="displayRenewalTasks.length === 0" class="at-empty-block">{{ t("noRenewal") }}</div>
          <ul v-else class="space-y-3">
            <MetaListCard
              v-for="task in pagedPreviewItems(displayRenewalTasks, 'renewalsQueue')"
              :key="task.name"
              :title="task.policy || '-'"
              clickable
              @click="openRenewalTaskItem(task)"
            >
              <template #trailing>
                <StatusBadge v-if="task.status" domain="renewal" :status="task.status" />
              </template>
              <MiniFactList :items="renewalTaskFactsDetailed(task)" />
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

      <div class="space-y-4">
        <SectionPanel :title="t('renewalStatusOverviewTitle')" :show-count="false">
          <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="renewalStatusSummary.length === 0" class="at-empty-block">{{ t("noRenewalStatus") }}</div>
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

        <SectionPanel :title="t('renewalOutcomeTitle')" :show-count="false">
          <p class="mb-3 text-xs text-slate-500">{{ t("renewalOutcomeHint") }}</p>
          <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="renewalOutcomeSummary.length === 0" class="at-empty-block">{{ t("noRenewalOutcome") }}</div>
          <div v-else class="space-y-3">
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
        </SectionPanel>

        <SectionPanel :title="t('linkedPoliciesTitle')" :count="formatNumber(renewalLinkedPolicies.length)">
          <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="renewalLinkedPolicies.length === 0" class="at-empty-block">{{ t("noLinkedPolicies") }}</div>
          <ul v-else class="space-y-3">
            <EntityPreviewCard
              v-for="policy in pagedPreviewItems(renewalLinkedPolicies, 'renewalsPolicies')"
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

    <div v-if="isSalesTab" class="grid gap-4 xl:grid-cols-3">
      <div class="space-y-4">
        <SectionPanel :title="t('offerPipeline')" :count="formatNumber(salesPipelineOffers.length)">
          <p class="mb-3 text-xs text-slate-500">{{ t("salesPipelineHint") }}</p>
          <div v-if="dashboardLoading" class="text-sm text-slate-500">
            {{ t("loading") }}
          </div>
          <div v-else-if="salesPipelineOffers.length === 0" class="at-empty-block">{{ t("noOffer") }}</div>
          <ul v-else class="space-y-3">
            <EntityPreviewCard
              v-for="offer in pagedPreviewItems(salesPipelineOffers, 'salesOffers')"
              :key="offer.name"
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
      </div>

      <div class="space-y-4">
        <SectionPanel :title="t('convertedOffersTitle')" :count="formatNumber(convertedSalesOffers.length)">
          <div v-if="dashboardLoading" class="text-sm text-slate-500">
            {{ t("loading") }}
          </div>
          <div v-else-if="convertedSalesOffers.length === 0" class="at-empty-block">{{ t("noConvertedOffers") }}</div>
          <ul v-else class="space-y-3">
            <EntityPreviewCard
              v-for="offer in pagedPreviewItems(convertedSalesOffers, 'salesConvertedOffers')"
              :key="offer.name"
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

      <div class="space-y-4">
        <SectionPanel :title="t('recentLeads')" :count="formatNumber(displayRecentLeads.length)">
          <div v-if="dashboardLoading" class="text-sm text-slate-500">
            {{ t("loading") }}
          </div>
          <div v-else-if="displayRecentLeads.length === 0" class="at-empty-block text-center">
            {{ t("noLead") }}
          </div>
          <ul v-else class="space-y-3">
            <EntityPreviewCard
              v-for="lead in pagedPreviewItems(displayRecentLeads, 'salesLeads')"
              :key="lead.name"
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

        <SectionPanel :title="t('recentPolicies')" :count="formatNumber(displayRecentPolicies.length)">
          <div v-if="dashboardLoading" class="text-sm text-slate-500">
            {{ t("loading") }}
          </div>
          <div v-else-if="displayRecentPolicies.length === 0" class="at-empty-block">
            {{ t("noPolicy") }}
          </div>
          <ul v-else class="space-y-3">
            <EntityPreviewCard
              v-for="policy in pagedPreviewItems(displayRecentPolicies, 'salesPolicies')"
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
            :current-page="previewResolvedPage('salesPolicies', displayRecentPolicies)"
            :total-pages="previewPageCount(displayRecentPolicies)"
            :show-view-all="shouldShowViewAll(displayRecentPolicies)"
            :view-all-label="t('viewAllItems')"
            @change-page="setPreviewPage('salesPolicies', $event, displayRecentPolicies)"
            @view-all="openPreviewList('policies')"
          />
        </SectionPanel>

        <SectionPanel :title="t('salesCandidateActionTitle')" :count="formatNumber(salesCandidateActions.length)">
          <p class="mb-3 text-xs text-slate-500">{{ t("salesCandidateActionHint") }}</p>
          <div v-if="myTasksLoading || myRemindersLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="salesCandidateActions.length === 0" class="at-empty-block">{{ t("noSalesCandidateAction") }}</div>
          <ul v-else class="space-y-2">
            <MetaListCard
              v-for="action in pagedPreviewItems(salesCandidateActions, 'salesActions')"
              :key="`${action.kind}-${action.name}`"
              :title="salesActionTitle(action)"
              :description="salesActionDescription(action)"
              description-class="mt-2 text-xs font-semibold text-slate-600"
              clickable
              @click="openSalesActionItem(action)"
            >
              <MiniFactList :items="salesActionFacts(action)" />
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
import { computed, onBeforeUnmount, reactive, ref, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Dialog, createResource } from "frappe-ui";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useDashboardStore } from "../stores/dashboard";
import ActionButton from "../components/app-shell/ActionButton.vue";
import ActionPreviewCard from "../components/app-shell/ActionPreviewCard.vue";
import ActionToolbarGroup from "../components/app-shell/ActionToolbarGroup.vue";
import FilterChipButton from "../components/app-shell/FilterChipButton.vue";
import ProgressMetricRow from "../components/app-shell/ProgressMetricRow.vue";
import TrendMetricRow from "../components/app-shell/TrendMetricRow.vue";
import EntityPreviewCard from "../components/app-shell/EntityPreviewCard.vue";
import MetaListCard from "../components/app-shell/MetaListCard.vue";
import MiniFactList from "../components/app-shell/MiniFactList.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import PreviewPager from "../components/app-shell/PreviewPager.vue";
import DashboardStatCard from "../components/DashboardStatCard.vue";
import QuickCustomerPicker from "../components/app-shell/QuickCustomerPicker.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import { getQuickCreateConfig, getLocalizedText } from "../config/quickCreateRegistry";
import { isValidTckn, normalizeCustomerType, normalizeIdentityNumber } from "../utils/customerIdentity";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const branchStore = useBranchStore();
const dashboardStore = useDashboardStore();
const activeLocale = computed(() => unref(authStore.locale) || "en");
const quickLeadConfig = getQuickCreateConfig("lead");
const quickLeadDialogTitle = computed(() => getLocalizedText(quickLeadConfig?.title, activeLocale.value));
function normalizeResourcePayload(payload) {
  return payload?.message || payload || {};
}

function cstr(value) {
  return String(value ?? "").trim();
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
const DASHBOARD_RELOAD_DEBOUNCE_MS = 300;
const DASHBOARD_PREVIEW_PAGE_SIZE = 5;
const DASHBOARD_PREVIEW_FETCH_LIMIT = 20;
let dashboardReloadTimer = null;

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

const kpiResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_dashboard_kpis",
  params: buildKpiParams(),
  auto: false,
});

const followUpResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_follow_up_sla_payload",
  params: withOfficeBranchFilter({ filters: {} }),
  auto: true,
});

const myTasksResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_my_tasks_payload",
  params: withOfficeBranchFilter({ filters: {} }),
  auto: true,
});
const myActivitiesResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_my_activities_payload",
  params: withOfficeBranchFilter({ filters: {} }),
  auto: true,
});
const myRemindersResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_my_reminders_payload",
  params: withOfficeBranchFilter({ filters: {} }),
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
  params: buildClaimListParams(),
  auto: true,
});

function buildClaimListParams() {
  return withOfficeBranchFilter({
    doctype: "AT Claim",
    fields: ["name", "claim_no", "customer", "policy", "claim_status", "approved_amount", "paid_amount", "modified"],
    order_by: "modified desc",
    limit_page_length: 12,
  });
}

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
  params: buildTabPayloadParams("daily"),
  auto: true,
});

const createLeadResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_lead",
});

const localeCode = computed(() => (unref(authStore.locale) === "tr" ? "tr-TR" : "en-US"));
const dashboardTabPayload = computed(() => dashboardStore.state.tabPayload || {});
const dashboardTabCards = computed(() => dashboardTabPayload.value.cards || {});
const dashboardTabCompareCards = computed(() => dashboardTabPayload.value.compare_cards || {});
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
const openClaimsPreviewRows = computed(() =>
  asArray(unref(claimListResource.data))
    .filter((claim) => ["Open", "Under Review", "Approved"].includes(String(claim?.claim_status || "")))
    .slice(0, 12)
);
const dueTodayCollectionPayments = computed(() => asArray(dashboardTabPreviews.value.due_today_payments));
const overdueCollectionPayments = computed(() => asArray(dashboardTabPreviews.value.overdue_payments));
const offerWaitingRenewals = computed(() => asArray(dashboardTabPreviews.value.offer_waiting_renewals));
const reconciliationPreviewData = computed(() => unref(reconciliationPreviewResource.data) || {});
const reconciliationPreviewRows = computed(() =>
  asArray(dashboardTabPreviews.value.reconciliation_rows).length
    ? asArray(dashboardTabPreviews.value.reconciliation_rows)
    : asArray(reconciliationPreviewData.value.rows)
);
const dueTodayCollectionCount = computed(() => Number(dashboardTabMetrics.value?.due_today_collection_count || 0));
const dueTodayCollectionAmount = computed(() => Number(dashboardTabMetrics.value?.due_today_collection_amount_try || 0));
const overdueCollectionCount = computed(() => Number(dashboardTabMetrics.value?.overdue_collection_count || 0));
const overdueCollectionAmount = computed(() => Number(dashboardTabMetrics.value?.overdue_collection_amount_try || 0));
const offerWaitingRenewalCount = computed(() => Number(dashboardTabMetrics.value?.offer_waiting_count || 0));
const reconciliationPreviewMetrics = computed(() => ({
  ...(reconciliationPreviewData.value.metrics || {}),
  ...(dashboardTabMetrics.value?.reconciliation_open_count != null
    ? { open: Number(dashboardTabMetrics.value.reconciliation_open_count || 0) }
    : {}),
}));
const dashboardData = computed(() => dashboardStore.state.kpiPayload || {});
const dashboardComparison = computed(() => dashboardStore.comparison || {});
const dashboardMeta = computed(() => {
  return dashboardStore.meta || {};
});
const dashboardAccessScope = computed(() => String(dashboardMeta.value?.access_scope || ""));
const dashboardAccessReason = computed(() => String(dashboardMeta.value?.scope_reason || ""));
const dashboardCards = computed(() => ({
  ...(dashboardData.value.cards || {}),
  ...(dashboardTabCards.value || {}),
}));
const dashboardBranchLabel = computed(() => branchStore.requestBranch || "Tum Subeler");
const previousDashboardCards = computed(() => dashboardStore.previousCards || {});
const dashboardComparisonTrendHint = computed(() => {
  const mode = String(dashboardComparison.value?.mode || "").toLowerCase();
  if (mode === "previous_period") return t("trendAgainstPreviousPeriod");
  if (mode === "previous_month") return t("trendAgainstPreviousMonth");
  if (mode === "previous_year") return t("trendAgainstPreviousYear");
  if (mode === "custom") return t("trendAgainstCustomPeriod");
  return t("trendAgainstPrevious");
});
const commissionTrend = computed(() =>
  asArray(dashboardTabSeries.value.commission_trend).length
    ? asArray(dashboardTabSeries.value.commission_trend)
    : asArray(dashboardData.value.commission_trend)
);
const policyStatusRows = computed(() => asArray(dashboardData.value.policy_status));
const topCompanies = computed(() =>
  asArray(dashboardTabSeries.value.top_companies).length
    ? asArray(dashboardTabSeries.value.top_companies)
    : asArray(dashboardData.value.top_companies)
);
const dashboardLoadingRaw = computed(() => {
  const kpiLoading = isDailyTab.value ? Boolean(unref(kpiResource.loading)) : false;
  const tabLoading = Boolean(unref(dashboardTabPayloadResource.loading));
  return Boolean(kpiLoading || tabLoading);
});
const followUpLoading = computed(() => Boolean(unref(followUpResource.loading)));
const myTasksLoading = computed(() => Boolean(unref(myTasksResource.loading)));
const myActivitiesLoading = computed(() => Boolean(unref(myActivitiesResource.loading)));
const myRemindersLoading = computed(() => Boolean(unref(myRemindersResource.loading)));
const dashboardLoading = computed(() => dashboardStore.state.loading);
const dashboardPermissionError = computed(() => {
  const candidates = [
    unref(dashboardTabPayloadResource.error),
    isDailyTab.value ? unref(kpiResource.error) : null,
  ];
  return candidates.find((error) => Boolean(error) && isPermissionDeniedError(error)) || null;
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

const readyOfferCount = computed(() => {
  if (dashboardTabMetrics.value?.ready_offer_count != null) {
    return Number(dashboardTabMetrics.value.ready_offer_count || 0);
  }
  return recentOffers.value.filter((offer) => ["Sent", "Accepted"].includes(offer.status) && !offer.converted_policy).length;
});
const activeDashboardTab = computed(() => normalizeDashboardTab(route.query?.tab));
const isDailyTab = computed(() => activeDashboardTab.value === "daily");
const isSalesTab = computed(() => activeDashboardTab.value === "sales");
const isCollectionsTab = computed(() => activeDashboardTab.value === "collections");
const isRenewalsTab = computed(() => activeDashboardTab.value === "renewals");
const showNewLeadAction = computed(() => !isCollectionsTab.value && !isRenewalsTab.value);
const showRenewalAlertsTopRow = computed(() => isDailyTab.value || isRenewalsTab.value);
const showAnalyticsRow = computed(() => isSalesTab.value);
const showPoliciesOffersRow = computed(() => isSalesTab.value);

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

const previewPages = reactive({
  dailyFollowUp: 1,
  dailyActivities: 1,
  dailyTasks: 1,
  dailyClaims: 1,
  dailyPolicies: 1,
  dailyActionOffers: 1,
  dailyRenewalAlerts: 1,
  dailyTopCompanies: 1,
  collectionsDueToday: 1,
  collectionsOverdue: 1,
  collectionsPayments: 1,
  collectionsRisk: 1,
  collectionsReconciliation: 1,
  renewalsPolicies: 1,
  renewalsOfferWaiting: 1,
  renewalsQueue: 1,
  salesLeads: 1,
  salesOffers: 1,
  salesConvertedOffers: 1,
  salesPolicies: 1,
  salesActions: 1,
  salesTasks: 1,
  salesActivities: 1,
  salesReminders: 1,
});

function previewPageCount(items) {
  return Math.max(1, Math.ceil(asArray(unref(items)).length / DASHBOARD_PREVIEW_PAGE_SIZE));
}

function previewResolvedPage(key, items) {
  return Math.min(previewPages[key] || 1, previewPageCount(items));
}

function pagedPreviewItems(items, key) {
  const rows = asArray(unref(items));
  const page = previewResolvedPage(key, rows);
  const start = (page - 1) * DASHBOARD_PREVIEW_PAGE_SIZE;
  return rows.slice(start, start + DASHBOARD_PREVIEW_PAGE_SIZE);
}

function setPreviewPage(key, page, items) {
  const maxPage = previewPageCount(items);
  previewPages[key] = Math.min(Math.max(Number(page) || 1, 1), maxPage);
}

function shouldShowPreviewPager(items) {
  return previewPageCount(items) > 1;
}

function shouldShowViewAll(items) {
  return asArray(unref(items)).length >= DASHBOARD_PREVIEW_FETCH_LIMIT;
}

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

function buildKpiParams() {
  const range = getDateRange(selectedRange.value);
  return withOfficeBranchFilter({
    filters: {
      from_date: formatDate(range.from),
      to_date: formatDate(range.to),
      period_comparison: "previous_period",
      months: 6,
    },
  });
}

function buildTabPayloadParams(tabKey = activeDashboardTab.value) {
  const normalizedTab = normalizeDashboardTab(tabKey);
  const currentRange = getDateRange(selectedRange.value);
  const previousRange = getPreviousDateRange(selectedRange.value);
  return withOfficeBranchFilter({
    tab: normalizedTab,
    filters: {
      from_date: formatDate(currentRange.from),
      to_date: formatDate(currentRange.to),
      compare_from_date: formatDate(previousRange.from),
      compare_to_date: formatDate(previousRange.to),
      months: 6,
    },
  });
}

function withOfficeBranchFilter(params) {
  const officeBranch = branchStore.requestBranch;
  if (!officeBranch) {
    return params;
  }
  const next = { ...(params || {}) };
  next.office_branch = officeBranch;
  const filters = { ...(next.filters || {}) };
  filters.office_branch = officeBranch;
  next.filters = filters;
  return next;
}

function getDateRange(days) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - days);
  return { from, to };
}

function getPreviousDateRange(days) {
  const current = getDateRange(days);
  const to = new Date(current.from);
  to.setDate(to.getDate() - 1);
  const from = new Date(to);
  from.setDate(to.getDate() - days);
  return { from, to };
}

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

function openFollowUpItem(item) {
  const sourceType = String(item?.source_type || "");
  const sourceName = String(item?.source_name || "");
  if (!sourceName) {
    return;
  }
  if (sourceType === "claim") {
    router.push({ name: "claims-board", query: { claim: sourceName } });
    return;
  }
  if (sourceType === "renewal") {
    router.push({ name: "renewals-board", query: { task: sourceName } });
    return;
  }
  if (sourceType === "assignment" || sourceType === "call_note") {
    router.push({
      name: "communication-center",
      query: {
        reference_doctype: sourceType === "assignment" ? "AT Ownership Assignment" : "AT Call Note",
        reference_name: sourceName,
      },
    });
    return;
  }
}

function taskFacts(task) {
  return [
    { label: t("taskType"), value: task?.task_type || "-" },
    { label: t("taskAssignee"), value: task?.assigned_to || "-" },
    { label: t("dueDate"), value: formatDate(task?.due_date) },
  ];
}

function openTaskItem(task) {
  if (!task?.name) return;
  router.push({ name: "tasks-detail", params: { name: task.name } });
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

function openCollectionRiskItem(row) {
  const queryValue = cstr(row?.policy) || cstr(row?.customer);
  if (!queryValue) {
    openPreviewList("payments");
    return;
  }
  router.push({ name: "payments-board", query: { query: queryValue } });
}

function isSalesActionSource(sourceDoctype) {
  const source = cstr(sourceDoctype);
  return source === "AT Lead" || source === "AT Offer";
}

function openActivityItem(activity) {
  if (!activity?.name) return;
  router.push({ name: "activities-detail", params: { name: activity.name } });
}

function openClaimItem(claim) {
  if (!claim?.name) return;
  router.push({ name: "claim-detail", params: { name: claim.name } });
}

function openReminderItem(reminder) {
  if (!reminder?.name) return;
  router.push({ name: "reminders-detail", params: { name: reminder.name } });
}

function openSalesActionItem(action) {
  if (action?.kind === "reminder") {
    openReminderItem(action);
    return;
  }
  openTaskItem(action);
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

function setDashboardTab(tabKey) {
  const nextTab = normalizeDashboardTab(tabKey);
  const nextQuery = { ...route.query };
  if (nextTab === "daily") {
    delete nextQuery.tab;
  } else {
    nextQuery.tab = nextTab;
  }
  router.replace({ name: "dashboard", query: nextQuery });
}

function triggerDashboardReload({ includeKpis = true, immediate = false } = {}) {
  const runReload = () => {
    dashboardReloadTimer = null;
    dashboardTabPayloadResource.params = buildTabPayloadParams();
    dashboardTabPayloadResource.reload();
    followUpResource.params = withOfficeBranchFilter({ filters: {} });
    followUpResource.reload();
    myActivitiesResource.params = withOfficeBranchFilter({ filters: {} });
    myActivitiesResource.reload();
    claimListResource.reload();
    myRemindersResource.params = withOfficeBranchFilter({ filters: {} });
    myRemindersResource.reload();
    myTasksResource.params = withOfficeBranchFilter({ filters: {} });
    myTasksResource.reload();
    if (includeKpis) {
      kpiResource.params = buildKpiParams();
      kpiResource.reload();
    }
  };

  if (immediate) {
    if (dashboardReloadTimer) {
      window.clearTimeout(dashboardReloadTimer);
      dashboardReloadTimer = null;
    }
    runReload();
    return;
  }

  if (dashboardReloadTimer) {
    window.clearTimeout(dashboardReloadTimer);
  }
  dashboardReloadTimer = window.setTimeout(runReload, DASHBOARD_RELOAD_DEBOUNCE_MS);
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

function openLeadItem(lead) {
  if (!lead?.name) return;
  router.push({ name: "lead-detail", params: { name: lead.name } });
}

function openOfferItem(offer) {
  if (!offer?.name) return;
  router.push({ name: "offer-detail", params: { name: offer.name } });
}

function openConvertedPolicyItem(offer) {
  const policyName = String(offer?.converted_policy || "").trim();
  if (!policyName) return;
  router.push({ name: "policy-detail", params: { name: policyName } });
}

function openPolicyItem(policy) {
  if (!policy?.name) return;
  router.push({ name: "policy-detail", params: { name: policy.name } });
}

function openRenewalTaskItem(task) {
  if (!task?.name) return;
  router.push({ name: "renewals-board", query: { task: task.name } });
}

function openPaymentItem(payment) {
  const paymentQuery = String(payment?.payment_no || payment?.name || "").trim();
  if (!paymentQuery) return;
  router.push({ name: "payments-board", query: { query: paymentQuery } });
}

function openReconciliationItem(row) {
  const sourceQuery = String(row?.source_name || row?.name || "").trim();
  if (!sourceQuery) return;
  router.push({
    name: "reconciliation-workbench",
    query: {
      sourceQuery,
      ...(row?.status ? { status: row.status } : {}),
    },
  });
}

function openPreviewList(target) {
  switch (target) {
    case "policies":
      openPage("/policies");
      return;
    case "offers":
      openPage("/offers");
      return;
    case "renewals":
      openPage("/renewals");
      return;
    case "companies":
      openPage("/insurance-companies");
      return;
    case "payments":
      openPage("/payments");
      return;
    case "claims":
      openPage("/claims");
      return;
    case "reconciliation":
      openPage("/reconciliation-items");
      return;
    case "leads":
      openPage("/leads");
      return;
    case "tasks":
      router.push({ name: "tasks-list" });
      return;
    case "activities":
      router.push({ name: "activities-list" });
      return;
    case "reminders":
      router.push({ name: "reminders-list" });
      return;
    default:
      return;
  }
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

function openPage(path) {
  if (path === "/communication") {
    router.push({
      path,
      query: {
        return_to: route.fullPath || route.path || "",
      },
    });
    return;
  }
  router.push(path);
}

function reloadData() {
  triggerDashboardReload({ immediate: true });
}

function isPermissionDeniedError(error) {
  const status = Number(
    error?.statusCode ??
      error?.status ??
      error?.httpStatus ??
      error?.response?.status ??
      0
  );
  const text = String(error?.message || error?.messages?.join(" ") || error?.exc_type || "").toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    text.includes("permission") ||
    text.includes("not permitted") ||
    text.includes("not authorized")
  );
}

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
    dashboardStore.setActiveTab(value);
    triggerDashboardReload({ includeKpis: false });
  },
  { immediate: true }
);

watch(
  () => branchStore.selected,
  () => {
    triggerDashboardReload();
  }
);

onBeforeUnmount(() => {
  if (dashboardReloadTimer) {
    window.clearTimeout(dashboardReloadTimer);
    dashboardReloadTimer = null;
  }
});
</script>

