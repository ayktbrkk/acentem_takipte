import { onBeforeUnmount, onMounted, ref, unref } from "vue";

function parseRequestStatus(decisionContext) {
  const text = String(decisionContext || "").toLowerCase();
  if (text.includes("status=approved") || text.includes("approved")) return "approved";
  if (text.includes("status=rejected") || text.includes("rejected")) return "rejected";
  return "submitted";
}

function parseRequestKind(actionSummary) {
  const summary = String(actionSummary || "").toUpperCase();
  if (summary.includes("ACCESS")) return "access";
  if (summary.includes("TRANSFER")) return "transfer";
  if (summary.includes("SHARE")) return "share";
  return "access";
}

async function fetchCustomerNameMap(customerIds) {
  const ids = [...new Set(customerIds.filter(Boolean))];
  if (!ids.length) return {};

  const filters = JSON.stringify([["name", "in", ids]]);
  const fields = JSON.stringify(["name", "full_name"]);
  const response = await fetch(
    `/api/resource/AT Customer?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent(fields)}&limit_page_length=${ids.length}`,
    {
      headers: {
        "X-Frappe-CSRF-Token": window?.frappe?.csrf_token || "",
      },
    },
  );

  if (!response.ok) return {};

  const payload = await response.json();
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  return Object.fromEntries(
    rows.map((row) => [row.name, row.full_name || row.name]),
  );
}

export function useCustomerSearchPage({ activeLocale = "tr", t, authStore } = {}) {
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

    const sessionUser = String(unref(authStore?.userId) || window?.frappe?.session?.user || "").trim();

    try {
      const filters = JSON.stringify([
        ["action", "=", "Create"],
        ["action_summary", "like", "%REQUEST%"],
        ...(sessionUser ? [["viewed_by", "=", sessionUser]] : []),
      ]);
      const fields = JSON.stringify([
        "name",
        "reference_name",
        "action_summary",
        "decision_context",
        "viewed_on",
      ]);

      const response = await fetch(
        `/api/resource/AT Access Log?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent(fields)}&limit_page_length=10&order_by=viewed_on desc`,
        {
          headers: {
            "X-Frappe-CSRF-Token": window?.frappe?.csrf_token || "",
          },
          signal: requestHistoryController?.signal,
        },
      );

      if (!isMounted || activeController?.signal.aborted) return;

      if (!response.ok) {
        historyError.value = t?.("loadError") || "loadError";
        return;
      }

      const data = await response.json();
      if (!isMounted || activeController?.signal.aborted) return;

      const logs = Array.isArray(data?.data) ? data.data : [];
      const customerNameMap = await fetchCustomerNameMap(logs.map((log) => log.reference_name));

      if (!isMounted || activeController?.signal.aborted) return;

      accessRequestHistory.value = logs.map((log) => ({
        id: log.name,
        customer_name: customerNameMap[log.reference_name] || log.reference_name || "",
        request_kind: parseRequestKind(log.action_summary),
        status: parseRequestStatus(log.decision_context),
        created: log.viewed_on,
      }));
      showRequestHistory.value = accessRequestHistory.value.length > 0;
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
