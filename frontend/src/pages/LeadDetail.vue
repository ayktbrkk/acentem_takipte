<template>
  <section class="page-shell space-y-4">
    <div class="detail-topbar">
      <div>
        <p class="detail-breadcrumb">{{ t("breadcrumb") }}</p>
        <h1 class="detail-title">
          {{ leadDisplayTitle }}
          <StatusBadge :status="uiLeadStatus" />
          <StatusBadge :status="uiLeadStaleStatus" />
        </h1>
        <p class="detail-subtitle">{{ leadHeaderSubtitle }}</p>
        <div class="mt-1.5 flex flex-wrap items-center gap-2">
          <span class="copy-tag">{{ lead.name || name }}</span>
          <span v-if="lead.customer" class="copy-tag">{{ lead.customer }}</span>
          <span v-if="lead.branch" class="copy-tag">{{ lead.branch }}</span>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn btn-outline btn-sm" type="button" @click="goBack">{{ t('backList') }}</button>
        <button v-if="lead.customer" class="btn btn-outline btn-sm" type="button" @click="openCustomer360(lead.customer)">
          {{ t('openCustomer360') }}
        </button>
        <button v-if="canConvertLead(lead)" class="btn btn-primary btn-sm" type="button" :disabled="leadConvertResource.loading" @click="convertLeadToOffer">
          {{ leadConvertResource.loading ? t('converting') : t('createOffer') }}
        </button>
      </div>
    </div>

    <HeroStrip :cells="heroCells" />

    <div class="nav-tabs-bar">
      <button
        v-for="tab in leadTabs"
        :key="tab.value"
        :class="['nav-tab', activeLeadTab === tab.value && 'is-active']"
        type="button"
        @click="activeLeadTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="detail-body">
      <div class="detail-main">
        <SectionPanel v-if="activeLeadTab === 'overview' || activeLeadTab === 'related'" :title="t('conversionTitle')">
          <div v-if="loading" class="card-empty">{{ t('loading') }}</div>
          <div v-else-if="loadErrorText" class="card-empty">{{ loadErrorText }}</div>
          <template v-else>
            <FieldGroup :fields="leadConversionFields" :cols="2" />
            <div v-if="linkedConversionCards.length" class="mt-4 grid gap-3 md:grid-cols-2">
              <MetaListCard v-for="item in linkedConversionCards" :key="item.key" :title="item.title" :subtitle="item.subtitle" :description="item.description" :meta="item.meta">
                <template #trailing>
                  <button class="btn btn-sm" type="button" @click="item.open()">{{ item.actionLabel }}</button>
                </template>
              </MetaListCard>
            </div>
            <div v-if="actionErrorText" class="mt-3 qc-error-banner" role="alert" aria-live="polite">
              <p class="qc-error-banner__text">{{ actionErrorText }}</p>
            </div>
            <div v-else-if="actionSuccessText || lastConvertedOfferName" class="mt-3 qc-success-banner" aria-live="polite">
              <p class="qc-success-banner__text">{{ actionSuccessText || t('convertLeadSuccess') }}</p>
            </div>
          </template>
        </SectionPanel>

        <SectionPanel v-if="activeLeadTab === 'overview' || activeLeadTab === 'conversion'" :title="t('relatedTitle')">
          <div v-if="loading" class="card-empty">{{ t('loading') }}</div>
          <div v-else-if="loadErrorText" class="card-empty">{{ loadErrorText }}</div>
          <div v-else class="grid gap-4 lg:grid-cols-2">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('recentOffersTitle') }}</p>
              <div v-if="relatedOffers.length" class="space-y-3">
                <MetaListCard v-for="item in relatedOffers" :key="`offer-${item.name}`" :title="item.name" :description="fmtDate(item.offer_date)" :meta="relatedOfferMeta(item)">
                  <template #trailing>
                    <button class="btn btn-sm" type="button" @click="openOfferDetail(item.name)">{{ t('openOffer') }}</button>
                  </template>
                </MetaListCard>
              </div>
              <div v-else class="card-empty">{{ t('noRelatedOffers') }}</div>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('recentPoliciesTitle') }}</p>
              <div v-if="relatedPolicies.length" class="space-y-3">
                <MetaListCard v-for="item in relatedPolicies" :key="`policy-${item.name}`" :title="item.policy_no || item.name" :subtitle="item.name" :description="fmtDate(item.end_date)" :meta="relatedPolicyMeta(item)">
                  <template #trailing>
                    <button class="btn btn-sm" type="button" @click="openPolicyDetail(item.name)">{{ t('openPolicy') }}</button>
                  </template>
                </MetaListCard>
              </div>
              <div v-else class="card-empty">{{ t('noRelatedPolicies') }}</div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel v-if="activeLeadTab === 'overview' || activeLeadTab === 'operations'" :title="t('opsPreviewTitle')">
          <div v-if="loading" class="card-empty">{{ t('loading') }}</div>
          <div v-else-if="loadErrorText" class="card-empty">{{ loadErrorText }}</div>
          <div v-else class="grid gap-4 xl:grid-cols-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('notifDraftsTitle') }}</p>
              <div v-if="leadNotificationDrafts.length" class="space-y-3">
                <MetaListCard v-for="item in leadNotificationDrafts" :key="`draft-${item.name}`" :title="item.recipient || item.name" :subtitle="item.reference_name || item.name" :description="item.name || '-'" :meta="notificationPreviewMeta(item)">
                  <template #trailing>
                    <button class="btn btn-sm" type="button" @click="openCommunicationCenterForLead(item)">{{ t('openCommunication') }}</button>
                  </template>
                </MetaListCard>
              </div>
              <div v-else class="card-empty">{{ t('noNotifDrafts') }}</div>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('notifOutboxTitle') }}</p>
              <div v-if="leadNotificationOutbox.length" class="space-y-3">
                <MetaListCard v-for="item in leadNotificationOutbox" :key="`outbox-${item.name}`" :title="item.recipient || item.name" :subtitle="item.reference_name || item.name" :description="item.name || '-'" :meta="notificationPreviewMeta(item)">
                  <template #trailing>
                    <button class="btn btn-sm" type="button" @click="openCommunicationCenterForLead(item)">{{ t('openCommunication') }}</button>
                  </template>
                </MetaListCard>
              </div>
              <div v-else class="card-empty">{{ t('noNotifOutbox') }}</div>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('paymentsPreviewTitle') }}</p>
              <div v-if="leadPayments.length" class="space-y-3">
                <MetaListCard v-for="item in leadPayments" :key="`payment-${item.name}`" :title="item.payment_no || item.name" :subtitle="item.policy || item.customer || '-'" :description="fmtDate(item.payment_date)" :meta="leadPaymentMeta(item)">
                  <template #trailing>
                    <button class="btn btn-sm" type="button" @click="item.policy ? openPolicyDetail(item.policy) : openPaymentsBoard()">
                      {{ item.policy ? t('openPolicy') : t('openPayments') }}
                    </button>
                  </template>
                </MetaListCard>
              </div>
              <div v-else class="card-empty">{{ t('noPayments') }}</div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel v-if="activeLeadTab === 'overview' || activeLeadTab === 'activity'" :title="t('timelineMetaTitle')">
          <div v-if="loading" class="card-empty">{{ t('loading') }}</div>
          <div v-else-if="loadErrorText" class="card-empty">{{ loadErrorText }}</div>
          <div v-else>
            <FieldGroup :fields="leadMetaFields" :cols="2" />
            <div class="mt-4">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('activityTimelineTitle') }}</p>
              <div v-for="item in leadActivityItems" :key="item.key" class="timeline-item">
                <span class="tl-dot tl-dot-blue" />
                <div class="min-w-0 flex-1">
                  <p class="tl-text">{{ item.title }}</p>
                  <p class="text-sm text-gray-500">{{ item.description }}</p>
                  <p class="tl-time">{{ item.meta }}</p>
                </div>
              </div>
            </div>
          </div>
        </SectionPanel>
      </div>

      <aside class="detail-sidebar space-y-4">
        <SectionPanel :title="t('leadInfoTitle')">
          <div v-if="loading" class="field-value-muted">{{ t('loading') }}</div>
          <FieldGroup v-else :fields="leadInfoFields" :cols="2" />
        </SectionPanel>

        <SectionPanel :title="t('notes')">
          <p class="text-sm text-gray-600 whitespace-pre-wrap">{{ lead.notes || '-' }}</p>
        </SectionPanel>

        <SectionPanel :title="t('quickActionsTitle')">
          <div class="space-y-2">
            <button v-if="lead.customer" class="btn btn-full btn-sm" type="button" @click="openCustomer360(lead.customer)">{{ t('openCustomer360') }} →</button>
            <button v-if="lead.converted_offer" class="btn btn-full btn-sm" type="button" @click="openOfferDetail(lead.converted_offer)">{{ t('openOffer') }}</button>
            <button v-if="leadRenewals.length" class="btn btn-full btn-sm" type="button" @click="openRenewalsBoard">{{ t('openRenewals') }}</button>
            <button v-if="deskActionsEnabled()" class="btn btn-full btn-sm" type="button" @click="openDeskLead">{{ t('openDesk') }}</button>
          </div>
        </SectionPanel>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, unref } from "vue";

import { useAuthStore } from "../stores/auth";
import { deskActionsEnabled } from "../utils/deskActions";
import { useLeadDetailRuntime } from "../composables/useLeadDetailRuntime";
import MetaListCard from "../components/app-shell/MetaListCard.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import HeroStrip from "../components/ui/HeroStrip.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import FieldGroup from "../components/ui/FieldGroup.vue";

const props = defineProps({
  name: { type: String, default: "" },
});

const authStore = useAuthStore();
const activeLocale = computed(() => unref(authStore.locale) || "en");
const leadRuntime = useLeadDetailRuntime({
  name: computed(() => props.name),
  activeLocale,
});

const {
  lead,
  loading,
  loadErrorText,
  leadDisplayTitle,
  leadHeaderSubtitle,
  leadTabs,
  activeLeadTab,
  relatedOffers,
  relatedPolicies,
  leadNotificationDrafts,
  leadNotificationOutbox,
  leadPayments,
  leadRenewals,
  leadInfoFields,
  leadConversionFields,
  leadMetaFields,
  leadActivityItems,
  linkedConversionCards,
  uiLeadStatus,
  uiLeadStaleStatus,
  heroCells,
  actionErrorText,
  actionSuccessText,
  lastConvertedOfferName,
  leadConvertResource,
  fmtDate,
  relatedOfferMeta,
  relatedPolicyMeta,
  notificationPreviewMeta,
  leadPaymentMeta,
  canConvertLead,
  openCustomer360,
  openOfferDetail,
  openPolicyDetail,
  openCommunicationCenterForLead,
  openPaymentsBoard,
  openRenewalsBoard,
  goBack,
  openDeskLead,
  convertLeadToOffer,
} = leadRuntime;
</script>
