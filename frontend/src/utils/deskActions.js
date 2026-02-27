const STORAGE_KEY = "at:features:desk-actions";

export function deskActionsEnabled() {
  if (typeof window === "undefined") return false;
  try {
    const value = window.localStorage?.getItem(STORAGE_KEY);
    return value === "1" || value === "true";
  } catch {
    return false;
  }
}

export function setDeskActionsEnabled(enabled) {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      window.localStorage?.setItem(STORAGE_KEY, "1");
    } else {
      window.localStorage?.removeItem(STORAGE_KEY);
    }
  } catch {
    // no-op
  }
}

