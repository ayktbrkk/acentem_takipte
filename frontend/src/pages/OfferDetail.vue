<template>
  <section class="page-shell space-y-4">
    <OfferDetailTopbar
      :name="name"
      :offer="offer"
      :ui-offer-status="uiOfferStatus"
      :offer-header-subtitle="offerHeaderSubtitle"
      :is-offer-convertible="isOfferConvertible"
      :t="t"
      :go-back="goBack"
      :download-pdf="downloadPDF"
      :send-email="sendEmail"
      :convert-to-policy="convertToPolicy"
      :edit-offer="editOffer"
    />

    <div v-if="loadErrorText" class="card-empty border border-red-200 bg-red-50 text-red-700">
      {{ loadErrorText }}
    </div>

    <HeroStrip :cells="heroCells" />

    <div class="detail-body">
      <OfferDetailMainContent
        :t="t"
        :offer="offer"
        :loading="loading"
        :coverages="coverages"
        :documents="documents"
        :activities="activities"
        :fmt-money="fmtMoney"
        :fmt-date="fmtDate"
        :open-document="openDocument"
        :edit-offer="editOffer"
      />

      <OfferDetailSidebar
        :t="t"
        :offer="offer"
        :offer-fields="offerFields"
        :record-fields="recordFields"
        :initials="initials"
        :view-customer="viewCustomer"
      />
    </div>
  </section>
</template>

<script setup>
import { computed, unref } from "vue";
import { useRouter } from "vue-router";

import { useAuthStore } from "../stores/auth";
import HeroStrip from "../components/ui/HeroStrip.vue";
import OfferDetailTopbar from "../components/offer-detail/OfferDetailTopbar.vue";
import OfferDetailMainContent from "../components/offer-detail/OfferDetailMainContent.vue";
import OfferDetailSidebar from "../components/offer-detail/OfferDetailSidebar.vue";
import { useOfferDetailRuntime } from "../composables/useOfferDetailRuntime";

const props = defineProps({
  name: { type: String, default: "" },
});

const router = useRouter();
const authStore = useAuthStore();
const activeLocale = computed(() => unref(authStore.locale) || "en");
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));

const copy = {
  tr: {
    breadcrumb: "Satış → Teklifler",
    overview: "Teklif Detayı",
    backList: "Listeye Dön",
    downloadPdf: "PDF İndir",
    sendEmail: "Mail Gönder",
    edit: "Düzenle",
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
    recordMetaTitle: "Kayıt ve Aktivite",
    openCustomer360: "Müşteri Detayını Aç",
    accessView: "Kayıt Görüntülendi",
    accessEdit: "Kayıt Düzenlendi",
    accessExport: "Kayıt Dışa Aktarıldı",
    timelineCreated: "Teklif kaydı oluşturuldu",
    timelineUpdated: "Teklif kaydı güncellendi",
    timelineOffered: "Teklif tarihi",
    timelineValidUntil: "Geçerlilik sonu",
    timelineConverted: "Poliçeye dönüşüm",
    status: "Durum",
    offerDate: "Teklif Tarihi",
    validUntil: "Geçerlilik",
    grossPremium: "Brüt Prim",
    commission: "Komisyon",
    customer: "Müşteri",
    company: "Sigorta Şirketi",
    branch: "Branş",
    currency: "Döviz",
    sourceLead: "Kaynak Lead",
    createdAt: "Oluşturuldu",
    modifiedAt: "Güncellendi",
    convertedPolicy: "Dönüşen Poliçe",
    conversionState: "Dönüşüm Durumu",
    conversionConverted: "Poliçeye Dönüştü",
    conversionPending: "Henüz Dönüşmedi",
    openLead: "Lead Detayını Aç",
    openPolicy: "Poliçeyi Aç",
  },
  en: {
    breadcrumb: "Sales → Offers",
    overview: "Offer Details",
    backList: "Back to List",
    downloadPdf: "Download PDF",
    sendEmail: "Send Email",
    edit: "Edit",
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
    recordMetaTitle: "Record & Activity",
    openCustomer360: "Open Customer Details",
    accessView: "Record Viewed",
    accessEdit: "Record Edited",
    accessExport: "Record Exported",
    timelineCreated: "Offer record created",
    timelineUpdated: "Offer record updated",
    timelineOffered: "Offer date",
    timelineValidUntil: "Valid until",
    timelineConverted: "Converted to policy",
    status: "Status",
    offerDate: "Offer Date",
    validUntil: "Valid Until",
    grossPremium: "Gross Premium",
    commission: "Commission",
    customer: "Customer",
    company: "Insurance Company",
    branch: "Branch",
    currency: "Currency",
    sourceLead: "Source Lead",
    createdAt: "Created",
    modifiedAt: "Modified",
    convertedPolicy: "Converted Policy",
    conversionState: "Conversion State",
    conversionConverted: "Converted to Policy",
    conversionPending: "Not Converted Yet",
    openLead: "Open Lead Details",
    openPolicy: "Open Policy",
  },
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const {
  offer,
  loading,
  loadErrorText,
  isOfferConvertible,
  uiOfferStatus,
  offerHeaderSubtitle,
  heroCells,
  coverages,
  documents,
  activities,
  offerFields,
  recordFields,
  fmtMoney,
  fmtDate,
  downloadPDF,
  sendEmail,
  convertToPolicy,
  editOffer,
  goBack,
  openDocument,
  initials,
  viewCustomer,
} = useOfferDetailRuntime({ props, router, t, localeCode });
</script>
