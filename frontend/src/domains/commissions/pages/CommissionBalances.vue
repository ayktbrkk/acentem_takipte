<template>
  <WorkbenchPageLayout
    :breadcrumb="t('commissions')"
    :title="t('commissions')"
    :subtitle="t('subtitle')"
  >
    <div class="flex flex-wrap items-center gap-3 mb-6">
      <select
        v-model="filters.office_branch"
        class="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white"
        @change="reload"
      >
        <option value="">{{ t("all") }} {{ t("office_branch") }}</option>
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
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          ]"
          @click="filters.aging_bucket = bucket.value; reload()"
        >
          {{ t(bucket.label) }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SkeletonLoader v-for="i in 6" :key="i" type="card" />
    </div>

    <div v-else-if="error" class="text-center py-12">
      <p class="text-slate-500 text-lg">{{ error }}</p>
      <button class="mt-4 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium" @click="reload">{{ t("retry") || "Retry" }}</button>
    </div>

    <div v-else-if="!entities.length" class="text-center py-12">
      <p class="text-slate-400 font-medium text-lg">{{ t("no_commissions") }}</p>
      <p class="text-slate-400 text-sm mt-1">{{ t("no_commissions_desc") }}</p>
    </div>

    <template v-else>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="rounded-xl border border-slate-200 p-4 bg-white">
          <p class="text-xs text-slate-400 uppercase tracking-wider">{{ t("total_accrued") }}</p>
          <p class="text-2xl font-bold text-slate-900 mt-1">{{ formatCurrency(summary.total_accrued_try) }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 p-4 bg-white">
          <p class="text-xs text-slate-400 uppercase tracking-wider">{{ t("total_paid") }}</p>
          <p class="text-2xl font-bold text-emerald-600 mt-1">{{ formatCurrency(summary.total_paid_try) }}</p>
        </div>
        <div class="rounded-xl border border-slate-200 p-4 bg-white">
          <p class="text-xs text-slate-400 uppercase tracking-wider">{{ t("total_remaining") }}</p>
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
              <span class="text-slate-500">{{ t("accrued") }}</span>
              <span class="font-semibold text-slate-900">{{ formatCurrency(entity.accrued_try) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">{{ t("paid") }}</span>
              <span class="font-semibold text-emerald-600">{{ formatCurrency(entity.paid_try) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-slate-500">{{ t("remaining") }}</span>
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
            <span v-if="entity.aging.current" class="text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">{{ t("aging_current") }} {{ formatCurrency(entity.aging.current) }}</span>
            <span v-if="entity.aging['1_30']" class="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">{{ t("aging_1_30") }} {{ formatCurrency(entity.aging['1_30']) }}</span>
            <span v-if="entity.aging['31_60']" class="text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">{{ t("aging_31_60") }} {{ formatCurrency(entity.aging['31_60']) }}</span>
            <span v-if="entity.aging['61_90']" class="text-[11px] px-1.5 py-0.5 rounded bg-red-50 text-red-700">{{ t("aging_61_90") }} {{ formatCurrency(entity.aging['61_90']) }}</span>
            <span v-if="entity.aging['90_plus']" class="text-[11px] px-1.5 py-0.5 rounded bg-red-100 text-red-800">{{ t("aging_90_plus") }} {{ formatCurrency(entity.aging['90_plus']) }}</span>
          </div>

          <button
            class="w-full text-center text-sm text-brand-600 hover:text-brand-700 font-medium py-1.5 border border-brand-200 rounded-lg transition-colors hover:bg-brand-50"
            @click="toggleDetail(entity.entity_name)"
          >
            {{ expandedEntity === entity.entity_name ? '\u25B2' : '\u25BC' }} {{ t("view_details") }}
          </button>

          <div v-if="expandedEntity === entity.entity_name" class="mt-3 pt-3 border-t border-slate-100">
            <div v-if="detailLoading" class="py-4 text-center text-sm text-slate-400">{{ t("loading") || "Loading..." }}</div>
            <div v-else class="space-y-3">
              <div v-if="detailPolicies.length" class="text-xs">
                <h4 class="font-semibold text-slate-500 uppercase mb-1.5">{{ t("accrued_policies") }}</h4>
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
                <h4 class="font-semibold text-slate-500 uppercase mb-1.5">{{ t("payment_history") }}</h4>
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
                {{ t("no_commissions") }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../../stores/auth";
import { useCommissionBalances } from "../../../composables/useCommissionBalances";
import { useCommissionEntityDetail } from "../../../composables/useCommissionEntityDetail";
import { COMMISSION_TRANSLATIONS } from "../i18n/translations";
import { useAtFormatting } from "../../../composables/useAtFormatting";
import { useBranchStore } from "../../../stores/branch";
import WorkbenchPageLayout from "../../../components/app-shell/WorkbenchPageLayout.vue";
import SkeletonLoader from "../../../components/ui/SkeletonLoader.vue";

const authStore = useAuthStore();
const branchStore = useBranchStore();
const router = useRouter();

const activeLocale = computed(() => (String(authStore.locale || "tr").toLowerCase().startsWith("tr") ? "tr" : "en"));

function t(key) {
  return COMMISSION_TRANSLATIONS[activeLocale.value]?.[key] || COMMISSION_TRANSLATIONS.en?.[key] || key;
}

const { formatCurrency, formatDate } = useAtFormatting(computed(() => activeLocale.value));

const { filters, loading, error, summary, entities, reload } = useCommissionBalances({ t });
const { loading: detailLoading, accruedPolicies: detailPolicies, payments: detailPayments, reload: reloadDetail } = useCommissionEntityDetail({ t });

const expandedEntity = ref(null);

const branchOptions = computed(() => branchStore?.options || []);

const agingOptions = [
  { value: "all", label: "all" },
  { value: "current", label: "aging_current" },
  { value: "1_30", label: "aging_1_30" },
  { value: "31_60", label: "aging_31_60" },
  { value: "61_90", label: "aging_61_90" },
  { value: "90_plus", label: "aging_90_plus" },
];

function progressPct(entity) {
  if (!entity.accrued_try || entity.accrued_try <= 0) return 0;
  return Math.min(100, Math.round((entity.paid_try / entity.accrued_try) * 100));
}

function progressBarClass(entity) {
  const pct = progressPct(entity);
  if (pct >= 75) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
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

function openPolicy(policyName) {
  router.push({ name: "policy-detail", params: { name: policyName } });
}

function agingColor(days) {
  if (days <= 0) return "text-emerald-600";
  if (days <= 30) return "text-amber-600";
  return "text-red-600";
}

reload();
</script>
