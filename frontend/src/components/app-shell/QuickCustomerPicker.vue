<template>
  <div class="space-y-4">
    <div v-if="locked" class="rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2 text-sm text-brand-800">
      {{ text(lockedMessage) }}
    </div>

    <template v-else>
      <div class="space-y-2">
        <label class="field-label block">
          {{ text(customerLabel) }}
          <span class="text-amber-500">*</span>
        </label>

        <input
          class="qc-control"
          :value="queryText"
          :placeholder="text(searchPlaceholder)"
          type="text"
          autocomplete="off"
          :disabled="disabled"
          @input="onQueryInput"
        />

        <div
          v-if="showCustomerSuggestions"
          class="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5 mt-1"
        >
          <button
            v-for="option in customerOptions"
            :key="option.value"
            class="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
            type="button"
            :disabled="disabled"
            @mousedown.prevent="selectCustomerOption(option)"
          >
            <div class="flex flex-col">
              <span class="truncate text-slate-800 font-semibold">{{ option.label }}</span>
              <span v-if="option.description" class="truncate text-[10px] text-slate-400 font-medium">
                {{ option.description }}
              </span>
            </div>
            <FeatherIcon name="chevron-right" class="h-3.5 w-3.5 text-slate-300" />
          </button>
        </div>

        <p v-else-if="showCustomerNoResults" class="px-1 text-xs text-slate-400">
          {{ text(noResultsText) }}
        </p>

        <p v-if="customerErrorText" class="form-error">
          {{ customerErrorText }}
        </p>
        <p v-else-if="fieldErrors?.customer" class="form-error">
          {{ fieldErrors.customer }}
        </p>

        <button
          v-if="showCreateAction"
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand-200 py-2.5 text-[11px] font-bold uppercase tracking-wider text-brand-600 hover:border-brand-400 hover:bg-brand-50 transition-all disabled:opacity-50"
          :disabled="disabled"
          @click="enableCreateMode"
        >
          <FeatherIcon name="user-plus" class="h-3.5 w-3.5" />
          {{ createActionText }}
        </button>

        <div v-if="selectedCustomerOption?.value" class="qc-selection-banner shadow-sm ring-1 ring-brand-100/50">
          <span class="truncate font-semibold text-brand-900">
            {{ text(selectedCustomerLabel) }}: {{ selectedCustomerOption.label || selectedCustomerOption.value }}
          </span>
          <button
            class="qc-selection-banner__clear font-bold uppercase tracking-tighter"
            type="button"
            :disabled="disabled"
            @click="clearSelectedCustomer"
          >
            {{ text(clearSelectionLabel) }}
          </button>
        </div>
      </div>

      <div v-if="showInlineFields" class="grid grid-cols-1 gap-x-4 gap-y-4 p-5 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm ring-1 ring-slate-200/50 mt-4">
        <div class="md:col-span-2">
          <label class="field-label block">
            {{ text(customerTypeLabel) }}
            <span class="text-amber-500">*</span>
          </label>
          <select v-model="model[customerTypeFieldName]" class="qc-control bg-white/80" :disabled="disabled">
            <option value="Individual">{{ text(individualLabel) }}</option>
            <option value="Corporate">{{ text(corporateLabel) }}</option>
          </select>
          <p v-if="fieldErrors?.[customerTypeFieldName]" class="form-error">
            {{ fieldErrors[customerTypeFieldName] }}
          </p>
        </div>

        <div>
          <label class="field-label block">
            {{ identityLabel }}
            <span class="text-amber-500">*</span>
          </label>
          <input
            v-model="model[identityFieldName]"
            class="qc-control bg-white/80"
            type="text"
            inputmode="numeric"
            :disabled="disabled"
          />
          <p v-if="fieldErrors?.[identityFieldName]" class="form-error">
            {{ fieldErrors[identityFieldName] }}
          </p>
          <p v-else class="px-1 mt-1 text-[10px] text-slate-400 leading-tight">
            {{ identityHelp }}
          </p>
        </div>

        <div>
          <label class="field-label block">
            {{ text(birthDateLabel) }}
          </label>
          <input
            v-model="model[birthDateFieldName]"
            class="qc-control bg-white/80"
            type="date"
            :disabled="disabled || isBirthDateLocked"
            :readonly="isBirthDateLocked"
          />
          <p v-if="fieldErrors?.[birthDateFieldName]" class="form-error">
            {{ fieldErrors[birthDateFieldName] }}
          </p>
        </div>

        <div>
          <label class="field-label block">
            {{ text(phoneLabel) }}
          </label>
          <input v-model="model[phoneFieldName]" class="qc-control bg-white/80" type="text" :disabled="disabled" />
          <p v-if="fieldErrors?.[phoneFieldName]" class="form-error">
            {{ fieldErrors[phoneFieldName] }}
          </p>
        </div>

        <div>
          <label class="field-label block">
            {{ text(emailLabel) }}
          </label>
          <input v-model="model[emailFieldName]" class="qc-control bg-white/80" type="email" :disabled="disabled" />
          <p v-if="fieldErrors?.[emailFieldName]" class="form-error">
            {{ fieldErrors[emailFieldName] }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui";
import { useQuickCustomerPicker } from "../../composables/useQuickCustomerPicker";

const props = defineProps({
  model: { type: Object, required: true },
  fieldErrors: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
  locale: { type: String, default: "en" },
  officeBranch: { type: String, default: "" },
  locked: { type: Boolean, default: false },
  lockedMessage: {
    type: [String, Object],
    default: "Customer information is inherited automatically when a source offer is selected.",
  },
  customerFieldName: { type: String, default: "customer" },
  queryFieldName: { type: String, default: "queryText" },
  selectedOptionFieldName: { type: String, default: "customerOption" },
  createModeFieldName: { type: String, default: "createCustomerMode" },
  customerTypeFieldName: { type: String, default: "customer_type" },
  birthDateFieldName: { type: String, default: "birth_date" },
  identityFieldName: { type: String, default: "tax_id" },
  phoneFieldName: { type: String, default: "phone" },
  emailFieldName: { type: String, default: "email" },
  defaultSelectPlaceholder: { type: [String, Object], default: () => ({ tr: "Seçiniz", en: "Select" }) },
  defaultSearchPlaceholder: { type: [String, Object], default: () => ({ tr: "Listede ara...", en: "Search in list..." }) },
  customerLabel: {
    type: [String, Object],
    default: "customer",
  },
  searchPlaceholder: {
    type: [String, Object],
    default: () => ({
      tr: "Listede ara veya yeni müşteri adı yaz...",
      en: "Search the list or type a new customer name...",
    }),
  },
  noResultsText: {
    type: [String, Object],
    default: () => ({
      tr: "Aramanızla eşleşen müşteri bulunamadı.",
      en: "No customers matched your search.",
    }),
  },
});

const {
  selectedCustomerOption,
  queryText,
  customerOptions,
  customerErrorText,
  showCustomerSuggestions,
  showCustomerNoResults,
  showCreateAction,
  showInlineFields,
  isBirthDateLocked,
  identityLabel,
  identityHelp,
  createActionText,
  selectedCustomerLabel,
  clearSelectionLabel,
  customerTypeLabel,
  birthDateLabel,
  individualLabel,
  corporateLabel,
  phoneLabel,
  emailLabel,
  onQueryInput,
  selectCustomerOption,
  clearSelectedCustomer,
  enableCreateMode,
  text,
} = useQuickCustomerPicker(props);
</script>


