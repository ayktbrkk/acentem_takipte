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
        <FeatherIcon name="refresh-cw" class="h-4 w-4" />
        {{ t("refresh") }}
      </ActionButton>
    </template>

    <template #metrics>
      <div v-if="!loading" class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SaaSMetricCard
          v-for="cell in heroCells"
          :key="cell.label"
          :label="cell.label"
          :value="cell.value"
          :value-class="cell.variant === 'success-pill' ? 'text-emerald-600' : 'text-gray-900'"
        />
      </div>
      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
      </div>
    </template>

    <div class="detail-body at-detail-split-wide">
      <!-- Sidebar (Sol Kolon - 4) -->
      <aside class="detail-sidebar at-detail-aside space-y-6">
        <StandardCustomerCard
          :title="t('customer_details')"
          :customer="customer"
          :saving="customerSaving"
          :t="t"
          @save="updateCustomer"
          @view-full="openCustomer"
        />

        <SectionPanel v-if="offers.length" :title="t('offers')">
          <div class="space-y-3">
            <div 
              v-for="item in offers" 
              :key="item.name"
              @click="openOffer(item.name)"
              class="p-3 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 cursor-pointer transition-all bg-slate-50/50"
            >
              <p class="text-sm font-bold text-slate-900 truncate">{{ item.name }}</p>
              <div class="flex items-center justify-between mt-2">
                <StatusBadge domain="policy" :status="item.status === 'Accepted' ? 'active' : 'waiting'" :label="item.status" size="sm" />
                <p class="text-xs font-bold text-slate-600">{{ formatCurrency(item.gross_premium, item.currency) }}</p>
              </div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel v-if="policies.length" :title="t('policies')">
          <div class="space-y-3">
            <div 
              v-for="item in policies" 
              :key="item.name"
              @click="openPolicy(item.name)"
              class="p-3 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 cursor-pointer transition-all bg-slate-50/50"
            >
              <p class="text-sm font-bold text-slate-900 truncate">{{ item.policy_no || item.name }}</p>
              <div class="flex items-center justify-between mt-2">
                <StatusBadge domain="policy" :status="item.status === 'Active' ? 'active' : 'waiting'" :label="item.status" size="sm" />
                <p class="text-xs font-bold text-slate-600">{{ formatCurrency(item.gross_premium, item.currency) }}</p>
              </div>
            </div>
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
            <div 
              v-for="doc in documents.slice(0, 5)" 
              :key="doc.name"
              class="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-brand-200 transition-colors"
            >
              <div class="min-w-0">
                <p class="text-xs font-bold text-slate-800 truncate">{{ doc.file_name }}</p>
              </div>
              <button class="text-slate-400 hover:text-brand-600" @click="openDocument(doc)">
                <FeatherIcon name="external-link" class="h-3.5 w-3.5" />
              </button>
            </div>
            <ActionButton variant="ghost" size="xs" class="w-full justify-center" @click="openLeadDocuments">
              {{ t("view_all_documents") }}
            </ActionButton>
          </div>
        </SectionPanel>
      </aside>

      <!-- Main Content (Sağ Kolon - 8) -->
      <div class="detail-main space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EditableCard
            :title="t('lead_profile')"
            icon="user-check"
            :fields="profileFields"
            :t="t"
            :saving="saving"
            layout="list"
            @save="updateLead"
          />

          <EditableCard
            :title="t('estimation_and_targets')"
            icon="trending-up"
            :fields="estimationFields"
            :t="t"
            :saving="saving"
            layout="list"
            @save="updateLead"
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
      attached-to-doctype="AT Lead"
      :attached-to-name="lead.name"
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
import { useLeadDetailRuntime } from "../composables/useLeadDetailRuntime";
import { openDocumentInNewTab } from "../utils/documentOpen";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import EditableCard from "../components/app-shell/EditableCard.vue";
import StandardCustomerCard from "../components/app-shell/StandardCustomerCard.vue";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import ToastNotification from "../components/ui/ToastNotification.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import SkeletonLoader from "../components/ui/SkeletonLoader.vue";
import WorkbenchFileUploadModal from "../components/aux-workbench/WorkbenchFileUploadModal.vue";

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
  estimationFields,
  customerFields,
  saving,
  customerSaving,
  notification,
  updateLead,
  updateCustomer,
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
