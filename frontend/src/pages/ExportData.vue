<template>
  <section role="main" class="page-shell space-y-4">
    <div class="detail-topbar">
      <div>
        <h1 class="detail-title">Veri Disa Aktarma</h1>
        <p class="detail-subtitle">Raporlama ve analiz icin sistem verilerini farkli formatlarda indirin.</p>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-outline btn-sm" type="button" @click="resetForm">Sifirla</button>
      </div>
    </div>

    <DetailCard title="1. Veri Kumesi ve Format">
      <div class="grid gap-4 md:grid-cols-3">
        <div class="form-field">
          <label class="form-label">Veri Kumesi</label>
          <select v-model="form.screen" class="form-input">
            <option v-for="option in screenOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </div>

        <div class="form-field">
          <label class="form-label">Format</label>
          <select v-model="form.format" class="form-input">
            <option value="xlsx">Excel (XLSX)</option>
            <option value="pdf">PDF</option>
            <option value="csv">CSV</option>
          </select>
        </div>

        <div class="form-field">
          <label class="form-label">Dosya Adi</label>
          <input v-model="form.filename" class="form-input" type="text" placeholder="ornek: policy_export" />
        </div>
      </div>
    </DetailCard>

    <DetailCard title="2. Filtreler">
      <div class="grid gap-4 md:grid-cols-3">
        <div class="form-field">
          <label class="form-label">Baslangic Tarihi</label>
          <input v-model="form.startDate" class="form-input" type="date" />
        </div>

        <div class="form-field">
          <label class="form-label">Bitis Tarihi</label>
          <input v-model="form.endDate" class="form-input" type="date" />
        </div>

        <div class="form-field">
          <label class="form-label">Durum</label>
          <select v-model="form.status" class="form-input">
            <option value="">Tum Durumlar</option>
            <option value="Draft">Draft</option>
            <option value="Active">Active</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>
    </DetailCard>

    <DetailCard title="3. Son Islemler">
      <div v-if="!historyRows.length" class="card-empty">Henuz export kaydi bulunmuyor.</div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr>
              <th class="table-header">Tarih</th>
              <th class="table-header">Veri Kumesi</th>
              <th class="table-header">Format</th>
              <th class="table-header">Dosya</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in historyRows" :key="row.id">
              <td class="table-cell">{{ row.date }}</td>
              <td class="table-cell">{{ row.screenLabel }}</td>
              <td class="table-cell">{{ row.format.toUpperCase() }}</td>
              <td class="table-cell">{{ row.filename }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </DetailCard>

    <div class="flex justify-end gap-2">
      <button class="btn btn-outline" type="button" @click="cancel">Iptal</button>
      <button class="btn btn-primary" type="button" @click="downloadExport">Disa Aktar</button>
    </div>

    <p v-if="message" class="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
      {{ message }}
    </p>
  </section>
</template>

<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import DetailCard from "../components/ui/DetailCard.vue";

const router = useRouter();

const screenOptions = [
  { value: "dashboard", label: "Dashboard" },
  { value: "policy_list", label: "Policeler" },
  { value: "offer_list", label: "Teklifler" },
  { value: "customer_list", label: "Musteriler" },
  { value: "claims_board", label: "Hasarlar" },
  { value: "payments_board", label: "Odemeler" },
  { value: "renewals_board", label: "Yenilemeler" },
];

const form = reactive({
  screen: "policy_list",
  format: "xlsx",
  filename: "",
  startDate: "",
  endDate: "",
  status: "",
});

const message = ref("");
const historyRows = ref([]);

function buildExportUrl() {
  const params = new URLSearchParams({
    screen: form.screen,
    format: form.format,
  });

  if (form.filename) params.set("filename", form.filename);
  if (form.startDate) params.set("start_date", form.startDate);
  if (form.endDate) params.set("end_date", form.endDate);
  if (form.status) params.set("status", form.status);

  return `/api/method/acentem_takipte.acentem_takipte.api.list_exports.download_export?${params.toString()}`;
}

function addHistory() {
  const screenLabel = screenOptions.find((option) => option.value === form.screen)?.label || form.screen;
  const filename = form.filename || `${form.screen}_${new Date().toISOString().slice(0, 10)}`;
  historyRows.value = [
    {
      id: `${Date.now()}`,
      date: new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date()),
      screenLabel,
      format: form.format,
      filename,
    },
    ...historyRows.value,
  ].slice(0, 8);
}

function downloadExport() {
  const url = buildExportUrl();
  window.open(url, "_blank", "noopener,noreferrer");
  addHistory();
  message.value = "Export islemi baslatildi.";
}

function resetForm() {
  form.screen = "policy_list";
  form.format = "xlsx";
  form.filename = "";
  form.startDate = "";
  form.endDate = "";
  form.status = "";
  message.value = "";
}

function cancel() {
  router.push({ name: "dashboard" });
}
</script>
