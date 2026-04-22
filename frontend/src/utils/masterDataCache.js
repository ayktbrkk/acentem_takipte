const CACHE_PREFIX = "at_master_cache:";
const DEFAULT_TTL = 1000 * 60 * 60; // 1 hour

export function getCachedMasterData(sourceKey) {
  if (typeof window === "undefined" || !window.localStorage) return null;

  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${sourceKey}`);
    if (!raw) return null;

    const entry = JSON.parse(raw);
    const now = Date.now();

    if (entry.expiresAt && now > entry.expiresAt) {
      window.localStorage.removeItem(`${CACHE_PREFIX}${sourceKey}`);
      return null;
    }

    return entry.data;
  } catch (error) {
    return null;
  }
}

export function setCachedMasterData(sourceKey, data, ttl = DEFAULT_TTL) {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    const entry = {
      data,
      expiresAt: Date.now() + ttl,
    };
    window.localStorage.setItem(`${CACHE_PREFIX}${sourceKey}`, JSON.stringify(entry));
  } catch (error) {
    // Ignore storage failures (quota, etc)
  }
}

export function clearMasterDataCache(sourceKey = null) {
  if (typeof window === "undefined" || !window.localStorage) return;

  if (sourceKey) {
    window.localStorage.removeItem(`${CACHE_PREFIX}${sourceKey}`);
  } else {
    Object.keys(window.localStorage).forEach((key) => {
      if (key.startsWith(CACHE_PREFIX)) {
        window.localStorage.removeItem(key);
      }
    });
  }
}
