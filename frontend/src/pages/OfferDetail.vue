<template>
  <WorkbenchPageLayout
    :breadcrumb="t('offers_breadcrumb')"
    :title="t('offer_detail')"
    :subtitle="offer.name"
  >
    <template #actions>
      <ActionButton variant="secondary" size="sm" @click="reload">
        <FeatherIcon name="refresh-cw" class="h-4 w-4" />
        {{ t("refresh") }}
      </ActionButton>
      <ActionButton variant="link" size="sm" @click="backToList">
        {{ t("back_to_list") }}
      </ActionButton>
    </template>

    <template #metrics>
      <div v-if="!loading" class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SaaSMetricCard
          v-for="cell in heroCells"
          :key="cell.label"
          :label="cell.label"
          :value="cell.value"
          :value-class="cell.variant === 'success-pill' ? 'text-at-green' : cell.variant === 'cancel-pill' ? 'text-at-red' : cell.variant === 'waiting-pill' ? 'text-at-amber' : 'text-slate-900'"
        />
      </div>
      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
      </div>
    </template>

    <div class="detail-body at-detail-split-wide">
      <div class="detail-main space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EditableCard
            :title="t('offer_profile')"
            icon="file-text"
            :fields="profileFields"
            :t="t"
            :saving="saving"
            layout="list"
            @save="updateOffer"
          />

          <EditableCard
            :title="t('financial_details')"
            icon="dollar-sign"
            :fields="premiumFields"
            :t="t"
            :saving="saving"
            layout="list"
            @save="updateOffer"
          />
        </div>

        <SectionPanel :title="t('activity_timeline')">
          <SkeletonLoader v-if="loading" variant="list" :rows="5" />
          <div v-else-if="!activity.length" class="card-empty">
            <div class="card-empty-icon">
              <FeatherIcon name="activity" class="h-6 w-6" />
            </div>
            <p class="card-empty-text">{{ t('no_recent_activity') }}</p>
          </div>
          <div v-else class="space-y-4">
            <div v-for="event in activity" :key="event.timestamp" class="flex gap-4">
              <div class="mt-1.5 h-2 w-2 rounded-full bg-brand-500 shrink-0" />
              <div>
                <p class="text-sm font-bold text-slate-900">{{ event.meta }}</p>
                <p class="text-xs text-slate-500 mt-0.5">{{ formatDate(event.timestamp) }} · {{ event.owner }}</p>
              </div>
            </div>
          </div>
        </SectionPanel>
      </div>

      <aside class="detail-sidebar at-detail-aside space-y-6">
        <StandardCustomerCard
          :title="t('customer_details')"
          :customer="customer"
          :saving="customerSaving"
          :t="t"
          @save="updateCustomer"
          @view-full="openCustomer"
        />

        <SectionPanel v-if="relatedPolicies.length" :title="t('related_policies')">
          <div class="space-y-2">
            <MetaListCard
              v-for="policy in relatedPolicies"
              :key="policy.name"
              :title="policy.policy_no || policy.name"
              :subtitle="t('status_' + String(policy.status || 'draft').toLowerCase())"
              class="!p-3 cursor-pointer"
              @click="openPolicy(policy.name)"
            >
              <template #trailing>
                <div class="flex items-center gap-2">
                  <StatusBadge
                    domain="policy"
                    :status="policy.status === 'Active' ? 'active' : 'waiting'"
                    :label="t('status_' + String(policy.status || 'draft').toLowerCase())"
                    size="sm"
                  />
                  <span class="text-xs font-semibold text-slate-600">{{ formatCurrency(policy.gross_premium, policy.currency) }}</span>
                </div>
              </template>
            </MetaListCard>
          </div>
        </SectionPanel>

        <SectionPanel v-if="relatedOffers.length" :title="t('related_offers')">
          <div class="space-y-2">
            <MetaListCard
              v-for="relOffer in relatedOffers"
              :key="relOffer.name"
              :title="relOffer.name"
              :subtitle="t('status_' + String(relOffer.status || 'draft').toLowerCase())"
              class="!p-3 cursor-pointer"
              @click="openOffer(relOffer.name)"
            >
              <template #trailing>
                <div class="flex items-center gap-2">
                  <StatusBadge
                    domain="policy"
                    :status="relOffer.status === 'Accepted' ? 'active' : 'waiting'"
                    :label="t('status_' + String(relOffer.status || 'draft').toLowerCase())"
                    size="sm"
                  />
                  <span class="text-xs font-semibold text-slate-600">{{ formatCurrency(relOffer.gross_premium, relOffer.currency) }}</span>
                </div>
              </template>
            </MetaListCard>
          </div>
        </SectionPanel>

        <SectionPanel :title="t('documents')">
          <template #trailing>
            <div class="flex flex-wrap items-center gap-2">
              <ActionButton v-if="canUploadDocuments" variant="secondary" size="xs" @click="openUploadModal">
                {{ t("upload") }}
              </ActionButton>
            </div>
          </template>
          <div v-if="!documents.length" class="text-sm text-slate-400 py-2">{{ t("no_activities") }}</div>
          <div v-else class="space-y-2">
            <MetaListCard
              v-for="doc in documents.slice(0, 5)"
              :key="doc.name"
              :title="doc.file_name || doc.name"
              class="!p-3"
            >
              <template #trailing>
                <button class="text-slate-400 hover:text-brand-600" @click="openDocument(doc)">
                  <FeatherIcon name="external-link" class="h-3.5 w-3.5" />
                </button>
              </template>
            </MetaListCard>
            <ActionButton variant="ghost" size="xs" class="w-full justify-center" @click="openOfferDocuments">
              {{ t("view_all_documents") }}
            </ActionButton>
          </div>
        </SectionPanel>
      </aside>
    </div>

    <!-- Notifications -->
    <div class="fixed right-6 top-24 z-[100] w-full max-w-sm pointer-events-none">
      <ToastNotification
        :show="notification.show"
        :message="notification.message"
        :type="notification.type"
        @close="notification.show = false"
      />
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
import { FeatherIcon } from "frappe-ui";
import { useAuthStore } from "../stores/auth";
import { uppercaseText } from "../utils/i18n";
import { useOfferDetailRuntime } from "../composables/useOfferDetailRuntime";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import EditableCard from "../components/app-shell/EditableCard.vue";
import StandardCustomerCard from "../components/app-shell/StandardCustomerCard.vue";
import MetaListCard from "../components/app-shell/MetaListCard.vue";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import ToastNotification from "../components/ui/ToastNotification.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
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
  premiumFields,
  customerFields,
  saving,
  customerSaving,
  notification,
  updateOffer,
  updateCustomer,
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
