import { computed } from "vue";
import { getDateRange } from "../utils/dashboardHelpers";

export function useDashboardVisibleRange({ formatDate, selectedRange }) {
  return computed(() => {
    const range = getDateRange(selectedRange.value);
    return `${formatDate(range.from)} - ${formatDate(range.to)}`;
  });
}
