<template>
  <div class="flex items-center justify-between gap-2">
    <p class="text-sm font-semibold text-slate-900 tabular-nums">{{ amountText }}</p>
    <StatusBadge :domain="statusType" :status="status" />
  </div>
</template>

<script setup>
import StatusBadge from "../ui/StatusBadge.vue";

defineProps({
  amountText: {
    type: String,
    default: "-",
  },
  status: {
    type: String,
    default: "",
  },
  statusType: {
    type: String,
    default: "payment_direction",
  },
});
</script>
