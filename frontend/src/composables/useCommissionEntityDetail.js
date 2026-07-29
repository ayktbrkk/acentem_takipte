import { computed, ref, unref } from "vue";
import { createResource } from "frappe-ui";

export function useCommissionEntityDetail({ t }) {
  const entityName = ref("");
  const resource = createResource({
    url: "acentem_takipte.acentem_takipte.domains.commissions.api.endpoints.get_commission_entity_detail",
    auto: false,
  });

  const loading = computed(() => Boolean(unref(resource.loading)));
  const error = ref("");
  const entity = computed(() => unref(resource.data)?.entity || null);
  const accruedPolicies = computed(() => unref(resource.data)?.accrued_policies || []);
  const payments = computed(() => unref(resource.data)?.payments || []);

  async function reload(name) {
    entityName.value = name;
    error.value = "";
    try {
      await resource.reload({ entity_name: name });
    } catch {
      error.value = t("load_error");
    }
  }

  return { loading, error, entity, accruedPolicies, payments, reload };
}
