import { getCurrentInstance, nextTick, onBeforeUnmount, reactive, ref, unref } from "vue";

import { getLocalizedText } from "../config/quickCreateRegistry";
import { getRelatedQuickCreateActionLabel, supportsRelatedQuickCreateSource } from "../utils/relatedQuickCreate";

export function useQuickCreateFormRenderer(props, emit) {
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

  function readOptionsMapValue(field, source) {
    if (!source) {
      return [];
    }
    if (Array.isArray(source)) {
      return source;
    }
    if (typeof source === "function") {
      return source({ field, model: props.model, locale: props.locale, text }) || [];
    }
    return [];
  }

  function resolveOptions(field) {
    const fieldName = String(field?.name || "");
    const sourceKey = String(field?.optionsSource || "");
    const mapValue = (sourceKey && props.optionsMap?.[sourceKey]) || props.optionsMap?.[fieldName];
    if (mapValue) {
      return readOptionsMapValue(field, mapValue);
    }
    return Array.isArray(field?.options) ? field.options : [];
  }

  function resolveRemoteSelectOptions(field) {
    const fieldName = String(field?.name || "");
    const baseOptions = resolveOptions(field);
    const remoteOptions = remoteOptionsMap[fieldName] || [];
    return mergeOptions(remoteOptions, baseOptions);
  }

  function remoteMenuClass(field) {
    return `qc-remote-menu qc-remote-menu--${sanitizeClassSegment(field?.name)}`;
  }

  function remoteNoResultsText(field) {
    return text(field?.remoteNoResultsText) || text({ tr: "Sonuç bulunamadı", en: "No results found" });
  }

  function isRemoteSelect(field) {
    return Boolean(field?.remoteSearch || field?.remoteSelect || field?.searchMethod);
  }

  function canCreateRelated(field) {
    return Boolean(field?.relatedQuickCreate && supportsRelatedQuickCreateSource(field?.relatedQuickCreate));
  }

  function showRelatedCreateAction(field) {
    return canCreateRelated(field) && hasRelatedCreateListener();
  }

  function relatedCreateActionText(field) {
    return getRelatedQuickCreateActionLabel(field?.relatedQuickCreate, props.locale);
  }

  function onRelatedCreateRequested(field, payload) {
    emit("request-related-create", { field, payload });
  }

  function onRelatedCreateButton(field) {
    emit("request-related-create", { field });
  }

  function ensureRemoteState(fieldName) {
    if (!remoteOptionsMap[fieldName]) {
      remoteOptionsMap[fieldName] = [];
    }
    if (!remoteQueryMap[fieldName]) {
      remoteQueryMap[fieldName] = "";
    }
    if (!remoteHasMoreMap[fieldName]) {
      remoteHasMoreMap[fieldName] = false;
    }
    if (!remoteNextStartMap[fieldName]) {
      remoteNextStartMap[fieldName] = 0;
    }
  }

  function readRemoteRequestToken(fieldName) {
    if (!remoteTokenMap[fieldName]) {
      remoteTokenMap[fieldName] = 0;
    }
    return remoteTokenMap[fieldName];
  }

  function nextRemoteRequestToken(fieldName) {
    const next = Number(readRemoteRequestToken(fieldName) || 0) + 1;
    remoteTokenMap[fieldName] = next;
    return next;
  }

  function isActiveRemoteRequest(fieldName, token) {
    return readRemoteRequestToken(fieldName) === token;
  }

  function getRemoteSearchMethod(field) {
    return field?.searchMethod || REMOTE_SEARCH_METHOD;
  }

  async function loadRemoteOptions(field, { append = false, query = "", start = 0, pageSize = REMOTE_DEFAULT_PAGE_SIZE } = {}) {
    const fieldName = String(field?.name || "");
    if (!fieldName) return;
    ensureRemoteState(fieldName);

    const token = nextRemoteRequestToken(fieldName);
    remoteLoadingMap[fieldName] = true;

    try {
      const response = await window.frappe.call({
        method: getRemoteSearchMethod(field),
        args: {
          doctype: field?.remoteDoctype || field?.doctype || fieldName,
          query,
          start,
          page_size: Math.min(Math.max(Number(pageSize || REMOTE_DEFAULT_PAGE_SIZE), 1), REMOTE_MAX_PAGE_SIZE),
        },
      });
      if (!isActiveRemoteRequest(fieldName, token)) return;
      const rawList = Array.isArray(response?.message) ? response.message : [];
      const normalizedList = rawList.map(normalizeOption).filter(Boolean);
      remoteOptionsMap[fieldName] = append ? mergeOptions(remoteOptionsMap[fieldName] || [], normalizedList) : normalizedList;
      remoteQueryMap[fieldName] = query;
      remoteHasMoreMap[fieldName] = normalizedList.length >= Math.min(Math.max(Number(pageSize || REMOTE_DEFAULT_PAGE_SIZE), 1), REMOTE_MAX_PAGE_SIZE);
      remoteNextStartMap[fieldName] = start + normalizedList.length;
    } finally {
      if (isActiveRemoteRequest(fieldName, token)) {
        remoteLoadingMap[fieldName] = false;
      }
    }
  }

  function scheduleRemoteSearch(field, query) {
    const fieldName = String(field?.name || "");
    if (!fieldName) return;
    if (remoteSearchTimers.has(fieldName)) {
      clearTimeout(remoteSearchTimers.get(fieldName));
    }
    remoteSearchTimers.set(
      fieldName,
      setTimeout(() => {
        remoteSearchTimers.delete(fieldName);
        const normalizedQuery = String(query || "").trim();
        if (normalizedQuery.length < REMOTE_SEARCH_MIN_CHARS) {
          remoteOptionsMap[fieldName] = [];
          remoteHasMoreMap[fieldName] = false;
          remoteNextStartMap[fieldName] = 0;
          return;
        }
        void loadRemoteOptions(field, { query: normalizedQuery, start: 0, append: false });
      }, REMOTE_SEARCH_DEBOUNCE_MS),
    );
  }

  function onRemoteSelectSearch(field, query) {
    scheduleRemoteSearch(field, query);
  }

  function onRemoteMenuOpened(field) {
    const fieldName = String(field?.name || "");
    if (!fieldName) return;
    if (remoteOptionsMap[fieldName]?.length) return;
    void loadRemoteOptions(field, { query: "", start: 0, append: false });
  }

  function onRemoteMenuClosed(field) {
    const fieldName = String(field?.name || "");
    if (!fieldName) return;
    if (remoteSearchTimers.has(fieldName)) {
      clearTimeout(remoteSearchTimers.get(fieldName));
      remoteSearchTimers.delete(fieldName);
    }
  }

  function canLoadMoreRemoteOptions(field) {
    return Boolean(remoteHasMoreMap[String(field?.name || "")]);
  }

  function loadMoreRemoteOptions(field) {
    const fieldName = String(field?.name || "");
    if (!fieldName || !canLoadMoreRemoteOptions(field)) return;
    const query = remoteQueryMap[fieldName] || "";
    const start = Number(remoteNextStartMap[fieldName] || 0);
    void loadRemoteOptions(field, { query, start, append: true });
  }

  function onRemoteMenuScroll(field, event) {
    const fieldName = String(field?.name || "");
    if (!fieldName || !event?.target) return;
    const el = event.target;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (remaining <= REMOTE_SCROLL_THRESHOLD) {
      loadMoreRemoteOptions(field);
    }
  }

  function onRemoteMenuRef(field, element) {
    const fieldName = String(field?.name || "");
    if (!fieldName) return;
    if (!element) {
      remoteMenuScrollMap.delete(fieldName);
      return;
    }
    if (remoteMenuScrollMap.get(fieldName) === element) {
      return;
    }
    remoteMenuScrollMap.set(fieldName, element);
    element.addEventListener("scroll", (event) => onRemoteMenuScroll(field, event), { passive: true });
  }

  function remoteMenuOpened(field) {
    onRemoteMenuOpened(field);
  }

  function remoteMenuClosed(field) {
    onRemoteMenuClosed(field);
  }

  function remoteSelectOptions(field) {
    return resolveRemoteSelectOptions(field);
  }

  function remoteMenuClassForField(field) {
    return remoteMenuClass(field);
  }

  function remoteNoResultsTextForField(field) {
    return remoteNoResultsText(field);
  }

  function fieldHasRemoteOptions(field) {
    return remoteOptionsMap[String(field?.name || "")]?.length > 0;
  }

  function unregisterRemoteTimers() {
    for (const timer of remoteSearchTimers.values()) {
      clearTimeout(timer);
    }
    remoteSearchTimers.clear();
  }

  function remoteLoading(field) {
    return Boolean(remoteLoadingMap[String(field?.name || "")]);
  }

  onBeforeUnmount(() => {
    unregisterRemoteTimers();
  });

  return {
    text,
    fieldLabel,
    fieldHelp,
    isFieldRequired,
    isFieldDisabled,
    hasRelatedCreateListener,
    fieldWrapClass,
    controlClass,
    normalizeInputType,
    autocompleteListId,
    autocompleteOptionValue,
    normalizeForSearch,
    sanitizeClassSegment,
    resolveOptions,
    resolveRemoteSelectOptions,
    remoteMenuClass: remoteMenuClassForField,
    remoteNoResultsText: remoteNoResultsTextForField,
    isRemoteSelect,
    canCreateRelated,
    showRelatedCreateAction,
    relatedCreateActionText,
    onRelatedCreateRequested,
    onRelatedCreateButton,
    remoteLoadingMap,
    remoteLoading,
    remoteSelectOptions,
    resolveSelectOptions: resolveOptions,
    remoteMenuOpened,
    remoteMenuClosed,
    onRemoteSelectSearch,
    onRemoteMenuOpened: remoteMenuOpened,
    onRemoteMenuClosed: remoteMenuClosed,
    onRemoteMenuScroll,
    onRemoteMenuRef,
    fieldHasRemoteOptions,
    canLoadMoreRemoteOptions,
    loadMoreRemoteOptions,
    getHighlightedParts: () => [],
    instance,
    onSubmit: () => emit("submit"),
    onBeforeUnmount,
    nextTick,
    reactive,
    ref,
    unref,
    REMOTE_SEARCH_DEBOUNCE_MS,
    REMOTE_SEARCH_MIN_CHARS,
    REMOTE_SCROLL_THRESHOLD,
    REMOTE_DEFAULT_PAGE_SIZE,
    REMOTE_MAX_PAGE_SIZE,
    REMOTE_SEARCH_METHOD,
  };
}
