import { onMounted, watch } from "vue";
import { useRoute } from "vue-router";

import { useBranchStore } from "../../stores/branch";
import { useCommunicationStore } from "../../stores/communication";

export function useCommunicationCenterBootstrap({
  applyPreset,
  hasRouteContextQuery,
  hydratePresetStateFromServer,
  presetKey,
  reloadQuickCustomers,
  reloadSnapshot,
}) {
  const route = useRoute();
  const branchStore = useBranchStore();
  const communicationStore = useCommunicationStore();
  const filters = communicationStore.state.filters;

  onMounted(() => {
    if (!hasRouteContextQuery()) {
      applyPreset(presetKey.value, { refresh: false });
    }
    void reloadSnapshot();
    void hydratePresetStateFromServer();
  });

  watch(
    () => [
      route.query.customer,
      route.query.customer_label,
      route.query.status,
      route.query.channel,
      route.query.reference_doctype,
      route.query.reference_name,
    ],
    ([customer, _customerLabel, status, channel, referenceDoctype, referenceName]) => {
      const nextCustomer = String(customer || "").trim();
      const nextStatus = String(status || "").trim();
      const nextChannel = String(channel || "").trim();
      const nextReferenceDoctype = String(referenceDoctype || "").trim();
      const nextReferenceName = String(referenceName || "").trim();
      if (
        filters.customer === nextCustomer &&
        filters.status === nextStatus &&
        filters.channel === nextChannel &&
        filters.referenceDoctype === nextReferenceDoctype &&
        filters.referenceName === nextReferenceName
      ) {
        return;
      }
      communicationStore.setFilters({
        customer: nextCustomer,
        status: nextStatus,
        channel: nextChannel,
        referenceDoctype: nextReferenceDoctype,
        referenceName: nextReferenceName,
      });
      reloadSnapshot();
    },
    { immediate: true }
  );

  watch(
    () => branchStore.selected,
    () => {
      void reloadQuickCustomers();
      void reloadSnapshot();
    }
  );
}
