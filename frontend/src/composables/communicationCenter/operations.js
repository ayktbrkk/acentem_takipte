import { ref } from "vue";

import { isPermissionDeniedError } from "./helpers";

export function useCommunicationCenterOperations({ filters, reloadSnapshot, resources, t }) {
  const dispatching = ref(false);
  const operationError = ref("");
  const campaignRunSelection = ref("");
  const campaignRunLoading = ref(false);
  const campaignRunError = ref("");
  const campaignRunResult = ref(null);
  const segmentPreviewSegment = ref("");
  const segmentPreviewLoading = ref(false);
  const segmentPreviewError = ref("");
  const segmentPreviewPayload = ref(null);

  async function runDispatchCycle() {
    dispatching.value = true;
    operationError.value = "";
    try {
      await resources.runCycleResource.submit({ limit: filters.limit, include_failed: 1 });
      await reloadSnapshot();
    } catch (error) {
      operationError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
    } finally {
      dispatching.value = false;
    }
  }

  async function retryOutbox(outboxName) {
    operationError.value = "";
    try {
      await resources.retryOutboxResource.submit({ outbox_name: outboxName });
      await reloadSnapshot();
    } catch (error) {
      operationError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
    }
  }

  async function sendDraftNow(draftName) {
    operationError.value = "";
    try {
      await resources.sendDraftResource.submit({ draft_name: draftName });
      await reloadSnapshot();
    } catch (error) {
      operationError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
    }
  }

  async function updateAssignmentContextStatus(status) {
    if (!String(status || "").trim()) return;
    operationError.value = "";
    try {
      await resources.auxMutationResource.submit({
        doctype: "AT Ownership Assignment",
        name: filters.referenceName,
        data: { status },
      });
      await reloadSnapshot();
    } catch (error) {
      operationError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
    }
  }

  async function startAssignmentContext() {
    await updateAssignmentContextStatus("In Progress");
  }

  async function blockAssignmentContext() {
    await updateAssignmentContextStatus("Blocked");
  }

  async function closeAssignmentContext() {
    await updateAssignmentContextStatus("Done");
  }

  async function clearCallNoteContext() {
    operationError.value = "";
    try {
      await resources.auxMutationResource.submit({
        doctype: "AT Call Note",
        name: filters.referenceName,
        data: {
          next_follow_up_on: null,
        },
      });
      await reloadSnapshot();
    } catch (error) {
      operationError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
    }
  }

  async function completeReminderContext() {
    operationError.value = "";
    try {
      await resources.auxMutationResource.submit({
        doctype: "AT Reminder",
        name: filters.referenceName,
        data: {
          status: "Done",
        },
      });
      await reloadSnapshot();
    } catch (error) {
      operationError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
    }
  }

  async function cancelReminderContext() {
    operationError.value = "";
    try {
      await resources.auxMutationResource.submit({
        doctype: "AT Reminder",
        name: filters.referenceName,
        data: {
          status: "Cancelled",
        },
      });
      await reloadSnapshot();
    } catch (error) {
      operationError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
    }
  }

  async function loadSegmentPreview() {
    if (!segmentPreviewSegment.value) return;
    segmentPreviewLoading.value = true;
    segmentPreviewError.value = "";
    try {
      const result = await resources.segmentPreviewResource.submit({
        segment_name: segmentPreviewSegment.value,
        limit: 20,
      });
      segmentPreviewPayload.value = result || null;
    } catch (error) {
      segmentPreviewPayload.value = null;
      segmentPreviewError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedRead")
        : error?.message || error?.exc || t("loadErrorTitle");
    } finally {
      segmentPreviewLoading.value = false;
    }
  }

  async function runCampaignExecution() {
    if (!campaignRunSelection.value) return;
    campaignRunLoading.value = true;
    campaignRunError.value = "";
    try {
      const result = await resources.campaignRunResource.submit({
        campaign_name: campaignRunSelection.value,
        limit: 200,
      });
      campaignRunResult.value = result || null;
      await reloadSnapshot();
    } catch (error) {
      campaignRunResult.value = null;
      campaignRunError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.message || error?.exc || t("loadErrorTitle");
    } finally {
      campaignRunLoading.value = false;
    }
  }

  return {
    dispatching,
    operationError,
    campaignRunSelection,
    campaignRunLoading,
    campaignRunError,
    campaignRunResult,
    segmentPreviewSegment,
    segmentPreviewLoading,
    segmentPreviewError,
    segmentPreviewPayload,
    runDispatchCycle,
    retryOutbox,
    sendDraftNow,
    startAssignmentContext,
    blockAssignmentContext,
    closeAssignmentContext,
    clearCallNoteContext,
    completeReminderContext,
    cancelReminderContext,
    loadSegmentPreview,
    runCampaignExecution,
  };
}
