import { computed } from "vue";

import { useLeadListActions } from "./useLeadListActions";
import { useLeadListFilters } from "./useLeadListFilters";
import { useLeadListNavigation } from "./useLeadListNavigation";
import { useLeadListQuickLead } from "./useLeadListQuickLead";
import { useLeadListTableData } from "./useLeadListTableData";

export function useLeadListRuntime({ t, activeLocale }) {
  const filtersState = useLeadListFilters({ t, activeLocale });
  const tableState = useLeadListTableData({
    t,
    activeLocale,
    leadListResource: filtersState.leadListResource,
  });
  const navigationState = useLeadListNavigation();
  const actionState = useLeadListActions({
    t,
    refreshLeadList: filtersState.refreshLeadList,
    buildLeadExportQuery: filtersState.buildLeadExportQuery,
    canConvertLead: tableState.canConvertLead,
  });
  const quickLeadState = useLeadListQuickLead({
    t,
    activeLocale,
    refreshLeadList: filtersState.refreshLeadList,
    openLeadDetail: navigationState.openLeadDetail,
  });

  const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));

  return {
    ...filtersState,
    ...tableState,
    ...navigationState,
    ...actionState,
    ...quickLeadState,
    localeCode,
  };
}
