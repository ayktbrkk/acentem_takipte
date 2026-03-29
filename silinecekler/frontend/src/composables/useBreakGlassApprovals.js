import { computed, getCurrentInstance, onMounted, reactive, ref } from "vue";
import { frappeRequest } from "frappe-ui";

export function useBreakGlassApprovals({ authStore, t }) {
  const canManage = computed(() => Boolean(authStore.isDeskUser));
  const pendingRows = ref([]);
  const loading = ref(false);
  const errorText = ref("");
  const actionResult = ref("");
  const busyRows = reactive({});
  const actionForm = reactive({});

  function ensureActionForm(rowName) {
    if (!actionForm[rowName]) {
      actionForm[rowName] = {
        durationHours: 24,
        comments: "",
      };
    }
  }

  function isRowBusy(rowName) {
    return Boolean(busyRows[rowName]);
  }

  function mapAccessType(value) {
    if (value === "customer_data") return t("customerData");
    if (value === "customer_financials") return t("customerFinancials");
    if (value === "system_admin") return t("systemAdmin");
    if (value === "reporting_override") return t("reportingOverride");
    return value || "-";
  }

  async function loadPending() {
    if (!canManage.value) {
      pendingRows.value = [];
      return;
    }

    loading.value = true;
    errorText.value = "";
    try {
      const payload = await frappeRequest({
        url: "/api/method/acentem_takipte.acentem_takipte.api.break_glass.list_pending",
        method: "GET",
      });
      const message = payload?.message || payload || [];
      pendingRows.value = Array.isArray(message) ? message : [];
      pendingRows.value.forEach((row) => ensureActionForm(row.name));
    } catch (error) {
      pendingRows.value = [];
      errorText.value = String(error?.message || error || t("unknownError"));
    } finally {
      loading.value = false;
    }
  }

  async function runAction(action, requestId) {
    const form = actionForm[requestId] || { durationHours: 24, comments: "" };
    busyRows[requestId] = true;
    errorText.value = "";
    actionResult.value = "";

    const method = action === "approve" ? "approve_request" : "reject_request";

    try {
      const payload = await frappeRequest({
        url: `/api/method/acentem_takipte.acentem_takipte.api.break_glass.${method}`,
        method: "POST",
        params: {
          request_id: requestId,
          duration_hours: form.durationHours,
          comments: String(form.comments || "").trim(),
        },
      });
      actionResult.value = payload?.message?.message || payload?.message || t("actionDone");
      await loadPending();
    } catch (error) {
      errorText.value = String(error?.message || error || t("unknownError"));
    } finally {
      busyRows[requestId] = false;
    }
  }

  async function approve(requestId) {
    await runAction("approve", requestId);
  }

  async function reject(requestId) {
    await runAction("reject", requestId);
  }

  if (getCurrentInstance()) {
    onMounted(() => {
      void loadPending();
    });
  }

  return {
    canManage,
    pendingRows,
    loading,
    errorText,
    actionResult,
    busyRows,
    actionForm,
    ensureActionForm,
    isRowBusy,
    mapAccessType,
    loadPending,
    approve,
    reject,
  };
}
