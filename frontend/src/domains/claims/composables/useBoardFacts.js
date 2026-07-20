import { computed, unref } from "vue";

import { subtleFact } from "../utils/factItems";

export function useClaimsBoardClaimFacts({
  claimStore,
  claimsResource,
  claimNotificationDraftResource,
  claimNotificationOutboxResource,
  claimAssignmentResource,
  claimFileResource,
  claimsLoading,
  localeCode,
  t,
  _reloadClaims,
}) {
  function formatCurrency(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat(localeCode.value, {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(localeCode.value, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  function formatCount(value) {
    return new Intl.NumberFormat(localeCode.value).format(Number(value || 0));
  }

  const claimsErrorText = computed(() => {
    if (claimStore.state.error) return claimStore.state.error;
    const err = unref(claimsResource.error);
    if (!err) return "";
    return err?.messages?.join(" ") || err?.message || t("loadError");
  });

  const claimNotificationDraftMap = computed(() => buildClaimNotificationMap(unref(claimNotificationDraftResource.data) || []));
  const claimNotificationOutboxMap = computed(() => buildClaimNotificationMap(unref(claimNotificationOutboxResource.data) || []));
  const claimAssignmentMap = computed(() => buildClaimAssignmentMap(unref(claimAssignmentResource.data) || []));
  const claimFileMap = computed(() => buildClaimFileMap(unref(claimFileResource.data) || []));

  function claimIdentityFacts(claim) {
    return [subtleFact("record", t("recordId"), claim?.name || "-")];
  }

  function claimPolicyFacts(claim) {
    return [subtleFact("policy", t("policy"), claim?.policy || "-")];
  }

  function claimOperationalFacts(claim) {
    return [
      subtleFact("expert", t("assignedExpert"), claim?.assigned_expert || t("noExpert")),
      subtleFact("documents", t("documentSummary"), claimDocumentSummary(claim)),
      claim?.rejection_reason ? subtleFact("rejection", t("rejectionReason"), claim.rejection_reason) : null,
      claim?.appeal_status ? subtleFact("appeal", t("appealStatus"), claim.appeal_status) : null,
      claim?.next_follow_up_on ? subtleFact("follow-up", t("nextFollowUpOn"), claim.next_follow_up_on) : null,
    ].filter(Boolean);
  }

  const claimStatusTemplateKeys = {
    Open: "claim_status_open",
    "Under Review": "claim_status_under_review",
    Approved: "claim_status_approved",
    Rejected: "claim_status_rejected",
    Paid: "claim_status_paid",
    Closed: "claim_status_closed",
  };

  function notificationHint(claim) {
    const templateKey = claimStatusTemplateKeys[String(claim?.claim_status || "").trim()];
    return templateKey ? `${t("notificationDraft")}: ${templateKey}` : t("notificationMissing");
  }

  function buildClaimNotificationMap(rows) {
    return (rows || []).reduce((acc, row) => {
      const referenceName = String(row?.reference_name || "").trim();
      if (!referenceName) return acc;
      const current = acc[referenceName] || { count: 0, latestStatus: "" };
      current.count += 1;
      current.latestStatus = current.latestStatus || String(row?.status || "").trim();
      acc[referenceName] = current;
      return acc;
    }, {});
  }

  function buildClaimAssignmentMap(rows) {
    return (rows || []).reduce((acc, row) => {
      const sourceName = String(row?.source_name || "").trim();
      if (!sourceName) return acc;
      const current = acc[sourceName] || { count: 0, openCount: 0, latestAssignee: "" };
      current.count += 1;
      if (["Open", "In Progress", "Blocked"].includes(String(row?.status || "").trim())) current.openCount += 1;
      if (!current.latestAssignee) current.latestAssignee = String(row?.assigned_to || "").trim();
      acc[sourceName] = current;
      return acc;
    }, {});
  }

  function buildClaimFileMap(rows) {
    return (rows || []).reduce((acc, row) => {
      const claimName = String(row?.attached_to_name || "").trim();
      if (!claimName) return acc;
      const current = acc[claimName] || { count: 0, lastUploadedOn: "" };
      current.count += 1;
      if (!current.lastUploadedOn) current.lastUploadedOn = String(row?.creation || "").trim();
      acc[claimName] = current;
      return acc;
    }, {});
  }

  function claimDocumentSummary(claim) {
    const fileInfo = claimFileMap.value[String(claim?.name || "").trim()];
    if (!fileInfo) return t("documentNone");
    const parts = [`${fileInfo.count}`];
    if (fileInfo.lastUploadedOn) parts.push(`${t("lastUpload")}: ${formatDate(fileInfo.lastUploadedOn)}`);
    return parts.join(" / ");
  }

  function notificationStatusLabel(claim) {
    const claimName = String(claim?.name || "").trim();
    const draft = claimNotificationDraftMap.value[claimName];
    const outbox = claimNotificationOutboxMap.value[claimName];
    if (!draft && !outbox) return t("notificationNone");
    const parts = [];
    if (draft) parts.push(`${t("notificationDraft")}: ${draft.count}${draft.latestStatus ? ` (${draft.latestStatus})` : ""}`);
    if (outbox) parts.push(`${t("notificationQueue")}: ${outbox.count}${outbox.latestStatus ? ` (${outbox.latestStatus})` : ""}`);
    return parts.join(" / ");
  }

  function assignmentHint(claim) {
    const assignment = claimAssignmentMap.value[String(claim?.name || "").trim()];
    if (!assignment) return `${t("assignmentSummary")}: ${t("assignmentNone")}`;
    const parts = [`${t("assignmentSummary")}: ${assignment.count}`];
    if (assignment.openCount) parts.push(`${assignment.openCount} ${t("assignmentOpenCount")}`);
    if (assignment.latestAssignee) parts.push(assignment.latestAssignee);
    return parts.join(" / ");
  }

  return {
    claimsLoading,
    formatCurrency,
    formatDate,
    formatCount,
    claimsErrorText,
    claimNotificationDraftMap,
    claimNotificationOutboxMap,
    claimAssignmentMap,
    claimFileMap,
    claimIdentityFacts,
    claimPolicyFacts,
    claimOperationalFacts,
    notificationHint,
    buildClaimNotificationMap,
    buildClaimAssignmentMap,
    buildClaimFileMap,
    claimDocumentSummary,
    notificationStatusLabel,
    assignmentHint,
  };
}
