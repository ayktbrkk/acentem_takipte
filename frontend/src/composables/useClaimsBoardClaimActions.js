import { ref } from "vue";

export function useClaimsBoardClaimActions({
  claimMutationResource,
  claimNotificationDraftResource,
  claimNotificationOutboxResource,
  reloadClaims,
  route,
  t,
}) {
  const selectedClaimForAssignment = ref(null);
  const showOwnershipAssignmentDialog = ref(false);

  function canOpenClaimPayment(claim) {
    const status = String(claim?.claim_status || "").trim();
    return status === "Approved" && Number(claim?.approved_amount || 0) > Number(claim?.paid_amount || 0);
  }

  function openClaimDetail(claim) {
    if (!claim?.name) return;
    window.location.assign(`/at/claims/${encodeURIComponent(claim.name)}`);
  }

  function openClaimDocuments(claim) {
    if (!claim?.name) return;
    const query = new URLSearchParams({
      reference_doctype: "AT Claim",
      reference_name: claim.name,
    });
    window.location.assign(`/at/at-documents?${query.toString()}`);
  }

  function openClaimPayment(claim) {
    if (!canOpenClaimPayment(claim)) return;
    const query = new URLSearchParams({
      policy: claim?.policy || "",
      query: claim?.claim_no || claim?.name || "",
    });
    window.location.assign(`/at/payments?${query.toString()}`);
  }

  function openPolicy(policyName) {
    if (!policyName) return;
    window.location.assign(`/at/policies/${encodeURIComponent(policyName)}`);
  }

  function openClaimNotifications(claim) {
    if (!claim?.name) return;
    const query = new URLSearchParams({
      reference_doctype: "AT Claim",
      reference_name: claim.name,
      return_to: route.fullPath || route.path || "",
    });
    window.location.assign(`/at/communication?${query.toString()}`);
  }

  function openClaimAssignment(claim) {
    selectedClaimForAssignment.value = claim || null;
    showOwnershipAssignmentDialog.value = true;
  }

  async function prepareOwnershipAssignmentDialog({ form }) {
    const claim = selectedClaimForAssignment.value;
    form.source_doctype = "AT Claim";
    form.source_name = claim?.name || "";
    form.customer = claim?.customer || "";
    form.policy = claim?.policy || "";
  }

  function buildClaimRowActions(claim) {
    return [
      {
        key: "file",
        label: t("viewClaimFile"),
        variant: "outline",
        onClick: () => openClaimDetail(claim),
      },
      {
        key: "payment",
        label: t("createPayment"),
        variant: "primary",
        disabled: !canOpenClaimPayment(claim),
        onClick: () => openClaimPayment(claim),
      },
    ];
  }

  function canMoveClaimToStatus(claim, nextStatus) {
    const current = String(claim?.claim_status || "").trim();
    if (!current || current === nextStatus) return false;
    const transitions = {
      Open: ["Under Review", "Approved", "Closed"],
      "Under Review": ["Approved", "Closed"],
      Approved: ["Closed"],
      Paid: ["Closed"],
    };
    return Boolean(transitions[current]?.includes(nextStatus));
  }

  function canRejectClaim(claim) {
    return ["Open", "Under Review", "Approved"].includes(String(claim?.claim_status || "").trim());
  }

  async function updateClaimStatus(claim, nextStatus) {
    if (!claim?.name || !nextStatus) return;
    await claimMutationResource.submit({
      doctype: "AT Claim",
      name: claim.name,
      data: {
        claim_status: nextStatus,
      },
    });
    await reloadClaims();
  }

  async function rejectClaim(claim) {
    const rejectionReason = String(window.prompt(t("rejectReasonPrompt"), claim?.rejection_reason || "") || "").trim();
    if (!rejectionReason) return;
    await claimMutationResource.submit({
      doctype: "AT Claim",
      name: claim.name,
      data: {
        claim_status: "Rejected",
        rejection_reason: rejectionReason,
        appeal_status: "",
      },
    });
    await reloadClaims();
  }

  async function clearClaimFollowUp(claim) {
    if (!claim?.name) return;
    await claimMutationResource.submit({
      doctype: "AT Claim",
      name: claim.name,
      data: {
        next_follow_up_on: null,
      },
    });
    await reloadClaims();
  }

  async function reloadClaimNotifications(claimRows) {
    const claimNames = (claimRows || []).map((row) => row?.name).filter(Boolean);
    if (!claimNames.length) {
      setNotificationResourceData(claimNotificationDraftResource, []);
      setNotificationResourceData(claimNotificationOutboxResource, []);
      return;
    }
    claimNotificationDraftResource.params = {
      doctype: "AT Notification Draft",
      fields: ["name", "status", "reference_name"],
      filters: {
        reference_doctype: "AT Claim",
        reference_name: ["in", claimNames],
      },
      limit_page_length: 200,
    };
    claimNotificationOutboxResource.params = {
      doctype: "AT Notification Outbox",
      fields: ["name", "status", "reference_name"],
      filters: {
        reference_doctype: "AT Claim",
        reference_name: ["in", claimNames],
      },
      limit_page_length: 200,
    };
    await Promise.all([claimNotificationDraftResource.reload(), claimNotificationOutboxResource.reload()]);
  }

  function setNotificationResourceData(resource, data) {
    if (resource?.data && typeof resource.data === "object" && "value" in resource.data) {
      resource.data.value = data;
    } else {
      resource.data = data;
    }
  }

  return {
    selectedClaimForAssignment,
    showOwnershipAssignmentDialog,
    canOpenClaimPayment,
    openClaimDetail,
    openClaimDocuments,
    openClaimPayment,
    openPolicy,
    openClaimNotifications,
    openClaimAssignment,
    prepareOwnershipAssignmentDialog,
    buildClaimRowActions,
    canMoveClaimToStatus,
    canRejectClaim,
    updateClaimStatus,
    rejectClaim,
    clearClaimFollowUp,
    reloadClaimNotifications,
  };
}
