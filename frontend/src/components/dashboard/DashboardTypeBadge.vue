<template>
  <span :class="badgeClass">{{ resolvedLabel }}</span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  kind: { type: String, default: "" },
  t: { type: Function, required: true },
});

const LABEL_KEYS = {
  activity: "dashboardBadgeActivity",
  call_note: "dashboardBadgeCallNote",
  claim: "dashboardBadgeClaim",
  inbound: "dashboardBadgeCollection",
  lead: "dashboardBadgeLead",
  offer: "dashboardBadgeOffer",
  outbound: "dashboardBadgePayout",
  payment: "dashboardBadgePayment",
  policy: "dashboardBadgePolicy",
  reconciliation: "dashboardBadgeReconciliation",
  reminder: "dashboardBadgeReminder",
  renewal: "dashboardBadgeRenewal",
  risk: "dashboardBadgeRisk",
  task: "dashboardBadgeTask",
  todo: "dashboardBadgeTask",
};

// Semantic token palette: every record type maps to an AT status token by
// meaning, so colors stay consistent with the rest of the app.
const PALETTE = {
  activity: "bg-status-draft-bg text-status-draft-text",
  call_note: "bg-status-open-bg text-status-open-text",
  claim: "bg-status-active-bg text-status-active-text",
  inbound: "bg-status-active-bg text-status-active-text",
  lead: "bg-status-open-bg text-status-open-text",
  offer: "bg-status-open-bg text-status-open-text",
  outbound: "bg-status-cancel-bg text-status-cancel-text",
  payment: "bg-status-draft-bg text-status-draft-text",
  policy: "bg-status-active-bg text-status-active-text",
  reconciliation: "bg-status-draft-bg text-status-draft-text",
  reminder: "bg-status-waiting-bg text-status-waiting-text",
  renewal: "bg-status-waiting-bg text-status-waiting-text",
  risk: "bg-status-cancel-bg text-status-cancel-text",
  task: "bg-status-open-bg text-status-open-text",
  todo: "bg-status-open-bg text-status-open-text",
};

const normalizedKind = computed(() => String(props.kind || "").trim().toLowerCase());

const resolvedLabel = computed(() => {
  const key = LABEL_KEYS[normalizedKind.value];
  if (key) {
    return props.t(key);
  }
  return props.t("dashboardBadgeRecord");
});

const badgeClass = computed(() => {
  const palette = PALETTE[normalizedKind.value] || "bg-status-draft-bg text-status-draft-text";
  return `inline-flex min-h-5 shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${palette}`;
});
</script>
