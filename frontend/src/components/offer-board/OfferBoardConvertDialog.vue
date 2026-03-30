<template>
  <Dialog v-model="visibleProxy" :options="{ title: title, size: 'xl' }">
    <template #body-content>
      <QuickCreateDialogShell :error="error" :eyebrow="eyebrow" :show-footer="false">
        <p class="text-sm text-slate-600">
          {{ selectedLabel }}: <strong class="text-slate-900">{{ selectedOfferName }}</strong>
        </p>
        <input v-model="model.start_date" class="input" type="date" />
        <input v-model="model.end_date" class="input" type="date" />
        <input v-model="model.net_premium" class="input" :placeholder="netPremiumLabel" type="number" min="0" step="0.01" />
        <input v-model="model.tax_amount" class="input" :placeholder="taxAmountLabel" type="number" min="0" step="0.01" />
        <input v-model="model.commission_amount" class="input" :placeholder="commissionAmountLabel" type="number" min="0" step="0.01" />
        <input v-model="model.policy_no" class="input" :placeholder="policyNoLabel" type="text" />
      </QuickCreateDialogShell>
    </template>

    <template #actions>
      <button class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700" type="button" @click="visibleProxy = false">
        {{ cancelLabel }}
      </button>
      <button class="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" :disabled="loading || !hasSelectedOffer" type="button" @click="$emit('confirm')">
        {{ confirmLabel }}
      </button>
    </template>
  </Dialog>
</template>

<script setup>
import { computed } from "vue";
import { Dialog } from "frappe-ui";
import QuickCreateDialogShell from "../app-shell/QuickCreateDialogShell.vue";

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
});

const emit = defineEmits(["update:modelValue", "confirm"]);

const visibleProxy = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
</script>
