import { reactive } from "vue";

const LOCALE_STORAGE_KEY = "at_locale";

function cloneBooleanMap(source) {
  if (!source || typeof source !== "object") {
    return {};
  }

  const next = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "boolean") {
      next[key] = value;
    }
  }
  return next;
}

function normalizeCapabilities(raw) {
  const next = {
    quickCreate: {},
    quickEdit: {},
    actions: {},
    doctypes: {},
  };

  if (!raw || typeof raw !== "object") {
    return next;
  }

  next.quickCreate = cloneBooleanMap(raw.quickCreate);
  next.quickEdit = cloneBooleanMap(raw.quickEdit);

  if (raw.actions && typeof raw.actions === "object") {
    for (const [groupKey, groupValue] of Object.entries(raw.actions)) {
      next.actions[groupKey] = cloneBooleanMap(groupValue);
    }
  }

  if (raw.doctypes && typeof raw.doctypes === "object") {
    for (const [doctype, permissionMap] of Object.entries(raw.doctypes)) {
      next.doctypes[doctype] = cloneBooleanMap(permissionMap);
    }
  }

  return next;
}

function readBootSession() {
  if (typeof window === "undefined") {
    return {};
  }

  const serverBoot = window.__AT_SESSION__ || {};
  const frappeBoot = window.frappe?.boot || {};
  const frappeSession = window.frappe?.session || {};

  return {
    user:
      serverBoot.user ||
      frappeSession.user ||
      frappeBoot?.user?.name ||
      window.frappe?.session_user ||
      null,
    full_name:
      serverBoot.full_name ||
      frappeSession.user_fullname ||
      frappeBoot?.user?.full_name ||
      null,
    branch: serverBoot.branch || null,
    locale: serverBoot.locale || frappeBoot.lang || null,
    capabilities: serverBoot.capabilities || null,
  };
}

const boot = readBootSession();

function normalizeLocale(value) {
  return String(value || "tr").toLowerCase().startsWith("en") ? "en" : "tr";
}

function readStoredLocale() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return value ? normalizeLocale(value) : null;
  } catch (error) {
    return null;
  }
}

function writeStoredLocale(locale) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeLocale(locale);

  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
  } catch (error) {
    // Ignore storage failures (private mode, quota, etc).
  }

  try {
    document.cookie = `user_lang=${normalized}; path=/; max-age=31536000; SameSite=Lax`;
  } catch (error) {
    // Ignore cookie write failures.
  }
}

export function setPreferredLocale(locale) {
  const normalized = normalizeLocale(locale);
  sessionState.locale = normalized;
  writeStoredLocale(normalized);
  return normalized;
}

export const sessionState = reactive({
  user: boot.full_name || boot.user || "",
  userId: boot.user || "",
  branch: boot.branch || null,
  locale: normalizeLocale(readStoredLocale() || boot.locale || "tr"),
  capabilities: normalizeCapabilities(boot.capabilities),
});

async function getJson(url) {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  if (!payload || typeof payload !== "object") {
    return null;
  }
  return payload.message ?? null;
}

function shouldApplySessionContext(contextUser, loggedUser) {
  if (!contextUser || !loggedUser) {
    return true;
  }
  return contextUser === loggedUser;
}

function applySessionContext(data, loggedUser) {
  if (!data || typeof data !== "object") {
    return;
  }
  if (!shouldApplySessionContext(data.user, loggedUser)) {
    return;
  }

  if (data.user) {
    sessionState.userId = data.user;
  }
  if (data.full_name) {
    sessionState.user = data.full_name;
  } else if (data.user) {
    sessionState.user = data.user;
  }

  sessionState.branch = data.branch || null;
  setPreferredLocale(readStoredLocale() || data.locale || sessionState.locale);
  if (Object.prototype.hasOwnProperty.call(data, "capabilities")) {
    sessionState.capabilities = normalizeCapabilities(data.capabilities);
  }
}

export function hasSessionCapability(path, fallback = false) {
  const segments = Array.isArray(path)
    ? path.filter(Boolean)
    : String(path || "")
      .split(".")
      .map((segment) => segment.trim())
      .filter(Boolean);

  if (!segments.length) {
    return fallback;
  }

  let current = sessionState.capabilities;
  for (const segment of segments) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return fallback;
    }
    current = current[segment];
  }

  return typeof current === "boolean" ? current : fallback;
}

export async function hydrateSessionState() {
  try {
    let resolvedUser = null;
    const loggedUser = await getJson("/api/method/frappe.auth.get_logged_user");
    if (loggedUser && loggedUser !== "Guest") {
      sessionState.userId = loggedUser;
      sessionState.user = loggedUser;
      resolvedUser = loggedUser;
    }

    const data = await getJson("/api/method/acentem_takipte.api.session.get_session_context");
    applySessionContext(data, resolvedUser);
  } catch (error) {
    // If request fails, keep bootstrap defaults.
  }
}
