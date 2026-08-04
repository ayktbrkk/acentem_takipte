import { computed, reactive, ref } from "vue";
import { createResource } from "frappe-ui";

export function useCommissionBalances({ t }) {
  const filters = reactive({
    office_branch: "",
    aging_bucket: "all",
    from_date: "",
    to_date: "",
    insurance_company: "",
    query: "",
  });

  const resource = createResource({
    url: "acentem_takipte.acentem_takipte.domains.commissions.api.endpoints.get_commission_balances",
    auto: false,
  });

  // Guard against out-of-order responses: only the latest reload may commit its
  // data or error to the refs the page reads. A slow (stale) response for an
  // older query can no longer overwrite a newer search result.
  let requestSeq = 0;
  const loading = ref(false);
  const error = ref("");
  const data = ref(null);

  const summary = computed(() => data.value?.summary || {});
  const entities = computed(() => data.value?.entities || []);
  const reconciliation = computed(() => data.value?.reconciliation || {});

  async function reload() {
    const seq = ++requestSeq;
    loading.value = true;
    error.value = "";
    try {
      const params = { limit: 200 };
      if (filters.office_branch) params.office_branch = filters.office_branch;
      if (filters.aging_bucket !== "all")
        params.aging_bucket = filters.aging_bucket;
      if (filters.from_date) params.from_date = filters.from_date;
      if (filters.to_date) params.to_date = filters.to_date;
      if (filters.insurance_company) params.insurance_company = filters.insurance_company;
      if (String(filters.query || "").trim())
        params.query = String(filters.query).trim();
      const result = await resource.reload(params);
      if (seq !== requestSeq) return result;
      data.value = result || null;
      return result;
    } catch (e) {
      if (seq !== requestSeq) return;
      error.value = t("load_error");
    } finally {
      if (seq === requestSeq) loading.value = false;
    }
  }

  return { filters, loading, error, summary, entities, reconciliation, reload };
}
