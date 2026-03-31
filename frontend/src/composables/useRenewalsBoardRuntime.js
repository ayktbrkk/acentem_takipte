import { computed, onMounted, reactive, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useRoute, useRouter } from "vue-router";

import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useRenewalStore } from "../stores/renewal";
import { useCustomFilterPresets } from "./useCustomFilterPresets";
import { openTabularExport } from "../utils/listExport";
import { translateText } from "../utils/i18n";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function resourceValue(resource, fallback = null) {
  const value = unref(resource?.data);
  return value == null ? fallback : value;
}

function buildOfficeBranchOptions(branches) {
  return asArray(branches).map((branch) => ({
    value: branch.name,
    label: branch.office_branch_name || branch.name,
  }));
}

export function useRenewalsBoardRuntime({ activeLocale, localeCode, t }) {
  const appPinia = getAppPinia();
  const authStore = useAuthStore(appPinia);
  const branchStore = useBranchStore(appPinia);
  const renewalStore = useRenewalStore(appPinia);
  const route = useRoute();
  const router = useRouter();

  const resourceValueLocal = (resource, fallback = null) => resourceValue(resource, fallback);

  function buildOfficeBranchLookupFilters() {
    const officeBranch = branchStore.requestBranch || "";
    return officeBranch ? { office_branch: officeBranch } : {};
  }

  const filters = renewalStore.state.filters;

  const renewalStatusOptions = computed(() =>
    ["Open", "In Progress", "Done", "Cancelled"].map((value) => ({
      value,
      label: translateText(value, localeCode.value),
    }))
  );
  const lostReasonColumnLabel = computed(() => translateText("Lost Reason", localeCode.value));
  const activeFilterCount = computed(() => renewalStore.activeFilterCount);

  const renewalsResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: buildRenewalListParams(),
  });
  const renewalMutationResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.quick_create.update_quick_aux_record",
    auto: false,
  });
  const renewalQuickPolicyResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Policy",
      fields: ["name", "policy_no", "customer", "gross_premium"],
      filters: buildOfficeBranchLookupFilters(),
      order_by: "modified desc",
      limit_page_length: 500,
    },
  });
  const renewalQuickCustomerResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Customer",
      fields: ["name", "full_name"],
      filters: buildOfficeBranchLookupFilters(),
      order_by: "modified desc",
      limit_page_length: 500,
    },
  });

  const renewalPolicyLookupRows = computed(() => asArray(resourceValueLocal(renewalQuickPolicyResource, [])));
  const renewalCustomerLookupRows = computed(() => asArray(resourceValueLocal(renewalQuickCustomerResource, [])));
  const renewalPolicyLookupMap = computed(() =>
    renewalPolicyLookupRows.value.reduce((acc, row) => {
      acc[row.name] = row;
      return acc;
    }, {})
  );
  const renewalCustomerLookupMap = computed(() =>
    renewalCustomerLookupRows.value.reduce((acc, row) => {
      acc[row.name] = row;
      return acc;
    }, {})
  );

  const renewalsRaw = computed(() => renewalStore.state.items || []);
  const renewalsLoading = computed(() => Boolean(unref(renewalsResource.loading)));
  const renewalMutationLoading = computed(() => Boolean(unref(renewalMutationResource.loading)));
  const renewals = computed(() => {
    const branchOptions = buildOfficeBranchOptions(branchStore.items);
    return asArray(renewalsRaw.value).map((task) => {
      const policySummary = renewalPolicyLookupMap.value[task.policy];
      const daysUntilDue = getRenewalDaysUntilDue(task.due_date || task.renewal_date);
      const priorityMeta = getRenewalPriorityMeta(task, daysUntilDue);
      return {
        ...task,
        customerLabel: renewalCustomerLookupMap.value[task.customer]?.full_name || task.customer || "-",
        branchLabel: branchOptions.find((branch) => branch.value === task.office_branch)?.label || task.office_branch || "-",
        premiumLabel: formatRenewalPremium(policySummary?.gross_premium, "TRY"),
        avatarInitials: buildInitials(task.customer || task.policy || task.name),
        priorityTone: priorityMeta.tone,
        priorityLabel: priorityMeta.label,
        dueDate: task.due_date || "",
        renewalDate: task.renewal_date || "",
        competitorName: formatLostReason(task),
        status: task.status || "",
        policy: task.policy || "",
      };
    });
  });

  const showQuickRenewalDialog = ref(false);
  const renewalQuickOptionsMap = computed(() => ({
    policies: renewalPolicyLookupRows.value.map((row) => ({
      value: row.name,
      label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
    })),
    customers: renewalCustomerLookupRows.value.map((row) => ({
      value: row.name,
      label: row.full_name || row.name,
    })),
  }));
  const quickRenewalEyebrow = computed(() => translateText("Quick Renewal", activeLocale.value));
  const quickRenewalSuccessHandlers = {
    renewal_task_list: async () => {
      await reloadRenewals();
    },
  };

  const renewalSummaryItems = computed(() => {
    const rows = renewals.value;
    const openRows = rows.filter((row) => row.status === "Open");
    const doneRows = rows.filter((row) => row.status === "Done");
    const cancelledRows = rows.filter((row) => row.status === "Cancelled");
    return [
      { key: "total", label: t("metricTotal"), value: formatCount(rows.length), valueClass: "text-slate-900" },
      { key: "open", label: t("metricOpen"), value: formatCount(openRows.length), valueClass: "text-brand-600" },
      { key: "done", label: t("metricDone"), value: formatCount(doneRows.length), valueClass: "text-green-600" },
      { key: "cancelled", label: t("metricCancelled"), value: formatCount(cancelledRows.length), valueClass: "text-rose-600" },
      {
        key: "due",
        label: t("metricDue"),
        value: formatCount(rows.filter((row) => String(row.due_date || "").trim()).length),
        valueClass: "text-amber-600",
      },
    ];
  });

  const renewalCards = computed(() => renewals.value.map((task) => buildRenewalBoardCard(task)));
  const boardColumns = computed(() => {
    const columns = [
      { key: "open", label: t("columnOpen"), hint: t("columnOpenHint"), cards: [] },
      { key: "in_progress", label: t("columnInProgress"), hint: t("columnInProgressHint"), cards: [] },
      { key: "done", label: t("columnDone"), hint: t("columnDoneHint"), cards: [] },
      { key: "cancelled", label: t("columnCancelled"), hint: t("columnCancelledHint"), cards: [] },
    ];
    for (const card of renewalCards.value) {
      const bucket = columns.find((col) => col.key === card.boardKey) || columns[0];
      bucket.cards.push(card);
    }
    return columns;
  });

  const renewalsError = computed(() => {
    const err = unref(renewalsResource.error);
    return err?.messages?.join(" ") || err?.message || "";
  });

  watch(
    () => unref(renewalsResource.data),
    (rows) => {
      renewalStore.setItems(Array.isArray(rows) ? rows : []);
    },
    { immediate: true }
  );

  watch(
    () => Boolean(unref(renewalsResource.loading)),
    (value) => {
      renewalStore.setLoading(value);
    },
    { immediate: true }
  );

  watch(
    () => unref(renewalsResource.error),
    (err) => {
      if (!err) {
        renewalStore.clearError();
        return;
      }
      if (Array.isArray(err.messages) && err.messages.length > 0) {
        renewalStore.setError(err.messages.join(" "));
        return;
      }
      renewalStore.setError(err.message || t("loadError"));
    },
    { immediate: true }
  );

  function reloadRenewals() {
    renewalsResource.params = buildRenewalListParams();
    renewalStore.setLoading(true);
    renewalStore.clearError();
    return renewalsResource
      .reload()
      .then((result) => {
        renewalStore.setItems(result || []);
        renewalStore.setLoading(false);
        return result;
      })
      .catch((error) => {
        renewalStore.setItems([]);
        renewalStore.setError(error?.messages?.join(" ") || error?.message || t("loadError"));
        renewalStore.setLoading(false);
        throw error;
      });
  }

  function downloadRenewalExport(format) {
    openTabularExport({
      permissionDoctypes: ["AT Renewal Task"],
      exportKey: "renewals_board",
      title: t("title"),
      columns: [t("task"), t("policy"), t("status"), t("competitor"), t("due"), t("renewal")],
      rows: renewals.value.map((task) => ({
        [t("task")]: task.name || "-",
        [t("policy")]: task.policy || "-",
        [t("status")]: task.status || "-",
        [t("competitor")]: task.competitorName || "-",
        [t("due")]: task.dueDate || "-",
        [t("renewal")]: task.renewalDate || "-",
      })),
      filters: currentRenewalPresetPayload(),
      format,
    });
  }

  function canMoveRenewalToStatus(task, nextStatus) {
    const current = String(task?.status || "").trim();
    if (!current || current === nextStatus) return false;
    const transitions = {
      Open: ["In Progress", "Done", "Cancelled"],
      "In Progress": ["Done", "Cancelled"],
    };
    return Boolean(transitions[current]?.includes(nextStatus));
  }

  function openPolicy(policyName) {
    if (!policyName) return;
    router.push({ name: "policy-detail", params: { name: policyName } });
  }

  function openRenewalDetail(task) {
    if (!task?.name) return;
    router.push({ name: "renewal-detail", params: { name: task.name } });
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(localeCode.value, { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }

  function formatCount(value) {
    return new Intl.NumberFormat(localeCode.value).format(Number(value || 0));
  }

  function formatRenewalPremium(amount, currency) {
    const number = Number(amount || 0);
    return new Intl.NumberFormat(localeCode.value, {
      style: "currency",
      currency: currency || "TRY",
      maximumFractionDigits: 0,
    }).format(number);
  }

  function getRenewalDaysUntilDue(value) {
    if (!value) return null;
    const target = new Date(value);
    if (Number.isNaN(target.getTime())) return null;
    return Math.ceil((target.getTime() - Date.now()) / 86400000);
  }

  function buildInitials(value) {
    const parts = String(value || "")
      .split(/[\s_-]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "-";
  }

  function getRenewalPriorityMeta(task, daysUntilDue) {
    if (task.status === "Cancelled") return { tone: "priority-low", label: t("priorityCancelled") };
    if (task.status === "Done") return { tone: "priority-low", label: t("priorityDone") };
    if (daysUntilDue == null) return { tone: "priority-neutral", label: t("priorityUnknown") };
    if (daysUntilDue <= 7) return { tone: "priority-high", label: t("priorityCritical") };
    if (daysUntilDue <= 30) return { tone: "priority-medium", label: t("prioritySoon") };
    return { tone: "priority-low", label: t("priorityNormal") };
  }

  function getRenewalBoardColumnKey(task, daysUntilDue) {
    if (task.status === "Cancelled") return "cancelled";
    if (task.status === "Done") return "done";
    if (task.status === "In Progress") return "in_progress";
    if (daysUntilDue != null && daysUntilDue <= 7) return "open";
    return "open";
  }

  function buildRenewalBoardCard(task) {
    const policySummary = renewalPolicyLookupMap.value[task.policy];
    const daysUntilDue = getRenewalDaysUntilDue(task.due_date || task.renewal_date);
    const priorityMeta = getRenewalPriorityMeta(task, daysUntilDue);
    return {
      ...task,
      boardKey: getRenewalBoardColumnKey(task, daysUntilDue),
      avatarInitials: buildInitials(task.customer || task.policy || task.name),
      branchLabel: branchStore.items.find((branch) => branch.name === task.office_branch)?.office_branch_name || task.office_branch || "-",
      customerLabel: renewalCustomerLookupMap.value[task.customer]?.full_name || task.customer || "-",
      premiumLabel: formatRenewalPremium(policySummary?.gross_premium, "TRY"),
      priorityLabel: priorityMeta.label,
      priorityTone: priorityMeta.tone,
      status: task.status || "",
      dueDate: task.due_date || "",
      renewalDate: task.renewal_date || "",
      competitorName: formatLostReason(task),
      policy: task.policy || "",
    };
  }

  function isoDateOffset(days) {
    const value = new Date();
    value.setDate(value.getDate() + Number(days || 0));
    return value.toISOString().slice(0, 10);
  }

  function normalizeText(value) {
    return String(value || "").trim().toLocaleLowerCase(localeCode.value);
  }

  function toStartOfDay(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function matchesDueScope(dueDate, scope) {
    if (!scope) return true;
    const target = toStartOfDay(dueDate);
    if (!target) return false;
    const today = toStartOfDay(new Date());
    if (!today) return false;
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000);
    if (scope === "overdue") return diffDays < 0;
    return diffDays <= Number(scope);
  }

  function buildRenewalListParams() {
    const params = {
      doctype: "AT Renewal Task",
      fields: [
        "name",
        "policy",
        "customer",
        "office_branch",
        "status",
        "due_date",
        "renewal_date",
        "lost_reason_code",
      ],
      order_by: "due_date asc, modified desc",
      limit_page_length: Number(filters.limit) || 40,
    };
    const clauses = [];
    const query = normalizeText(filters.query);
    if (query) {
      clauses.push(["policy", "like", `%${query}%`]);
    }
    if (filters.status) {
      clauses.push(["status", "=", filters.status]);
    }
    if (filters.policyQuery) {
      clauses.push(["policy", "like", `%${String(filters.policyQuery || "").trim()}%`]);
    }
    if (filters.dueScope) {
      clauses.push(["due_date", "=", filters.dueScope]);
    }
    if (clauses.length) {
      params.filters = clauses;
    }
    return withOfficeBranchFilter(params);
  }

  function withOfficeBranchFilter(params) {
    const officeBranch = branchStore.requestBranch || "";
    if (!officeBranch) return params;
    return {
      ...params,
      filters: {
        ...(params.filters || {}),
        office_branch: officeBranch,
      },
    };
  }

  function applyRenewalFilters() {
    return reloadRenewals();
  }

  function resetRenewalFilterState() {
    if (typeof renewalStore.resetFilters === "function") {
      renewalStore.resetFilters();
      return;
    }
    renewalStore.reset?.();
  }

  function currentRenewalPresetPayload() {
    return {
      query: filters.query,
      status: filters.status,
      policyQuery: filters.policyQuery,
      dueScope: filters.dueScope,
      limit: Number(filters.limit) || 40,
    };
  }

  function setRenewalFilterStateFromPayload(payload) {
    filters.query = String(payload?.query || "");
    filters.status = String(payload?.status || "");
    filters.policyQuery = String(payload?.policyQuery || "");
    filters.dueScope = String(payload?.dueScope || "");
    filters.limit = Number(payload?.limit || 40) || 40;
  }

  function resetRenewalFilters() {
    applyPreset("default", { refresh: false });
    return reloadRenewals();
  }

  function prepareQuickRenewalDialog({ form }) {
    if (!form.due_date) form.due_date = isoDateOffset(30);
    if (!form.renewal_date) form.renewal_date = isoDateOffset(30);
  }

  function formatLostReason(task) {
    return task?.lost_reason_code || task?.lost_reason_detail || "";
  }

  async function updateRenewalStatus(task, nextStatus) {
    if (!task?.name || !nextStatus) return;
    await renewalMutationResource.submit({
      doctype: "AT Renewal Task",
      name: task.name,
      data: { status: nextStatus },
    });
    await reloadRenewals();
  }

  function syncRenewalRouteFilters({ refresh = true } = {}) {
    const routePolicy = String(route.query.policy || "").trim();
    if (!routePolicy || filters.policyQuery === routePolicy) return;
    renewalStore.setFilters({ policyQuery: routePolicy });
    if (refresh) void reloadRenewals();
  }

  const { presetKey, presetOptions, canDeletePreset, applyPreset, onPresetChange, savePreset, deletePreset, persistPresetStateToServer, hydratePresetStateFromServer } = useCustomFilterPresets({
    screen: "renewals_board",
    presetStorageKey: "at:renewals-board:preset",
    presetListStorageKey: "at:renewals-board:preset-list",
    t,
    getCurrentPayload: currentRenewalPresetPayload,
    setFilterStateFromPayload: setRenewalFilterStateFromPayload,
    resetFilterState: resetRenewalFilterState,
    refresh: reloadRenewals,
    getSortLocale: () => localeCode.value,
  });

  onMounted(() => {
    syncRenewalRouteFilters({ refresh: false });
    applyPreset(presetKey.value, { refresh: false });
    void hydratePresetStateFromServer();
  });

  watch(
    () => branchStore.selected,
    () => {
      const officeFilters = buildOfficeBranchLookupFilters();
      renewalQuickPolicyResource.params = {
        doctype: "AT Policy",
        fields: ["name", "policy_no", "customer"],
        filters: officeFilters,
        order_by: "modified desc",
        limit_page_length: 500,
      };
      renewalQuickCustomerResource.params = {
        doctype: "AT Customer",
        fields: ["name", "full_name"],
        filters: officeFilters,
        order_by: "modified desc",
        limit_page_length: 500,
      };
      void renewalQuickPolicyResource.reload();
      void renewalQuickCustomerResource.reload();
      void reloadRenewals();
    }
  );

  watch(
    () => route.query.policy,
    () => {
      syncRenewalRouteFilters();
    },
    { immediate: true }
  );

  return {
    activeLocale,
    localeCode,
    filters,
    renewalStatusOptions,
    lostReasonColumnLabel,
    activeFilterCount,
    presetKey,
    presetOptions,
    canDeletePreset,
    applyPreset,
    onPresetChange,
    savePreset,
    deletePreset,
    renewalsResource,
    renewalMutationResource,
    renewalQuickPolicyResource,
    renewalQuickCustomerResource,
    renewalPolicyLookupRows,
    renewalCustomerLookupRows,
    renewalPolicyLookupMap,
    renewalCustomerLookupMap,
    renewalsRaw,
    renewalsLoading,
    renewalMutationLoading,
    renewals,
    showQuickRenewalDialog,
    renewalQuickOptionsMap,
    quickRenewalEyebrow,
    quickRenewalSuccessHandlers,
    renewalSummaryItems,
    renewalCards,
    boardColumns,
    renewalsError,
    reloadRenewals,
    downloadRenewalExport,
    canMoveRenewalToStatus,
    openPolicy,
    openRenewalDetail,
    formatDate,
    formatCount,
    formatRenewalPremium,
    getRenewalDaysUntilDue,
    buildInitials,
    getRenewalPriorityMeta,
    getRenewalBoardColumnKey,
    buildRenewalBoardCard,
    isoDateOffset,
    normalizeText,
    toStartOfDay,
    matchesDueScope,
    buildRenewalListParams,
    withOfficeBranchFilter,
    applyRenewalFilters,
    resetRenewalFilterState,
    currentRenewalPresetPayload,
    setRenewalFilterStateFromPayload,
    resetRenewalFilters,
    prepareQuickRenewalDialog,
    formatLostReason,
    updateRenewalStatus,
    syncRenewalRouteFilters,
  };
}
