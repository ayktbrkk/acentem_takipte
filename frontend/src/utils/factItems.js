export function factItem(key, label, value, valueClass = "") {
  return {
    key,
    label,
    value: value ?? "-",
    ...(valueClass ? { valueClass } : {}),
  };
}

export function pushFactIf(items, condition, key, label, value, valueClass = "") {
  if (!condition) return items;
  items.push(factItem(key, label, value, valueClass));
  return items;
}

export function pushMutedFactIf(items, condition, key, label, value, extraClass = "") {
  if (!condition) return items;
  items.push(mutedFact(key, label, value, extraClass));
  return items;
}

export function mutedFact(key, label, value, extraClass = "") {
  const cls = ["text-xs text-slate-600", extraClass].filter(Boolean).join(" ");
  return factItem(key, label, value, cls);
}

export function subtleFact(key, label, value, extraClass = "") {
  const cls = ["text-xs text-slate-500", extraClass].filter(Boolean).join(" ");
  return factItem(key, label, value, cls);
}
