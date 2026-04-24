<template>
  <WorkbenchPageLayout
    :breadcrumb="t('leads_breadcrumb')"
    :title="t('lead_detail')"
    :subtitle="lead.full_name || lead.name"
  >
    <template #actions>
      <ActionButton variant="secondary" size="sm" @click="backToList">
        {{ t("back_to_list") }}
      </ActionButton>
      <ActionButton variant="primary" size="sm" @click="reload">
        {{ t("refresh") }}
      </ActionButton>
    </template>

    <template #metrics>
      <HeroStrip v-if="!loading" :cells="heroCells" />
      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
      </div>
    </template>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Main Content -->
      <div class="lg:col-span-2 space-y-6">
        <SectionPanel :title="t('overview')">
          <SkeletonLoader v-if="loading" variant="text" :rows="10" />
          <div v-else class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div v-for="field in profileFields" :key="field.label">
                <p class="text-sm font-medium text-slate-500">{{ field.label }}</p>
                <p class="mt-1 text-base font-semibold text-slate-900">{{ field.value || "-" }}</p>
              </div>
            </div>
            <div v-if="lead.notes" class="pt-4 border-t border-slate-100">
              <p class="text-sm font-medium text-slate-500 mb-2">{{ t("notes") }}</p>
              <p class="text-sm text-slate-700 whitespace-pre-wrap">{{ lead.notes }}</p>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel :title="t('activity')">
          <SkeletonLoader v-if="loading" variant="list" :rows="5" />
          <div v-else-if="!activity.length" class="text-center py-8 text-slate-500">
            {{ t("no_activities") }}
          </div>
          <div v-else class="space-y-4">
            <div v-for="event in activity" :key="event.timestamp" class="flex gap-4">
              <div class="mt-1 h-2 w-2 rounded-full bg-brand-500 shrink-0" />
              <div>
                <p class="text-sm font-medium text-slate-900">{{ event.meta }}</p>
                <p class="text-xs text-slate-500">{{ formatDate(event.timestamp) }} · {{ event.owner }}</p>
              </div>
            </div>
          </div>
        </SectionPanel>
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <SectionPanel :title="t('customer_details')">
          <SkeletonLoader v-if="loading" variant="card" />
          <div v-else @click="openCustomer" class="cursor-pointer group">
            <div class="flex items-center gap-4 mb-4">
              <div class="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-lg font-bold text-slate-600 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                {{ (customer.full_name || "?").charAt(0).toLocaleUpperCase('tr-TR') }}
              </div>
              <div>
                <p class="font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{{ customer.full_name || t("all") }}</p>
                <p class="text-sm text-slate-500">{{ customer.name }}</p>
              </div>
            </div>
            <div class="space-y-3">
              <div v-for="field in customerFields" :key="field.label">
                <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">{{ field.label }}</p>
                <p class="text-sm font-medium text-slate-700">{{ field.value || "-" }}</p>
              </div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel v-if="offers.length" :title="t('offers')">
          <div class="space-y-3">
            <div 
              v-for="item in offers" 
              :key="item.name"
              @click="openOffer(item.name)"
              class="p-3 rounded-lg border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 cursor-pointer transition-all"
            >
              <p class="text-sm font-bold text-slate-900">{{ item.name }}</p>
              <p class="text-xs text-slate-500 mt-1">{{ item.status }} · {{ formatCurrency(item.gross_premium, item.currency) }}</p>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel v-if="policies.length" :title="t('policies')">
          <div class="space-y-3">
            <div 
              v-for="item in policies" 
              :key="item.name"
              @click="openPolicy(item.name)"
              class="p-3 rounded-lg border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 cursor-pointer transition-all"
            >
              <p class="text-sm font-bold text-slate-900">{{ item.policy_no || item.name }}</p>
              <p class="text-xs text-slate-500 mt-1">{{ item.status }} · {{ formatCurrency(item.gross_premium, item.currency) }}</p>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel :title="t('documents')">
          <template #actions>
            <ActionButton
              v-if="canUploadDocuments"
              variant="secondary"
              size="xs"
              @click="openUploadModal"
            >
              {{ t("uploadDocument") }}
            </ActionButton>
            <ActionButton
              variant="ghost"
              size="xs"
              @click="openLeadDocuments"
            >
              {{ t("openDocumentCenter") }}
            </ActionButton>
          </template>
          <div v-if="!documents.length" class="text-sm text-slate-400 py-2">{{ t("no_activities") }}</div>
          <div v-else class="space-y-2">
            <div
              v-for="doc in documents"
              :key="doc.name"
              class="flex items-center justify-between gap-2 p-2 rounded hover:bg-slate-50 text-sm text-slate-600 transition-colors"
            >
              <span class="truncate">{{ doc.file_name }}</span>
              <ActionButton variant="ghost" size="xs" @click="openDocument(doc)">
                {{ t("openDocument") }}
              </ActionButton>
            </div>
          </div>
        </SectionPanel>
      </div>
    </div>

    <WorkbenchFileUploadModal
      :open="showUploadModal"
      attached-to-doctype="AT Lead"
      :attached-to-name="lead.name"
      @close="closeUploadModal"
      @uploaded="handleUploadComplete"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed } from "vue";
import { useAuthStore } from "../stores/auth";
import { useLeadDetailRuntime } from "../composables/useLeadDetailRuntime";
import { openDocumentInNewTab } from "../utils/documentOpen";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import WorkbenchFileUploadModal from "../components/aux-workbench/WorkbenchFileUploadModal.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import HeroStrip from "../components/ui/HeroStrip.vue";
import SkeletonLoader from "../components/ui/SkeletonLoader.vue";

const props = defineProps({
  name: { type: String, required: true },
});

const authStore = useAuthStore();
const activeLocale = computed(() => authStore.locale || "tr");

const {
  lead,
  customer,
  activity,
  documents,
  offers,
  policies,
  loading,
  t,
  reload,
  backToList,
  openOffer,
  openPolicy,
  openCustomer,
  formatDate,
  formatCurrency,
  heroCells,
  profileFields,
  customerFields,
  showUploadModal,
  canUploadDocuments,
  openLeadDocuments,
  openUploadModal,
  closeUploadModal,
  handleUploadComplete,
} = useLeadDetailRuntime({ 
  name: computed(() => props.name),
  activeLocale 
});

async function openDocument(doc) {
  await openDocumentInNewTab(doc || {}, {
    referenceDoctype: "AT Lead",
    referenceName: props.name,
  });
}
</script>
