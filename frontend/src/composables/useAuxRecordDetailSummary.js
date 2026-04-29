import { computed, ref, unref, watch } from "vue";
import { getSourcePanelConfig } from "../utils/sourcePanel";
import { navigateToSameOriginPath } from "../utils/safeNavigation";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function resourceValue(resource, fallback) {
  const value = unref(resource?.data);
  return value == null ? fallback : value;
}

function humanizeField(field) {
  return String(field || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

const AUX_DETAIL_FIELD_LABELS = {
  "accounting-entries": {
    tr: {
      name: "Kayıt",
      status: "Durum",
      entry_type: "Kayıt Türü",
      currency: "Döviz",
      source_doctype: "Kaynak Tipi",
      source_name: "Kaynak Kayıt",
      source_label: "Kaynak Etiketi",
      source_status: "Kaynak Durumu",
      accounting_entry: "Muhasebe Kaydı",
      local_amount_try: "Yerel Tutar (TRY)",
      external_amount_try: "Harici Tutar (TRY)",
      difference_try: "Fark (TRY)",
      policy: "Poliçe",
      customer: "Müşteri",
      insurance_company: "Sigorta Şirketi",
      office_branch: "Ofis Şubesi",
      external_ref: "Harici Referans",
      integration_hash: "Entegrasyon Özet Değeri",
      payload_json: "Payload",
      synced_on: "Senkronizasyon Tarihi",
      local_amount: "Yerel Tutar",
      external_amount: "Harici Tutar",
      owner: "Kayıt Sahibi",
      modified: "Güncellendi",
    },
    en: {
      name: "Record",
      status: "Status",
      entry_type: "Entry Type",
      currency: "Currency",
      source_doctype: "Source DocType",
      source_name: "Source Record",
      source_label: "Source Label",
      source_status: "Source Status",
      accounting_entry: "Accounting Entry",
      local_amount_try: "Local Amount (TRY)",
      external_amount_try: "External Amount (TRY)",
      difference_try: "Difference (TRY)",
      policy: "Policy",
      customer: "Customer",
      insurance_company: "Insurance Company",
      office_branch: "Office Branch",
      external_ref: "External Reference",
      integration_hash: "Integration Hash",
      payload_json: "Payload",
      synced_on: "Synced On",
      local_amount: "Local Amount",
      external_amount: "External Amount",
      owner: "Owner",
      modified: "Modified",
    },
  },
  "reconciliation-items": {
    tr: {
      name: "Kayıt",
      status: "Durum",
      accounting_entry: "Muhasebe Kaydı",
      source_doctype: "Kaynak Tipi",
      source_name: "Kaynak Kayıt",
      mismatch_type: "Uyumsuzluk Tipi",
      difference_try: "Fark (TRY)",
      resolution_action: "Çözüm İşlemi",
      resolved_on: "Çözüm Tarihi",
      needs_reconciliation: "Mutabakat Gerekli",
      notes: "Notlar",
      details_json: "Detaylar",
      unique_key: "Benzersiz Anahtar",
      local_amount_try: "Yerel Tutar (TRY)",
      external_amount_try: "Harici Tutar (TRY)",
      resolved_by: "Çözen Kullanıcı",
      owner: "Kayıt Sahibi",
      modified: "Güncellendi",
    },
    en: {
      name: "Record",
      status: "Status",
      accounting_entry: "Accounting Entry",
      source_doctype: "Source DocType",
      source_name: "Source Record",
      mismatch_type: "Mismatch Type",
      difference_try: "Difference (TRY)",
      resolution_action: "Resolution Action",
      resolved_on: "Resolved On",
      needs_reconciliation: "Needs Reconciliation",
      notes: "Notes",
      details_json: "Details",
      unique_key: "Unique Key",
      local_amount_try: "Local Amount (TRY)",
      external_amount_try: "External Amount (TRY)",
      resolved_by: "Resolved By",
      owner: "Owner",
      modified: "Modified",
    },
  },
  "access-logs": {
    tr: {
      action_summary: "Eylem Özeti",
      decision_context: "Karar Bağlamı",
      viewed_by: "Görüntüleyen",
      viewed_on: "Görüntülenme Tarihi",
      action: "Eylem",
    },
    en: {
      action_summary: "Action Summary",
      decision_context: "Decision Context",
      viewed_by: "Viewed By",
      viewed_on: "Viewed On",
      action: "Action",
    },
  },
  files: {
    tr: {
      name: "Kayıt",
      file_name: "Dosya Adı",
      attached_to_doctype: "Bağlı Belge Tipi",
      attached_to_name: "Bağlı Kayıt",
      file_type: "Dosya Türü",
      file_size: "Dosya Boyutu",
      is_private: "Gizli",
      creation: "Yükleme Tarihi",
      modified: "Güncellendi",
      owner: "Yükleyen",
      file_url: "Dosya URL",
    },
    en: {
      name: "Record",
      file_name: "File Name",
      attached_to_doctype: "Attached To",
      attached_to_name: "Attached Record",
      file_type: "File Type",
      file_size: "File Size",
      is_private: "Private",
      creation: "Upload Date",
      modified: "Modified",
      owner: "Owner",
      file_url: "File URL",
    },
  },
  "at-documents": {
    tr: {
      name: "Kayıt",
      display_name: "Görünen Ad",
      secondary_file_name: "İkincil Dosya Adı",
      original_file_name: "Orijinal Dosya Adı",
      file: "Dosya",
      reference_doctype: "Referans Tipi",
      reference_name: "Referans Kayıt",
      policy: "Poliçe",
      customer: "Müşteri",
      claim: "Hasar",
      document_kind: "Doküman Türü",
      document_sub_type: "Doküman Alt Türü",
      is_sensitive: "Hassas Veri",
      is_verified: "Doğrulandı",
      document_date: "Doküman Tarihi",
      upload_date: "Yükleme Tarihi",
      sequence_no: "Sıra No",
      version_no: "Versiyon No",
      status: "Durum",
      notes: "Notlar",
      creation: "Oluşturulma",
      modified: "Güncellendi",
      owner: "Kayıt Sahibi",
    },
    en: {
      name: "Record",
      display_name: "Display Name",
      secondary_file_name: "Secondary File Name",
      original_file_name: "Original File Name",
      file: "File",
      reference_doctype: "Reference Type",
      reference_name: "Reference Record",
      policy: "Policy",
      customer: "Customer",
      claim: "Claim",
      document_kind: "Document Kind",
      document_sub_type: "Document Sub Type",
      is_sensitive: "Sensitive Data",
      is_verified: "Verified",
      document_date: "Document Date",
      upload_date: "Upload Date",
      sequence_no: "Sequence No",
      version_no: "Version No",
      status: "Status",
      notes: "Notes",
      creation: "Created On",
      modified: "Modified",
      owner: "Owner",
    },
  },
};

export function useAuxRecordDetailSummary({
  doc,
  config,
  activeLocale,
  localeCode,
  t,
  localize,
  activeDetailTab,
  campaignDraftsResource,
  campaignOutboxResource,
}) {
  const customerLabelById = ref({});
  const _pendingLookups = new Set();

  async function ensureCustomerLabel(customerName) {
    const key = String(customerName || "").trim();
    if (!key || customerLabelById.value[key] || _pendingLookups.has(key)) return;
    _pendingLookups.add(key);
    try {
      const csrfToken = (typeof window !== "undefined" && window.csrf_token) || "";
      const params = new URLSearchParams({
        doctype: "AT Customer",
        fields: JSON.stringify(["name", "full_name"]),
        filters: JSON.stringify({ name: key }),
        limit_page_length: "1",
      });
      const resp = await fetch(`/api/method/frappe.client.get_list?${params}`, {
        headers: csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : {},
      });
      const data = resp.ok ? await resp.json() : {};
      const rows = Array.isArray(data?.message) ? data.message : [];
      const row = rows[0];
      if (row?.name) {
        customerLabelById.value = {
          ...customerLabelById.value,
          [row.name]: String(row.full_name || row.name),
        };
      }
    } catch {
      // best-effort lookup; fallback remains record id
    } finally {
      _pendingLookups.delete(key);
    }
  }

  watch(
    () => [config.key, doc.value?.customer, doc.value?.reference_doctype, doc.value?.reference_name],
    ([screenKey, customerName, referenceDoctype, referenceName]) => {
      if (screenKey !== "at-documents") return;
      void ensureCustomerLabel(customerName);
      if (String(referenceDoctype || "").trim() === "AT Customer") {
        void ensureCustomerLabel(referenceName);
      }
    },
    { immediate: true }
  );

  function translateDetailValue(value) {
    const key = String(value ?? "");
    if (!key) return "-";
    const lookupKey = "val" + key.replace(/\s+/g, "");
    const translated = t(lookupKey);
    return translated === lookupKey ? key : translated;
  }

  function fieldLabel(field) {
    const key = String(field || "");
    const locale = activeLocale.value || "en";
    const table = AUX_DETAIL_FIELD_LABELS?.[config.key]?.[locale] || AUX_DETAIL_FIELD_LABELS?.[config.key]?.en || {};
    return table[key] || humanizeField(key);
  }

  function isFieldType(field, type) {
    const fieldTypes = config.fieldTypes || {};
    return fieldTypes[field] === type;
  }

  function formatNumber(value) {
    const n = value == null || value === "" ? null : Number(value);
    if (n == null || Number.isNaN(n)) return String(value ?? "");
    try {
      return new Intl.NumberFormat(localeCode.value).format(n);
    } catch {
      return String(value);
    }
  }

  function formatValue(field, value) {
    if (value == null) return "-";

    if (config.key === "at-documents") {
      const isCustomerReference =
        field === "customer" ||
        (field === "reference_name" && String(doc.value?.reference_doctype || "").trim() === "AT Customer");
      if (isCustomerReference) {
        const key = String(value || "").trim();
        if (!key) return "-";
        return customerLabelById.value[key] || key;
      }
    }

    if (typeof value === "boolean") return translateDetailValue(value ? "Yes" : "No");
    if (typeof value === "number") return formatNumber(value);
    if (typeof value === "string" && value.trim() === "") return "-";

    if (["amount_try", "difference_try", "local_amount_try", "external_amount_try"].includes(field)) {
      const n = Number(value);
      return Number.isFinite(n) ? new Intl.NumberFormat(localeCode.value).format(n) : String(value);
    }
    if (isFieldType(field, "date")) {
      try {
        return new Intl.DateTimeFormat(localeCode.value, { dateStyle: "short" }).format(new Date(value));
      } catch {
        return String(value);
      }
    }
    if (isFieldType(field, "dateTime")) {
      try {
        return new Intl.DateTimeFormat(localeCode.value, { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
      } catch {
        return String(value);
      }
    }
    if (["modified", "creation", "resolved_on", "sent_at", "next_retry_on", "last_attempt_on"].includes(field)) {
      try {
        return new Intl.DateTimeFormat(localeCode.value, { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
      } catch {
        /* noop */
      }
    }
    if (["due_date", "renewal_date", "policy_end_date"].includes(field)) {
      try {
        return new Intl.DateTimeFormat(localeCode.value, { dateStyle: "short" }).format(new Date(value));
      } catch {
        /* noop */
      }
    }
    if (
      [
        "status",
        "entry_type",
        "source_doctype",
        "mismatch_type",
        "resolution_action",
        "reference_doctype",
        "document_kind",
        "document_sub_type",
      ].includes(field)
    ) {
      return translateDetailValue(value);
    }
    return String(value);
  }

  const recordTitle = computed(() => {
    const d = doc.value;
    return d ? String(d[config.titleField] || d.name || "-") : localize(config.labels.detail);
  });

  const recordSubtitle = computed(() => {
    const d = doc.value;
    if (!d) return localize(config.subtitle);
    const officeBranch = String(d.office_branch || "").trim();
    const localizedDoctype = localize(config.labels?.list) || config.doctype;
    return officeBranch ? `${localizedDoctype} | ${d.name} | ${officeBranch}` : `${localizedDoctype} | ${d.name}`;
  });

  const summaryItems = computed(() =>
    [
      ...(config.summaryFields || ["name", "owner", "modified"]),
      ...(doc.value?.office_branch ? ["office_branch"] : []),
    ]
      .filter((field, index, all) => all.indexOf(field) === index)
      .map((field) => ({
        key: field,
        label: field === "office_branch" ? t("officeBranch") : fieldLabel(field),
        value: formatValue(field, doc.value?.[field]),
      }))
  );

  const detailGroups = computed(() => config.detailGroups || []);
  const specialDetailMode = computed(() => {
    if (config.key === "accounting-entries") return "accounting";
    if (config.key === "reconciliation-items") return "reconciliation";
    if (config.key === "templates") return "template";
    if (config.key === "notification-outbox") return "outbox";
    if (config.key === "customer-segment-snapshots") return "segment_snapshot";
    if (config.key === "ownership-assignments") return "ownership_assignment";
    if (config.key === "access-logs") return "access_log";
    return "";
  });

  function item(field, customLabel = "") {
    return {
      key: field,
      label: customLabel || fieldLabel(field),
      value: formatValue(field, doc.value?.[field]),
    };
  }

  const specialBadges = computed(() => {
    if (!doc.value) return [];
    if (specialDetailMode.value === "reconciliation") {
      const badges = [];
      if (doc.value.status) badges.push({ key: "status", type: "reconciliation", status: String(doc.value.status) });
      return badges;
    }
    if (specialDetailMode.value === "template") {
      const badges = [];
      if (doc.value.channel) badges.push({ key: "channel", type: "notification_channel", status: String(doc.value.channel) });
      if (doc.value.is_active !== undefined && doc.value.is_active !== null && doc.value.is_active !== "") {
        badges.push({ key: "is_active", type: "boolean_active", status: String(doc.value.is_active) });
      }
      return badges;
    }
    if (specialDetailMode.value === "outbox") {
      const badges = [];
      if (doc.value.status) badges.push({ key: "status", type: "notification_status", status: String(doc.value.status) });
      if (doc.value.channel) badges.push({ key: "channel", type: "notification_channel", status: String(doc.value.channel) });
      return badges;
    }
    return [];
  });

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

  function formatSignalText(value) {
    const entries = parseSignalEntries(value);
    return entries.length ? entries.map((entry) => `- ${entry}`).join("\n") : t("noSignals");
  }

  const specialGroups = computed(() => {
    if (!doc.value) return [];
    if (specialDetailMode.value === "segment_snapshot") {
      return [
        {
          key: "snapshot-context",
          title: t("snapshotContext"),
          items: [
            item("customer"),
            item("office_branch", t("officeBranch")),
            item("snapshot_date"),
            item("segment"),
            item("value_band"),
            item("claim_risk"),
            item("score"),
            item("source_version"),
          ],
        },
        {
          key: "snapshot-signals",
          title: t("snapshotSignals"),
          items: [
            { key: "strength_count", label: t("strengthSignals"), value: String(parseSignalEntries(doc.value?.strengths_json).length) },
            { key: "risk_count", label: t("riskSignals"), value: String(parseSignalEntries(doc.value?.risks_json).length) },
            { key: "reason_count", label: t("scoreReasons"), value: String(parseSignalEntries(doc.value?.score_reason_json).length) },
          ],
        },
      ];
    }
    if (specialDetailMode.value === "ownership_assignment") {
      return [
        {
          key: "assignment-context",
          title: t("assignmentContext"),
          items: [
            item("source_doctype"),
            item("source_name"),
            item("customer"),
            item("policy"),
            item("office_branch", t("officeBranch")),
          ],
        },
        {
          key: "assignment-lifecycle",
          title: t("assignmentLifecycle"),
          items: [
            item("assigned_to"),
            item("assignment_role"),
            item("status"),
            item("priority"),
            item("due_date"),
          ],
        },
      ];
    }
    if (specialDetailMode.value === "access_log") {
      return [
        {
          key: "audit-context",
          title: t("auditContext"),
          items: [
            item("reference_doctype"),
            item("reference_name"),
            item("viewed_by"),
            item("action"),
            item("viewed_on"),
            item("ip_address"),
          ],
        },
        {
          key: "audit-decision",
          title: t("auditDecision"),
          items: [
            item("action_summary", t("auditActionSummary")),
            {
              key: "decision_context_count",
              label: t("auditDecisionContext"),
              value: String(parseSignalEntries(doc.value?.decision_context).length || 0),
            },
          ],
        },
      ];
    }
    if (specialDetailMode.value === "accounting") {
      return [
        {
          key: "accounting-amounts",
          title: t("accountingAmounts"),
          items: [
            item("local_amount_try"),
            item("external_amount_try"),
            item("difference_try"),
            item("currency"),
            item("local_amount"),
            item("external_amount"),
          ],
        },
        {
          key: "accounting-source",
          title: t("accountingSource"),
          items: [
            item("source_doctype"),
            item("source_name"),
            item("policy"),
            item("customer"),
            item("insurance_company"),
            item("external_ref"),
          ],
        },
        {
          key: "accounting-sync",
          title: t("accountingSync"),
          items: [
            item("status"),
            item("entry_type"),
            item("needs_reconciliation"),
            item("last_synced_on"),
            item("sync_attempt_count"),
            item("modified"),
          ],
        },
      ];
    }
    if (specialDetailMode.value === "reconciliation") {
      return [
        {
          key: "reconciliation-context",
          title: t("reconciliationContextTitle"),
          items: [
            item("accounting_entry"),
            item("source_doctype"),
            item("source_name"),
            item("status"),
            item("unique_key"),
          ],
        },
        {
          key: "reconciliation-amounts",
          title: t("reconciliationAmountsTitle"),
          items: [
            item("mismatch_type"),
            item("local_amount_try"),
            item("external_amount_try"),
            item("difference_try"),
            item("resolution_action"),
          ],
        },
        {
          key: "reconciliation-resolution",
          title: t("reconciliationResolutionTitle"),
          items: [
            item("resolved_by"),
            item("resolved_on"),
            item("owner"),
            item("modified"),
          ],
        },
      ];
    }
    if (specialDetailMode.value === "template") {
      return [
        {
          key: "template-meta",
          title: t("templateMeta"),
          items: [
            item("template_key"),
            item("event_key"),
            item("channel"),
            item("language"),
            item("subject"),
            item("is_active"),
          ],
        },
        {
          key: "template-lifecycle",
          title: t("templateLifecycle"),
          items: [item("owner"), item("modified"), item("name")],
        },
      ];
    }
    if (specialDetailMode.value === "outbox") {
      return [
        {
          key: "outbox-delivery",
          title: t("outboxDelivery"),
          items: [
            item("provider"),
            item("priority"),
            item("attempt_count"),
            item("max_attempts"),
            item("status"),
            item("channel"),
          ],
        },
        {
          key: "outbox-retry",
          title: t("outboxRetry"),
          items: [
            item("next_retry_on"),
            item("last_attempt_on"),
            item("provider_message_id"),
            item("modified"),
          ],
        },
        {
          key: "outbox-reference",
          title: t("outboxReference"),
          items: [
            item("reference_doctype"),
            item("reference_name"),
            item("customer"),
            item("draft"),
          ],
        },
        {
          key: "outbox-queue",
          title: t("outboxQueue"),
          items: [item("owner"), item("name")],
        },
      ];
    }
    return [];
  });

  const renderedGroups = computed(() => {
    if (specialGroups.value.length) return specialGroups.value;
    return detailGroups.value.map((group) => ({
      ...group,
      title: groupTitle(group.key),
      items: groupItems(group.fields),
    }));
  });

  function isOperationGroup(group) {
    const key = String(group?.key || "");
    return ["accounting-sync", "outbox-delivery", "outbox-retry", "outbox-queue"].includes(key);
  }
  function isRelatedGroup(group) {
    const key = String(group?.key || "");
    return ["accounting-source", "outbox-reference", "reference"].includes(key);
  }

  const generalGroups = computed(() => renderedGroups.value.filter((g) => !isOperationGroup(g) && !isRelatedGroup(g)));
  const relatedGroups = computed(() => renderedGroups.value.filter((g) => isRelatedGroup(g)));
  const operationGroups = computed(() => renderedGroups.value.filter((g) => isOperationGroup(g)));

  function groupTitle(key) {
    const titles = {
      base: t("baseInfo"),
      schedule: t("scheduleInfo"),
      assignment: t("assignmentInfo"),
      draft: t("draftInfo"),
      delivery: t("deliveryInfo"),
      reference: t("referenceContext"),
    };
    return titles[key] || humanizeField(key);
  }

  function groupItems(fields) {
    return (fields || []).map((field) => ({
      key: field,
      label: fieldLabel(field),
      value: formatValue(field, doc.value?.[field]),
    }));
  }

  const textBlocks = computed(() =>
    (config.textFields || [])
      .map((field) => ({ field, value: doc.value?.[field] }))
      .filter((item) => item.value != null && String(item.value).trim() !== "")
  );

  const specialTextBlocks = computed(() => {
    if (!doc.value) return [];
    if (specialDetailMode.value === "accounting") {
      return [
        { key: "payload_json", field: "payload_json", title: t("payloadJson"), value: doc.value?.payload_json, fullWidth: true },
        { key: "error_message", field: "error_message", title: fieldLabel("error_message"), value: doc.value?.error_message },
      ].filter((item) => item.value != null && String(item.value).trim() !== "");
    }
    if (specialDetailMode.value === "reconciliation") {
      return [
        { key: "notes", field: "notes", title: fieldLabel("notes"), value: doc.value?.notes, fullWidth: true },
        { key: "details_json", field: "details_json", title: fieldLabel("details_json"), value: doc.value?.details_json, fullWidth: true },
      ].filter((item) => item.value != null && String(item.value).trim() !== "");
    }
    if (specialDetailMode.value === "template") {
      return [
        { key: "body_template", field: "body_template", title: t("bodyTemplate"), value: doc.value?.body_template, fullWidth: true },
      ].filter((item) => item.value != null && String(item.value).trim() !== "");
    }
    if (specialDetailMode.value === "outbox") {
      return [
        { key: "error_message", field: "error_message", title: fieldLabel("error_message"), value: doc.value?.error_message },
        { key: "response_log", field: "response_log", title: t("responseLog"), value: doc.value?.response_log, fullWidth: true },
      ].filter((item) => item.value != null && String(item.value).trim() !== "");
    }
    if (specialDetailMode.value === "segment_snapshot") {
      return [
        { key: "strengths_json", field: "strengths_json", title: t("strengthSignals"), value: formatSignalText(doc.value?.strengths_json) },
        { key: "risks_json", field: "risks_json", title: t("riskSignals"), value: formatSignalText(doc.value?.risks_json) },
        { key: "score_reason_json", field: "score_reason_json", title: t("scoreReasons"), value: formatSignalText(doc.value?.score_reason_json), fullWidth: true },
      ].filter((item) => item.value != null && String(item.value).trim() !== "");
    }
    if (specialDetailMode.value === "ownership_assignment") {
      return [
        { key: "notes", field: "notes", title: t("assignmentNotes"), value: doc.value?.notes, fullWidth: true },
      ].filter((item) => item.value != null && String(item.value).trim() !== "");
    }
    if (specialDetailMode.value === "access_log") {
      return [
        { key: "decision_context", field: "decision_context", title: t("auditDecisionContext"), value: formatSignalText(doc.value?.decision_context), fullWidth: true },
      ].filter((item) => item.value != null && String(item.value).trim() !== "");
    }
    return [];
  });

  const renderedTextBlocks = computed(() => [...textBlocks.value, ...specialTextBlocks.value]);

  const relatedRecordCards = computed(() => {
    if (!doc.value) return [];
    const d = doc.value;
    const items = [];

    const pushRef = (key, title, doctype, recName) => {
      if (!recName) return;
      const panel = getSourcePanelConfig(doctype, recName);
      items.push({
        key,
        title,
        subtitle: doctype || "-",
        description: recName,
        meta: doctype || "-",
        open: panel?.url ? () => { navigateToSameOriginPath(panel.url); } : null,
      });
    };

    pushRef("customer", t("relatedCustomer"), "AT Customer", d.customer);
    pushRef("policy", t("relatedPolicy"), "AT Policy", d.policy);
    pushRef("draft", t("relatedDraft"), "AT Notification Draft", d.draft);
    pushRef("outbox", t("relatedOutbox"), "AT Notification Outbox", d.outbox_record);
    pushRef("accounting_entry", t("relatedAccountingEntry"), "AT Accounting Entry", d.accounting_entry);
    if (d.reference_doctype && d.reference_name) pushRef("reference", t("relatedReference"), d.reference_doctype, d.reference_name);
    if (d.source_doctype && d.source_name) pushRef("source", t("relatedSource"), d.source_doctype, d.source_name);

    if (config.doctype === "AT Campaign") {
      for (const draft of asArray(resourceValue(campaignDraftsResource, []))) {
        items.push({
          key: `campaign-draft-${draft.name}`,
          title: `${t("relatedDraft")} - ${draft.name}`,
          subtitle: [draft.channel, draft.status].filter(Boolean).join(" / ") || "AT Notification Draft",
          description: draft.recipient || draft.name,
          meta: formatValue("modified", draft.modified),
          open: () => {
            const panel = getSourcePanelConfig("AT Notification Draft", draft.name);
            if (panel?.url) navigateToSameOriginPath(panel.url);
          },
        });
      }
      for (const outbox of asArray(resourceValue(campaignOutboxResource, []))) {
        items.push({
          key: `campaign-outbox-${outbox.name}`,
          title: `${t("relatedOutbox")} - ${outbox.name}`,
          subtitle: [outbox.channel, outbox.status].filter(Boolean).join(" / ") || "AT Notification Outbox",
          description: outbox.recipient || outbox.name,
          meta: outbox.attempt_count != null ? `${outbox.attempt_count}` : formatValue("modified", outbox.modified),
          open: () => {
            const panel = getSourcePanelConfig("AT Notification Outbox", outbox.name);
            if (panel?.url) navigateToSameOriginPath(panel.url);
          },
        });
      }
    }
    return items;
  });

  const activityItems = computed(() => {
    if (!doc.value) return [];
    const d = doc.value;
    const rows = [];
    const add = (fieldKey, title, value, meta = "") => {
      if (!value) return;
      rows.push({
        key: fieldKey,
        title,
        description: formatValue(fieldKey, value),
        meta: meta || "-",
      });
    };
    add("creation", t("createdAt"), d.creation, d.owner || "");
    add("modified", t("modifiedAt"), d.modified, d.modified_by || d.owner || "");
    add("resolved_on", t("resolvedAt"), d.resolved_on, d.resolved_by || "");
    add("sent_at", t("sentAt"), d.sent_at, d.channel || "");
    add("last_attempt_on", t("lastAttemptAt"), d.last_attempt_on, d.provider || "");
    add("next_retry_on", t("nextRetryAt"), d.next_retry_on, d.status || "");
    add("last_synced_on", t("lastSyncedAt"), d.last_synced_on, d.status || "");
    return rows;
  });

  const detailTabs = computed(() => {
    const tabs = [{ value: "overview", label: t("tabOverview") }];
    if (relatedGroups.value.length || relatedRecordCards.value.length) {
      tabs.push({ value: "related", label: t("tabRelated"), count: relatedRecordCards.value.length || undefined });
    }
    if (activityItems.value.length) tabs.push({ value: "activity", label: t("tabActivity"), count: activityItems.value.length });
    if (operationGroups.value.length) tabs.push({ value: "operations", label: t("tabOperations"), count: operationGroups.value.length });
    if (renderedTextBlocks.value.length) tabs.push({ value: "logs", label: t("tabLogs"), count: renderedTextBlocks.value.length });
    return tabs;
  });

  const visibleGroups = computed(() => {
    if (activeDetailTab.value === "overview") return generalGroups.value;
    if (activeDetailTab.value === "related") return relatedGroups.value;
    if (activeDetailTab.value === "operations") return operationGroups.value;
    return [];
  });

  const visibleTextBlocks = computed(() => (activeDetailTab.value === "logs" ? renderedTextBlocks.value : []));

  return {
    recordTitle,
    recordSubtitle,
    summaryItems,
    specialBadges,
    detailTabs,
    visibleGroups,
    visibleTextBlocks,
    relatedRecordCards,
    activityItems,
    groupTitle,
    groupItems,
    fieldLabel,
  };
}
