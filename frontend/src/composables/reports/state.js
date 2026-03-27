import { reactive } from "vue";

export function createReportFilters(initialReportKey = "policy_list") {
  return reactive({
    reportKey: initialReportKey || "policy_list",
    fromDate: "",
    toDate: "",
    branch: "",
    insuranceCompany: "",
    policyNo: "",
    customerTaxId: "",
    salesEntity: "",
    status: "",
    granularity: "",
  });
}
