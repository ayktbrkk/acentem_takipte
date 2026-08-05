import { computed, unref, watch } from "vue";

import { buildOfficeBranchOptions } from "../utils/officeBranchTree";
import { openTabularExport } from "../utils/listExport";
import { getCustomerOptionLabel } from "../utils/customerOptions";
import { AUX_WORKBENCH_TRANSLATIONS } from "../config/aux_workbench_translations";
import { AUX_WORKBENCH_FIELD_LABELS } from "../config/aux_workbench_field_labels";
import { translateText } from "@/platform/i18n";
import { useLinkLabelCache } from "./useLinkLabelCache";
import { maskIdentifier } from "../utils/atMasks";

function humanizeField(field) {
  return String(field || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function currentLocale(activeLocale) {
  return String(unref(activeLocale) || "en").trim() || "en";
}

function resolveLocaleCode(localeCode) {
  return String(unref(localeCode) || "en-US").trim() || "en-US";
}

function translateFieldValue(value, activeLocale) {
  const key = String(value ?? "");
  return translateText(key, currentLocale(activeLocale));
}

function normalizeLookupText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("ı", "i")
    .replaceAll("İ", "i")
    .replaceAll("ş", "s")
    .replaceAll("Ş", "s")
    .replaceAll("ü", "u")
    .replaceAll("Ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("Ö", "o")
    .replaceAll("ğ", "g")
    .replaceAll("Ğ", "g")
    .replaceAll("ç", "c")
    .replaceAll("Ç", "c");
}

function normalizeEnumLabel(field, value) {
  const normalized = normalizeLookupText(value);
  if (!normalized) return String(value ?? "");

  const maps = {
    status: {
      active: "Active",
      archived: "Archived",
      arsiv: "Archived",
      arsivlendi: "Archived",
    },
    document_kind: {
      policy: "Policy",
      police: "Policy",
      endorsement: "Endorsement",
      zeyilname: "Endorsement",
      claim: "Claim",
      hasar: "Claim",
      other: "Other",
      diger: "Other",
    },
    document_sub_type: {
      // English stored values (canonical post-migration)
      "vehicle registration": "Vehicle Registration",
      "id document": "ID Document",
      "policy copy": "Policy Copy",
      "damage photo": "Damage Photo",
      other: "Other",
      // Legacy Turkish stored values (pre-migration backwards compat)
      ruhsat: "Vehicle Registration",
      kimlik: "ID Document",
      "police kopyasi": "Policy Copy",
      "hasar fotografi": "Damage Photo",
      diger: "Other",
    },
  };

  const mapped = maps[field]?.[normalized];
  return mapped || String(value ?? "");
}

function normalizeBoolStatus(v) {
  if (v === true || String(v) === "1") return "1";
  if (v === false || String(v) === "0") return "0";
  return String(v ?? "");
}

function isFieldType(config, field, typeName) {
  const list = config?.[`${typeName}Fields`] || [];
  return list.includes(field);
}

function parseSignalEntries(value) {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      return parseSignalEntries(JSON.parse(value));
    } catch {
      return value
        .split(/\r?\n/)
        .map((entry) => entry.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean);
    }
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, entry]) => `${humanizeField(key)}: ${entry}`)
      .filter(Boolean);
  }
  return [String(value)];
}

export function useAuxWorkbenchViewModel({
  activeLocale,
  localeCode,
  config,
  filters,
  pagination,
  rows,
  snapshotRows,
  accessLogRows,
  fileRows,
  reminderRows,
  summary,
  authStore,
  branchStore,
  auxQuickCreate,
  auxQuickCustomerResource,
  auxQuickPolicyResource,
  auxQuickTemplateResource,
  auxQuickInsuranceCompanyResource,
  auxQuickSalesEntityResource,
  auxQuickAccountingEntryResource,
}) {
  const { getLinkLabel, resolveLinksFromDoc } = useLinkLabelCache();

  function localize(v) {
    if (!v) return "";
    if (typeof v === "string") return v;
    const locale = currentLocale(activeLocale);
    return v[locale] || v.en || v.tr || "";
  }

  function t(key) {
    const locale = String(currentLocale(activeLocale) || "en").toLowerCase().startsWith("tr") ? "tr" : "en";
    return AUX_WORKBENCH_TRANSLATIONS[locale]?.[key] || AUX_WORKBENCH_TRANSLATIONS.en?.[key] || key;
  }

  function label(kind) {
    return localize(config?.labels?.[kind]);
  }

  function sortLabel(orderBy) {
    const [field, dir] = String(orderBy || "").split(/\s+/);
    const base = fieldLabel(field);
    const suffix = String(dir || "").toLowerCase() === "asc" ? t("ascending") : t("descending");
    return `${base} (${suffix})`;
  }

  function fieldLabel(field) {
    const locale = String(currentLocale(activeLocale) || "en").toLowerCase().startsWith("tr") ? "tr" : "en";
    const table = AUX_WORKBENCH_FIELD_LABELS[locale]?.[config?.key] || AUX_WORKBENCH_FIELD_LABELS.en?.[config?.key] || {};
    return table[field] || humanizeField(field);
  }

  function optionLabel(fd, opt) {
    if (opt === "") return t("all");
    if (fd.field === "is_active") {
      if (String(opt) === "1") return t("active");
      if (String(opt) === "0") return t("inactive");
    }
    if (fd.field === "is_private") {
      if (String(opt) === "1") return t("private");
      if (String(opt) === "0") return t("public");
    }
    return translateFieldValue(opt, activeLocale);
  }

  function statusValue(row, field, type) {
    const raw = row?.[field];
    if (type === "boolean_active") return normalizeBoolStatus(raw);
    return String(raw ?? "");
  }

  function formatSignalSummary(value, field) {
    const entries = parseSignalEntries(value);
    if (!entries.length) return t("unspecified");
    const first = entries[0];
    const count = entries.length;
    if (field === "score_reason_json") {
      return count > 1 ? `${first} (+${count - 1})` : first;
    }
    const _locale = currentLocale(activeLocale);
    const prefix = field === "strengths_json" ? t("strengths") : t("risks");
    return `${prefix}: ${count}`;
  }

  function formatField(value, field) {
    if (value == null || value === "") return t("unspecified");
    if (["strengths_json", "risks_json", "score_reason_json"].includes(field)) {
      return formatSignalSummary(value, field);
    }
    // Sensitive insured-asset identifiers (plates, TCKN-based, serials) render
    // masked by default in list, detail and export. Authorized operators still
    // see the full value through the record itself; the UI never exposes raw.
    if (field === "asset_identifier") {
      return maskIdentifier(value);
    }
    const _locale = currentLocale(activeLocale);
    const lc = resolveLocaleCode(localeCode);
    if (isFieldType(config, field, "bool")) {
      const active = value === true || String(value) === "1";
      return active ? t("yes") : t("no");
    }
    if (isFieldType(config, field, "currency")) {
      const n = Number(value);
      if (!Number.isFinite(n)) return String(value);
      return new Intl.NumberFormat(lc, { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n);
    }
    if (isFieldType(config, field, "number")) {
      const n = Number(value);
      return Number.isFinite(n) ? new Intl.NumberFormat(lc).format(n) : String(value);
    }
    if (isFieldType(config, field, "date")) {
      try { return new Intl.DateTimeFormat(lc, { dateStyle: "short" }).format(new Date(value)); } catch { return String(value); }
    }
    if (isFieldType(config, field, "dateTime")) {
      try { return new Intl.DateTimeFormat(lc, { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); } catch { return String(value); }
    }
    if (["modified", "creation", "resolved_on", "sent_at", "next_retry_on", "last_attempt_on"].includes(field)) {
      try { return new Intl.DateTimeFormat(lc, { dateStyle: "short", timeStyle: "short" }).format(new Date(value)); } catch { /* noop */ }
    }
    if (["due_date", "renewal_date", "policy_end_date"].includes(field)) {
      try { return new Intl.DateTimeFormat(lc, { dateStyle: "short" }).format(new Date(value)); } catch { /* noop */ }
    }
    if ([
      "status",
      "entry_type",
      "source_doctype",
      "reference_doctype",
      "mismatch_type",
      "resolution_action",
      "task_type",
      "priority",
      "channel",
      "direction",
      "call_status",
      "call_outcome",
      "document_kind",
      "document_sub_type",
    ].includes(field)) {
      const normalizedLabel = normalizeEnumLabel(field, value);
      return translateFieldValue(normalizedLabel, activeLocale);
    }
    if (typeof value === "string") {
      return getLinkLabel(value);
    }
    return String(value);
  }

  function toCsvValue(value) {
    const normalized = value == null ? "" : String(value);
    if (normalized.includes(",") || normalized.includes("\"") || normalized.includes("\n")) {
      return `"${normalized.replace(/"/g, "\"\"")}"`;
    }
    return normalized;
  }

  function factItems(row, fields) {
    return (fields || [])
      .filter((field) => row?.[field] !== undefined && row?.[field] !== null && row?.[field] !== "")
      .map((field) => ({ label: fieldLabel(field), value: formatField(row[field], field) }));
  }

  function rowTitle(row) {
    // at-documents: display_name backend'de dosya URL/adı bazlı hesaplanır.
    if (config?.key === "at-documents") {
      return String(row?.display_name || row?.file || row?.name || "-");
    }
    // files: file_name kullan (file_url değil)
    if (config?.key === "files") {
      return String(row?.file_name || row?.name || "-");
    }
    const raw = String(row?.[config?.titleField] || row?.name || "-");
    return translateFieldValue(raw, activeLocale);
  }

  const subtitleLabel = computed(() => localize(config?.subtitle));

  const hasActiveScopeOrFilters = computed(() => {
    // Explicit transient filters (free-text query + filter values that differ
    // from the screen defaults) trigger the "no records match the filters"
    // hint. The persistent office-branch scope and untouched default filters
    // keep the per-screen empty title/description.
    if (String(filters?.query || "").trim()) return true;
    const defaults = config?.defaultFilters || {};
    for (const fd of config?.filterDefs || []) {
      const current = String(filters?.[fd.key] ?? "").trim();
      const def = String(defaults[fd.key] ?? "").trim();
      if (current !== "" && current !== def) return true;
    }
    return false;
  });

  const emptyTitle = computed(() => localize(config?.empty?.title) || t("emptyTitle"));
  const emptyDescription = computed(() => {
    if (hasActiveScopeOrFilters.value) {
      return t("emptyFilteredDescription") || t("emptyDescription");
    }
    return localize(config?.empty?.description) || t("emptyDescription");
  });
  const toolbarActions = computed(() => (Array.isArray(config?.toolbarActions) ? config.toolbarActions : []));
  const visibleToolbarActions = computed(() =>
    toolbarActions.value.filter((action) => {
      const capabilityPath = action?.capabilityPath;
      if (!capabilityPath) return true;
      return authStore.can(capabilityPath);
    })
  );
  const canLaunchAuxQuickCreate = computed(() => {
    const registryKey = auxQuickCreate.value?.registryKey;
    if (!registryKey) return false;
    return authStore.can(["quickCreate", registryKey]);
  });
  const auxQuickCreateEyebrow = computed(() => localize(auxQuickCreate.value?.label) || t("newRecord"));
  const quickFilterDefs = computed(() => (config?.filterDefs || []).slice(0, 2));
  const advancedFilterDefs = computed(() => (config?.filterDefs || []).slice(2));
  const sortOptions = computed(() =>
    (config?.sortOptions || ["modified desc"]).map((value) =>
      typeof value === "string" ? { value, label: sortLabel(value) } : { value: value.value, label: localize(value.label) }
    )
  );
  const auxQuickOptionsMap = computed(() => ({
    customers: asArray(auxQuickCustomerResource?.data?.value || auxQuickCustomerResource?.data).map((row) => ({
      value: row.name,
      label: getCustomerOptionLabel(row),
    })),
    policies: asArray(auxQuickPolicyResource?.data?.value || auxQuickPolicyResource?.data).map((row) => ({
      value: row.name,
      label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
    })),
    notificationTemplates: asArray(auxQuickTemplateResource?.data?.value || auxQuickTemplateResource?.data).map((row) => ({
      value: row.name,
      label: `${row.template_key || row.name}${row.channel ? ` (${row.channel})` : ""}`,
    })),
    insuranceCompanies: asArray(auxQuickInsuranceCompanyResource?.data?.value || auxQuickInsuranceCompanyResource?.data).map((row) => ({
      value: row.name,
      label: `${row.company_name || row.name}${row.company_code ? ` (${row.company_code})` : ""}`,
    })),
    salesEntities: asArray(auxQuickSalesEntityResource?.data?.value || auxQuickSalesEntityResource?.data).map((row) => ({
      value: row.name,
      label: `${row.full_name || row.name}${row.entity_type ? ` (${row.entity_type})` : ""}`,
    })),
    officeBranches: buildOfficeBranchOptions(asArray(branchStore.items), { locale: currentLocale(activeLocale) }).map((row) => ({
      value: row.value,
      label: row.label,
    })),
    accountingEntries: asArray(auxQuickAccountingEntryResource?.data?.value || auxQuickAccountingEntryResource?.data).map((row) => ({
      value: row.name,
      label: `${row.name}${row.source_doctype ? ` (${row.source_doctype})` : ""}`,
    })),
  }));

  const snapshotSummaryCards = computed(() => {
    if (config?.key !== "customer-segment-snapshots") return [];
    const agg = unref(summary);
    if (agg && Number.isFinite(Number(agg.total))) {
      const numeric = agg.numeric?.score || {};
      return [
        { key: "total", label: t("totalSnapshots"), value: String(Number(agg.total) || 0), hint: t("snapshotWindowHint") },
        { key: "high-risk", label: t("highRiskSnapshots"), value: String(Number(agg.matches?.high_risk) || 0), hint: t("highRiskHint") },
        { key: "high-value", label: t("highValueSnapshots"), value: String(Number(agg.matches?.high_value) || 0), hint: t("highValueHint") },
        { key: "avg-score", label: t("averageScore"), value: String(Number(numeric.count) ? Math.round(Number(numeric.sum) / Number(numeric.count)) : 0), hint: t("averageScoreHint") },
      ];
    }
    const full = snapshotRows.value;
    const total = full.length;
    const highRisk = full.filter((row) => String(row?.claim_risk || "").toLowerCase() === "high").length;
    const highValue = full.filter((row) => {
      const valueBand = String(row?.value_band || "").toLowerCase();
      return valueBand === "high" || valueBand === "premium";
    }).length;
    const scored = full.map((row) => Number(row?.score)).filter((value) => Number.isFinite(value));
    const averageScore = scored.length ? Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length) : 0;
    return [
      { key: "total", label: t("totalSnapshots"), value: String(total), hint: t("snapshotWindowHint") },
      { key: "high-risk", label: t("highRiskSnapshots"), value: String(highRisk), hint: t("highRiskHint") },
      { key: "high-value", label: t("highValueSnapshots"), value: String(highValue), hint: t("highValueHint") },
      { key: "avg-score", label: t("averageScore"), value: String(averageScore), hint: t("averageScoreHint") },
    ];
  });
  const snapshotTrendRows = computed(() => {
    if (config?.key !== "customer-segment-snapshots") return [];
    // The trend is a recent-dates visual over the visible rows; the summary
    // cards use the full-set aggregate above.
    const full = snapshotRows.value;
    const grouped = new Map();
    for (const row of full) {
      const snapshotDate = String(row?.snapshot_date || "").trim();
      if (!snapshotDate) continue;
      if (!grouped.has(snapshotDate)) {
        grouped.set(snapshotDate, { total: 0, highRisk: 0, scoreSum: 0, scoreCount: 0 });
      }
      const bucket = grouped.get(snapshotDate);
      bucket.total += 1;
      if (String(row?.claim_risk || "").toLowerCase() === "high") bucket.highRisk += 1;
      const score = Number(row?.score);
      if (Number.isFinite(score)) {
        bucket.scoreSum += score;
        bucket.scoreCount += 1;
      }
    }
    return [...grouped.entries()]
      .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
      .slice(0, 3)
      .map(([snapshotDate, bucket]) => ({
        snapshotDate,
        snapshotDateLabel: formatField(snapshotDate, "snapshot_date"),
        total: bucket.total,
        highRisk: bucket.highRisk,
        averageScore: bucket.scoreCount ? Math.round(bucket.scoreSum / bucket.scoreCount) : 0,
      }));
  });
  const accessLogSummaryCards = computed(() => {
    if (config?.key !== "access-logs") return [];
    const agg = unref(summary);
    if (agg && Number.isFinite(Number(agg.total))) {
      const m = agg.matches || {};
      return [
        { key: "total-audit", label: t("totalAuditEvents"), value: String(Number(agg.total) || 0), hint: t("auditWindowHint") },
        { key: "create-audit", label: t("createEvents"), value: String(Number(m.create) || 0), hint: t("createEventsHint") },
        { key: "edit-audit", label: t("editEvents"), value: String(Number(m.edit) || 0), hint: t("editEventsHint") },
        { key: "delete-audit", label: t("deleteEvents"), value: String(Number(m.delete) || 0), hint: t("deleteEventsHint") },
        { key: "run-audit", label: t("runEvents"), value: String(Number(m.run) || 0), hint: t("runEventsHint") },
      ];
    }
    const full = accessLogRows.value;
    const actions = full.map((row) => String(row?.action || "").trim().toLowerCase());
    const countByAction = (action) => actions.filter((value) => value === action).length;
    return [
      { key: "total-audit", label: t("totalAuditEvents"), value: String(full.length), hint: t("auditWindowHint") },
      { key: "create-audit", label: t("createEvents"), value: String(countByAction("create")), hint: t("createEventsHint") },
      { key: "edit-audit", label: t("editEvents"), value: String(countByAction("edit")), hint: t("editEventsHint") },
      { key: "delete-audit", label: t("deleteEvents"), value: String(countByAction("delete")), hint: t("deleteEventsHint") },
      { key: "run-audit", label: t("runEvents"), value: String(countByAction("run")), hint: t("runEventsHint") },
    ];
  });
  const reminderSummaryCards = computed(() => {
    if (config?.key !== "reminders") return [];
    const agg = unref(summary);
    if (agg && Number.isFinite(Number(agg.total))) {
      const m = agg.matches || {};
      return [
        { key: "total-reminders", label: t("totalReminders"), value: String(Number(agg.total) || 0), hint: t("reminderWindowHint") },
        { key: "open-reminders", label: t("openReminders"), value: String(Number(m.open) || 0), hint: t("openRemindersHint") },
        { key: "overdue-reminders", label: t("overdueReminders"), value: String(Number(m.overdue_open) || 0), hint: t("overdueRemindersHint") },
        { key: "high-reminders", label: t("highPriorityReminders"), value: String(Number(m.high_open) || 0), hint: t("highPriorityRemindersHint") },
      ];
    }
    const full = reminderRows.value;
    const openRows = full.filter((row) => String(row?.status || "").trim() === "Open");
    const now = Date.now();
    const overdueRows = openRows.filter((row) => {
      const remindAt = row?.remind_at;
      if (!remindAt) return false;
      const value = new Date(remindAt).getTime();
      return Number.isFinite(value) && value < now;
    });
    const highPriorityRows = openRows.filter((row) => String(row?.priority || "").trim() === "High");
    return [
      { key: "total-reminders", label: t("totalReminders"), value: String(full.length), hint: t("reminderWindowHint") },
      { key: "open-reminders", label: t("openReminders"), value: String(openRows.length), hint: t("openRemindersHint") },
      { key: "overdue-reminders", label: t("overdueReminders"), value: String(overdueRows.length), hint: t("overdueRemindersHint") },
      { key: "high-reminders", label: t("highPriorityReminders"), value: String(highPriorityRows.length), hint: t("highPriorityRemindersHint") },
    ];
  });
  const fileSummaryCards = computed(() => {
    if (config?.key !== "files") return [];
    const agg = unref(summary);
    if (agg && Number.isFinite(Number(agg.total))) {
      const groupByType = agg.group_by?.file_type || {};
      const sumType = (matcher) =>
        Object.entries(groupByType)
          .filter(([key]) => matcher(String(key).toLowerCase()))
          .reduce((sum, [, count]) => sum + Number(count), 0);
      const m = agg.matches || {};
      return [
        { key: "total-files", label: t("totalFiles"), value: String(Number(agg.total) || 0), hint: t("filesWindowHint") },
        { key: "pdf-files", label: t("pdfFiles"), value: String(sumType((v) => v.includes("pdf"))), hint: t("pdfFilesHint") },
        { key: "image-files", label: t("imageFiles"), value: String(sumType((v) => v.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].some((token) => v.includes(token)))), hint: t("imageFilesHint") },
        { key: "spreadsheet-files", label: t("spreadsheetFiles"), value: String(sumType((v) => ["sheet", "excel", "csv", "xls", "xlsx"].some((token) => v.includes(token)))), hint: t("spreadsheetFilesHint") },
        { key: "customer-files", label: t("attachedCustomers"), value: String(Number(m.customer) || 0), hint: t("attachedCustomersHint") },
        { key: "policy-files", label: t("attachedPolicies"), value: String(Number(m.policy) || 0), hint: t("attachedPoliciesHint") },
        { key: "claim-files", label: t("attachedClaims"), value: String(Number(m.claim) || 0), hint: t("attachedClaimsHint") },
      ];
    }
    // Fallback over the page rows for test mocks / legacy states.
    const full = fileRows.value;
    const total = Number.isFinite(Number(pagination?.total)) && Number(pagination.total) > 0
      ? Number(pagination.total)
      : full.length;
    const byType = (matcher) => full.filter((row) => matcher(String(row?.file_type || "").toLowerCase())).length;
    const byDoctype = (doctype) => full.filter((row) => String(row?.attached_to_doctype || "").trim() === doctype).length;
    return [
      { key: "total-files", label: t("totalFiles"), value: String(total), hint: t("filesWindowHint") },
      { key: "pdf-files", label: t("pdfFiles"), value: String(byType((v) => v.includes("pdf"))), hint: t("pdfFilesHint") },
      { key: "image-files", label: t("imageFiles"), value: String(byType((v) => v.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].some((token) => v.includes(token)))), hint: t("imageFilesHint") },
      { key: "spreadsheet-files", label: t("spreadsheetFiles"), value: String(byType((v) => ["sheet", "excel", "csv", "xls", "xlsx"].some((token) => v.includes(token)))), hint: t("spreadsheetFilesHint") },
      { key: "customer-files", label: t("attachedCustomers"), value: String(byDoctype("AT Customer")), hint: t("attachedCustomersHint") },
      { key: "policy-files", label: t("attachedPolicies"), value: String(byDoctype("AT Policy")), hint: t("attachedPoliciesHint") },
      { key: "claim-files", label: t("attachedClaims"), value: String(byDoctype("AT Claim")), hint: t("attachedClaimsHint") },
    ];
  });

  function currentPresetPayload() {
    const payload = {
      query: filters.query,
      sort: filters.sort,
      pageLength: pagination.pageLength,
    };
    for (const fd of config?.filterDefs || []) {
      payload[fd.key] = String(filters[fd.key] ?? "").trim();
    }
    return payload;
  }

  function exportSnapshotRows() {
    if (!(config?.key === "customer-segment-snapshots" && snapshotRows.value.length > 0)) return;
    const columns = [
      ["customer", "Customer"],
      ["snapshot_date", "Snapshot Date"],
      ["segment", "Segment"],
      ["value_band", "Value Band"],
      ["claim_risk", "Claim Risk"],
      ["score", "Score"],
      ["source_version", "Source Version"],
      ["strengths_json", "Strength Summary"],
      ["risks_json", "Risk Summary"],
      ["score_reason_json", "Score Reason Summary"],
    ];
    const lines = [
      columns.map(([, label]) => toCsvValue(label)).join(","),
      ...snapshotRows.value.map((row) =>
        columns
          .map(([field]) => toCsvValue(formatField(row?.[field], field)))
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `customer-segment-snapshots-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function downloadAuxExport(format) {
    const exportFields = Array.from(
      new Set([
        config.titleField,
        ...(config.listFields || []),
      ].filter(Boolean))
    );
    const columns = exportFields.map((field) => fieldLabel(field));
    const exportedRows = rows.value.map((row) =>
      Object.fromEntries(
        exportFields.map((field) => [fieldLabel(field), formatField(row?.[field], field)])
      )
    );
    openTabularExport({
      permissionDoctypes: [config.doctype],
      exportKey: `aux_${config.key}`,
      title: label("list"),
      columns,
      rows: exportedRows,
      filters: currentPresetPayload(),
      format,
    });
  }

  watch(
    () => unref(rows),
    (rowsList) => {
      if (Array.isArray(rowsList)) {
        for (const row of rowsList) {
          resolveLinksFromDoc(row);
        }
      }
    },
    { immediate: true }
  );

  return {
    t,
    localize,
    label,
    fieldLabel,
    optionLabel,
    statusValue,
    formatField,
    factItems,
    rowTitle,
    subtitleLabel,
    emptyTitle,
    emptyDescription,
    toolbarActions,
    visibleToolbarActions,
    canLaunchAuxQuickCreate,
    auxQuickCreateEyebrow,
    quickFilterDefs,
    advancedFilterDefs,
    sortOptions,
    auxQuickOptionsMap,
    snapshotSummaryCards,
    snapshotTrendRows,
    accessLogSummaryCards,
    reminderSummaryCards,
    fileSummaryCards,
    currentPresetPayload,
    exportSnapshotRows,
    downloadAuxExport,
  };
}
