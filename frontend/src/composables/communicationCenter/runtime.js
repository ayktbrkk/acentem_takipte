import { ref } from "vue";
import { createResource } from "frappe-ui";

import { isPermissionDeniedError } from "./helpers";
import { resolveSameOriginPath } from "../../utils/safeNavigation";
import { openTabularExport } from "../../utils/listExport";

export function useCommunicationCenterRuntime({ route, router, branchStore, communicationStore, filters, t }) {
  const dispatching = ref(false);
  const operationError = ref("");
  const showSegmentDialog = ref(false);
  const showCampaignDialog = ref(false);
  const showCampaignRunDialog = ref(false);
  const showSegmentPreviewDialog = ref(false);
  const showCallNoteDialog = ref(false);
  const showReminderDialog = ref(false);
  const showQuickMessageDialog = ref(false);
  const campaignRunSelection = ref("");
  const campaignRunLoading = ref(false);
  const campaignRunError = ref("");
  const campaignRunResult = ref(null);
  const segmentPreviewSegment = ref("");
  const segmentPreviewLoading = ref(false);
  const segmentPreviewError = ref("");
  const segmentPreviewPayload = ref(null);

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

  const snapshotResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.get_queue_snapshot",
    params: buildParams(),
    auto: true,
  });

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

  const communicationQuickTemplateResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Notification Template",
      fields: ["name", "template_key", "channel", "is_active"],
      filters: { is_active: 1 },
      order_by: "template_key asc",
      limit_page_length: 500,
    },
  });

  const communicationQuickCustomerResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Customer",
      fields: ["name", "full_name"],
      filters: buildCustomerQuickFilters(),
      order_by: "modified desc",
      limit_page_length: 500,
    },
  });

  const communicationQuickPolicyResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Policy",
      fields: ["name", "policy_no", "customer"],
      filters: buildCustomerQuickFilters(),
      order_by: "modified desc",
      limit_page_length: 500,
    },
  });

  const communicationQuickClaimResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Claim",
      fields: ["name", "claim_no", "policy", "customer"],
      filters: buildCustomerQuickFilters(),
      order_by: "modified desc",
      limit_page_length: 500,
    },
  });

  const communicationQuickSegmentResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Segment",
      fields: ["name", "segment_name", "channel_focus", "status"],
      filters: buildCustomerQuickFilters(),
      order_by: "modified desc",
      limit_page_length: 500,
    },
  });

  const communicationQuickCampaignResource = createResource({
    url: "frappe.client.get_list",
    auto: true,
    params: {
      doctype: "AT Campaign",
      fields: ["name", "campaign_name", "channel", "status"],
      filters: buildCustomerQuickFilters(),
      order_by: "modified desc",
      limit_page_length: 500,
    },
  });

  const segmentPreviewResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.preview_segment_members",
  });

  const campaignRunResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.execute_campaign",
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

  function buildCustomerQuickFilters() {
    if (!branchStore.requestBranch) return {};
    return { office_branch: branchStore.requestBranch };
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
    operationError.value = "";
    snapshotResource.params = buildParams();
    communicationStore.setLoading(true);
    communicationStore.clearError();
    return snapshotResource
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
    const filtersPayload = buildCustomerQuickFilters();
    communicationQuickCustomerResource.params = {
      ...communicationQuickCustomerResource.params,
      filters: filtersPayload,
    };
    communicationQuickPolicyResource.params = {
      ...communicationQuickPolicyResource.params,
      filters: filtersPayload,
    };
    communicationQuickClaimResource.params = {
      ...communicationQuickClaimResource.params,
      filters: filtersPayload,
    };
    communicationQuickSegmentResource.params = {
      ...communicationQuickSegmentResource.params,
      filters: filtersPayload,
    };
    communicationQuickCampaignResource.params = {
      ...communicationQuickCampaignResource.params,
      filters: filtersPayload,
    };
    return Promise.all([
      communicationQuickCustomerResource.reload(),
      communicationQuickPolicyResource.reload(),
      communicationQuickClaimResource.reload(),
      communicationQuickSegmentResource.reload(),
      communicationQuickCampaignResource.reload(),
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

  async function runDispatchCycle() {
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
      operationError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
    }
  }

  async function completeReminderContext() {
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
      operationError.value = isPermissionDeniedError(error)
        ? t("permissionDeniedAction")
        : error?.messages?.join(" ") || error?.message || t("loadErrorTitle");
    }
  }

  async function cancelReminderContext() {
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
      const result = await segmentPreviewResource.submit({
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
      const result = await campaignRunResource.submit({
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
    campaignRunSelection,
    campaignRunLoading,
    campaignRunError,
    campaignRunResult,
    segmentPreviewSegment,
    segmentPreviewLoading,
    segmentPreviewError,
    segmentPreviewPayload,
    snapshotResource,
    runCycleResource,
    sendDraftResource,
    retryOutboxResource,
    auxMutationResource,
    communicationQuickTemplateResource,
    communicationQuickCustomerResource,
    communicationQuickPolicyResource,
    communicationQuickClaimResource,
    communicationQuickSegmentResource,
    communicationQuickCampaignResource,
    segmentPreviewResource,
    campaignRunResource,
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
