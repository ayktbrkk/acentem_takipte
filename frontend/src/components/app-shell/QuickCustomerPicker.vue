<template>
  <div class="space-y-3">
    <div v-if="locked" class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
      {{ text(lockedMessage) }}
    </div>

    <template v-else>
      <div class="space-y-2">
        <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {{ text(customerLabel) }}
          <span class="text-rose-500">*</span>
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

        <p v-if="customerErrorText" class="text-xs text-rose-600">
          {{ customerErrorText }}
        </p>
        <p v-else-if="fieldErrors?.customer" class="text-xs text-rose-600">
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

        <div
          v-if="selectedCustomerOption?.value"
          class="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs"
        >
          <span class="truncate text-emerald-800">
            {{ text(selectedCustomerLabel) }}: {{ selectedCustomerOption.label || selectedCustomerOption.value }}
          </span>
          <button
            class="ml-2 shrink-0 font-semibold text-emerald-700 hover:text-emerald-900"
            type="button"
            :disabled="disabled"
            @click="clearSelectedCustomer"
          >
            {{ text(clearSelectionLabel) }}
          </button>
        </div>
      </div>

      <div v-if="showInlineFields" class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {{ text(customerTypeLabel) }}
            <span class="text-rose-500">*</span>
          </label>
          <select v-model="model[customerTypeFieldName]" class="input qc-control" :disabled="disabled">
            <option value="Individual">{{ text(individualLabel) }}</option>
            <option value="Corporate">{{ text(corporateLabel) }}</option>
          </select>
          <p v-if="fieldErrors?.[customerTypeFieldName]" class="mt-1 text-xs text-rose-600">
            {{ fieldErrors[customerTypeFieldName] }}
          </p>
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {{ identityLabel }}
            <span class="text-rose-500">*</span>
          </label>
          <input
            v-model="model[identityFieldName]"
            class="input qc-control"
            type="text"
            inputmode="numeric"
            :disabled="disabled"
          />
          <p v-if="fieldErrors?.[identityFieldName]" class="mt-1 text-xs text-rose-600">
            {{ fieldErrors[identityFieldName] }}
          </p>
          <p v-else class="mt-1 text-xs text-slate-500">
            {{ identityHelp }}
          </p>
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {{ text(phoneLabel) }}
          </label>
          <input v-model="model[phoneFieldName]" class="input qc-control" type="text" :disabled="disabled" />
          <p v-if="fieldErrors?.[phoneFieldName]" class="mt-1 text-xs text-rose-600">
            {{ fieldErrors[phoneFieldName] }}
          </p>
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {{ text(emailLabel) }}
          </label>
          <input v-model="model[emailFieldName]" class="input qc-control" type="email" :disabled="disabled" />
          <p v-if="fieldErrors?.[emailFieldName]" class="mt-1 text-xs text-rose-600">
            {{ fieldErrors[emailFieldName] }}
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount } from "vue";
import { createResource } from "frappe-ui";

import { normalizeCustomerType } from "../../utils/customerIdentity";
import { getLocalizedText } from "../../config/quickCreateRegistry";

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

const customerSearchResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
});

const selectedCustomerOption = computed(() => {
  const option = props.model?.[props.selectedOptionFieldName];
  if (option && typeof option === "object" && String(option.value || "").trim()) return option;
  const value = String(props.model?.[props.customerFieldName] || "").trim();
  const label = String(props.model?.[props.queryFieldName] || value).trim();
  if (!value) return null;
  return {
    value,
    label: label || value,
  };
});

const queryText = computed(() => String(props.model?.[props.queryFieldName] || "").trimStart());
const createMode = computed(() => Boolean(props.model?.[props.createModeFieldName]));
const customerType = computed(() =>
  normalizeCustomerType(props.model?.[props.customerTypeFieldName], props.model?.[props.identityFieldName])
);
const searchRows = computed(() => customerSearchResource.data || []);
const customerOptions = computed(() =>
  searchRows.value.map((row) => ({
    value: row.name,
    label: row.full_name || row.name,
    description: row.tax_id || "",
  }))
);
const customerErrorText = computed(() => {
  if (queryText.value.trim().length < 2) return "";
  const err = customerSearchResource.error;
  if (!err) return "";
  return err?.messages?.join(" ") || err?.message || "";
});
const showCustomerSuggestions = computed(() => {
  return (
    !props.locked &&
    !props.disabled &&
    !selectedCustomerOption.value?.value &&
    queryText.value.trim().length >= 2 &&
    !customerSearchResource.loading &&
    customerOptions.value.length > 0
  );
});
const showCustomerNoResults = computed(() => {
  return (
    !props.locked &&
    !selectedCustomerOption.value?.value &&
    queryText.value.trim().length >= 2 &&
    !customerSearchResource.loading &&
    !customerErrorText.value &&
    customerOptions.value.length === 0
  );
});
const showCreateAction = computed(() => {
  return (
    !props.locked &&
    !selectedCustomerOption.value?.value &&
    queryText.value.trim().length > 0
  );
});
const showInlineFields = computed(() => {
  return !props.locked && !selectedCustomerOption.value?.value && createMode.value;
});
const identityLabel = computed(() =>
  customerType.value === "Corporate"
    ? text({ tr: "Vergi No", en: "Tax Number" })
    : text({ tr: "TC Kimlik No", en: "National ID Number" })
);
const identityHelp = computed(() =>
  customerType.value === "Corporate"
    ? text({ tr: "10 haneli vergi numarası girin.", en: "Enter a 10-digit tax number." })
    : text({
        tr: "11 haneli T.C. kimlik numarası girin.",
        en: "Enter an 11-digit Turkish national ID number.",
      })
);
const createActionText = computed(() => {
  const label = queryText.value.trim();
  if (!label) return "";
  return text({
    tr: `+ Yeni Müşteri Ekle: "${label}"`,
    en: `+ Add New Customer: "${label}"`,
  });
});

const selectedCustomerLabel = { tr: "Seçili müşteri", en: "Selected customer" };
const clearSelectionLabel = { tr: "Temizle", en: "Clear" };
const customerTypeLabel = { tr: "Müşteri Tipi", en: "Customer Type" };
const individualLabel = { tr: "Bireysel", en: "Individual" };
const corporateLabel = { tr: "Kurumsal", en: "Corporate" };
const phoneLabel = { tr: "Telefon", en: "Phone" };
const emailLabel = { tr: "E-posta", en: "Email" };

let searchTimer = null;

function text(value) {
  return getLocalizedText(value, props.locale);
}

function clearPendingSearch() {
  if (searchTimer) {
    clearTimeout(searchTimer);
    searchTimer = null;
  }
}

function clearSelectedLink() {
  props.model[props.customerFieldName] = "";
  props.model[props.selectedOptionFieldName] = null;
}

function resetSearchResults() {
  customerSearchResource.setData([]);
  customerSearchResource.error = null;
}

function scheduleSearch(rawValue) {
  clearPendingSearch();
  const query = String(rawValue || "").trim();
  if (!query || query.length < 2 || props.locked) {
    resetSearchResults();
    return;
  }
  searchTimer = setTimeout(() => {
    customerSearchResource
      .reload({
        doctype: "AT Customer",
        fields: ["name", "full_name", "tax_id"],
        filters: props.officeBranch ? { office_branch: props.officeBranch } : {},
        or_filters: [
          ["AT Customer", "full_name", "like", `%${query}%`],
          ["AT Customer", "name", "like", `%${query}%`],
          ["AT Customer", "tax_id", "like", `%${query}%`],
        ],
        order_by: "modified desc",
        limit_page_length: 20,
      })
      .catch(() => {
        customerSearchResource.setData([]);
      });
  }, 220);
}

function onQueryInput(event) {
  const value = String(event?.target?.value || "");
  props.model[props.queryFieldName] = value;
  if (selectedCustomerOption.value?.value) {
    const selectedLabel = String(selectedCustomerOption.value.label || selectedCustomerOption.value.value || "").trim();
    if (selectedLabel !== value.trim()) clearSelectedLink();
  }
  if (!value.trim()) props.model[props.createModeFieldName] = false;
  scheduleSearch(value);
}

function selectCustomerOption(option) {
  props.model[props.customerFieldName] = String(option?.value || "");
  props.model[props.selectedOptionFieldName] = option;
  props.model[props.queryFieldName] = String(option?.label || option?.value || "");
  props.model[props.createModeFieldName] = false;
  resetSearchResults();
}

function clearSelectedCustomer() {
  clearSelectedLink();
  props.model[props.createModeFieldName] = false;
  scheduleSearch(queryText.value);
}

function enableCreateMode() {
  clearSelectedLink();
  props.model[props.createModeFieldName] = true;
  resetSearchResults();
}

onBeforeUnmount(() => {
  clearPendingSearch();
});
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm;
}
</style>
