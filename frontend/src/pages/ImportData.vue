<template>
  <WorkbenchPageLayout
    breadcrumb="Veri Yönetimi → İçe Aktarma"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :show-record-count="false"
  >
    <template #actions>
      <button class="btn btn-outline btn-sm" type="button" @click="resetAll">{{ t("clear") }}</button>
    </template>

    <SectionPanel :title="t('step1Title')" panel-class="surface-card rounded-2xl p-5">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="form-field">
          <label class="form-label">{{ t("datasetLabel") }}</label>
          <select v-model="selectedDataset" class="form-input">
            <option v-for="dataset in localizedDatasets" :key="dataset.key" :value="dataset.key">{{ dataset.label }}</option>
          </select>
        </div>

        <div class="form-field">
          <label class="form-label">{{ t("fileLabel") }}</label>
          <input class="form-input" type="file" accept=".xlsx,.xls,.csv" @change="handleFileSelect" />
          <p v-if="fileName" class="mt-1 text-xs text-gray-500">{{ t("selectedFile") }}: {{ fileName }}</p>
        </div>
      </div>
    </SectionPanel>

    <SectionPanel :title="t('step2Title')" panel-class="surface-card rounded-2xl p-5">
      <div v-if="!columns.length" class="card-empty">{{ t("mappingEmpty") }}</div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr>
              <th class="table-header">{{ t("excelColumn") }}</th>
              <th class="table-header">{{ t("systemField") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="col in columns" :key="col">
              <td class="table-cell">{{ col }}</td>
              <td class="table-cell">
                <select v-model="columnMapping[col]" class="form-input">
                  <option value="">{{ t("selectOption") }}</option>
                  <option v-for="field in selectedFieldOptions" :key="field.value" :value="field.value">{{ field.label }}</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SectionPanel>

    <SectionPanel :title="t('step3Title')" panel-class="surface-card rounded-2xl p-5">
      <div v-if="!previewRows.length" class="card-empty">{{ t("previewEmpty") }}</div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr>
              <th v-for="head in columns" :key="head" class="table-header">{{ head }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in previewRows" :key="rowIndex">
              <td v-for="head in columns" :key="`${rowIndex}-${head}`" class="table-cell">
                {{ row[head] ?? '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="importMessage" class="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
        {{ importMessage }}
      </p>
    </SectionPanel>

    <div class="flex justify-end gap-2">
      <button class="btn btn-outline" type="button" @click="cancel">{{ t("cancel") }}</button>
      <button class="btn btn-primary" type="button" :disabled="!canImport" @click="importData">{{ t("importAction") }}</button>
    </div>
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, reactive, ref, unref, watch } from "vue";
import { useRouter } from "vue-router";
import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";

const router = useRouter();
const appPinia = getAppPinia();
const authStore = useAuthStore(appPinia);

const copy = {
  tr: {
    title: "Veri İçe Aktarma",
    subtitle: "Excel/CSV dosyalarını eşleştirerek toplu veri yükleyin.",
    clear: "Temizle",
    step1Title: "1. Dosya Seç",
    step2Title: "2. Eşleştirme",
    step3Title: "3. Önizleme",
    datasetLabel: "Veri Kümesi",
    fileLabel: "Excel Dosyası",
    selectedFile: "Seçilen dosya",
    mappingEmpty: "Dosya seçildikten sonra kolonlar burada listelenir.",
    excelColumn: "Excel Kolonu",
    systemField: "Sistem Alanı",
    selectOption: "-- Seçiniz --",
    previewEmpty: "Önizleme verisi bulunamadı.",
    cancel: "İptal",
    importAction: "İçe Aktar",
    columnsMapped: "kolon eşleştirildi",
    importQueued: "İçe aktarma kuyruğa alındı.",
    xlsPreviewWarning:
      "XLS/XLSX önizleme tarayıcı tarafında sınırlı. Eşleştirmeyi tamamlayıp içe aktarma işlemini başlatabilirsiniz.",
    rowsPrefix: "Satır",
    policyLabel: "Poliçeler",
    offerLabel: "Teklifler",
    customerLabel: "Müşteriler",
    policyNo: "Poliçe No",
    customer: "Müşteri",
    branch: "Branş",
    grossPremium: "Brüt Prim",
    status: "Durum",
    offerNo: "Teklif No",
    insuranceCompany: "Sigorta Şirketi",
    fullName: "Ad Soyad",
    taxId: "Kimlik/Vergi No",
    mobilePhone: "Telefon",
    email: "E-posta",
    customerType: "Müşteri Tipi",
    csvCustomerHint: ["musteri", "customer"],
    csvOfferHint: ["teklif", "offer"],
    csvPolicyHint: ["polic", "poli"],
  },
  en: {
    title: "Data Import",
    subtitle: "Bulk-load data by matching Excel/CSV columns.",
    clear: "Clear",
    step1Title: "1. Choose File",
    step2Title: "2. Map Fields",
    step3Title: "3. Preview",
    datasetLabel: "Dataset",
    fileLabel: "Spreadsheet File",
    selectedFile: "Selected file",
    mappingEmpty: "Columns will appear here after a file is selected.",
    excelColumn: "Excel Column",
    systemField: "System Field",
    selectOption: "-- Select --",
    previewEmpty: "No preview data found.",
    cancel: "Cancel",
    importAction: "Import",
    columnsMapped: "columns mapped",
    importQueued: "Import queued.",
    xlsPreviewWarning:
      "XLS/XLSX preview is limited in the browser. Finish the mapping and start the import flow.",
    rowsPrefix: "Row",
    policyLabel: "Policies",
    offerLabel: "Offers",
    customerLabel: "Customers",
    policyNo: "Policy No",
    customer: "Customer",
    branch: "Branch",
    grossPremium: "Gross Premium",
    status: "Status",
    offerNo: "Offer No",
    insuranceCompany: "Insurance Company",
    fullName: "Full Name",
    taxId: "ID/Tax No",
    mobilePhone: "Phone",
    email: "Email",
    customerType: "Customer Type",
    csvCustomerHint: ["customer", "client"],
    csvOfferHint: ["offer", "quote"],
    csvPolicyHint: ["policy"],
  },
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

function label(key) {
  return t(key);
}

const activeLocale = computed(() => unref(authStore.locale) || "tr");

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

const localizedDatasets = computed(() =>
  datasets.map((dataset) => ({
    key: dataset.key,
    label: label(dataset.labelKey),
  })),
);

const selectedDataset = ref(datasets[0].key);
const fileName = ref("");
const columns = ref([]);
const previewRows = ref([]);
const importMessage = ref("");
const columnMapping = reactive({});

const mappedColumnCount = computed(() => {
  return columns.value.filter((col) => String(columnMapping[col] || "").trim() !== "").length;
});

const canImport = computed(() => {
  return Boolean(fileName.value && columns.value.length && mappedColumnCount.value > 0);
});

const selectedFieldOptions = computed(() => {
  const dataset = datasets.find((item) => item.key === selectedDataset.value);
  return (dataset?.fields || []).map((field) => ({
    value: field.value,
    label: label(field.labelKey),
  }));
});

watch(selectedDataset, () => {
  columns.value.forEach((col) => {
    columnMapping[col] = "";
  });
  importMessage.value = "";
});

function resetAll() {
  fileName.value = "";
  columns.value = [];
  previewRows.value = [];
  importMessage.value = "";
  Object.keys(columnMapping).forEach((key) => delete columnMapping[key]);
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
</script>
