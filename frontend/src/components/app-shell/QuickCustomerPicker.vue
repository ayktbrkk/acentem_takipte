<template>
  <div class="space-y-3">
    <div v-if="locked" class="rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2 text-sm text-brand-800">
      {{ text(lockedMessage) }}
    </div>

    <template v-else>
      <div class="space-y-2">
        <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {{ text(customerLabel) }}
          <span class="text-amber-500">*</span>
        </label>

        <input
          class="input qc-control"
          :value="queryText"
          :placeholder="text(searchPlaceholder)"
          type="text"
          autocomplete="off"
          :disabled="disabled"
          @input="onQueryInput"
        />

        <div
          v-if="showCustomerSuggestions"
          class="max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white"
        >
          <button
            v-for="option in customerOptions"
            :key="option.value"
            class="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
            type="button"
            :disabled="disabled"
            @mousedown.prevent="selectCustomerOption(option)"
          >
            <span class="truncate text-slate-800">{{ option.label }}</span>
            <span v-if="option.description" class="ml-3 shrink-0 text-xs text-slate-500">
              {{ option.description }}
            </span>
          </button>
        </div>

        <p v-else-if="showCustomerNoResults" class="text-xs text-slate-500">
          {{ text(noResultsText) }}
        </p>

        <p v-if="customerErrorText" class="qc-inline-error">
          {{ customerErrorText }}
        </p>
        <p v-else-if="fieldErrors?.customer" class="qc-inline-error">
          {{ fieldErrors.customer }}
        </p>

        <button
          v-if="showCreateAction"
          type="button"
          class="inline-flex items-center rounded-lg border border-dashed border-brand-300 px-3 py-2 text-sm font-semibold text-brand-700 hover:border-brand-400 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="disabled"
          @click="enableCreateMode"
        >
          {{ createActionText }}
        </button>

        <div v-if="selectedCustomerOption?.value" class="qc-selection-banner">
          <span class="truncate font-medium">
            {{ text(selectedCustomerLabel) }}: {{ selectedCustomerOption.label || selectedCustomerOption.value }}
          </span>
          <button
            class="qc-selection-banner__clear"
            type="button"
            :disabled="disabled"
            @click="clearSelectedCustomer"
          >
            {{ text(clearSelectionLabel) }}
          </button>
        </div>
      </div>

      <div v-if="showInlineFields" class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div class="md:col-span-2">
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {{ text(customerTypeLabel) }}
            <span class="text-amber-500">*</span>
          </label>
          <select v-model="model[customerTypeFieldName]" class="input qc-control" :disabled="disabled">
            <option value="Individual">{{ text(individualLabel) }}</option>
            <option value="Corporate">{{ text(corporateLabel) }}</option>
          </select>
          <p v-if="fieldErrors?.[customerTypeFieldName]" class="mt-1 qc-inline-error">
            {{ fieldErrors[customerTypeFieldName] }}
          </p>
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {{ identityLabel }}
            <span class="text-amber-500">*</span>
          </label>
          <input
            v-model="model[identityFieldName]"
            class="input qc-control"
            type="text"
            inputmode="numeric"
            :disabled="disabled"
          />
          <p v-if="fieldErrors?.[identityFieldName]" class="mt-1 qc-inline-error">
            {{ fieldErrors[identityFieldName] }}
          </p>
          <p v-else class="mt-1 text-xs text-slate-500">
            {{ identityHelp }}
          </p>
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {{ text(birthDateLabel) }}
          </label>
          <input
            v-model="model[birthDateFieldName]"
            class="input qc-control"
            type="date"
            :disabled="disabled || isBirthDateLocked"
            :readonly="isBirthDateLocked"
          />
          <p v-if="fieldErrors?.[birthDateFieldName]" class="mt-1 qc-inline-error">
            {{ fieldErrors[birthDateFieldName] }}
          </p>
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {{ text(phoneLabel) }}
          </label>
          <input v-model="model[phoneFieldName]" class="input qc-control" type="text" :disabled="disabled" />
          <p v-if="fieldErrors?.[phoneFieldName]" class="mt-1 qc-inline-error">
            {{ fieldErrors[phoneFieldName] }}
          </p>
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {{ text(emailLabel) }}
          </label>
          <input v-model="model[emailFieldName]" class="input qc-control" type="email" :disabled="disabled" />
          <p v-if="fieldErrors?.[emailFieldName]" class="mt-1 qc-inline-error">
            {{ fieldErrors[emailFieldName] }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { useQuickCustomerPicker } from "@/composables/useQuickCustomerPicker";

const props = defineProps({
  model: { type: Object, required: true },
  fieldErrors: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
  locale: { type: String, default: "tr" },
  officeBranch: { type: String, default: "" },
  locked: { type: Boolean, default: false },
  lockedMessage: {
    type: [String, Object],
    default: () => ({
      tr: "Kaynak teklif seçildiğinde müşteri bilgisi tekliften otomatik alınır.",
      en: "Customer information is inherited automatically when a source offer is selected.",
    }),
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
  customerLabel: {
    type: [String, Object],
    default: () => ({
      tr: "Müşteri",
      en: "Customer",
    }),
  },
  searchPlaceholder: {
    type: [String, Object],
    default: () => ({
      tr: "Listede ara veya yeni müşteri adı yazın...",
      en: "Search the list or type a new customer name...",
    }),
  },
  noResultsText: {
    type: [String, Object],
    default: () => ({
      tr: "Aranan müşteri bulunamadı.",
      en: "No customers matched your search.",
    }),
  },
});

const emit = defineEmits(["request-related-create"]);

const {
  text,
  selectedCustomerOption,
  queryText,
  customerType,
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
} = useQuickCustomerPicker(props, emit);
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>
