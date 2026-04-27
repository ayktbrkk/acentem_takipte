<template>
  <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
    <div 
      v-for="field in fields" 
      :key="field.name"
      :class="fieldWrapClass(field)"
    >
      <slot v-if="field.type === 'custom'" :name="`field-${field.name}`" :field="field" />

      <div v-else class="at-input-group">
        <label class="at-label block">
          {{ fieldLabel(field) }}
          <span v-if="isFieldRequired(field)" class="text-amber-500">*</span>
        </label>

        <div v-if="field.type === 'select'">
          <VueSelect
            v-if="isRemoteSelect(field)"
            v-model="model[field.name]"
            :class="controlClass(field, 'at-control-premium')"
            :is-disabled="isFieldDisabled(field)"
            :is-loading="Boolean(remoteLoadingMap[field.name])"
            :is-searchable="true"
            :is-clearable="true"
            :is-taggable="canCreateRelated(field)"
            :close-on-select="true"
            :placeholder="text(field.searchPlaceholder) || text(defaultSearchPlaceholder)"
            :options="resolveRemoteSelectOptions(field)"
            :classes="{ menuContainer: remoteMenuClass(field) }"
            @search="onRemoteSelectSearch(field, $event)"
          />

          <select
            v-else
            v-model="model[field.name]"
            :class="controlClass(field, 'at-control-premium')"
            :disabled="isFieldDisabled(field)"
          >
            <option value="">{{ text(field.placeholder) || text(defaultSelectPlaceholder) }}</option>
            <option
              v-for="option in resolveSelectOptions(field)"
              :key="String(option.value)"
              :value="option.value"
            >
              {{ text(option.label) || option.label || option.value }}
            </option>
          </select>
        </div>

        <label
          v-else-if="field.type === 'checkbox'"
          class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-[13px] font-semibold text-slate-900 hover:bg-white transition-all cursor-pointer shadow-sm"
        >
          <input v-model="model[field.name]" class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" type="checkbox" :disabled="isFieldDisabled(field)" />
          <span>{{ text(field.checkboxLabel || field.label) }}</span>
        </label>

        <textarea
          v-else-if="field.type === 'textarea'"
          v-model="model[field.name]"
          :class="controlClass(field, 'at-control-premium min-h-[100px] py-3')"
          :rows="field.rows || 3"
          :placeholder="text(field.placeholder)"
          :disabled="isFieldDisabled(field)"
        />

        <input
          v-else
          v-model="model[field.name]"
          :class="controlClass(field, [
            'at-control-premium', 
            isFinancialField(field) ? 'at-control-right' : ''
          ])"
          :type="normalizeInputType(field.type)"
          :placeholder="text(field.placeholder)"
          :disabled="isFieldDisabled(field)"
          @input="handleInput($event, field)"
          @keyup.enter="emit('submit')"
        />

        <p v-if="fieldErrors?.[field.name]" class="form-error font-medium text-xs">
          {{ fieldErrors[field.name] }}
        </p>
        <p v-else-if="fieldHelp(field)" class="mt-1 text-[10px] font-medium text-slate-400 italic">
          {{ fieldHelp(field) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import VueSelect from "vue3-select-component";
import { useQuickCreateFormRenderer } from "../../composables/useQuickCreateFormRenderer";
import { applyTCMask, applyPhoneMask } from "../../utils/atMasks";

const props = defineProps({
  fields: { type: Array, default: () => [] },
  model: { type: Object, required: true },
  fieldErrors: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
  locale: { type: String, default: "en" },
  optionsMap: { type: Object, default: () => ({}) },
  defaultSelectPlaceholder: { type: [String, Object], default: () => ({ tr: "Seçiniz", en: "Select" }) },
  defaultSearchPlaceholder: { type: [String, Object], default: () => ({ tr: "Listede ara...", en: "Search in list..." }) },
});

const emit = defineEmits(["submit", "request-related-create"]);

const {
  text,
  fieldLabel,
  fieldHelp,
  isFieldRequired,
  isFieldDisabled,
  fieldWrapClass,
  controlClass,
  normalizeInputType,
  resolveSelectOptions,
  resolveRemoteSelectOptions,
  remoteMenuClass,
  isRemoteSelect,
  canCreateRelated,
  onRemoteSelectSearch,
  remoteLoadingMap,
} = useQuickCreateFormRenderer(props, emit);

function isFinancialField(field) {
  const names = ["gross_premium", "net_premium", "tax_amount", "commission_amount", "potential_amount", "amount"];
  return names.includes(field.name) || field.type === "currency" || field.type === "number";
}

function handleInput(event, field) {
  const value = event.target.value;
  
  if (field.name === "customer_tax_id" || field.name === "tax_id") {
    props.model[field.name] = applyTCMask(value);
  } else if (field.name === "customer_phone" || field.name === "phone") {
    props.model[field.name] = applyPhoneMask(value);
  } else {
    props.model[field.name] = value;
  }
}
</script>

<style scoped>
.qc-control {
  @apply h-10;
}

.qc-textarea {
  @apply h-auto py-2;
}

.qc-remote-select {
  --vs-width: 100%;
  --vs-min-height: 40px;
  --vs-padding: 0 12px;
  --vs-border: 1px solid rgb(203 213 225);
  --vs-border-radius: 0.5rem;
  --vs-font-size: 0.875rem;
  --vs-font-weight: 400;
  --vs-font-family: inherit;
  --vs-line-height: 1.25rem;
  --vs-text-color: rgb(15 23 42);
  --vs-placeholder-color: rgb(100 116 139);
  --vs-outline-width: 0;
  --vs-menu-offset-top: 6px;
  --vs-menu-height: 200px;
  --vs-option-padding: 9px 12px;
  --vs-menu-z-index: 45;
}

.qc-remote-select :deep(.control) {
  min-height: 40px;
}

.qc-remote-select :deep(.control.focused) {
  border-color: rgb(59 130 246);
  box-shadow: 0 0 0 1px rgb(59 130 246);
}

.qc-remote-select :deep(.value-container) {
  padding: 0 12px;
}

.qc-remote-select :deep(.single-value),
.qc-remote-select :deep(.search-input) {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.qc-remote-select :deep(.indicators-container) {
  padding: 0 8px 0 0;
}

.qc-remote-no-options {
  @apply px-3 py-2 text-xs text-amber-700;
}

.qc-remote-create-action {
  @apply w-full px-3 py-2 text-left text-xs font-semibold text-brand-700 hover:bg-sky-50;
}
</style>


