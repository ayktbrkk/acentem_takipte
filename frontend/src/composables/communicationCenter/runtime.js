import { computed, unref } from "vue";
import { createResource } from "frappe-ui";
import { useRoute } from "vue-router";

import { useBranchStore } from "../../stores/branch";
import { useCommunicationStore } from "../../stores/communication";
import { openTabularExport } from "../../utils/listExport";
import { isPermissionDeniedError } from "./common";

function resourceValue(resource, fallback = null) {
  const value = unref(resource?.data);
  return value == null ? fallback : value;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildDateQueryParams(filters, branchStore) {
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

function buildCustomerQuickFilters(branchStore) {
  if (!branchStore.requestBranch) return {};
  return { office_branch: branchStore.requestBranch };
}

export function useCommunicationCenterRuntime({ t, statusLabel, channelLabel, referenceTypeLabel }) {
  const communicationStore = useCommunicationStore();
  const branchStore = useBranchStore();
  const route = useRoute();

  const snapshotResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.get_queue_snapshot",
    params: buildDateQueryParams(communicationStore.state.filters, branchStore),
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
      filters: buildCustomerQuickFilters(branchStore),
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
      filters: buildCustomerQuickFilters(branchStore),
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
      filters: buildCustomerQuickFilters(branchStore),
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
      filters: buildCustomerQuickFilters(branchStore),
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
      filters: buildCustomerQuickFilters(branchStore),
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

  const snapshotData = computed(() => communicationStore.state.snapshot || {});
  const outboxItems = computed(() => communicationStore.outboxItems);
  const draftItems = computed(() => communicationStore.draftItems);
  const breakdown = computed(() => communicationStore.breakdown);
  const activeFilterCount = computed(() => communicationStore.activeFilterCount);
  const statusCards = computed(() =>
    communicationStore.statusCards.map((item) => ({
      key: item.key,
      label: statusLabel(item.status),
      value: item.value,
    }))
  );

  const snapshotErrorMessage = computed(() => {
    if (communicationStore.state.error) return communicationStore.state.error;
    const raw = unref(snapshotResource.error);
    if (!raw) return "";
    if (isPermissionDeniedError(raw)) return t("permissionDeniedRead");
    if (typeof raw === "string") return raw;
    return raw?.message || raw?.exc || t("loadErrorTitle");
  });

  function buildParams() {
    return buildDateQueryParams(communicationStore.state.filters, branchStore);
  }

  function reloadSnapshot() {
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
    const filters = communicationStore.state.filters;
    const rows = [
      ...outboxItems.value.map((row) => ({
        [t("recordType")]: t("outboxTitle"),
        [t("status")]: `${t("outboxTitle")} / ${statusLabel(row.status)}`,
        [t("channel")]: channelLabel(row.channel),
        [t("recipient")]: row.recipient || "-",
        [t("attempts")]: `${row.attempt_count || 0}/${row.max_attempts || 0}`,
        [t("nextRetry")]: row.next_retry_on || "-",
        [t("referenceContext")]: [referenceTypeLabel(row.reference_doctype), row.reference_name].filter(Boolean).join(" / ") || "-",
        [t("error")]: row.error_message || "-",
      })),
      ...draftItems.value.map((row) => ({
        [t("recordType")]: t("draftTitle"),
        [t("status")]: `${t("draftTitle")} / ${statusLabel(row.status)}`,
        [t("channel")]: channelLabel(row.channel),
        [t("recipient")]: row.recipient || "-",
        [t("attempts")]: "-",
        [t("nextRetry")]: "-",
        [t("referenceContext")]: [referenceTypeLabel(row.reference_doctype), row.reference_name].filter(Boolean).join(" / ") || "-",
        [t("error")]: row.error_message || "-",
      })),
    ];
    return openTabularExport({
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
      rows,
      filters,
      format,
    });
  }

  function reloadQuickCustomers() {
    const filters = buildCustomerQuickFilters(branchStore);
    communicationQuickCustomerResource.params = {
      ...communicationQuickCustomerResource.params,
      filters,
    };
    communicationQuickPolicyResource.params = {
      ...communicationQuickPolicyResource.params,
      filters,
    };
    communicationQuickClaimResource.params = {
      ...communicationQuickClaimResource.params,
      filters,
    };
    communicationQuickSegmentResource.params = {
      ...communicationQuickSegmentResource.params,
      filters,
    };
    communicationQuickCampaignResource.params = {
      ...communicationQuickCampaignResource.params,
      filters,
    };
    return Promise.all([
      communicationQuickCustomerResource.reload(),
      communicationQuickPolicyResource.reload(),
      communicationQuickClaimResource.reload(),
      communicationQuickSegmentResource.reload(),
      communicationQuickCampaignResource.reload(),
    ]);
  }

  function hasRouteContextQuery() {
    return Boolean(
      route.query.customer ||
        route.query.status ||
        route.query.channel ||
        route.query.reference_doctype ||
        route.query.reference_name
    );
  }

  return {
    activeFilterCount,
    auxMutationResource,
    breakdown,
    campaignRunResource,
    communicationQuickCampaignResource,
    communicationQuickClaimResource,
    communicationQuickCustomerResource,
    communicationQuickPolicyResource,
    communicationQuickSegmentResource,
    communicationQuickTemplateResource,
    draftItems,
    buildParams,
    buildCustomerQuickFilters: () => buildCustomerQuickFilters(branchStore),
    hasRouteContextQuery,
    outboxItems,
    reloadQuickCustomers,
    reloadSnapshot,
    runCycleResource,
    sendDraftResource,
    retryOutboxResource,
    segmentPreviewResource,
    snapshotData,
    snapshotErrorMessage,
    snapshotResource,
    statusCards,
  };
}
