import { ref } from "vue";
import { isPermissionDeniedError } from "./helpers";
import { useCommunicationCenterOperations } from "./operations";
import { useCommunicationCenterResources } from "./resources";
import { resolveSameOriginPath } from "../../utils/safeNavigation";
import { openTabularExport } from "../../utils/listExport";

export function useCommunicationCenterRuntime({ route, router, branchStore, communicationStore, filters, t }) {
  const showSegmentDialog = ref(false);
  const showCampaignDialog = ref(false);
  const showCampaignRunDialog = ref(false);
  const showSegmentPreviewDialog = ref(false);
  const showCallNoteDialog = ref(false);
  const showReminderDialog = ref(false);
  const showQuickMessageDialog = ref(false);

  const openSegmentDialog = () => {
    showSegmentDialog.value = true;
  };

  const openCampaignDialog = () => {
    showCampaignDialog.value = true;
  };

  const openCampaignRunDialog = () => {
    showCampaignRunDialog.value = true;
  };

  const openSegmentPreviewDialog = () => {
    showSegmentPreviewDialog.value = true;
  };

  const openCallNoteDialog = () => {
    showCallNoteDialog.value = true;
  };

  const openReminderDialog = () => {
    showReminderDialog.value = true;
  };

  const openQuickMessageDialog = () => {
    showQuickMessageDialog.value = true;
  };

  const resources = useCommunicationCenterResources({ branchStore, filters });
  const operations = useCommunicationCenterOperations({
    filters,
    reloadSnapshot,
    resources,
    t,
  });

  function buildParams() {
    return {
      customer: filters.customer || null,
      status: filters.status || null,
      channel: filters.channel || null,
      reference_doctype: filters.referenceDoctype || null,
      reference_name: filters.referenceName || null,
      office_branch: branchStore.requestBranch || null,
      limit: filters.limit,
    };
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

  function resetCommunicationFilterState() {
    communicationStore.resetFilters();
  }

  function hasRouteContextQuery() {
    return Boolean(
      route.query.customer ||
        route.query.status ||
        route.query.channel ||
        route.query.reference_doctype ||
        route.query.reference_name,
    );
  }

  function reloadSnapshot() {
    operations.operationError.value = "";
    resources.snapshotResource.params = buildParams();
    communicationStore.setLoading(true);
    communicationStore.clearError();
    return resources.snapshotResource
      .reload()
      .then((result) => {
        communicationStore.setSnapshot(result || {});
        communicationStore.setLoading(false);
        return result;
      })
      .catch((error) => {
        const message = isPermissionDeniedError(error)
          ? t("permissionDeniedRead")
          : error?.message || error?.exc || t("loadErrorTitle");
        communicationStore.setSnapshot({});
        communicationStore.setError(message);
        communicationStore.setLoading(false);
        throw error;
      });
  }

  function downloadCommunicationExport(format) {
    openTabularExport({
      permissionDoctypes: ["AT Notification Outbox", "AT Notification Draft"],
      exportKey: "communication_center",
      title: t("title"),
      columns: [
        t("recordType"),
        t("status"),
        t("channel"),
        t("recipient"),
        t("attempts"),
        t("nextRetry"),
        t("referenceContext"),
        t("error"),
      ],
      rows: [
        ...communicationStore.outboxItems.map((row) => ({
          [t("recordType")]: t("outboxTitle"),
          [t("status")]: `${t("outboxTitle")} / ${row.status || "-"}`,
          [t("channel")]: row.channel || "-",
          [t("recipient")]: row.recipient || "-",
          [t("attempts")]: `${row.attempt_count || 0}/${row.max_attempts || 0}`,
          [t("nextRetry")]: row.next_retry_on || "-",
          [t("referenceContext")]: [row.reference_doctype, row.reference_name].filter(Boolean).join(" / ") || "-",
          [t("error")]: row.error_message || "-",
        })),
        ...communicationStore.draftItems.map((row) => ({
          [t("recordType")]: t("draftTitle"),
          [t("status")]: `${t("draftTitle")} / ${row.status || "-"}`,
          [t("channel")]: row.channel || "-",
          [t("recipient")]: row.recipient || "-",
          [t("attempts")]: "-",
          [t("nextRetry")]: "-",
          [t("referenceContext")]: [row.reference_doctype, row.reference_name].filter(Boolean).join(" / ") || "-",
          [t("error")]: row.error_message || "-",
        })),
      ],
      filters: currentCommunicationPresetPayload(),
      format,
    });
  }

  function reloadQuickCustomers() {
    const filtersPayload = branchStore.requestBranch ? { office_branch: branchStore.requestBranch } : {};
    resources.communicationQuickCustomerResource.params = {
      ...resources.communicationQuickCustomerResource.params,
      filters: filtersPayload,
    };
    resources.communicationQuickPolicyResource.params = {
      ...resources.communicationQuickPolicyResource.params,
      filters: filtersPayload,
    };
    resources.communicationQuickClaimResource.params = {
      ...resources.communicationQuickClaimResource.params,
      filters: filtersPayload,
    };
    resources.communicationQuickSegmentResource.params = {
      ...resources.communicationQuickSegmentResource.params,
      filters: filtersPayload,
    };
    resources.communicationQuickCampaignResource.params = {
      ...resources.communicationQuickCampaignResource.params,
      filters: filtersPayload,
    };
    return Promise.all([
      resources.communicationQuickCustomerResource.reload(),
      resources.communicationQuickPolicyResource.reload(),
      resources.communicationQuickClaimResource.reload(),
      resources.communicationQuickSegmentResource.reload(),
      resources.communicationQuickCampaignResource.reload(),
    ]);
  }

  function applySnapshotFilters() {
    return reloadSnapshot();
  }

  function clearCustomerFilter() {
    filters.customer = "";
    const nextQuery = { ...route.query };
    delete nextQuery.customer;
    delete nextQuery.customer_label;
    router.replace({ query: nextQuery });
    reloadSnapshot();
  }

  function clearContextFilters() {
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
    reloadSnapshot();
  }

  function returnToContext() {
    const returnToTarget = String(route.query.return_to || "").trim();
    const safeReturnTo = resolveSameOriginPath(returnToTarget) || "";
    const canReturn = Boolean(safeReturnTo || filters.customer || filters.referenceDoctype || filters.referenceName || filters.channel || filters.status);
    if (!canReturn) return;
    if (safeReturnTo) {
      router.push(safeReturnTo);
      return;
    }
    router.back();
  }

  return {
    showSegmentDialog,
    showCampaignDialog,
    showCampaignRunDialog,
    showSegmentPreviewDialog,
    showCallNoteDialog,
    showReminderDialog,
    showQuickMessageDialog,
    openSegmentDialog,
    openCampaignDialog,
    openCampaignRunDialog,
    openSegmentPreviewDialog,
    openCallNoteDialog,
    openReminderDialog,
    openQuickMessageDialog,
    dispatching: operations.dispatching,
    operationError: operations.operationError,
    campaignRunSelection: operations.campaignRunSelection,
    campaignRunLoading: operations.campaignRunLoading,
    campaignRunError: operations.campaignRunError,
    campaignRunResult: operations.campaignRunResult,
    segmentPreviewSegment: operations.segmentPreviewSegment,
    segmentPreviewLoading: operations.segmentPreviewLoading,
    segmentPreviewError: operations.segmentPreviewError,
    segmentPreviewPayload: operations.segmentPreviewPayload,
    snapshotResource: resources.snapshotResource,
    runCycleResource: resources.runCycleResource,
    sendDraftResource: resources.sendDraftResource,
    retryOutboxResource: resources.retryOutboxResource,
    auxMutationResource: resources.auxMutationResource,
    communicationQuickTemplateResource: resources.communicationQuickTemplateResource,
    communicationQuickCustomerResource: resources.communicationQuickCustomerResource,
    communicationQuickPolicyResource: resources.communicationQuickPolicyResource,
    communicationQuickClaimResource: resources.communicationQuickClaimResource,
    communicationQuickSegmentResource: resources.communicationQuickSegmentResource,
    communicationQuickCampaignResource: resources.communicationQuickCampaignResource,
    segmentPreviewResource: resources.segmentPreviewResource,
    campaignRunResource: resources.campaignRunResource,
    currentCommunicationPresetPayload,
    setCommunicationFilterStateFromPayload,
    resetCommunicationFilterState,
    hasRouteContextQuery,
    reloadSnapshot,
    downloadCommunicationExport,
    reloadQuickCustomers,
    applySnapshotFilters,
    clearCustomerFilter,
    clearContextFilters,
    returnToContext,
    runDispatchCycle: operations.runDispatchCycle,
    retryOutbox: operations.retryOutbox,
    sendDraftNow: operations.sendDraftNow,
    startAssignmentContext: operations.startAssignmentContext,
    blockAssignmentContext: operations.blockAssignmentContext,
    closeAssignmentContext: operations.closeAssignmentContext,
    clearCallNoteContext: operations.clearCallNoteContext,
    completeReminderContext: operations.completeReminderContext,
    cancelReminderContext: operations.cancelReminderContext,
    loadSegmentPreview: operations.loadSegmentPreview,
    runCampaignExecution: operations.runCampaignExecution,
  };
}
