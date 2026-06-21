import { onBeforeUnmount, onMounted, ref, unref } from "vue";

export function useCustomerSearchPage({ activeLocale = "tr", t } = {}) {
  const hasSearched = ref(false);
  const accessRequestHistory = ref([]);
  const showRequestHistory = ref(false);
  const historyLoading = ref(false);
  const historyError = ref("");
  let requestHistoryController = null;
  let isMounted = false;

  function onCustomerSelected() {
    hasSearched.value = true;
  }

  function resetSearch() {
    hasSearched.value = false;
  }

  function formatDate(dateStr) {
    try {
      const loc = String(unref(activeLocale) || "tr").toLowerCase().startsWith("tr") ? "tr-TR" : "en-US";
      return new Date(dateStr).toLocaleDateString(loc, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  }

  async function loadRequestHistory() {
    requestHistoryController?.abort();
    requestHistoryController = typeof AbortController === "undefined" ? null : new AbortController();
    const activeController = requestHistoryController;

    historyLoading.value = true;
    historyError.value = "";

    try {
      const response = await fetch("/api/resource/AT Access Log?filters=[[\"action\",\"=\",\"Create\"]]&fields=[\"name\",\"reference_name\",\"action_summary\",\"viewed_on\"]&limit_page_length=10", {
        headers: {
          "X-Frappe-CSRF-Token": window?.frappe?.csrf_token || "",
        },
        signal: requestHistoryController?.signal,
      });

      if (!isMounted || activeController?.signal.aborted) return;

      if (!response.ok) {
        historyError.value = t?.("loadError") || "loadError";
        return;
      }

      const data = await response.json();
      if (isMounted && data.data) {
        accessRequestHistory.value = data.data
          .filter((log) => log.action_summary?.includes("REQUEST"))
          .map((log) => ({
            id: log.name,
            customer_name: log.reference_name || "",
            request_kind: log.action_summary?.includes("ACCESS")
              ? "access"
              : log.action_summary?.includes("TRANSFER")
              ? "transfer"
              : "share",
            status: "pending",
            created: log.viewed_on,
          }));
        showRequestHistory.value = accessRequestHistory.value.length > 0;
      }
    } catch (error) {
      if (!isMounted || activeController?.signal.aborted || error?.name === "AbortError") return;
      historyError.value = t?.("loadError") || "loadError";
    } finally {
      if (isMounted) {
        historyLoading.value = false;
      }
    }
  }

  onMounted(() => {
    isMounted = true;
    loadRequestHistory();
  });
  onBeforeUnmount(() => {
    isMounted = false;
    requestHistoryController?.abort();
  });

  return {
    hasSearched,
    accessRequestHistory,
    showRequestHistory,
    historyLoading,
    historyError,
    onCustomerSelected,
    resetSearch,
    formatDate,
    loadRequestHistory,
  };
}
