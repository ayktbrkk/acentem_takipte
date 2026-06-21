import { computed, onUnmounted, reactive, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { useAtFormatting } from "./useAtFormatting";
import {
  buildCustomerListPreviewColumns,
  mapCustomerImportPreviewToTableRow,
} from "./customerListTableModel";
import {
  buildOfferListPreviewColumns,
  mapOfferImportPreviewToTableRow,
} from "./offerListTableModel";
import {
  buildPolicyListPreviewColumns,
  mapPolicyImportPreviewToTableRow,
} from "./policyListTableModel";

const datasets = [
  {
    key: "customers",
    labelKey: "customerLabel",
    supported: true,
    fields: [
      { value: "full_name", labelKey: "fullName" },
      { value: "tax_id", labelKey: "taxId" },
      { value: "mobile_phone", labelKey: "mobilePhone" },
      { value: "email", labelKey: "email" },
      { value: "customer_type", labelKey: "customerType" },
    ],
  },
  {
    key: "offers",
    labelKey: "offerLabel",
    supported: true,
    fields: [
      { value: "customer", labelKey: "customer" },
      { value: "insurance_company", labelKey: "insuranceCompany" },
      { value: "branch", labelKey: "branch" },
      { value: "offer_date", labelKey: "offerDate" },
      { value: "valid_until", labelKey: "validUntil" },
      { value: "gross_premium", labelKey: "grossPremium" },
      { value: "commission_amount", labelKey: "commissionAmount" },
      { value: "status", labelKey: "status" },
      { value: "sales_entity", labelKey: "salesEntity" },
      { value: "net_premium", labelKey: "netPremium" },
      { value: "tax_amount", labelKey: "taxAmount" },
    ],
  },
  {
    key: "policies",
    labelKey: "policyLabel",
    supported: true,
    fields: [
      { value: "policy_no", labelKey: "policyNo" },
      { value: "customer", labelKey: "customer" },
      { value: "branch", labelKey: "branch" },
      { value: "insurance_company", labelKey: "insuranceCompany" },
      { value: "sales_entity", labelKey: "salesEntity" },
      { value: "issue_date", labelKey: "issueDate" },
      { value: "start_date", labelKey: "startDate" },
      { value: "end_date", labelKey: "endDate" },
      { value: "gross_premium", labelKey: "grossPremium" },
      { value: "commission_amount", labelKey: "commissionAmount" },
      { value: "status", labelKey: "status" },
    ],
  },
];

function label(t, key) {
  return t(key);
}

function normalizeToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function suggestColumnMapping(headers, fieldOptions) {
  const suggestions = {};
  const fieldIndex = new Map();
  fieldOptions.forEach((field) => {
    fieldIndex.set(normalizeToken(field.value), field.value);
    fieldIndex.set(normalizeToken(field.label), field.value);
  });
  const aliasIndex = {
    ad_soyad: "full_name",
    fullname: "full_name",
    tckn: "tax_id",
    vergi_no: "tax_id",
    cep_telefonu: "mobile_phone",
    mobilephone: "mobile_phone",
    sigorta_sirketi: "insurance_company",
    satis_kanali: "sales_entity",
    teklif_tarihi: "offer_date",
    tanzim_tarihi: "issue_date",
    baslangic_tarihi: "start_date",
    bitis_tarihi: "end_date",
    police_no: "policy_no",
    gecerlilik_tarihi: "valid_until",
    valid_until: "valid_until",
    brut_prim: "gross_premium",
    komisyon: "commission_amount",
    commission: "commission_amount",
  };
  Object.entries(aliasIndex).forEach(([alias, target]) => {
    fieldIndex.set(alias, target);
  });

  headers.forEach((header) => {
    const token = normalizeToken(header);
    if (fieldIndex.has(token)) {
      suggestions[header] = fieldIndex.get(token);
    }
  });
  return suggestions;
}

function guessDatasetFromFileName(fileName) {
  const lowerName = String(fileName || "").toLowerCase();
  if (lowerName.includes("muster") || lowerName.includes("customer")) return "customers";
  if (lowerName.includes("teklif") || lowerName.includes("offer")) return "offers";
  if (lowerName.includes("polic") || lowerName.includes("poli")) return "policies";
  return null;
}

export function useImportDataRuntime({ t, router, authStore, branchStore }) {
  const activeLocale = computed(() => unref(authStore.locale) || "en");
  const selectedDataset = ref("customers");
  const fileName = ref("");
  const selectedFile = ref(null);
  const columns = ref([]);
  const previewRows = ref([]);
  const previewSummary = ref({});
  const importMessage = ref("");
  const errorMessage = ref("");
  const jobName = ref("");
  const jobStatus = ref("");
  const resultSummary = ref({});
  const errorLogFile = ref("");
  const columnMapping = reactive({});
  const uploading = ref(false);
  const previewLoading = ref(false);
  const importLoading = ref(false);
  const sheetNames = ref([]);
  const selectedSheet = ref("");
  const jobHistory = ref([]);

  const createDraftResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.data_import.create_import_job_draft",
    auto: false,
  });
  const previewResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.data_import.preview_data_import",
    auto: false,
  });
  const enqueueResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.data_import.enqueue_data_import",
    auto: false,
  });
  const statusResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.data_import.get_import_job_status",
    auto: false,
  });
  const listJobsResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.data_import.list_import_jobs",
    auto: false,
  });
  const headersResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.data_import.get_import_file_headers",
    auto: false,
  });
  const cancelResource = createResource({
    url: "acentem_takipte.acentem_takipte.api.data_import.cancel_import_job",
    auto: false,
  });
  const statusPolling = ref(null);
  const headersLoading = ref(false);
  let importReadyHandler = null;
  let importFailedHandler = null;

  const localizedDatasets = computed(() =>
    datasets.map((dataset) => ({
      key: dataset.key,
      label: label(t, dataset.labelKey),
      supported: dataset.supported,
    })),
  );

  const selectedFieldOptions = computed(() => {
    const dataset = datasets.find((item) => item.key === selectedDataset.value);
    return (dataset?.fields || []).map((field) => ({
      value: field.value,
      label: label(t, field.labelKey),
    }));
  });

  const mappedColumnCount = computed(() => {
    return columns.value.filter((col) => String(columnMapping[col] || "").trim() !== "").length;
  });

  const isDatasetSupported = computed(() => {
    const dataset = datasets.find((item) => item.key === selectedDataset.value);
    return Boolean(dataset?.supported);
  });

  const isSpreadsheetFile = computed(() => /\.xlsx$/i.test(fileName.value || ""));

  const canPreview = computed(() => {
    return Boolean(
      isDatasetSupported.value
      && jobName.value
      && columns.value.length
      && mappedColumnCount.value > 0
      && !uploading.value
      && !previewLoading.value,
    );
  });

  const canImport = computed(() => {
    const readyCount = Number(previewSummary.value?.ready || 0);
    return Boolean(canPreview.value && readyCount > 0 && jobStatus.value === "Previewed" && !importLoading.value);
  });

  const canCancelImport = computed(() => {
    return ["Draft", "Previewed", "Queued"].includes(String(jobStatus.value || ""));
  });

  const { formatDate, formatCurrency } = useAtFormatting(
    computed(() => (String(unref(activeLocale) || "tr").toLowerCase().startsWith("tr") ? "tr" : "en")),
  );

  const translateField = (key) => label(t, key);

  const workbenchPreviewColumns = computed(() => {
    if (selectedDataset.value === "customers") return buildCustomerListPreviewColumns(translateField);
    if (selectedDataset.value === "offers") return buildOfferListPreviewColumns(translateField);
    if (selectedDataset.value === "policies") return buildPolicyListPreviewColumns(translateField);
    return [];
  });

  const workbenchPreviewRows = computed(() => {
    const locale = unref(activeLocale);
    if (selectedDataset.value === "customers") {
      return previewRows.value.map((row) =>
        mapCustomerImportPreviewToTableRow(row, { t: translateField, localeCode: locale }),
      );
    }
    if (selectedDataset.value === "offers") {
      return previewRows.value.map((row) =>
        mapOfferImportPreviewToTableRow(row, {
          formatDate,
          formatCurrency,
          localeCode: locale,
          t: translateField,
        }),
      );
    }
    if (selectedDataset.value === "policies") {
      return previewRows.value.map((row) =>
        mapPolicyImportPreviewToTableRow(row, {
          formatDate,
          formatCurrency,
          localeCode: locale,
        }),
      );
    }
    return [];
  });

  const useWorkbenchTable = computed(() => ["customers", "offers", "policies"].includes(selectedDataset.value));

  function clearPreviewResults() {
    previewRows.value = [];
    previewSummary.value = {};
    importMessage.value = "";
    if (jobStatus.value === "Previewed") {
      jobStatus.value = "Draft";
    }
  }

  function applyColumnSuggestions() {
    const suggestions = suggestColumnMapping(columns.value, selectedFieldOptions.value);
    Object.entries(suggestions).forEach(([header, field]) => {
      if (!columnMapping[header]) {
        columnMapping[header] = field;
      }
    });
  }

  function resetPreviewState() {
    previewRows.value = [];
    previewSummary.value = {};
    importMessage.value = "";
    errorMessage.value = "";
    jobStatus.value = "";
    resultSummary.value = {};
    errorLogFile.value = "";
    stopStatusPolling();
  }

  function resetAll() {
    fileName.value = "";
    selectedFile.value = null;
    columns.value = [];
    jobName.value = "";
    Object.keys(columnMapping).forEach((key) => delete columnMapping[key]);
    resetPreviewState();
  }

  function applyHeaders(headers) {
    columns.value = headers;
    Object.keys(columnMapping).forEach((key) => delete columnMapping[key]);
    headers.forEach((head) => {
      columnMapping[head] = "";
    });
    applyColumnSuggestions();
  }

  async function uploadSelectedFile(file) {
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      errorMessage.value = t("fileTooLarge");
      return;
    }

    uploading.value = true;
    errorMessage.value = "";
    resetPreviewState();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("is_private", "1");

    try {
      const csrfToken = (typeof window !== "undefined" && window.csrf_token) || "";
      const response = await fetch("/api/method/upload_file", {
        method: "POST",
        body: formData,
        headers: csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : {},
      });
      const payload = await response.json();
      const uploadedName = payload?.message?.name || "";
      const uploadedUrl = payload?.message?.file_url || "";
      if (!uploadedName) {
        errorMessage.value = t("uploadError");
        return;
      }

      const draft = await createDraftResource.submit({
        dataset: selectedDataset.value,
        file_name: uploadedName,
        file_url: uploadedUrl,
      });
      jobName.value = draft?.job_name || "";
      sheetNames.value = draft?.sheet_names || [];
      selectedSheet.value = draft?.active_sheet || sheetNames.value[0] || "";
      applyHeaders(draft?.headers || []);
      jobStatus.value = "Draft";
      await loadJobHistory();
    } catch (error) {
      errorMessage.value = error?.messages?.join(" ") || error?.message || t("uploadError");
    } finally {
      uploading.value = false;
    }
  }

  async function handleFileSelect(event) {
    const input = event?.target;
    const file = input?.files?.[0];
    if (!file) {
      resetAll();
      return;
    }

    const guessedDataset = guessDatasetFromFileName(file.name);
    if (guessedDataset) {
      selectedDataset.value = guessedDataset;
    }

    if (!isDatasetSupported.value) {
      errorMessage.value = t("datasetNotSupported");
      fileName.value = file.name;
      selectedFile.value = file;
      return;
    }

    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      errorMessage.value = t("unsupportedFileMessage");
      fileName.value = file.name;
      selectedFile.value = file;
      return;
    }

    fileName.value = file.name;
    selectedFile.value = file;
    await uploadSelectedFile(file);
  }

  async function previewData() {
    if (!canPreview.value || !jobName.value) return;
    previewLoading.value = true;
    errorMessage.value = "";
    importMessage.value = "";

    const mapping = {};
    columns.value.forEach((column) => {
      if (columnMapping[column]) {
        mapping[column] = columnMapping[column];
      }
    });

    try {
      const result = await previewResource.submit({
        job_name: jobName.value,
        column_mapping: mapping,
        import_options: {
          office_branch: branchStore?.requestBranch || null,
          delimiter: ",",
          duplicate_policy: "skip",
          sheet_name: selectedSheet.value || null,
        },
      });
      previewRows.value = (result?.rows || []).map((row) => ({
        ...row.raw,
        row_status: row.row_status,
        error_message: row.error_message,
        normalized_values: row.values || {},
      }));
      previewSummary.value = result?.summary || {};
      jobStatus.value = "Previewed";
      importMessage.value = t("previewReadyMessage");
    } catch (error) {
      errorMessage.value = error?.messages?.join(" ") || error?.message || t("previewFailed");
    } finally {
      previewLoading.value = false;
    }
  }

  function stopStatusPolling() {
    if (statusPolling.value) {
      clearInterval(statusPolling.value);
      statusPolling.value = null;
    }
  }

  async function refreshJobStatus() {
    if (!jobName.value) return;
    try {
      const result = await statusResource.submit({ job_name: jobName.value });
      jobStatus.value = result?.status || jobStatus.value;
      resultSummary.value = result?.result_summary || {};
      errorLogFile.value = result?.error_log_file || "";
      if (["Completed", "Failed", "Cancelled"].includes(jobStatus.value)) {
        stopStatusPolling();
        if (jobStatus.value === "Completed") {
          importMessage.value = t("importCompleted");
        } else if (jobStatus.value === "Cancelled") {
          importMessage.value = t("importCancelled");
        } else {
          importMessage.value = t("importFailed");
        }
        loadJobHistory();
      }
    } catch (error) {
      errorMessage.value = error?.messages?.join(" ") || error?.message || t("statusFailed");
      stopStatusPolling();
    }
  }

  function startStatusPolling() {
    stopStatusPolling();
    statusPolling.value = setInterval(() => {
      refreshJobStatus();
    }, 2000);
  }

  async function importData() {
    if (!canImport.value || !jobName.value) return;
    importLoading.value = true;
    errorMessage.value = "";

    try {
      await enqueueResource.submit({ job_name: jobName.value });
      jobStatus.value = "Queued";
      importMessage.value = t("importQueued");
      startStatusPolling();
      await refreshJobStatus();
    } catch (error) {
      errorMessage.value = error?.messages?.join(" ") || error?.message || t("importFailed");
    } finally {
      importLoading.value = false;
    }
  }

  async function refreshHeadersForSheet() {
    if (!jobName.value || !selectedSheet.value) return;
    headersLoading.value = true;
    errorMessage.value = "";
    clearPreviewResults();

    try {
      const result = await headersResource.submit({
        job_name: jobName.value,
        sheet_name: selectedSheet.value,
      });
      sheetNames.value = result?.sheet_names || sheetNames.value;
      selectedSheet.value = result?.active_sheet || selectedSheet.value;
      applyHeaders(result?.headers || []);
    } catch (error) {
      errorMessage.value = error?.messages?.join(" ") || error?.message || t("headersRefreshFailed");
    } finally {
      headersLoading.value = false;
    }
  }

  function handleImportRealtime(payload) {
    if (!payload?.job_name || payload.job_name !== jobName.value) {
      return;
    }
    stopStatusPolling();
    jobStatus.value = payload?.status || jobStatus.value;
    resultSummary.value = payload?.result_summary || resultSummary.value;
    errorLogFile.value = payload?.error_log_file || errorLogFile.value;
    importMessage.value = jobStatus.value === "Completed" ? t("importCompleted") : t("importFailed");
    loadJobHistory();
  }

  function bindImportRealtimeListeners() {
    const realtime = typeof window !== "undefined" ? window?.frappe?.realtime : null;
    if (!realtime || typeof realtime.on !== "function") {
      return;
    }

    importReadyHandler = (payload) => handleImportRealtime(payload);
    importFailedHandler = (payload) => {
      if (!payload?.job_name || payload.job_name !== jobName.value) {
        return;
      }
      stopStatusPolling();
      jobStatus.value = "Failed";
      importMessage.value = t("importFailed");
      errorMessage.value = payload?.error || t("importFailed");
      loadJobHistory();
    };
    realtime.on("at_import_ready", importReadyHandler);
    realtime.on("at_import_failed", importFailedHandler);
  }

  function unbindImportRealtimeListeners() {
    const realtime = typeof window !== "undefined" ? window?.frappe?.realtime : null;
    if (!realtime || typeof realtime.off !== "function") {
      return;
    }
    if (importReadyHandler) {
      realtime.off("at_import_ready", importReadyHandler);
      importReadyHandler = null;
    }
    if (importFailedHandler) {
      realtime.off("at_import_failed", importFailedHandler);
      importFailedHandler = null;
    }
  }

  async function cancelImportJob(targetJobName = "") {
    const safeJobName = String(targetJobName || jobName.value || "").trim();
    if (!safeJobName) return;

    try {
      await cancelResource.submit({ job_name: safeJobName });
      if (safeJobName === jobName.value) {
        stopStatusPolling();
        jobStatus.value = "Cancelled";
        importMessage.value = t("importCancelled");
      }
      await loadJobHistory();
    } catch (error) {
      errorMessage.value = error?.messages?.join(" ") || error?.message || t("cancelFailed");
    }
  }

  function clearError() {
    errorMessage.value = "";
  }

  function cancel() {
    stopStatusPolling();
    router.push({ name: "dashboard" });
  }

  async function loadJobHistory() {
    try {
      const rows = await listJobsResource.submit({ limit: 10 });
      jobHistory.value = Array.isArray(rows) ? rows : [];
    } catch {
      jobHistory.value = [];
    }
  }

  watch(selectedSheet, async (sheet, previous) => {
    if (!sheet || !previous || !jobName.value || !isSpreadsheetFile.value) return;
    await refreshHeadersForSheet();
  });
  watch(selectedDataset, () => {
    columns.value.forEach((col) => {
      columnMapping[col] = "";
    });
    clearPreviewResults();
    if (selectedFile.value && isDatasetSupported.value) {
      uploadSelectedFile(selectedFile.value);
    }
  });

  bindImportRealtimeListeners();
  onUnmounted(() => {
    stopStatusPolling();
    unbindImportRealtimeListeners();
  });

  loadJobHistory();

  return {
    activeLocale,
    datasets,
    localizedDatasets,
    selectedDataset,
    fileName,
    columns,
    previewRows,
    workbenchPreviewColumns,
    workbenchPreviewRows,
    useWorkbenchTable,
    previewSummary,
    importMessage,
    errorMessage,
    columnMapping,
    selectedFieldOptions,
    mappedColumnCount,
    canPreview,
    canImport,
    canCancelImport,
    isDatasetSupported,
    uploading,
    previewLoading,
    importLoading,
    headersLoading,
    jobName,
    jobStatus,
    resultSummary,
    errorLogFile,
    sheetNames,
    selectedSheet,
    isSpreadsheetFile,
    jobHistory,
    resetAll,
    handleFileSelect,
    previewData,
    importData,
    cancelImportJob,
    clearError,
    cancel,
  };
}
