<template>
  <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
    <template v-for="field in fields" :key="field.name">
      <div :class="fieldWrapClass(field)">
        <slot v-if="field.type === 'custom'" :name="`field-${field.name}`" :field="field" />

        <template v-else>
          <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            {{ fieldLabel(field) }}
            <span v-if="isFieldRequired(field)" class="text-amber-500">*</span>
          </label>

          <template v-if="field.type === 'select'">
            <VueSelect
              v-if="isRemoteSelect(field)"
              v-model="model[field.name]"
              :class="controlClass(field, 'qc-remote-select qc-control')"
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
              @menu-opened="onRemoteMenuOpened(field)"
              @menu-closed="onRemoteMenuClosed(field)"
              @option-created="onRelatedCreateRequested(field, $event)"
            >
              <template #no-options>
                <div class="qc-remote-no-options">
                  {{ remoteNoResultsText(field) }}
                </div>
              </template>

              <template #taggable-no-options>
                <button
                  v-if="showRelatedCreateAction(field)"
                  type="button"
                  class="qc-remote-create-action"
                  :disabled="isFieldDisabled(field)"
                  @mousedown.prevent
                  @click="onRelatedCreateButton(field)"
                >
                  {{ relatedCreateActionText(field) }}
                </button>
              </template>
            </VueSelect>

            <select
              v-else
              v-model="model[field.name]"
              :class="controlClass(field, 'input qc-control form-input')"
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
          </template>

          <label
            v-else-if="field.type === 'checkbox'"
            class="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <input v-model="model[field.name]" class="h-4 w-4" type="checkbox" :disabled="isFieldDisabled(field)" />
            <span>{{ text(field.checkboxLabel || field.label) }}</span>
          </label>

          <textarea
            v-else-if="field.type === 'textarea'"
            v-model="model[field.name]"
            :class="controlClass(field, 'input qc-textarea min-h-[90px] form-input')"
            :rows="field.rows || 3"
            :placeholder="text(field.placeholder)"
            :disabled="isFieldDisabled(field)"
          />

          <template v-else-if="field.type === 'autocomplete'">
            <input
              v-model="model[field.name]"
              :class="controlClass(field, 'input qc-control form-input')"
              type="text"
              :list="autocompleteListId(field)"
              :placeholder="text(field.placeholder)"
              :disabled="isFieldDisabled(field)"
              @keyup.enter="emit('submit')"
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
            :class="controlClass(field, 'input qc-control form-input')"
            :type="normalizeInputType(field.type)"
            :placeholder="text(field.placeholder)"
            :disabled="isFieldDisabled(field)"
            :min="field.min"
            :max="field.max"
            :step="field.step"
            @keyup.enter="emit('submit')"
          />

          <p v-if="fieldErrors?.[field.name]" class="form-error">
            {{ fieldErrors[field.name] }}
          </p>
          <p v-else-if="fieldHelp(field)" class="mt-1 text-xs text-slate-500">
            {{ fieldHelp(field) }}
          </p>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
import VueSelect from "vue3-select-component";
import { useQuickCreateFormRenderer } from "../../composables/useQuickCreateFormRenderer";

const props = defineProps({
  fields: { type: Array, default: () => [] },
  model: { type: Object, required: true },
  fieldErrors: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
  locale: { type: String, default: "tr" },
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
  autocompleteListId,
  autocompleteOptionValue,
  resolveOptions,
  resolveSelectOptions,
  resolveRemoteSelectOptions,
  remoteMenuClass,
  remoteNoResultsText,
  isRemoteSelect,
  canCreateRelated,
  showRelatedCreateAction,
  relatedCreateActionText,
  onRelatedCreateRequested,
  onRelatedCreateButton,
  remoteLoadingMap,
  onRemoteSelectSearch,
  onRemoteMenuOpened,
  onRemoteMenuClosed,
  onRemoteMenuRef,
  setOptionRef,
  getHighlightedParts,
} = useQuickCreateFormRenderer(props, emit);
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800;
}

.qc-control {
  @apply h-10;
}

.qc-textarea {
  @apply h-auto py-2;
}

.input.qc-control:focus {
  @apply border-blue-500 ring-1 ring-blue-500 outline-none;
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
  @apply w-full px-3 py-2 text-left text-xs font-semibold text-sky-700 hover:bg-sky-50;
}
</style>


