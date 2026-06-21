<template>
  <span :class="['status-badge', variantClass, sizeClass]">{{ label }}</span>
</template>

<script setup>
import { computed, unref } from "vue";
import { getActivePinia } from "pinia";

import { useAuthStore } from "@/stores/auth";
import { translateText } from "@/utils/i18n";

const props = defineProps({
  status: { type: String, required: true },
  locale: { type: String, default: "" },
  // Domain: customer, policy, offer, lead, claim, renewal, payment, etc.
  // We normalize the raw value first and then localize the final label.
  domain: { type: String, default: null },
  size: { type: String, default: "sm" },
});

const DOMAIN_MAP = {
  customer: {
    1: "active",      // customer.enabled = 1
    0: "cancel",      // customer.enabled = 0
    enabled: "active",
    disabled: "cancel",
  },
  consent: {
    Unknown: "draft",
    Granted: "active",
    Revoked: "cancel",
  },
  lead: {
    Draft: "draft",
    Open: "open",
    Replied: "active",
    Closed: "cancel",
  },
  offer: {
    Draft: "draft",
    Sent: "waiting",
    Accepted: "open",
    Rejected: "cancel",
    Converted: "active",
  },
  policy: {
    "Active": "active",
    "Draft": "draft",
    "KYT": "waiting",
    "IPT": "waiting",
    "Expired": "cancel",
    "Cancelled": "cancel",
  },
  lead_conversion: {
    "Actionable": "open",
    "Offer": "waiting",
    "Policy": "active",
    "Incomplete": "waiting",
    "Closed": "draft",
  },
  lead_stale: {
    "Fresh": "active",
    "FollowUp": "waiting",
    "Stale": "cancel",
  },
  claim: {
    "Draft": "draft",
    "Open": "open",
    "Under Review": "waiting",
    "Approved": "active",
    "Paid": "active",
    "Closed": "active",
    "Rejected": "cancel",
    "Cancelled": "cancel",
  },
  renewal: {
    "Open": "open",
    "In Progress": "waiting",
    "Completed": "active",
    "Done": "active",
    "Cancelled": "cancel",
  },
  reconciliation: {
    "Open": "open",
    "Matched": "active",
    "Pending": "waiting",
    "Mismatch": "waiting",
    "Cancelled": "cancel",
  },
  activity: {
    "Draft": "draft",
    "Open": "open",
    "In Progress": "waiting",
    "Pending": "waiting",
    "Done": "active",
    "Completed": "active",
    "Cancelled": "cancel",
  },
  task: {
    "Draft": "draft",
    "Open": "open",
    "Working": "waiting",
    "In Progress": "waiting",
    "Pending Review": "waiting",
    "Blocked": "cancel",
    "Completed": "active",
    "Done": "active",
    "Cancelled": "cancel",
  },
  reminder: {
    "Draft": "draft",
    "Open": "open",
    "Scheduled": "waiting",
    "Pending": "waiting",
    "Snoozed": "waiting",
    "Done": "active",
    "Completed": "active",
    "Cancelled": "cancel",
  },
  payment: {
    "Draft": "draft",
    "Outstanding": "open",
    "Pending": "waiting",
    "Processing": "waiting",
    "Overdue": "waiting",
    "Partially Paid": "waiting",
    "Paid": "active",
    "Completed": "active",
    "Failed": "cancel",
    "Cancelled": "cancel",
  },
  payment_direction: {
    "Inbound": "active",
    "Outbound": "waiting",
  },
  notification_status: {
    "Draft": "draft",
    "Queued": "open",
    "Processing": "waiting",
    "Sent": "active",
    "Failed": "waiting",
    "Dead": "cancel",
  },
  notification_channel: {
    "SMS": "open",
    "Email": "waiting",
    "WHATSAPP": "active",
    "Both": "draft",
  },
  reference_doctype: {
    "AT Lead": "open",
    "AT Offer": "waiting",
    "AT Policy": "active",
    "AT Customer": "open",
    "AT Claim": "waiting",
    "AT Payment": "active",
    "AT Renewal Task": "waiting",
    "AT Accounting Entry": "draft",
    "AT Reconciliation Item": "draft",
    "AT Segment": "open",
    "AT Campaign": "open",
    "AT Reminder": "waiting",
    "AT Call Note": "draft",
    "AT Ownership Assignment": "waiting",
  },
  boolean_active: {
    "1": "active",
    "0": "draft",
    "true": "active",
    "false": "draft",
  },
  sales_entity_type: {
    "Agency": "open",
    "Representative": "waiting",
    "Sub-Account": "draft",
  },
  accounting_sync: {
    "Draft": "draft",
    "Synced": "active",
    "Failed": "cancel",
  },
  risk_level: {
    high: "cancel",
    medium: "waiting",
    low: "active",
    High: "cancel",
    Medium: "waiting",
    Low: "active",
  },
  dashboard_action_kind: {
    reminder: "waiting",
    task: "open",
  },
  document_kind: {
    "Policy":      "active",
    "Endorsement": "waiting",
    "Claim":       "cancel",
    "Other":       "draft",
  },
  at_document_status: {
    "Active":   "active",
    "Archived": "draft",
  },
  call_status: {
    "Planned": "waiting",
    "Completed": "active",
    "Missed": "cancel",
    "No Answer": "cancel",
    "Cancelled": "cancel",
  },
  segment_status: {
    "Draft": "draft",
    "Active": "active",
    "Archived": "draft",
  },
  campaign_status: {
    "Draft": "draft",
    "Planned": "waiting",
    "Running": "waiting",
    "Completed": "active",
    "Cancelled": "cancel",
  },
  relation_type: {
    "Spouse": "active",
    "Partner": "active",
    "Child": "waiting",
    "Parent": "waiting",
    "Sibling": "open",
    "Household": "active",
    "Other": "draft",
  },
  asset_type: {
    "Vehicle": "active",
    "Home": "waiting",
    "Health Person": "open",
    "Workplace": "waiting",
    "Travel": "open",
    "Boat": "waiting",
    "Farm": "draft",
    "Other": "draft",
  },
  import_job: {
    Draft: "draft",
    Previewed: "waiting",
    Queued: "waiting",
    Running: "waiting",
    Completed: "active",
    Failed: "cancel",
    Cancelled: "cancel",
  },
  import_row: {
    ready: "active",
    skipped: "waiting",
    error: "cancel",
  },
  };

const DOMAIN_LABELS = {
  consent: {
    Unknown: "status_unknown",
    Granted: "status_granted",
    Revoked: "status_revoked",
  },
  lead: {
    Draft: "Draft",
    Open: "Open",
    Replied: "Replied",
    Closed: "Closed",
  },
  offer: {
    Draft: "Draft",
    Sent: "Sent",
    Accepted: "Accepted",
    Rejected: "Rejected",
    Converted: "Converted",
  },
  lead_conversion: {
    Actionable: "Actionable",
    Offer: "Converted to Offer",
    Policy: "Converted to Policy",
    Incomplete: "Incomplete",
    Closed: "Closed",
  },
  lead_stale: {
    Fresh: "Fresh",
    FollowUp: "Follow Up",
    Stale: "Stale",
  },
  activity: {
    Draft: "status_draft",
    Open: "status_open",
    "In Progress": "statusInProgress",
    Pending: "waiting",
    Done: "statusCompleted",
    Completed: "statusCompleted",
    Cancelled: "status_cancelled",
  },
  reminder: {
    Draft: "Draft",
    Open: "Open",
    Scheduled: "Scheduled",
    Pending: "Pending",
    Snoozed: "Snoozed",
    Done: "Done",
    Completed: "Completed",
    Cancelled: "Cancelled",
  },
  task: {
    Draft: "status_draft",
    Open: "status_open",
    Working: "statusInProgress",
    "Pending Review": "statusWaiting",
    Completed: "statusCompleted",
    Done: "statusCompleted",
    Cancelled: "status_cancelled",
  },
  payment: {
    Draft: "Draft",
    Outstanding: "Outstanding",
    Pending: "Pending",
    Processing: "Processing",
    Overdue: "Overdue",
    "Partially Paid": "Partially Paid",
    Paid: "Paid",
    Completed: "Completed",
    Failed: "Failed",
    Cancelled: "Cancelled",
  },
  payment_direction: {
    Inbound: "paymentDirectionInbound",
    Outbound: "paymentDirectionOutbound",
  },
  notification_status: {
    Draft: "Draft",
    Queued: "Queued",
    Processing: "Processing",
    Sent: "Sent",
    Failed: "Failed",
    Dead: "Dead",
  },
  notification_channel: {
    SMS: "SMS",
    Email: "Email",
    WhatsApp: "WhatsApp",
    Both: "Both",
  },
  reference_doctype: {
    "AT Lead": "referenceLead",
    "AT Offer": "referenceOffer",
    "AT Policy": "referencePolicy",
    "AT Customer": "referenceCustomer",
    "AT Claim": "referenceClaim",
    "AT Payment": "referencePayment",
    "AT Renewal Task": "referenceRenewalTask",
    "AT Accounting Entry": "referenceAccountingEntry",
    "AT Reconciliation Item": "referenceReconciliationItem",
    "AT Segment": "referenceSegment",
    "AT Campaign": "referenceCampaign",
    "AT Reminder": "referenceReminder",
    "AT Call Note": "referenceCallNote",
    "AT Ownership Assignment": "referenceOwnershipAssignment",
  },
  boolean_active: {
    "1": "active",
    "0": "status_cancelled",
    true: "active",
    false: "status_cancelled",
  },
  sales_entity_type: {
    Agency: "valAgency",
    Representative: "valRepresentative",
    "Sub-Account": "valSubAccount",
  },
  accounting_sync: {
    Draft: "status_draft",
    Synced: "active",
    Failed: "status_cancelled",
  },
  import_job: {
    Draft: "Draft",
    Previewed: "Previewed",
    Queued: "Queued",
    Running: "Running",
    Completed: "Completed",
    Failed: "Failed",
    Cancelled: "Cancelled",
  },
  import_row: {
    ready: "rowStatusReady",
    skipped: "rowStatusSkipped",
    error: "rowStatusError",
  },
  risk_level: {
    high: "riskLevelHigh",
    medium: "riskLevelMedium",
    low: "riskLevelLow",
    High: "riskLevelHigh",
    Medium: "riskLevelMedium",
    Low: "riskLevelLow",
  },
  dashboard_action_kind: {
    reminder: "salesActionReminder",
    task: "salesActionTask",
  },
  document_kind: {
    Policy:      "kindPolicy",
    Endorsement: "kindEndorsement",
    Claim:       "kindClaim",
    Other:       "kindOther",
  },
  at_document_status: {
    Active:   "status_active",
    Archived: "draft",
  },
  call_status: {
    Planned: "Planned",
    Completed: "Completed",
    Missed: "Missed",
    "No Answer": "No Answer",
    Cancelled: "Cancelled",
  },
  segment_status: {
    Draft: "Draft",
    Active: "Active",
    Archived: "Archived",
  },
  campaign_status: {
    Draft: "Draft",
    Planned: "Planned",
    Running: "Running",
    Completed: "Completed",
    Cancelled: "Cancelled",
  },
  relation_type: {
    Spouse: "Spouse",
    Child: "Child",
    Parent: "Parent",
    Sibling: "Sibling",
    Partner: "Partner",
    Household: "Household",
    Other: "Other",
  },
  asset_type: {
    Vehicle: "Vehicle",
    Home: "Home",
    "Health Person": "Health Person",
    Workplace: "Workplace",
    Travel: "Travel",
    Boat: "Boat",
    Farm: "Farm",
    Other: "Other",
  },
  claim: {
    Draft: "Draft",
    Open: "Open",
    "Under Review": "Under Review",
    Approved: "Approved",
    Paid: "Paid",
    Closed: "Closed",
    Rejected: "Rejected",
    Cancelled: "Cancelled",
  },
  reconciliation: {
    Open: "status_open",
    Matched: "summaryMatched",
    Pending: "waiting",
    Mismatch: "summaryMismatch",
    Cancelled: "status_cancelled",
  },
  policy: {
    Active: "status_active",
    Draft: "status_draft",
    KYT: "status_kyt",
    IPT: "status_ipt",
    Expired: "expired",
    Cancelled: "status_cancelled",
  },
  renewal: {
    Open: "status_open",
    "In Progress": "statusInProgress",
    Completed: "statusCompleted",
    Done: "statusCompleted",
    Cancelled: "status_cancelled",
  },
};

const STANDARD_MAP = {
  active: { cls: "status-active", label: "active" },
  draft: { cls: "status-draft", label: "draft" },
  waiting: { cls: "status-waiting", label: "waiting" },
  open: { cls: "status-open", label: "open" },
  cancel: { cls: "status-cancel", label: "status_cancelled" },
};

const authStore = getActivePinia() ? useAuthStore() : null;

const activeLocale = computed(() => {
  const explicitLocale = String(props.locale || "").trim();
  if (explicitLocale) return explicitLocale.toLowerCase();
  return String(authStore ? unref(authStore.locale) || "en" : "en").trim().toLowerCase();
});

const translateBadgeText = (source) => translateText(source, activeLocale.value);

const normalizedStatus = computed(() => {
  const raw = String(props.status || "").trim();

  // 1. Try domain-specific mapping.
  if (props.domain && DOMAIN_MAP[props.domain]) {
    const domainNorm = DOMAIN_MAP[props.domain][raw];
    if (domainNorm) return domainNorm;
  }

  // 2. Fallback: lower-case and check the standard map.
  const lower = raw.toLowerCase();
  if (STANDARD_MAP[lower]) return lower;

  // 3. Last resort: preserve a lower-case match when available.
  return lower in STANDARD_MAP ? lower : "draft";
});

const localizedDomainLabel = computed(() => {
  const raw = String(props.status || "").trim();
  if (!props.domain || !DOMAIN_LABELS[props.domain]) return null;
  const sourceLabel = DOMAIN_LABELS[props.domain][raw] || null;
  return sourceLabel ? translateBadgeText(sourceLabel) : null;
});

const variantClass = computed(() => STANDARD_MAP[normalizedStatus.value]?.cls ?? "status-draft");
const fallbackLabel = computed(() => translateBadgeText(STANDARD_MAP[normalizedStatus.value]?.label || props.status || ""));
const label = computed(() => localizedDomainLabel.value || fallbackLabel.value || props.status);
const sizeClass = computed(() => (props.size === "xs" ? "px-2 py-0.5 text-[10px] leading-4" : ""));
</script>
