import { computed, onMounted, unref, watch } from "vue";

import { useCustomFilterPresets } from "../useCustomFilterPresets";
import {
  buildCommunicationQuickOptionsMap,
  channelLabel,
  referenceTypeLabel,
  statusLabel,
  isPermissionDeniedError,
} from "./helpers";
import { resolveSameOriginPath } from "../../utils/safeNavigation";

export function useCommunicationCenterState({
  route,
  authStore,
  branchStore,
  communicationStore,
  filters,
  t,
  activeLocale,
  runtime,
}) {
  const snapshotData = computed(() => communicationStore.state.snapshot || {});
  const resourceValue = (resource, fallback = null) => {
    const value = unref(resource?.data);
    return value == null ? fallback : value;
  };
  const asArray = (value) => (Array.isArray(value) ? value : []);

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
    getCurrentPayload: runtime.currentCommunicationPresetPayload,
    setFilterStateFromPayload: runtime.setCommunicationFilterStateFromPayload,
    resetFilterState: runtime.resetCommunicationFilterState,
    refresh: runtime.reloadSnapshot,
    getSortLocale: () => (activeLocale.value === "tr" ? "tr-TR" : "en-US"),
  });

  const snapshotErrorMessage = computed(() => {
    if (communicationStore.state.error) return communicationStore.state.error;
    const raw = unref(runtime.snapshotResource.error);
    if (!raw) return "";
    if (isPermissionDeniedError(raw)) return t("permissionDeniedRead");
    if (typeof raw === "string") return raw;
    return raw?.message || raw?.exc || t("loadErrorTitle");
  });

  const outboxItems = computed(() => communicationStore.outboxItems);
  const draftItems = computed(() => communicationStore.draftItems);
  const breakdown = computed(() => communicationStore.breakdown);
  const activeFilterCount = computed(() => communicationStore.activeFilterCount);

  const customerContextLabel = computed(
    () => String(route.query.customer_label || filters.customer || "").trim() || String(filters.customer || "").trim(),
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
    if (filters.channel) parts.push(`${t("channel")}: ${channelLabel(filters.channel, t)}`);
    if (filters.status) parts.push(`${t("status")}: ${statusLabel(filters.status, t)}`);
    return parts.join(" • ");
  });
  const hasContextFilters = computed(
    () =>
      Boolean(filters.customer || filters.referenceDoctype || filters.referenceName || filters.channel || filters.status),
  );
  const canStartAssignmentContext = computed(
    () => filters.referenceDoctype === "AT Ownership Assignment" && Boolean(String(filters.referenceName || "").trim()),
  );
  const canBlockAssignmentContext = computed(
    () => filters.referenceDoctype === "AT Ownership Assignment" && Boolean(String(filters.referenceName || "").trim()),
  );
  const canCloseAssignmentContext = computed(
    () => filters.referenceDoctype === "AT Ownership Assignment" && Boolean(String(filters.referenceName || "").trim()),
  );
  const canClearCallNoteContext = computed(
    () => filters.referenceDoctype === "AT Call Note" && Boolean(String(filters.referenceName || "").trim()),
  );
  const canCompleteReminderContext = computed(
    () => filters.referenceDoctype === "AT Reminder" && Boolean(String(filters.referenceName || "").trim()),
  );
  const canCancelReminderContext = computed(
    () => filters.referenceDoctype === "AT Reminder" && Boolean(String(filters.referenceName || "").trim()),
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
    { value: "AT Customer", label: referenceTypeLabel("AT Customer", t) },
    { value: "AT Lead", label: referenceTypeLabel("AT Lead", t) },
    { value: "AT Offer", label: referenceTypeLabel("AT Offer", t) },
    { value: "AT Policy", label: referenceTypeLabel("AT Policy", t) },
    { value: "AT Claim", label: referenceTypeLabel("AT Claim", t) },
    { value: "AT Payment", label: referenceTypeLabel("AT Payment", t) },
    { value: "AT Reminder", label: referenceTypeLabel("AT Reminder", t) },
    { value: "AT Renewal Task", label: referenceTypeLabel("AT Renewal Task", t) },
    { value: "AT Accounting Entry", label: referenceTypeLabel("AT Accounting Entry", t) },
    { value: "AT Reconciliation Item", label: referenceTypeLabel("AT Reconciliation Item", t) },
    { value: "AT Segment", label: referenceTypeLabel("AT Segment", t) },
    { value: "AT Campaign", label: referenceTypeLabel("AT Campaign", t) },
  ]);
  const communicationQuickOptionsMap = computed(() =>
    buildCommunicationQuickOptionsMap({
      templateRows: resourceValue(runtime.communicationQuickTemplateResource, []),
      customerRows: resourceValue(runtime.communicationQuickCustomerResource, []),
      policyRows: resourceValue(runtime.communicationQuickPolicyResource, []),
      claimRows: resourceValue(runtime.communicationQuickClaimResource, []),
      segmentRows: resourceValue(runtime.communicationQuickSegmentResource, []),
      campaignRows: resourceValue(runtime.communicationQuickCampaignResource, []),
      channelLabel: (value) => channelLabel(value, t),
    }),
  );
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
  const safeReturnTo = computed(() => resolveSameOriginPath(returnToTarget.value) || "");
  const canReturnToContext = computed(() => Boolean(safeReturnTo.value || hasContextFilters.value));
  const returnToLabel = computed(() => {
    if (safeReturnTo.value) return activeLocale.value === "tr" ? "Kaynaga Don" : "Back to Source";
    return activeLocale.value === "tr" ? "Geri" : "Back";
  });
  const quickMessageDialogLabels = computed(() => ({
    save: t("saveDraft"),
    saveAndOpen: t("sendImmediately"),
  }));
  const segmentPreviewSummary = computed(() => runtime.segmentPreviewPayload.value?.summary || null);
  const segmentPreviewRows = computed(() => runtime.segmentPreviewPayload.value?.customers || []);
  const statusCards = computed(() =>
    communicationStore.statusCards.map((item) => ({
      key: item.key,
      label: statusLabel(item.status, t),
      value: item.value,
    })),
  );

  function resetSnapshotFilters() {
    applyPreset("default", { refresh: false });
    void persistPresetStateToServer();
    return runtime.clearContextFilters();
  }

  function applySnapshotFilters() {
    return runtime.reloadSnapshot();
  }

  onMounted(() => {
    if (!runtime.hasRouteContextQuery()) {
      applyPreset(presetKey.value, { refresh: false });
    }
    void runtime.reloadSnapshot();
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
      route.query.reference_label,
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
      runtime.reloadSnapshot();
    },
    { immediate: true },
  );

  watch(
    () => branchStore.selected,
    () => {
      void runtime.reloadQuickCustomers();
      void runtime.reloadSnapshot();
    },
  );

  return {
    snapshotData,
    snapshotErrorMessage,
    outboxItems,
    draftItems,
    breakdown,
    activeFilterCount,
    presetKey,
    presetOptions,
    canDeletePreset,
    applyPreset,
    onPresetChange,
    savePreset,
    deletePreset,
    persistPresetStateToServer,
    hydratePresetStateFromServer,
    customerContextLabel,
    referenceContextLabel,
    channelStatusContextLabel,
    hasContextFilters,
    canStartAssignmentContext,
    canBlockAssignmentContext,
    canCloseAssignmentContext,
    canClearCallNoteContext,
    canCompleteReminderContext,
    canCancelReminderContext,
    statusOptions,
    channelOptions,
    referenceDoctypeOptions,
    communicationQuickOptionsMap,
    quickSegmentEyebrow,
    quickCampaignEyebrow,
    quickCallNoteEyebrow,
    quickReminderEyebrow,
    quickMessageEyebrow,
    canCreateQuickMessage,
    canSendDraftNowAction,
    canRetryOutboxAction,
    canRunDispatchCycle,
    returnToTarget,
    safeReturnTo,
    canReturnToContext,
    returnToLabel,
    quickMessageDialogLabels,
    segmentPreviewSummary,
    segmentPreviewRows,
    applySnapshotFilters,
    resetSnapshotFilters,
    referenceTypeLabel: (doctype) => referenceTypeLabel(doctype, t),
  };
}
