import { computed } from "vue";

const PRODUCT_FAMILY_TR = {
  motor: "Motor",
  property: "Konut",
  health: "Sağlık",
  travel: "Seyahat",
  life: "Hayat",
  general: "Genel",
};

const INSURED_SUBJECT_TR = {
  policy: "Poliçe",
  vehicle: "Araç",
  property: "Konut",
  person: "Kişi",
  trip: "Seyahat",
};

const COVERAGE_FOCUS_TR = {
  motor: "Motor",
  home: "Konut",
  health: "Sağlık",
  travel: "Seyahat",
  life: "Hayat",
  general: "Genel",
};

const PRODUCT_FIELD_LABEL_TR = {
  "record number": "Kayıt No",
  "start date": "Başlangıç Tarihi",
  "end date": "Bitiş Tarihi",
  "plate no": "Plaka No",
  "chassis no": "Şasi No",
  "engine no": "Motor No",
  "insured address": "Sigortalı Adres",
  "building area": "Yapı Alanı",
  "usage type": "Kullanım Türü",
  "insured count": "Sigortalı Sayısı",
  "plan name": "Plan Adı",
  "provider network": "Anlaşmalı Kurum Ağı",
  "destination": "Varış Ülkesi",
  "trip start": "Seyahat Başlangıç",
  "trip end": "Seyahat Bitiş",
  "insured person": "Sigortalı Kişi",
  beneficiary: "Lehtar",
};

export function usePolicyDetailSummary({
  t,
  locale,
  policy,
  customer,
  endorsements,
  comments,
  communications,
  snapshots,
  files,
  productProfile,
  documentProfile,
  selectedSnapshotName,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  fmtPct,
  stripHtml,
  policyStatusLabel,
  paymentStatusLabel,
  endorsementStatusLabel,
}) {
  const isTrLocale = computed(() => String(locale.value || "").toLowerCase().startsWith("tr"));

  function translateProductFamily(value) {
    const text = String(value || "").trim();
    if (!text || !isTrLocale.value) return text || "-";
    return PRODUCT_FAMILY_TR[text.toLowerCase()] || text;
  }

  function translateInsuredSubject(value) {
    const text = String(value || "").trim();
    if (!text || !isTrLocale.value) return text || "-";
    return INSURED_SUBJECT_TR[text.toLowerCase()] || text;
  }

  function translateCoverageFocus(value) {
    const text = String(value || "").trim();
    if (!text || !isTrLocale.value) return text || "-";
    return COVERAGE_FOCUS_TR[text.toLowerCase()] || text;
  }

  function translateProductFieldLabel(value) {
    const text = String(value || "").trim();
    if (!text || !isTrLocale.value) return text || "-";
    return PRODUCT_FIELD_LABEL_TR[text.toLowerCase()] || text;
  }

  const selectedSnapshot = computed(() => {
    if (!snapshots.value.length) return null;
    if (!selectedSnapshotName.value) return snapshots.value[snapshots.value.length - 1];
    return snapshots.value.find((s) => s.name === selectedSnapshotName.value) || snapshots.value[snapshots.value.length - 1];
  });

  const snapshotPreview = computed(() => {
    if (!selectedSnapshot.value?.snapshot_json) return null;
    try {
      const data = JSON.parse(selectedSnapshot.value.snapshot_json);
      return {
        gross: Number(data.gross_premium || 0),
        commission: Number(data.commission_amount || data.commission || 0),
        currency: data.currency || policy.value.currency || "TRY",
        start: data.start_date || null,
        end: data.end_date || null,
      };
    } catch {
      return null;
    }
  });

  const timelineItems = computed(() => {
    const endorsementItems = endorsements.value.map((row) => ({
      key: `e:${row.name}`,
      date: row.applied_on || row.endorsement_date || row.creation,
      title: `${t("typeEndorsement")} - ${row.endorsement_type || "-"}`,
      body: row.notes || `${row.status || "-"} | ${row.snapshot_version || "-"}`,
      actor: row.applied_by || row.owner || "-",
      dotClass: "bg-emerald-500",
    }));
    const communicationItems = communications.value.map((row) => ({
      key: `c:${row.name}`,
      date: row.communication_date || row.creation,
      title: `${t("typeCall")} - ${row.subject || row.communication_type || "-"}`,
      body: stripHtml(row.content) || "-",
      actor: row.sender || row.owner || "-",
      dotClass: "bg-sky-500",
    }));
    const commentItems = comments.value.map((row) => ({
      key: `n:${row.name}`,
      date: row.creation,
      title: `${t("typeNote")} - ${row.comment_type || "-"}`,
      body: stripHtml(row.content) || "-",
      actor: row.owner || "-",
      dotClass: "bg-amber-500",
    }));
    return [...endorsementItems, ...communicationItems, ...commentItems]
      .filter((row) => Boolean(row.date))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  });

  const remainingDays = computed(() => {
    if (!policy.value.end_date) return null;
    const end = new Date(policy.value.end_date);
    const now = new Date();
    end.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.round((end.getTime() - now.getTime()) / 86400000);
  });

  const carrierPolicyDisplayValue = computed(() => policy.value.policy_no || t("notAssigned"));
  const remainingLabel = computed(() =>
    remainingDays.value == null ? t("noDate") : remainingDays.value < 0 ? t("expired") : String(remainingDays.value)
  );
  const remainingClass = computed(() =>
    remainingDays.value == null ? "text-slate-500" : remainingDays.value < 0 ? "text-amber-700" : remainingDays.value <= 30 ? "text-amber-600" : "text-emerald-600"
  );

  const headerSummaryItems = computed(() => [
    { key: "status", label: t("status"), value: policyStatusLabel(policy.value.status) },
    { key: "customer", label: t("customer"), value: customer.value?.full_name || policy.value.customer || "-" },
    { key: "gross", label: t("gross"), value: fmtMoney(policy.value.gross_premium, policy.value.currency) },
    { key: "remaining", label: t("remaining"), value: remainingLabel.value, valueClass: remainingClass.value, meta: fmtDate(policy.value.end_date) },
  ]);

  const heroCells = computed(() => [
    { label: t("customer"), value: customer.value?.full_name || policy.value.customer || "-", variant: "default" },
    { label: t("branch"), value: policy.value.branch || "-", variant: "default" },
    { label: t("gross"), value: fmtMoney(policy.value.gross_premium, policy.value.currency), variant: "lg" },
    {
      label: t("remaining"),
      value: remainingLabel.value,
      variant: remainingDays.value != null && remainingDays.value <= 30 ? "warn" : "accent",
      suffix: policy.value.end_date ? `/ ${fmtDate(policy.value.end_date)}` : "",
    },
  ]);

  const lifecycleSteps = computed(() => {
    const items = [
      { label: t("issue"), completed: Boolean(policy.value.issue_date) },
      { label: t("start"), completed: Boolean(policy.value.start_date) },
      { label: t("end"), completed: Boolean(policy.value.end_date) },
      { label: t("status"), completed: Boolean(policy.value.status) },
    ];
    const firstPendingIndex = items.findIndex((item) => !item.completed);
    return items.map((item, index) => ({ label: item.label, state: item.completed ? "done" : index === firstPendingIndex ? "current" : "pending" }));
  });

  const lifecycleFields = computed(() => [
    { label: t("company"), value: policy.value.insurance_company || "-" },
    { label: t("status"), value: policyStatusLabel(policy.value.status) },
    { label: t("currency"), value: policy.value.currency || "TRY" },
    { label: t("fxRate"), value: Number(policy.value.fx_rate || 0).toFixed(4) },
  ]);

  const premiumMetrics = computed(() => [
    { label: t("gross"), value: fmtMoney(policy.value.gross_premium, policy.value.currency) },
    { label: t("net"), value: fmtMoney(policy.value.net_premium, policy.value.currency) },
    { label: t("commission"), value: fmtMoney(policy.value.commission_amount, policy.value.currency) },
    { label: t("gwpTry"), value: fmtMoney(policy.value.gwp_try, "TRY") },
  ]);

  const dateFields = computed(() => [
    { label: t("issue"), value: fmtDate(policy.value.issue_date) },
    { label: t("start"), value: fmtDate(policy.value.start_date) },
    { label: t("end"), value: fmtDate(policy.value.end_date) },
    { label: t("remaining"), value: remainingLabel.value, variant: remainingDays.value != null && remainingDays.value > 0 ? "accent" : "muted" },
  ]);

  const premiumSummaryItems = computed(() => [
    { key: "net", label: t("net"), value: fmtMoney(policy.value.net_premium, policy.value.currency) },
    { key: "tax", label: t("tax"), value: fmtMoney(policy.value.tax_amount, policy.value.currency) },
    { key: "commission", label: t("commission"), value: fmtMoney(policy.value.commission_amount, policy.value.currency) },
    { key: "gross", label: t("gross"), value: fmtMoney(policy.value.gross_premium, policy.value.currency) },
    { key: "commissionRate", label: t("commissionRate"), value: fmtPct(policy.value.commission_rate) },
    { key: "gwpTry", label: t("gwpTry"), value: fmtMoney(policy.value.gwp_try, "TRY") },
  ]);

  const coverageSummaryItems = computed(() => [
    { key: "company", label: t("company"), value: policy.value.insurance_company || "-" },
    { key: "branch", label: t("branch"), value: policy.value.branch || "-" },
    { key: "status", label: t("status"), value: policyStatusLabel(policy.value.status) },
    { key: "currency", label: t("currency"), value: policy.value.currency || "TRY" },
    { key: "fxRate", label: t("fxRate"), value: Number(policy.value.fx_rate || 0).toFixed(4) },
    { key: "fxDate", label: t("fxDate"), value: fmtDate(policy.value.fx_date) },
  ]);

  const productProfileSummaryItems = computed(() => [
    {
      key: "productFamily",
      label: t("productFamily"),
      value: translateProductFamily(productProfile.value.product_family || "-"),
    },
    {
      key: "insuredSubject",
      label: t("insuredSubject"),
      value: translateInsuredSubject(productProfile.value.insured_subject || "-"),
    },
    {
      key: "coverageFocus",
      label: t("coverageFocus"),
      value: translateCoverageFocus(productProfile.value.coverage_focus || productProfile.value.branch_label || "-"),
    },
    { key: "policyStatus", label: t("status"), value: policyStatusLabel(productProfile.value.policy_status || policy.value.status) },
  ]);

  const productReadinessSummaryItems = computed(() => [
    { key: "readiness", label: t("readinessScore"), value: fmtPct(productProfile.value.readiness_score) },
    { key: "completed", label: t("completedFields"), value: String(productProfile.value.completed_field_count ?? 0) },
    { key: "missing", label: t("missingFields"), value: String(productProfile.value.missing_field_count ?? 0) },
  ]);

  const productMissingFieldRows = computed(() =>
    (productProfile.value.missing_fields || []).map((item) => ({
      ...item,
      label: translateProductFieldLabel(item?.label),
    }))
  );

  const documentProfileSummaryItems = computed(() => [
    { key: "totalDocuments", label: t("totalDocuments"), value: String(documentProfile.value.total_files ?? files.value.length ?? 0) },
    { key: "pdfDocuments", label: t("pdfDocuments"), value: String(documentProfile.value.pdf_count ?? 0) },
    { key: "imageDocuments", label: t("imageDocuments"), value: String(documentProfile.value.image_count ?? 0) },
    { key: "spreadsheetDocuments", label: t("spreadsheetDocuments"), value: String(documentProfile.value.spreadsheet_count ?? 0) },
    { key: "otherDocuments", label: t("otherDocuments"), value: String(documentProfile.value.other_count ?? 0) },
    { key: "lastUploadedOn", label: t("lastUploadedOn"), value: documentProfile.value.last_uploaded_on ? fmtDateTime(documentProfile.value.last_uploaded_on) : t("noDate") },
  ]);

  const premiumFieldGroups = computed(() =>
    premiumSummaryItems.value.map((item) => ({ label: item.label, value: item.value, variant: item.valueClass === remainingClass.value ? "accent" : "default" }))
  );
  const coverageFieldGroups = computed(() => coverageSummaryItems.value.map((item) => ({ label: item.label, value: item.value })));
  const productProfileFieldGroups = computed(() => productProfileSummaryItems.value.map((item) => ({ label: item.label, value: item.value })));
  const productReadinessFieldGroups = computed(() => [
    ...productReadinessSummaryItems.value.map((item) => ({ label: item.label, value: item.value })),
    {
      label: t("missingProductFields"),
      value: productMissingFieldRows.value.length ? productMissingFieldRows.value.map((item) => item.label).join(", ") : t("noMissingProductField"),
      span: 3,
      variant: productMissingFieldRows.value.length ? "accent" : "muted",
    },
  ]);
  const documentFieldGroups = computed(() => documentProfileSummaryItems.value.map((item) => ({ label: item.label, value: item.value })));

  const customerInitials = computed(() => {
    const source = String(customer.value?.full_name || customer.value?.name || "").trim();
    if (!source) return "AT";
    const localeCode = locale.value || "en-US";
    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => String(part.charAt(0) || "").toLocaleUpperCase(localeCode))
      .join("");
  });

  return {
    selectedSnapshot,
    snapshotPreview,
    timelineItems,
    remainingDays,
    carrierPolicyDisplayValue,
    remainingLabel,
    remainingClass,
    headerSummaryItems,
    heroCells,
    lifecycleSteps,
    lifecycleFields,
    premiumMetrics,
    dateFields,
    premiumFieldGroups,
    coverageFieldGroups,
    productProfileFieldGroups,
    productReadinessFieldGroups,
    documentFieldGroups,
    customerInitials,
  };
}
