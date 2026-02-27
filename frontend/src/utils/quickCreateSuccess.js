export async function runQuickCreateSuccessTargets(targets = [], handlers = {}) {
  const names = Array.isArray(targets) ? targets : [];
  const unique = Array.from(new Set(names.filter(Boolean)));
  for (const target of unique) {
    const handler = handlers?.[target];
    if (typeof handler !== "function") continue;
    await handler();
  }
}

