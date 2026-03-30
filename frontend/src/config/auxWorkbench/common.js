export function L(tr, en) {
  return { tr, en };
}

export function F(key, field, type = "text", extra = {}) {
  return { key, field, type, ...extra };
}

export function P(key, label, payload = {}) {
  return { key, label, payload };
}

export function pickAuxWorkbenchEntries(source, keys) {
  const entries = {};
  for (const key of keys) {
    if (source?.[key]) {
      entries[key] = source[key];
    }
  }
  return entries;
}
