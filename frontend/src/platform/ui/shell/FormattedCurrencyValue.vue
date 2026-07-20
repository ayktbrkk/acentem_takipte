<template>
  <span class="tabular-nums" :class="textClass">{{ formattedValue }}</span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  value: {
    type: [Number, String],
    default: 0,
  },
  locale: {
    type: String,
    default: "tr-TR",
  },
  currency: {
    type: String,
    default: "TRY",
  },
  maximumFractionDigits: {
    type: Number,
    default: 0,
  },
  textClass: {
    type: String,
    default: "text-slate-700",
  },
});

const formattedValue = computed(() =>
  new Intl.NumberFormat(props.locale, {
    style: "currency",
    currency: props.currency,
    maximumFractionDigits: props.maximumFractionDigits,
  }).format(Number(props.value || 0))
);
</script>
