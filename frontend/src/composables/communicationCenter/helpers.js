import { getCustomerOptionLabel } from "../../utils/customerOptions";

export function isPermissionDeniedError(error) {
  const status = Number(
    error?.statusCode ??
      error?.status ??
      error?.httpStatus ??
      error?.response?.status ??
      0,
  );
  const text = String(error?.message || error?.messages?.join(" ") || error?.exc_type || "").toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    text.includes("permission") ||
    text.includes("not permitted") ||
    text.includes("not authorized")
  );
}

export function statusLabel(status, t) {
  if (status === "Queued") return t("queued");
  if (status === "Processing") return t("processing");
  if (status === "Sent") return t("sent");
  if (status === "Failed") return t("failed");
  if (status === "Dead") return t("dead");
  return status || "-";
}

export function channelLabel(channel, t) {
  if (channel === "SMS") return t("sms");
  if (channel === "Email") return t("email");
  if (channel === "WHATSAPP") return t("whatsapp");
  return channel || "-";
}

export function referenceTypeLabel(doctype, t) {
  const value = String(doctype || "").trim();
  if (value === "AT Lead") return t("referenceLead");
  if (value === "AT Offer") return t("referenceOffer");
  if (value === "AT Policy") return t("referencePolicy");
  if (value === "AT Customer") return t("referenceCustomer");
  if (value === "AT Claim") return t("referenceClaim");
  if (value === "AT Payment") return t("referencePayment");
  if (value === "AT Renewal Task") return t("referenceRenewalTask");
  if (value === "AT Accounting Entry") return t("referenceAccountingEntry");
  if (value === "AT Reconciliation Item") return t("referenceReconciliationItem");
  return value || "-";
}

export function buildCommunicationQuickOptionsMap({
  templateRows = [],
  customerRows = [],
  policyRows = [],
  claimRows = [],
  segmentRows = [],
  campaignRows = [],
  channelLabel: channelLabelFn,
}) {
  const asArray = (value) => (Array.isArray(value) ? value : []);
  return {
    notificationTemplates: asArray(templateRows).map((row) => ({
      value: row.name,
      label: `${row.template_key || row.name}${row.channel ? ` (${channelLabelFn(row.channel)})` : ""}`,
    })),
    customers: asArray(customerRows).map((row) => ({
      value: row.name,
      label: getCustomerOptionLabel(row),
    })),
    policies: asArray(policyRows).map((row) => ({
      value: row.name,
      label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
    })),
    claims: asArray(claimRows).map((row) => ({
      value: row.name,
      label: `${row.claim_no || row.name}${row.policy ? ` - ${row.policy}` : ""}`,
    })),
    segments: asArray(segmentRows).map((row) => ({
      value: row.name,
      label: `${row.segment_name || row.name}${row.channel_focus ? ` - ${channelLabelFn(row.channel_focus)}` : ""}`,
    })),
    campaigns: asArray(campaignRows).map((row) => ({
      value: row.name,
      label: `${row.campaign_name || row.name}${row.channel ? ` - ${channelLabelFn(row.channel)}` : ""}`,
    })),
  };
}
