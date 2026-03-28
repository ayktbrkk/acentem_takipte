import { computed, unref } from "vue";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function useDashboardPreviewData({
  claimListResource,
  dashboardTabMetrics,
  dashboardTabPreviews,
  reconciliationPreviewResource,
}) {
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

  const reconciliationPreviewOpenDifference = computed(() => {
    if (dashboardTabMetrics.value?.reconciliation_open_difference_try != null) {
      return Number(dashboardTabMetrics.value.reconciliation_open_difference_try || 0);
    }
    return reconciliationPreviewRows.value.reduce((sum, row) => sum + Number(row?.difference_try || 0), 0);
  });

  return {
    dueTodayCollectionAmount,
    dueTodayCollectionCount,
    dueTodayCollectionPayments,
    offerWaitingRenewalCount,
    offerWaitingRenewals,
    openClaimsPreviewRows,
    overdueCollectionAmount,
    overdueCollectionCount,
    overdueCollectionPayments,
    reconciliationPreviewData,
    reconciliationPreviewMetrics,
    reconciliationPreviewOpenDifference,
    reconciliationPreviewRows,
  };
}
