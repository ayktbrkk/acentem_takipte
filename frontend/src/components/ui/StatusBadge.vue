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
    "Approved": "waiting",
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
  };

const DOMAIN_LABELS = {
  consent: {
    Unknown: "Unknown",
    Granted: "Granted",
    Revoked: "Revoked",
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
    Draft: "Draft",
    Open: "Open",
    "In Progress": "In Progress",
    Pending: "Pending",
    Done: "Done",
    Completed: "Completed",
    Cancelled: "Cancelled",
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
    Inbound: "Inbound",
    Outbound: "Outbound",
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
  boolean_active: {
    "1": "Active",
    "0": "Inactive",
    true: "Active",
    false: "Inactive",
  },
  sales_entity_type: {
    Agency: "Agency",
    Representative: "Representative",
    "Sub-Account": "Sub-Account",
  },
  accounting_sync: {
    Draft: "Draft",
    Synced: "Synced",
    Failed: "Failed",
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
    Open: "Open",
    Matched: "Matched",
    Pending: "Pending",
    Mismatch: "Mismatch",
    Cancelled: "Cancelled",
  },
  policy: {
    Active: "Active",
    Draft: "Draft",
    Expired: "Expired",
    Cancelled: "Cancelled",
  },
};

const STANDARD_MAP = {
  active: { cls: "status-active", label: "Active" },
  draft: { cls: "status-draft", label: "Draft" },
  waiting: { cls: "status-waiting", label: "Waiting" },
  open: { cls: "status-open", label: "Open" },
  cancel: { cls: "status-cancel", label: "Cancelled" },
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
