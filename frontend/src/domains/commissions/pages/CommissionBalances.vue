<template>
  <WorkbenchPageLayout
    :breadcrumb="t('title')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="entities.length"
    :record-count-label="t('record_count')"
  >
    <template #actions>
      <ActionButton variant="secondary" size="sm" @click="handleExport">
        <FeatherIcon name="download" class="h-4 w-4" />
        {{ t('export_xlsx') }}
      </ActionButton>
      <div class="flex rounded-lg border border-slate-200 overflow-hidden">
        <button
          :class="['px-3 py-1.5 text-sm', viewMode === 'table' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600']"
          @click="viewMode = 'table'"
        >
          &#x1F4CB;
        </button>
        <button
          :class="['px-3 py-1.5 text-sm', viewMode === 'card' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600']"
          @click="viewMode = 'card'"
        >
          &#x1F5C2;
        </button>
      </div>
    </template>

    <template #metrics>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SaaSMetricCard :label="t('total_accrued')" :value="formatCurrency(summary.total_accrued_try)" />
        <SaaSMetricCard :label="t('total_paid')" :value="formatCurrency(summary.total_paid_try)" value-class="text-at-green" />
        <SaaSMetricCard :label="t('total_remaining')" :value="formatCurrency(summary.total_remaining_try)" value-class="text-brand-600" />
      </div>
    </template>

    <SmartFilterBar
      v-model="searchQuery"
      class="mb-6"
      :placeholder="t('searchPlaceholder') || 'Ara...'"
    >
      <template #primary-filters>
        <select v-model="filters.office_branch" class="input h-9 py-1 text-sm" @change="reload">
          <option value="">{{ t('all') }} {{ t('office_branch') }}</option>
          <option v-for="b in branchOptions" :key="b.value" :value="b.value">{{ b.label }}</option>
        </select>
        <select v-model="filters.aging_bucket" class="input h-9 py-1 text-sm" @change="reload">
          <option value="all">{{ t('all') }} {{ t('aging_filter') }}</option>
          <option value="current">{{ t('aging_current') }}</option>
          <option value="1_30">{{ t('aging_1_30') }}</option>
          <option value="31_60">{{ t('aging_31_60') }}</option>
          <option value="61_90">{{ t('aging_61_90') }}</option>
          <option value="90_plus">{{ t('aging_90_plus') }}</option>
        </select>
        <input v-model="filters.from_date" type="date" class="input h-9 py-1 text-sm" :title="t('from_date') || 'Başlangıç'" @change="reload" />
        <input v-model="filters.to_date" type="date" class="input h-9 py-1 text-sm" :title="t('to_date') || 'Bitiş'" @change="reload" />
      </template>
    </SmartFilterBar>

    <div v-if="error" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {{ error }}
      <button class="ml-2 font-medium underline" @click="reload">{{ t('retry') }}</button>
    </div>

    <SkeletonLoader v-else-if="loading" variant="list" :rows="5" />

    <div v-else-if="!entities.length" class="py-12 text-center text-slate-400">
      {{ t('no_commissions') }}
    </div>

    <template v-else-if="viewMode === 'table'">
      <ListTable
        :columns="tableColumns"
        :rows="tableRows"
        :loading="false"
        :empty-message="t('no_commissions')"
        :locale="activeLocale"
        clickable
        @row-click="openDetail"
      />
    </template>

    <template v-else>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div
          v-for="entity in entities"
          :key="entity.entity_name"
          class="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-sm transition-shadow cursor-pointer"
          @click="openDetail(entity)"
        >
          <div class="mb-3 flex items-start justify-between">
            <div>
              <h3 class="font-semibold text-slate-900">{{ entity.entity_name }}</h3>
              <p class="mt-0.5 text-xs text-slate-400">{{ entity.office_branch }}</p>
            </div>
            <span class="rounded bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">{{ translateEntityType(entity.entity_type) }}</span>
          </div>

          <div class="mb-3 grid grid-cols-2 gap-2">
            <div class="rounded-lg bg-slate-50 p-2 text-center">
              <p class="text-[11px] uppercase text-slate-400">{{ t('accrued') }}</p>
              <p class="text-sm font-bold text-slate-900">{{ formatCurrency(entity.accrued_try) }}</p>
            </div>
            <div class="rounded-lg bg-slate-50 p-2 text-center">
              <p class="text-[11px] uppercase text-slate-400">{{ t('paid') }}</p>
              <p class="text-sm font-bold text-at-green">{{ formatCurrency(entity.paid_try) }}</p>
            </div>
          </div>

          <div class="mb-2 flex items-center justify-between">
            <span class="text-xs text-slate-500">{{ t('remaining') }}</span>
            <span class="text-sm font-bold" :class="entity.remaining_try > 0 ? 'text-brand-600' : 'text-slate-400'">
              {{ formatCurrency(entity.remaining_try) }}
            </span>
          </div>

          <div class="mb-3 h-1.5 w-full rounded-full bg-slate-100">
            <div
              class="h-full rounded-full"
              :class="barClass(entity)"
              :style="{ width: pct(entity) + '%' }"
            />
          </div>

          <div v-if="entity.insurance_companies?.length" class="mb-3 space-y-1 text-xs">
            <div
              v-for="ic in entity.insurance_companies.slice(0, 3)"
              :key="ic.name"
              class="flex items-center gap-1.5"
            >
              <span class="text-[10px]" :class="icBadgeClass(ic)" :title="icBadgeTitle(ic)">{{ icBadgeSymbol(ic) }}</span>
              <span class="truncate text-slate-600">{{ ic.name }}</span>
              <span class="ml-auto tabular-nums text-slate-400">{{ formatCurrency(ic.remaining_try > 0 ? ic.remaining_try : ic.accrued_try) }}</span>
            </div>
            <div v-if="entity.insurance_companies.length > 3" class="text-slate-400 text-[10px]">
              +{{ entity.insurance_companies.length - 3 }}
            </div>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-400 border-t border-slate-50 pt-2">
            <span>{{ entity.policy_count }} {{ t('polices') }}</span>
            <span class="font-medium text-brand-600">{{ t('view_details') }} &#8594;</span>
          </div>
        </div>
      </div>
    </template>

    <div v-if="detail.visible" class="fixed inset-0 z-50 flex justify-end">
      <div class="absolute inset-0 bg-black/20" @click="detail.visible = false" />
      <div class="relative h-full w-full max-w-2xl overflow-auto bg-white shadow-2xl">
        <button class="absolute right-4 top-4 z-10 text-xl text-slate-400 hover:text-slate-600" @click="detail.visible = false">
          &times;
        </button>

        <div v-if="detailLoading" class="flex h-full items-center justify-center">
          <SkeletonLoader variant="list" :rows="6" />
        </div>

        <template v-else-if="detailData">
          <div class="p-6">
            <div class="mb-6">
              <div class="mb-1 flex items-center gap-2">
                <h2 class="text-lg font-bold text-slate-900">{{ detailData.entity?.full_name || detail.entityName }}</h2>
                <span class="rounded bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                  {{ translateEntityType(detailData.entity?.entity_type || detail.entityType) }}
                </span>
              </div>
              <p class="text-sm text-slate-500">{{ detailData.entity?.office_branch }}</p>
            </div>

            <div class="mb-6 grid grid-cols-3 gap-3">
              <div class="rounded-lg bg-slate-50 p-3 text-center">
                <p class="text-xs text-slate-400">{{ t('policy_count') }}</p>
                <p class="text-lg font-bold">{{ detailData.totals?.policies || 0 }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-3 text-center">
                <p class="text-xs text-slate-400">{{ t('total_commission') }}</p>
                <p class="text-lg font-bold text-brand-600">{{ formatCurrency(detailData.totals?.commission) }}</p>
              </div>
              <div class="rounded-lg bg-slate-50 p-3 text-center">
                <p class="text-xs text-slate-400">{{ t('remaining') }}</p>
                <p class="text-lg font-bold" :class="(detailData.totals?.remaining || 0) > 0 ? 'text-red-600' : 'text-at-green'">
                  {{ formatCurrency(detailData.totals?.remaining) }}
                </p>
              </div>
            </div>

            <div v-if="agingSummary.length" class="flex flex-wrap gap-1 mb-4">
              <span v-for="a in agingSummary" :key="a.label" :class="['text-[11px] px-1.5 py-0.5 rounded', a.cls]">
                {{ a.label }}: {{ formatCurrency(a.value) }}
              </span>
            </div>

            <SectionPanel :title="t('insurance_company')" class="mb-4">
              <div class="space-y-1 text-sm">
                <div
                  v-for="ic in icBreakdown"
                  :key="ic.name"
                  class="flex items-center justify-between border-b border-slate-50 py-1.5 last:border-0"
                >
                  <span class="text-slate-700">{{ ic.name }}</span>
                  <div class="flex gap-4 text-xs">
                    <span class="text-slate-500">{{ t('accrued') }} {{ formatCurrency(ic.accrued) }}</span>
                    <span class="text-at-green">{{ t('paid') }} {{ formatCurrency(ic.paid) }}</span>
                    <span :class="ic.remaining > 0 ? 'text-red-600' : 'text-at-green'">
                      {{ ic.remaining > 0 ? formatCurrency(ic.remaining) : '&#x2713;' }}
                    </span>
                  </div>
                </div>
              </div>
            </SectionPanel>

            <SectionPanel :title="t('accrued_policies')" class="mb-4">
              <ListTable
                :columns="policyColumns"
                :rows="enrichedPolicies"
                :loading="false"
                :locale="activeLocale"
                clickable
                @row-click="openPolicy"
              />
            </SectionPanel>

            <SectionPanel :title="t('payment_history')" class="mb-4">
              <ListTable
                :columns="paymentColumns"
                :rows="paymentRows"
                :loading="false"
                :locale="activeLocale"
                clickable
                @row-click="openPayment"
              />
            </SectionPanel>
          </div>
        </template>
      </div>
    </div>
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, unref } from "vue";
import { useRouter } from "vue-router";
import { createResource } from "frappe-ui";
import { FeatherIcon } from "frappe-ui";
import { useAuthStore } from "../../../stores/auth";
import { useBranchStore } from "../../../stores/branch";
import { useCommissionBalances } from "../../../composables/useCommissionBalances";
import { COMMISSION_TRANSLATIONS } from "../i18n/translations";
import { useAtFormatting } from "../../../composables/useAtFormatting";
import WorkbenchPageLayout from "../../../components/app-shell/WorkbenchPageLayout.vue";
import SaaSMetricCard from "../../../components/app-shell/SaaSMetricCard.vue";
import SmartFilterBar from "../../../components/app-shell/SmartFilterBar.vue";
import SectionPanel from "../../../components/app-shell/SectionPanel.vue";
import ActionButton from "../../../components/app-shell/ActionButton.vue";
import ListTable from "../../../components/ui/ListTable.vue";
import SkeletonLoader from "../../../components/ui/SkeletonLoader.vue";

const authStore = useAuthStore();
const branchStore = useBranchStore();
const router = useRouter();

const activeLocale = computed(() =>
  String(authStore.locale || "tr").toLowerCase().startsWith("tr") ? "tr" : "en",
);

function t(key) {
  return (
    COMMISSION_TRANSLATIONS[activeLocale.value]?.[key] ||
    COMMISSION_TRANSLATIONS.en?.[key] ||
    key
  );
}

const { formatCurrency, formatDate } = useAtFormatting(
  computed(() => activeLocale.value),
);

const { filters, loading, error, summary, entities, reload } =
  useCommissionBalances({ t });

const viewMode = ref("table");
const searchQuery = ref("");

const branchOptions = computed(() => branchStore?.options || []);

const detailResource = createResource({
  url: "acentem_takipte.acentem_takipte.domains.commissions.api.endpoints.get_commission_policy_detail",
  auto: false,
});

const detailData = computed(() => unref(detailResource.data) || null);
const detailLoading = computed(() => Boolean(unref(detailResource.loading)));

const detail = reactive({
  visible: false,
  entityName: "",
  entityType: "",
});

async function openDetail(entity) {
  detail.visible = true;
  detail.entityName = entity.entity_name || "";
  detail.entityType = entity.entity_type || "";
  const params = { entity_name: detail.entityName };
  if (filters.from_date) params.from_date = filters.from_date;
  if (filters.to_date) params.to_date = filters.to_date;
  detailResource.params = params;
  await detailResource.reload();
}

const tableColumns = computed(() => [
  { key: "entity_display", label: t("sales_entity") || "Satış Birimi", type: "text" },
  { key: "accrued_try", label: t("accrued"), type: "currency" },
  { key: "paid_try", label: t("paid"), type: "currency" },
  { key: "remaining_try", label: t("remaining"), type: "currency" },
  { key: "pct", label: "%", type: "text" },
]);

const tableRows = computed(() =>
  entities.value
    .filter((e) => {
      if (!searchQuery.value) return true;
      const q = searchQuery.value.toLowerCase();
      return (
        e.entity_name.toLowerCase().includes(q) ||
        (e.insurance_companies || []).some((ic) => ic.name.toLowerCase().includes(q))
      );
    })
    .map((e) => ({
      ...e,
      pct: pct(e) + "%",
      entity_name: e.entity_name,
      entity_display: `${e.entity_name}  ·  ${e.policy_count} ${t('polices')}`,
    })),
);

const policyColumns = computed(() => [
  { key: "policy_no", label: t("policy_no"), type: "text" },
  { key: "customer_name", label: t("customer"), type: "text" },
  { key: "insurance_company", label: t("company"), type: "text" },
  { key: "commission_amount_try", label: t("commission"), type: "currency" },
  { key: "status_icon", label: t("status"), type: "text" },
]);

const paymentColumns = computed(() => [
  { key: "payment_no", label: t("payment_no"), type: "text" },
  { key: "payment_date", label: t("date"), type: "date" },
  { key: "amount_try", label: t("amount"), type: "currency" },
  { key: "reference_no", label: t("reference"), type: "text" },
]);

const enrichedPolicies = computed(() =>
  (detailData.value?.policies || []).map((p) => ({
    ...p,
    status_icon: p.payment ? "✓" : p.aging_days > 90 ? "⚠" : "⏳",
  })),
);

const paymentRows = computed(() =>
  (detailData.value?.policies || [])
    .filter((p) => p.payment)
    .map((p) => ({ ...p.payment, policy_no: p.policy_no })),
);

const agingSummary = computed(() => {
  const buckets = { current: 0, "1_30": 0, "31_60": 0, "61_90": 0, "90_plus": 0 };
  for (const p of detailData.value?.policies || []) {
    const b = p.aging_bucket || "current";
    if (buckets[b] !== undefined) buckets[b] += p.commission_amount_try || 0;
  }
  return Object.entries(buckets)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      label: t(`aging_${k}`),
      value: v,
      cls: k === "current" ? "bg-emerald-50 text-emerald-700" : k === "1_30" || k === "31_60" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700",
    }));
});

const icBreakdown = computed(() => {
  const map = {};
  for (const p of detailData.value?.policies || []) {
    const ic = p.insurance_company || t("unspecified") || "—";
    if (!map[ic]) map[ic] = { name: ic, accrued: 0, paid: 0, remaining: 0 };
    map[ic].accrued += p.commission_amount_try || 0;
    if (p.payment) map[ic].paid += p.payment.amount_try || 0;
    map[ic].remaining = map[ic].accrued - map[ic].paid;
  }
  return Object.values(map);
});

function pct(entity) {
  if (!entity.accrued_try) return 0;
  return Math.min(100, Math.round((entity.paid_try / entity.accrued_try) * 100));
}

function barClass(entity) {
  const v = pct(entity);
  if (v >= 75) return "bg-at-green";
  if (v >= 50) return "bg-at-amber";
  return "bg-red-500";
}

function icBadgeClass(ic) {
  if (ic.remaining_try <= 0) return "text-at-green";
  if (ic.remaining_try === ic.accrued_try) return "text-red-500";
  return "text-at-amber";
}

function icBadgeSymbol(ic) {
  if (ic.remaining_try <= 0) return "\u2713";
  if (ic.remaining_try === ic.accrued_try) return "\u26A0";
  return "\u23F3";
}

function icBadgeTitle(ic) {
  if (ic.remaining_try <= 0) return t("paid");
  if (ic.remaining_try === ic.accrued_try) return t("aging_90_plus");
  return t("remaining");
}

function openPolicy(row) {
  if (row.policy_name) {
    router.push({ name: "policy-detail", params: { name: row.policy_name } });
  }
}

function openPayment(row) {
  if (row.name) {
    router.push({ name: "payment-detail", params: { name: row.name } });
  }
}

function translateEntityType(type) {
  const key = `type_${String(type || "").replace(/[-\s]/g, "")}`;
  return t(key) || type || "";
}

function handleExport() {
  const filtered = searchQuery.value
    ? entities.value.filter((e) => {
        const q = searchQuery.value.toLowerCase();
        return e.entity_name.toLowerCase().includes(q) ||
          (e.insurance_companies || []).some((ic) => ic.name.toLowerCase().includes(q));
      })
    : entities.value;
  const rows = [];
  rows.push([
    t("sales_entity"), t("entity_type"), t("office_branch"),
    t("accrued"), t("paid"), t("remaining"), "%",
    t("policy_count"), t("company"),
  ].join(","));
  for (const e of filtered) {
    const ics = (e.insurance_companies || []).map((ic) => ic.name).join("; ");
    rows.push(
      [e.entity_name, translateEntityType(e.entity_type), e.office_branch,
        e.accrued_try, e.paid_try, e.remaining_try, pct(e),
        e.policy_count, ics,
      ].join(","),
    );
  }
  const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "komisyon_takip.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function onKeydown(e) {
  if (e.key === "Escape" && detail.visible) detail.visible = false;
}
onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));

reload();
</script>
