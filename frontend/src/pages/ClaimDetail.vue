<template>
  <section class="page-shell">
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
        <button class="btn btn-sm" @click="router.push('/claims')">{{ t("back") }}</button>
        <button class="btn btn-primary btn-sm" type="button">{{ t("action") }}</button>
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
        <DetailCard :title="t('process')">
          <StepBar :steps="claimSteps" class="mb-4" />
          <FieldGroup :fields="processFields" :cols="4" />
        </DetailCard>

        <DetailCard :title="t('details')">
          <FieldGroup :fields="detailFields" :cols="2" />
        </DetailCard>

        <DetailCard :title="t('documents')">
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

        <DetailCard :title="t('timeline')">
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
          <p class="section-title">{{ t("policy") }}</p>
          <div class="cursor-pointer rounded-lg bg-gray-50 p-3 hover:bg-gray-100" @click="openPolicy">
            <p class="text-sm font-medium text-gray-900">{{ claim.policy || '-' }}</p>
            <p class="mt-0.5 text-xs text-gray-400">{{ claim.branch || '-' }}</p>
          </div>
        </div>

        <div class="divider" />

        <div>
          <p class="section-title">{{ t("customer") }}</p>
          <div class="mb-3 flex items-center gap-2.5">
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-medium text-brand-600">
              {{ initials(claim.customer) }}
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">{{ claim.customer || '-' }}</p>
            </div>
          </div>
          <button class="btn btn-full btn-sm" @click="openCustomer">{{ t("customerRecord") }}</button>
        </div>

        <div class="divider" />

        <div>
          <p class="section-title">{{ t("summary") }}</p>
          <div class="grid grid-cols-2 gap-2">
            <div class="mini-metric">
              <p class="mini-metric-label">{{ t("approved") }}</p>
              <p class="mini-metric-value">{{ formatCurrency(claim.approved_amount) }}</p>
            </div>
            <div class="mini-metric">
              <p class="mini-metric-label">{{ t("paid") }}</p>
              <p class="mini-metric-value">{{ formatCurrency(claim.paid_amount) }}</p>
            </div>
            <div class="mini-metric">
              <p class="mini-metric-label">{{ t("remaining") }}</p>
              <p class="mini-metric-value">{{ formatCurrency(remainingAmount) }}</p>
            </div>
            <div class="mini-metric">
              <p class="mini-metric-label">{{ t("days") }}</p>
              <p class="mini-metric-value">{{ remainingDaysDisplay }}</p>
            </div>
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
import StepBar from "@/components/ui/StepBar.vue";

const props = defineProps({ name: { type: String, required: true } });
const name = computed(() => props.name || "");
const router = useRouter();
const activeTab = ref("genel");

const tabs = [
  { key: "genel", label: "Genel" },
  { key: "detay", label: "Detaylar" },
  { key: "belgeler", label: "Belgeler" },
  { key: "odeme", label: "Odemeler" },
  { key: "aktivite", label: "Aktivite" },
];

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

const claim = computed(() => claimResource.data || {});
const documents = computed(() => (Array.isArray(claimFileResource.data) ? claimFileResource.data : []));
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
  { label: "Musteri", value: claim.value.customer || "-" },
  { label: "Police", value: claim.value.policy || "-" },
  { label: "Hasar Tutari", value: formatCurrency(claim.value.approved_amount), variant: "lg" },
  { label: "Hasar Tarihi", value: formatDate(claim.value.creation) },
  {
    label: "Kalan Gun",
    value: remainingDaysDisplay.value,
    variant: remainingDays.value != null && remainingDays.value < 7 ? "warn" : "default",
  },
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
  const raw = String(claim.value.claim_status || "").trim();
  const stepMap = {
    Open: 1,
    "Under Review": 2,
    Approved: 3,
    Paid: 4,
    Closed: 5,
    Rejected: 5,
  };
  const current = stepMap[raw] || 1;
  return [
    { label: "Bildirim", state: current > 1 ? "done" : current === 1 ? "current" : "pending" },
    { label: "Inceleme", state: current > 2 ? "done" : current === 2 ? "current" : "pending" },
    { label: "Onay", state: current > 3 ? "done" : current === 3 ? "current" : "pending" },
    { label: "Odeme", state: current > 4 ? "done" : current === 4 ? "current" : "pending" },
    { label: "Kapandi", state: current === 5 ? "current" : "pending" },
  ];
});

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
}

onMounted(reload);
</script>
