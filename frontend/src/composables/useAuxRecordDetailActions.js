import { computed, unref } from "vue";
import { createResource } from "frappe-ui";

import { getSourcePanelConfig } from "../utils/sourcePanel";
import { navigateToSameOriginPath } from "../utils/safeNavigation";
import { openDocumentInNewTab } from "../utils/documentOpen";

export function useAuxRecordDetailActions({
  props,
  config,
  authStore,
  route,
  router,
  doc,
  reloadDetail,
}) {
  const auxMutationResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.quick_create.update_quick_aux_record",
    auto: false,
  });
  const sendDraftNowResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.send_draft_now",
    auto: false,
  });
  const retryOutboxResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.retry_outbox_item",
    auto: false,
  });
  const requeueOutboxResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.requeue_outbox_item",
    auto: false,
  });

  const canOpenCommunicationContext = computed(
    () =>
      [
        "AT Notification Draft",
        "AT Notification Outbox",
        "AT Reminder",
        "AT Task",
        "AT Renewal Task",
        "AT Ownership Assignment",
      ].includes(String(unref(config?.doctype) || "")) && Boolean(unref(doc)?.name)
  );

  const canOpenDocument = computed(
    () => ["files", "at-documents"].includes(String(unref(config?.key) || "")) && Boolean(unref(doc)?.name)
  );

  const isTaskDetail = computed(() => ["AT Task", "AT Renewal Task"].includes(String(unref(config?.doctype) || "")));
  const isReminderDetail = computed(() => String(unref(config?.doctype) || "") === "AT Reminder");
  const isOwnershipAssignmentDetail = computed(
    () => String(unref(config?.doctype) || "") === "AT Ownership Assignment"
  );

  const draftLifecycleStatus = computed(() => String(unref(doc)?.status || "").trim());
  const canSendDraftLifecycle = computed(
    () => String(unref(config?.doctype) || "") === "AT Notification Draft" && Boolean(unref(doc)?.name) && draftLifecycleStatus.value !== "Sent"
  );

  const outboxLifecycleStatus = computed(() => String(unref(doc)?.status || "").trim());
  const canRetryOutboxLifecycle = computed(
    () =>
      String(unref(config?.doctype) || "") === "AT Notification Outbox" &&
      Boolean(unref(doc)?.name) &&
      ["Failed", "Dead"].includes(outboxLifecycleStatus.value)
  );
  const canRequeueOutboxLifecycle = computed(
    () =>
      String(unref(config?.doctype) || "") === "AT Notification Outbox" &&
      Boolean(unref(doc)?.name) &&
      ["Queued", "Processing", "Failed", "Dead"].includes(outboxLifecycleStatus.value)
  );

  const taskLifecycleStatus = computed(() => String(unref(doc)?.status || "").trim());
  const reminderLifecycleStatus = computed(() => String(unref(doc)?.status || "").trim());
  const canStartTaskLifecycle = computed(() => isTaskDetail.value && Boolean(unref(doc)?.name) && taskLifecycleStatus.value === "Open");
  const canBlockTaskLifecycle = computed(() => isTaskDetail.value && Boolean(unref(doc)?.name) && ["Open", "In Progress"].includes(taskLifecycleStatus.value));
  const canCompleteTaskLifecycle = computed(() => isTaskDetail.value && Boolean(unref(doc)?.name) && ["Open", "In Progress", "Blocked"].includes(taskLifecycleStatus.value));
  const canCancelTaskLifecycle = computed(() => isTaskDetail.value && Boolean(unref(doc)?.name) && ["Open", "In Progress", "Blocked"].includes(taskLifecycleStatus.value));
  const canCompleteReminderLifecycle = computed(() => isReminderDetail.value && Boolean(unref(doc)?.name) && reminderLifecycleStatus.value === "Open");
  const canCancelReminderLifecycle = computed(() => isReminderDetail.value && Boolean(unref(doc)?.name) && reminderLifecycleStatus.value === "Open");

  const assignmentLifecycleStatus = computed(() => String(unref(doc)?.status || "").trim());
  const canStartAssignmentLifecycle = computed(() => isOwnershipAssignmentDetail.value && Boolean(unref(doc)?.name) && assignmentLifecycleStatus.value !== "In Progress");
  const canBlockAssignmentLifecycle = computed(() => isOwnershipAssignmentDetail.value && Boolean(unref(doc)?.name) && assignmentLifecycleStatus.value !== "Blocked");
  const canCloseAssignmentLifecycle = computed(() => isOwnershipAssignmentDetail.value && Boolean(unref(doc)?.name) && assignmentLifecycleStatus.value !== "Done");

  function goBack() {
    router.push({ name: `${config.key}-list` });
  }

  function openCommunicationContext() {
    if (!canOpenCommunicationContext.value || !unref(doc)?.name) return;
    const referenceLabel = String(unref(doc)?.[config.titleField] || unref(doc)?.name || "").trim() || unref(doc).name;
    router.push({
      name: "communication-center",
      query: {
        reference_doctype: config.doctype,
        reference_name: unref(doc).name,
        reference_label: referenceLabel,
        return_to: route.fullPath || route.path,
      },
    });
  }

  function openDesk() {
    navigateToSameOriginPath(`/app/Form/${encodeURIComponent(String(config.doctype || ""))}/${encodeURIComponent(props.name)}`);
  }

  const panelConfig = computed(() => {
    if (!config.panelRef) return null;
    const row = unref(doc) || {};
    if (config.panelRef.mode === "source") {
      return getSourcePanelConfig(row?.[config.panelRef.doctypeField], row?.[config.panelRef.nameField]);
    }
    return getSourcePanelConfig(row?.reference_doctype, row?.reference_name);
  });

  function openPanel() {
    if (!panelConfig.value?.url) return;
    navigateToSameOriginPath(panelConfig.value.url);
  }

  async function openDocument() {
    if (!canOpenDocument.value) return;
    const opened = await openDocumentInNewTab(unref(doc) || {});
    if (opened) return;
    const locale = String(unref(authStore?.locale) || "en").trim();
    window.alert(locale === "tr" ? "Dosya bağlantısı bulunamadı" : "File link not found");
  }

  async function sendDraftLifecycle() {
    if (!canSendDraftLifecycle.value || !unref(doc)?.name) return;
    await sendDraftNowResource.submit({ draft_name: unref(doc).name });
    await reloadDetail();
  }

  async function retryOutboxLifecycle() {
    if (!canRetryOutboxLifecycle.value || !unref(doc)?.name) return;
    await retryOutboxResource.submit({ outbox_name: unref(doc).name });
    await reloadDetail();
  }

  async function requeueOutboxLifecycle() {
    if (!canRequeueOutboxLifecycle.value || !unref(doc)?.name) return;
    await requeueOutboxResource.submit({ outbox_name: unref(doc).name });
    await reloadDetail();
  }

  async function markTaskLifecycle(status) {
    if (!isTaskDetail.value || !unref(doc)?.name || !String(status || "").trim()) return;
    await auxMutationResource.submit({
      doctype: String(config.doctype || ""),
      name: unref(doc).name,
      data: { status },
    });
    await reloadDetail();
  }

  async function markReminderLifecycle(status) {
    if (!isReminderDetail.value || !unref(doc)?.name || !String(status || "").trim()) return;
    await auxMutationResource.submit({
      doctype: "AT Reminder",
      name: unref(doc).name,
      data: { status },
    });
    await reloadDetail();
  }

  async function markAssignmentLifecycle(status) {
    if (!isOwnershipAssignmentDetail.value || !unref(doc)?.name || !String(status || "").trim()) return;
    await auxMutationResource.submit({
      doctype: "AT Ownership Assignment",
      name: unref(doc).name,
      data: { status },
    });
    await reloadDetail();
  }

  return {
    auxMutationResource,
    sendDraftNowResource,
    retryOutboxResource,
    requeueOutboxResource,
    canOpenCommunicationContext,
    isTaskDetail,
    isReminderDetail,
    isOwnershipAssignmentDetail,
    canSendDraftLifecycle,
    canRetryOutboxLifecycle,
    canRequeueOutboxLifecycle,
    canStartTaskLifecycle,
    canBlockTaskLifecycle,
    canCompleteTaskLifecycle,
    canCancelTaskLifecycle,
    canCompleteReminderLifecycle,
    canCancelReminderLifecycle,
    canStartAssignmentLifecycle,
    canBlockAssignmentLifecycle,
    canCloseAssignmentLifecycle,
    sendDraftLifecycle,
    retryOutboxLifecycle,
    requeueOutboxLifecycle,
    markTaskLifecycle,
    markReminderLifecycle,
    markAssignmentLifecycle,
    goBack,
    openCommunicationContext,
    openDesk,
    openPanel,
    openDocument,
    panelConfig,
    canOpenDocument,
  };
}
