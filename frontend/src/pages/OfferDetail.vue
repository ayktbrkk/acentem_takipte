<template>
  <section class="space-y-4">
    <DocHeaderCard :eyebrow="t('overview')" :title="offer.name || name" :subtitle="offerHeaderSubtitle">
      <template #actions>
        <DetailActionRow>
          <StatusBadge type="offer" :status="offer.status || 'Draft'" />
          <ActionButton v-if="isOfferConvertible" variant="primary" size="sm" @click="openConvertInOfferBoard">
            {{ t("convertToPolicy") }}
          </ActionButton>
          <ActionButton v-if="deskActionsEnabled()" variant="secondary" size="sm" @click="openOfferDesk">{{ t("openDesk") }}</ActionButton>
          <ActionButton variant="secondary" size="sm" @click="goBack">{{ t("backList") }}</ActionButton>
        </DetailActionRow>
      </template>
      <DocSummaryGrid :items="offerHeaderSummaryItems" />
    </DocHeaderCard>

    <div class="at-detail-split">
      <aside class="at-detail-aside">
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('offerInfoTitle')" :show-count="false" />
          <div v-if="loading" class="at-empty-block">{{ t("loading") }}</div>
          <div v-else-if="loadErrorText" class="at-empty-block text-rose-700">{{ loadErrorText }}</div>
          <div v-else class="space-y-3">
            <MiniFactList :items="offerInfoFacts" />
            <InlineActionRow>
              <ActionButton v-if="offer.customer" variant="secondary" size="xs" @click="openCustomer360(offer.customer)">
                {{ t("openCustomer360") }}
              </ActionButton>
              <ActionButton
                v-if="offer.converted_policy"
                variant="secondary"
                size="xs"
                @click="openPolicyDetail(offer.converted_policy)"
              >
                {{ t("openPolicy") }}
              </ActionButton>
            </InlineActionRow>
          </div>
        </article>
      </aside>

      <div class="space-y-4">
        <DetailTabsBar v-model="activeOfferTab" :tabs="offerTabs" />

        <article
          v-if="activeOfferTab === 'overview' || activeOfferTab === 'premium'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('premiumTitle')" :show-count="false" />
          <div v-if="loading" class="at-empty-block">{{ t("loading") }}</div>
          <div v-else-if="loadErrorText" class="at-empty-block text-rose-700">{{ loadErrorText }}</div>
          <DocSummaryGrid v-else :items="premiumSummaryItems" />
        </article>

        <article
          v-if="activeOfferTab === 'overview' || activeOfferTab === 'related'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('conversionTitle')" :show-count="false" />
          <div v-if="loading" class="at-empty-block">{{ t("loading") }}</div>
          <div v-else-if="loadErrorText" class="at-empty-block text-rose-700">{{ loadErrorText }}</div>
          <div v-else class="space-y-3">
            <MiniFactList :items="conversionFacts" />
            <div v-if="conversionLinkedCards.length" class="grid gap-3 md:grid-cols-2">
              <MetaListCard
                v-for="item in conversionLinkedCards"
                :key="item.key"
                :title="item.title"
                :subtitle="item.subtitle"
                :description="item.description"
                :meta="item.meta"
              >
                <template #trailing>
                  <ActionButton variant="link" size="xs" @click="item.open()">{{ item.actionLabel }}</ActionButton>
                </template>
              </MetaListCard>
            </div>
            <p class="text-xs text-slate-500">
              {{ t("conversionHint") }}
            </p>
            <InlineActionRow>
              <ActionButton v-if="isOfferConvertible" variant="primary" size="xs" @click="openConvertInOfferBoard">
                {{ t("convertToPolicy") }}
              </ActionButton>
              <ActionButton variant="secondary" size="xs" @click="openOfferWorkbench">
                {{ t("openOfferBoard") }}
              </ActionButton>
              <ActionButton
                v-if="offer.converted_policy"
                variant="secondary"
                size="xs"
                @click="openPolicyDetail(offer.converted_policy)"
              >
                {{ t("openPolicy") }}
              </ActionButton>
            </InlineActionRow>
          </div>
        </article>

        <article
          v-if="activeOfferTab === 'overview' || activeOfferTab === 'conversion'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('relatedTitle')" :count="relatedRecordsCount" />
          <div v-if="loading" class="at-empty-block">{{ t("loading") }}</div>
          <div v-else-if="loadErrorText" class="at-empty-block text-rose-700">{{ loadErrorText }}</div>
          <div v-else class="grid gap-4 lg:grid-cols-2">
            <div class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("relatedOffersTitle") }}</p>
              <ul v-if="relatedOffers.length" class="space-y-3">
                <MetaListCard
                  v-for="item in relatedOffers"
                  :key="'offer-'+item.name"
                  :title="item.name"
                  :description="fmtDate(item.offer_date)"
                  :meta="relatedOfferMeta(item)"
                >
                  <template #trailing>
                    <ActionButton variant="link" size="xs" @click="openOfferDetail(item.name)">{{ t("openOfferDetail") }}</ActionButton>
                  </template>
                </MetaListCard>
              </ul>
              <div v-else class="at-empty-block">{{ t("noRelatedOffers") }}</div>
            </div>

            <div class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("relatedPoliciesTitle") }}</p>
              <ul v-if="relatedPolicies.length" class="space-y-3">
                <MetaListCard
                  v-for="item in relatedPolicies"
                  :key="'policy-'+item.name"
                  :title="item.policy_no || item.name"
                  :subtitle="item.name"
                  :description="fmtDate(item.end_date)"
                  :meta="relatedPolicyMeta(item)"
                >
                  <template #trailing>
                    <ActionButton variant="link" size="xs" @click="openPolicyDetail(item.name)">{{ t("openPolicy") }}</ActionButton>
                  </template>
                </MetaListCard>
              </ul>
              <div v-else class="at-empty-block">{{ t("noRelatedPolicies") }}</div>
            </div>
          </div>
        </article>

        <article
          v-if="activeOfferTab === 'overview' || activeOfferTab === 'operations'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('opsPreviewTitle')" :count="opsPreviewCount" />
          <div v-if="loading" class="at-empty-block">{{ t("loading") }}</div>
          <div v-else-if="loadErrorText" class="at-empty-block text-rose-700">{{ loadErrorText }}</div>
          <div v-else class="grid gap-4 xl:grid-cols-2">
            <div class="space-y-4">
              <div class="space-y-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("notifDraftsTitle") }}</p>
                <ul v-if="offerNotificationDrafts.length" class="space-y-3">
                  <MetaListCard
                    v-for="item in offerNotificationDrafts"
                    :key="'draft-'+item.name"
                    :title="item.recipient || item.name"
                    :subtitle="item.reference_name || item.name"
                    :description="item.name || '-'"
                    :meta="notificationPreviewMeta(item)"
                  >
                    <template #trailing>
                      <div class="flex flex-wrap items-center justify-end gap-1">
                        <StatusBadge v-if="item.status" type="notification_status" :status="item.status" />
                        <StatusBadge v-if="item.channel" type="notification_channel" :status="item.channel" />
                        <ActionButton variant="link" size="xs" @click="openCommunicationCenterForOffer(item)">{{ t("openCommunication") }}</ActionButton>
                      </div>
                    </template>
                  </MetaListCard>
                </ul>
                <div v-else class="at-empty-block">{{ t("noNotifDrafts") }}</div>
              </div>

              <div class="space-y-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("notifOutboxTitle") }}</p>
                <ul v-if="offerNotificationOutbox.length" class="space-y-3">
                  <MetaListCard
                    v-for="item in offerNotificationOutbox"
                    :key="'outbox-'+item.name"
                    :title="item.recipient || item.name"
                    :subtitle="item.reference_name || item.name"
                    :description="item.name || '-'"
                    :meta="notificationPreviewMeta(item)"
                  >
                    <template #trailing>
                      <div class="flex flex-wrap items-center justify-end gap-1">
                        <StatusBadge v-if="item.status" type="notification_status" :status="item.status" />
                        <StatusBadge v-if="item.channel" type="notification_channel" :status="item.channel" />
                        <ActionButton variant="link" size="xs" @click="openCommunicationCenterForOffer(item)">{{ t("openCommunication") }}</ActionButton>
                      </div>
                    </template>
                  </MetaListCard>
                </ul>
                <div v-else class="at-empty-block">{{ t("noNotifOutbox") }}</div>
              </div>
            </div>

            <div class="space-y-4">
              <div class="space-y-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("paymentsPreviewTitle") }}</p>
                <ul v-if="offerPayments.length" class="space-y-3">
                  <MetaListCard
                    v-for="item in offerPayments"
                    :key="'payment-'+item.name"
                    :title="item.payment_no || item.name"
                    :subtitle="item.policy || item.customer || '-'"
                    :description="fmtDate(item.payment_date)"
                    :meta="offerPaymentMeta(item)"
                  >
                    <template #trailing>
                      <ActionButton
                        variant="link"
                        size="xs"
                        @click="item.policy ? openPolicyDetail(item.policy) : openPaymentsBoard()"
                      >
                        {{ item.policy ? t("openPolicy") : t("openPayments") }}
                      </ActionButton>
                    </template>
                  </MetaListCard>
                </ul>
                <div v-else class="at-empty-block">{{ t("noPayments") }}</div>
              </div>

              <div class="space-y-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("renewalsPreviewTitle") }}</p>
                <ul v-if="offerRenewals.length" class="space-y-3">
                  <MetaListCard
                    v-for="item in offerRenewals"
                    :key="'renewal-'+item.name"
                    :title="item.policy || item.name"
                    :subtitle="item.customer || '-'"
                    :description="fmtDate(item.due_date || item.renewal_date)"
                    :meta="offerRenewalMeta(item)"
                  >
                    <template #trailing>
                      <ActionButton
                        variant="link"
                        size="xs"
                        @click="item.policy ? openPolicyDetail(item.policy) : openRenewalsBoard()"
                      >
                        {{ item.policy ? t("openPolicy") : t("openRenewals") }}
                      </ActionButton>
                    </template>
                  </MetaListCard>
                </ul>
                <div v-else class="at-empty-block">{{ t("noRenewals") }}</div>
              </div>
            </div>
          </div>
        </article>

        <article
          v-if="activeOfferTab === 'overview' || activeOfferTab === 'activity'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('notesTitle')" :show-count="false" />
          <div v-if="loading" class="at-empty-block">{{ t("loading") }}</div>
          <div v-else-if="loadErrorText" class="at-empty-block text-rose-700">{{ loadErrorText }}</div>
          <div v-else class="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p class="whitespace-pre-wrap text-sm text-slate-800">{{ offer.notes || "-" }}</p>
          </div>
        </article>

        <article
          v-if="activeOfferTab === 'overview' || activeOfferTab === 'notes'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('recordMetaTitle')" :show-count="false" />
          <div v-if="loading" class="at-empty-block">{{ t("loading") }}</div>
          <div v-else-if="loadErrorText" class="at-empty-block text-rose-700">{{ loadErrorText }}</div>
          <div v-else class="space-y-4">
            <div class="grid gap-3 md:grid-cols-2">
              <MetaListCard :title="t('createdAt')" :description="fmtDateTime(offer.creation)" :meta="offer.owner || '-'" />
              <MetaListCard :title="t('modifiedAt')" :description="fmtDateTime(offer.modified)" :meta="offer.modified_by || offer.owner || '-'" />
            </div>
            <div class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("recordTimelineTitle") }}</p>
              <ul class="space-y-3">
                <MetaListCard
                  v-for="item in offerTimelineItems"
                  :key="item.key"
                  :title="item.title"
                  :description="item.description"
                  :meta="item.meta"
                />
              </ul>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, unref, watch } from "vue";
import { useRouter } from "vue-router";
import { createResource } from "frappe-ui";

import { deskActionsEnabled } from "../utils/deskActions";
import { useAuthStore } from "../stores/auth";
import ActionButton from "../components/app-shell/ActionButton.vue";
import DetailActionRow from "../components/app-shell/DetailActionRow.vue";
import DetailTabsBar from "../components/app-shell/DetailTabsBar.vue";
import DocHeaderCard from "../components/app-shell/DocHeaderCard.vue";
import DocSummaryGrid from "../components/app-shell/DocSummaryGrid.vue";
import InlineActionRow from "../components/app-shell/InlineActionRow.vue";
import MetaListCard from "../components/app-shell/MetaListCard.vue";
import MiniFactList from "../components/app-shell/MiniFactList.vue";
import SectionCardHeader from "../components/app-shell/SectionCardHeader.vue";
import StatusBadge from "../components/StatusBadge.vue";

const props = defineProps({
  name: { type: String, default: "" },
});

const router = useRouter();
const authStore = useAuthStore();
const activeLocale = computed(() => unref(authStore.locale) || "en");

const copy = {
  tr: {
    overview: "Teklif Detayi",
    openDesk: "Yonetim Ekraninda Ac",
    backList: "Listeye Don",
    loading: "Yukleniyor...",
    loadError: "Teklif detayi yuklenemedi.",
    offerInfoTitle: "Teklif Bilgileri",
    premiumTitle: "Prim Bilgileri",
    conversionTitle: "Donusum",
    relatedTitle: "Iliskili Kayitlar",
    relatedOffersTitle: "Ayni Musteride Teklifler",
    relatedPoliciesTitle: "Ayni Musteride Policeler",
    noRelatedOffers: "Ilgili teklif bulunamadi.",
    noRelatedPolicies: "Ilgili police bulunamadi.",
    opsPreviewTitle: "Iletisim ve Operasyon",
    notifDraftsTitle: "Bildirim Taslaklari",
    notifOutboxTitle: "Giden Bildirimler",
    paymentsPreviewTitle: "Odeme Hareketleri",
    renewalsPreviewTitle: "Yenileme Gorevleri",
    noNotifDrafts: "Bildirim taslagi yok.",
    noNotifOutbox: "Giden bildirim yok.",
    noPayments: "Odeme hareketi yok.",
    noRenewals: "Yenileme gorevi yok.",
    notesTitle: "Notlar",
    recordMetaTitle: "Kayit ve Aktivite",
    recordTimelineTitle: "Kayit Olaylari",
    tabOverview: "Genel",
    tabPremium: "Prim",
    tabConversion: "Donusum",
    tabRelated: "Iliskili",
    tabOperations: "Operasyon",
    tabNotes: "Notlar",
    tabActivity: "Aktivite",
    openCustomer360: "Musteri 360",
    openCommunication: "Iletisim",
    openPayments: "Odemeler",
    openRenewals: "Yenilemeler",
    openLead: "Lead Detayi",
    openPolicy: "Police Detayi",
    openOfferDetail: "Teklif Detayi",
    openOfferBoard: "Teklif Panosu",
    convertToPolicy: "Policeye Cevir",
    conversionHint: "Durum guncelleme ve policeye cevirme islemleri teklif panosundan veya yonetim ekranindan yapilabilir.",
    linkedSourceLeadTitle: "Kaynak Lead Ozeti",
    linkedPolicyTitle: "Donusen Police Ozeti",
    accessView: "Kayit Goruntulendi",
    accessEdit: "Kayit Duzenlendi",
    accessExport: "Kayit Disa Aktarildi",
    customer: "Musteri",
    company: "Sigorta Sirketi",
    branch: "Brans",
    status: "Durum",
    offerDate: "Teklif Tarihi",
    validUntil: "Gecerlilik",
    currency: "Doviz",
    grossPremium: "Brut Prim",
    netPremium: "Net Prim",
    taxAmount: "Vergi",
    commission: "Komisyon",
    convertedPolicy: "Donusen Police",
    conversionState: "Donusum Durumu",
    conversionConverted: "Policeye Donustu",
    conversionPending: "Henuz Donusmedi",
    sourceLead: "Kaynak Lead",
    createdAt: "Olusturuldu",
    modifiedAt: "Guncellendi",
    timelineCreated: "Teklif kaydi olusturuldu",
    timelineUpdated: "Teklif kaydi guncellendi",
    timelineOffered: "Teklif tarihi",
    timelineValidUntil: "Gecerlilik sonu",
    timelineConverted: "Policeye donusum",
  },
  en: {
    overview: "Offer Detail",
    openDesk: "Open Desk",
    backList: "Back to List",
    loading: "Loading...",
    loadError: "Failed to load offer detail.",
    offerInfoTitle: "Offer Information",
    premiumTitle: "Premium Details",
    conversionTitle: "Conversion",
    relatedTitle: "Related Records",
    relatedOffersTitle: "Offers of Same Customer",
    relatedPoliciesTitle: "Policies of Same Customer",
    noRelatedOffers: "No related offers found.",
    noRelatedPolicies: "No related policies found.",
    opsPreviewTitle: "Communication & Operations",
    notifDraftsTitle: "Notification Drafts",
    notifOutboxTitle: "Outbox",
    paymentsPreviewTitle: "Payments",
    renewalsPreviewTitle: "Renewal Tasks",
    noNotifDrafts: "No notification drafts.",
    noNotifOutbox: "No outbox records.",
    noPayments: "No payments.",
    noRenewals: "No renewal tasks.",
    notesTitle: "Notes",
    recordMetaTitle: "Record & Activity",
    recordTimelineTitle: "Record Events",
    tabOverview: "Overview",
    tabPremium: "Premium",
    tabConversion: "Conversion",
    tabRelated: "Related",
    tabOperations: "Operations",
    tabNotes: "Notes",
    tabActivity: "Activity",
    openCustomer360: "Customer 360",
    openCommunication: "Communication",
    openPayments: "Payments",
    openRenewals: "Renewals",
    openLead: "Lead Detail",
    openPolicy: "Policy Detail",
    openOfferDetail: "Offer Detail",
    openOfferBoard: "Offer Board",
    convertToPolicy: "Convert to Policy",
    conversionHint: "Status updates and policy conversion can be managed from the offer board or desk form.",
    linkedSourceLeadTitle: "Source Lead Snapshot",
    linkedPolicyTitle: "Converted Policy Snapshot",
    accessView: "Record Viewed",
    accessEdit: "Record Edited",
    accessExport: "Record Exported",
    customer: "Customer",
    company: "Insurance Company",
    branch: "Branch",
    status: "Status",
    offerDate: "Offer Date",
    validUntil: "Valid Until",
    currency: "Currency",
    grossPremium: "Gross Premium",
    netPremium: "Net Premium",
    taxAmount: "Tax",
    commission: "Commission",
    convertedPolicy: "Converted Policy",
    conversionState: "Conversion State",
    conversionConverted: "Converted to Policy",
    conversionPending: "Not Converted Yet",
    sourceLead: "Source Lead",
    createdAt: "Created",
    modifiedAt: "Modified",
    timelineCreated: "Offer record created",
    timelineUpdated: "Offer record updated",
    timelineOffered: "Offer date",
    timelineValidUntil: "Valid until",
    timelineConverted: "Converted to policy",
  },
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const offerResource = createResource({ url: "frappe.client.get", auto: false });
const offerDetailPayloadResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_offer_detail_payload",
  auto: false,
});
const relatedOffersResource = createResource({ url: "frappe.client.get_list", auto: false });
const relatedPoliciesResource = createResource({ url: "frappe.client.get_list", auto: false });
const offer = computed(() => offerResource.data || {});
const loading = computed(() => offerResource.loading);
const loadErrorText = computed(() => {
  const err = offerResource.error;
  if (!err) return "";
  return err?.message || err?.exc || t("loadError");
});
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
const activeOfferTab = ref("overview");
const offerDetailPayload = computed(() =>
  offerDetailPayloadResource.data && typeof offerDetailPayloadResource.data === "object" ? offerDetailPayloadResource.data : {}
);
const isOfferConvertible = computed(
  () => !offer.value.converted_policy && ["Sent", "Accepted"].includes(String(offer.value.status || ""))
);
const relatedOffers = computed(() =>
  Array.isArray(offerDetailPayload.value.related_offers)
    ? offerDetailPayload.value.related_offers
    : offer.value.customer && Array.isArray(relatedOffersResource.data)
      ? relatedOffersResource.data
      : []
);
const relatedPolicies = computed(() =>
  Array.isArray(offerDetailPayload.value.related_policies)
    ? offerDetailPayload.value.related_policies
    : offer.value.customer && Array.isArray(relatedPoliciesResource.data)
      ? relatedPoliciesResource.data
      : []
);
const relatedRecordsCount = computed(() => relatedOffers.value.length + relatedPolicies.value.length);
const offerNotificationDrafts = computed(() =>
  Array.isArray(offerDetailPayload.value.notification_drafts) ? offerDetailPayload.value.notification_drafts : []
);
const offerNotificationOutbox = computed(() =>
  Array.isArray(offerDetailPayload.value.notification_outbox) ? offerDetailPayload.value.notification_outbox : []
);
const offerPayments = computed(() => (Array.isArray(offerDetailPayload.value.payments) ? offerDetailPayload.value.payments : []));
const offerRenewals = computed(() => (Array.isArray(offerDetailPayload.value.renewals) ? offerDetailPayload.value.renewals : []));
const opsPreviewCount = computed(
  () => offerNotificationDrafts.value.length + offerNotificationOutbox.value.length + offerPayments.value.length + offerRenewals.value.length
);

const offerHeaderSubtitle = computed(() =>
  [offer.value.customer || null, offer.value.insurance_company || null].filter(Boolean).join(" / ")
);
const offerHeaderSummaryItems = computed(() => [
  { key: "status", label: t("status"), value: offer.value.status || "-" },
  { key: "offerDate", label: t("offerDate"), value: fmtDate(offer.value.offer_date) },
  { key: "valid", label: t("validUntil"), value: fmtDate(offer.value.valid_until) },
  { key: "gross", label: t("grossPremium"), value: fmtMoney(offer.value.gross_premium, offer.value.currency || "TRY") },
  { key: "commission", label: t("commission"), value: fmtMoney(offer.value.commission_amount, offer.value.currency || "TRY") },
]);
const offerTabs = computed(() => [
  { value: "overview", label: t("tabOverview") },
  { value: "premium", label: t("tabPremium") },
  { value: "conversion", label: t("tabConversion") },
  { value: "related", label: t("tabRelated"), count: relatedRecordsCount.value || undefined },
  { value: "operations", label: t("tabOperations"), count: opsPreviewCount.value || undefined },
  { value: "notes", label: t("tabNotes"), count: offer.value.notes ? 1 : undefined },
  { value: "activity", label: t("tabActivity"), count: offerTimelineItems.value.length || undefined },
]);
const offerInfoFacts = computed(() => [
  { key: "customer", label: t("customer"), value: offer.value.customer || "-" },
  { key: "sourceLead", label: t("sourceLead"), value: offer.value.source_lead || "-" },
  { key: "company", label: t("company"), value: offer.value.insurance_company || "-" },
  { key: "branch", label: t("branch"), value: offer.value.branch || "-" },
  { key: "status", label: t("status"), value: offer.value.status || "-" },
  { key: "offerDate", label: t("offerDate"), value: fmtDate(offer.value.offer_date) },
  { key: "validUntil", label: t("validUntil"), value: fmtDate(offer.value.valid_until) },
  { key: "currency", label: t("currency"), value: offer.value.currency || "TRY" },
]);
const premiumSummaryItems = computed(() => [
  { key: "gross", label: t("grossPremium"), value: fmtMoney(offer.value.gross_premium, offer.value.currency || "TRY") },
  { key: "net", label: t("netPremium"), value: fmtMoney(offer.value.net_premium, offer.value.currency || "TRY") },
  { key: "tax", label: t("taxAmount"), value: fmtMoney(offer.value.tax_amount, offer.value.currency || "TRY") },
  { key: "commission", label: t("commission"), value: fmtMoney(offer.value.commission_amount, offer.value.currency || "TRY") },
]);
const conversionFacts = computed(() => [
  {
    key: "state",
    label: t("conversionState"),
    value: offer.value.converted_policy ? t("conversionConverted") : t("conversionPending"),
  },
  {
    key: "policy",
    label: t("convertedPolicy"),
    value: offer.value.converted_policy || "-",
  },
]);
const offerTimelineItems = computed(() => {
  const payloadEvents = Array.isArray(offerDetailPayload.value.activity) ? offerDetailPayload.value.activity : [];
  if (payloadEvents.length) {
    return payloadEvents.map(mapOfferActivityEvent).filter(Boolean);
  }
  const items = [];
  if (offer.value.creation) {
    items.push({
      key: "created",
      title: t("timelineCreated"),
      description: fmtDateTime(offer.value.creation),
      meta: offer.value.owner || "-",
    });
  }
  if (offer.value.offer_date) {
    items.push({
      key: "offerDate",
      title: t("timelineOffered"),
      description: fmtDate(offer.value.offer_date),
      meta: offer.value.status || "-",
    });
  }
  if (offer.value.valid_until) {
    items.push({
      key: "validUntil",
      title: t("timelineValidUntil"),
      description: fmtDate(offer.value.valid_until),
      meta: offer.value.converted_policy ? t("conversionConverted") : t("conversionPending"),
    });
  }
  if (offer.value.converted_policy) {
    items.push({
      key: "converted",
      title: t("timelineConverted"),
      description: offer.value.converted_policy,
      meta: offer.value.status || "Converted",
    });
  }
  if (offer.value.modified) {
    items.push({
      key: "modified",
      title: t("timelineUpdated"),
      description: fmtDateTime(offer.value.modified),
      meta: offer.value.modified_by || offer.value.owner || "-",
    });
  }
  return items;
});
const payloadSourceLead = computed(() => offerDetailPayload.value.source_lead || null);
const payloadLinkedPolicy = computed(() => offerDetailPayload.value.linked_policy || null);
const conversionLinkedCards = computed(() => {
  const cards = [];
  if (payloadSourceLead.value?.name) {
    cards.push({
      key: "source-lead",
      title: t("linkedSourceLeadTitle"),
      subtitle: payloadSourceLead.value.display_name || payloadSourceLead.value.name,
      description: payloadSourceLead.value.email || "-",
      meta: payloadSourceLead.value.status || "-",
      actionLabel: t("openLead"),
      open: () => router.push({ name: "lead-detail", params: { name: payloadSourceLead.value.name } }),
    });
  }
  if (payloadLinkedPolicy.value?.name) {
    cards.push({
      key: "linked-policy",
      title: t("linkedPolicyTitle"),
      subtitle: payloadLinkedPolicy.value.policy_no || payloadLinkedPolicy.value.name,
      description: fmtDate(payloadLinkedPolicy.value.end_date),
      meta: [payloadLinkedPolicy.value.status || null, fmtMoney(payloadLinkedPolicy.value.gross_premium, payloadLinkedPolicy.value.currency || "TRY")]
        .filter(Boolean)
        .join(" / "),
      actionLabel: t("openPolicy"),
      open: () => openPolicyDetail(payloadLinkedPolicy.value.name),
    });
  }
  return cards;
});

async function loadRelatedRecords() {
  const customer = String(offer.value.customer || "").trim();
  if (!customer) return;
  await Promise.allSettled([
    relatedOffersResource.reload({
      doctype: "AT Offer",
      fields: ["name", "status", "offer_date", "gross_premium", "currency", "modified"],
      filters: [["customer", "=", customer], ["name", "!=", props.name]],
      order_by: "modified desc",
      limit_page_length: 5,
    }),
    relatedPoliciesResource.reload({
      doctype: "AT Policy",
      fields: ["name", "policy_no", "status", "end_date", "gross_premium", "currency", "modified"],
      filters: { customer },
      order_by: "modified desc",
      limit_page_length: 5,
    }),
  ]);
}

async function loadOffer() {
  if (!props.name) return;
  await Promise.allSettled([
    offerResource.reload({ doctype: "AT Offer", name: props.name }),
    offerDetailPayloadResource.reload({ name: props.name }),
  ]);
  const hasPayloadRelated =
    Array.isArray(offerDetailPayload.value.related_offers) || Array.isArray(offerDetailPayload.value.related_policies);
  if (!hasPayloadRelated) {
    await loadRelatedRecords();
  }
}

function openOfferDesk() {
  if (!props.name) return;
  window.location.assign(`/app/at-offer/${encodeURIComponent(props.name)}`);
}
function goBack() {
  router.push({ name: "offer-board", query: { view: "list" } }).catch(() => {
    router.push({ name: "offer-board" });
  });
}
function openCustomer360(name) {
  if (!name) return;
  router.push({ name: "customer-detail", params: { name } });
}
function openPolicyDetail(name) {
  if (!name) return;
  router.push({ name: "policy-detail", params: { name } });
}
function openCommunicationCenterForOffer(item = null) {
  const query = {
    customer: offer.value.customer || "",
    customer_label: offer.value.customer || offer.name || props.name || "",
  };
  if (item && typeof item === "object") {
    const channel = String(item.channel || "").trim();
    const status = String(item.status || "").trim();
    const referenceDoctype = String(item.reference_doctype || "").trim();
    const referenceName = String(item.reference_name || "").trim();
    if (channel) query.channel = channel;
    if (status) query.status = status;
    if (referenceDoctype) {
      query.reference_doctype = referenceDoctype;
      query.reference_label = referenceDoctype;
    }
    if (referenceName) query.reference_name = referenceName;
  }
  router.push({ name: "communication-center", query });
}
function openOfferDetail(name) {
  if (!name) return;
  router.push({ name: "offer-detail", params: { name } });
}
function openPaymentsBoard() {
  router.push({ name: "payments-board" });
}
function openRenewalsBoard() {
  router.push({ name: "renewals-board" });
}
function openOfferWorkbench() {
  router.push({ name: "offer-board" });
}
function openConvertInOfferBoard() {
  if (!props.name || !isOfferConvertible.value) return;
  router.push({ name: "offer-board", query: { view: "list", convert_offer: props.name } });
}

function fmtMoney(value, currency = "TRY") {
  return new Intl.NumberFormat(localeCode.value, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}
function fmtDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(localeCode.value).format(new Date(value));
}
function fmtDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(localeCode.value, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
function relatedOfferMeta(item) {
  return [item?.status || null, fmtMoney(item?.gross_premium, item?.currency || "TRY")].filter(Boolean).join(" / ");
}
function relatedPolicyMeta(item) {
  return [item?.status || null, fmtMoney(item?.gross_premium, item?.currency || "TRY")].filter(Boolean).join(" / ");
}
function offerPaymentMeta(item) {
  return [item?.payment_direction || null, item?.status || null, fmtMoney(item?.amount_try, "TRY")].filter(Boolean).join(" / ");
}
function offerRenewalMeta(item) {
  return [item?.status || null, item?.renewal_date ? fmtDate(item.renewal_date) : null, item?.assigned_to || null]
    .filter(Boolean)
    .join(" / ");
}
function notificationPreviewMeta(item) {
  return [item?.reference_doctype || null, item?.modified ? fmtDateTime(item.modified) : null].filter(Boolean).join(" / ");
}
function mapOfferActivityEvent(event) {
  if (!event || typeof event !== "object") return null;
  const type = String(event.event_type || "").trim();
  if (!type) return null;
  if (type === "access") {
    const action = String(event.action || "View");
    const actionLabel =
      action === "Edit" ? t("accessEdit") : action === "Export" ? t("accessExport") : t("accessView");
    return {
      key: event.key || `access-${event.at}-${event.actor}`,
      title: actionLabel,
      description: fmtDateTime(event.at),
      meta: [event.actor || null, event.meta || null].filter(Boolean).join(" / "),
    };
  }
  const titleMap = {
    created: t("timelineCreated"),
    modified: t("timelineUpdated"),
    offer_date: t("timelineOffered"),
    valid_until: t("timelineValidUntil"),
    converted_policy: t("timelineConverted"),
  };
  return {
    key: event.key || `${type}-${event.at || ""}`,
    title: titleMap[type] || type,
    description: event.reference_name || fmtDateTime(event.at),
    meta: [event.actor || null, event.at ? fmtDateTime(event.at) : null].filter(Boolean).join(" / "),
  };
}

watch(
  () => props.name,
  () => {
    activeOfferTab.value = "overview";
    loadOffer();
  },
  { immediate: true }
);
</script>
