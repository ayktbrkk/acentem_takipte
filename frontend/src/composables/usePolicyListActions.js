import { computed } from "vue";

import { mutedFact, subtleFact } from "../utils/factItems";

export function usePolicyListActions({ router, localeCode, t }) {
  const customerLabel = (row) => row?.customer_full_name || row?.customer_name || row?.customer || "-";

  const policyIdentityFacts = (row) => [
    subtleFact("record", t("recordNo"), row?.name || "-"),
    subtleFact("policyNo", t("carrierPolicyNo"), row?.policy_no || "-"),
  ];

  const policyDetailsFacts = (row) => [
    mutedFact("customer", t("colCustomer"), customerLabel(row)),
    mutedFact("company", t("colCompany"), row?.insurance_company || "-"),
    mutedFact("endDate", t("colEndDate"), formatDate(row?.end_date)),
  ];

  const policyPremiumFacts = (row) => [
    mutedFact("gross", t("colGross"), formatCurrency(row?.gross_premium, row?.currency || "TRY")),
    mutedFact(
      "commission",
      t("colCommission"),
      formatCurrency(row?.commission_amount || row?.commission, row?.currency || "TRY")
    ),
    mutedFact("gwpTry", t("colGwpTry"), formatCurrency(row?.gwp_try, "TRY")),
  ];

  function openPolicyDetail(policyName) {
    router.push({ name: "policy-detail", params: { name: policyName } });
  }

  function formatDate(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat(localeCode.value).format(new Date(value));
  }

  function formatCurrency(value, currency) {
    return new Intl.NumberFormat(localeCode.value, {
      style: "currency",
      currency: currency || "TRY",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  function formatCount(value) {
    return Number(value || 0).toLocaleString(localeCode.value);
  }

  return {
    openPolicyDetail,
    policyIdentityFacts,
    policyDetailsFacts,
    policyPremiumFacts,
    formatDate,
    formatCurrency,
    formatCount,
  };
}
