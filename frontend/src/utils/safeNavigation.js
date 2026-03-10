const SAFE_PROTOCOLS = new Set(["http:", "https:"]);

export function resolveSameOriginPath(target) {
  if (!target) return null;

  try {
    const url = new URL(String(target), window.location.origin);
    if (!SAFE_PROTOCOLS.has(url.protocol)) return null;
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch (error) {
    return null;
  }
}

export function navigateToSameOriginPath(target) {
  const safePath = resolveSameOriginPath(target);
  if (!safePath) return false;
  window.open(safePath, "_self", "noopener");
  return true;
}
