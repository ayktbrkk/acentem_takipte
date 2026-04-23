<template>
  <section class="page-shell space-y-4">
    <div class="detail-topbar">
      <div>
        <p class="detail-breadcrumb">{{ t("customers_breadcrumb") }}</p>
        <h1 class="detail-title">
          {{ customer.full_name || name }}
          <StatusBadge domain="customer" :status="customer.enabled ? 'active' : 'cancel'" />
        </h1>
        <div class="mt-1.5 flex flex-wrap items-center gap-2">
          <span class="copy-tag">{{ customer.name }}</span>
          <span class="copy-tag">{{ customer.tax_id }}</span>
          <span class="copy-tag text-sky-700 font-medium">{{ customer.office_branch }}</span>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ActionButton variant="secondary" size="sm" @click="backToList">
          {{ t("back_to_list") }}
        </ActionButton>
        <ActionButton variant="primary" size="sm" @click="openNewOffer">
          {{ t("new_offer") }}
        </ActionButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="mt-4 space-y-6">
      <div class="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
        <SkeletonLoader variant="detail" />
      </div>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="space-y-6">
          <div class="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <SkeletonLoader variant="card" :count="2" />
          </div>
        </div>
        <div class="lg:col-span-2 space-y-6">
          <div class="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <SkeletonLoader variant="text" :rows="15" />
          </div>
        </div>
      </div>
    </div>

    <!-- Ready State -->
    <template v-else>
      <HeroStrip :cells="heroCells" />

      <div class="nav-tabs-bar">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :class="['nav-tab', activeCustomerTab === tab.key && 'is-active']"
          @click="activeCustomerTab = tab.key"
        >
          {{ tab.label }}
          <span v-if="tab.count" class="ml-1 badge badge-blue">
            {{ tab.count }}
          </span>
        </button>
      </div>

      <div class="detail-body at-detail-split-wide">
        <!-- Sidebar -->
        <aside class="detail-sidebar at-detail-aside">
          <SectionPanel :title="t('overview')">
            <FieldGroup :fields="profileFields" :cols="1" />
          </SectionPanel>

          <SectionPanel :title="t('customer_details')">
            <FieldGroup :fields="moreProfileFields" :cols="1" />
          </SectionPanel>

          <SectionPanel :title="t('operations')">
            <FieldGroup :fields="operationalFields" :cols="1" />
          </SectionPanel>
        </aside>

        <!-- Main Content -->
        <div class="detail-main space-y-4">
          <!-- Overview Tab -->
          <template v-if="activeCustomerTab === 'overview'">
            <SectionPanel :title="t('insights')">
              <div v-if="!insights.snapshot_date" class="at-empty-block">
                {{ t("no_activities") }}
              </div>
              <div v-else class="space-y-4">
                 <p class="text-sm text-slate-500">{{ t("records") }}: {{ formatDate(insights.snapshot_date) }}</p>
                 <FieldGroup :fields="[
                   { label: t('active_policies'), value: insights.active_policy_count },
                   { label: t('total_premium'), value: formatCurrency(insights.policy_total_premium) },
                   { label: t('open_claims'), value: insights.open_claim_count },
                   { label: t('upcoming_renewals'), value: insights.upcoming_renewal_count }
                 ]" :cols="2" />
              </div>
            </SectionPanel>

            <SectionPanel :title="t('cross_sell')">
               <div v-if="!crossSell.has_cross_sell_opportunity" class="at-empty-block">
                 {{ t("no_activities") }}
               </div>
               <div v-else class="space-y-2">
                 <p class="text-sm font-medium text-slate-700">{{ t("cross_sell") }}</p>
                 <div class="flex flex-wrap gap-2">
                   <span v-for="opp in crossSell.opportunity_branches" :key="opp.branch" class="badge badge-blue">
                     {{ opp.branch }}
                   </span>
                 </div>
               </div>
            </SectionPanel>
          </template>

          <!-- Portfolio Tab -->
          <template v-if="activeCustomerTab === 'portfolio'">
            <SectionPanel :title="t('policies')">
              <template #trailing>
                <span class="badge badge-blue">{{ portfolio.policies?.length || 0 }}</span>
              </template>
              <div v-if="!portfolio.policies?.length" class="at-empty-block">
                {{ t("no_policies") }}
              </div>
              <div v-else class="grid gap-3 md:grid-cols-2">
                <MetaListCard
                  v-for="item in portfolio.policies"
                  :key="item.name"
                  :title="item.policy_no || item.name"
                  :subtitle="item.insurance_company"
                  clickable
                  @click="openPolicy(item.name)"
                >
                  <template #trailing>
                    <StatusBadge domain="policy" :status="normalizeStatus(item.status)" />
                  </template>
                  <MiniFactList class="mt-2" :items="policyFacts(item)" />
                </MetaListCard>
              </div>
            </SectionPanel>

            <SectionPanel :title="t('offers')">
              <template #trailing>
                <span class="badge badge-blue">{{ portfolio.offers?.length || 0 }}</span>
              </template>
              <div v-if="!portfolio.offers?.length" class="at-empty-block">
                {{ t("no_offers") }}
              </div>
              <div v-else class="grid gap-3 md:grid-cols-2">
                <MetaListCard
                  v-for="item in portfolio.offers"
                  :key="item.name"
                  :title="item.name"
                  :subtitle="item.insurance_company"
                  clickable
                  @click="openOffer(item.name)"
                >
                  <template #trailing>
                    <StatusBadge domain="offer" :status="normalizeStatus(item.status)" />
                  </template>
                  <MiniFactList class="mt-2" :items="offerFacts(item)" />
                </MetaListCard>
              </div>
            </SectionPanel>

            <SectionPanel :title="t('claims')">
              <template #trailing>
                <span class="badge badge-blue">{{ portfolio.claims?.length || 0 }}</span>
              </template>
              <div v-if="!portfolio.claims?.length" class="at-empty-block">
                {{ t("no_claims") }}
              </div>
              <div v-else class="grid gap-3 md:grid-cols-2">
                <MetaListCard
                  v-for="item in portfolio.claims"
                  :key="item.name"
                  :title="item.name"
                  :subtitle="item.policy"
                  clickable
                  @click="openClaim(item.name)"
                >
                  <template #trailing>
                    <StatusBadge domain="claim" :status="normalizeStatus(item.claim_status)" />
                  </template>
                  <MiniFactList class="mt-2" :items="claimFacts(item)" />
                </MetaListCard>
              </div>
            </SectionPanel>
          </template>

          <!-- Timeline Tab -->
          <template v-if="activeCustomerTab === 'activity'">
             <SectionPanel :title="t('timeline')">
                <div v-if="!communications.timeline?.length" class="at-empty-block">
                  {{ t("no_activities") }}
                </div>
                <div v-else class="space-y-3">
                  <MetaListCard
                    v-for="item in communications.timeline"
                    :key="item.timestamp"
                    :title="item.title"
                    :subtitle="item.meta"
                  >
                    <template #trailing>
                       <p class="text-xs text-slate-500">{{ formatDate(item.timestamp) }}</p>
                    </template>
                    <div class="mt-2 text-sm text-slate-600" v-html="item.payload?.content || ''"></div>
                  </MetaListCard>
                </div>
             </SectionPanel>
          </template>

          <!-- Operations Tab -->
          <template v-if="activeCustomerTab === 'operations'">
             <SectionPanel :title="t('documents')">
                <template #trailing>
                  <div class="flex flex-wrap items-center gap-2">
                    <ActionButton v-if="canUploadDocuments" variant="secondary" size="xs" @click="openUploadModal">
                      {{ t("uploadDocument") }}
                    </ActionButton>
                    <ActionButton variant="secondary" size="xs" @click="openCustomerDocuments">
                      {{ t("openDocumentCenter") }}
                    </ActionButton>
                  </div>
                </template>
                <div v-if="!atDocuments.length" class="at-empty-block">
                  {{ t("no_documents") }}
                </div>
                <div v-else class="grid gap-2">
                  <MetaListCard
                    v-for="doc in atDocuments"
                    :key="doc.name"
                    :title="doc.display_name || doc.file_name"
                    :subtitle="doc.document_sub_type || doc.document_kind"
                    :description="formatFileSize(doc.file_size)"
                  >
                    <template #trailing>
                      <div class="flex flex-wrap items-center gap-2">
                        <span v-if="doc.is_private" class="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                          {{ t("private") }}
                        </span>
                        <span v-if="doc.is_verified" class="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                          {{ t("status_verified") }}
                        </span>
                        <p class="text-xs text-slate-500">{{ formatDate(doc.creation) }}</p>
                        <ActionButton v-if="canArchiveDocument(doc)" variant="secondary" size="xs" @click="archiveDocument(doc)">
                          {{ t("archiveDocument") }}
                        </ActionButton>
                        <ActionButton v-if="canRestoreDocument(doc)" variant="secondary" size="xs" @click="restoreDocument(doc)">
                          {{ t("restoreDocument") }}
                        </ActionButton>
                        <ActionButton v-if="canPermanentDeleteDocument(doc)" variant="secondary" size="xs" @click="permanentDeleteDocument(doc)">
                          {{ t("permanentDeleteDocument") }}
                        </ActionButton>
                        <ActionButton variant="secondary" size="xs" @click="openDocument(doc)">
                          {{ t("openDocument") }}
                        </ActionButton>
                      </div>
                    </template>
                  </MetaListCard>
                </div>
             </SectionPanel>
          </template>
        </div>
      </div>
    </template>

    <WorkbenchFileUploadModal
      :open="showUploadModal"
      attached-to-doctype="AT Customer"
      :attached-to-name="name"
      @close="closeUploadModal"
      @uploaded="handleUploadComplete"
    />
  </section>
</template>

<script setup>
import { computed, defineAsyncComponent, ref, unref } from "vue";
import { useCustomerDetailRuntime } from "../composables/useCustomerDetailRuntime";
import { deskActionsEnabled } from "../utils/deskActions";
import { useAuthStore } from "../stores/auth";

import ActionButton from "../components/app-shell/ActionButton.vue";
import MetaListCard from "../components/app-shell/MetaListCard.vue";
import MiniFactList from "../components/app-shell/MiniFactList.vue";

// audit(perf/P-01): Heavy components in the detail view are lazy-loaded to speed up initial route transition.
const WorkbenchFileUploadModal = defineAsyncComponent(() =>
  import("../components/aux-workbench/WorkbenchFileUploadModal.vue")
);
const SectionPanel = defineAsyncComponent(() =>
  import("../components/app-shell/SectionPanel.vue")
);
const FieldGroup = defineAsyncComponent(() =>
  import("../components/ui/FieldGroup.vue")
);
const HeroStrip = defineAsyncComponent(() =>
  import("../components/ui/HeroStrip.vue")
);
const StatusBadge = defineAsyncComponent(() =>
  import("../components/ui/StatusBadge.vue")
);
const SkeletonLoader = defineAsyncComponent(() =>
  import("../components/ui/SkeletonLoader.vue")
);
import { openDocumentInNewTab } from "../utils/documentOpen";

const props = defineProps({
  name: { type: String, required: true }
});

const activeCustomerTab = ref("overview");
const authStore = useAuthStore();
const activeLocale = computed(() => unref(authStore.locale) || "tr");

const {
  customer,
  summary,
  portfolio,
  communications,
  atDocuments,
  insights,
  crossSell,
  operations,
  loading,
  loadErrorText,
  t,
  formatDate,
  formatCurrency,
  heroCells,
  profileFields,
  moreProfileFields,
  operationalFields,
  showUploadModal,
  openUploadModal,
  closeUploadModal,
  handleUploadComplete,
  canUploadDocuments,
  atDocumentLifecycle,
  openCustomerDocuments,
  archiveDocument,
  restoreDocument,
  permanentDeleteDocument,
  formatFileSize,
  reload,
  backToList,
  openNewOffer,
  openPolicy,
  openOffer,
  openClaim,
} = useCustomerDetailRuntime({
  name: computed(() => props.name),
  activeLocale,
});

// Sync tabs
const tabs = computed(() => [
  { key: "overview", label: t("overview") },
  { key: "portfolio", label: t("portfolio"), count: summary.value.active_policy_count },
  { key: "activity", label: t("timeline") },
  { key: "operations", label: t("operations") },
]);

// Helper for status normalization
function normalizeStatus(val) {
  const s = String(val || "").toLowerCase();
  if (["active", "paid", "sent"].includes(s)) return "active";
  if (["cancelled", "expired", "overdue"].includes(s)) return "cancel";
  return "draft";
}

// Map facts for list cards
function policyFacts(p) {
  return [
    { label: t("branch"), value: p.branch },
    { label: t("start_date"), value: formatDate(p.start_date) },
    { label: t("gross_premium"), value: formatCurrency(p.gross_premium) },
  ];
}

function offerFacts(o) {
  return [
    { label: t("offer_date"), value: formatDate(o.offer_date) },
    { label: t("gross_premium"), value: formatCurrency(o.gross_premium) },
  ];
}

function claimFacts(c) {
  return [
    { label: t("reported_date"), value: formatDate(c.reported_date) },
    { label: t("claim_amount"), value: formatCurrency(c.claim_amount) },
  ];
}

async function openDocument(doc) {
  const opened = await openDocumentInNewTab(doc || {}, {
    referenceDoctype: doc?.reference_doctype || "AT Document",
    referenceName: doc?.name || "",
  });
  if (opened) return;
  window.alert(t("file_link_not_found"));
}

function canArchiveDocument(doc) {
  return atDocumentLifecycle.canArchiveDocument(doc);
}

function canRestoreDocument(doc) {
  return atDocumentLifecycle.canRestoreDocument(doc);
}

function canPermanentDeleteDocument(doc) {
  return atDocumentLifecycle.canPermanentDeleteDocument(doc);
}
</script>
