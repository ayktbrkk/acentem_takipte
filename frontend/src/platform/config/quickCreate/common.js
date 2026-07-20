export function pickQuickCreateEntries(source, keys) {
  const entries = {};
  for (const key of keys) {
    if (source?.[key]) {
      entries[key] = source[key];
    }
  }
  return entries;
}

export function mergeQuickCreateEntries(...groups) {
  return Object.assign({}, ...groups);
}
