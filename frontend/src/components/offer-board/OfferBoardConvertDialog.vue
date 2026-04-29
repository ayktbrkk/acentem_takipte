<template>
  <ATQuickEntryModal
    v-model="visibleProxy"
    :title="title"
    :eyebrow="eyebrow"
    :error="error"
    :loading="loading"
    :disabled="!hasSelectedOffer"
    :show-save-and-open="false"
    :locale="locale"
    :labels="{ cancel: cancelLabel, save: confirmLabel }"
    @cancel="visibleProxy = false"
    @save="$emit('confirm')"
  >
    <div class="space-y-6 py-2">
      <section class="at-card-premium">
        <header class="flex items-center gap-3 mb-6">
          <span class="at-label shrink-0 text-brand-600">{{ selectedLabel }}</span>
          <div class="h-px flex-1 bg-slate-100"></div>
        </header>
        <p class="text-sm font-semibold text-slate-900 mb-6">
          {{ selectedOfferName }}
        </p>

        <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div class="at-input-group">
            <label class="at-label block">{{ translateText('start_date', locale) }}</label>
            <input v-model="model.start_date" class="at-control-premium at-control-date" type="date" />
          </div>
          <div class="at-input-group">
            <label class="at-label block">{{ translateText('end_date', locale) }}</label>
            <input v-model="model.end_date" class="at-control-premium at-control-date" type="date" />
          </div>
          <div class="at-input-group">
            <label class="at-label block">{{ netPremiumLabel }}</label>
            <input v-model="model.net_premium" class="at-control-premium at-control-number at-control-right" :placeholder="netPremiumLabel" type="number" min="0" step="0.01" inputmode="decimal" />
          </div>
          <div class="at-input-group">
            <label class="at-label block">{{ taxAmountLabel }}</label>
            <input v-model="model.tax_amount" class="at-control-premium at-control-number at-control-right" :placeholder="taxAmountLabel" type="number" min="0" step="0.01" inputmode="decimal" />
          </div>
          <div class="at-input-group">
            <label class="at-label block">{{ commissionAmountLabel }}</label>
            <input v-model="model.commission_amount" class="at-control-premium at-control-number at-control-right" :placeholder="commissionAmountLabel" type="number" min="0" step="0.01" inputmode="decimal" />
          </div>
          <div class="at-input-group">
            <label class="at-label block">{{ policyNoLabel }}</label>
            <input v-model="model.policy_no" class="at-control-premium" :placeholder="policyNoLabel" type="text" />
          </div>
        </div>
      </section>
    </div>
  </ATQuickEntryModal>
</template>

<script setup>
import { computed } from "vue";
import ATQuickEntryModal from "../app-shell/ATQuickEntryModal.vue";
import { translateText } from "../../utils/i18n";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, required: true },
  eyebrow: { type: String, default: "" },
  error: { type: String, default: "" },
  selectedOfferName: { type: String, default: "-" },
  selectedLabel: { type: String, default: "" },
  loading: { type: Boolean, default: false },
  hasSelectedOffer: { type: Boolean, default: false },
  model: { type: Object, required: true },
  cancelLabel: { type: String, default: "" },
  confirmLabel: { type: String, default: "" },
  netPremiumLabel: { type: String, default: "" },
  taxAmountLabel: { type: String, default: "" },
  commissionAmountLabel: { type: String, default: "" },
  policyNoLabel: { type: String, default: "" },
  locale: { type: String, default: "tr" },
});

const emit = defineEmits(["update:modelValue", "confirm"]);

const visibleProxy = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
</script>

<style scoped>
.at-control-date,
.at-control-number {
  appearance: none;
  -moz-appearance: textfield;
}

.at-control-date::-webkit-calendar-picker-indicator {
  opacity: 0.4;
  cursor: pointer;
}

.at-control-number::-webkit-outer-spin-button,
.at-control-number::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
</style>
