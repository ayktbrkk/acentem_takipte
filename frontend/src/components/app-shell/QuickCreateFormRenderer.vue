<template>
  <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
    <template v-for="field in fields" :key="field.name">
      <div :class="fieldWrapClass(field)">
        <slot v-if="field.type === 'custom'" :name="`field-${field.name}`" :field="field" />

        <template v-else>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {{ text(field.label) }}
            <span v-if="field.required" class="text-rose-500">*</span>
          </label>

          <select
            v-if="field.type === 'select'"
            v-model="model[field.name]"
            class="input"
            :disabled="disabled || field.disabled"
          >
            <option value="">{{ text(field.placeholder) || text(defaultSelectPlaceholder) }}</option>
            <option
              v-for="option in resolveOptions(field)"
              :key="String(option.value)"
              :value="option.value"
            >
              {{ text(option.label) || option.label || option.value }}
            </option>
          </select>

          <label
            v-else-if="field.type === 'checkbox'"
            class="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <input v-model="model[field.name]" class="h-4 w-4" type="checkbox" :disabled="disabled || field.disabled" />
            <span>{{ text(field.checkboxLabel || field.label) }}</span>
          </label>

          <textarea
            v-else-if="field.type === 'textarea'"
            v-model="model[field.name]"
            class="input min-h-[90px]"
            :rows="field.rows || 3"
            :placeholder="text(field.placeholder)"
            :disabled="disabled || field.disabled"
          />

          <template v-else-if="field.type === 'autocomplete'">
            <input
              v-model="model[field.name]"
              class="input"
              type="text"
              :list="autocompleteListId(field)"
              :placeholder="text(field.placeholder)"
              :disabled="disabled || field.disabled"
              @keyup.enter="$emit('submit')"
            />
            <datalist :id="autocompleteListId(field)">
              <option
                v-for="option in resolveOptions(field)"
                :key="String(option.value ?? option.label)"
                :value="autocompleteOptionValue(option, field)"
              >
                {{ text(option.label) || option.label || option.value }}
              </option>
            </datalist>
          </template>

          <input
            v-else
            v-model="model[field.name]"
            class="input"
            :type="normalizeInputType(field.type)"
            :placeholder="text(field.placeholder)"
            :disabled="disabled || field.disabled"
            :min="field.min"
            :max="field.max"
            :step="field.step"
            @keyup.enter="$emit('submit')"
          />

          <p v-if="fieldErrors?.[field.name]" class="mt-1 text-xs text-rose-600">
            {{ fieldErrors[field.name] }}
          </p>
          <p v-else-if="field.help" class="mt-1 text-xs text-slate-500">
            {{ text(field.help) }}
          </p>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
import { getLocalizedText } from "../../config/quickCreateRegistry";

const props = defineProps({
  fields: { type: Array, default: () => [] },
  model: { type: Object, required: true },
  fieldErrors: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
  locale: { type: String, default: "tr" },
  optionsMap: { type: Object, default: () => ({}) },
  defaultSelectPlaceholder: { type: [String, Object], default: () => ({ tr: "Seciniz", en: "Select" }) },
});

defineEmits(["submit"]);

const autocompletePrefix = `qc-ac-${Math.random().toString(36).slice(2, 8)}`;

function text(value) {
  return getLocalizedText(value, props.locale);
}

function fieldWrapClass(field) {
  return field?.fullWidth ? "md:col-span-2" : "";
}

function normalizeInputType(type) {
  if (["text", "email", "number", "date", "search"].includes(type)) return type;
  return "text";
}

function autocompleteListId(field) {
  return `${autocompletePrefix}-${String(field?.name || "field")}`;
}

function autocompleteOptionValue(option, field) {
  const mode = String(field?.autocompleteValueMode || "label");
  if (mode === "value") return String(option?.value ?? "");
  return String(text(option?.label) || option?.label || option?.value || "");
}

function resolveOptions(field) {
  if (Array.isArray(field?.options)) return field.options;
  if (field?.optionsSource && Array.isArray(props.optionsMap?.[field.optionsSource])) {
    return props.optionsMap[field.optionsSource];
  }
  return [];
}
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm;
}
</style>
