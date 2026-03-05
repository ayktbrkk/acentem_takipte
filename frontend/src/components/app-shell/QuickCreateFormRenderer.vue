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

          <template v-if="field.type === 'select'">
            <input
              v-if="isSearchableSelect(field)"
              v-model.trim="selectSearchMap[field.name]"
              class="input mb-2"
              type="search"
              :placeholder="text(field.searchPlaceholder) || text(defaultSearchPlaceholder)"
              :disabled="disabled || field.disabled"
              @input="onSelectSearchInput(field)"
            />

            <select
              v-model="model[field.name]"
              class="input"
              :disabled="disabled || field.disabled"
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

            <p v-if="remoteLoadingMap[field.name]" class="mt-1 text-xs text-slate-500">
              {{ text(remoteSearchLoadingLabel) }}
            </p>
          </template>

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
import { onBeforeUnmount, reactive } from "vue";
import { getLocalizedText } from "../../config/quickCreateRegistry";

const props = defineProps({
  fields: { type: Array, default: () => [] },
  model: { type: Object, required: true },
  fieldErrors: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
  locale: { type: String, default: "tr" },
  optionsMap: { type: Object, default: () => ({}) },
  defaultSelectPlaceholder: { type: [String, Object], default: () => ({ tr: "Seciniz", en: "Select" }) },
  defaultSearchPlaceholder: { type: [String, Object], default: () => ({ tr: "Listede ara...", en: "Search in list..." }) },
  remoteSearchLoadingLabel: { type: [String, Object], default: () => ({ tr: "Sunucuda araniyor...", en: "Searching on server..." }) },
});

defineEmits(["submit"]);

const autocompletePrefix = `qc-ac-${Math.random().toString(36).slice(2, 8)}`;
const selectSearchMap = reactive({});
const remoteLoadingMap = reactive({});
const remoteOptionsMap = reactive({});
const selectSearchTimers = new Map();
const selectSearchTokens = new Map();
const REMOTE_SEARCH_DEBOUNCE_MS = 280;
const REMOTE_SEARCH_MIN_CHARS = 2;
const REMOTE_SEARCH_DEFAULT_LIMIT = 20;
const REMOTE_SEARCH_METHOD = "acentem_takipte.acentem_takipte.api.quick_create.search_quick_options";

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

function normalizeForSearch(value) {
  return String(value ?? "").trim().toLocaleLowerCase(props.locale === "tr" ? "tr-TR" : "en-US");
}

function isSearchableSelect(field) {
  if (!field || field.type !== "select") return false;
  if (typeof field.searchable === "boolean") return field.searchable;
  return Boolean(field.optionsSource);
}

function resolveSelectOptions(field) {
  const allOptions = resolveOptions(field);
  const options = allOptions.slice();
  if (!isSearchableSelect(field)) return options;

  const query = normalizeForSearch(selectSearchMap[field.name]);
  const filtered = !query
    ? options
    : options.filter((option) => {
        const label = text(option?.label) || option?.label || option?.value || "";
        return normalizeForSearch(label).includes(query) || normalizeForSearch(option?.value).includes(query);
      });
  const remote = resolveRemoteOptions(field, query);
  const resolved = remote.length ? mergeOptions(remote, filtered) : filtered;

  const selectedValue = String(props.model?.[field.name] ?? "");
  if (!selectedValue) return resolved;

  const selectedInFiltered = resolved.some((option) => String(option?.value ?? "") === selectedValue);
  if (selectedInFiltered) return resolved;

  const selectedInAll = allOptions.find((option) => String(option?.value ?? "") === selectedValue);
  if (selectedInAll) return [selectedInAll, ...resolved];

  return [{ value: selectedValue, label: selectedValue }, ...resolved];
}

function resolveOptions(field) {
  if (Array.isArray(field?.options)) return field.options;
  if (field?.optionsSource && Array.isArray(props.optionsMap?.[field.optionsSource])) {
    return props.optionsMap[field.optionsSource];
  }
  return [];
}

function resolveRemoteOptions(field, query) {
  if (!isRemoteSearchEnabled(field)) return [];
  if (!query || query.length < resolveRemoteSearchMinChars(field)) return [];
  return Array.isArray(remoteOptionsMap[field.name]) ? remoteOptionsMap[field.name] : [];
}

function mergeOptions(primary, secondary) {
  const out = [];
  const seen = new Set();
  for (const option of [...primary, ...secondary]) {
    const key = String(option?.value ?? "");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(option);
  }
  return out;
}

function isRemoteSearchEnabled(field) {
  if (!field?.optionsSource) return false;
  if (typeof field.remoteSearch === "boolean") return field.remoteSearch;
  return true;
}

function resolveRemoteSearchMinChars(field) {
  const value = Number(field?.remoteSearchMinChars ?? REMOTE_SEARCH_MIN_CHARS);
  if (!Number.isFinite(value) || value < 1) return REMOTE_SEARCH_MIN_CHARS;
  return Math.round(value);
}

function resolveRemoteSearchLimit(field) {
  const value = Number(field?.remoteSearchLimit ?? REMOTE_SEARCH_DEFAULT_LIMIT);
  if (!Number.isFinite(value) || value < 1) return REMOTE_SEARCH_DEFAULT_LIMIT;
  return Math.min(50, Math.round(value));
}

function onSelectSearchInput(field) {
  if (!isRemoteSearchEnabled(field)) return;
  const fieldName = String(field?.name || "");
  if (!fieldName) return;

  const query = String(selectSearchMap[fieldName] || "").trim();
  const timer = selectSearchTimers.get(fieldName);
  if (timer) clearTimeout(timer);

  if (query.length < resolveRemoteSearchMinChars(field)) {
    remoteOptionsMap[fieldName] = [];
    remoteLoadingMap[fieldName] = false;
    selectSearchTokens.delete(fieldName);
    return;
  }

  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  selectSearchTokens.set(fieldName, token);
  const nextTimer = setTimeout(() => {
    void fetchRemoteOptions(field, query, token);
  }, REMOTE_SEARCH_DEBOUNCE_MS);
  selectSearchTimers.set(fieldName, nextTimer);
}

async function fetchRemoteOptions(field, query, token) {
  const fieldName = String(field?.name || "");
  const optionsSource = String(field?.optionsSource || "").trim();
  if (!fieldName || !optionsSource) return;
  if (selectSearchTokens.get(fieldName) !== token) return;

  remoteLoadingMap[fieldName] = true;
  try {
    const searchParams = new URLSearchParams({
      options_source: optionsSource,
      query: String(query || ""),
      limit: String(resolveRemoteSearchLimit(field)),
    });
    const response = await fetch(`/api/method/${REMOTE_SEARCH_METHOD}?${searchParams.toString()}`, {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    const payload = await response.json().catch(() => ({}));
    if (selectSearchTokens.get(fieldName) !== token) return;

    const options = Array.isArray(payload?.message?.options) ? payload.message.options : [];
    remoteOptionsMap[fieldName] = options
      .map((item) => ({
        value: String(item?.value ?? "").trim(),
        label: String(item?.label ?? item?.value ?? "").trim(),
      }))
      .filter((item) => item.value);
  } catch {
    if (selectSearchTokens.get(fieldName) !== token) return;
    remoteOptionsMap[fieldName] = [];
  } finally {
    if (selectSearchTokens.get(fieldName) === token) {
      remoteLoadingMap[fieldName] = false;
    }
  }
}

onBeforeUnmount(() => {
  for (const timer of selectSearchTimers.values()) {
    clearTimeout(timer);
  }
  selectSearchTimers.clear();
  selectSearchTokens.clear();
});
</script>

<style scoped>
.input {
  @apply w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base sm:text-sm;
}
</style>
