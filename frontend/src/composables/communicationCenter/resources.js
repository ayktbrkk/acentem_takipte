import { createResource } from "frappe-ui";

function buildCustomerQuickFilters(branchStore) {
  if (!branchStore.requestBranch) return {};
  return { office_branch: branchStore.requestBranch };
}

export function useCommunicationCenterResources({ branchStore, filters }) {
  const snapshotResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.get_queue_snapshot",
    params: buildParams(branchStore, filters),
    auto: true,
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

  const segmentPreviewResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.preview_segment_members",
  });

  const campaignRunResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.communication.execute_campaign",
  });

  return {
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
  };
}

function buildParams(branchStore, filters) {
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
