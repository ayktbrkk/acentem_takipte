<template>
  <form v-if="visible" class="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4" @submit.prevent="$emit('submit')">
    <div class="flex items-center justify-between gap-3">
      <h4 class="text-sm font-semibold text-slate-900">
        {{ form.index ? editTitle : createTitle }}
      </h4>
      <ActionButton variant="link" size="sm" @click="$emit('cancel')">
        {{ cancelLabel }}
      </ActionButton>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <label class="space-y-1">
        <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ reportKeyLabel }}</span>
        <select v-model="form.reportKey" class="input">
          <option v-for="option in reportOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <label class="space-y-1">
        <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ frequencyLabel }}</span>
        <select v-model="form.frequency" class="input">
          <option value="daily">{{ t('daily') }}</option>
          <option value="weekly">{{ t('weekly') }}</option>
          <option value="monthly">{{ t('monthly') }}</option>
        </select>
      </label>
      <label class="space-y-1">
        <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ formatLabel }}</span>
        <select v-model="form.format" class="input">
          <option value="xlsx">{{ t('xlsx') }}</option>
          <option value="pdf">{{ t('pdf') }}</option>
        </select>
      </label>
      <label class="space-y-1">
        <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ deliveryChannelLabel }}</span>
        <select v-model="form.deliveryChannel" class="input">
          <option value="email">{{ deliveryEmailLabel }}</option>
          <option value="notification_outbox">{{ deliveryOutboxLabel }}</option>
        </select>
      </label>
      <label class="space-y-1">
        <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ limitLabel }}</span>
        <input v-model.number="form.limit" class="input" type="number" min="1" step="1" />
      </label>
      <label v-if="form.frequency === 'weekly'" class="space-y-1">
        <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ weekdayLabel }}</span>
        <input v-model.number="form.weekday" class="input" type="number" min="0" max="6" step="1" />
      </label>
      <label v-if="form.frequency === 'monthly'" class="space-y-1">
        <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ dayOfMonthLabel }}</span>
        <input v-model.number="form.dayOfMonth" class="input" type="number" min="1" max="31" step="1" />
      </label>
      <label class="flex items-center gap-2 pt-6 text-sm text-slate-700">
        <input v-model="form.enabled" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-sky-500" />
        <span>{{ enabledLabel }}</span>
      </label>
    </div>

    <label class="space-y-1">
      <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ recipientsLabel }}</span>
      <textarea v-model.trim="form.recipients" class="input min-h-24" :placeholder="recipientsPlaceholder" />
    </label>

    <div class="space-y-2">
      <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ filtersLabel }}</span>
      <div class="grid gap-3 md:grid-cols-2">
        <label v-if="isFilterVisible('office_branch')" class="space-y-1">
          <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ officeBranchLabel }}</span>
          <input v-model.trim="form.filterOfficeBranch" class="input" type="search" />
        </label>
        <label v-if="isFilterVisible('branch')" class="space-y-1">
          <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ insuranceBranchLabel }}</span>
          <input v-model.trim="form.filterBranch" class="input" type="search" />
        </label>
        <label v-if="isFilterVisible('insurance_company')" class="space-y-1">
          <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ insuranceCompanyLabel }}</span>
          <input v-model.trim="form.filterInsuranceCompany" class="input" type="search" />
        </label>
        <label v-if="isFilterVisible('sales_entity')" class="space-y-1">
          <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ salesEntityLabel }}</span>
          <input v-model.trim="form.filterSalesEntity" class="input" type="search" />
        </label>
        <label v-if="isFilterVisible('status')" class="space-y-1">
          <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ statusLabel }}</span>
          <input v-model.trim="form.filterStatus" class="input" type="search" />
        </label>
        <label v-if="isFilterVisible('from_date')" class="space-y-1">
          <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ fromDateLabel }}</span>
          <input v-model="form.filterFromDate" class="input" type="date" />
        </label>
        <label v-if="isFilterVisible('to_date')" class="space-y-1">
          <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ toDateLabel }}</span>
          <input v-model="form.filterToDate" class="input" type="date" />
        </label>
      </div>
    </div>

    <div class="space-y-3 border-t border-slate-100 pt-3">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">{{ t('alerts') }}</span>
        <ActionButton variant="link" size="xs" class="!text-[10px] !font-bold !text-indigo-600 hover:!text-indigo-800 !uppercase !no-underline" @click="addAlert">
          + {{ t('add_alert') }}
        </ActionButton>
      </div>

      <div v-if="form.alerts.length" class="space-y-3">
        <div v-for="(alert, idx) in form.alerts" :key="idx" class="relative grid gap-2 rounded-xl border border-slate-100 bg-slate-50/30 p-3 md:grid-cols-4">
          <button 
            type="button" 
            class="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm hover:bg-rose-600 transition-colors"
            @click="removeAlert(idx)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <label class="space-y-1">
            <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ t('alert_field') }}</span>
            <input v-model.trim="alert.field" class="input input--sm" type="text" :placeholder="t('eg_gross_premium')" />
          </label>
          <label class="space-y-1">
            <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ t('alert_op') }}</span>
            <select v-model="alert.operator" class="input input--sm">
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
              <option value="==">==</option>
              <option value="!=">!=</option>
            </select>
          </label>
          <label class="space-y-1">
            <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ t('alert_val') }}</span>
            <input v-model.trim="alert.value" class="input input--sm" type="text" />
          </label>
          <label class="space-y-1">
            <span class="text-[11px] font-normal uppercase tracking-wider text-slate-400">{{ t('alert_logic') }}</span>
            <select v-model="alert.logic" class="input input--sm">
              <option value="any">{{ t('alert_logic_any') }}</option>
              <option value="all">{{ t('alert_logic_all') }}</option>
            </select>
          </label>
        </div>
      </div>
    </div>

    <div v-if="formError" class="qc-error-banner" role="alert" aria-live="polite">
      <p class="qc-error-banner__text">{{ formError }}</p>
    </div>

    <div class="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
      <ActionButton
        variant="secondary"
        size="sm"
        class="!rounded-xl !px-4 !py-2 !font-bold"
        @click="$emit('cancel')"
      >
        {{ cancelLabel }}
      </ActionButton>
      <ActionButton
        variant="primary"
        size="sm"
        type="submit"
        class="!rounded-xl !bg-indigo-600 hover:!bg-indigo-700 !px-6 !py-2 !font-bold !shadow-md"
      >
        {{ saveLabel }}
      </ActionButton>
    </div>
  </form>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";

defineProps({
  visible: { type: Boolean, default: false },
  form: { type: Object, required: true },
  formError: { type: String, default: "" },
  t: { type: Function, required: true },
  reportOptions: { type: Array, default: () => [] },
  isFilterVisible: { type: Function, required: true },
  createTitle: { type: String, required: true },
  editTitle: { type: String, required: true },
  cancelLabel: { type: String, required: true },
  saveLabel: { type: String, required: true },
  reportKeyLabel: { type: String, required: true },
  frequencyLabel: { type: String, required: true },
  formatLabel: { type: String, required: true },
  deliveryChannelLabel: { type: String, required: true },
  deliveryEmailLabel: { type: String, required: true },
  deliveryOutboxLabel: { type: String, required: true },
  limitLabel: { type: String, required: true },
  weekdayLabel: { type: String, required: true },
  dayOfMonthLabel: { type: String, required: true },
  enabledLabel: { type: String, required: true },
  recipientsLabel: { type: String, required: true },
  recipientsPlaceholder: { type: String, required: true },
  filtersLabel: { type: String, required: true },
  officeBranchLabel: { type: String, required: true },
  insuranceBranchLabel: { type: String, required: true },
  insuranceCompanyLabel: { type: String, required: true },
  salesEntityLabel: { type: String, required: true },
  statusLabel: { type: String, required: true },
  fromDateLabel: { type: String, required: true },
  toDateLabel: { type: String, required: true },
  addAlert: { type: Function, required: true },
  removeAlert: { type: Function, required: true },
});

defineEmits(["submit", "cancel"]);
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>
