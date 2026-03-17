<template>
  <section class="page-shell space-y-4">
    <div class="detail-topbar">
      <div>
        <p class="detail-breadcrumb">{{ t("breadcrumb") }}</p>
        <h1 class="detail-title">
          {{ payment.payment_no || payment.name || name }}
          <StatusBadge domain="payment" :status="paymentStatus" />
        </h1>
        <div class="mt-1.5 flex items-center gap-2">
          <span class="copy-tag">{{ payment.name || name }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-outline btn-sm" @click="router.push('/payments')">{{ t("back") }}</button>
        <button class="btn btn-primary btn-sm" type="button">{{ t("approve") }}</button>
      </div>
    </div>

    <HeroStrip :cells="heroCells" />

    <div class="detail-body">
      <div class="detail-main">
        <DetailCard :title="t('paymentInfo')">
          <FieldGroup :fields="paymentFields" :cols="2" />
        </DetailCard>

        <DetailCard :title="t('policy')">
          <div class="cursor-pointer rounded-lg bg-gray-50 p-3 hover:bg-gray-100" @click="openPolicy">
            <p class="text-sm font-medium text-gray-900">{{ payment.policy || '-' }}</p>
            <p class="mt-0.5 text-xs text-gray-400">{{ payment.payment_direction || '-' }}</p>
          </div>
        </DetailCard>

        <DetailCard :title="t('history')">
          <div v-if="!installments.length" class="card-empty">Tahsilat kaydi bulunamadi.</div>
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
              <tr v-for="inst in installments" :key="inst.name">
                <td class="table-cell">{{ formatDate(inst.due_date || inst.creation) }}</td>
                <td class="table-cell">{{ inst.name }}</td>
                <td class="table-cell text-right">{{ formatCurrency(inst.amount_try) }}</td>
                <td class="table-cell">{{ inst.status || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </DetailCard>

        <DetailCard title="Dekont/Fatura">
          <template #action>
            <button class="btn btn-sm" type="button" @click="openPolicy">Yukle</button>
          </template>
          <div v-if="!documents.length" class="card-empty">Dekont veya fatura yuklenmemis.</div>
          <div v-else class="space-y-2">
            <div v-for="doc in documents" :key="doc.name" class="timeline-item">
              <div class="tl-dot" />
              <div>
                <p class="tl-text">{{ doc.file_name || doc.name }}</p>
                <p class="tl-time">{{ formatDate(doc.creation) }}</p>
              </div>
            </div>
          </div>
        </DetailCard>
      </div>

      <aside class="detail-sidebar">
        <div>
          <p class="section-title">{{ t("customer") }}</p>
          <div class="flex items-center gap-2.5">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-medium text-brand-600">
              {{ initials(payment.customer) }}
            </div>
            <p class="text-sm font-medium text-gray-900">{{ payment.customer || '-' }}</p>
          </div>
        </div>

        <div class="divider" />

        <div>
          <p class="section-title">Odeme Detaylari</p>
          <FieldGroup :fields="sidebarPaymentFields" :cols="1" />
        </div>

        <div class="divider" />

        <div>
          <p class="section-title">Muhasebe Kodu</p>
          <FieldGroup :fields="accountingFields" :cols="1" />
        </div>

        <div class="divider" />

        <div>
          <p class="section-title">Kayit Meta</p>
          <FieldGroup :fields="recordFields" :cols="1" />
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";
import StatusBadge from "@/components/ui/StatusBadge.vue";
import HeroStrip from "@/components/ui/HeroStrip.vue";
import DetailCard from "@/components/ui/DetailCard.vue";
import FieldGroup from "@/components/ui/FieldGroup.vue";

const props = defineProps({ name: { type: String, required: true } });
const name = computed(() => props.name || "");
const router = useRouter();

const copy = {
  tr: {
    breadcrumb: "Operasyonlar / Odemeler",
    back: "Listeye Don",
    approve: "Odemeyi Onayla",
    paymentInfo: "Odeme Bilgileri",
    installments: "Taksit Plani",
    history: "Odeme Gecmisi",
    updated: "Guncellendi",
    created: "Olusturuldu",
    summary: "Odeme Ozeti",
    total: "Toplam",
    paid: "Odenen",
    remaining: "Kalan",
    count: "Taksit",
    policy: "Ilgili Police",
    customer: "Musteri",
  },
  en: {
    breadcrumb: "Operations / Payments",
    back: "Back to list",
    approve: "Approve Payment",
    paymentInfo: "Payment Info",
    installments: "Installments",
    history: "Payment History",
    updated: "Updated",
    created: "Created",
    summary: "Payment Summary",
    total: "Total",
    paid: "Paid",
    remaining: "Remaining",
    count: "Installments",
    policy: "Related Policy",
    customer: "Customer",
  },
};

function t(key) {
  return copy.tr[key] || copy.en[key] || key;
}

const paymentResource = createResource({ url: "frappe.client.get", auto: false });
const installmentResource = createResource({ url: "frappe.client.get_list", auto: false });
const documentResource = createResource({ url: "frappe.client.get_list", auto: false });

const payment = computed(() => paymentResource.data || {});
const installments = computed(() => (Array.isArray(installmentResource.data) ? installmentResource.data : []));
const documents = computed(() => (Array.isArray(documentResource.data) ? documentResource.data : []));

const paidAmount = computed(() => installments.value.filter((inst) => String(inst.status || "").toLowerCase() === "paid").reduce((sum, inst) => sum + Number(inst.amount_try || 0), 0));
const remainingAmount = computed(() => Number(payment.value.amount_try || 0) - paidAmount.value);

const paymentStatus = computed(() => {
  const raw = String(payment.value.status || payment.value.payment_status || "").trim();
  if (raw) return raw;
  return remainingAmount.value > 0 ? "Outstanding" : "Paid";
});

const isOverdue = computed(() => {
  const due = String(payment.value.payment_date || "").trim();
  if (!due) return false;
  const dueTime = new Date(due).getTime();
  if (Number.isNaN(dueTime)) return false;
  return dueTime < Date.now() && remainingAmount.value > 0;
});

const heroCells = computed(() => [
  { label: "Odeme No", value: payment.value.payment_no || payment.value.name || "-", variant: "default" },
  { label: "Vade Tarihi", value: formatDate(payment.value.due_date || payment.value.payment_date), variant: "default" },
  { label: "Tutar", value: formatCurrency(payment.value.amount || payment.value.amount_try), variant: "lg" },
  { label: "Durum", value: paymentStatus.value, variant: "accent" },
]);

const paymentFields = computed(() => [
  { label: "Odeme Turu", value: payment.value.payment_direction || "-" },
  { label: "Tutar", value: formatCurrency(payment.value.amount_try), variant: "lg" },
  { label: "Vade", value: formatDate(payment.value.payment_date) },
  { label: "Odeme Tarihi", value: formatDate(payment.value.payment_date) },
  { label: "Aciklama", value: payment.value.payment_purpose || "-", span: 2 },
]);

const sidebarPaymentFields = computed(() => [
  { label: "Toplam", value: formatCurrency(payment.value.amount || payment.value.amount_try) },
  { label: "Odenen", value: formatCurrency(paidAmount.value) },
  { label: "Kalan", value: formatCurrency(remainingAmount.value) },
  { label: "Taksit", value: String(installments.value.length || "-") },
]);

const accountingFields = computed(() => [
  { label: "Hesap Kodu", value: payment.value.account_code || payment.value.cost_center || "-" },
  { label: "Muhasebe Durumu", value: payment.value.accounting_status || "-" },
]);

const recordFields = computed(() => [
  { label: "Olusturan", value: payment.value.owner || "-" },
  { label: "Olusturma", value: formatDate(payment.value.creation) },
  { label: "Guncelleyen", value: payment.value.modified_by || "-" },
  { label: "Guncelleme", value: formatDate(payment.value.modified) },
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
  if (!payment.value.policy) return;
  router.push(`/policies/${payment.value.policy}`);
}

function reload() {
  paymentResource.params = { doctype: "AT Payment", name: name.value };
  paymentResource.reload();

  installmentResource.params = {
    doctype: "AT Payment Installment",
    fields: ["name", "status", "due_date", "amount_try"],
    filters: { payment: name.value },
    order_by: "due_date asc",
    limit_page_length: 200,
  };
  installmentResource.reload();

  documentResource.params = {
    doctype: "File",
    fields: ["name", "file_name", "creation"],
    filters: { attached_to_doctype: "AT Payment", attached_to_name: name.value },
    order_by: "creation desc",
    limit_page_length: 50,
  };
  documentResource.reload();
}

onMounted(reload);
</script>
