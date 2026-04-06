<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="pendingRows.length"
    :record-count-label="t('recordCount')"
  >
    <article v-if="!canManage" class="qc-warning-banner" role="status" aria-live="polite">
      <p class="qc-warning-banner__text">{{ t("permissionDenied") }}</p>
    </article>

    <BreakGlassApprovalsActionBar v-if="canManage" :loading="loading" :t="t" @refresh="loadPending" />
    <BreakGlassApprovalsTableSection
      v-if="canManage"
      :pending-rows="pendingRows"
      :loading="loading"
      :error-text="errorText"
      :action-result="actionResult"
      :action-form="actionForm"
      :is-row-busy="isRowBusy"
      :map-access-type="mapAccessType"
      :t="t"
      @refresh="loadPending"
      @approve="approve"
      @reject="reject"
    />
  </WorkbenchPageLayout>
</template>

<script setup>

import BreakGlassApprovalsActionBar from "../components/break-glass-approvals/BreakGlassApprovalsActionBar.vue";
import BreakGlassApprovalsTableSection from "../components/break-glass-approvals/BreakGlassApprovalsTableSection.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";
import { useBreakGlassApprovals } from "../composables/useBreakGlassApprovals";

const authStore = useAuthStore(getAppPinia());

const copy = {
  tr: {
    breadcrumb: "Kontrol Merkezi / Acil Erişim Onayları",
    title: "Break-Glass Onay Kuyruğu",
    subtitle: "Sadece System Manager erişimi: bekleyen acil erişim taleplerini yönetin",
    recordCount: "bekleyen talep",
    pendingTitle: "Bekleyen Talepler",
    request: "Talep",
    accessType: "Erişim tipi",
    createdAt: "Oluşturma",
    justification: "Gerekçe",
    actions: "İşlemler",
    durationHours: "Süre (saat)",
    comments: "Yönetici notu",
    commentsPlaceholder: "Opsiyonel yorum",
    approve: "Onayla",
    reject: "Reddet",
    refresh: "Yenile",
    loading: "Yükleniyor",
    emptyTitle: "Bekleyen talep yok",
    emptyDescription: "Onay bekleyen break-glass talebi bulunmuyor.",
    permissionDenied: "Bu ekrana erişim için System Manager rolü gerekir.",
    actionDone: "İşlem tamamlandı",
    unknownError: "Beklenmeyen bir hata oluştu.",
    customerData: "Müşteri Verisi",
    customerFinancials: "Müşteri Finansalları",
    systemAdmin: "Sistem Yönetimi",
    reportingOverride: "Raporlama İstisnası",
  },
  en: {
    breadcrumb: "Control Center / Break-Glass Approvals",
    title: "Break-Glass Approval Queue",
    subtitle: "System Manager only: review and resolve pending emergency access requests",
    recordCount: "pending requests",
    pendingTitle: "Pending Requests",
    request: "Request",
    accessType: "Access type",
    createdAt: "Created",
    justification: "Justification",
    actions: "Actions",
    durationHours: "Duration (hours)",
    comments: "Approver comment",
    commentsPlaceholder: "Optional comment",
    approve: "Approve",
    reject: "Reject",
    refresh: "Refresh",
    loading: "Loading",
    emptyTitle: "No pending requests",
    emptyDescription: "There are no break-glass requests waiting for review.",
    permissionDenied: "System Manager role is required for this screen.",
    actionDone: "Action completed",
    unknownError: "Unexpected error occurred.",
    customerData: "Customer Data",
    customerFinancials: "Customer Financials",
    systemAdmin: "System Admin",
    reportingOverride: "Reporting Override",
  },
};

function t(key) {
  return copy[authStore.locale]?.[key] || copy.en[key] || key;
}

const {
  canManage,
  pendingRows,
  loading,
  errorText,
  actionResult,
  actionForm,
  isRowBusy,
  mapAccessType,
  loadPending,
  approve,
  reject,
} = useBreakGlassApprovals({
  authStore,
  t,
});
</script>
