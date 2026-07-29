import { computed, reactive, ref, unref } from "vue";
import { createResource } from "frappe-ui";

export function useCommissionBalances({ t }) {
  const filters = reactive({
    office_branch: "",
    aging_bucket: "all",
    from_date: "",
    to_date: "",
  });

  const resource = createResource({
    url: "acentem_takipte.acentem_takipte.domains.commissions.api.endpoints.get_commission_balances",
    auto: false,
  });

  const loading = computed(() => Boolean(unref(resource.loading)));
  const error = ref("");
  const summary = computed(() => unref(resource.data)?.summary || {});
  const entities = computed(() => unref(resource.data)?.entities || []);
  const insuranceCompanies = computed(
    () => unref(resource.data)?.insurance_companies || [],
  );

  async function reload() {
    error.value = "";
    try {
      const params = {};
      if (filters.office_branch) params.office_branch = filters.office_branch;
      if (filters.aging_bucket !== "all")
        params.aging_bucket = filters.aging_bucket;
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      await resource.reload(params);
    } catch {
      error.value = t("load_error");
    }
  }

  return { filters, loading, error, summary, entities, insuranceCompanies, reload };
}
