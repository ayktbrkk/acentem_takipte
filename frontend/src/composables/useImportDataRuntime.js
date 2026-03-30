import { computed, reactive, ref, unref, watch } from "vue";

const datasets = [
  {
    key: "policies",
    labelKey: "policyLabel",
    fields: [
      { value: "policy_no", labelKey: "policyNo" },
      { value: "customer", labelKey: "customer" },
      { value: "branch", labelKey: "branch" },
      { value: "gross_premium", labelKey: "grossPremium" },
      { value: "status", labelKey: "status" },
    ],
  },
  {
    key: "offers",
    labelKey: "offerLabel",
    fields: [
      { value: "offer_no", labelKey: "offerNo" },
      { value: "customer", labelKey: "customer" },
      { value: "insurance_company", labelKey: "insuranceCompany" },
      { value: "gross_premium", labelKey: "grossPremium" },
      { value: "status", labelKey: "status" },
    ],
  },
  {
    key: "customers",
    labelKey: "customerLabel",
    fields: [
      { value: "full_name", labelKey: "fullName" },
      { value: "tax_id", labelKey: "taxId" },
      { value: "mobile_phone", labelKey: "mobilePhone" },
      { value: "email", labelKey: "email" },
      { value: "customer_type", labelKey: "customerType" },
    ],
  },
];

function label(t, key) {
  return t(key);
}

function parseCsv(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const parts = line.split(",");
    const row = {};
    headers.forEach((head, idx) => {
      row[head] = String(parts[idx] ?? "").trim();
    });
    return row;
  });

  return { headers, rows };
}

export function useImportDataRuntime({ t, router, authStore }) {
  const activeLocale = computed(() => unref(authStore.locale) || "tr");
  const selectedDataset = ref(datasets[0].key);
  const fileName = ref("");
  const columns = ref([]);
  const previewRows = ref([]);
  const importMessage = ref("");
  const columnMapping = reactive({});

  const localizedDatasets = computed(() =>
    datasets.map((dataset) => ({
      key: dataset.key,
      label: label(t, dataset.labelKey),
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

  const canImport = computed(() => {
    return Boolean(fileName.value && columns.value.length && mappedColumnCount.value > 0);
  });

  function resetAll() {
    fileName.value = "";
    columns.value = [];
    previewRows.value = [];
    importMessage.value = "";
    Object.keys(columnMapping).forEach((key) => delete columnMapping[key]);
  }

  function applyParsedData(headers, rows) {
    columns.value = headers;
    previewRows.value = rows.slice(0, 8);
    Object.keys(columnMapping).forEach((key) => delete columnMapping[key]);
    headers.forEach((head) => {
      columnMapping[head] = "";
    });
  }

  function handleFileSelect(event) {
    const input = event?.target;
    const file = input?.files?.[0];
    if (!file) {
      resetAll();
      return;
    }

    const lowerName = String(file.name || "").toLowerCase();
    if (lowerName.includes("muster") || lowerName.includes("customer")) {
      selectedDataset.value = "customers";
    } else if (lowerName.includes("teklif") || lowerName.includes("offer")) {
      selectedDataset.value = "offers";
    } else if (lowerName.includes("polic") || lowerName.includes("poli")) {
      selectedDataset.value = "policies";
    }

    fileName.value = file.name;
    importMessage.value = "";

    if (/\.csv$/i.test(file.name)) {
      const reader = new FileReader();
      reader.onload = () => {
        const parsed = parseCsv(String(reader.result || ""));
        applyParsedData(parsed.headers, parsed.rows);
      };
      reader.readAsText(file);
      return;
    }

    const fallbackHeaders = selectedFieldOptions.value.map((field) => field.label);
    const fallbackRows = Array.from({ length: 5 }).map((_, index) => {
      const row = {};
      fallbackHeaders.forEach((head) => {
        row[head] = `${t("rowsPrefix")} ${index + 1}`;
      });
      return row;
    });
    applyParsedData(fallbackHeaders, fallbackRows);
    importMessage.value = t("xlsPreviewWarning");
  }

  function importData() {
    if (!canImport.value) return;
    if (activeLocale.value === "tr") {
      importMessage.value = `${fileName.value} dosyası için ${mappedColumnCount.value} ${t("columnsMapped")}. ${t("importQueued")}`;
      return;
    }
    importMessage.value = `${mappedColumnCount.value} ${t("columnsMapped")} for ${fileName.value}. ${t("importQueued")}`;
  }

  function cancel() {
    router.push({ name: "dashboard" });
  }

  watch(selectedDataset, () => {
    columns.value.forEach((col) => {
      columnMapping[col] = "";
    });
    importMessage.value = "";
  });

  return {
    activeLocale,
    datasets,
    localizedDatasets,
    selectedDataset,
    fileName,
    columns,
    previewRows,
    importMessage,
    columnMapping,
    selectedFieldOptions,
    mappedColumnCount,
    canImport,
    resetAll,
    handleFileSelect,
    importData,
    cancel,
  };
}
