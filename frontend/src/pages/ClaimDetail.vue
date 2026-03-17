<template>
  <section class="page-shell space-y-4">
    <div class="detail-topbar">
      <div>
        <p class="detail-breadcrumb">{{ t("breadcrumb") }}</p>
        <h1 class="detail-title">
          {{ claim.claim_no || claim.name || name }}
          <StatusBadge domain="claim" :status="claimStatus" />
        </h1>
        <div class="mt-1.5 flex items-center gap-2">
          <span class="copy-tag">{{ claim.name || name }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-outline btn-sm" @click="router.push('/claims')">{{ t("back") }}</button>
        <button class="btn btn-primary btn-sm" type="button">{{ t("action") }}</button>
      </div>
    </div>

    <HeroStrip :cells="heroCells" />

    <div class="detail-body">
      <div class="detail-main">
        <DetailCard :title="t('process')">
          <StepBar :steps="claimSteps" class="mb-4" />
          <FieldGroup :fields="processFields" :cols="4" />
        </DetailCard>

        <DetailCard :title="t('details')">
          <FieldGroup :fields="detailFields" :cols="2" />
        </DetailCard>

        <DetailCard :title="t('policy')">
          <div class="cursor-pointer rounded-lg bg-gray-50 p-3 hover:bg-gray-100" @click="openPolicy">
            <p class="text-sm font-medium text-gray-900">{{ claim.policy || '-' }}</p>
            <p class="mt-0.5 text-xs text-gray-400">{{ claim.branch || '-' }}</p>
          </div>
        </DetailCard>

        <DetailCard :title="t('documents')">
          <template #action>
            <button class="btn btn-sm" type="button" @click="openPolicy">Yükle</button>
          </template>
          <p v-if="!documents.length" class="card-empty">{{ t("noDocuments") }}</p>
          <div v-else>
            <div v-for="doc in documents" :key="doc.name" class="timeline-item">
              <div class="tl-dot" />
              <div>
                <p class="tl-text">{{ doc.file_name || doc.name }}</p>
                <p class="tl-time">{{ formatDate(doc.creation) }}</p>
              </div>
            </div>
          </div>
        </DetailCard>

        <DetailCard title="Ödeme Geçmişi">
          <div v-if="!payments.length" class="card-empty">Ödeme kaydı bulunamadı.</div>
          <table v-else class="min-w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="table-header">Tarih</th>
                <th class="table-header">Referans</th>
                <th class="table-header text-right">Tutar</th>
                <th class="table-header">Durum</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="row in payments" :key="row.name">
                <td class="table-cell">{{ formatDate(row.payment_date || row.creation) }}</td>
                <td class="table-cell">{{ row.payment_no || row.name }}</td>
                <td class="table-cell text-right">{{ formatCurrency(row.amount_try || row.amount || 0) }}</td>
                <td class="table-cell">{{ row.status || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </DetailCard>

        <DetailCard :title="t('timeline')">
          <div class="mb-4">
            <p class="section-title">Notlar</p>
            <p class="text-sm text-gray-700">{{ claim.rejection_reason || claim.notes || '-' }}</p>
          </div>
          <div>
            <div class="timeline-item">
              <div class="tl-dot tl-dot-active" />
              <div>
                <p class="tl-text">{{ t("updated") }}</p>
                <p class="tl-time">{{ formatDate(claim.modified) }}</p>
              </div>
            </div>
            <div class="timeline-item">
              <div class="tl-dot" />
              <div>
                <p class="tl-text">{{ t("created") }}</p>
                <p class="tl-time">{{ formatDate(claim.creation) }}</p>
              </div>
            </div>
          </div>
        </DetailCard>
      </div>

      <aside class="detail-sidebar">
        <div>
          <p class="section-title">İlgili Kişiler</p>
          <FieldGroup :fields="peopleFields" :cols="1" />
        </div>

        <div class="divider" />

        <div>
          <p class="section-title">Durum Bilgisi</p>
          <FieldGroup :fields="statusFields" :cols="1" />
        </div>

        <div class="divider" />

        <div>
          <p class="section-title">Kayıt Meta</p>
          <FieldGroup :fields="recordMetaFields" :cols="1" />
          <button class="mt-3 btn btn-full btn-sm" @click="openCustomer">{{ t("customerRecord") }}</button>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import StatusBadge from "@/components/ui/StatusBadge.vue";
import HeroStrip from "@/components/ui/HeroStrip.vue";
import DetailCard from "@/components/ui/DetailCard.vue";
import FieldGroup from "@/components/ui/FieldGroup.vue";
import StepBar from "@/components/ui/StepBar.vue";

const props = defineProps({ name: { type: String, required: true } });
const name = computed(() => props.name || "");
const router = useRouter();

const copy = {
  tr: {
    breadcrumb: "Operasyonlar / Hasarlar",
    back: "Listeye Don",
    action: "Islem Yap",
    process: "Hasar Sureci",
    details: "Hasar Detaylari",
    documents: "Belgeler",
    timeline: "Zaman Tuneli",
    noDocuments: "Belge eklenmemis.",
    updated: "Guncellendi",
    created: "Olusturuldu",
    policy: "Ilgili Police",
    customer: "Musteri",
    customerRecord: "Musteri Kaydi",
    summary: "Hasar Ozeti",
    approved: "Onaylanan",
    paid: "Odenen",
    remaining: "Kalan",
    days: "Kalan Gun",
  },
  en: {
    breadcrumb: "Operations / Claims",
    back: "Back to list",
    action: "Take Action",
    process: "Claim Process",
    details: "Claim Details",
    documents: "Documents",
    timeline: "Timeline",
    noDocuments: "No documents.",
    updated: "Updated",
    created: "Created",
    policy: "Related Policy",
    customer: "Customer",
    customerRecord: "Customer Record",
    summary: "Claim Summary",
    approved: "Approved",
    paid: "Paid",
    remaining: "Remaining",
    days: "Days Left",
  },
};

function t(key) {
  return copy.tr[key] || copy.en[key] || key;
}

const claimResource = createResource({ url: "frappe.client.get", auto: false });
const claimFileResource = createResource({ url: "frappe.client.get_list", auto: false });
const claimPaymentsResource = createResource({ url: "frappe.client.get_list", auto: false });

const claim = computed(() => claimResource.data || {});
const documents = computed(() => (Array.isArray(claimFileResource.data) ? claimFileResource.data : []));
const payments = computed(() => (Array.isArray(claimPaymentsResource.data) ? claimPaymentsResource.data : []));
const claimStatus = computed(() => String(claim.value.claim_status || "Draft"));

const remainingDays = computed(() => {
  const due = String(claim.value.next_follow_up_on || "").trim();
  if (!due) return null;
  const ms = new Date(due).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
});
const remainingDaysDisplay = computed(() => (remainingDays.value == null || Number.isNaN(remainingDays.value) ? "-" : String(remainingDays.value)));
const remainingAmount = computed(() => Number(claim.value.approved_amount || 0) - Number(claim.value.paid_amount || 0));

const heroCells = computed(() => [
  { label: "Dosya No", value: claim.value.claim_no || claim.value.name || "-", variant: "default" },
  { label: "Hasar Tarihi", value: formatDate(claim.value.loss_date || claim.value.creation), variant: "default" },
  { label: "Rezerv", value: formatCurrency(claim.value.reserve_amount || claim.value.approved_amount), variant: "lg" },
  { label: "Ödenen", value: formatCurrency(claim.value.paid_amount), variant: "accent" },
]);

const processFields = computed(() => [
  { label: "Hasar No", value: claim.value.claim_no || claim.value.name || "-", variant: "mono" },
  { label: "Hasar Tarihi", value: formatDate(claim.value.creation) },
  { label: "Bildirim", value: formatDate(claim.value.next_follow_up_on) },
  { label: "Tutar", value: formatCurrency(claim.value.approved_amount), variant: "lg" },
]);

const detailFields = computed(() => [
  { label: "Hasar Turu", value: claim.value.claim_type || "-" },
  { label: "Hasar Yeri", value: claim.value.claim_location || "-" },
  { label: "Aciklama", value: claim.value.rejection_reason || "-", span: 2 },
]);

const claimSteps = computed(() => {
  const status = String(claim.value.claim_status || "").toLowerCase();
  const currentStepIs = (step) => {
    if (step === "expertise") return ["under review", "expertise", "inspection"].includes(status);
    if (step === "approval") return ["approved", "onay", "approval"].includes(status);
    if (step === "payment") return ["paid", "payment", "closed"].includes(status);
    return false;
  };

  const expertiseCurrent = currentStepIs("expertise");
  const approvalCurrent = currentStepIs("approval");
  const paymentCurrent = currentStepIs("payment");

  return [
    { label: "Bildirim", state: "done" },
    { label: "Ekspertiz", state: expertiseCurrent ? "current" : "done" },
    { label: "Onay", state: approvalCurrent ? "current" : paymentCurrent ? "done" : "pending" },
    { label: "Ödeme", state: paymentCurrent ? "current" : "pending" },
  ];
});

const peopleFields = computed(() => [
  { label: "Müşteri", value: claim.value.customer || "-" },
  { label: "Eksper", value: claim.value.surveyor || claim.value.expert || "-" },
]);

const statusFields = computed(() => [
  { label: "Durum", value: claim.value.claim_status || "-" },
  { label: "Onaylanan", value: formatCurrency(claim.value.approved_amount) },
  { label: "Ödenen", value: formatCurrency(claim.value.paid_amount) },
  { label: "Kalan", value: formatCurrency(remainingAmount.value) },
]);

const recordMetaFields = computed(() => [
  { label: "Oluşturan", value: claim.value.owner || "-" },
  { label: "Oluşturulma", value: formatDate(claim.value.creation) },
  { label: "Güncelleyen", value: claim.value.modified_by || "-" },
  { label: "Güncelleme", value: formatDate(claim.value.modified) },
]);

function initials(nameValue = "") {
  return String(nameValue || "").trim().split(/\s+/).slice(0, 2).map((chunk) => chunk[0] || "").join("").toUpperCase() || "AT";
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function openPolicy() {
  if (!claim.value.policy) return;
  router.push(`/policies/${claim.value.policy}`);
}

function openCustomer() {
  if (!claim.value.customer) return;
  router.push(`/customers/${claim.value.customer}`);
}

function reload() {
  claimResource.params = { doctype: "AT Claim", name: name.value };
  claimResource.reload();

  claimFileResource.params = {
    doctype: "File",
    fields: ["name", "file_name", "creation"],
    filters: { attached_to_doctype: "AT Claim", attached_to_name: name.value },
    order_by: "creation desc",
    limit_page_length: 20,
  };
  claimFileResource.reload();

  claimPaymentsResource.params = {
    doctype: "AT Payment",
    fields: ["name", "payment_no", "payment_date", "amount", "amount_try", "status", "creation"],
    filters: { claim: name.value },
    order_by: "creation desc",
    limit_page_length: 20,
  };
  claimPaymentsResource.reload();
}

onMounted(reload);
</script>
