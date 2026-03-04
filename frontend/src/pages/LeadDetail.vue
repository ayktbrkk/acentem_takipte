<template>
  <section class="space-y-4">
    <DocHeaderCard :eyebrow="t('overview')" :title="leadDisplayTitle" :subtitle="leadHeaderSubtitle">
      <template #actions>
        <DetailActionRow>
          <StatusBadge type="lead" :status="lead.status || 'Draft'" />
          <StatusBadge type="lead_stale" :status="leadStaleState(lead)" />
          <ActionButton v-if="deskActionsEnabled()" variant="secondary" size="sm" @click="openDeskLead">{{ t("openDesk") }}</ActionButton>
          <ActionButton variant="secondary" size="sm" @click="goBack">{{ t("backList") }}</ActionButton>
        </DetailActionRow>
      </template>
      <DocSummaryGrid :items="leadHeaderSummaryItems" />
    </DocHeaderCard>

    <div class="at-detail-split">
      <aside class="at-detail-aside">
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('leadInfoTitle')" :show-count="false" />
          <div v-if="loading" class="at-empty-block">{{ t("loading") }}</div>
          <div v-else-if="loadErrorText" class="at-empty-block text-rose-700">{{ loadErrorText }}</div>
          <div v-else class="space-y-3">
            <MiniFactList :items="leadInfoFacts" />
            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t("notes") }}</p>
              <p class="mt-1 whitespace-pre-wrap text-sm text-slate-800">{{ lead.notes || "-" }}</p>
            </div>
          </div>
        </article>
      </aside>

      <div class="space-y-4">
        <DetailTabsBar v-model="activeLeadTab" :tabs="leadTabs" />

        <article
          v-if="activeLeadTab === 'overview' || activeLeadTab === 'related'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('conversionTitle')" :show-count="false" />
          <div v-if="loading" class="at-empty-block">{{ t("loading") }}</div>
          <div v-else-if="loadErrorText" class="at-empty-block text-rose-700">{{ loadErrorText }}</div>
          <div v-else class="space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <StatusBadge type="lead_conversion" :status="leadConversionState(lead)" />
              <StatusBadge type="lead" :status="lead.status || 'Draft'" />
            </div>
            <MiniFactList :items="leadConversionFacts" />
            <div v-if="linkedConversionCards.length" class="grid gap-3 md:grid-cols-2">
              <MetaListCard
                v-for="item in linkedConversionCards"
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
            <p
              v-if="actionErrorText"
              class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
            >
              {{ actionErrorText }}
            </p>
            <div
              v-else-if="lastConvertedOfferName"
              class="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2"
            >
              <p class="text-xs font-medium text-emerald-700">{{ t("convertLeadSuccess") }}</p>
              <ActionButton variant="link" size="xs" @click="openOfferDetail(lastConvertedOfferName)">
                {{ t("openOffer") }}
              </ActionButton>
            </div>
            <p
              v-else-if="actionSuccessText"
              class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"
            >
              {{ actionSuccessText }}
            </p>
            <InlineActionRow>
              <ActionButton
                v-if="canConvertLead(lead)"
                variant="primary"
                size="xs"
                :disabled="leadConvertResource.loading"
                @click="convertLeadToOffer"
              >
                {{ leadConvertResource.loading ? t("converting") : t("convertNow") }}
              </ActionButton>
              <ActionButton
                v-if="lead.customer"
                variant="secondary"
                size="xs"
                @click="openCustomer360(lead.customer)"
              >
                {{ t("openCustomer360") }}
              </ActionButton>
              <ActionButton
                v-if="lead.converted_offer"
                variant="secondary"
                size="xs"
                @click="openOfferDetail(lead.converted_offer)"
              >
                {{ t("openOffer") }}
              </ActionButton>
              <ActionButton
                v-if="lead.converted_policy"
                variant="secondary"
                size="xs"
                @click="openPolicyDetail(lead.converted_policy)"
              >
                {{ t("openPolicy") }}
              </ActionButton>
            </InlineActionRow>
          </div>
        </article>

        <article
          v-if="activeLeadTab === 'overview' || activeLeadTab === 'conversion'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('relatedTitle')" :count="relatedRecordsCount" />
          <div v-if="loading" class="at-empty-block">{{ t("loading") }}</div>
          <div v-else-if="loadErrorText" class="at-empty-block text-rose-700">{{ loadErrorText }}</div>
          <div v-else class="grid gap-4 lg:grid-cols-2">
            <div class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("recentOffersTitle") }}</p>
              <ul v-if="relatedOffers.length" class="space-y-3">
                <MetaListCard
                  v-for="item in relatedOffers"
                  :key="'offer-'+item.name"
                  :title="item.name"
                  :description="fmtDate(item.offer_date)"
                  :meta="relatedOfferMeta(item)"
                >
                  <template #trailing>
                    <ActionButton variant="link" size="xs" @click="openOfferDetail(item.name)">{{ t("openOffer") }}</ActionButton>
                  </template>
                </MetaListCard>
              </ul>
              <div v-else class="at-empty-block">{{ t("noRelatedOffers") }}</div>
            </div>

            <div class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("recentPoliciesTitle") }}</p>
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
          v-if="activeLeadTab === 'overview' || activeLeadTab === 'operations'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('opsPreviewTitle')" :count="opsPreviewCount" />
          <div v-if="loading" class="at-empty-block">{{ t("loading") }}</div>
          <div v-else-if="loadErrorText" class="at-empty-block text-rose-700">{{ loadErrorText }}</div>
          <div v-else class="grid gap-4 xl:grid-cols-2">
            <div class="space-y-4">
              <div class="space-y-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("notifDraftsTitle") }}</p>
                <ul v-if="leadNotificationDrafts.length" class="space-y-3">
                  <MetaListCard
                    v-for="item in leadNotificationDrafts"
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
                        <ActionButton variant="link" size="xs" @click="openCommunicationCenterForLead(item)">{{ t("openCommunication") }}</ActionButton>
                      </div>
                    </template>
                  </MetaListCard>
                </ul>
                <div v-else class="at-empty-block">{{ t("noNotifDrafts") }}</div>
              </div>

              <div class="space-y-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("notifOutboxTitle") }}</p>
                <ul v-if="leadNotificationOutbox.length" class="space-y-3">
                  <MetaListCard
                    v-for="item in leadNotificationOutbox"
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
                        <ActionButton variant="link" size="xs" @click="openCommunicationCenterForLead(item)">{{ t("openCommunication") }}</ActionButton>
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
                <ul v-if="leadPayments.length" class="space-y-3">
                  <MetaListCard
                    v-for="item in leadPayments"
                    :key="'payment-'+item.name"
                    :title="item.payment_no || item.name"
                    :subtitle="item.policy || item.customer || '-'"
                    :description="fmtDate(item.payment_date)"
                    :meta="leadPaymentMeta(item)"
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
                <ul v-if="leadRenewals.length" class="space-y-3">
                  <MetaListCard
                    v-for="item in leadRenewals"
                    :key="'renewal-'+item.name"
                    :title="item.policy || item.name"
                    :subtitle="item.customer || '-'"
                    :description="fmtDate(item.due_date || item.renewal_date)"
                    :meta="leadRenewalMeta(item)"
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
          v-if="activeLeadTab === 'overview' || activeLeadTab === 'activity'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('timelineMetaTitle')" :show-count="false" />
          <div v-if="loading" class="at-empty-block">{{ t("loading") }}</div>
          <div v-else-if="loadErrorText" class="at-empty-block text-rose-700">{{ loadErrorText }}</div>
          <div v-else class="space-y-4">
            <div class="grid gap-3 md:grid-cols-2">
              <MetaListCard :title="t('createdAt')" :description="fmtDateTime(lead.creation)" :meta="lead.owner || '-'" />
              <MetaListCard :title="t('modifiedAt')" :description="fmtDateTime(lead.modified)" :meta="lead.modified_by || lead.owner || '-'" />
            </div>
            <div class="space-y-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("activityTimelineTitle") }}</p>
              <ul class="space-y-3">
                <MetaListCard
                  v-for="item in leadActivityItems"
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
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { createResource } from "frappe-ui";

import { deskActionsEnabled } from "../utils/deskActions";
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
import { sessionState } from "../state/session";

const props = defineProps({
  name: { type: String, default: "" },
});

const router = useRouter();

const copy = {
  tr: {
    overview: "Lead Detayi",
    openDesk: "Yonetim Ekraninda Ac",
    backList: "Listeye Don",
    loading: "Yukleniyor...",
    loadError: "Lead detayi yuklenemedi.",
    leadInfoTitle: "Lead Bilgileri",
    conversionTitle: "Donusum Durumu",
    relatedTitle: "Iliskili Kayitlar",
    recentOffersTitle: "Ilgili Teklifler",
    recentPoliciesTitle: "Ilgili Policeler",
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
    timelineMetaTitle: "Kayit Zamanlari",
    activityTimelineTitle: "Aktivite Ozet",
    tabOverview: "Genel",
    tabConversion: "Donusum",
    tabRelated: "Iliskili",
    tabOperations: "Operasyon",
    tabActivity: "Aktivite",
    openCustomer360: "Musteri 360",
    openOffer: "Teklif Detayi",
    openPolicy: "Police Detayi",
    openCommunication: "Iletisim",
    openPayments: "Odemeler",
    openRenewals: "Yenilemeler",
    customer: "Musteri",
    email: "E-posta",
    salesEntity: "Satis Birimi",
    company: "Sigorta Sirketi",
    branch: "Brans",
    estimatedGross: "Tahmini Brut Prim",
    notes: "Notlar",
    convertedOffer: "Donusen Teklif",
    convertedPolicy: "Donusen Police",
    noConversion: "Henuz donusum yok",
    nextAction: "Sonraki Aksiyon",
    missingFields: "Eksik Alanlar",
    conversionActionConvert: "Teklife Cevir",
    conversionActionReview: "Bilgileri Tamamla",
    conversionActionClosed: "Kapali Lead",
    linkedOfferTitle: "Donusen Teklif Ozeti",
    linkedPolicyTitle: "Donusen Police Ozeti",
    accessView: "Kayit Goruntulendi",
    accessEdit: "Kayit Duzenlendi",
    accessExport: "Kayit Disa Aktarildi",
    convertNow: "Teklife Cevir",
    converting: "Cevriliyor...",
    convertLeadSuccess: "Lead teklife donusturuldu.",
    convertLeadError: "Lead teklife cevrilemedi.",
    status: "Durum",
    stale: "Takip Durumu",
    createdAt: "Olusturuldu",
    modifiedAt: "Guncellendi",
    timelineEventCreated: "Lead olusturuldu",
    timelineEventUpdated: "Lead guncellendi",
    timelineEventOffer: "Teklife donustu",
    timelineEventPolicy: "Policeye donustu",
  },
  en: {
    overview: "Lead Detail",
    openDesk: "Open Desk",
    backList: "Back to List",
    loading: "Loading...",
    loadError: "Failed to load lead detail.",
    leadInfoTitle: "Lead Information",
    conversionTitle: "Conversion Status",
    relatedTitle: "Related Records",
    recentOffersTitle: "Related Offers",
    recentPoliciesTitle: "Related Policies",
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
    timelineMetaTitle: "Record Timestamps",
    activityTimelineTitle: "Activity Summary",
    tabOverview: "Overview",
    tabConversion: "Conversion",
    tabRelated: "Related",
    tabOperations: "Operations",
    tabActivity: "Activity",
    openCustomer360: "Customer 360",
    openOffer: "Offer Detail",
    openPolicy: "Policy Detail",
    openCommunication: "Communication",
    openPayments: "Payments",
    openRenewals: "Renewals",
    customer: "Customer",
    email: "Email",
    salesEntity: "Sales Entity",
    company: "Insurance Company",
    branch: "Branch",
    estimatedGross: "Estimated Gross Premium",
    notes: "Notes",
    convertedOffer: "Converted Offer",
    convertedPolicy: "Converted Policy",
    noConversion: "No conversion yet",
    nextAction: "Next Action",
    missingFields: "Missing Fields",
    conversionActionConvert: "Convert to Offer",
    conversionActionReview: "Complete Fields",
    conversionActionClosed: "Closed Lead",
    linkedOfferTitle: "Converted Offer Snapshot",
    linkedPolicyTitle: "Converted Policy Snapshot",
    accessView: "Record Viewed",
    accessEdit: "Record Edited",
    accessExport: "Record Exported",
    convertNow: "Convert to Offer",
    converting: "Converting...",
    convertLeadSuccess: "Lead converted to offer.",
    convertLeadError: "Failed to convert lead to offer.",
    status: "Status",
    stale: "Follow-up",
    createdAt: "Created",
    modifiedAt: "Modified",
    timelineEventCreated: "Lead created",
    timelineEventUpdated: "Lead updated",
    timelineEventOffer: "Converted to offer",
    timelineEventPolicy: "Converted to policy",
  },
};

function t(key) {
  return copy[sessionState.locale]?.[key] || copy.en[key] || key;
}

const leadResource = createResource({ url: "frappe.client.get", auto: false });
const leadDetailPayloadResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_lead_detail_payload",
  auto: false,
});
const leadRelatedOffersResource = createResource({ url: "frappe.client.get_list", auto: false });
const leadRelatedPoliciesResource = createResource({ url: "frappe.client.get_list", auto: false });
const leadConvertResource = createResource({
  url: "acentem_takipte.acentem_takipte.doctype.at_lead.at_lead.convert_to_offer",
  auto: false,
});
const lead = computed(() => leadResource.data || {});
const loading = computed(() => leadResource.loading);
const loadErrorText = computed(() => {
  const err = leadResource.error;
  if (!err) return "";
  return err?.message || err?.exc || t("loadError");
});
const localeCode = computed(() => (sessionState.locale === "tr" ? "tr-TR" : "en-US"));
const actionErrorText = ref("");
const actionSuccessText = ref("");
const lastConvertedOfferName = ref("");
const activeLeadTab = ref("overview");
let actionFlashTimer = null;
const leadDetailPayload = computed(() => (leadDetailPayloadResource.data && typeof leadDetailPayloadResource.data === "object" ? leadDetailPayloadResource.data : {}));

const leadDisplayTitle = computed(() => {
  const first = String(lead.value.first_name || "").trim();
  const last = String(lead.value.last_name || "").trim();
  return `${first} ${last}`.trim() || lead.value.name || props.name;
});
const leadHeaderSubtitle = computed(() =>
  [lead.value.email || null, lead.value.customer || null].filter(Boolean).join(" / ")
);
const leadHeaderSummaryItems = computed(() => [
  { key: "status", label: t("status"), value: lead.value.status || "-" },
  { key: "stale", label: t("stale"), value: leadStaleLabel(leadStaleState(lead.value)) },
  { key: "est", label: t("estimatedGross"), value: fmtMoney(lead.value.estimated_gross_premium, "TRY") },
  { key: "offer", label: t("convertedOffer"), value: lead.value.converted_offer || "-" },
  { key: "policy", label: t("convertedPolicy"), value: lead.value.converted_policy || "-" },
]);
const leadTabs = computed(() => [
  { value: "overview", label: t("tabOverview") },
  { value: "conversion", label: t("tabConversion") },
  { value: "related", label: t("tabRelated"), count: relatedRecordsCount.value || undefined },
  { value: "operations", label: t("tabOperations"), count: opsPreviewCount.value || undefined },
  { value: "activity", label: t("tabActivity"), count: leadActivityItems.value.length || undefined },
]);
const relatedOffers = computed(() =>
  Array.isArray(leadDetailPayload.value.related_offers)
    ? leadDetailPayload.value.related_offers
    : lead.value.customer && Array.isArray(leadRelatedOffersResource.data)
      ? leadRelatedOffersResource.data
      : []
);
const relatedPolicies = computed(() =>
  Array.isArray(leadDetailPayload.value.related_policies)
    ? leadDetailPayload.value.related_policies
    : lead.value.customer && Array.isArray(leadRelatedPoliciesResource.data)
      ? leadRelatedPoliciesResource.data
      : []
);
const relatedRecordsCount = computed(() => relatedOffers.value.length + relatedPolicies.value.length);
const leadNotificationDrafts = computed(() =>
  Array.isArray(leadDetailPayload.value.notification_drafts) ? leadDetailPayload.value.notification_drafts : []
);
const leadNotificationOutbox = computed(() =>
  Array.isArray(leadDetailPayload.value.notification_outbox) ? leadDetailPayload.value.notification_outbox : []
);
const leadPayments = computed(() => (Array.isArray(leadDetailPayload.value.payments) ? leadDetailPayload.value.payments : []));
const leadRenewals = computed(() => (Array.isArray(leadDetailPayload.value.renewals) ? leadDetailPayload.value.renewals : []));
const opsPreviewCount = computed(
  () => leadNotificationDrafts.value.length + leadNotificationOutbox.value.length + leadPayments.value.length + leadRenewals.value.length
);

const leadInfoFacts = computed(() => [
  { key: "customer", label: t("customer"), value: lead.value.customer || "-" },
  { key: "email", label: t("email"), value: lead.value.email || "-" },
  { key: "sales", label: t("salesEntity"), value: lead.value.sales_entity || "-" },
  { key: "company", label: t("company"), value: lead.value.insurance_company || "-" },
  { key: "branch", label: t("branch"), value: lead.value.branch || "-" },
  { key: "est", label: t("estimatedGross"), value: fmtMoney(lead.value.estimated_gross_premium, "TRY") },
]);

const leadConversionFacts = computed(() => {
  const row = lead.value;
  const items = [];
  if (row.converted_offer) items.push({ key: "offer", label: t("convertedOffer"), value: row.converted_offer });
  if (row.converted_policy) items.push({ key: "policy", label: t("convertedPolicy"), value: row.converted_policy });
  if (!items.length) {
    const nextAction =
      String(row.status || "") === "Closed"
        ? t("conversionActionClosed")
        : canConvertLead(row)
          ? t("conversionActionConvert")
          : t("conversionActionReview");
    items.push({ key: "none", label: t("convertedPolicy"), value: t("noConversion") });
    items.push({ key: "next", label: t("nextAction"), value: nextAction });
    const missing = leadConversionMissingFields(row);
    if (missing) items.push({ key: "missing", label: t("missingFields"), value: missing });
  }
  return items;
});
const leadActivityItems = computed(() => {
  const payloadEvents = Array.isArray(leadDetailPayload.value.activity) ? leadDetailPayload.value.activity : [];
  if (payloadEvents.length) {
    return payloadEvents.map(mapLeadActivityEvent).filter(Boolean);
  }
  const items = [];
  if (lead.value.creation) {
    items.push({
      key: "created",
      title: t("timelineEventCreated"),
      description: fmtDateTime(lead.value.creation),
      meta: lead.value.owner || "-",
    });
  }
  if (lead.value.converted_offer) {
    items.push({
      key: "converted_offer",
      title: t("timelineEventOffer"),
      description: lead.value.converted_offer,
      meta: lead.value.converted_policy ? `${t("openPolicy")}: ${lead.value.converted_policy}` : "",
    });
  }
  if (lead.value.converted_policy) {
    items.push({
      key: "converted_policy",
      title: t("timelineEventPolicy"),
      description: lead.value.converted_policy,
      meta: lead.value.converted_offer ? `${t("openOffer")}: ${lead.value.converted_offer}` : "",
    });
  }
  if (lead.value.modified) {
    items.push({
      key: "modified",
      title: t("timelineEventUpdated"),
      description: fmtDateTime(lead.value.modified),
      meta: lead.value.modified_by || lead.value.owner || "-",
    });
  }
  return items;
});
const linkedConvertedOfferSummary = computed(() => leadDetailPayload.value.linked_offer || null);
const linkedConvertedPolicySummary = computed(() => leadDetailPayload.value.linked_policy || null);
const linkedConversionCards = computed(() => {
  const cards = [];
  if (linkedConvertedOfferSummary.value?.name) {
    cards.push({
      key: "linked-offer",
      title: t("linkedOfferTitle"),
      subtitle: linkedConvertedOfferSummary.value.name,
      description: fmtDate(linkedConvertedOfferSummary.value.offer_date),
      meta: [linkedConvertedOfferSummary.value.status || null, fmtMoney(linkedConvertedOfferSummary.value.gross_premium, linkedConvertedOfferSummary.value.currency || "TRY")]
        .filter(Boolean)
        .join(" / "),
      actionLabel: t("openOffer"),
      open: () => openOfferDetail(linkedConvertedOfferSummary.value.name),
    });
  }
  if (linkedConvertedPolicySummary.value?.name) {
    cards.push({
      key: "linked-policy",
      title: t("linkedPolicyTitle"),
      subtitle: linkedConvertedPolicySummary.value.policy_no || linkedConvertedPolicySummary.value.name,
      description: fmtDate(linkedConvertedPolicySummary.value.end_date),
      meta: [linkedConvertedPolicySummary.value.status || null, fmtMoney(linkedConvertedPolicySummary.value.gross_premium, linkedConvertedPolicySummary.value.currency || "TRY")]
        .filter(Boolean)
        .join(" / "),
      actionLabel: t("openPolicy"),
      open: () => openPolicyDetail(linkedConvertedPolicySummary.value.name),
    });
  }
  return cards;
});

async function loadLeadRelatedRecords() {
  const customer = String(lead.value.customer || "").trim();
  if (!customer) return;
  await Promise.allSettled([
    leadRelatedOffersResource.reload({
      doctype: "AT Offer",
      fields: ["name", "status", "offer_date", "gross_premium", "currency", "modified"],
      filters: { customer },
      order_by: "modified desc",
      limit_page_length: 5,
    }),
    leadRelatedPoliciesResource.reload({
      doctype: "AT Policy",
      fields: ["name", "policy_no", "status", "end_date", "gross_premium", "currency", "modified"],
      filters: { customer },
      order_by: "modified desc",
      limit_page_length: 5,
    }),
  ]);
}

async function loadLead() {
  if (!props.name) return;
  const [leadResult] = await Promise.allSettled([
    leadResource.reload({ doctype: "AT Lead", name: props.name }),
    leadDetailPayloadResource.reload({ name: props.name }),
  ]);
  const result = leadResult.status === "fulfilled" ? leadResult.value : null;
  const hasPayloadRelated =
    Array.isArray(leadDetailPayload.value.related_offers) || Array.isArray(leadDetailPayload.value.related_policies);
  if (!hasPayloadRelated) {
    await loadLeadRelatedRecords();
  }
  return result;
}

function goBack() {
  router.push({ name: "lead-list" });
}
function openDeskLead() {
  if (!props.name) return;
  window.location.href = `/app/at-lead/${encodeURIComponent(props.name)}`;
}
function openCustomer360(name) {
  if (!name) return;
  router.push({ name: "customer-detail", params: { name } });
}
function openOfferDetail(name) {
  if (!name) return;
  router.push({ name: "offer-detail", params: { name } });
}
function openPolicyDetail(name) {
  if (!name) return;
  router.push({ name: "policy-detail", params: { name } });
}
function openCommunicationCenterForLead(item = null) {
  const query = {
    customer: lead.value.customer || "",
    customer_label: leadDisplayTitle.value || lead.value.customer || "",
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
function openPaymentsBoard() {
  router.push({ name: "payments-board" });
}
function openRenewalsBoard() {
  router.push({ name: "renewals-board" });
}

function canConvertLead(row) {
  if (!row || row.converted_offer || row.converted_policy) return false;
  if (String(row.status || "") === "Closed") return false;
  if (!row.customer || !row.sales_entity || !row.insurance_company || !row.branch) return false;
  const estimated = Number(row.estimated_gross_premium || 0);
  return Number.isFinite(estimated) && estimated > 0;
}
function clearActionFeedback() {
  if (actionFlashTimer) {
    window.clearTimeout(actionFlashTimer);
    actionFlashTimer = null;
  }
  actionErrorText.value = "";
  actionSuccessText.value = "";
  lastConvertedOfferName.value = "";
}
function scheduleActionFeedbackClear() {
  if (actionFlashTimer) window.clearTimeout(actionFlashTimer);
  actionFlashTimer = window.setTimeout(() => {
    actionErrorText.value = "";
    actionSuccessText.value = "";
    lastConvertedOfferName.value = "";
    actionFlashTimer = null;
  }, 4000);
}
async function convertLeadToOffer() {
  const row = lead.value;
  if (!canConvertLead(row) || !row?.name || leadConvertResource.loading) return;
  clearActionFeedback();
  try {
    const result = await leadConvertResource.submit({ lead_name: row.name });
    const offerName = String(result?.offer || "").trim();
    if (offerName) {
      lastConvertedOfferName.value = offerName;
      actionSuccessText.value = "";
      await loadLead();
      scheduleActionFeedbackClear();
      router.push({ name: "offer-detail", params: { name: offerName } });
      return;
    }
    actionSuccessText.value = String(result?.message || t("convertLeadSuccess"));
    await loadLead();
    scheduleActionFeedbackClear();
  } catch (error) {
    actionErrorText.value = parseActionError(error) || t("convertLeadError");
    scheduleActionFeedbackClear();
  }
}
function parseActionError(error) {
  const direct = error?.message || error?.exc_type;
  if (direct) return String(direct);
  const serverMessage =
    error?._server_messages ||
    error?.messages?.[0] ||
    error?.response?._server_messages ||
    error?.response?.message;
  if (!serverMessage) return "";
  try {
    const parsed = typeof serverMessage === "string" ? JSON.parse(serverMessage) : serverMessage;
    if (Array.isArray(parsed) && parsed.length) return String(parsed[0]).replace(/<[^>]*>/g, "").trim();
  } catch {
    return String(serverMessage).replace(/<[^>]*>/g, "").trim();
  }
  return "";
}
function leadConversionState(row) {
  if (row?.converted_policy) return "Policy";
  if (row?.converted_offer) return "Offer";
  if (String(row?.status || "") === "Closed") return "Closed";
  if (canConvertLead(row)) return "Actionable";
  return "Incomplete";
}
function leadConversionMissingFields(row) {
  if (!row || row.converted_offer || row.converted_policy) return "";
  const missing = [];
  if (!row.customer) missing.push(t("customer"));
  if (!row.sales_entity) missing.push(t("salesEntity"));
  if (!row.insurance_company) missing.push(t("company"));
  if (!row.branch) missing.push(t("branch"));
  const estimated = Number(row.estimated_gross_premium || 0);
  if (!(Number.isFinite(estimated) && estimated > 0)) missing.push(t("estimatedGross"));
  return missing.join(", ");
}
function leadAgeDays(value) {
  if (!value) return 999;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 999;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
}
function leadStaleState(row) {
  const days = leadAgeDays(row?.modified);
  if (days >= 8) return "Stale";
  if (days >= 3) return "FollowUp";
  return "Fresh";
}
function leadStaleLabel(state) {
  if (state === "Fresh") return sessionState.locale === "tr" ? "Guncel" : "Fresh";
  if (state === "FollowUp") return sessionState.locale === "tr" ? "Takip Et" : "Follow Up";
  return sessionState.locale === "tr" ? "Bekliyor" : "Stale";
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
function mapLeadActivityEvent(event) {
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
    created: t("timelineEventCreated"),
    modified: t("timelineEventUpdated"),
    converted_offer: t("timelineEventOffer"),
    converted_policy: t("timelineEventPolicy"),
  };
  return {
    key: event.key || `${type}-${event.at || ""}`,
    title: titleMap[type] || type,
    description: event.reference_name || fmtDateTime(event.at),
    meta: [event.actor || null, event.at ? fmtDateTime(event.at) : null].filter(Boolean).join(" / "),
  };
}
function relatedOfferMeta(item) {
  const parts = [item?.status || null, fmtMoney(item?.gross_premium, item?.currency || "TRY")].filter(Boolean);
  return parts.join(" / ");
}
function relatedPolicyMeta(item) {
  const parts = [item?.status || null, fmtMoney(item?.gross_premium, item?.currency || "TRY")].filter(Boolean);
  return parts.join(" / ");
}
function leadPaymentMeta(item) {
  return [item?.payment_direction || null, item?.status || null, fmtMoney(item?.amount_try, "TRY")].filter(Boolean).join(" / ");
}
function leadRenewalMeta(item) {
  return [item?.status || null, item?.renewal_date ? fmtDate(item.renewal_date) : null, item?.assigned_to || null]
    .filter(Boolean)
    .join(" / ");
}
function notificationPreviewMeta(item) {
  return [item?.reference_doctype || null, item?.modified ? fmtDateTime(item.modified) : null].filter(Boolean).join(" / ");
}

watch(
  () => props.name,
  () => {
    clearActionFeedback();
    activeLeadTab.value = "overview";
    loadLead();
  },
  { immediate: true }
);
onBeforeUnmount(clearActionFeedback);
</script>
