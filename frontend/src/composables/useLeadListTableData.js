import { computed } from "vue";
import { translateText } from "../utils/i18n";

export function useLeadListTableData({ t, activeLocale, leadListResource }) {
  const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
  const rows = computed(() => leadListResource.data?.rows || []);
  const isInitialLoading = computed(() => leadListResource.loading && rows.value.length === 0);

  const leadStatusOptions = computed(() => [
    { value: "Draft", label: t("statusDraft") },
    { value: "Open", label: t("statusOpen") },
    { value: "Replied", label: t("statusReplied") },
    { value: "Closed", label: t("statusClosed") },
  ]);
  const conversionStateOptions = computed(() => [
    { value: "unconverted", label: t("conversionStateUnconverted") },
    { value: "any_converted", label: t("conversionStateAnyConverted") },
    { value: "offer", label: t("conversionStateOffer") },
    { value: "policy", label: t("conversionStatePolicy") },
  ]);
  const staleStateOptions = computed(() => [
    { value: "Fresh", label: t("staleStateFresh") },
    { value: "FollowUp", label: t("staleStateFollowUp") },
    { value: "Stale", label: t("staleStateStale") },
  ]);

  function leadDisplayName(row) {
    return `${String(row?.first_name || "").trim()} ${String(row?.last_name || "").trim()}`.trim() || row?.name || "-";
  }
  function fmtDateTime(value) {
    if (!value) return "-";
    try {
      return new Intl.DateTimeFormat(localeCode.value, { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
    } catch {
      return String(value);
    }
  }
  function fmtCurrency(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "-";
    return new Intl.NumberFormat(localeCode.value, { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n);
  }
  function formatCount(value) {
    return new Intl.NumberFormat(localeCode.value).format(Number(value || 0));
  }
  function formatPercent(value) {
    return `%${new Intl.NumberFormat(localeCode.value, { maximumFractionDigits: 1 }).format(Number(value || 0))}`;
  }
  function canConvertLead(row) {
    if (typeof row?.can_convert_to_offer === "boolean") return row.can_convert_to_offer;
    if (!row || row.converted_offer || row.converted_policy) return false;
    if (String(row.status || "") === "Closed") return false;
    if (!row.customer || !row.sales_entity || !row.insurance_company || !row.branch) return false;
    const estimated = Number(row.estimated_gross_premium || 0);
    return Number.isFinite(estimated) && estimated > 0;
  }
  function leadConversionState(row) {
    if (row?.conversion_state) return row.conversion_state;
    if (row?.converted_policy) return "Policy";
    if (row?.converted_offer) return "Offer";
    if (String(row?.status || "") === "Closed") return "Closed";
    if (canConvertLead(row)) return "Actionable";
    return "Incomplete";
  }
  function leadAgeDays(value) {
    if (!value) return 999;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 999;
    const diff = Date.now() - date.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }
  function leadStaleState(row) {
    if (row?.stale_state) return row.stale_state;
    const days = leadAgeDays(row?.modified);
    if (days >= 8) return "Stale";
    if (days >= 3) return "FollowUp";
    return "Fresh";
  }
  function leadConversionMissingFields(row) {
    if (Array.isArray(row?.conversion_missing_fields) && row.conversion_missing_fields.length) {
      const mapping = {
        customer: t("customer"),
        sales_entity: t("salesEntity"),
        insurance_company: t("company"),
        branch: t("branch"),
        estimated_gross_premium: t("estimatedGross"),
      };
      return row.conversion_missing_fields.map((field) => mapping[field] || field).join(", ");
    }
    if (!row || row.converted_offer || row.converted_policy) return "";
    const missing = [];
    if (!row.customer) missing.push(t("customer"));
    if (!row.sales_entity) missing.push(t("salesEntity"));
    if (!row.insurance_company) missing.push(t("company"));
    if (!row.branch) missing.push(t("branch"));
    const estimated = Number(row.estimated_gross_premium || 0);
    if (!(Number.isFinite(estimated) && estimated > 0)) missing.push(t("estimatedGross"));
    return missing.join(", ");
  }

  const leadListRows = computed(() =>
    rows.value.map((row) => ({
      ...row,
      name: row.name,
      customer_type_label: translateText(row.customer_customer_type || "-", activeLocale.value),
      customer_tax_id: row.customer_masked_tax_id || "-",
      customer_label: row.customer_full_name || row.customer_name || row.customer || "-",
      customer_birth_date: row.customer_birth_date || null,
      issue_date: row.creation || null,
      customer: row.customer || "-",
      branch: row.branch || "-",
      status: row.status || "Draft",
      stale_state: leadStaleState(row),
      conversion_state: leadConversionState(row),
    }))
  );
  const leadStatusCountMap = computed(() => {
    const counts = { "": rows.value.length, Draft: 0, Open: 0, Replied: 0, Closed: 0 };
    for (const row of rows.value) {
      const status = String(row?.status || "Draft");
      if (!(status in counts)) counts[status] = 0;
      counts[status] += 1;
    }
    return counts;
  });
  const leadVisibleStatusOptions = computed(() => [
    {
      value: "",
      label: translateText("All", activeLocale.value),
      count: leadStatusCountMap.value[""] || 0,
    },
    ...leadStatusOptions.value.map((option) => ({
      ...option,
      count: leadStatusCountMap.value[option.value] || 0,
    })),
  ]);
  const leadPageSummary = computed(() => {
    const summary = { open: 0, followUp: 0, actionable: 0, converted: 0, conversionRate: 0 };
    for (const row of rows.value) {
      if (String(row?.status || "") === "Open") summary.open += 1;
      if (leadStaleState(row) !== "Fresh") summary.followUp += 1;
      if (canConvertLead(row)) summary.actionable += 1;
      if (row?.converted_offer || row?.converted_policy) summary.converted += 1;
    }
    summary.conversionRate = rows.value.length ? (summary.converted / rows.value.length) * 100 : 0;
    return summary;
  });
  const leadListFilterConfig = computed(() => [
    {
      key: "status",
      label: "Durum",
      options: leadStatusOptions.value.map((item) => ({ value: item.value, label: item.label })),
    },
    {
      key: "branch",
      label: "Branş",
      options: [...new Set(rows.value.map((row) => String(row.branch || "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, localeCode.value))
        .map((value) => ({ value, label: value })),
    },
    {
      key: "sales_entity",
      label: "Satış Birimi",
      options: [...new Set(rows.value.map((row) => String(row.sales_entity || "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, localeCode.value))
        .map((value) => ({ value, label: value })),
    },
    {
      key: "insurance_company",
      label: "Sigorta Şirketi",
      options: [...new Set(rows.value.map((row) => String(row.insurance_company || "").trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, localeCode.value))
        .map((value) => ({ value, label: value })),
    },
    {
      key: "conversion_state",
      label: "Dönüşüm",
      options: conversionStateOptions.value.map((item) => ({ value: item.value, label: item.label })),
    },
    {
      key: "stale_state",
      label: "Takip Durumu",
      options: staleStateOptions.value.map((item) => ({ value: item.value, label: item.label })),
    },
  ]);
  const leadListColumns = [
    { key: "name", label: "Fırsat No", width: "160px", type: "mono" },
    { key: "insurance_company", label: "Sigorta Şirketi", width: "180px" },
    { key: "branch", label: "Branş", width: "160px" },
    { key: "status", label: "Durum", width: "100px", type: "status" },
    { key: "customer_type_label", label: "Müşteri Türü", width: "130px" },
    { key: "customer_tax_id", label: "TC/VNO", width: "140px", type: "mono" },
    { key: "customer_label", label: "Müşteri Ad Soyad", width: "220px" },
    { key: "customer_birth_date", label: "Doğum Tarihi", width: "120px", type: "date" },
    { key: "issue_date", label: "Tanzim Tarihi", width: "120px", type: "date" },
    { key: "stale_state", label: "Takip Durumu", width: "120px", type: "status" },
    { key: "conversion_state", label: "Dönüşüm", width: "140px", type: "status" },
    { key: "estimated_gross_premium", label: "Tahmini Brüt Prim", width: "140px", type: "amount", align: "right" },
  ];

  return {
    rows,
    localeCode,
    isInitialLoading,
    leadStatusOptions,
    conversionStateOptions,
    staleStateOptions,
    leadDisplayName,
    fmtDateTime,
    fmtCurrency,
    formatCount,
    formatPercent,
    canConvertLead,
    leadConversionState,
    leadConversionMissingFields,
    leadAgeDays,
    leadStaleState,
    leadStatusCountMap,
    leadVisibleStatusOptions,
    leadPageSummary,
    leadListFilterConfig,
    leadListRows,
    leadListColumns,
  };
}
