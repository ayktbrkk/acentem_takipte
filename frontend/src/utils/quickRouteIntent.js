function normalizeString(value) {
  const text = String(value ?? "").trim();
  return text || "";
}

export function buildQuickCreateIntentQuery({ prefills = {}, returnTo = "", extras = {} } = {}) {
  const query = { quick_create: "1", ...(extras || {}) };
  if (returnTo) query.return_to = String(returnTo);
  Object.entries(prefills || {}).forEach(([key, value]) => {
    const text = normalizeString(value);
    if (!text) return;
    query[`prefill_${key}`] = text;
  });
  return query;
}

export function readQuickCreateIntent(query = {}) {
  const source = query || {};
  const quick = normalizeString(source.quick || source.quick_create) === "1";
  const prefills = {};
  Object.entries(source).forEach(([key, value]) => {
    if (!key.startsWith("prefill_")) return;
    prefills[key.slice("prefill_".length)] = normalizeString(value);
  });
  const returnTo = normalizeString(source.return_to);
  return { quick, prefills, returnTo };
}

export function stripQuickCreateIntentQuery(query = {}, legacyKeys = []) {
  const next = { ...(query || {}) };
  delete next.quick;
  delete next.quick_create;
  delete next.return_to;
  Object.keys(next).forEach((key) => {
    if (key.startsWith("prefill_")) delete next[key];
  });
  for (const key of legacyKeys || []) {
    delete next[key];
  }
  return next;
}

