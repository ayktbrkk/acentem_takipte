const HEAD_OFFICE_BADGES = {
  tr: "Merkez",
  en: "Head Office",
};

function asLocale(locale) {
  return String(locale || "en").trim().toLowerCase() === "tr" ? "tr" : "en";
}

function branchLabel(row) {
  return String(row?.office_branch_name || row?.name || "").trim();
}

function compareBranchRows(left, right, locale) {
  const leftHead = Number(left?.is_head_office || 0);
  const rightHead = Number(right?.is_head_office || 0);
  if (leftHead !== rightHead) {
    return rightHead - leftHead;
  }
  return branchLabel(left).localeCompare(branchLabel(right), locale === "tr" ? "tr" : "en", {
    sensitivity: "base",
  });
}

function normalizeRows(rows) {
  return Array.isArray(rows)
    ? rows
        .filter((row) => row && String(row.name || "").trim())
        .map((row) => ({
          ...row,
          name: String(row.name || "").trim(),
          parent_office_branch: String(row.parent_office_branch || "").trim(),
          office_branch_name: String(row.office_branch_name || row.name || "").trim(),
        }))
    : [];
}

export function flattenOfficeBranchRows(rows, options = {}) {
  const locale = asLocale(options.locale);
  const normalized = normalizeRows(rows);
  const rowsByName = new Map(normalized.map((row) => [row.name, row]));
  const childrenByParent = new Map();

  for (const row of normalized) {
    const parentName = row.parent_office_branch;
    if (!parentName || parentName === row.name || !rowsByName.has(parentName)) {
      continue;
    }
    const siblings = childrenByParent.get(parentName) || [];
    siblings.push(row);
    childrenByParent.set(parentName, siblings);
  }

  for (const siblings of childrenByParent.values()) {
    siblings.sort((left, right) => compareBranchRows(left, right, locale));
  }

  const roots = normalized
    .filter((row) => !row.parent_office_branch || row.parent_office_branch === row.name || !rowsByName.has(row.parent_office_branch))
    .sort((left, right) => compareBranchRows(left, right, locale));

  const flattened = [];
  const visited = new Set();

  function walk(row, depth) {
    if (!row || visited.has(row.name)) {
      return;
    }
    visited.add(row.name);
    flattened.push({ ...row, depth });
    const children = childrenByParent.get(row.name) || [];
    for (const child of children) {
      walk(child, depth + 1);
    }
  }

  for (const root of roots) {
    walk(root, 0);
  }

  const remaining = normalized
    .filter((row) => !visited.has(row.name))
    .sort((left, right) => compareBranchRows(left, right, locale));

  for (const row of remaining) {
    walk(row, 0);
  }

  return flattened;
}

export function buildOfficeBranchOptions(rows, options = {}) {
  const locale = asLocale(options.locale);
  const headOfficeBadge = HEAD_OFFICE_BADGES[locale];
  return flattenOfficeBranchRows(rows, { locale }).map((row) => {
    const depthPrefix = row.depth > 0 ? `${"  ".repeat(row.depth)}- ` : "";
    const badge = Number(row.is_head_office || 0) ? ` [${headOfficeBadge}]` : "";
    return {
      value: row.name,
      label: `${depthPrefix}${branchLabel(row)}${badge}`,
      code: row.office_branch_code || "",
      city: row.city || "",
      isDefault: Boolean(row.is_default),
      depth: row.depth,
      row,
    };
  });
}
