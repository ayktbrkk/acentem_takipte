<template>
  <div v-if="show" class="fixed inset-0 z-[90] flex items-start justify-center pt-[10vh]">
    <div class="absolute inset-0 bg-black/40" @click="$emit('cancel')" />
    <div class="relative z-[91] w-full max-w-lg rounded-2xl bg-white shadow-2xl">
      <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div>
          <h3 class="text-lg font-semibold text-slate-900">{{ title || t('endorsement_dialog_title') }}</h3>
          <p class="mt-0.5 text-sm text-slate-500">{{ subtitle || t('endorsement_dialog_subtitle') }}</p>
        </div>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          @click="$emit('cancel')"
        >
          <FeatherIcon name="x" class="h-4 w-4" />
        </button>
      </div>

      <div class="space-y-5 px-6 py-5">
        <div v-if="error" class="rounded-lg border border-at-red/20 bg-at-red/5 px-3 py-2 text-sm text-at-red">
          {{ error }}
        </div>

        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-slate-700">{{ t('endorsement_type_label') }}</span>
          <select v-model="form.endorsement_type" class="input py-2 text-sm" :class="{ 'border-at-red': fieldErrors.endorsement_type }">
            <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-slate-700">{{ t('endorsement_date_label') }}</span>
          <input v-model="form.endorsement_date" type="date" class="input py-2 text-sm" :class="{ 'border-at-red': fieldErrors.endorsement_date }" />
        </label>

        <div v-if="showFinancialFields" class="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">{{ t('premium_and_financial_details') }}</p>
          <div class="grid grid-cols-2 gap-3">
            <label class="flex flex-col gap-1">
              <span class="text-xs text-slate-600">{{ t('net_premium') }}</span>
              <input v-model="form.net_premium" type="number" step="0.01" class="input py-1.5 text-sm" />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-xs text-slate-600">{{ t('tax_amount') }}</span>
              <input v-model="form.tax_amount" type="number" step="0.01" class="input py-1.5 text-sm" />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-xs text-slate-600">{{ t('commission_amount') }}</span>
              <input v-model="form.commission_amount" type="number" step="0.01" class="input py-1.5 text-sm" />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-xs text-slate-600">{{ t('gross_premium') }}</span>
              <input v-model="form.gross_premium" type="number" step="0.01" class="input py-1.5 text-sm" :class="{ 'border-at-red': fieldErrors.gross_premium }" />
            </label>
          </div>
        </div>

        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-medium text-slate-700">{{ t('endorsement_notes_label') }}</span>
          <textarea v-model="form.notes" class="input py-2 text-sm" rows="3" />
        </label>
      </div>

      <div class="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
        <ActionButton v-if="showDelete" variant="secondary" size="sm" class="!text-at-red !border-at-red/30 hover:!bg-at-red/5" :disabled="loading" @click="$emit('delete')">
          {{ t('delete_endorsement') }}
        </ActionButton>
        <ActionButton variant="secondary" size="sm" :disabled="loading" @click="$emit('cancel')">
          {{ t('cancel') }}
        </ActionButton>
        <ActionButton variant="primary" size="sm" :disabled="loading" @click="$emit('submit')">
          {{ loading ? t('loading') : t('endorsement_create') }}
        </ActionButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";
import { FeatherIcon } from "frappe-ui";

defineProps({
  show: { type: Boolean, default: false },
  form: { type: Object, required: true },
  fieldErrors: { type: Object, default: () => ({}) },
  typeOptions: { type: Array, default: () => [] },
  error: { type: String, default: "" },
  loading: { type: Boolean, default: false },
  showFinancialFields: { type: Boolean, default: false },
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  showDelete: { type: Boolean, default: false },
  t: { type: Function, required: true },
});

defineEmits(["cancel", "submit", "delete"]);
</script>
