<template>
  <WorkbenchPageLayout
    :breadcrumb="t('approvalBreadcrumb')"
    :title="t('approvalTitle')"
    :subtitle="t('approvalSubtitle')"
    :record-count="pendingRows.length"
    :record-count-label="t('approvalRecordCount')"
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
import { BREAK_GLASS_TRANSLATIONS } from "../config/break_glass_translations";
import { useAuthStore } from "../stores/auth";
import { useBreakGlassApprovals } from "../composables/useBreakGlassApprovals";
import { translateText } from "../utils/i18n";

const authStore = useAuthStore(getAppPinia());

function t(key) {
  const locale = String(authStore.locale || "tr").toLowerCase().startsWith("tr") ? "tr" : "en";
  return BREAK_GLASS_TRANSLATIONS[locale]?.[key]
    || BREAK_GLASS_TRANSLATIONS.en?.[key]
    || translateText(key, locale);
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
