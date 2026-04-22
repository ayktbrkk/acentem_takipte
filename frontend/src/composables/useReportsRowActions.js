import { computed } from "vue";

export function useReportsRowActions({
  filters,
  router,
}) {
  /**
   * Smart Linkage: Navigation logic based on report and row content
   */
  function onRowClick(row) {
    if (!row) return;

    const reportKey = filters.reportKey;

    // 1. Direct Detail Linkage (Standard)
    if (reportKey === "policy_list" && row.name) {
      return router.push({ name: "policy-detail", params: { name: row.name } });
    }
    if (reportKey === "payment_status" && row.policy) {
      return router.push({ name: "policy-detail", params: { name: row.policy } });
    }
    if (reportKey === "claim_loss_ratio" && row.name) {
      return router.push({ name: "claim-detail", params: { name: row.name } });
    }
    if (reportKey === "claims_operations" && row.name) {
      return router.push({ name: "claim-detail", params: { name: row.name } });
    }
    if (reportKey === "renewal_performance" && row.policy) {
      return router.push({ name: "policy-detail", params: { name: row.policy } });
    }
    if (reportKey === "customer_segmentation" && row.name) {
      return router.push({ name: "customer-detail", params: { name: row.name } });
    }

    // 2. Drill-Down Linkage (Advanced)
    // Clicking a sales entity in performance report -> go to policy list filtered by that entity
    if (reportKey === "agent_performance" && row.sales_entity) {
      return router.push({ 
        name: "policy-list", 
        query: { 
          sales_entity: row.sales_entity,
          office_branch: row.office_branch
        } 
      });
    }

    // Generic Drill-Downs based on common fields
    if (row.customer && !["customer_segmentation"].includes(reportKey)) {
       return router.push({ name: "customer-detail", params: { name: row.customer } });
    }
  }

  function isRowClickable(row) {
    if (!row) return false;
    const rk = filters.reportKey;
    
    return [
      "policy_list", 
      "payment_status", 
      "claim_loss_ratio", 
      "claims_operations", 
      "renewal_performance", 
      "customer_segmentation",
      "agent_performance"
    ].includes(rk);
  }

  return {
    isRowClickable,
    onRowClick,
  };
}
