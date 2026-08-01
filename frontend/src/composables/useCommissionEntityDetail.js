import { computed, unref } from "vue";
import { createResource } from "frappe-ui";

export function useCommissionEntityDetail() {
  const resource = createResource({
    url: "acentem_takipte.acentem_takipte.domains.commissions.api.endpoints.get_commission_policy_detail",
    auto: false,
  });

  const loading = computed(() => Boolean(unref(resource.loading)));
  const data = computed(() => unref(resource.data) || null);

  async function load({ entityName, insuranceCompany, fromDate, toDate }) {
    const params = { entity_name: entityName };
    if (insuranceCompany) params.insurance_company = insuranceCompany;
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;
    resource.params = params;
    await resource.reload();
  }

  function reset() {
    resource.data = null;
  }

  return { loading, data, load, reset };
}
