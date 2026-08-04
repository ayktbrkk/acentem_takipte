<template>
  <div class="space-y-3">
    <div class="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <SaaSMetricCard
        v-for="card in metricCards"
        :key="card.key"
        :label="card.label"
        :value="card.value"
        :value-class="card.valueClass"
        :title="card.title"
      />
    </div>

    <div
      v-if="nonTryEntries.length"
      class="rounded-xl border border-slate-200 bg-white p-3"
    >
      <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {{ t("nonTryBreakdownTitle") }}
      </p>
      <ul class="mt-2 space-y-1">
        <li
          v-for="entry in nonTryEntries"
          :key="entry.currency"
          class="flex items-center justify-between gap-2 text-sm text-slate-700"
        >
          <span class="font-medium">{{ entry.currency }}</span>
          <span class="tabular-nums">
            {{ formatCurrency(entry.reserve_native, entry.currency) }}
            <span v-if="entry.reserve_try > 0" class="text-slate-500">
              (≈ {{ formatCurrency(entry.reserve_try, "TRY") }})
            </span>
          </span>
        </li>
      </ul>
    </div>

    <div
      v-if="Number(claimSummary?.missing_fx_count || 0) > 0"
      class="rounded-xl border border-at-amber/30 bg-at-amber/5 px-4 py-3 text-sm text-at-amber"
      role="status"
    >
      {{ t("missingFxWarning") }}:
      {{ claimSummary.missing_fx_count }}
      <span v-if="missingFxNames.length" class="block text-xs text-slate-600">
        {{ t("missingFxClaims") }}: {{ missingFxNames.join(", ") }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import SaaSMetricCard from "../app-shell/SaaSMetricCard.vue";

const props = defineProps({
  claimSummary: {
    type: Object,
    required: true,
  },
  formatCount: {
    type: Function,
    required: true,
  },
  formatCurrency: {
    type: Function,
    required: true,
  },
  t: {
    type: Function,
    required: true,
  },
});

const metricCards = computed(() => {
  const s = props.claimSummary || {};
  const cards = [
    { key: "total", label: props.t("summaryTotal"), value: props.formatCount(s.total) },
    { key: "open", label: props.t("summaryOpen"), value: props.formatCount(s.open), valueClass: "text-brand-600" },
    { key: "under_review", label: props.t("summaryUnderReview"), value: props.formatCount(s.under_review), valueClass: "text-at-amber" },
    { key: "approved", label: props.t("summaryApproved"), value: props.formatCount(s.approved), valueClass: "text-at-amber" },
    { key: "paid", label: props.t("summaryPaid"), value: props.formatCount(s.paid), valueClass: "text-at-green" },
    { key: "rejected", label: props.t("summaryRejected"), value: props.formatCount(s.rejected), valueClass: "text-at-red" },
  ];
  const other = (Number(s.other) || 0) + (Number(s.closed) || 0);
  if (other > 0) {
    cards.push({ key: "other", label: props.t("summaryOther"), value: props.formatCount(other), valueClass: "text-slate-500" });
  }
  cards.push({
    key: "reserve_paid",
    label: props.t("summaryReservePaid"),
    value: s.reserveVsPaid || "0 / 0",
    title: props.t("summaryReservePaidHint"),
  });
  return cards;
});

const nonTryEntries = computed(() => {
  const s = props.claimSummary || {};
  const breakdown = s.non_try_breakdown || {};
  return Object.entries(breakdown).map(([currency, v]) => ({
    currency,
    reserve_native: Number(v.reserve_native) || 0,
    reserve_try: Number(v.reserve_try) || 0,
    paid_try: Number(v.paid_try) || 0,
  }));
});

const missingFxNames = computed(() => {
  const s = props.claimSummary || {};
  return (s.missing_fx_claims || []).map((c) => c.name || c.claim_no || c).slice(0, 5);
});
</script>
