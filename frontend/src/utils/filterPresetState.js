export function readFilterPresetKey(storageKey, fallback = "default") {
  if (typeof window === "undefined" || !window.localStorage) return fallback;
  try {
    const value = window.localStorage.getItem(storageKey);
    return value || fallback;
  } catch {
    return fallback;
  }
}

export function writeFilterPresetKey(storageKey, key) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(storageKey, String(key || "default"));
  } catch {
    // Ignore storage errors (private mode/quota).
  }
}

export const CUSTOM_FILTER_PRESET_PREFIX = "custom:";

export function makeCustomFilterPresetValue(id) {
  return `${CUSTOM_FILTER_PRESET_PREFIX}${String(id || "")}`;
}

export function isCustomFilterPresetValue(value) {
  return String(value || "").startsWith(CUSTOM_FILTER_PRESET_PREFIX);
}

export function extractCustomFilterPresetId(value) {
  const normalized = String(value || "");
  return isCustomFilterPresetValue(normalized) ? normalized.slice(CUSTOM_FILTER_PRESET_PREFIX.length) : "";
}

export function readFilterPresetList(storageKey) {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        id: String(item?.id || ""),
        label: String(item?.label || "").trim(),
        payload: item?.payload && typeof item.payload === "object" ? item.payload : {},
      }))
      .filter((item) => item.id && item.label);
  } catch {
    return [];
  }
}

export function writeFilterPresetList(storageKey, presets) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const normalized = Array.isArray(presets)
      ? presets
          .map((item) => ({
            id: String(item?.id || ""),
            label: String(item?.label || "").trim(),
            payload: item?.payload && typeof item.payload === "object" ? item.payload : {},
          }))
          .filter((item) => item.id && item.label)
      : [];
    window.localStorage.setItem(storageKey, JSON.stringify(normalized));
  } catch {
    // Ignore storage errors (private mode/quota).
  }
}
