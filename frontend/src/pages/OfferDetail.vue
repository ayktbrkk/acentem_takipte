<template>
  <section class="page-shell space-y-4">
    <div class="detail-topbar">
      <div>
        <p class="detail-breadcrumb">{{ t("breadcrumb") }}</p>
        <h1 class="detail-title">
          {{ offer.offer_no || t("overview") }}
          <StatusBadge :status="uiOfferStatus" />
        </h1>
        <p v-if="offerHeaderSubtitle" class="detail-subtitle">{{ offerHeaderSubtitle }}</p>
        <div class="mt-1.5 flex flex-wrap items-center gap-2">
          <span class="copy-tag">{{ offer.name || name }}</span>
          <span v-if="offer.customer_name || offer.customer" class="copy-tag">{{ offer.customer_name || offer.customer }}</span>
          <span v-if="offer.branch" class="copy-tag">{{ offer.branch }}</span>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn btn-outline btn-sm" type="button" @click="goBack">{{ t("backList") }}</button>
        <button class="btn btn-outline btn-sm" type="button" @click="downloadPDF">{{ t("downloadPdf") }}</button>
        <button class="btn btn-outline btn-sm" type="button" @click="sendEmail">{{ t("sendEmail") }}</button>
        <button v-if="isOfferConvertible" class="btn btn-primary btn-sm" type="button" @click="convertToPolicy">{{ t("convertToPolicy") }}</button>
        <button v-else class="btn btn-primary btn-sm" type="button" @click="editOffer">{{ t("edit") }}</button>
      </div>
    </div>

    <HeroStrip :cells="heroCells" />

    <div class="detail-body">
      <div class="detail-main space-y-4">
        <SectionPanel :title="t('coverageTitle')">
          <template #trailing>
            <button class="btn btn-sm" type="button" @click="editOffer">{{ t("edit") }}</button>
          </template>

          <div v-if="loading" class="card-empty">{{ t('loading') }}</div>
          <div v-else-if="!coverages.length" class="card-empty">{{ t("emptyCoverages") }}</div>
          <table v-else class="min-w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="table-header">{{ t("coverageColumn") }}</th>
                <th class="table-header text-right">{{ t("limitColumn") }}</th>
                <th class="table-header text-right">{{ t("premiumColumn") }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="coverage in coverages" :key="coverage.name || coverage.coverage_name">
                <td class="table-cell">{{ coverage.coverage_name || coverage.item_name || '-' }}</td>
                <td class="table-cell text-right font-medium">{{ fmtMoney(coverage.limit || coverage.coverage_limit, offer.currency || 'TRY') }}</td>
                <td class="table-cell text-right">{{ fmtMoney(coverage.premium || coverage.amount, offer.currency || 'TRY') }}</td>
              </tr>
            </tbody>
          </table>
        </SectionPanel>

        <SectionPanel :title="t('documentsTitle')">
          <template #trailing>
            <button class="btn btn-sm" type="button" @click="editOffer">{{ t("edit") }}</button>
          </template>

          <div v-if="loading" class="card-empty">{{ t('loading') }}</div>
          <div v-else-if="!documents.length" class="card-empty">{{ t("emptyDocuments") }}</div>
          <div v-else class="divide-y divide-gray-100">
            <div v-for="doc in documents" :key="doc.name || doc.file_url || doc.file_name" class="flex items-center justify-between py-2.5">
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-900">{{ doc.file_name || doc.label || doc.name }}</span>
              </div>
              <button class="btn btn-sm" type="button" @click="openDocument(doc)">{{ t("downloadDocument") }}</button>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel :title="t('activitiesTitle')">
          <div v-if="loading" class="card-empty">{{ t('loading') }}</div>
          <div v-else-if="!activities.length" class="card-empty">{{ t("emptyActivities") }}</div>
          <div v-else>
            <div v-for="activity in activities" :key="activity.name || activity.key" class="timeline-item">
              <div :class="['tl-dot', activity.is_important && 'tl-dot-active']" />
              <div>
                <p class="tl-text">{{ activity.description || activity.title || '-' }}</p>
                <p class="tl-time">{{ fmtDate(activity.creation || activity.at) }} · {{ activity.owner || activity.actor || '-' }}</p>
              </div>
            </div>
          </div>
        </SectionPanel>
      </div>

      <aside class="detail-sidebar space-y-4">
        <SectionPanel :title="t('customerPanelTitle')">
          <div class="mb-3 flex items-center gap-3">
            <div class="avatar avatar-md avatar-blue">{{ initials(offer.customer_name || offer.customer) }}</div>
            <div>
              <p class="text-sm font-medium text-gray-900">{{ offer.customer_name || offer.customer || '-' }}</p>
              <button class="text-xs text-brand-600 hover:underline" type="button" @click="viewCustomer">{{ t("openCustomer360") }} →</button>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel :title="t('offerInfoTitle')">
          <FieldGroup :fields="offerFields" :cols="1" />
        </SectionPanel>

        <SectionPanel :title="t('recordMetaTitle')">
          <FieldGroup :fields="recordFields" :cols="1" />
        </SectionPanel>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, unref, watch } from "vue";
import { useRouter } from "vue-router";
import { createResource } from "frappe-ui";

import { deskActionsEnabled } from "../utils/deskActions";
import { useAuthStore } from "../stores/auth";
import StatusBadge from "../components/ui/StatusBadge.vue";
import HeroStrip from "../components/ui/HeroStrip.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import FieldGroup from "../components/ui/FieldGroup.vue";

const props = defineProps({
  name: { type: String, default: "" },
});

const router = useRouter();
const authStore = useAuthStore();
const activeLocale = computed(() => unref(authStore.locale) || "en");

const copy = {
  tr: {
    breadcrumb: "Satış → Teklifler",
    overview: "Teklif Detayı",
    openDesk: "Yönetim Ekranını Aç",
    backList: "Listeye Dön",
    downloadPdf: "PDF İndir",
    sendEmail: "Mail Gönder",
    edit: "Düzenle",
    loading: "Yükleniyor...",
    loadError: "Teklif detayı yüklenemedi.",
    coverageTitle: "Teminatlar",
    coverageColumn: "Teminat",
    limitColumn: "Limit",
    premiumColumn: "Prim",
    emptyCoverages: "Teminat bilgisi girilmemiş.",
    documentsTitle: "Dökümanlar",
    emptyDocuments: "Döküman yüklenmemiş.",
    downloadDocument: "İndir",
    activitiesTitle: "Aktiviteler",
    emptyActivities: "Henüz aktivite kaydı yok.",
    customerPanelTitle: "Müşteri",
    offerInfoTitle: "Teklif Bilgileri",
    premiumTitle: "Prim Bilgileri",
    conversionTitle: "Dönüşüm",
    relatedTitle: "İlişkili Kayıtlar",
    relatedOffersTitle: "Aynı Müşteride Teklifler",
    relatedPoliciesTitle: "Aynı Müşteride Poliçeler",
    noRelatedOffers: "İlgili teklif bulunamadı.",
    noRelatedPolicies: "İlgili poliçe bulunamadı.",
    opsPreviewTitle: "İletişim ve Operasyon",
    notifDraftsTitle: "Bildirim Taslakları",
    notifOutboxTitle: "Giden Bildirimler",
    paymentsPreviewTitle: "Ödeme Hareketleri",
    renewalsPreviewTitle: "Yenileme Görevleri",
    noNotifDrafts: "Bildirim taslağı yok.",
    noNotifOutbox: "Giden bildirim yok.",
    noPayments: "Ödeme hareketi yok.",
    noRenewals: "Yenileme görevi yok.",
    notesTitle: "Notlar",
    recordMetaTitle: "Kayıt ve Aktivite",
    recordTimelineTitle: "Kayıt Olayları",
    tabOverview: "Genel",
    tabPremium: "Prim",
    tabConversion: "Dönüşüm",
    tabRelated: "İlişkili",
    tabOperations: "Operasyon",
    tabNotes: "Notlar",
    tabActivity: "Aktivite",
    openCustomer360: "Müşteri Detayını Aç",
    openCommunication: "İletişim Merkezini Aç",
    openPayments: "Ödemeleri Aç",
    openRenewals: "Yenileme Görevlerini Aç",
    openLead: "Lead Detayını Aç",
    openPolicy: "Poliçeyi Aç",
    openOfferDetail: "Teklif Detayını Aç",
    openOfferBoard: "Teklif Panosunu Aç",
    convertToPolicy: "Poliçeye Çevir",
    conversionHint: "Durum güncelleme ve poliçeye çevirme işlemleri teklif panosundan veya yönetim ekranından yapılabilir.",
    linkedSourceLeadTitle: "Kaynak Lead Özeti",
    linkedPolicyTitle: "Dönüşen Poliçe Özeti",
    accessView: "Kayıt Görüntülendi",
    accessEdit: "Kayıt Düzenlendi",
    accessExport: "Kayıt Dışa Aktarıldı",
    customer: "Müşteri",
    company: "Sigorta Şirketi",
    branch: "Branş",
    status: "Durum",
    offerDate: "Teklif Tarihi",
    validUntil: "Geçerlilik",
    currency: "Döviz",
    grossPremium: "Brüt Prim",
    netPremium: "Net Prim",
    taxAmount: "Vergi",
    commission: "Komisyon",
    convertedPolicy: "Dönüşen Poliçe",
    conversionState: "Dönüşüm Durumu",
    conversionConverted: "Poliçeye Dönüştü",
    conversionPending: "Henüz Dönüşmedi",
    sourceLead: "Kaynak Lead",
    createdAt: "Oluşturuldu",
    modifiedAt: "Güncellendi",
    timelineCreated: "Teklif kaydı oluşturuldu",
    timelineUpdated: "Teklif kaydı güncellendi",
    timelineOffered: "Teklif tarihi",
    timelineValidUntil: "Geçerlilik sonu",
    timelineConverted: "Poliçeye dönüşüm",
  },
  en: {
    breadcrumb: "Sales → Offers",
    overview: "Offer Details",
    openDesk: "Open Desk",
    backList: "Back to List",
    downloadPdf: "Download PDF",
    sendEmail: "Send Email",
    edit: "Edit",
    loading: "Loading...",
    loadError: "Failed to load offer detail.",
    coverageTitle: "Coverages",
    coverageColumn: "Coverage",
    limitColumn: "Limit",
    premiumColumn: "Premium",
    emptyCoverages: "No coverage details entered.",
    documentsTitle: "Documents",
    emptyDocuments: "No documents uploaded.",
    downloadDocument: "Download",
    activitiesTitle: "Activities",
    emptyActivities: "No activity records yet.",
    customerPanelTitle: "Customer",
    offerInfoTitle: "Offer Information",
    premiumTitle: "Premium Details",
    conversionTitle: "Conversion",
    relatedTitle: "Related Records",
    relatedOffersTitle: "Offers of Same Customer",
    relatedPoliciesTitle: "Policies of the Same Customer",
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
    openCustomer360: "Open Customer Details",
    openCommunication: "Open Communication Center",
    openPayments: "Open Payments",
    openRenewals: "Open Renewals",
    openLead: "Open Lead Details",
    openPolicy: "Open Policy",
    openOfferDetail: "Open Offer Details",
    openOfferBoard: "Open Offer Board",
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
const uiOfferStatus = computed(() => mapOfferStatusTone(offer.value.status));
const heroCells = computed(() => [
  { label: "Şirket", value: offer.value.company_name || offer.value.insurance_company || "-", variant: "default" },
  { label: "Branş", value: offer.value.branch || "-", variant: "default" },
  { label: "Prim", value: fmtMoney(offer.value.premium || offer.value.gross_premium, offer.value.currency || "TRY"), variant: "lg" },
  { label: "Geçerlilik", value: fmtDate(offer.value.valid_until), variant: "accent" },
]);
const coverages = computed(() => {
  const payload = offerDetailPayload.value;
  if (Array.isArray(payload.coverages)) return payload.coverages;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
});
const documents = computed(() => {
  const payload = offerDetailPayload.value;
  if (Array.isArray(payload.documents)) return payload.documents;
  if (Array.isArray(payload.attachments)) return payload.attachments;
  return [];
});
const activities = computed(() => {
  const payload = offerDetailPayload.value;
  if (Array.isArray(payload.activity)) return payload.activity;
  return [];
});
const offerFields = computed(() => [
  { label: "Şirket", value: offer.value.company_name || offer.value.insurance_company || "-" },
  { label: "Branş", value: offer.value.branch || "-" },
  { label: "Başlangıç", value: fmtDate(offer.value.start_date) },
  { label: "Bitiş", value: fmtDate(offer.value.end_date) },
  { label: "Geçerlilik", value: fmtDate(offer.value.valid_until) },
  { label: "Prim", value: fmtMoney(offer.value.premium || offer.value.gross_premium, offer.value.currency || "TRY") },
  { label: "Komisyon", value: fmtMoney(offer.value.commission || offer.value.commission_amount, offer.value.currency || "TRY") },
]);
const recordFields = computed(() => [
  { label: "Oluşturan", value: offer.value.owner || "-" },
  { label: "Oluşturulma", value: fmtDateTime(offer.value.creation) },
  { label: "Güncelleyen", value: offer.value.modified_by || "-" },
  { label: "Güncelleme", value: fmtDateTime(offer.value.modified) },
]);
const offerInfoFields = computed(() => offerInfoFacts.value.map((item) => ({ label: item.label, value: item.value })));
const premiumFields = computed(() => premiumSummaryItems.value.map((item) => ({ label: item.label, value: item.value })));
const conversionFields = computed(() => conversionFacts.value.map((item) => ({ label: item.label, value: item.value })));
const conversionMiniMetrics = computed(() => [
  { label: t("conversionState"), value: offer.value.converted_policy ? t("conversionConverted") : t("conversionPending") },
  { label: t("convertedPolicy"), value: offer.value.converted_policy || "-" },
  { label: t("sourceLead"), value: offer.value.source_lead || "-" },
  { label: t("status"), value: offer.value.status || "-" },
]);
const offerMetaFields = computed(() => [
  { label: t("createdAt"), value: fmtDateTime(offer.value.creation) },
  { label: t("modifiedAt"), value: fmtDateTime(offer.value.modified) },
  { label: t("status"), value: offer.value.status || "-" },
  { label: t("currency"), value: offer.value.currency || "TRY" },
]);

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
function downloadPDF() {
  if (!props.name) return;
  const url = `/api/method/acentem_takipte.acentem_takipte.api.list_exports.download_export?screen=offer_detail&format=pdf&name=${encodeURIComponent(props.name)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
function sendEmail() {
  openCommunicationCenterForOffer();
}
function convertToPolicy() {
  openConvertInOfferBoard();
}
function editOffer() {
  openOfferDesk();
}
function openCustomer360(name) {
  if (!name) return;
  router.push({ name: "customer-detail", params: { name } });
}
function viewCustomer() {
  openCustomer360(offer.value.customer || offer.value.customer_name);
}
function initials(value) {
  const words = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!words.length) return "-";
  return words.map((word) => String(word[0] || "").toUpperCase()).join("");
}
function openDocument(doc) {
  const fileUrl = String(doc?.file_url || doc?.url || "").trim();
  if (!fileUrl) return;
  window.open(fileUrl, "_blank", "noopener,noreferrer");
}
function openPolicyDetail(name) {
  if (!name) return;
  router.push({ name: "policy-detail", params: { name } });
}
function openCommunicationCenterForOffer(item = null) {
  const query = {
    customer: offer.value.customer || "",
    customer_label: offer.value.customer || offer.value.name || props.name || "",
    return_to: router.currentRoute.value?.fullPath || "",
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
function mapOfferStatusTone(status) {
  const normalized = String(status || "draft").trim().toLowerCase();
  if (["accepted", "converted", "active"].includes(normalized)) return "active";
  if (["sent", "waiting", "pending"].includes(normalized)) return "waiting";
  if (["cancelled", "rejected", "expired"].includes(normalized)) return "cancel";
  return "draft";
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

