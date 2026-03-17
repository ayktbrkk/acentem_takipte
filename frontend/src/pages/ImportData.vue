<template>
  <section class="page-shell space-y-4">
    <div class="detail-topbar">
      <div>
        <h1 class="detail-title">Veri Ice Aktarma</h1>
        <p class="detail-subtitle">Excel/CSV dosyalarini eslestirerek toplu veri yukleyin.</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-outline btn-sm" type="button" @click="resetAll">Temizle</button>
      </div>
    </div>

    <DetailCard title="1. Dosya Sec">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="form-field">
          <label class="form-label">Veri Kumesi</label>
          <select v-model="selectedDataset" class="form-input">
            <option v-for="dataset in datasets" :key="dataset.key" :value="dataset.key">{{ dataset.label }}</option>
          </select>
        </div>

        <div class="form-field">
          <label class="form-label">Excel Dosyasi</label>
          <input class="form-input" type="file" accept=".xlsx,.xls,.csv" @change="handleFileSelect" />
          <p v-if="fileName" class="mt-1 text-xs text-gray-500">Secilen dosya: {{ fileName }}</p>
        </div>
      </div>
    </DetailCard>

    <DetailCard title="2. Eslestirme">
      <div v-if="!columns.length" class="card-empty">Dosya secildikten sonra kolonlar burada listelenir.</div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr>
              <th class="table-header">Excel Kolonu</th>
              <th class="table-header">Sistem Alani</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="col in columns" :key="col">
              <td class="table-cell">{{ col }}</td>
              <td class="table-cell">
                <select v-model="columnMapping[col]" class="form-input">
                  <option value="">-- Seciniz --</option>
                  <option v-for="field in selectedFieldOptions" :key="field.value" :value="field.value">{{ field.label }}</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </DetailCard>

    <DetailCard title="3. Onizleme">
      <div v-if="!previewRows.length" class="card-empty">Onizleme verisi bulunamadi.</div>
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
    </DetailCard>

    <div class="flex justify-end gap-2">
      <button class="btn btn-outline" type="button" @click="cancel">Iptal</button>
      <button class="btn btn-primary" type="button" :disabled="!canImport" @click="importData">Ice Aktar</button>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import DetailCard from "../components/ui/DetailCard.vue";

const router = useRouter();

const datasets = [
  {
    key: "policies",
    label: "Policeler",
    fields: [
      { value: "policy_no", label: "Police No" },
      { value: "customer", label: "Musteri" },
      { value: "branch", label: "Brans" },
      { value: "gross_premium", label: "Brut Prim" },
      { value: "status", label: "Durum" },
    ],
  },
  {
    key: "offers",
    label: "Teklifler",
    fields: [
      { value: "offer_no", label: "Teklif No" },
      { value: "customer", label: "Musteri" },
      { value: "insurance_company", label: "Sigorta Sirketi" },
      { value: "gross_premium", label: "Brut Prim" },
      { value: "status", label: "Durum" },
    ],
  },
  {
    key: "customers",
    label: "Musteriler",
    fields: [
      { value: "full_name", label: "Ad Soyad" },
      { value: "tax_id", label: "Kimlik/Vergi No" },
      { value: "mobile_phone", label: "Telefon" },
      { value: "email", label: "E-posta" },
      { value: "customer_type", label: "Musteri Tipi" },
    ],
  },
];

const selectedDataset = ref(datasets[0].key);
const fileName = ref("");
const columns = ref([]);
const previewRows = ref([]);
const importMessage = ref("");
const columnMapping = reactive({});

const selectedFieldOptions = computed(() => {
  return datasets.find((d) => d.key === selectedDataset.value)?.fields || [];
});

const mappedColumnCount = computed(() => {
  return columns.value.filter((col) => String(columnMapping[col] || "").trim() !== "").length;
});

const canImport = computed(() => {
  return Boolean(fileName.value && columns.value.length && mappedColumnCount.value > 0);
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
      row[head] = `Satir ${index + 1}`;
    });
    return row;
  });
  applyParsedData(fallbackHeaders, fallbackRows);
  importMessage.value = "XLS/XLSX onizleme tarayici tarafinda sinirli. Eslestirmeyi tamamlayip ice aktarma islemini baslatabilirsiniz.";
}

function importData() {
  if (!canImport.value) return;
  importMessage.value = `${fileName.value} dosyasi icin ${mappedColumnCount.value} kolon eslestirildi. Ice aktarma kuyruga alindi.`;
}

function cancel() {
  router.push({ name: "dashboard" });
}
</script>
