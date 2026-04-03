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
import { computed, unref } from "vue";

import StatusBadge from "@/components/ui/StatusBadge.vue";
import HeroStrip from "@/components/ui/HeroStrip.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import FieldGroup from "@/components/ui/FieldGroup.vue";
import { usePaymentDetailRuntime } from "../composables/usePaymentDetailRuntime";
import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";

const props = defineProps({ name: { type: String, required: true } });
const authStore = useAuthStore(getAppPinia());
const activeLocale = computed(() => unref(authStore.locale) || "en");
const paymentRuntime = usePaymentDetailRuntime({
  name: computed(() => props.name || ""),
  activeLocale,
});

const {
  t,
  payment,
  installments,
  documents,
  heroCells,
  paymentStatus,
  paymentFields,
  financialFields,
  linkedFields,
  recordFields,
  installmentLabel,
  formatDate,
  formatCurrency,
  backToList,
  collectPayment,
  addReceipt,
  sendReminder,
  openCustomer,
} = paymentRuntime;
</script>
