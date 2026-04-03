<template>
  <SectionPanel :title="t('previewSection')" :show-count="false">
    <div class="space-y-4">
      <QuickCreateFormRenderer
        :fields="policyReviewFields"
        :model="model"
        :field-errors="fieldErrors"
        :disabled="disabled"
        :locale="activeLocale"
        :options-map="optionsMap"
      />
      <div class="qc-summary-shell">
        <div class="qc-summary-card">
          <p class="qc-accent-label">{{ t("summaryCustomerSection") }}</p>
          <div class="mt-2 space-y-1">
            <p><strong>{{ t("summaryCustomer") }}:</strong> {{ summaryCustomerName }}</p>
            <p><strong>{{ t("summaryCustomerType") }}:</strong> {{ summaryCustomerType }}</p>
            <p><strong>{{ t("summaryTaxId") }}:</strong> {{ summaryCustomerTaxId }}</p>
            <p><strong>{{ t("summaryBirthDate") }}:</strong> {{ summaryCustomerBirthDate }}</p>
            <p><strong>{{ t("summaryPhone") }}:</strong> {{ summaryCustomerPhone }}</p>
            <p><strong>{{ t("summaryEmail") }}:</strong> {{ summaryCustomerEmail }}</p>
            <p><strong>{{ t("summarySourceOffer") }}:</strong> {{ model.source_offer || "-" }}</p>
          </div>
        </div>
        <div class="qc-summary-card">
          <p class="qc-accent-label">{{ t("summaryPolicySection") }}</p>
          <div class="mt-2 space-y-1">
            <p><strong>{{ t("summaryPolicy") }}:</strong> {{ model.policy_no || "-" }}</p>
            <p><strong>{{ t("summaryBranch") }}:</strong> {{ model.branch || "-" }}</p>
            <p><strong>{{ t("summaryCompany") }}:</strong> {{ model.insurance_company || "-" }}</p>
            <p><strong>{{ t("summarySalesEntity") }}:</strong> {{ model.sales_entity || "-" }}</p>
            <p><strong>{{ t("summaryStatus") }}:</strong> {{ model.status || "-" }}</p>
            <p><strong>{{ t("summaryCurrency") }}:</strong> {{ model.currency || "-" }}</p>
          </div>
        </div>
        <div class="qc-summary-card">
          <p class="qc-accent-label">{{ t("summaryCoverageSection") }}</p>
          <div class="mt-2 space-y-1">
            <p><strong>{{ t("summaryIssueDate") }}:</strong> {{ model.issue_date || "-" }}</p>
            <p><strong>{{ t("summaryStartDate") }}:</strong> {{ model.start_date || "-" }}</p>
            <p><strong>{{ t("summaryEndDate") }}:</strong> {{ model.end_date || "-" }}</p>
            <p><strong>{{ t("summaryGrossPremium") }}:</strong> {{ model.gross_premium || "-" }}</p>
            <p><strong>{{ t("summaryNetPremium") }}:</strong> {{ model.net_premium || "-" }}</p>
            <p><strong>{{ t("summaryTaxAmount") }}:</strong> {{ model.tax_amount || "-" }}</p>
            <p><strong>{{ t("summaryCommission") }}:</strong> {{ model.commission_amount || "-" }}</p>
          </div>
        </div>
        <div class="qc-summary-card">
          <p class="qc-accent-label">{{ t("summaryNotesSection") }}</p>
          <p class="mt-2 whitespace-pre-wrap text-sm text-slate-700">{{ model.notes || "-" }}</p>
        </div>
      </div>
    </div>
  </SectionPanel>
</template>

<script setup>
import QuickCreateFormRenderer from "../app-shell/QuickCreateFormRenderer.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";

defineProps({
  model: { type: Object, required: true },
  fieldErrors: { type: Object, default: () => ({}) },
  optionsMap: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
  activeLocale: { type: String, default: "en" },
  policyReviewFields: { type: Array, default: () => [] },
  summaryCustomerName: { type: String, default: "-" },
  summaryCustomerType: { type: String, default: "-" },
  summaryCustomerTaxId: { type: String, default: "-" },
  summaryCustomerBirthDate: { type: String, default: "-" },
  summaryCustomerPhone: { type: String, default: "-" },
  summaryCustomerEmail: { type: String, default: "-" },
  t: { type: Function, required: true },
});
</script>
