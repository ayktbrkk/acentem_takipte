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

const PALETTE = {
  activity: "bg-slate-200 text-slate-700",
  call_note: "bg-sky-100 text-sky-700",
  claim: "bg-emerald-100 text-emerald-700",
  inbound: "bg-emerald-100 text-emerald-700",
  lead: "bg-fuchsia-100 text-fuchsia-700",
  offer: "bg-sky-100 text-sky-700",
  outbound: "bg-rose-100 text-rose-700",
  payment: "bg-slate-200 text-slate-700",
  policy: "bg-emerald-100 text-emerald-700",
  reconciliation: "bg-violet-100 text-violet-700",
  reminder: "bg-amber-100 text-amber-700",
  renewal: "bg-orange-100 text-orange-700",
  risk: "bg-amber-100 text-amber-700",
  task: "bg-indigo-100 text-indigo-700",
  todo: "bg-indigo-100 text-indigo-700",
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
  const palette = PALETTE[normalizedKind.value] || "bg-slate-200 text-slate-700";
  return `inline-flex min-h-5 shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${palette}`;
});
</script>
