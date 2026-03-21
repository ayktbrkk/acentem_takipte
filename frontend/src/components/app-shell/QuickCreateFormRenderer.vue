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
import { getCurrentInstance, nextTick, onBeforeUnmount, reactive } from "vue";
import VueSelect from "vue3-select-component";
import { getLocalizedText } from "../../config/quickCreateRegistry";
import {
  getRelatedQuickCreateActionLabel,
  supportsRelatedQuickCreateSource,
} from "../../utils/relatedQuickCreate";

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
const instance = getCurrentInstance();

const autocompletePrefix = `qc-ac-${Math.random().toString(36).slice(2, 8)}`;
const remoteLoadingMap = reactive({});
const remoteOptionsMap = reactive({});
const remoteQueryMap = reactive({});
const remoteHasMoreMap = reactive({});
const remoteNextStartMap = reactive({});
const remoteTokenMap = reactive({});
const remoteSearchTimers = new Map();
const remoteMenuScrollMap = new Map();

const REMOTE_SEARCH_DEBOUNCE_MS = 280;
const REMOTE_SEARCH_MIN_CHARS = 2;
const REMOTE_SCROLL_THRESHOLD = 20;
const REMOTE_DEFAULT_PAGE_SIZE = 5;
const REMOTE_MAX_PAGE_SIZE = 50;
const REMOTE_SEARCH_METHOD = "acentem_takipte.acentem_takipte.api.quick_create.search_quick_options";

function text(value) {
  return getLocalizedText(value, props.locale);
}

function resolveFieldValue(source, field) {
  if (typeof source === "function") {
    return source({
      field,
      model: props.model,
      locale: props.locale,
      text,
    });
  }
  return source;
}

function fieldLabel(field) {
  return text(resolveFieldValue(field?.label, field));
}

function fieldHelp(field) {
  return text(resolveFieldValue(field?.help, field));
}

function isFieldRequired(field) {
  return Boolean(resolveFieldValue(field?.required, field));
}

function isFieldDisabled(field) {
  return Boolean(props.disabled || resolveFieldValue(field?.disabled, field));
}

function hasRelatedCreateListener() {
  const vnodeProps = instance?.vnode?.props || {};
  return Boolean(vnodeProps.onRequestRelatedCreate || vnodeProps["onRequest-related-create"]);
}

function fieldWrapClass(field) {
  return field?.fullWidth ? "md:col-span-2" : "";
}

function hasFieldError(field) {
  return Boolean(props.fieldErrors?.[field?.name]);
}

function controlClass(field, baseClass) {
  return [baseClass, hasFieldError(field) ? "error" : ""];
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

function sanitizeClassSegment(value) {
  return String(value || "field").replace(/[^a-zA-Z0-9_-]/g, "-");
}

function normalizeOption(option) {
  const value = String(option?.value ?? "").trim();
  if (!value) return null;
  const label = String(text(option?.label) || option?.label || value).trim() || value;
  const description = String(option?.description ?? "").trim();
  return description ? { value, label, description } : { value, label };
}

function mergeOptions(primary, secondary) {
  const out = [];
  const seen = new Set();
  for (const option of [...primary, ...secondary]) {
    const normalized = normalizeOption(option);
    if (!normalized) continue;
    const key = String(normalized.value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }
  return out;
}

function resolveOptions(field) {
  if (Array.isArray(field?.options)) return field.options;
  if (field?.optionsSource && Array.isArray(props.optionsMap?.[field.optionsSource])) {
    return props.optionsMap[field.optionsSource];
  }
  return [];
}

function resolveSelectOptions(field) {
  return resolveOptions(field).slice();
}

function isRemoteSelect(field) {
  return field?.type === "select" && Boolean(String(field?.optionsSource || "").trim());
}

function resolveRemoteSelectSource(field) {
  return String(field?.optionsSource || "").trim();
}

function remoteMenuClass(field) {
  return `qc-remote-menu-${sanitizeClassSegment(field?.name)}`;
}

function resolveRemoteSearchMinChars(field) {
  const value = Number(field?.remoteSearchMinChars ?? REMOTE_SEARCH_MIN_CHARS);
  if (!Number.isFinite(value) || value < 1) return REMOTE_SEARCH_MIN_CHARS;
  return Math.round(value);
}

function resolveRemoteSearchLimit(field) {
  const value = Number(field?.remoteSearchLimit ?? REMOTE_DEFAULT_PAGE_SIZE);
  if (!Number.isFinite(value) || value < 1) return REMOTE_DEFAULT_PAGE_SIZE;
  return Math.min(REMOTE_MAX_PAGE_SIZE, Math.round(value));
}

function resolveRemoteSelectOptions(field) {
  const fieldName = String(field?.name || "");
  const queryText = String(remoteQueryMap[fieldName] || "").trim();
  const loaded = Array.isArray(remoteOptionsMap[fieldName]) ? remoteOptionsMap[fieldName] : [];

  if (queryText) {
    return loaded;
  }

  const selectedValue = String(props.model?.[fieldName] ?? "").trim();
  if (!selectedValue) return loaded;

  const selectedInLoaded = loaded.find((option) => String(option?.value ?? "") === selectedValue);
  if (selectedInLoaded) return loaded;

  const selectedInBase = resolveOptions(field)
    .map((option) => normalizeOption(option))
    .find((option) => option && option.value === selectedValue);

  if (selectedInBase) return mergeOptions([selectedInBase], loaded);
  return mergeOptions([{ value: selectedValue, label: selectedValue }], loaded);
}

function remoteNoResultsText(field) {
  const label = text(field?.label) || "";
  if (props.locale === "tr") {
    return label ? `${label} için kayıt bulunamadı.` : "Kayıt bulunamadı.";
  }
  return label ? `No records found for ${label}.` : "No records found.";
}

function canCreateRelated(field) {
  if (!hasRelatedCreateListener()) return false;
  const source = resolveRemoteSelectSource(field);
  return supportsRelatedQuickCreateSource(source);
}

function showRelatedCreateAction(field) {
  if (!canCreateRelated(field)) return false;
  const fieldName = String(field?.name || "");
  const queryText = String(remoteQueryMap[fieldName] || "").trim();
  if (queryText.length < resolveRemoteSearchMinChars(field)) return false;
  if (remoteLoadingMap[fieldName]) return false;
  return resolveRemoteSelectOptions(field).length === 0;
}

function relatedCreateActionText(field) {
  const source = resolveRemoteSelectSource(field);
  const fieldName = String(field?.name || "");
  const queryText = String(remoteQueryMap[fieldName] || "").trim();
  return getRelatedQuickCreateActionLabel(source, props.locale, queryText);
}

function onRelatedCreateRequested(field, value) {
  if (!canCreateRelated(field)) return;
  const fieldName = String(field?.name || "");
  const queryText = String(value || remoteQueryMap[fieldName] || "").trim();
  if (!queryText) return;
  emit("request-related-create", {
    optionsSource: resolveRemoteSelectSource(field),
    fieldName,
    query: queryText,
  });
}

function onRelatedCreateButton(field) {
  onRelatedCreateRequested(field, remoteQueryMap[String(field?.name || "")]);
}

function scheduleRemoteSearch(field, queryText, { immediate = false } = {}) {
  const fieldName = String(field?.name || "");
  if (!fieldName) return;

  const previousTimer = remoteSearchTimers.get(fieldName);
  if (previousTimer) clearTimeout(previousTimer);

  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  remoteTokenMap[fieldName] = token;

  const run = () => {
    void fetchRemoteOptions(field, {
      query: queryText,
      reset: true,
      token,
    });
  };

  if (immediate) {
    run();
    return;
  }

  const timer = setTimeout(run, REMOTE_SEARCH_DEBOUNCE_MS);
  remoteSearchTimers.set(fieldName, timer);
}

function onRemoteSelectSearch(field, value) {
  const fieldName = String(field?.name || "");
  if (!fieldName) return;
  const queryText = String(value || "").trim();
  remoteQueryMap[fieldName] = queryText;
  scheduleRemoteSearch(field, queryText);
}

async function onRemoteMenuOpened(field) {
  const fieldName = String(field?.name || "");
  if (!fieldName) return;

  const queryText = String(remoteQueryMap[fieldName] || "").trim();
  if (!Array.isArray(remoteOptionsMap[fieldName]) || remoteOptionsMap[fieldName].length === 0) {
    scheduleRemoteSearch(field, queryText, { immediate: true });
  }

  await nextTick();
  attachRemoteMenuScroll(field);
}

function onRemoteMenuClosed(field) {
  const fieldName = String(field?.name || "");
  if (!fieldName) return;
  detachRemoteMenuScroll(fieldName);
}

function attachRemoteMenuScroll(field) {
  const fieldName = String(field?.name || "");
  if (!fieldName || remoteMenuScrollMap.has(fieldName)) return;

  const menuElement = document.querySelector(`.${remoteMenuClass(field)}`);
  if (!menuElement) return;

  const onScroll = () => {
    if (remoteLoadingMap[fieldName]) return;
    if (!remoteHasMoreMap[fieldName]) return;

    const remaining = menuElement.scrollHeight - menuElement.scrollTop - menuElement.clientHeight;
    if (remaining > REMOTE_SCROLL_THRESHOLD) return;

    const token = String(remoteTokenMap[fieldName] || "");
    void fetchRemoteOptions(field, {
      query: String(remoteQueryMap[fieldName] || "").trim(),
      reset: false,
      token,
    });
  };

  menuElement.addEventListener("scroll", onScroll, { passive: true });
  remoteMenuScrollMap.set(fieldName, { menuElement, onScroll });
}

function detachRemoteMenuScroll(fieldName) {
  const entry = remoteMenuScrollMap.get(fieldName);
  if (!entry) return;
  entry.menuElement.removeEventListener("scroll", entry.onScroll);
  remoteMenuScrollMap.delete(fieldName);
}

async function fetchRemoteOptions(field, { query = "", reset = false, token = "" } = {}) {
  const fieldName = String(field?.name || "");
  const optionsSource = resolveRemoteSelectSource(field);
  if (!fieldName || !optionsSource) return;

  const activeToken = String(remoteTokenMap[fieldName] || "");
  if (token && activeToken && token !== activeToken) return;

  if (remoteLoadingMap[fieldName]) return;
  if (!reset && !remoteHasMoreMap[fieldName]) return;

  const limit = resolveRemoteSearchLimit(field);
  const start = reset ? 0 : Number(remoteNextStartMap[fieldName] || 0);

  remoteLoadingMap[fieldName] = true;
  try {
    const searchParams = new URLSearchParams({
      options_source: optionsSource,
      query: String(query || ""),
      limit: String(limit),
      start: String(start),
    });

    const response = await fetch(`/api/method/${REMOTE_SEARCH_METHOD}?${searchParams.toString()}`, {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });

    const payload = await response.json().catch(() => ({}));
    if (token && String(remoteTokenMap[fieldName] || "") !== token) return;

    const message = payload?.message || {};
    const options = Array.isArray(message?.options)
      ? message.options.map((item) => normalizeOption(item)).filter(Boolean)
      : [];

    if (reset) {
      remoteOptionsMap[fieldName] = options;
    } else {
      remoteOptionsMap[fieldName] = mergeOptions(remoteOptionsMap[fieldName] || [], options);
    }

    const hasMore = typeof message?.has_more === "boolean" ? message.has_more : options.length >= limit;
    remoteHasMoreMap[fieldName] = Boolean(hasMore);

    const nextStart = Number(message?.next_start);
    remoteNextStartMap[fieldName] = Number.isFinite(nextStart) ? nextStart : start + options.length;
  } catch {
    if (reset) {
      remoteOptionsMap[fieldName] = [];
    }
    remoteHasMoreMap[fieldName] = false;
  } finally {
    remoteLoadingMap[fieldName] = false;
  }
}

onBeforeUnmount(() => {
  for (const timer of remoteSearchTimers.values()) {
    clearTimeout(timer);
  }
  remoteSearchTimers.clear();

  for (const [fieldName, entry] of remoteMenuScrollMap.entries()) {
    entry.menuElement.removeEventListener("scroll", entry.onScroll);
    remoteMenuScrollMap.delete(fieldName);
  }
});
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
