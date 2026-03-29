import { getCurrentInstance, nextTick, onBeforeUnmount, reactive } from "vue";

import { getLocalizedText } from "@/config/quickCreateRegistry";
import { getRelatedQuickCreateActionLabel, supportsRelatedQuickCreateSource } from "@/utils/relatedQuickCreate";

const REMOTE_SEARCH_DEBOUNCE_MS = 280;
const REMOTE_SEARCH_MIN_CHARS = 2;
const REMOTE_SCROLL_THRESHOLD = 20;
const REMOTE_DEFAULT_PAGE_SIZE = 5;
const REMOTE_MAX_PAGE_SIZE = 50;
const REMOTE_SEARCH_METHOD = "acentem_takipte.acentem_takipte.api.quick_create.search_quick_options";

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
    const fieldName = String(field?.name || "");
    return props.optionsMap?.[fieldName] || field?.options || [];
  }

  function resolveSelectOptions(field) {
    return resolveOptions(field).map((option) => normalizeOption(option)).filter(Boolean);
  }

  function isRemoteSelect(field) {
    return Boolean(resolveRemoteSelectSource(field));
  }

  function resolveRemoteSelectSource(field) {
    const source = resolveFieldValue(field?.remoteOptionsSource, field);
    return String(source || "").trim();
  }

  function remoteMenuClass(field) {
    return `qc-remote-menu qc-remote-menu--${sanitizeClassSegment(field?.name)}`;
  }

  function resolveRemoteSearchMinChars(field) {
    const configured = Number(resolveFieldValue(field?.remoteSearchMinChars, field));
    if (Number.isFinite(configured) && configured >= 0) return configured;
    return REMOTE_SEARCH_MIN_CHARS;
  }

  function resolveRemoteSearchLimit(field) {
    const configured = Number(resolveFieldValue(field?.remoteSearchLimit, field));
    if (Number.isFinite(configured) && configured > 0) {
      return Math.min(configured, REMOTE_MAX_PAGE_SIZE);
    }
    return REMOTE_DEFAULT_PAGE_SIZE;
  }

  function resolveRemoteSelectOptions(field) {
    const fieldName = String(field?.name || "");
    const remoteItems = remoteOptionsMap[fieldName] || [];
    const baseItems = resolveSelectOptions(field);
    return mergeOptions(remoteItems, baseItems);
  }

  function remoteNoResultsText(field) {
    const label = fieldLabel(field);
    const locale = props.locale === "tr" ? "tr" : "en";
    return locale === "tr"
      ? `${label ? `${label} için ` : ""}eşleşen kayıt bulunamadı`
      : `${label ? `No matching records for ${label}` : "No matching records"}`;
  }

  function canCreateRelated(field) {
    return Boolean(
      hasRelatedCreateListener()
      && supportsRelatedQuickCreateSource(resolveRemoteSelectSource(field))
    );
  }

  function showRelatedCreateAction(field) {
    return canCreateRelated(field) && !remoteLoadingMap[String(field?.name || "")];
  }

  function relatedCreateActionText(field) {
    return getRelatedQuickCreateActionLabel({
      source: resolveRemoteSelectSource(field),
      field,
      locale: props.locale,
      fallbackLabel: fieldLabel(field),
    });
  }

  function onRelatedCreateRequested(field, value) {
    emit("request-related-create", {
      field,
      value,
      source: resolveRemoteSelectSource(field),
    });
  }

  function onRelatedCreateButton(field) {
    onRelatedCreateRequested(field, props.model?.[field?.name]);
  }

  function scheduleRemoteSearch(field, queryText, { immediate = false } = {}) {
    const fieldName = String(field?.name || "");
    if (!fieldName) return;

    const minChars = resolveRemoteSearchMinChars(field);
    const trimmed = String(queryText || "").trim();
    if (trimmed.length < minChars) {
      remoteQueryMap[fieldName] = trimmed;
      remoteOptionsMap[fieldName] = [];
      remoteHasMoreMap[fieldName] = false;
      remoteNextStartMap[fieldName] = 0;
      remoteTokenMap[fieldName] = `${fieldName}:${trimmed}:${Date.now()}`;
      if (remoteSearchTimers.has(fieldName)) {
        clearTimeout(remoteSearchTimers.get(fieldName));
        remoteSearchTimers.delete(fieldName);
      }
      return;
    }

    remoteQueryMap[fieldName] = trimmed;
    const token = `${fieldName}:${trimmed}:${Date.now()}`;
    remoteTokenMap[fieldName] = token;

    if (remoteSearchTimers.has(fieldName)) {
      clearTimeout(remoteSearchTimers.get(fieldName));
      remoteSearchTimers.delete(fieldName);
    }

    const runSearch = () => {
      void fetchRemoteOptions(field, { query: trimmed, reset: true, token });
    };

    if (immediate) {
      runSearch();
      return;
    }

    const timer = setTimeout(runSearch, REMOTE_SEARCH_DEBOUNCE_MS);
    remoteSearchTimers.set(fieldName, timer);
  }

  function onRemoteSelectSearch(field, value) {
    scheduleRemoteSearch(field, value);
  }

  async function onRemoteMenuOpened(field) {
    const fieldName = String(field?.name || "");
    if (!fieldName) return;

    const token = `${fieldName}:${Date.now()}`;
    remoteTokenMap[fieldName] = token;

    if (!remoteOptionsMap[fieldName]?.length) {
      await fetchRemoteOptions(field, { query: remoteQueryMap[fieldName] || "", reset: true, token });
    }

    attachRemoteMenuScroll(field);
  }

  function onRemoteMenuClosed(field) {
    const fieldName = String(field?.name || "");
    if (!fieldName) return;
    detachRemoteMenuScroll(fieldName);
    if (remoteSearchTimers.has(fieldName)) {
      clearTimeout(remoteSearchTimers.get(fieldName));
      remoteSearchTimers.delete(fieldName);
    }
  }

  function attachRemoteMenuScroll(field) {
    const fieldName = String(field?.name || "");
    if (!fieldName || remoteMenuScrollMap.has(fieldName)) return;

    nextTick(() => {
      const menuSelector = `.qc-remote-menu--${sanitizeClassSegment(fieldName)} .menu`;
      const menuElement = document.querySelector(menuSelector);
      if (!menuElement) return;

      const onScroll = () => {
        if (remoteLoadingMap[fieldName] || !remoteHasMoreMap[fieldName]) return;
        const distanceToBottom =
          menuElement.scrollHeight - menuElement.scrollTop - menuElement.clientHeight;
        if (distanceToBottom > REMOTE_SCROLL_THRESHOLD) return;

        const token = `${fieldName}:${Date.now()}`;
        remoteTokenMap[fieldName] = token;
        void fetchRemoteOptions(field, {
          query: String(remoteQueryMap[fieldName] || "").trim(),
          reset: false,
          token,
        });
      };

      menuElement.addEventListener("scroll", onScroll, { passive: true });
      remoteMenuScrollMap.set(fieldName, { menuElement, onScroll });
    });
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

      const payload = await response.json().catch((err) => {
        frappe.msgprint({ message: err?.message || __('Operation failed'), indicator: 'red' });
        return {};
      });
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

  return {
    text,
    resolveFieldValue,
    fieldLabel,
    fieldHelp,
    isFieldRequired,
    isFieldDisabled,
    hasRelatedCreateListener,
    fieldWrapClass,
    hasFieldError,
    controlClass,
    normalizeInputType,
    autocompleteListId,
    autocompleteOptionValue,
    normalizeForSearch,
    sanitizeClassSegment,
    normalizeOption,
    mergeOptions,
    resolveOptions,
    resolveSelectOptions,
    isRemoteSelect,
    resolveRemoteSelectSource,
    remoteMenuClass,
    resolveRemoteSearchMinChars,
    resolveRemoteSearchLimit,
    resolveRemoteSelectOptions,
    remoteNoResultsText,
    canCreateRelated,
    showRelatedCreateAction,
    relatedCreateActionText,
    onRelatedCreateRequested,
    onRelatedCreateButton,
    scheduleRemoteSearch,
    onRemoteSelectSearch,
    onRemoteMenuOpened,
    onRemoteMenuClosed,
    attachRemoteMenuScroll,
    detachRemoteMenuScroll,
    fetchRemoteOptions,
    remoteLoadingMap,
    remoteOptionsMap,
    remoteQueryMap,
    remoteHasMoreMap,
    remoteNextStartMap,
    remoteTokenMap,
  };
}
