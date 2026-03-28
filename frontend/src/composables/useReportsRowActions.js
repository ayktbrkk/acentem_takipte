import { computed } from "vue";

export function useReportsRowActions({
  filters,
  router,
}) {
  const isPolicyListReport = computed(() => filters.reportKey === "policy_list");

  function openPolicyDetail(policyName) {
    if (!policyName) {
      return;
    }
    router.push({ name: "policy-detail", params: { name: policyName } });
  }

  function isRowClickable(row) {
    return isPolicyListReport.value && Boolean(row?.name);
  }

  function onRowClick(row) {
    if (!isRowClickable(row)) {
      return;
    }
    openPolicyDetail(row.name);
  }

  return {
    isRowClickable,
    onRowClick,
    openPolicyDetail,
  };
}
