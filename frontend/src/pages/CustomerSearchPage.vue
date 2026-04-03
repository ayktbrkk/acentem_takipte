<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
  >
    <template #actions>
      <button class="btn btn-outline btn-sm" @click="resetSearch">
        {{ hasSearched ? t("clearSearch") : t("search") }}
      </button>
    </template>

    <div class="space-y-6">
      <!-- Help Card -->
      <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 class="font-semibold text-blue-900">{{ t("howToUse") }}</h3>
        <ul class="mt-2 space-y-1 text-sm text-blue-800">
          <li>{{ t("helpTaxId") }}</li>
          <li>{{ t("helpMasked") }}</li>
          <li>{{ t("helpRequest") }}</li>
          <li>{{ t("helpHistory") }}</li>
        </ul>
      </div>

      <!-- Global Search Component -->
      <GlobalCustomerSearch
        :title="t('globalSearchTitle')"
        :description="t('globalSearchSubtitle')"
        @customer-selected="onCustomerSelected"
      />

      <!-- Request History Section -->
      <div v-if="showRequestHistory" class="space-y-3">
        <h2 class="text-lg font-semibold text-slate-900">{{ t("recentAccessRequests") }}</h2>
        <div
          v-if="accessRequestHistory.length === 0"
          class="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center"
        >
          <p class="text-sm text-slate-600">{{ t("noAccessRequests") }}</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="request in accessRequestHistory"
            :key="request.id"
            class="rounded-lg border border-slate-200 bg-white p-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">{{ request.customer_name }}</p>
                <p class="text-xs text-slate-600">
                  {{ mapRequestKind(request.request_kind) }} • {{ formatDate(request.created) }}
                </p>
              </div>
              <span
                class="rounded-full px-2 py-1 text-xs font-semibold"
                :class="{
                  'bg-yellow-100 text-yellow-800': request.status === 'Pending',
                  'bg-green-100 text-green-800': request.status === 'Approved',
                  'bg-red-100 text-red-800': request.status === 'Rejected',
                }"
              >
                {{ mapStatus(request.status) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </WorkbenchPageLayout>
</template>

<script setup lang="ts">
import { computed, unref } from "vue";

import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import GlobalCustomerSearch from "../components/app-shell/GlobalCustomerSearch.vue";
import { useCustomerSearchPage } from "../composables/useCustomerSearchPage";
import { useAuthStore } from "../stores/auth";
import { getAppPinia } from "../pinia";

const copy = {
  tr: {
    breadcrumb: "Partnerler > Müşteri Ara",
    title: "Global Müşteri Arama",
    subtitle: "Şubeler arası müşterileri arayın ve erişim talebi oluşturun",
    globalSearchTitle: "Global Müşteri Arama",
    globalSearchSubtitle: "Vergi No veya müşteri numarası ile şubeler arası arama yapın",
    clearSearch: "Aramayı Temizle",
    search: "Ara",
    howToUse: "Kullanım Rehberi",
    helpTaxId: "• Müşterileri Vergi No (10-11 hane) veya Müşteri No ile arayın",
    helpMasked: "• Bazı alanlar yetkinize göre maskelenebilir",
    helpRequest: "• Hassas müşteri detayları için erişim talebi gönderin",
    helpHistory: "• Taleplerinizi aşağıdaki geçmiş bölümünden takip edin",
    recentAccessRequests: "Son Erişim Talepleri",
    noAccessRequests: "Henüz erişim talebi yok",
    statusPending: "Bekliyor",
    statusApproved: "Onaylandı",
    statusRejected: "Reddedildi",
  },
  en: {
    breadcrumb: "Partners > Customer Search",
    title: "Global Customer Search",
    subtitle: "Search and request access to customers across branches",
    globalSearchTitle: "Global Customer Search",
    globalSearchSubtitle: "Search customers across branches by tax id or customer id",
    clearSearch: "Clear Search",
    search: "Search",
    howToUse: "How to Use",
    helpTaxId: "• Search for customers by Tax ID (10-11 digits) or Customer ID",
    helpMasked: "• Some information may be masked based on your permissions",
    helpRequest: "• Submit an access request to view sensitive customer details",
    helpHistory: "• Track your requests in the history section below",
    recentAccessRequests: "Recent Access Requests",
    noAccessRequests: "No access requests yet",
    statusPending: "Pending",
    statusApproved: "Approved",
    statusRejected: "Rejected",
  },
};

const authStore = useAuthStore(getAppPinia());
const activeLocale = computed(() => unref(authStore.locale) || "en");

function t(key: string) {
  return copy[activeLocale.value as "tr" | "en"]?.[key] || copy.en[key as keyof typeof copy.en] || key;
}

function mapStatus(value: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "pending") return t("statusPending");
  if (normalized === "approved") return t("statusApproved");
  if (normalized === "rejected") return t("statusRejected");
  return value || "-";
}

function mapRequestKind(value: string) {
  const normalized = String(value || "").trim();
  return normalized || "-";
}

const {
  hasSearched,
  accessRequestHistory,
  showRequestHistory,
  onCustomerSelected,
  resetSearch,
  formatDate,
} = useCustomerSearchPage();
</script>

<style scoped>
.btn {
  @apply rounded-lg font-medium transition-colors;
}

.btn-outline {
  @apply border border-slate-300 text-slate-700 hover:bg-slate-50;
}

.btn-sm {
  @apply px-3 py-2 text-sm;
}
</style>
