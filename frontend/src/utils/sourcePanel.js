export function getSourcePanelConfig(sourceDoctype, sourceName) {
  if (!sourceDoctype || !sourceName) return null;

  if (sourceDoctype === "AT Policy") {
    return {
      url: `/at/policies/${encodeURIComponent(sourceName)}`,
      labelKey: "openPolicyPanel",
    };
  }
  if (sourceDoctype === "AT Customer") {
    return {
      url: `/at/customers/${encodeURIComponent(sourceName)}`,
      labelKey: "openCustomerPanel",
    };
  }
  if (sourceDoctype === "AT Offer") {
    return {
      url: `/at/offers/${encodeURIComponent(sourceName)}`,
      labelKey: "openOffersPanel",
    };
  }
  if (sourceDoctype === "AT Claim") return { url: "/at/claims", labelKey: "openClaimsPanel" };
  if (sourceDoctype === "AT Payment") return { url: "/at/payments", labelKey: "openPaymentsPanel" };
  if (sourceDoctype === "AT Renewal Task") return { url: `/at/tasks/${encodeURIComponent(sourceName)}`, labelKey: "openRenewalsPanel" };
  if (sourceDoctype === "AT Accounting Entry") return { url: `/at/accounting-entries/${encodeURIComponent(sourceName)}`, labelKey: "openReconciliationPanel" };
  if (sourceDoctype === "AT Reconciliation Item") return { url: `/at/reconciliation-items/${encodeURIComponent(sourceName)}`, labelKey: "openReconciliationPanel" };
  if (sourceDoctype === "AT Notification Draft") return { url: `/at/notification-drafts/${encodeURIComponent(sourceName)}`, labelKey: "openCommunicationPanel" };
  if (sourceDoctype === "AT Notification Outbox") return { url: `/at/notification-outbox/${encodeURIComponent(sourceName)}`, labelKey: "openCommunicationPanel" };
  if (sourceDoctype === "AT Call Note") return { url: `/at/call-notes/${encodeURIComponent(sourceName)}`, labelKey: "openCommunicationPanel" };
  if (sourceDoctype === "AT Segment") return { url: `/at/segments/${encodeURIComponent(sourceName)}`, labelKey: "openCommunicationPanel" };
  if (sourceDoctype === "AT Campaign") return { url: `/at/campaigns/${encodeURIComponent(sourceName)}`, labelKey: "openCommunicationPanel" };
  if (sourceDoctype === "AT Customer Segment Snapshot") return { url: `/at/customer-segment-snapshots/${encodeURIComponent(sourceName)}`, labelKey: "openCustomerPanel" };
  if (sourceDoctype === "AT Ownership Assignment") return { url: `/at/ownership-assignments/${encodeURIComponent(sourceName)}`, labelKey: "openCustomerPanel" };
  if (sourceDoctype === "AT Task") return { url: `/at/tasks/${encodeURIComponent(sourceName)}`, labelKey: "openCustomerPanel" };
  if (sourceDoctype === "AT Activity") return { url: `/at/activities/${encodeURIComponent(sourceName)}`, labelKey: "openCustomerPanel" };
  if (sourceDoctype === "File") return { url: `/at/files/${encodeURIComponent(sourceName)}`, labelKey: "openDocumentsPanel" };
  if (sourceDoctype === "AT Insurance Company") return { url: `/at/insurance-companies/${encodeURIComponent(sourceName)}`, labelKey: "openMasterDataPanel" };
  if (sourceDoctype === "AT Branch") return { url: `/at/branches/${encodeURIComponent(sourceName)}`, labelKey: "openMasterDataPanel" };
  if (sourceDoctype === "AT Sales Entity") return { url: `/at/sales-entities/${encodeURIComponent(sourceName)}`, labelKey: "openMasterDataPanel" };
  if (sourceDoctype === "AT Notification Template") return { url: `/at/notification-templates/${encodeURIComponent(sourceName)}`, labelKey: "openMasterDataPanel" };

  return null;
}
