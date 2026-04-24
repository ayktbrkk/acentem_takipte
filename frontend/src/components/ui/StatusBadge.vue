<template>
  <span :class="['status-badge', variantClass]">{{ label }}</span>
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
  };

const DOMAIN_LABELS = {
  consent: {
    Unknown: "draft",
    Granted: "active",
    Revoked: "status_cancelled",
  },
  lead: {
    Draft: "status_draft",
    Open: "status_open",
    Replied: "status_replied",
    Closed: "statusClosed",
  },
  offer: {
    Draft: "status_draft",
    Sent: "statusSent",
    Accepted: "statusAccepted",
    Rejected: "status_rejected",
    Converted: "status_converted",
  },
  lead_conversion: {
    Actionable: "open",
    Offer: "waiting",
    Policy: "active",
    Incomplete: "waiting",
    Closed: "statusClosed",
  },
  lead_stale: {
    Fresh: "active",
    FollowUp: "waiting",
    Stale: "status_cancelled",
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
    Draft: "status_draft",
    Open: "status_open",
    Scheduled: "waiting",
    Pending: "waiting",
    Snoozed: "waiting",
    Done: "statusCompleted",
    Completed: "statusCompleted",
    Cancelled: "status_cancelled",
  },
  payment: {
    Draft: "status_draft",
    Outstanding: "open",
    Pending: "waiting",
    Processing: "waiting",
    Overdue: "overdue",
    "Partially Paid": "waiting",
    Paid: "status_paid",
    Completed: "statusCompleted",
    Failed: "status_cancelled",
    Cancelled: "status_cancelled",
  },
  payment_direction: {
    Inbound: "paymentDirectionInbound",
    Outbound: "paymentDirectionOutbound",
  },
  notification_status: {
    Draft: "status_draft",
    Queued: "status_open",
    Processing: "waiting",
    Sent: "statusSent",
    Failed: "status_cancelled",
    Dead: "status_cancelled",
  },
  notification_channel: {
    SMS: "SMS",
    Email: "Email",
    WhatsApp: "WhatsApp",
    Both: "Both",
  },
  boolean_active: {
    "1": "active",
    "0": "status_cancelled",
    true: "active",
    false: "status_cancelled",
  },
  sales_entity_type: {
    Agency: "Agency",
    Representative: "Representative",
    "Sub-Account": "Sub-Account",
  },
  accounting_sync: {
    Draft: "status_draft",
    Synced: "active",
    Failed: "status_cancelled",
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
  claim: {
    Draft: "status_draft",
    Open: "status_open",
    "Under Review": "status_under_review",
    Approved: "status_approved",
    Paid: "status_paid",
    Closed: "statusClosed",
    Rejected: "status_rejected",
    Cancelled: "status_cancelled",
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
</script>
