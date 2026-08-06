export function previewScopeMeta(shown, total, t) {
  const shownN = Number(shown) || 0;
  if (total == null) return `${t("recentPrefix")}: ${shownN}`;
  return `${t("recentPrefix")} ${shownN} / ${t("totalLabel")} ${Number(total) || 0}`;
}

export function previewCountBadge(total) {
  return total == null ? null : Number(total) || 0;
}

export function hasPreviewRecords(shown, total) {
  const shownN = Number(shown) || 0;
  const totalN = total == null ? null : Number(total) || 0;
  // A panel is truly empty only when both the preview and (if known) the full
  // total are zero. When the full total is non-zero but the preview is empty,
  // the panel must not render a "no records" empty state.
  return shownN > 0 || (totalN != null && totalN > 0);
}
