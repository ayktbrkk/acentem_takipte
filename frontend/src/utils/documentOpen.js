const SAFE_PROTOCOLS = new Set(["http:", "https:"]);

function toSafeSameOriginPath(target) {
  if (!target) return null;
  try {
    const url = new URL(String(target), window.location.origin);
    if (!SAFE_PROTOCOLS.has(url.protocol)) return null;
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

async function resolveFileUrlFromFileName(fileName) {
  const normalized = String(fileName || "").trim();
  if (!normalized) return "";
  const endpoint = `/api/resource/File/${encodeURIComponent(normalized)}?fields=${encodeURIComponent('["file_url"]')}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!response.ok) return "";
  const payload = await response.json().catch(() => null);
  return String(payload?.data?.file_url || "").trim();
}

function looksLikeDirectFilePath(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return false;
  if (raw.startsWith("/files/") || raw.startsWith("/private/files/")) return true;
  if (raw.startsWith("files/") || raw.startsWith("private/files/")) return true;
  if (/^https?:\/\//.test(raw)) return true;
  return false;
}

export async function resolveDocumentOpenUrl(row) {
  const directUrl = toSafeSameOriginPath(row?.file_url || row?.url || "");
  if (directUrl) return directUrl;

  const fileRef = String(row?.file || "").trim();
  if (!fileRef) return null;

  const resolvedFileUrl = await resolveFileUrlFromFileName(fileRef);
  if (resolvedFileUrl) return toSafeSameOriginPath(resolvedFileUrl);

  if (looksLikeDirectFilePath(fileRef)) {
    return toSafeSameOriginPath(fileRef);
  }

  return null;
}

export async function openDocumentInNewTab(row) {
  const safePath = await resolveDocumentOpenUrl(row);
  if (!safePath) return false;
  window.open(safePath, "_blank", "noopener,noreferrer");
  return true;
}
