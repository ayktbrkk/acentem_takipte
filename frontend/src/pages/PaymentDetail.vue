<template>
  <section class="page-shell">
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
        <button class="btn btn-sm" @click="router.push('/payments')">{{ t("back") }}</button>
        <button class="btn btn-primary btn-sm" type="button">{{ t("approve") }}</button>
      </div>
    </div>

    <HeroStrip :cells="heroCells" />

    <div class="nav-tabs-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['nav-tab', activeTab === tab.key && 'is-active']"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="detail-body">
      <div class="detail-main">
        <DetailCard :title="t('paymentInfo')">
          <FieldGroup :fields="paymentFields" :cols="2" />
        </DetailCard>

        <DetailCard v-if="installments.length" :title="t('installments')">
          <div>
            <div v-for="(inst, idx) in installments" :key="inst.name || idx" class="flex items-center gap-3 border-b border-gray-100 py-2.5 last:border-0">
              <span class="w-6 text-xs text-gray-400">{{ idx + 1 }}.</span>
              <div class="flex-1">
                <p class="text-sm text-gray-900">{{ formatDate(inst.due_date) }}</p>
              </div>
              <StatusBadge domain="payment" :status="inst.status || 'Draft'" />
              <p class="shrink-0 text-sm font-medium text-gray-900">{{ formatCurrency(inst.amount_try) }}</p>
            </div>
          </div>
        </DetailCard>

        <DetailCard :title="t('history')">
          <div>
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
          </div>
        </DetailCard>
      </div>

      <aside class="detail-sidebar">
        <div>
          <p class="section-title">{{ t("summary") }}</p>
          <div class="grid grid-cols-2 gap-2">
            <div class="mini-metric">
              <p class="mini-metric-label">{{ t("total") }}</p>
              <p class="mini-metric-value">{{ formatCurrency(payment.amount_try) }}</p>
            </div>
            <div class="mini-metric">
              <p class="mini-metric-label">{{ t("paid") }}</p>
              <p class="mini-metric-value">{{ formatCurrency(paidAmount) }}</p>
            </div>
            <div class="mini-metric">
              <p class="mini-metric-label">{{ t("remaining") }}</p>
              <p class="mini-metric-value">{{ formatCurrency(remainingAmount) }}</p>
            </div>
            <div class="mini-metric">
              <p class="mini-metric-label">{{ t("count") }}</p>
              <p class="mini-metric-value">{{ String(installments.length || "-") }}</p>
            </div>
          </div>
        </div>

        <div class="divider" />

        <div>
          <p class="section-title">{{ t("policy") }}</p>
          <div class="cursor-pointer rounded-lg bg-gray-50 p-3 hover:bg-gray-100" @click="openPolicy">
            <p class="text-sm font-medium text-gray-900">{{ payment.policy || '-' }}</p>
            <p class="mt-0.5 text-xs text-gray-400">{{ payment.payment_direction || '-' }}</p>
          </div>
        </div>

        <div class="divider" />

        <div>
          <p class="section-title">{{ t("customer") }}</p>
          <div class="flex items-center gap-2.5">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-medium text-brand-600">
              {{ initials(payment.customer) }}
            </div>
            <p class="text-sm font-medium text-gray-900">{{ payment.customer || '-' }}</p>
          </div>
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

const props = defineProps({ name: { type: String, required: true } });
const name = computed(() => props.name || "");
const router = useRouter();
const activeTab = ref("genel");

const tabs = [
  { key: "genel", label: "Genel" },
  { key: "taksit", label: "Taksitler" },
  { key: "gecmis", label: "Gecmis" },
];

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

const payment = computed(() => paymentResource.data || {});
const installments = computed(() => (Array.isArray(installmentResource.data) ? installmentResource.data : []));

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
  { label: "Musteri", value: payment.value.customer || "-" },
  { label: "Police", value: payment.value.policy || "-" },
  { label: "Tutar", value: formatCurrency(payment.value.amount_try), variant: "lg" },
  { label: "Vade", value: formatDate(payment.value.payment_date), variant: isOverdue.value ? "warn" : "default" },
]);

const paymentFields = computed(() => [
  { label: "Odeme Turu", value: payment.value.payment_direction || "-" },
  { label: "Tutar", value: formatCurrency(payment.value.amount_try), variant: "lg" },
  { label: "Vade", value: formatDate(payment.value.payment_date) },
  { label: "Odeme Tarihi", value: formatDate(payment.value.payment_date) },
  { label: "Aciklama", value: payment.value.payment_purpose || "-", span: 2 },
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
}

onMounted(reload);
</script>
