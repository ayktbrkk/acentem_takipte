import { onMounted, ref } from "vue";

export function useCustomerSearchPage() {
  const hasSearched = ref(false);
  const accessRequestHistory = ref([]);
  const showRequestHistory = ref(false);

  function onCustomerSelected() {
    hasSearched.value = true;
  }

  function resetSearch() {
    hasSearched.value = false;
  }

  function formatDate(dateStr) {
    try {
      return new Date(dateStr).toLocaleDateString("tr-TR", {
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
    try {
      const response = await fetch("/api/resource/AT Access Log?filters=[[\"action\",\"=\",\"Create\"]]&fields=[\"name\",\"reference_name\",\"action_summary\",\"docstatus\",\"created\"]&limit_page_length=10", {
        headers: {
          "X-Frappe-CSRF-Token": window?.frappe?.csrf_token || "",
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.data) {
        accessRequestHistory.value = data.data
          .filter((log) => log.action_summary?.includes("REQUEST"))
          .map((log) => ({
            id: log.name,
            customer_name: log.reference_name || "Unknown",
            request_kind: log.action_summary?.includes("ACCESS")
              ? "access"
              : log.action_summary?.includes("TRANSFER")
              ? "transfer"
              : "share",
            status: "Pending",
            created: log.created,
          }));
        showRequestHistory.value = accessRequestHistory.value.length > 0;
      }
    } catch (error) {
      console.error("Failed to load access request history:", error);
    }
  }

  onMounted(loadRequestHistory);

  return {
    hasSearched,
    accessRequestHistory,
    showRequestHistory,
    onCustomerSelected,
    resetSearch,
    formatDate,
    loadRequestHistory,
  };
}
