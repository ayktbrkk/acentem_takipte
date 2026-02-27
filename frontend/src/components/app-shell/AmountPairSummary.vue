<template>
  <div class="space-y-1.5">
    <div class="flex items-center justify-between gap-3">
      <span class="text-[11px] uppercase tracking-wide text-slate-400">{{ leftLabel }}</span>
      <FormattedCurrencyValue
        :value="leftValue"
        :locale="locale"
        :currency="currency"
        :maximum-fraction-digits="maximumFractionDigits"
        text-class="text-xs font-semibold text-slate-800"
      />
    </div>
    <div class="flex items-center justify-between gap-3">
      <span class="text-[11px] uppercase tracking-wide text-slate-400">{{ rightLabel }}</span>
      <FormattedCurrencyValue
        :value="rightValue"
        :locale="locale"
        :currency="currency"
        :maximum-fraction-digits="maximumFractionDigits"
        text-class="text-xs font-semibold text-slate-800"
      />
    </div>
  </div>
</template>

<script setup>
import FormattedCurrencyValue from "./FormattedCurrencyValue.vue";

defineProps({
  leftLabel: {
    type: String,
    default: "-",
  },
  leftValue: {
    type: [Number, String],
    default: 0,
  },
  rightLabel: {
    type: String,
    default: "-",
  },
  rightValue: {
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
});
</script>
