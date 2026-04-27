import { computed, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { getCustomerOptionLabel } from "../utils/customerOptions";
import { translateText } from "../utils/i18n";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function resourceValue(resource, fallback = null) {
  const value = unref(resource?.data);
  return value == null ? fallback : value;
}

function buildOfficeBranchLookupFilters(branchStore) {
  const officeBranch = branchStore.requestBranch || "";
  return officeBranch ? { office_branch: officeBranch } : {};
}

export function usePaymentsBoardQuickPayment({ t, branchStore, reloadPayments, localeCode }) {
  const paymentQuickCustomerResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Customer",
      fields: ["name", "full_name"],
      filters: buildOfficeBranchLookupFilters(branchStore),
      order_by: "modified desc",
      limit_page_length: 500,
    },
  });

  const paymentQuickPolicyResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Policy",
      fields: ["name", "policy_no", "customer"],
      filters: buildOfficeBranchLookupFilters(branchStore),
      order_by: "modified desc",
      limit_page_length: 500,
    },
  });

  const paymentQuickClaimResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Claim",
      fields: ["name", "claim_no", "customer", "policy"],
      filters: buildOfficeBranchLookupFilters(branchStore),
      order_by: "modified desc",
      limit_page_length: 500,
    },
  });

  const paymentQuickSalesEntityResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Sales Entity",
      fields: ["name", "full_name"],
      order_by: "full_name asc",
      limit_page_length: 500,
    },
  });

  const showQuickPaymentDialog = ref(false);
  const paymentQuickOptionsMap = computed(() => ({
    customers: asArray(resourceValue(paymentQuickCustomerResource, [])).map((row) => ({
      value: row.name,
      label: getCustomerOptionLabel(row),
    })),
    policies: asArray(resourceValue(paymentQuickPolicyResource, [])).map((row) => ({
      value: row.name,
      label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
    })),
    claims: asArray(resourceValue(paymentQuickClaimResource, [])).map((row) => ({
      value: row.name,
      label: `${row.claim_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
    })),
    salesEntities: asArray(resourceValue(paymentQuickSalesEntityResource, [])).map((row) => ({
      value: row.name,
      label: row.full_name || row.name,
    })),
  }));

  const quickPaymentEyebrow = computed(() => t("quickPayment"));
  const quickPaymentSuccessHandlers = {
    payment_list: async () => {
      await reloadPayments();
    },
  };

  function prepareQuickPaymentDialog({ form }) {
    if (!form.payment_date) form.payment_date = new Date().toISOString().slice(0, 10);
  }

  watch(
    () => branchStore.selected,
    () => {
      paymentQuickCustomerResource.params = {
        doctype: "AT Customer",
        fields: ["name", "full_name"],
        filters: buildOfficeBranchLookupFilters(branchStore),
        order_by: "modified desc",
        limit_page_length: 500,
      };
      paymentQuickPolicyResource.params = {
        doctype: "AT Policy",
        fields: ["name", "policy_no", "customer"],
        filters: buildOfficeBranchLookupFilters(branchStore),
        order_by: "modified desc",
        limit_page_length: 500,
      };
      paymentQuickClaimResource.params = {
        doctype: "AT Claim",
        fields: ["name", "claim_no", "customer", "policy"],
        filters: buildOfficeBranchLookupFilters(branchStore),
        order_by: "modified desc",
        limit_page_length: 500,
      };
      void paymentQuickCustomerResource.reload();
      void paymentQuickPolicyResource.reload();
      void paymentQuickClaimResource.reload();
      void reloadPayments();
    }
  );

  return {
    paymentQuickCustomerResource,
    paymentQuickPolicyResource,
    paymentQuickClaimResource,
    paymentQuickSalesEntityResource,
    showQuickPaymentDialog,
    paymentQuickOptionsMap,
    quickPaymentEyebrow,
    quickPaymentSuccessHandlers,
    prepareQuickPaymentDialog,
  };
}
