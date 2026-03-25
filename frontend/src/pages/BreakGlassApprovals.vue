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

    <SectionPanel v-else :title="t('pendingTitle')" :count="pendingRows.length" panel-class="surface-card rounded-2xl p-5">
      <template #trailing>
        <button class="btn btn-outline btn-sm" type="button" :disabled="loading" @click="loadPending">
          {{ loading ? t("loading") : t("refresh") }}
        </button>
      </template>

      <article v-if="errorText" class="qc-error-banner" role="alert" aria-live="polite">
        <p class="qc-error-banner__text">{{ errorText }}</p>
      </article>

      <article
        v-if="actionResult"
        class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        role="status"
        aria-live="polite"
      >
        <p class="font-semibold">{{ t("actionDone") }}</p>
        <p class="mt-1">{{ actionResult }}</p>
      </article>

      <div v-if="loading" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
        {{ t("loading") }}
      </div>
      <div v-else-if="pendingRows.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <EmptyState :title="t('emptyTitle')" :description="t('emptyDescription')" />
      </div>

      <div v-else class="mt-3 overflow-auto">
        <table class="at-table">
          <thead>
            <tr class="at-table-head-row">
              <th class="at-table-head-cell">{{ t("request") }}</th>
              <th class="at-table-head-cell">{{ t("accessType") }}</th>
              <th class="at-table-head-cell">{{ t("createdAt") }}</th>
              <th class="at-table-head-cell">{{ t("justification") }}</th>
              <th class="at-table-head-cell">{{ t("actions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in pendingRows" :key="row.name" class="at-table-row align-top">
              <td class="at-table-cell">
                <p class="font-semibold text-slate-800">{{ row.name }}</p>
                <p class="text-xs text-slate-500">{{ row.user }}</p>
              </td>
              <td class="at-table-cell">{{ mapAccessType(row.access_type) }}</td>
              <td class="at-table-cell">{{ row.created_at || "-" }}</td>
              <td class="at-table-cell max-w-[360px]">
                <p class="line-clamp-3">{{ row.justification || "-" }}</p>
                <p class="mt-1 text-xs text-slate-500">{{ row.reference || "-" }}</p>
              </td>
              <td class="at-table-cell min-w-[220px]">
                <label class="mb-2 flex flex-col gap-1">
                  <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t("durationHours") }}</span>
                  <select v-model.number="actionForm[row.name].durationHours" class="input input-xs">
                    <option :value="4">4</option>
                    <option :value="8">8</option>
                    <option :value="24">24</option>
                    <option :value="48">48</option>
                    <option :value="72">72</option>
                  </select>
                </label>
                <label class="mb-2 flex flex-col gap-1">
                  <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t("comments") }}</span>
                  <input
                    v-model.trim="actionForm[row.name].comments"
                    class="input input-xs"
                    type="text"
                    :placeholder="t('commentsPlaceholder')"
                  />
                </label>
                <div class="flex items-center gap-2">
                  <button
                    class="btn btn-primary btn-xs"
                    type="button"
                    :disabled="isRowBusy(row.name)"
                    @click="approve(row.name)"
                  >
                    {{ t("approve") }}
                  </button>
                  <button
                    class="btn btn-outline btn-xs"
                    type="button"
                    :disabled="isRowBusy(row.name)"
                    @click="reject(row.name)"
                  >
                    {{ t("reject") }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SectionPanel>
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { frappeRequest } from "frappe-ui";

import EmptyState from "../components/app-shell/EmptyState.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";

const authStore = useAuthStore(getAppPinia());

const copy = {
  tr: {
    breadcrumb: "Kontrol Merkezi / Acil Erisim Onaylari",
    title: "Break-Glass Onay Kuyrugu",
    subtitle: "Sadece System Manager erisimi: bekleyen acil erisim taleplerini yonetin",
    recordCount: "bekleyen talep",
    pendingTitle: "Bekleyen Talepler",
    request: "Talep",
    accessType: "Erisim tipi",
    createdAt: "Olusturma",
    justification: "Gerekce",
    actions: "Islemler",
    durationHours: "Sure (saat)",
    comments: "Yonetici notu",
    commentsPlaceholder: "Opsiyonel yorum",
    approve: "Onayla",
    reject: "Reddet",
    refresh: "Yenile",
    loading: "Yukleniyor",
    emptyTitle: "Bekleyen talep yok",
    emptyDescription: "Onay bekleyen break-glass talebi bulunmuyor.",
    permissionDenied: "Bu ekrana erisim icin System Manager rolu gerekir.",
    actionDone: "Islem tamamlandi",
    unknownError: "Beklenmeyen bir hata olustu.",
    customerData: "Musteri Verisi",
    customerFinancials: "Musteri Finansallari",
    systemAdmin: "Sistem Yonetimi",
    reportingOverride: "Raporlama Istisnasi",
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

const canManage = computed(() => Boolean(authStore.isDeskUser));
const pendingRows = ref([]);
const loading = ref(false);
const errorText = ref("");
const actionResult = ref("");
const busyRows = reactive({});
const actionForm = reactive({});

function ensureActionForm(rowName) {
  if (!actionForm[rowName]) {
    actionForm[rowName] = {
      durationHours: 24,
      comments: "",
    };
  }
}

function isRowBusy(rowName) {
  return Boolean(busyRows[rowName]);
}

function mapAccessType(value) {
  if (value === "customer_data") return t("customerData");
  if (value === "customer_financials") return t("customerFinancials");
  if (value === "system_admin") return t("systemAdmin");
  if (value === "reporting_override") return t("reportingOverride");
  return value || "-";
}

async function loadPending() {
  if (!canManage.value) {
    pendingRows.value = [];
    return;
  }

  loading.value = true;
  errorText.value = "";
  try {
    const payload = await frappeRequest({
      url: "/api/method/acentem_takipte.acentem_takipte.api.break_glass.list_pending",
      method: "GET",
    });
    const message = payload?.message || payload || [];
    pendingRows.value = Array.isArray(message) ? message : [];
    pendingRows.value.forEach((row) => ensureActionForm(row.name));
  } catch (error) {
    pendingRows.value = [];
    errorText.value = String(error?.message || error || t("unknownError"));
  } finally {
    loading.value = false;
  }
}

async function approve(requestId) {
  await runAction("approve", requestId);
}

async function reject(requestId) {
  await runAction("reject", requestId);
}

async function runAction(action, requestId) {
  const form = actionForm[requestId] || { durationHours: 24, comments: "" };
  busyRows[requestId] = true;
  errorText.value = "";
  actionResult.value = "";

  const method = action === "approve" ? "approve_request" : "reject_request";

  try {
    const payload = await frappeRequest({
      url: `/api/method/acentem_takipte.acentem_takipte.api.break_glass.${method}`,
      method: "POST",
      params: {
        request_id: requestId,
        duration_hours: form.durationHours,
        approver_comments: form.comments,
      },
    });

    const message = payload?.message || payload || {};
    if (message?.ok === false) {
      errorText.value = String(message.error || t("unknownError"));
      return;
    }

    actionResult.value = String(message?.message || `${requestId} ${action}`);
    await loadPending();
  } catch (error) {
    errorText.value = String(error?.message || error || t("unknownError"));
  } finally {
    busyRows[requestId] = false;
  }
}

onMounted(() => {
  loadPending();
});
</script>
