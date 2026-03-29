<template>
  <Dialog v-model="model" :options="{ title: t('convertDialogTitle'), size: 'xl' }">
    <template #body-content>
      <QuickCreateDialogShell :error="convertError" :eyebrow="convertDialogEyebrow" :show-footer="false">
        <p class="text-sm text-slate-600">
          {{ t("selectedOffer") }}: <strong class="text-slate-900">{{ selectedOffer?.name || "-" }}</strong>
        </p>
        <input v-model="convertForm.start_date" class="input" type="date" />
        <input v-model="convertForm.end_date" class="input" type="date" />
        <input
          v-model="convertForm.net_premium"
          class="input"
          :placeholder="t('netPremium')"
          type="number"
          min="0"
          step="0.01"
        />
        <input
          v-model="convertForm.tax_amount"
          class="input"
          :placeholder="t('taxAmount')"
          type="number"
          min="0"
          step="0.01"
        />
        <input
          v-model="convertForm.commission_amount"
          class="input"
          :placeholder="t('commissionAmount')"
          type="number"
          min="0"
          step="0.01"
        />
        <input v-model="convertForm.policy_no" class="input" :placeholder="t('policyNo')" type="text" />
      </QuickCreateDialogShell>
    </template>

    <template #actions>
      <button class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700" type="button" @click="model = false">
        {{ t("cancel") }}
      </button>
      <button
        class="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        :disabled="convertLoading || !selectedOffer"
        type="button"
        @click="$emit('convert')"
      >
        {{ t("createPolicy") }}
      </button>
    </template>
  </Dialog>
</template>

<script setup>
import { computed } from "vue";
import { Dialog } from "frappe-ui";

import QuickCreateDialogShell from "../app-shell/QuickCreateDialogShell.vue";

const props = defineProps({
  convertDialogEyebrow: {
    type: String,
    default: "",
  },
  convertError: {
    type: String,
    default: "",
  },
  convertForm: {
    type: Object,
    required: true,
  },
  convertLoading: {
    type: Boolean,
    default: false,
  },
  modelValue: {
    type: Boolean,
    default: false,
  },
  selectedOffer: {
    type: Object,
    default: null,
  },
  t: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["update:modelValue", "convert"]);

const model = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit("update:modelValue", value);
  },
});
</script>
