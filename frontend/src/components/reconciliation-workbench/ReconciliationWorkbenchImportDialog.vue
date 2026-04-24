<template>
  <Dialog v-model="showModel" :options="{ title: props.t('importStatementTitle'), size: 'xl' }">
    <template #body-content>
      <QuickCreateDialogShell
        :error="props.error"
        :eyebrow="props.eyebrow"
        :subtitle="props.t('importStatementSubtitle')"
        :loading="props.loading"
        :show-save-and-open="false"
        :labels="props.labels"
        @cancel="$emit('close')"
        @save="$emit('preview')"
      >
        <div class="space-y-3">
          <textarea
            v-model="csvModel"
            class="input min-h-[180px] font-mono text-xs"
            :placeholder="props.t('importStatementPlaceholder')"
            :disabled="props.loading"
          />
          <div class="grid gap-3 md:grid-cols-3">
            <input v-model.trim="insuranceCompanyModel" class="input" type="text" :placeholder="props.t('insuranceCompany')" />
            <input v-model.trim="delimiterModel" class="input" type="text" maxlength="1" :placeholder="props.t('delimiter')" />
            <input v-model.number="limitModel" class="input" type="number" min="1" max="500" />
          </div>
          <div v-if="props.summary.total_rows" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article class="at-metric-card">
              <p class="at-metric-label">{{ props.t("importTotalRows") }}</p>
              <p class="at-metric-value">{{ props.summary.total_rows || 0 }}</p>
            </article>
            <article class="at-metric-card">
              <p class="at-metric-label">{{ props.t("importMatchedRows") }}</p>
              <p class="at-metric-value !text-emerald-700">{{ props.summary.matched_rows || 0 }}</p>
            </article>
            <article class="at-metric-card">
              <p class="at-metric-label">{{ props.t("importUnmatchedRows") }}</p>
              <p class="at-metric-value !text-amber-700">{{ props.summary.unmatched_rows || 0 }}</p>
            </article>
            <article class="at-metric-card">
              <p class="at-metric-label">{{ props.t("importAmount") }}</p>
              <p class="at-metric-value !text-brand-700">{{ props.formatMoney(props.summary.total_amount_try || 0) }}</p>
            </article>
          </div>
          <div v-if="props.rows.length" class="flex justify-end">
            <ActionButton variant="primary" size="sm" :disabled="props.loading" @click="$emit('import')">
              {{ props.loading ? props.t("importingStatement") : props.t("importStatementRows") }}
            </ActionButton>
          </div>
          <div v-if="props.rows.length" class="rounded-xl border border-slate-200 bg-white">
            <div class="grid grid-cols-5 gap-2 border-b border-slate-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span>{{ props.t("externalRef") }}</span>
              <span>{{ props.t("policy") }}</span>
              <span>{{ props.t("payment") }}</span>
              <span>{{ props.t("metricOverdueAmount") }}</span>
              <span>{{ props.t("status") }}</span>
            </div>
            <div
              v-for="row in props.rows"
              :key="`${row.external_ref}-${row.policy_no}-${row.payment_no}`"
              class="grid grid-cols-5 gap-2 px-3 py-2 text-sm text-slate-700"
            >
              <span>{{ row.external_ref || "-" }}</span>
              <span>{{ row.policy_no || "-" }}</span>
              <span>{{ row.payment_no || "-" }}</span>
              <span>{{ props.formatMoney(row.amount_try || 0) }}</span>
              <span :class="row.match_status === 'Matched' ? 'text-emerald-700' : 'text-amber-700'">{{ row.match_status || "-" }}</span>
            </div>
          </div>
        </div>
      </QuickCreateDialogShell>
    </template>
  </Dialog>
</template>

<script setup>
import { Dialog } from "frappe-ui";

import ActionButton from "../app-shell/ActionButton.vue";
import QuickCreateDialogShell from "../app-shell/QuickCreateDialogShell.vue";

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
