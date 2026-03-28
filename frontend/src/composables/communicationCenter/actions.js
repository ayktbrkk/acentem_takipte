import { ref } from "vue";
import { useRouter } from "vue-router";

import { getSourcePanelConfig } from "../../utils/sourcePanel";
import { isPermissionDeniedError } from "./common";

export function useCommunicationCenterActions({
  auxMutationResource,
  canCancelReminderContext,
  canClearCallNoteContext,
  canCloseAssignmentContext,
  canCompleteReminderContext,
  canRetryOutboxAction,
  canRunDispatchCycle,
  canSendDraftNowAction,
  filters,
  reloadSnapshot,
  retryOutboxResource,
  runCycleResource,
  sendDraftResource,
  t,
}) {
  const router = useRouter();
  const dispatching = ref(false);
  const operationError = ref("");

  function notifyActionError(error) {
    operationError.value = isPermissionDeniedError(error)
      ? t("permissionDeniedAction")
      : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
  }

  async function runDispatchCycle() {
    if (!canRunDispatchCycle.value) return;
    dispatching.value = true;
    operationError.value = "";
    try {
      await runCycleResource.submit({ limit: filters.limit, include_failed: 1 });
      await reloadSnapshot();
    } catch (error) {
      notifyActionError(error);
    } finally {
      dispatching.value = false;
    }
  }

  async function retryOutbox(outboxName) {
    if (!canRetryOutboxAction.value) return;
    operationError.value = "";
    try {
      await retryOutboxResource.submit({ outbox_name: outboxName });
      await reloadSnapshot();
    } catch (error) {
      notifyActionError(error);
    }
  }

  async function sendDraftNow(draftName) {
    if (!canSendDraftNowAction.value) return;
    operationError.value = "";
    try {
      await sendDraftResource.submit({ draft_name: draftName });
      await reloadSnapshot();
    } catch (error) {
      notifyActionError(error);
    }
  }

  async function updateAssignmentContextStatus(status) {
    if (!String(status || "").trim()) return;
    if (!canCloseAssignmentContext.value) return;
    operationError.value = "";
    try {
      await auxMutationResource.submit({
        doctype: "AT Ownership Assignment",
        name: filters.referenceName,
        data: {
          status,
        },
      });
      await reloadSnapshot();
    } catch (error) {
      notifyActionError(error);
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
    if (!canClearCallNoteContext.value) return;
    operationError.value = "";
    try {
      await auxMutationResource.submit({
        doctype: "AT Call Note",
        name: filters.referenceName,
        data: {
          next_follow_up_on: null,
        },
      });
      await reloadSnapshot();
    } catch (error) {
      notifyActionError(error);
    }
  }

  async function completeReminderContext() {
    if (!canCompleteReminderContext.value) return;
    operationError.value = "";
    try {
      await auxMutationResource.submit({
        doctype: "AT Reminder",
        name: filters.referenceName,
        data: {
          status: "Done",
        },
      });
      await reloadSnapshot();
    } catch (error) {
      notifyActionError(error);
    }
  }

  async function cancelReminderContext() {
    if (!canCancelReminderContext.value) return;
    operationError.value = "";
    try {
      await auxMutationResource.submit({
        doctype: "AT Reminder",
        name: filters.referenceName,
        data: {
          status: "Cancelled",
        },
      });
      await reloadSnapshot();
    } catch (error) {
      notifyActionError(error);
    }
  }

  function canRetryOutboxRow(row) {
    return canRetryOutboxAction.value && ["Failed", "Dead"].includes(String(row?.status || ""));
  }

  function canSendDraftFromOutboxRow(row) {
    return canSendDraftNowAction.value && row?.status !== "Sent" && Boolean(row?.draft);
  }

  function canSendDraftCard(draft) {
    return canSendDraftNowAction.value && draft?.status !== "Sent";
  }

  function sourcePanelConfig(item) {
    return getSourcePanelConfig(item?.reference_doctype, item?.reference_name);
  }

  function canOpenPanel(item) {
    return Boolean(sourcePanelConfig(item));
  }

  function panelActionLabel(item) {
    const cfg = sourcePanelConfig(item);
    return cfg ? t(cfg.labelKey) : "";
  }

  function openPanel(item) {
    const cfg = sourcePanelConfig(item);
    if (!cfg?.url) return;
    router.push(cfg.url);
  }

  return {
    blockAssignmentContext,
    canOpenPanel,
    canRetryOutboxRow,
    canSendDraftCard,
    canSendDraftFromOutboxRow,
    cancelReminderContext,
    clearCallNoteContext,
    closeAssignmentContext,
    completeReminderContext,
    dispatching,
    openPanel,
    operationError,
    panelActionLabel,
    retryOutbox,
    runDispatchCycle,
    sendDraftNow,
    sourcePanelConfig,
    startAssignmentContext,
    updateAssignmentContextStatus,
  };
}
