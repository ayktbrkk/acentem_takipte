import { computed } from "vue";
import { asArray } from "../utils/dashboardHelpers";

function buildTrendHint(t, mode) {
  const normalized = String(mode || "").toLowerCase();
  if (normalized === "previous_period") return t("trendAgainstPreviousPeriod");
  if (normalized === "previous_month") return t("trendAgainstPreviousMonth");
  if (normalized === "previous_year") return t("trendAgainstPreviousYear");
  if (normalized === "custom") return t("trendAgainstCustomPeriod");
  return t("trendAgainstPrevious");
}

export function useDashboardSummary({
  branchStore,
  dashboardStore,
  dashboardTabCards,
  dashboardTabMetrics,
  dashboardTabSeries,
  t,
}) {
  const dashboardData = computed(() => dashboardStore.state?.kpiPayload || {});
  const dashboardComparison = computed(() => dashboardStore.comparison || {});
  const dashboardMeta = computed(() => dashboardStore.meta || {});

  const dashboardAccessScope = computed(() => String(dashboardMeta.value?.access_scope || ""));
  const dashboardAccessReason = computed(() => String(dashboardMeta.value?.scope_reason || ""));
  const dashboardCards = computed(() => ({
    ...(dashboardData.value.cards || {}),
    ...(dashboardTabCards.value || {}),
  }));
  const dashboardBranchLabel = computed(() => branchStore.requestBranch || "Tum Subeler");
  const previousDashboardCards = computed(() => dashboardStore.previousCards || {});
  const dashboardComparisonTrendHint = computed(() =>
    buildTrendHint(t, dashboardComparison.value?.mode)
  );
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
  const acceptedOfferCount = computed(() => Number(dashboardTabMetrics.value?.accepted_offer_count || 0));
  const convertedOfferCount = computed(() => Number(dashboardTabMetrics.value?.converted_offer_count || 0));
  const maxTrendValue = computed(() => {
    const values = commissionTrend.value.map((entry) => Number(entry.total_commission || 0));
    return Math.max(1, ...values);
  });

  return {
    acceptedOfferCount,
    commissionTrend,
    convertedOfferCount,
    dashboardAccessReason,
    dashboardAccessScope,
    dashboardBranchLabel,
    dashboardCards,
    dashboardComparisonTrendHint,
    dashboardData,
    dashboardMeta,
    maxTrendValue,
    policyStatusRows,
    previousDashboardCards,
    topCompanies,
  };
}
