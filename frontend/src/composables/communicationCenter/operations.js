import { ref } from "vue";
import { createResource } from "frappe-ui";

import { isPermissionDeniedError } from "./common";

export function useCommunicationCenterOperations({
  t,
  filters,
  activeLocale,
  branchStore,
  router,
  reloadSnapshot,
  canSendDraftNowAction,
  canRetryOutboxAction,
  canRunDispatchCycle,
  canCloseAssignmentContext,
  canClearCallNoteContext,
  canCompleteReminderContext,
  canCancelReminderContext,
  canReturnToContext,
  safeReturnTo,
}) {
  const dispatching = ref(false);
  const operationError = ref("");
  const showSegmentDialog = ref(false);
  const showCampaignDialog = ref(false);
  const showCallNoteDialog = ref(false);
  const showReminderDialog = ref(false);
  const showQuickMessageDialog = ref(false);

  const runCycleResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.run_dispatch_cycle",
  });
  const sendDraftResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.send_draft_now",
  });
  const retryOutboxResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.retry_outbox_item",
  });
  const auxMutationResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.quick_create.update_quick_aux_record",
  });

  async function runDispatchCycle() {
    if (!canRunDispatchCycle.value) return;
    dispatching.value = true;
    operationError.value = "";
    try {
      await runCycleResource.submit({ limit: filters.limit, include_failed: 1 });
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
    if (!canRetryOutboxAction.value) return;
    operationError.value = "";
    try {
      await retryOutboxResource.submit({ outbox_name: outboxName });
      await reloadSnapshot();
    } catch (error) {
      operationError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
    }
  }

  async function sendDraftNow(draftName) {
    if (!canSendDraftNowAction.value) return;
    operationError.value = "";
    try {
      await sendDraftResource.submit({ draft_name: draftName });
      await reloadSnapshot();
    } catch (error) {
      operationError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
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
    if (!canClearCallNoteContext.value) return;
    operationError.value = "";
    try {
      await auxMutationResource.submit({
        doctype: "AT Call Note",
        name: filters.referenceName,
        data: { next_follow_up_on: null },
      });
      await reloadSnapshot();
    } catch (error) {
      operationError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
    }
  }

  async function completeReminderContext() {
    if (!canCompleteReminderContext.value) return;
    operationError.value = "";
    try {
      await auxMutationResource.submit({
        doctype: "AT Reminder",
        name: filters.referenceName,
        data: { status: "Done" },
      });
      await reloadSnapshot();
    } catch (error) {
      operationError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
    }
  }

  async function cancelReminderContext() {
    if (!canCancelReminderContext.value) return;
    operationError.value = "";
    try {
      await auxMutationResource.submit({
        doctype: "AT Reminder",
        name: filters.referenceName,
        data: { status: "Cancelled" },
      });
      await reloadSnapshot();
    } catch (error) {
      operationError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
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

  function buildQuickMessagePayload({ form, openAfter }) {
    return {
      template: form.template || null,
      channel: form.channel || null,
      language: form.language || null,
      customer: form.customer || null,
      office_branch: branchStore.requestBranch || null,
      recipient: form.recipient || null,
      reference_doctype: form.reference_doctype || null,
      reference_name: form.reference_name || null,
      subject: form.subject || null,
      body: form.body || null,
      send_now: openAfter ? 1 : 0,
    };
  }

  async function prepareQuickMessageDialog({ form }) {
    if (filters.customer && !form.customer) form.customer = filters.customer;
    if (filters.channel && !form.channel) form.channel = filters.channel;
    if (filters.referenceDoctype && !form.reference_doctype) form.reference_doctype = filters.referenceDoctype;
    if (filters.referenceName && !form.reference_name) form.reference_name = filters.referenceName;
    if (!form.language) form.language = activeLocale.value === "tr" ? "tr" : "en";
  }

  async function prepareCallNoteDialog({ form }) {
    if (filters.customer && !form.customer) form.customer = filters.customer;
    if (filters.referenceDoctype === "AT Policy" && filters.referenceName && !form.policy) form.policy = filters.referenceName;
    if (filters.referenceDoctype === "AT Claim" && filters.referenceName && !form.claim) form.claim = filters.referenceName;
    if (!form.note_at) form.note_at = new Date().toISOString().slice(0, 16);
  }

  async function prepareReminderDialog({ form }) {
    if (filters.customer && !form.customer) form.customer = filters.customer;
    if (filters.referenceDoctype && !form.source_doctype) form.source_doctype = filters.referenceDoctype;
    if (filters.referenceName && !form.source_name) form.source_name = filters.referenceName;
    if (filters.referenceDoctype === "AT Policy" && filters.referenceName && !form.policy) form.policy = filters.referenceName;
    if (filters.referenceDoctype === "AT Claim" && filters.referenceName && !form.claim) form.claim = filters.referenceName;
    if (!form.remind_at) form.remind_at = new Date().toISOString().slice(0, 16);
  }

  const quickMessageDialogLabels = {
    save: t("saveDraft"),
    saveAndOpen: t("sendImmediately"),
  };
  const quickMessageSuccessHandlers = {
    communication_snapshot: async () => {
      await reloadSnapshot();
    },
  };
  const callNoteSuccessHandlers = {
    "call-notes-list": async () => {},
  };
  const reminderSuccessHandlers = {
    "reminders-list": async () => {
      await reloadSnapshot();
    },
  };
  const segmentSuccessHandlers = {
    "segments-list": async () => {},
  };
  const campaignSuccessHandlers = {
    "campaigns-list": async () => {},
  };

  function returnToContext() {
    if (!canReturnToContext.value) return;
    if (safeReturnTo.value) {
      router.push(safeReturnTo.value);
      return;
    }
    router.back();
  }

  return {
    dispatching,
    operationError,
    showSegmentDialog,
    showCampaignDialog,
    showCallNoteDialog,
    showReminderDialog,
    showQuickMessageDialog,
    runCycleResource,
    sendDraftResource,
    retryOutboxResource,
    auxMutationResource,
    runDispatchCycle,
    retryOutbox,
    sendDraftNow,
    startAssignmentContext,
    blockAssignmentContext,
    closeAssignmentContext,
    clearCallNoteContext,
    completeReminderContext,
    cancelReminderContext,
    canRetryOutboxRow,
    canSendDraftFromOutboxRow,
    canSendDraftCard,
    buildQuickMessagePayload,
    prepareQuickMessageDialog,
    prepareCallNoteDialog,
    prepareReminderDialog,
    quickMessageDialogLabels,
    quickMessageSuccessHandlers,
    callNoteSuccessHandlers,
    reminderSuccessHandlers,
    segmentSuccessHandlers,
    campaignSuccessHandlers,
    returnToContext,
  };
}
