<template>
  <section class="page-shell space-y-4">
    <div class="detail-topbar">
      <div>
        <p class="detail-breadcrumb">{{ t("breadcrumb") }}</p>
        <h1 class="detail-title">
          {{ item.name || name }}
          <StatusBadge domain="reconciliation" :status="statusLabel" />
        </h1>
        <div class="mt-1.5 flex flex-wrap items-center gap-2">
          <span class="copy-tag">{{ entry.insurance_company || item.accounting_entry || "-" }}</span>
          <span class="copy-tag">{{ entry.policy || item.source_name || "-" }}</span>
          <span class="copy-tag">{{ item.mismatch_type || "-" }}</span>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn btn-outline btn-sm" type="button" @click="goBack">{{ t("back") }}</button>
        <button class="btn btn-primary btn-sm" type="button" @click="openWorkbench">{{ t("openWorkbench") }}</button>
      </div>
    </div>

    <HeroStrip :cells="heroCells" />

    <div class="detail-body">
      <div class="detail-main space-y-4">
        <DetailCard :title="t('summary')">
          <FieldGroup :fields="summaryFields" :cols="2" />
        </DetailCard>

        <DetailCard :title="t('policyList')">
          <ListTable
            :columns="policyColumns"
            :rows="policyRows"
            :loading="loading"
            :empty-message="t('noPolicyRows')"
          />
        </DetailCard>

        <DetailCard :title="t('unmatchedRecords')">
          <ListTable
            :columns="unmatchedColumns"
            :rows="unmatchedRows"
            :loading="loading"
            :empty-message="t('noUnmatchedRows')"
          />
        </DetailCard>

        <DetailCard :title="t('notes')">
          <div v-if="!item.notes && !detailsEntries.length" class="card-empty">{{ t("noNotes") }}</div>
          <div v-else class="space-y-4">
            <p v-if="item.notes" class="text-sm text-slate-700 whitespace-pre-line">{{ item.notes }}</p>
            <div v-if="detailsEntries.length" class="space-y-2">
              <div
                v-for="entryItem in detailsEntries"
                :key="entryItem.label"
                class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <p class="text-xs font-medium uppercase tracking-wide text-slate-500">{{ entryItem.label }}</p>
                <p class="mt-1 text-sm text-slate-700">{{ entryItem.value }}</p>
              </div>
            </div>
          </div>
        </DetailCard>

        <DetailCard :title="t('timeline')">
          <div v-for="event in historyEntries" :key="event.label" class="timeline-item">
            <div :class="['tl-dot', event.active && 'tl-dot-active']" />
            <div>
              <p class="tl-text">{{ event.label }}</p>
              <p class="tl-time">{{ event.value }}</p>
            </div>
          </div>
        </DetailCard>
      </div>

      <aside class="detail-sidebar space-y-4">
        <DetailCard :title="t('companyInfo')">
          <FieldGroup :fields="companyFields" :cols="1" />
        </DetailCard>

        <DetailCard :title="t('periodInfo')">
          <FieldGroup :fields="periodFields" :cols="1" />
        </DetailCard>

        <DetailCard :title="t('statusInfo')">
          <FieldGroup :fields="statusFields" :cols="1" />
        </DetailCard>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, unref } from "vue";
import { createResource } from "frappe-ui";
import { useRouter } from "vue-router";

import StatusBadge from "@/components/ui/StatusBadge.vue";
import HeroStrip from "@/components/ui/HeroStrip.vue";
import DetailCard from "@/components/ui/DetailCard.vue";
import FieldGroup from "@/components/ui/FieldGroup.vue";
import ListTable from "@/components/ui/ListTable.vue";

const props = defineProps({ name: { type: String, required: true } });
const name = computed(() => props.name || "");
const router = useRouter();

const copy = {
  tr: {
    breadcrumb: "Kontrol Merkezi / Mutabakat Detay",
    back: "Listeye Dön",
    openWorkbench: "Mutabakat Masası",
    summary: "Özet Bilgiler",
    policyList: "Poliçe Listesi",
    unmatchedRecords: "Eşleşmeyen Kayıtlar",
    notes: "Mutabakat Notları",
    timeline: "Geçmiş",
    companyInfo: "Şirket Bilgileri",
    periodInfo: "Dönem Bilgisi",
    statusInfo: "Durum",
    noPolicyRows: "Bağlı poliçe kaydı bulunamadı.",
    noUnmatchedRows: "Eşleşmeyen kayıt bulunamadı.",
    noNotes: "Not veya detay bulunamadı.",
    accountingEntry: "Muhasebe Kaydı",
    source: "Kaynak",
    company: "Şirket",
    policy: "Poliçe",
    customer: "Müşteri",
    sourceName: "Kaynak No",
    status: "Durum",
    difference: "Fark",
    resolution: "Çözüm",
    sourceDoctype: "Kaynak Tipi",
    entryStatus: "Kayıt Durumu",
    mismatchType: "Uyumsuzluk Tipi",
    localTry: "Yerel TRY",
    externalTry: "Harici TRY",
    resolvedOn: "Çözüm Tarihi",
    resolvedBy: "Çözen",
    resolvedAction: "Çözüm Aksiyonu",
    created: "Oluşturuldu",
    updated: "Güncellendi",
    synced: "Son Sync",
    rawDetails: "Detay JSON",
  },
  en: {
    breadcrumb: "Control Center / Reconciliation Detail",
    back: "Back to list",
    openWorkbench: "Reconciliation Workbench",
    summary: "Summary",
    policyList: "Policy List",
    unmatchedRecords: "Unmatched Records",
    notes: "Reconciliation Notes",
    timeline: "History",
    companyInfo: "Company Info",
    periodInfo: "Period Info",
    statusInfo: "Status",
    noPolicyRows: "No linked policy rows found.",
    noUnmatchedRows: "No unmatched rows found.",
    noNotes: "No notes or details found.",
    accountingEntry: "Accounting Entry",
    source: "Source",
    company: "Company",
    policy: "Policy",
    customer: "Customer",
    sourceName: "Source No",
    status: "Status",
    difference: "Difference",
    resolution: "Resolution",
    sourceDoctype: "Source Type",
    entryStatus: "Entry Status",
    mismatchType: "Mismatch Type",
    localTry: "Local TRY",
    externalTry: "External TRY",
    resolvedOn: "Resolved On",
    resolvedBy: "Resolved By",
    resolvedAction: "Resolution Action",
    created: "Created",
    updated: "Updated",
    synced: "Last Sync",
    rawDetails: "Details JSON",
  },
};

function t(key) {
  return copy.tr[key] || copy.en[key] || key;
}

const itemResource = createResource({ url: "frappe.client.get", auto: false });
const entryResource = createResource({ url: "frappe.client.get", auto: false });
const relatedItemsResource = createResource({ url: "frappe.client.get_list", auto: false });

const item = computed(() => unref(itemResource.data) || {});
const entry = computed(() => unref(entryResource.data) || {});
const relatedItems = computed(() => (Array.isArray(unref(relatedItemsResource.data)) ? unref(relatedItemsResource.data) : []));
const loading = computed(() => Boolean(unref(itemResource.loading) || unref(entryResource.loading) || unref(relatedItemsResource.loading)));

const differenceValue = computed(() => Number(item.value.difference_try || 0));
const statusLabel = computed(() => normalizeReconciliationStatus(item.value.status, differenceValue.value));
const periodLabel = computed(() => derivePeriodLabel(item.value, entry.value));

const heroCells = computed(() => [
  { label: "Mutabakat No", value: item.value.name || name.value || "-", variant: "default" },
  { label: "Şirket", value: entry.value.insurance_company || "-", variant: "default" },
  { label: "Dönem", value: periodLabel.value, variant: "lg" },
  { label: "Fark", value: formatMoney(differenceValue.value), variant: differenceValue.value ? "warn" : "success" },
]);

const summaryFields = computed(() => [
  { label: t("accountingEntry"), value: item.value.accounting_entry || "-" },
  { label: t("sourceDoctype"), value: item.value.source_doctype || "-" },
  { label: t("sourceName"), value: item.value.source_name || "-" },
  { label: t("mismatchType"), value: item.value.mismatch_type || "-" },
  { label: t("status"), value: statusLabel.value },
  { label: t("difference"), value: formatMoney(differenceValue.value) },
  { label: t("resolvedAction"), value: item.value.resolution_action || "-" },
  { label: t("resolvedBy"), value: item.value.resolved_by || "-" },
]);

const policyColumns = computed(() => [
  { key: "policy", label: t("policy"), type: "mono" },
  { key: "customer", label: t("customer") },
  { key: "source", label: t("source") },
  { key: "localTry", label: t("localTry"), type: "amount", align: "right" },
  { key: "externalTry", label: t("externalTry"), type: "amount", align: "right" },
  { key: "difference", label: t("difference"), type: "amount", align: "right" },
  { key: "status", label: t("status"), type: "status", domain: "reconciliation" },
]);

const unmatchedColumns = computed(() => [
  { key: "sourceDoctype", label: t("sourceDoctype") },
  { key: "sourceName", label: t("sourceName"), type: "mono" },
  { key: "mismatchType", label: t("mismatchType") },
  { key: "localTry", label: t("localTry"), type: "amount", align: "right" },
  { key: "externalTry", label: t("externalTry"), type: "amount", align: "right" },
  { key: "difference", label: t("difference"), type: "amount", align: "right" },
  { key: "status", label: t("status"), type: "status", domain: "reconciliation" },
]);

const policyRows = computed(() =>
  relatedItems.value.map((row) => buildTableRow(row)).filter(Boolean),
);
const unmatchedRows = computed(() =>
  policyRows.value.filter((row) => row.status === "Open" || Number(row.difference_raw || 0) !== 0),
);

const detailsEntries = computed(() => {
  const parsed = parseDetailsJson(item.value.details_json);
  if (!parsed || typeof parsed !== "object") return [];
  return Object.entries(parsed)
    .slice(0, 8)
    .map(([label, value]) => ({ label, value: stringifyDetailValue(value) }));
});

const historyEntries = computed(() => {
  const details = parseDetailsJson(item.value.details_json) || {};
  return [
    { label: t("created"), value: formatDateTime(item.value.creation), active: false },
    { label: t("updated"), value: formatDateTime(item.value.modified), active: true },
    { label: t("resolvedOn"), value: formatDateTime(item.value.resolved_on), active: Boolean(item.value.resolved_on) },
    { label: t("synced"), value: formatDateTime(entry.value.last_synced_on), active: Boolean(entry.value.last_synced_on) },
    ...(details.auto_closed ? [{ label: "Auto Close", value: stringifyDetailValue(details.auto_closed), active: false }] : []),
  ].filter((row) => row.value !== "-");
});

const companyFields = computed(() => [
  { label: t("company"), value: entry.value.insurance_company || "-" },
  { label: t("policy"), value: entry.value.policy || "-" },
  { label: t("customer"), value: entry.value.customer || "-" },
  { label: t("sourceDoctype"), value: item.value.source_doctype || "-" },
  { label: t("sourceName"), value: item.value.source_name || "-" },
]);

const periodFields = computed(() => [
  { label: "Dönem", value: periodLabel.value },
  { label: t("created"), value: formatDateTime(item.value.creation) },
  { label: t("updated"), value: formatDateTime(item.value.modified) },
  { label: t("synced"), value: formatDateTime(entry.value.last_synced_on) },
]);

const statusFields = computed(() => [
  { label: t("status"), value: statusLabel.value },
  { label: t("entryStatus"), value: entry.value.status || "-" },
  { label: t("resolvedAction"), value: item.value.resolution_action || "-" },
  { label: t("resolvedBy"), value: item.value.resolved_by || "-" },
]);

function buildTableRow(row) {
  if (!row) return null;
  const difference = Number(row.difference_try || 0);
  return {
    id: row.name,
    name: row.name,
    policy: entry.value.policy || row.source_name || "-",
    customer: entry.value.customer || "-",
    source: row.source_doctype || "-",
    sourceDoctype: row.source_doctype || "-",
    sourceName: row.source_name || "-",
    mismatchType: row.mismatch_type || "-",
    localTry: formatMoney(row.local_amount_try || 0),
    externalTry: formatMoney(row.external_amount_try || 0),
    difference: formatMoney(Math.abs(difference)),
    difference_raw: difference,
    status: normalizeReconciliationStatus(row.status, difference),
    _actions: [],
  };
}

function normalizeReconciliationStatus(status, difference) {
  const normalizedStatus = String(status || "");
  if (normalizedStatus === "Resolved") return "Matched";
  if (normalizedStatus === "Ignored") return "Cancelled";
  if (normalizedStatus === "Open" && Math.abs(Number(difference || 0)) > 0) return "Mismatch";
  if (normalizedStatus === "Open") return "Pending";
  return normalizedStatus || "Pending";
}

function derivePeriodLabel(itemRow, entryRow) {
  const rawValue =
    itemRow?.resolved_on ||
    itemRow?.modified ||
    itemRow?.creation ||
    entryRow?.posting_date ||
    entryRow?.last_synced_on ||
    "";
  const trimmedValue = String(rawValue || "").trim();
  if (!trimmedValue) return "-";
  const parsedDate = new Date(trimmedValue);
  if (Number.isNaN(parsedDate.getTime())) return trimmedValue.slice(0, 7);
  return new Intl.DateTimeFormat("tr-TR", { month: "short", year: "numeric" }).format(parsedDate);
}

function parseDetailsJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function stringifyDetailValue(value) {
  if (value == null) return "-";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(stringifyDetailValue).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value) {
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return String(value ?? 0);
  }
}

function goBack() {
  router.push({ name: "reconciliation-workbench" });
}

function openWorkbench() {
  router.push({ name: "reconciliation-workbench" });
}

async function reload() {
  if (!name.value) return;
  await itemResource.reload({ doctype: "AT Reconciliation Item", name: name.value });
  if (!item.value.accounting_entry) return;
  await Promise.allSettled([
    entryResource.reload({ doctype: "AT Accounting Entry", name: item.value.accounting_entry }),
    relatedItemsResource.reload({
      doctype: "AT Reconciliation Item",
      fields: [
        "name",
        "source_doctype",
        "source_name",
        "mismatch_type",
        "status",
        "local_amount_try",
        "external_amount_try",
        "difference_try",
      ],
      filters: { accounting_entry: item.value.accounting_entry },
      order_by: "modified desc",
      limit_page_length: 50,
    }),
  ]);
}

onMounted(reload);
</script>
