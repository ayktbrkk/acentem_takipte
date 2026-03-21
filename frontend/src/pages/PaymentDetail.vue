<template>
  <section class="page-shell space-y-4">
    <div class="detail-topbar">
      <div>
        <p class="detail-breadcrumb">{{ t("breadcrumb") }}</p>
        <h1 class="detail-title">
          {{ payment.payment_no || payment.name || name }}
          <StatusBadge domain="payment" :status="paymentStatus" />
        </h1>
        <div class="mt-1.5 flex flex-wrap items-center gap-2">
          <span class="copy-tag">{{ payment.name || name }}</span>
          <span class="copy-tag">{{ payment.payment_direction || "-" }}</span>
          <span class="copy-tag">{{ payment.payment_purpose || "-" }}</span>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn btn-outline btn-sm" type="button" @click="backToList">{{ t("back") }}</button>
        <button class="btn btn-sm" type="button" @click="collectPayment">{{ t("collectPayment") }}</button>
        <button class="btn btn-sm" type="button" @click="addReceipt">{{ t("addReceipt") }}</button>
        <button class="btn btn-primary btn-sm" type="button" @click="sendReminder">{{ t("sendReminder") }}</button>
      </div>
    </div>

    <HeroStrip :cells="heroCells" />

    <div class="detail-body">
      <div class="detail-main">
        <SectionPanel :title="t('paymentInfo')">
          <FieldGroup :fields="paymentFields" :cols="2" />
        </SectionPanel>

        <SectionPanel :title="t('financialSummary')">
          <FieldGroup :fields="financialFields" :cols="2" />
        </SectionPanel>

        <SectionPanel :title="t('paymentPlan')">
          <div v-if="installments.length === 0" class="card-empty">{{ t("noInstallments") }}</div>
          <table v-else class="min-w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="table-header">{{ t("installmentNo") }}</th>
                <th class="table-header">{{ t("dueDate") }}</th>
                <th class="table-header">{{ t("paidOn") }}</th>
                <th class="table-header text-right">{{ t("amount") }}</th>
                <th class="table-header">{{ t("status") }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="row in installments" :key="row.name">
                <td class="table-cell">{{ installmentLabel(row) }}</td>
                <td class="table-cell">{{ formatDate(row.due_date) }}</td>
                <td class="table-cell">{{ formatDate(row.paid_on) }}</td>
                <td class="table-cell text-right">{{ formatCurrency(row.amount_try || row.amount) }}</td>
                <td class="table-cell">{{ row.status || "-" }}</td>
              </tr>
            </tbody>
          </table>
        </SectionPanel>

        <SectionPanel :title="t('documents')">
          <div v-if="documents.length === 0" class="card-empty">{{ t("noDocuments") }}</div>
          <div v-else class="space-y-2">
            <div v-for="doc in documents" :key="doc.name" class="timeline-item">
              <div class="tl-dot" />
              <div>
                <p class="tl-text">{{ doc.file_name || doc.name }}</p>
                <p class="tl-time">{{ formatDate(doc.creation) }}</p>
              </div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel :title="t('timeline')">
          <div class="timeline-item">
            <div class="tl-dot tl-dot-active" />
            <div>
              <p class="tl-text">{{ t("updated") }}</p>
              <p class="tl-time">{{ formatDate(payment.modified) }}</p>
            </div>
          </div>
          <div class="timeline-item">
            <div class="tl-dot" />
            <div>
              <p class="tl-text">{{ t("created") }}</p>
              <p class="tl-time">{{ formatDate(payment.creation) }}</p>
            </div>
          </div>
        </SectionPanel>
      </div>

      <aside class="detail-sidebar space-y-4">
        <SectionPanel :title="t('customer')">
          <button
            class="w-full rounded-lg border border-gray-200 bg-white p-3 text-left transition hover:border-brand-200 hover:bg-brand-50"
            type="button"
            :disabled="!payment.customer"
            @click="openCustomer"
          >
            <p class="text-sm font-medium text-gray-900">{{ payment.customer || "-" }}</p>
            <p class="mt-0.5 text-xs text-gray-400">{{ t("openCustomer") }}</p>
          </button>
        </SectionPanel>

        <SectionPanel :title="t('linkedRecords')">
          <FieldGroup :fields="linkedFields" :cols="1" />
        </SectionPanel>

        <SectionPanel :title="t('recordMeta')">
          <FieldGroup :fields="recordFields" :cols="1" />
        </SectionPanel>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, unref } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";

import StatusBadge from "@/components/ui/StatusBadge.vue";
import HeroStrip from "@/components/ui/HeroStrip.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import FieldGroup from "@/components/ui/FieldGroup.vue";

const props = defineProps({ name: { type: String, required: true } });
const name = computed(() => props.name || "");
const router = useRouter();

const copy = {
  tr: {
    breadcrumb: "Operasyonlar / Ödemeler",
    back: "Listeye Dön",
    collectPayment: "Tahsilat Kaydet",
    addReceipt: "Dekont Ekle",
    sendReminder: "Hatırlatma Gönder",
    paymentInfo: "Ödeme Bilgileri",
    financialSummary: "Finansal Özet",
    paymentPlan: "Ödeme Planı",
    documents: "Dekont / Fatura",
    timeline: "Zaman Çizgisi",
    customer: "Müşteri",
    linkedRecords: "Bağlı Kayıtlar",
    recordMeta: "Kayıt Meta",
    noInstallments: "Taksit kaydı bulunamadı.",
    noDocuments: "Dekont veya fatura yüklenmemiş.",
    updated: "Güncellendi",
    created: "Oluşturuldu",
    paymentNo: "Ödeme No",
    policy: "Poliçe",
    claim: "Hasar",
    officeBranch: "Şube",
    salesEntity: "Satış Birimi",
    direction: "Yön",
    purpose: "Amaç",
    status: "Durum",
    paymentDate: "Ödeme Tarihi",
    dueDate: "Vade Tarihi",
    referenceNo: "Referans No",
    notes: "Notlar",
    amount: "Tutar",
    amountTry: "TRY Tutar",
    paidAmount: "Tahsil Edilen",
    remainingAmount: "Kalan",
    currency: "Para Birimi",
    fxRate: "Kur",
    fxDate: "Kur Tarihi",
    installmentCount: "Taksit Sayısı",
    installmentIntervalDays: "Taksit Aralığı",
    installmentNo: "Taksit",
    paidOn: "Tahsilat Tarihi",
    owner: "Oluşturan",
    modifiedBy: "Güncelleyen",
    openCustomer: "Müşteri kaydını aç",
    openPolicy: "Poliçeyi Aç",
    openClaim: "Hasar kaydını aç",
  },
  en: {
    breadcrumb: "Operations / Payments",
    back: "Back to list",
    collectPayment: "Record Collection",
    addReceipt: "Add Receipt",
    sendReminder: "Send Reminder",
    paymentInfo: "Payment Info",
    financialSummary: "Financial Summary",
    paymentPlan: "Payment Plan",
    documents: "Receipt / Invoice",
    timeline: "Timeline",
    customer: "Customer",
    linkedRecords: "Linked Records",
    recordMeta: "Record Meta",
    noInstallments: "No installment records found.",
    noDocuments: "No receipt or invoice uploaded.",
    updated: "Updated",
    created: "Created",
    paymentNo: "Payment No",
    policy: "Policy",
    claim: "Claim",
    officeBranch: "Branch",
    salesEntity: "Sales Entity",
    direction: "Direction",
    purpose: "Purpose",
    status: "Status",
    paymentDate: "Payment Date",
    dueDate: "Due Date",
    referenceNo: "Reference No",
    notes: "Notes",
    amount: "Amount",
    amountTry: "TRY Amount",
    paidAmount: "Collected",
    remainingAmount: "Remaining",
    currency: "Currency",
    fxRate: "FX Rate",
    fxDate: "FX Date",
    installmentCount: "Installments",
    installmentIntervalDays: "Installment Interval",
    installmentNo: "Installment",
    paidOn: "Collected On",
    owner: "Owner",
    modifiedBy: "Modified By",
    openCustomer: "Open customer record",
    openPolicy: "Open Policy",
    openClaim: "Open claim record",
  },
};

function t(key) {
  return copy.tr[key] || copy.en[key] || key;
}

const paymentResource = createResource({ url: "frappe.client.get", auto: false });
const installmentResource = createResource({ url: "frappe.client.get_list", auto: false });
const documentResource = createResource({ url: "frappe.client.get_list", auto: false });

const payment = computed(() => unref(paymentResource.data) || {});
const installments = computed(() => (Array.isArray(unref(installmentResource.data)) ? unref(installmentResource.data) : []));
const documents = computed(() => (Array.isArray(unref(documentResource.data)) ? unref(documentResource.data) : []));

const amountValue = computed(() => Number(payment.value.amount_try ?? payment.value.amount ?? 0));
const paidAmount = computed(() =>
  installments.value
    .filter((row) => String(row.status || "").toLowerCase() === "paid")
    .reduce((sum, row) => sum + Number(row.amount_try ?? row.amount ?? 0), 0)
);
const remainingAmount = computed(() => Math.max(amountValue.value - paidAmount.value, 0));

const isOverdue = computed(() => {
  const due = parseDateOnly(payment.value.due_date);
  return Boolean(due && due.getTime() < Date.now() && remainingAmount.value > 0);
});

const paymentStatus = computed(() => {
  const raw = String(payment.value.status || "").trim();
  if (raw) return raw;
  if (remainingAmount.value <= 0) return "Paid";
  return isOverdue.value ? "Overdue" : "Draft";
});

const heroCells = computed(() => [
  { label: t("paymentNo"), value: payment.value.payment_no || payment.value.name || "-", variant: "default" },
  { label: t("dueDate"), value: formatDate(payment.value.due_date || payment.value.payment_date), variant: "default" },
  { label: t("amount"), value: formatCurrency(amountValue.value, payment.value.currency), variant: "lg" },
  { label: t("status"), value: paymentStatus.value, variant: "accent" },
]);

const paymentFields = computed(() => [
  { label: t("paymentNo"), value: payment.value.payment_no || payment.value.name || "-" },
  { label: t("policy"), value: payment.value.policy || "-" },
  { label: t("claim"), value: payment.value.claim || "-" },
  { label: t("officeBranch"), value: payment.value.office_branch || "-" },
  { label: t("salesEntity"), value: payment.value.sales_entity || "-" },
  { label: t("direction"), value: payment.value.payment_direction || "-" },
  { label: t("purpose"), value: payment.value.payment_purpose || "-" },
  { label: t("referenceNo"), value: payment.value.reference_no || "-" },
  { label: t("notes"), value: payment.value.notes || "-", span: 2 },
]);

const financialFields = computed(() => [
  { label: t("amount"), value: formatCurrency(payment.value.amount, payment.value.currency), variant: "lg" },
  { label: t("amountTry"), value: formatCurrency(payment.value.amount_try ?? payment.value.amount, "TRY"), variant: "lg" },
  { label: t("paidAmount"), value: formatCurrency(paidAmount.value, "TRY") },
  { label: t("remainingAmount"), value: formatCurrency(remainingAmount.value, "TRY") },
  { label: t("currency"), value: payment.value.currency || "-" },
  { label: t("fxRate"), value: payment.value.fx_rate ? String(payment.value.fx_rate) : "-" },
  { label: t("fxDate"), value: formatDate(payment.value.fx_date) },
  { label: t("installmentCount"), value: String(payment.value.installment_count ?? installments.value.length ?? "-") },
  { label: t("installmentIntervalDays"), value: payment.value.installment_interval_days ? `${payment.value.installment_interval_days} gün` : "-" },
  { label: t("paymentDate"), value: formatDate(payment.value.payment_date) },
  { label: t("dueDate"), value: formatDate(payment.value.due_date) },
  { label: t("status"), value: paymentStatus.value },
]);

const linkedFields = computed(() => [
  { label: t("customer"), value: payment.value.customer || "-" },
  { label: t("policy"), value: payment.value.policy || "-" },
  { label: t("claim"), value: payment.value.claim || "-" },
]);

const recordFields = computed(() => [
  { label: t("owner"), value: payment.value.owner || "-" },
  { label: t("modifiedBy"), value: payment.value.modified_by || "-" },
  { label: t("updated"), value: formatDate(payment.value.modified) },
  { label: t("created"), value: formatDate(payment.value.creation) },
]);

function installmentLabel(row) {
  const installmentNo = row?.installment_no ?? "-";
  const installmentCount = row?.installment_count ?? installments.value.length ?? "-";
  return `${installmentNo}/${installmentCount}`;
}

function formatDate(value) {
  const date = parseDateOnly(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function parseDateOnly(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatCurrency(value, currency = "TRY") {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: String(currency || "TRY"),
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function backToList() {
  router.push("/payments");
}

function collectPayment() {
  router.push({
    name: "reconciliation-workbench",
    query: {
      payment: payment.value.name || name.value,
      mode: "collect",
    },
  });
}

function addReceipt() {
  router.push({
    name: "communication-center",
    query: {
      payment: payment.value.name || name.value,
      mode: "receipt",
    },
  });
}

function sendReminder() {
  router.push({
    name: "communication-center",
    query: {
      payment: payment.value.name || name.value,
      mode: "reminder",
    },
  });
}

function openCustomer() {
  if (!payment.value.customer) return;
  router.push({ name: "customer-detail", params: { name: payment.value.customer } });
}

function openPolicy() {
  if (!payment.value.policy) return;
  router.push({ name: "policy-detail", params: { name: payment.value.policy } });
}

function openClaim() {
  if (!payment.value.claim) return;
  router.push({ name: "claim-detail", params: { name: payment.value.claim } });
}

function reload() {
  paymentResource.params = {
    doctype: "AT Payment",
    name: name.value,
  };
  paymentResource.reload();

  installmentResource.params = {
    doctype: "AT Payment Installment",
    fields: ["name", "installment_no", "installment_count", "status", "due_date", "paid_on", "amount", "amount_try"],
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
