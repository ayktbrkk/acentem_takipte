<template>
  <WorkbenchPageLayout
    :breadcrumb="t('title')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="entities.length"
    :record-count-label="t('record_count')"
  >
    <template #actions>
      <span v-if="isReconciled" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-at-green/10 text-at-green text-sm font-semibold">
        <FeatherIcon name="check-circle" class="h-4 w-4" />
        {{ t('period_reconciled') }}
      </span>
      <ActionButton variant="primary" size="sm" :disabled="loading" @click="reload">
        <FeatherIcon name="refresh-cw" :class="['h-4 w-4', loading && 'animate-spin']" />
        {{ t("refresh_label") }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" :disabled="loading" @click="handleExport">
        <FeatherIcon name="download" class="h-4 w-4" />
        {{ t("export_xlsx") }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" @click="openStatementDialog">
        <FeatherIcon name="upload" class="h-4 w-4" />
        {{ t("upload_statement") }}
      </ActionButton>
      <ActionButton
        v-if="filters.insurance_company"
        variant="secondary"
        size="sm"
        @click="lockCurrentPeriod"
      >
        <FeatherIcon name="lock" class="h-4 w-4" />
        {{ t("lock_period") }}
      </ActionButton>
      <div class="flex rounded-lg border border-slate-200 overflow-hidden">
        <button
          :class="['px-3 py-1.5 text-sm flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none', viewMode === 'table' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600']"
          @click="viewMode = 'table'"
        >
          <FeatherIcon name="list" class="h-4 w-4" />
        </button>
        <button
          :class="['px-3 py-1.5 text-sm flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none', viewMode === 'card' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600']"
          @click="viewMode = 'card'"
        >
          <FeatherIcon name="grid" class="h-4 w-4" />
        </button>
      </div>
    </template>

    <template #metrics>
      <div v-if="loading" class="w-full grid grid-cols-1 gap-4 md:grid-cols-4">
        <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
      </div>
      <div v-else class="w-full grid grid-cols-1 gap-4 md:grid-cols-4">
        <SaaSMetricCard :label="t('total_accrued')" :value="formatCurrency(summary.total_accrued_try)" />
        <SaaSMetricCard :label="t('total_paid')" :value="formatCurrency(summary.total_paid_try)" value-class="text-at-green" />
        <SaaSMetricCard :label="t('total_remaining')" :value="formatCurrency(summary.total_remaining_try)" value-class="text-brand-600" />
        <SaaSMetricCard
          v-if="reconciliation.open_items > 0"
          :label="t('reconciliation_open')"
          :value="reconciliation.open_items"
          value-class="text-at-red"
        />
      </div>
    </template>

    <SmartFilterBar
      v-model="searchQuery"
      class="mb-6"
      :placeholder="t('searchPlaceholder')"
    >
      <template #primary-filters>
        <select v-model="period" class="input h-9 py-1 text-sm" @change="onPeriodChange">
          <option value="">{{ t('all_periods') }}</option>
          <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
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
        <select v-model="filters.insurance_company" class="input h-9 py-1 text-sm" @change="reload">
          <option value="">{{ t('all') }} {{ t('company') }}</option>
          <option v-for="c in companyOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
        <input v-model="filters.from_date" type="date" class="input h-9 py-1 text-sm" :title="t('from_date')" @change="reload" />
        <input v-model="filters.to_date" type="date" class="input h-9 py-1 text-sm" :title="t('to_date')" @change="reload" />
      </template>
    </SmartFilterBar>

    <div v-if="viewMode === 'table' && selectedEntities.length" class="flex items-center gap-2 mb-3 px-3 py-2 bg-brand-50 rounded-lg border border-brand-200">
      <span class="text-sm text-brand-700 font-medium">{{ selectedEntities.length }} {{ t('selected_count') }}</span>
      <button @click="exportSelected" class="text-xs px-2 py-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none">
        <FeatherIcon name="download" class="h-3 w-3" /> {{ t('export_selected') }}
      </button>
    </div>

    <div v-if="error" class="rounded-xl border border-at-red/20 bg-at-red/5 px-4 py-3 text-sm text-at-red">
      {{ error }}
      <button class="ml-2 font-medium underline focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none" @click="reload">{{ t('retry') }}</button>
    </div>

    <SkeletonLoader v-else-if="loading" variant="list" :rows="5" />

    <div v-else-if="!entities.length" class="py-12 text-center">
      <p class="text-slate-400 font-medium">{{ t('no_commissions') }}</p>
      <p class="text-slate-400 text-sm mt-1">{{ t('no_commissions_desc') }}</p>
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
      >
        <template #cell(_selected)="{ row }">
          <input
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            :checked="row._selected"
            @click.stop
            @change="toggleSelect(row.entity_name)"
          />
        </template>
      </ListTable>
    </template>

    <template v-else>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div
          v-for="entity in filteredEntities"
          :key="entity.entity_name"
          role="button"
          tabindex="0"
          class="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-sm transition-shadow cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
          @click="openDetail(entity)"
          @keydown.enter="openDetail(entity)"
          @keydown.space.prevent="openDetail(entity)"
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
              <p class="text-sm font-bold text-slate-900 tabular-nums">{{ formatCurrency(entity.accrued_try) }}</p>
            </div>
            <div class="rounded-lg bg-slate-50 p-2 text-center">
              <p class="text-[11px] uppercase text-slate-400">{{ t('paid') }}</p>
              <p class="text-sm font-bold text-at-green tabular-nums">{{ formatCurrency(entity.paid_try) }}</p>
            </div>
          </div>

          <div class="mb-2 flex items-center justify-between">
            <span class="text-xs text-slate-500">{{ t('remaining') }}</span>
            <span class="text-sm font-bold" :class="entity.remaining_try > 0 ? 'text-brand-600' : 'text-slate-400'">
              {{ formatCurrency(entity.remaining_try) }}
            </span>
          </div>

          <div class="mb-3 flex items-center gap-2">
            <div class="h-1.5 flex-1 rounded-full bg-slate-100">
              <div
                class="h-full rounded-full"
                :class="barClass(entity)"
                :style="{ width: pct(entity) + '%' }"
              />
            </div>
            <span class="text-[11px] tabular-nums text-slate-400 w-8 text-right">{{ pct(entity) }}%</span>
          </div>

          <div class="flex items-center justify-between text-xs text-slate-400 border-t border-slate-50 pt-2">
            <span>
              {{ entity.policy_count }} {{ t('polices') }}
              <template v-if="entity.insurance_companies?.length"> · {{ entity.insurance_companies.length }} {{ t('company_short') }}</template>
            </span>
            <span class="font-medium text-brand-600 flex items-center gap-0.5">
              {{ t('view_details') }}
              <FeatherIcon name="arrow-right" class="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </template>

    <SidePanel
      :show="detail.visible"
      :title="detailTitle"
      :subtitle="detailSubtitle"
      @close="detail.visible = false"
    >
      <div v-if="detailLoading" class="flex items-center justify-center p-12">
        <SkeletonLoader variant="list" :rows="6" />
      </div>
      <template v-else-if="detailData">
        <div class="mb-6 grid grid-cols-3 gap-3">
          <div class="rounded-lg bg-white p-3 text-center">
            <p class="text-xs text-slate-400">{{ t('policy_count') }}</p>
            <p class="text-lg font-bold">{{ detailData.totals?.policies || 0 }}</p>
          </div>
          <div class="rounded-lg bg-white p-3 text-center">
            <p class="text-xs text-slate-400">{{ t('total_commission') }}</p>
            <p class="text-lg font-bold text-brand-600">{{ formatCurrency(detailData.totals?.commission) }}</p>
          </div>
          <div class="rounded-lg bg-white p-3 text-center">
            <p class="text-xs text-slate-400">{{ t('remaining') }}</p>
            <p class="text-lg font-bold" :class="(detailData.totals?.remaining || 0) > 0 ? 'text-at-red' : 'text-at-green'">
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
              <div class="flex items-center gap-3">
                <div class="flex gap-4 text-xs">
                  <span class="text-slate-500">{{ t('accrued') }} {{ formatCurrency(ic.accrued) }}</span>
                  <span class="text-at-green">{{ t('paid') }} {{ formatCurrency(ic.paid) }}</span>
                    <span :class="ic.remaining > 0 ? 'text-at-red' : 'text-at-green'">
                      {{ ic.remaining > 0 ? formatCurrency(ic.remaining) : t('status_paid') }}
                    </span>
                </div>
                <button
                  v-if="ic.remaining > 0"
                  class="text-[10px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 hover:bg-brand-100 font-medium focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
                  @click="quickAddPayment(ic.name, ic.remaining)"
                >
                  <FeatherIcon name="plus" class="h-2.5 w-2.5" />
                  {{ t('add_collection') }}</button>
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
      </template>
    </SidePanel>

    <SidePanel
      :show="statementDialog.visible"
      :title="t('statement_dialog_title')"
      :subtitle="t('statement_dialog_subtitle')"
      @close="closeStatementDialog"
    >
      <div class="space-y-4">
        <div v-if="statementHistory.length" class="rounded-lg border border-slate-100 bg-slate-50 p-3">
          <p class="text-xs font-semibold text-slate-500 mb-2">{{ t('recent_imports') }}</p>
          <div class="space-y-1 max-h-32 overflow-y-auto">
            <div
              v-for="h in statementHistory.slice(0, 5)"
              :key="h.name"
              class="flex items-center justify-between text-[11px]"
            >
              <div class="flex items-center gap-2">
                <span class="text-slate-400">{{ h.created?.slice(0, 10) }}</span>
                <span class="text-slate-600">{{ h.external_ref || h.name }}</span>
                <span
                  :class="['px-1 rounded text-[10px] font-medium', h.import_source === 'commission_statement' ? 'bg-brand-50 text-brand-700' : 'bg-slate-200 text-slate-600']"
                >{{ h.import_source === 'missing_external' ? t('missing_external_label') : t('imported_label') }}</span>
              </div>
              <span class="text-slate-500 tabular-nums">{{ formatCurrency(h.local_total) }} / {{ formatCurrency(h.external_total) }}</span>
            </div>
          </div>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1">{{ t('statement_csv_label') }}</label>
          <textarea
            v-model="statementDialog.csvText"
            class="w-full h-32 rounded-lg border border-slate-200 p-3 text-sm font-mono"
            :placeholder="t('statement_csv_placeholder')"
          />
        </div>
        <div class="flex items-center gap-4">
          <div class="flex-1">
            <label class="block text-xs font-semibold text-slate-600 mb-1">{{ t('statement_delimiter_label') }}</label>
            <select v-model="statementDialog.delimiter" class="input h-9 py-1 text-sm w-full">
              <option value=",">,</option>
              <option value=";">;</option>
              <option value="\t">Tab</option>
            </select>
          </div>
        </div>

        <div v-if="statementDialog.error" class="rounded-lg border border-at-red/20 bg-at-red/5 px-3 py-2 text-xs text-at-red">
          {{ statementDialog.error }}
        </div>
        <div v-if="statementDialog.success" class="rounded-lg border border-at-green/20 bg-at-green/5 px-3 py-2 text-xs text-at-green">
          {{ statementDialog.success }}
        </div>

        <div v-if="statementPreview" class="space-y-3">
          <div class="grid grid-cols-4 gap-2">
            <div class="rounded-lg bg-slate-50 p-2 text-center">
              <p class="text-[10px] text-slate-400">{{ t('statement_total_rows') }}</p>
              <p class="text-sm font-bold">{{ statementPreview.summary.total_rows }}</p>
            </div>
            <div class="rounded-lg bg-at-green/5 p-2 text-center">
              <p class="text-[10px] text-slate-400">{{ t('statement_matched') }}</p>
              <p class="text-sm font-bold text-at-green">{{ statementPreview.summary.matched_rows }}</p>
            </div>
            <div class="rounded-lg bg-at-amber/5 p-2 text-center">
              <p class="text-[10px] text-slate-400">{{ t('statement_mismatched') }}</p>
              <p class="text-sm font-bold text-at-amber">{{ statementPreview.summary.mismatched_rows }}</p>
            </div>
            <div class="rounded-lg bg-slate-100 p-2 text-center">
              <p class="text-[10px] text-slate-400">{{ t('statement_unmatched') }}</p>
              <p class="text-sm font-bold text-slate-500">{{ statementPreview.summary.unmatched_rows }}</p>
            </div>
          </div>

          <ListTable
            :columns="statementColumns"
            :rows="statementTableRows"
            :loading="false"
            :locale="activeLocale"
          />

          <div class="flex justify-between text-xs text-slate-500">
            <span>{{ t('statement_local_commission') }}: <b>{{ formatCurrency(statementPreview.summary.total_local_commission_try) }}</b></span>
            <span>{{ t('statement_external_commission') }}: <b>{{ formatCurrency(statementPreview.summary.total_external_commission_try) }}</b></span>
            <span :class="statementPreview.summary.total_difference_try !== 0 ? 'text-at-red' : 'text-at-green'">
              {{ t('statement_difference') }}: <b>{{ formatCurrency(statementPreview.summary.total_difference_try) }}</b>
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2 pt-2 border-t border-slate-100">
          <ActionButton variant="secondary" size="sm" :disabled="statementLoading" @click="runStatementPreview">
            <FeatherIcon name="search" class="h-3 w-3" />
            {{ t('statement_preview') }}
          </ActionButton>
          <ActionButton variant="primary" size="sm" :disabled="!statementPreview || statementLoading" @click="runStatementImport">
            <FeatherIcon name="upload" class="h-3 w-3" />
            {{ t('statement_import') }}
          </ActionButton>
          <ActionButton variant="secondary" size="sm" @click="closeStatementDialog">
            {{ t('statement_close') }}
          </ActionButton>
        </div>
      </div>
    </SidePanel>
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
import { useCommissionEntityDetail } from "../../../composables/useCommissionEntityDetail";
import { COMMISSION_TRANSLATIONS } from "../i18n/translations";
import { useAtFormatting } from "../../../composables/useAtFormatting";
import { openTabularExport } from "../../../utils/listExport";
import WorkbenchPageLayout from "../../../components/app-shell/WorkbenchPageLayout.vue";
import SaaSMetricCard from "../../../components/app-shell/SaaSMetricCard.vue";
import SmartFilterBar from "../../../components/app-shell/SmartFilterBar.vue";
import SectionPanel from "../../../components/app-shell/SectionPanel.vue";
import ActionButton from "../../../components/app-shell/ActionButton.vue";
import ListTable from "../../../components/ui/ListTable.vue";
import SkeletonLoader from "../../../components/ui/SkeletonLoader.vue";
import SidePanel from "../../../components/ui/SidePanel.vue";

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

const { formatCurrency } = useAtFormatting(
  computed(() => activeLocale.value),
);

const { filters, loading, error, summary, entities, reconciliation, reload } =
  useCommissionBalances({ t });

const viewMode = ref("table");
const period = ref("");
const isReconciled = computed(() => {
  if (!period.value) return false;
  return entities.value.length > 0 && entities.value.every((e) => e.remaining_try <= 0);
});

const monthOptions = computed(() => {
  const now = new Date();
  const options = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    options.push({
      value: `${y}-${m}`,
      label: `${d.toLocaleDateString(activeLocale.value === "tr" ? "tr-TR" : "en-US", { month: "long", year: "numeric" })}`,
    });
  }
  return options;
});

function onPeriodChange() {
  if (period.value) {
    const [y, m] = period.value.split("-");
    const lastDay = new Date(Number(y), Number(m), 0).getDate();
    filters.from_date = `${y}-${m}-01`;
    filters.to_date = `${y}-${m}-${String(lastDay).padStart(2, "0")}`;
  } else {
    filters.from_date = "";
    filters.to_date = "";
  }
  reload();
}
const searchQuery = ref("");

const filteredEntities = computed(() => {
  if (!searchQuery.value) return entities.value;
  const q = searchQuery.value.toLowerCase();
  return entities.value.filter((e) => {
    if (e.entity_name.toLowerCase().includes(q)) return true;
    return (e.insurance_companies || []).some((ic) => ic.name.toLowerCase().includes(q));
  });
});

const selectedSet = reactive(new Set());
const selectedEntities = computed(() => filteredEntities.value.filter(e => selectedSet.has(e.entity_name)));

function toggleSelect(entityName) {
  if (selectedSet.has(entityName)) selectedSet.delete(entityName);
  else selectedSet.add(entityName);
}
function exportSelected() {
  const filtered = selectedEntities.value;
  if (!filtered.length) return;
  _doTabularExport(filtered);
}

const _commissionExportColumns = () => [
  t("sales_entity"), t("entity_type"), t("office_branch"),
  t("accrued"), t("paid"), t("remaining"), "%",
  t("policy_count"), t("company"),
];

function _doTabularExport(entitiesToExport) {
  const rows = entitiesToExport.map((e) => {
    const ics = (e.insurance_companies || []).map((ic) => ic.name).join("; ");
    const row = {};
    row[t("sales_entity")] = e.entity_name;
    row[t("entity_type")] = translateEntityType(e.entity_type);
    row[t("office_branch")] = e.office_branch;
    row[t("accrued")] = e.accrued_try;
    row[t("paid")] = e.paid_try;
    row[t("remaining")] = e.remaining_try;
    row["%"] = pct(e) + "%";
    row[t("policy_count")] = e.policy_count;
    row[t("company")] = ics;
    return row;
  });
  openTabularExport({
    permissionDoctypes: ["AT Policy"],
    exportKey: "commission_balances",
    title: t("title"),
    columns: _commissionExportColumns(),
    rows,
    filters: { insurance_company: filters.insurance_company || "", from_date: filters.from_date || "", to_date: filters.to_date || "" },
    format: "xlsx",
  });
}

const statementDialog = reactive({
  visible: false,
  csvText: "",
  delimiter: ",",
  error: "",
  success: "",
});

const statementLoading = ref(false);
const statementPreview = ref(null);

const statementPreviewResource = createResource({
  url: "acentem_takipte.acentem_takipte.domains.commissions.api.endpoints.upload_commission_statement_preview",
  auto: false,
});

const statementImportResource = createResource({
  url: "acentem_takipte.acentem_takipte.domains.commissions.api.endpoints.import_commission_statement",
  auto: false,
});

const statementHistoryResource = createResource({
  url: "acentem_takipte.acentem_takipte.domains.commissions.api.endpoints.get_commission_statement_history",
  auto: false,
});

const statementHistory = computed(() => unref(statementHistoryResource.data)?.history || []);

const lockPeriodResource = createResource({
  url: "acentem_takipte.acentem_takipte.domains.commissions.api.endpoints.lock_commission_period",
  auto: false,
});

async function lockCurrentPeriod() {
  if (!filters.insurance_company) return;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const firstDay = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;
  try {
    await lockPeriodResource.reload({
      insurance_company: filters.insurance_company,
      period_start: firstDay,
      period_end: lastDay,
    });
    reload();
  } catch (e) {
    statementDialog.error = e?.messages?.join(" ") || e?.message || "";
  }
}

const statementColumns = computed(() => [
  { key: "policy_no", label: t("policy_no"), type: "text" },
  { key: "external_ref", label: t("reference"), type: "text" },
  { key: "local_commission_try", label: t("statement_local_commission"), type: "currency" },
  { key: "external_commission_try", label: t("statement_external_commission"), type: "currency" },
  { key: "difference_try", label: t("statement_difference"), type: "currency" },
  { key: "match_status", label: t("status"), type: "text" },
]);

const statementTableRows = computed(() =>
  (statementPreview.value?.rows || []).map((r) => ({
    ...r,
    match_status: r.match_status === "Matched"
      ? t("statement_matched")
      : r.match_status === "Mismatched"
        ? t("statement_mismatched") + (r.mismatch_type ? ` (${r.mismatch_type})` : "")
        : t("statement_unmatched"),
  })),
);

function openStatementDialog() {
  statementDialog.visible = true;
  statementDialog.csvText = "";
  statementDialog.error = "";
  statementDialog.success = "";
  statementPreview.value = null;
  statementHistoryResource.reload({
    insurance_company: filters.insurance_company || undefined,
  });
}

function closeStatementDialog() {
  statementDialog.visible = false;
  statementPreview.value = null;
}

async function runStatementPreview() {
  const text = statementDialog.csvText.trim();
  if (!text) {
    statementDialog.error = t("statement_no_preview");
    return;
  }
  statementDialog.error = "";
  statementDialog.success = "";
  statementLoading.value = true;
  try {
    await statementPreviewResource.reload({
      csv_text: text,
      insurance_company: filters.insurance_company || undefined,
      office_branch: filters.office_branch || undefined,
      delimiter: statementDialog.delimiter,
    });
    statementPreview.value = unref(statementPreviewResource.data);
  } catch (e) {
    statementDialog.error = t("statement_import_error") + (e?.messages?.join(" ") || e?.message || "");
  } finally {
    statementLoading.value = false;
  }
}

async function runStatementImport() {
  statementDialog.error = "";
  statementDialog.success = "";
  statementLoading.value = true;
  try {
    await statementImportResource.reload({
      csv_text: statementDialog.csvText.trim(),
      insurance_company: filters.insurance_company || undefined,
      office_branch: filters.office_branch || undefined,
      delimiter: statementDialog.delimiter,
    });
    const result = unref(statementImportResource.data);
    const parts = [];
    if (result.imported) parts.push(`${result.imported} ${t("imported_label").toLowerCase()}`);
    if (result.skipped) parts.push(`${result.skipped} ${t("skipped_label").toLowerCase()}`);
    if (result.missing_external?.generated) parts.push(`${result.missing_external.generated} ${t("missing_external_label").toLowerCase()}`);
    if (result.open_items) parts.push(`${result.open_items} ${t("open_items_label").toLowerCase()}`);
    statementDialog.success = t("statement_import_success") + " — " + parts.join(", ");
    statementPreview.value = null;
    reload();
  } catch (e) {
    statementDialog.error = t("statement_import_error") + (e?.messages?.join(" ") || e?.message || "");
  } finally {
    statementLoading.value = false;
  }
}

const branchOptions = computed(() => branchStore?.options || []);

const { loading: detailLoading, data: detailData, load: loadDetail, reset: resetDetail } = useCommissionEntityDetail();

const detail = reactive({
  visible: false,
  entityName: "",
  entityType: "",
});

const detailTitle = computed(() => detailData.value?.entity?.full_name || detail.entityName);
const detailSubtitle = computed(() => `${detailData.value?.entity?.entity_type || detail.entityType} · ${detailData.value?.entity?.office_branch || ""}`);

async function openDetail(entity) {
  detail.visible = true;
  detail.entityName = entity.entity_name || "";
  detail.entityType = entity.entity_type || "";
  await loadDetail({
    entityName: detail.entityName,
    insuranceCompany: filters.insurance_company || undefined,
    fromDate: filters.from_date || undefined,
    toDate: filters.to_date || undefined,
  });
}

const tableColumns = computed(() => [
  { key: "_selected", label: "", type: "checkbox" },
  { key: "entity_display", label: t("sales_entity"), type: "text" },
  { key: "accrued_try", label: t("accrued"), type: "currency" },
  { key: "paid_try", label: t("paid"), type: "currency" },
  { key: "remaining_try", label: t("remaining"), type: "currency" },
  { key: "pct", label: "%", type: "text" },
]);

const tableRows = computed(() =>
  filteredEntities.value.map((e) => ({
      ...e,
      _selected: selectedSet.has(e.entity_name),
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
    status_icon: p.payment
      ? t("status_paid")
      : p.aging_days > 90
        ? t("status_overdue")
        : t("status_pending"),
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
      cls: k === "current" ? "bg-at-green/10 text-at-green" : k === "1_30" || k === "31_60" ? "bg-at-amber/10 text-at-amber" : "bg-at-red/10 text-at-red",
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
  return "bg-at-red";
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

const companyOptions = computed(() => {
  const map = {};
  for (const e of entities.value) {
    for (const ic of e.insurance_companies || []) {
      if (!map[ic.name]) map[ic.name] = { value: ic.name, label: ic.name };
    }
  }
  return Object.values(map);
});

function quickAddPayment(companyName, amount) {
  router.push({ name: "payments-board" });
}

function handleExport() {
  _doTabularExport(filteredEntities.value);
}

function onKeydown(e) {
  if (e.key === "Escape" && detail.visible) detail.visible = false;
}
onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));

reload();
</script>
