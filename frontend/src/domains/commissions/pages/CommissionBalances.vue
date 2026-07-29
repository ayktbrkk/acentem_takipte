<template>
  <WorkbenchPageLayout
    :breadcrumb="t('commissions')"
    :title="t('commissions')"
    :subtitle="t('subtitle')"
  >
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-3">
        <select
          v-model="filters.office_branch"
          class="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white"
          @change="reload"
        >
          <option value="">{{ t('all') }} {{ t('office_branch') }}</option>
          <option v-for="b in branchOptions" :key="b.value" :value="b.value">{{ b.label }}</option>
        </select>
        <div class="flex gap-1">
          <button
            v-for="bucket in agingOptions"
            :key="bucket.value"
            type="button"
            :class="[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
              filters.aging_bucket === bucket.value
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
            ]"
            @click="filters.aging_bucket = bucket.value; reload()"
          >
            {{ t(bucket.label) }}
          </button>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white hover:bg-slate-50"
          @click="handleExport"
        >
          {{ t('export') || 'Export' }}
        </button>
        <div class="flex border border-slate-200 rounded-lg overflow-hidden">
          <button
            :class="['px-3 py-1.5 text-sm', viewMode === 'table' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600']"
            @click="viewMode = 'table'"
          >&#x1F4CB;</button>
          <button
            :class="['px-3 py-1.5 text-sm', viewMode === 'card' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600']"
            @click="viewMode = 'card'"
          >&#x1F5C2;</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="py-12">
      <SkeletonLoader v-for="i in 5" :key="i" variant="list" :rows="1" />
    </div>

    <div v-else-if="error" class="py-12 text-center text-slate-500">
      {{ error }}
      <button class="text-brand-600 ml-2 font-medium" @click="reload">
        {{ t('retry') || 'Retry' }}
      </button>
    </div>

    <div v-else-if="!hasData" class="py-12 text-center text-slate-400">
      {{ t('no_commissions') }}
    </div>

    <template v-else-if="viewMode === 'table'">
      <div class="grid grid-cols-3 gap-4 mb-4">
        <div class="rounded-lg border border-slate-200 p-3 bg-white">
          <p class="text-xs text-slate-400">{{ t('total_accrued') }}</p>
          <p class="text-lg font-bold">{{ formatCurrency(summary.total_accrued_try) }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-3 bg-white">
          <p class="text-xs text-slate-400">{{ t('total_paid') }}</p>
          <p class="text-lg font-bold text-emerald-600">{{ formatCurrency(summary.total_paid_try) }}</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-3 bg-white">
          <p class="text-xs text-slate-400">{{ t('total_remaining') }}</p>
          <p class="text-lg font-bold text-brand-600">{{ formatCurrency(summary.total_remaining_try) }}</p>
        </div>
      </div>

      <div class="rounded-lg border border-slate-200 overflow-hidden bg-white">
        <table class="w-full text-sm">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr class="text-left text-xs font-semibold text-slate-500 uppercase">
              <th class="py-2.5 px-3 w-8">
                <input type="checkbox" :checked="allReconciled" class="rounded" @change="toggleAllReconciled">
              </th>
              <th class="py-2.5 px-3">{{ t('insurance_company') || 'Sigorta Şirketi' }}</th>
              <th class="py-2.5 px-3 text-right">{{ t('accrued') }}</th>
              <th class="py-2.5 px-3 text-right">{{ t('paid') }}</th>
              <th class="py-2.5 px-3 text-right">{{ t('remaining') }}</th>
              <th class="py-2.5 px-3 text-center w-16">%</th>
              <th class="py-2.5 px-3">{{ t('aging_filter') || 'Bekleyen' }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="ic in insuranceCompanies" :key="ic.name">
              <tr
                class="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                @click="toggleIcExpand(ic.name)"
              >
                <td class="py-2.5 px-3">
                  <input
                    type="checkbox"
                    :checked="isIcReconciled(ic.name)"
                    class="rounded"
                    @click.stop
                    @change="toggleIcReconciled(ic.name)"
                  >
                </td>
                <td class="py-2.5 px-3 font-semibold text-slate-900">
                  <span class="mr-1">{{ expandedIc === ic.name ? '\u25BC' : '\u25B6' }}</span>{{ ic.name }}
                  <span class="text-xs text-slate-400 ml-2">{{ ic.entity_count }} birim</span>
                </td>
                <td class="py-2.5 px-3 text-right font-mono">{{ formatCurrency(ic.accrued_try) }}</td>
                <td class="py-2.5 px-3 text-right font-mono text-emerald-600">{{ formatCurrency(ic.paid_try) }}</td>
                <td
                  class="py-2.5 px-3 text-right font-mono"
                  :class="ic.remaining_try > 0 ? 'text-brand-600 font-semibold' : 'text-slate-400'"
                >{{ formatCurrency(ic.remaining_try) }}</td>
                <td class="py-2.5 px-3 text-center">
                  <span :class="['px-1.5 py-0.5 rounded text-xs font-medium', pctClass(ic)]">{{ pctLabel(ic) }}</span>
                </td>
                <td class="py-2.5 px-3 text-xs text-slate-400">{{ ic.aging_summary || '' }}</td>
              </tr>
              <template v-if="expandedIc === ic.name">
                <tr
                  v-for="entity in ic.entities"
                  :key="entity.entity_name"
                  class="border-b border-slate-50 hover:bg-brand-50/30 cursor-pointer"
                  @click="openPolicyDetail(entity.entity_name, ic.name)"
                >
                  <td class="py-2 px-3"></td>
                  <td class="py-2 px-3 pl-8 text-sm">
                    <span class="font-medium">{{ entity.entity_name }}</span>
                    <span class="text-xs text-slate-400 ml-1.5">{{ entity.entity_type }}</span>
                  </td>
                  <td class="py-2 px-3 text-right text-xs font-mono">{{ formatCurrency(entity.accrued_try) }}</td>
                  <td class="py-2 px-3 text-right text-xs font-mono text-emerald-600">{{ formatCurrency(entity.paid_try) }}</td>
                  <td
                    class="py-2 px-3 text-right text-xs font-mono"
                    :class="entity.remaining_try > 0 ? 'text-brand-600' : 'text-slate-400'"
                  >{{ formatCurrency(entity.remaining_try) }}</td>
                  <td class="py-2 px-3 text-center">
                    <div class="w-16 h-1 rounded-full bg-slate-100 mx-auto">
                      <div
                        class="h-full rounded-full"
                        :class="barClass(entity)"
                        :style="{ width: entityPct(entity) + '%' }"
                      />
                    </div>
                  </td>
                  <td class="py-2 px-3 text-xs text-slate-400">{{ entity.policy_count }} poliçe</td>
                </tr>
              </template>
            </template>
            <tr class="bg-slate-50 font-semibold">
              <td class="py-2.5 px-3"></td>
              <td class="py-2.5 px-3 text-slate-700">{{ t('total') || 'TOPLAM' }}</td>
              <td class="py-2.5 px-3 text-right">{{ formatCurrency(summary.total_accrued_try) }}</td>
              <td class="py-2.5 px-3 text-right text-emerald-600">{{ formatCurrency(summary.total_paid_try) }}</td>
              <td class="py-2.5 px-3 text-right text-brand-600">{{ formatCurrency(summary.total_remaining_try) }}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="policyDetail.visible"
        class="fixed inset-0 bg-black/30 z-40 flex items-start justify-center pt-20"
        @click.self="policyDetail.visible = false"
      >
        <div class="bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-auto">
          <div class="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h3 class="font-semibold text-lg">{{ policyDetail.entity }}</h3>
              <p class="text-sm text-slate-500">{{ policyDetail.ic }}</p>
            </div>
            <button class="text-slate-400 hover:text-slate-600 text-xl" @click="policyDetail.visible = false">&times;</button>
          </div>
          <div v-if="policyDetail.loading" class="p-6 text-center text-slate-400">Yükleniyor...</div>
          <div v-else class="p-6">
            <div class="grid grid-cols-4 gap-3 mb-4">
              <div class="bg-slate-50 rounded p-2 text-center">
                <p class="text-xs text-slate-400">Poliçe</p>
                <p class="font-bold">{{ policyDetail.totals?.policies || 0 }}</p>
              </div>
              <div class="bg-slate-50 rounded p-2 text-center">
                <p class="text-xs text-slate-400">Prim</p>
                <p class="font-bold">{{ formatCurrency(policyDetail.totals?.gross_premium) }}</p>
              </div>
              <div class="bg-slate-50 rounded p-2 text-center">
                <p class="text-xs text-slate-400">Komisyon</p>
                <p class="font-bold text-brand-600">{{ formatCurrency(policyDetail.totals?.commission) }}</p>
              </div>
              <div class="bg-slate-50 rounded p-2 text-center">
                <p class="text-xs text-slate-400">Kalan</p>
                <p
                  class="font-bold"
                  :class="(policyDetail.totals?.remaining || 0) > 0 ? 'text-red-600' : 'text-emerald-600'"
                >{{ formatCurrency(policyDetail.totals?.remaining) }}</p>
              </div>
            </div>
            <table class="w-full text-sm">
              <thead class="bg-slate-50">
                <tr class="text-left text-xs font-semibold text-slate-500 uppercase">
                  <th class="py-2 px-2">#</th>
                  <th class="py-2 px-2">Poliçe No</th>
                  <th class="py-2 px-2">Müşteri</th>
                  <th class="py-2 px-2">Branş</th>
                  <th class="py-2 px-2 text-right">Komisyon</th>
                  <th class="py-2 px-2 text-right">Prim</th>
                  <th class="py-2 px-2">Ödeme</th>
                  <th class="py-2 px-2 text-center w-12">Durum</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(p, idx) in policyDetail.policies"
                  :key="p.policy_name"
                  class="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                  @click="openPolicy(p.policy_name)"
                >
                  <td class="py-2 px-2 text-slate-400 text-xs">{{ idx + 1 }}</td>
                  <td class="py-2 px-2 font-medium">{{ p.policy_no }}</td>
                  <td class="py-2 px-2 text-xs">{{ p.customer_name }}</td>
                  <td class="py-2 px-2 text-xs text-slate-500">{{ p.branch }}</td>
                  <td class="py-2 px-2 text-right font-mono text-xs">{{ formatCurrency(p.commission_amount_try) }}</td>
                  <td class="py-2 px-2 text-right font-mono text-xs text-slate-500">{{ formatCurrency(p.gross_premium) }}</td>
                  <td class="py-2 px-2" @click.stop>
                    <template v-if="p.payment">
                      <span
                        class="text-brand-600 hover:underline cursor-pointer text-xs"
                        @click="openPayment(p.payment.name)"
                      >{{ p.payment.payment_no }}</span>
                      <span class="text-slate-400 text-xs ml-1">{{ formatDate(p.payment.payment_date) }}</span>
                    </template>
                    <span v-else class="text-xs text-slate-400">Bekliyor</span>
                  </td>
                  <td class="py-2 px-2 text-center">
                    <span :class="['text-xs', agingLabelClass(p.aging_days)]">{{ agingLabel(p.aging_bucket) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="viewMode === 'card'">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="rounded-xl border border-slate-200 p-4 bg-white">
          <p class="text-xs text-slate-400 uppercase tracking-wider">{{ t('total_accrued') }}</p>
          <p class="text-2xl font-bold text-slate-900 mt-1">{{ formatCurrency(summary.total_accrued_try) }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 p-4 bg-white">
          <p class="text-xs text-slate-400 uppercase tracking-wider">{{ t('total_paid') }}</p>
          <p class="text-2xl font-bold text-emerald-600 mt-1">{{ formatCurrency(summary.total_paid_try) }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 p-4 bg-white">
          <p class="text-xs text-slate-400 uppercase tracking-wider">{{ t('total_remaining') }}</p>
          <p class="text-2xl font-bold text-brand-600 mt-1">{{ formatCurrency(summary.total_remaining_try) }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="entity in entities"
          :key="entity.entity_name"
          class="rounded-xl border border-slate-200 p-5 bg-white hover:shadow-sm transition-shadow"
        >
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="font-semibold text-slate-900">{{ entity.entity_name }}</h3>
              <p class="text-xs text-slate-400 mt-0.5">{{ entity.office_branch }}</p>
            </div>
            <span class="px-2 py-0.5 rounded text-[11px] font-medium bg-brand-50 text-brand-700">{{ entity.entity_type }}</span>
          </div>

          <div class="space-y-1.5 mb-3">
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">{{ t('accrued') }}</span>
              <span class="font-semibold text-slate-900">{{ formatCurrency(entity.accrued_try) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">{{ t('paid') }}</span>
              <span class="font-semibold text-emerald-600">{{ formatCurrency(entity.paid_try) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">{{ t('remaining') }}</span>
              <span class="font-semibold text-brand-600">{{ formatCurrency(entity.remaining_try) }}</span>
            </div>
          </div>

          <div class="w-full h-1.5 rounded-full bg-slate-100 mb-3">
            <div
              class="h-full rounded-full transition-all"
              :class="progressBarClass(entity)"
              :style="{ width: progressPct(entity) + '%' }"
            />
          </div>

          <div v-if="hasAging(entity)" class="flex flex-wrap gap-1 mb-3">
            <span v-if="entity.aging.current" class="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">{{ t('aging_current') }} {{ formatCurrency(entity.aging.current) }}</span>
            <span v-if="entity.aging['1_30']" class="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">{{ t('aging_1_30') }} {{ formatCurrency(entity.aging['1_30']) }}</span>
            <span v-if="entity.aging['31_60']" class="text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">{{ t('aging_31_60') }} {{ formatCurrency(entity.aging['31_60']) }}</span>
            <span v-if="entity.aging['61_90']" class="text-[11px] px-1.5 py-0.5 rounded bg-red-50 text-red-700">{{ t('aging_61_90') }} {{ formatCurrency(entity.aging['61_90']) }}</span>
            <span v-if="entity.aging['90_plus']" class="text-[11px] px-1.5 py-0.5 rounded bg-red-100 text-red-800">{{ t('aging_90_plus') }} {{ formatCurrency(entity.aging['90_plus']) }}</span>
          </div>

          <button
            class="w-full text-center text-sm text-brand-600 hover:text-brand-700 font-medium py-1.5 border border-brand-200 rounded-lg transition-colors hover:bg-brand-50"
            @click="toggleDetail(entity.entity_name)"
          >
            {{ expandedEntity === entity.entity_name ? '\u25B2' : '\u25BC' }} {{ t('view_details') }}
          </button>

          <div v-if="expandedEntity === entity.entity_name" class="mt-3 pt-3 border-t border-slate-100">
            <div v-if="detailLoading" class="py-4 text-center text-sm text-slate-400">Yükleniyor...</div>
            <div v-else class="space-y-3">
              <div v-if="detailPolicies.length" class="text-xs">
                <h4 class="font-semibold text-slate-500 uppercase mb-1.5">{{ t('accrued_policies') }}</h4>
                <div
                  v-for="p in detailPolicies"
                  :key="p.policy_name"
                  class="flex items-center justify-between px-2 py-1.5 rounded bg-slate-50 hover:bg-slate-100 cursor-pointer mb-0.5"
                  @click="openPolicy(p.policy_name)"
                >
                  <span class="font-medium text-slate-900 w-32 truncate">{{ p.policy_no }}</span>
                  <span class="text-slate-500 w-24 truncate">{{ p.customer_name }}</span>
                  <span class="font-semibold text-slate-900 w-20 text-right">{{ formatCurrency(p.commission_amount_try) }}</span>
                  <span :class="agingColor(p.aging_days)" class="w-12 text-right">{{ p.aging_days }}g</span>
                </div>
              </div>
              <div v-if="detailPayments.length" class="text-xs">
                <h4 class="font-semibold text-slate-500 uppercase mb-1.5">{{ t('payment_history') }}</h4>
                <div
                  v-for="p in detailPayments"
                  :key="p.name"
                  class="flex items-center justify-between px-2 py-1.5 rounded bg-slate-50 mb-0.5"
                >
                  <span class="font-medium text-slate-900 w-32 truncate">{{ p.payment_no }}</span>
                  <span class="text-slate-500 w-24">{{ formatDate(p.payment_date) }}</span>
                  <span class="font-semibold text-slate-900 w-20 text-right">{{ formatCurrency(p.amount_try) }}</span>
                  <span class="text-slate-400 w-20 truncate text-right">{{ p.reference_no }}</span>
                </div>
              </div>
              <div v-if="!detailPolicies.length && !detailPayments.length" class="text-slate-400 text-center py-2">
                {{ t('no_commissions') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { createResource } from "frappe-ui";
import { useAuthStore } from "../../../stores/auth";
import { useBranchStore } from "../../../stores/branch";
import { useCommissionBalances } from "../../../composables/useCommissionBalances";
import { useCommissionEntityDetail } from "../../../composables/useCommissionEntityDetail";
import { COMMISSION_TRANSLATIONS } from "../i18n/translations";
import { useAtFormatting } from "../../../composables/useAtFormatting";
import WorkbenchPageLayout from "../../../components/app-shell/WorkbenchPageLayout.vue";
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

const {
  filters,
  loading,
  error,
  summary,
  entities,
  insuranceCompanies,
  reload,
} = useCommissionBalances({ t });

const {
  loading: detailLoading,
  accruedPolicies: detailPolicies,
  payments: detailPayments,
  reload: reloadDetail,
} = useCommissionEntityDetail({ t });

const viewMode = ref("table");
const expandedIc = ref(null);
const expandedEntity = ref(null);
const reconciledIcs = reactive(new Set());

const policyDetail = reactive({
  visible: false,
  loading: false,
  entity: "",
  ic: "",
  policies: [],
  totals: {},
});

const policyDetailResource = createResource({
  url: "acentem_takipte.acentem_takipte.domains.commissions.api.endpoints.get_commission_policy_detail",
  auto: false,
});

const branchOptions = computed(() => branchStore?.options || []);

const agingOptions = [
  { value: "all", label: "all" },
  { value: "current", label: "aging_current" },
  { value: "1_30", label: "aging_1_30" },
  { value: "31_60", label: "aging_31_60" },
  { value: "61_90", label: "aging_61_90" },
  { value: "90_plus", label: "aging_90_plus" },
];

const hasData = computed(() => insuranceCompanies.value.length > 0);

function toggleIcExpand(icName) {
  expandedIc.value = expandedIc.value === icName ? null : icName;
}

function icPct(ic) {
  if (!ic.accrued_try || ic.accrued_try <= 0) return 0;
  return Math.min(100, Math.round((ic.paid_try / ic.accrued_try) * 100));
}

function pctClass(ic) {
  const percent = icPct(ic);
  if (percent >= 75) return "bg-emerald-100 text-emerald-700";
  if (percent >= 50) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function pctLabel(ic) {
  return "%" + icPct(ic);
}

function entityPct(entity) {
  if (!entity.accrued_try || entity.accrued_try <= 0) return 0;
  return Math.min(100, Math.round((entity.paid_try / entity.accrued_try) * 100));
}

function barClass(entity) {
  const percent = entityPct(entity);
  if (percent >= 75) return "bg-emerald-500";
  if (percent >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function agingLabel(bucket) {
  const map = {
    current: "Güncel",
    "1_30": "1-30g",
    "31_60": "31-60g",
    "61_90": "61-90g",
    "90_plus": "90+g",
  };
  return map[bucket] || "";
}

function agingLabelClass(days) {
  if (days <= 0) return "text-emerald-600";
  if (days <= 30) return "text-amber-600";
  return "text-red-600";
}

function toggleIcReconciled(icName) {
  if (reconciledIcs.has(icName)) {
    reconciledIcs.delete(icName);
  } else {
    reconciledIcs.add(icName);
  }
}

function isIcReconciled(icName) {
  return reconciledIcs.has(icName);
}

function toggleAllReconciled(event) {
  if (event.target.checked) {
    insuranceCompanies.value.forEach((ic) => reconciledIcs.add(ic.name));
  } else {
    reconciledIcs.clear();
  }
}

const allReconciled = computed(() => {
  return (
    insuranceCompanies.value.length > 0 &&
    insuranceCompanies.value.every((ic) => reconciledIcs.has(ic.name))
  );
});

async function openPolicyDetail(entity, ic) {
  policyDetail.visible = true;
  policyDetail.loading = true;
  policyDetail.entity = entity;
  policyDetail.ic = ic;
  policyDetail.policies = [];
  policyDetail.totals = {};
  try {
    await policyDetailResource.reload({
      entity_name: entity,
      insurance_company: ic,
    });
    const data = policyDetailResource.data;
    if (data) {
      policyDetail.policies = Array.isArray(data.policies)
        ? data.policies
        : [];
      policyDetail.totals = data.totals || {};
    }
  } catch {
    policyDetail.policies = [];
    policyDetail.totals = {};
  } finally {
    policyDetail.loading = false;
  }
}

function openPolicy(policyName) {
  router.push({ name: "policy-detail", params: { name: policyName } });
}

function openPayment(paymentName) {
  router.push({ name: "payment-detail", params: { name: paymentName } });
}

function handleExport() {
  const rows = [];
  rows.push(
    ["sigorta_sirketi", "tahakkuk", "odenen", "kalan", "yuzde"].join(";"),
  );
  for (const ic of insuranceCompanies.value) {
    rows.push(
      [
        ic.name,
        ic.accrued_try,
        ic.paid_try,
        ic.remaining_try,
        icPct(ic),
      ].join(";"),
    );
    for (const entity of ic.entities) {
      rows.push(
        [
          "  " + entity.entity_name,
          entity.accrued_try,
          entity.paid_try,
          entity.remaining_try,
          entityPct(entity),
        ].join(";"),
      );
    }
  }
  const csvContent = rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "komisyon_raporu.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function progressPct(entity) {
  if (!entity.accrued_try || entity.accrued_try <= 0) return 0;
  return Math.min(100, Math.round((entity.paid_try / entity.accrued_try) * 100));
}

function progressBarClass(entity) {
  const pctVal = progressPct(entity);
  if (pctVal >= 75) return "bg-emerald-500";
  if (pctVal >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function hasAging(entity) {
  const a = entity.aging || {};
  return Object.values(a).some((v) => v > 0);
}

function toggleDetail(entityName) {
  if (expandedEntity.value === entityName) {
    expandedEntity.value = null;
  } else {
    expandedEntity.value = entityName;
    reloadDetail(entityName);
  }
}

function agingColor(days) {
  if (days <= 0) return "text-emerald-600";
  if (days <= 30) return "text-amber-600";
  return "text-red-600";
}

reload();
</script>
