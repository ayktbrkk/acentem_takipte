<template>
  <WorkbenchPageLayout
    :breadcrumb="t('offers_breadcrumb')"
    :title="t('offer_detail')"
    :subtitle="offer.name"
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
                {{ uppercaseText((customer.full_name || "?").charAt(0), activeLocale) }}
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

        <SectionPanel v-if="relatedPolicies.length" :title="t('related_policies')">
          <div class="space-y-3">
            <div 
              v-for="policy in relatedPolicies" 
              :key="policy.name"
              @click="openPolicy(policy.name)"
              class="p-3 rounded-lg border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 cursor-pointer transition-all"
            >
              <p class="text-sm font-bold text-slate-900">{{ policy.policy_no || policy.name }}</p>
              <p class="text-xs text-slate-500 mt-1">{{ policy.status }} · {{ formatCurrency(policy.gross_premium, policy.currency) }}</p>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel v-if="relatedOffers.length" :title="t('related_offers')">
          <div class="space-y-3">
            <div 
              v-for="relOffer in relatedOffers" 
              :key="relOffer.name"
              @click="openOffer(relOffer.name)"
              class="p-3 rounded-lg border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 cursor-pointer transition-all"
            >
              <p class="text-sm font-bold text-slate-900">{{ relOffer.name }}</p>
              <p class="text-xs text-slate-500 mt-1">{{ relOffer.status }} · {{ formatCurrency(relOffer.gross_premium, relOffer.currency) }}</p>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel :title="t('documents')">
          <template #trailing>
            <div class="flex flex-wrap items-center gap-2">
              <ActionButton v-if="canUploadDocuments" variant="secondary" size="xs" @click="openUploadModal">
                {{ t("uploadDocument") }}
              </ActionButton>
              <ActionButton variant="secondary" size="xs" @click="openOfferDocuments">
                {{ t("openDocumentCenter") }}
              </ActionButton>
            </div>
          </template>
          <div v-if="!documents.length" class="text-sm text-slate-400 py-2">{{ t("no_activities") }}</div>
          <div v-else class="space-y-2">
            <div 
              v-for="doc in documents" 
              :key="doc.name"
              class="flex items-center justify-between gap-3 p-2 rounded hover:bg-slate-50 text-sm text-slate-600 transition-colors"
            >
              <span class="truncate">{{ doc.file_name }}</span>
              <ActionButton variant="secondary" size="xs" @click="openDocument(doc)">
                {{ t("openDocument") }}
              </ActionButton>
            </div>
          </div>
        </SectionPanel>
      </div>
    </div>

    <WorkbenchFileUploadModal
      :open="showUploadModal"
      attached-to-doctype="AT Offer"
      :attached-to-name="name"
      @close="closeUploadModal"
      @uploaded="handleUploadComplete"
    />
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed } from "vue";
import { useAuthStore } from "../stores/auth";
import { uppercaseText } from "../utils/i18n";
import { useOfferDetailRuntime } from "../composables/useOfferDetailRuntime";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import HeroStrip from "../components/ui/HeroStrip.vue";
import SkeletonLoader from "../components/ui/SkeletonLoader.vue";
import WorkbenchFileUploadModal from "../components/aux-workbench/WorkbenchFileUploadModal.vue";
import { openDocumentInNewTab } from "../utils/documentOpen";

const props = defineProps({
  name: { type: String, required: true },
});

const authStore = useAuthStore();
const activeLocale = computed(() => authStore.locale || "tr");

const {
  offer,
  customer,
  activity,
  documents,
  relatedOffers,
  relatedPolicies,
  showUploadModal,
  loading,
  t,
  reload,
  backToList,
  openOfferDocuments,
  openUploadModal,
  closeUploadModal,
  handleUploadComplete,
  canUploadDocuments,
  openPolicy,
  openOffer,
  openCustomer,
  formatDate,
  formatCurrency,
  heroCells,
  profileFields,
  customerFields,
} = useOfferDetailRuntime({ 
  name: computed(() => props.name),
  activeLocale 
});

async function openDocument(doc) {
  await openDocumentInNewTab(doc || {}, {
    referenceDoctype: "AT Offer",
    referenceName: props.name,
  });
}
</script>
