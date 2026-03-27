<template>
  <section class="page-shell space-y-4">
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
        <button class="btn btn-outline btn-sm" @click="backToList">{{ t("back") }}</button>
        <button class="btn btn-primary btn-sm" type="button" @click="openClaimDocuments">{{ t("documents") }}</button>
      </div>
    </div>

    <HeroStrip :cells="heroCells" />

    <div class="detail-body">
      <div class="detail-main">
        <SectionPanel :title="t('process')">
          <StepBar :steps="claimSteps" class="mb-4" />
          <FieldGroup :fields="processFields" :cols="4" />
        </SectionPanel>

        <SectionPanel :title="t('details')">
          <FieldGroup :fields="detailFields" :cols="2" />
        </SectionPanel>

        <SectionPanel :title="t('policy')">
          <div class="cursor-pointer rounded-lg bg-gray-50 p-3 hover:bg-gray-100" @click="openPolicy">
            <p class="text-sm font-medium text-gray-900">{{ claim.policy || '-' }}</p>
            <p class="mt-0.5 text-xs text-gray-400">{{ claim.branch || '-' }}</p>
          </div>
        </SectionPanel>

        <SectionPanel :title="t('documents')">
          <template #trailing>
            <button class="btn btn-sm" type="button" @click="openClaimDocuments">{{ t("openDocuments") }}</button>
          </template>
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
        </SectionPanel>

        <SectionPanel title="Ödeme Geçmişi">
          <div v-if="!payments.length" class="card-empty">Ödeme kaydı bulunamadı.</div>
          <table v-else class="min-w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="table-header">Tarih</th>
                <th class="table-header">Referans</th>
                <th class="table-header text-right">Tutar</th>
                <th class="table-header">Durum</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="row in payments" :key="row.name">
                <td class="table-cell">{{ formatDate(row.payment_date || row.creation) }}</td>
                <td class="table-cell">{{ row.payment_no || row.name }}</td>
                <td class="table-cell text-right">{{ formatCurrency(row.amount_try || row.amount || 0) }}</td>
                <td class="table-cell">{{ row.status || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </SectionPanel>

        <SectionPanel title="Ekspertiz Raporlari">
          <FieldGroup :fields="expertiseFields" :cols="2" />
        </SectionPanel>

        <SectionPanel :title="t('timeline')">
          <div class="mb-4">
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Notlar</p>
            <p class="text-sm text-gray-700">{{ claim.rejection_reason || claim.notes || '-' }}</p>
          </div>
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
        </SectionPanel>
      </div>

      <aside class="detail-sidebar space-y-4">
        <SectionPanel title="İlgili Kişiler">
          <FieldGroup :fields="peopleFields" :cols="1" />
        </SectionPanel>

        <SectionPanel title="Rezerv Bilgileri">
          <FieldGroup :fields="reserveFields" :cols="1" />
        </SectionPanel>

        <SectionPanel title="Ödeme Bilgileri">
          <FieldGroup :fields="paymentFields" :cols="1" />
        </SectionPanel>

        <SectionPanel title="Kayıt Meta">
          <FieldGroup :fields="recordMetaFields" :cols="1" />
          <button class="mt-3 btn btn-full btn-sm" @click="openCustomer">{{ t("customerRecord") }}</button>
        </SectionPanel>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed } from "vue";
import StatusBadge from "@/components/ui/StatusBadge.vue";
import HeroStrip from "@/components/ui/HeroStrip.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import FieldGroup from "@/components/ui/FieldGroup.vue";
import StepBar from "@/components/ui/StepBar.vue";
import { useClaimDetailRuntime } from "../composables/useClaimDetailRuntime";

const props = defineProps({ name: { type: String, required: true } });
const { t, claim, claimStatus, documents, payments, heroCells, processFields, detailFields, claimSteps, peopleFields, reserveFields, paymentFields, expertiseFields, recordMetaFields, formatDate, formatCurrency, backToList, openPolicy, openCustomer, openClaimDocuments } = useClaimDetailRuntime({
  name: computed(() => props.name || ""),
});
</script>

