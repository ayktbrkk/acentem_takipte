<template>
  <ATQuickEntryModal
    v-model="showModel"
    :title="props.t('importStatementTitle')"
    :subtitle="props.t('importStatementSubtitle')"
    :eyebrow="props.eyebrow"
    :error="props.error"
    :loading="props.loading"
    :show-save-and-open="false"
    :labels="props.labels"
    @cancel="$emit('close')"
    @save="$emit('preview')"
  >
    <div class="space-y-6 py-2">
      <!-- Input Section -->
      <section class="at-card-premium">
        <header class="flex items-center gap-3 mb-6">
          <span class="at-label shrink-0 text-brand-600">{{ props.t("importStatementTitle") }}</span>
          <div class="h-px flex-1 bg-slate-100"></div>
        </header>

        <div class="space-y-5">
          <textarea
            v-model="csvModel"
            class="at-control-premium min-h-[180px] font-mono text-xs"
            :placeholder="props.t('importStatementPlaceholder')"
            :disabled="props.loading"
          />
          <div class="grid gap-5 md:grid-cols-3">
            <div class="at-input-group">
              <label class="at-label block">{{ props.t('insuranceCompany') }}</label>
              <input v-model.trim="insuranceCompanyModel" class="at-control-premium" type="text" :placeholder="props.t('insuranceCompany')" />
            </div>
            <div class="at-input-group">
              <label class="at-label block">{{ props.t('delimiter') }}</label>
              <input v-model.trim="delimiterModel" class="at-control-premium" type="text" maxlength="1" :placeholder="props.t('delimiter')" />
            </div>
            <div class="at-input-group">
              <label class="at-label block">Limit</label>
              <input v-model.number="limitModel" class="at-control-premium at-control-right" type="number" min="1" max="500" />
            </div>
          </div>
        </div>
      </section>

      <!-- Summary Metrics Section -->
      <section v-if="props.summary.total_rows" class="at-card-premium bg-slate-50 border-brand-100 shadow-inner">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article class="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <p class="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">{{ props.t("importTotalRows") }}</p>
            <p class="text-xl font-bold text-slate-900">{{ props.summary.total_rows || 0 }}</p>
          </article>
          <article class="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <p class="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">{{ props.t("importMatchedRows") }}</p>
            <p class="text-xl font-bold text-emerald-600">{{ props.summary.matched_rows || 0 }}</p>
          </article>
          <article class="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <p class="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">{{ props.t("importUnmatchedRows") }}</p>
            <p class="text-xl font-bold text-amber-600">{{ props.summary.unmatched_rows || 0 }}</p>
          </article>
          <article class="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
            <p class="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">{{ props.t("importAmount") }}</p>
            <p class="text-xl font-bold text-brand-700">{{ props.formatMoney(props.summary.total_amount_try || 0) }}</p>
          </article>
        </div>
        
        <div v-if="props.rows.length" class="flex justify-end mt-4">
          <ActionButton variant="primary" size="sm" :disabled="props.loading" @click="$emit('import')">
            {{ props.loading ? props.t("importingStatement") : props.t("importStatementRows") }}
          </ActionButton>
        </div>
      </section>

      <!-- Preview Data Section -->
      <section v-if="props.rows.length" class="at-card-premium p-0 overflow-hidden">
        <div class="grid grid-cols-5 gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <span>{{ props.t("externalRef") }}</span>
          <span>{{ props.t("policy") }}</span>
          <span>{{ props.t("payment") }}</span>
          <span class="text-right">{{ props.t("metricOverdueAmount") }}</span>
          <span>{{ props.t("status") }}</span>
        </div>
        <div class="max-h-64 overflow-y-auto">
          <div
            v-for="row in props.rows"
            :key="`${row.external_ref}-${row.policy_no}-${row.payment_no}`"
            class="grid grid-cols-5 gap-2 px-4 py-2.5 text-xs font-medium text-slate-700 border-b border-slate-100 last:border-0 hover:bg-slate-50"
          >
            <span>{{ row.external_ref || "-" }}</span>
            <span>{{ row.policy_no || "-" }}</span>
            <span>{{ row.payment_no || "-" }}</span>
            <span class="text-right font-mono">{{ props.formatMoney(row.amount_try || 0) }}</span>
            <span class="font-semibold" :class="row.match_status === 'Matched' ? 'text-emerald-600' : 'text-amber-600'">{{ row.match_status || "-" }}</span>
          </div>
        </div>
      </section>
    </div>
  </ATQuickEntryModal>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";
import ATQuickEntryModal from "../app-shell/ATQuickEntryModal.vue";

const showModel = defineModel("show", { type: Boolean, default: false });
const csvModel = defineModel("csv", { type: String, default: "" });
const insuranceCompanyModel = defineModel("insuranceCompany", { type: String, default: "" });
const delimiterModel = defineModel("delimiter", { type: String, default: "," });
const limitModel = defineModel("limit", { type: Number, default: 50 });

const props = defineProps({
  t: { type: Function, required: true },
  loading: { type: Boolean, default: false },
  error: { type: String, default: "" },
  eyebrow: { type: String, default: "" },
  labels: { type: Object, required: true },
  summary: { type: Object, required: true },
  rows: { type: Array, default: () => [] },
  formatMoney: { type: Function, required: true },
});

defineEmits(["close", "preview", "import"]);
</script>
