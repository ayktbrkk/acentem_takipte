import { computed, unref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useAuthStore } from "../../stores/auth";
import { useCommunicationStore } from "../../stores/communication";
import { resolveSameOriginPath } from "../../utils/safeNavigation";
import { useCustomFilterPresets } from "../useCustomFilterPresets";

function resourceValue(resource, fallback = null) {
  const value = unref(resource?.data);
  return value == null ? fallback : value;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function useCommunicationCenterState({
  activeLocale,
  reloadSnapshot,
  communicationQuickTemplateResource,
  communicationQuickCustomerResource,
  communicationQuickPolicyResource,
  communicationQuickClaimResource,
  communicationQuickSegmentResource,
  communicationQuickCampaignResource,
  statusCards,
  t,
  statusLabel,
  channelLabel,
  referenceTypeLabel,
}) {
  const authStore = useAuthStore();
  const communicationStore = useCommunicationStore();
  const route = useRoute();
  const router = useRouter();
  const filters = communicationStore.state.filters;

  function resetCommunicationFilterState() {
    communicationStore.resetFilters();
  }

  function currentCommunicationPresetPayload() {
    return {
      customer: filters.customer,
      status: filters.status,
      channel: filters.channel,
      referenceDoctype: filters.referenceDoctype,
      referenceName: filters.referenceName,
      limit: Number(filters.limit) || 50,
    };
  }

  function setCommunicationFilterStateFromPayload(payload) {
    filters.customer = String(payload?.customer || "");
    filters.status = String(payload?.status || "");
    filters.channel = String(payload?.channel || "");
    filters.referenceDoctype = String(payload?.referenceDoctype || "");
    filters.referenceName = String(payload?.referenceName || "");
    filters.limit = Number(payload?.limit || 50) || 50;
  }

  const {
    presetKey,
    presetOptions,
    canDeletePreset,
    applyPreset,
    onPresetChange,
    savePreset,
    deletePreset,
    persistPresetStateToServer,
    hydratePresetStateFromServer,
  } = useCustomFilterPresets({
    screen: "communication_center",
    presetStorageKey: "at:communication-center:preset",
    presetListStorageKey: "at:communication-center:preset-list",
    t,
    getCurrentPayload: currentCommunicationPresetPayload,
    setFilterStateFromPayload: setCommunicationFilterStateFromPayload,
    resetFilterState: resetCommunicationFilterState,
    refresh: reloadSnapshot,
    getSortLocale: () => (activeLocale.value === "tr" ? "tr-TR" : "en-US"),
  });

  const customerContextLabel = computed(
    () => String(route.query.customer_label || filters.customer || "").trim() || String(filters.customer || "").trim()
  );
  const referenceContextLabel = computed(() => {
    const doctype = String(route.query.reference_label || filters.referenceDoctype || "").trim();
    const name = String(filters.referenceName || "").trim();
    if (!doctype && !name) return "";
    if (!doctype) return name;
    if (!name) return doctype;
    return `${doctype} / ${name}`;
  });
  const channelStatusContextLabel = computed(() => {
    const parts = [];
    if (filters.channel) parts.push(`${t("channel")}: ${channelLabel(filters.channel)}`);
    if (filters.status) parts.push(`${t("status")}: ${statusLabel(filters.status)}`);
    return parts.join(" • ");
  });
  const hasContextFilters = computed(
    () => Boolean(filters.customer || filters.referenceDoctype || filters.referenceName || filters.channel || filters.status)
  );
  const canStartAssignmentContext = computed(
    () => filters.referenceDoctype === "AT Ownership Assignment" && Boolean(String(filters.referenceName || "").trim())
  );
  const canBlockAssignmentContext = computed(
    () => filters.referenceDoctype === "AT Ownership Assignment" && Boolean(String(filters.referenceName || "").trim())
  );
  const canCloseAssignmentContext = computed(
    () => filters.referenceDoctype === "AT Ownership Assignment" && Boolean(String(filters.referenceName || "").trim())
  );
  const canClearCallNoteContext = computed(
    () => filters.referenceDoctype === "AT Call Note" && Boolean(String(filters.referenceName || "").trim())
  );
  const canCompleteReminderContext = computed(
    () => filters.referenceDoctype === "AT Reminder" && Boolean(String(filters.referenceName || "").trim())
  );
  const canCancelReminderContext = computed(
    () => filters.referenceDoctype === "AT Reminder" && Boolean(String(filters.referenceName || "").trim())
  );
  const statusOptions = computed(() => [
    { value: "Queued", label: t("queued") },
    { value: "Processing", label: t("processing") },
    { value: "Sent", label: t("sent") },
    { value: "Failed", label: t("failed") },
    { value: "Dead", label: t("dead") },
  ]);
  const channelOptions = computed(() => [
    { value: "SMS", label: t("sms") },
    { value: "Email", label: t("email") },
    { value: "WHATSAPP", label: t("whatsapp") },
  ]);
  const referenceDoctypeOptions = computed(() => [
    { value: "AT Customer", label: referenceTypeLabel("AT Customer") },
    { value: "AT Lead", label: referenceTypeLabel("AT Lead") },
    { value: "AT Offer", label: referenceTypeLabel("AT Offer") },
    { value: "AT Policy", label: referenceTypeLabel("AT Policy") },
    { value: "AT Claim", label: referenceTypeLabel("AT Claim") },
    { value: "AT Payment", label: referenceTypeLabel("AT Payment") },
    { value: "AT Reminder", label: referenceTypeLabel("AT Reminder") },
    { value: "AT Renewal Task", label: referenceTypeLabel("AT Renewal Task") },
    { value: "AT Accounting Entry", label: referenceTypeLabel("AT Accounting Entry") },
    { value: "AT Reconciliation Item", label: referenceTypeLabel("AT Reconciliation Item") },
    { value: "AT Segment", label: referenceTypeLabel("AT Segment") },
    { value: "AT Campaign", label: referenceTypeLabel("AT Campaign") },
  ]);
  const communicationQuickOptionsMap = computed(() => ({
    notificationTemplates: asArray(resourceValue(communicationQuickTemplateResource, [])).map((row) => ({
      value: row.name,
      label: `${row.template_key || row.name}${row.channel ? ` (${channelLabel(row.channel)})` : ""}`,
    })),
    customers: asArray(resourceValue(communicationQuickCustomerResource, [])).map((row) => ({
      value: row.name,
      label: row.full_name || row.name,
    })),
    policies: asArray(resourceValue(communicationQuickPolicyResource, [])).map((row) => ({
      value: row.name,
      label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
    })),
    claims: asArray(resourceValue(communicationQuickClaimResource, [])).map((row) => ({
      value: row.name,
      label: `${row.claim_no || row.name}${row.policy ? ` - ${row.policy}` : ""}`,
    })),
    segments: asArray(resourceValue(communicationQuickSegmentResource, [])).map((row) => ({
      value: row.name,
      label: `${row.segment_name || row.name}${row.channel_focus ? ` - ${channelLabel(row.channel_focus)}` : ""}`,
    })),
    campaigns: asArray(resourceValue(communicationQuickCampaignResource, [])).map((row) => ({
      value: row.name,
      label: `${row.campaign_name || row.name}${row.channel ? ` - ${channelLabel(row.channel)}` : ""}`,
    })),
  }));
  const quickSegmentEyebrow = computed(() => (activeLocale.value === "tr" ? "Hızlı Segment" : "Quick Segment"));
  const quickCampaignEyebrow = computed(() => (activeLocale.value === "tr" ? "Hızlı Kampanya" : "Quick Campaign"));
  const quickCallNoteEyebrow = computed(() => (activeLocale.value === "tr" ? "Hızlı Arama Notu" : "Quick Call Note"));
  const quickReminderEyebrow = computed(() => (activeLocale.value === "tr" ? "Hızlı Hatırlatıcı" : "Quick Reminder"));
  const quickMessageEyebrow = computed(() => (activeLocale.value === "tr" ? "Hızlı Mesaj" : "Quick Message"));
  const canCreateQuickMessage = computed(() => authStore.can(["quickCreate", "communication_message"]));
  const canSendDraftNowAction = computed(() => authStore.can(["actions", "communication", "sendDraftNow"]));
  const canRetryOutboxAction = computed(() => authStore.can(["actions", "communication", "retryOutbox"]));
  const canRunDispatchCycle = computed(() => authStore.can(["actions", "communication", "runDispatchCycle"]));
  const returnToTarget = computed(() => String(route.query.return_to || "").trim());
  const safeReturnTo = computed(() => resolveSameOriginPath(String(route.query.return_to || "").trim()) || "");
  const canReturnToContext = computed(() => Boolean(safeReturnTo.value || hasContextFilters.value));
  const returnToLabel = computed(() => {
    if (safeReturnTo.value) return activeLocale.value === "tr" ? "Kaynaga Don" : "Back to Source";
    return activeLocale.value === "tr" ? "Geri" : "Back";
  });
  const quickMessageDialogLabels = computed(() => ({
    save: t("saveDraft"),
    saveAndOpen: t("sendImmediately"),
  }));

  return {
    activeLocale,
    canBlockAssignmentContext,
    canCancelReminderContext,
    canClearCallNoteContext,
    canCloseAssignmentContext,
    canCompleteReminderContext,
    canCreateQuickMessage,
    canDeletePreset,
    canReturnToContext,
    canRetryOutboxAction,
    canRunDispatchCycle,
    canSendDraftNowAction,
    channelOptions,
    channelStatusContextLabel,
    communicationQuickOptionsMap,
    customerContextLabel,
    deletePreset,
    filters,
    hasContextFilters,
    hydratePresetStateFromServer,
    onPresetChange,
    persistPresetStateToServer,
    presetKey,
    presetOptions,
    quickCallNoteEyebrow,
    quickCampaignEyebrow,
    quickMessageDialogLabels,
    quickMessageEyebrow,
    quickReminderEyebrow,
    quickSegmentEyebrow,
    referenceContextLabel,
    referenceDoctypeOptions,
    returnToLabel,
    returnToTarget,
    safeReturnTo,
    savePreset,
    setCommunicationFilterStateFromPayload,
    statusOptions,
    statusCards,
    statusLabel,
    channelLabel,
    referenceTypeLabel,
    canStartAssignmentContext,
    applyPreset,
    resetCommunicationFilterState,
    currentCommunicationPresetPayload,
    clearCustomerFilter: () => {
      filters.customer = "";
      const nextQuery = { ...route.query };
      delete nextQuery.customer;
      delete nextQuery.customer_label;
      router.replace({ query: nextQuery });
    },
    clearContextFilters: () => {
      communicationStore.setFilters({
        customer: "",
        status: "",
        channel: "",
        referenceDoctype: "",
        referenceName: "",
      });
      const nextQuery = { ...route.query };
      delete nextQuery.customer;
      delete nextQuery.customer_label;
      delete nextQuery.status;
      delete nextQuery.channel;
      delete nextQuery.reference_doctype;
      delete nextQuery.reference_name;
      delete nextQuery.reference_label;
      router.replace({ query: nextQuery });
    },
    applySnapshotFilters: () => reloadSnapshot(),
    resetSnapshotFilters: () => {
      applyPreset("default", { refresh: false });
      void persistPresetStateToServer();
      communicationStore.setFilters({
        customer: "",
        status: "",
        channel: "",
        referenceDoctype: "",
        referenceName: "",
      });
      const nextQuery = { ...route.query };
      delete nextQuery.customer;
      delete nextQuery.customer_label;
      delete nextQuery.status;
      delete nextQuery.channel;
      delete nextQuery.reference_doctype;
      delete nextQuery.reference_name;
      delete nextQuery.reference_label;
      router.replace({ query: nextQuery });
      void reloadSnapshot();
    },
    returnToContext: () => {
      if (!canReturnToContext.value) return;
      if (safeReturnTo.value) {
        router.push(safeReturnTo.value);
        return;
      }
      router.back();
    },
  };
}
