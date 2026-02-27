<template>
  <section class="space-y-4">
    <DocHeaderCard
      :eyebrow="t('overview')"
      :title="customer.full_name || name"
      :subtitle="customerHeaderSubtitle"
    >
      <template #actions>
        <DetailActionRow>
          <ActionButton variant="primary" size="sm" @click="openQuickOfferForCustomer">
            {{ t("newOffer") }}
          </ActionButton>
          <ActionButton variant="secondary" size="sm" @click="openCommunicationCenterForCustomer">
            {{ t("communication") }}
          </ActionButton>
          <ActionButton v-if="deskActionsEnabled()" variant="secondary" size="sm" @click="openCustomerDesk">
            {{ t("openDesk") }}
          </ActionButton>
        </DetailActionRow>
      </template>
      <DocSummaryGrid :items="customerHeaderSummaryItems" />
    </DocHeaderCard>

    <article class="surface-card rounded-2xl p-4">
      <DetailTabsBar v-model="activeCustomerTab" :tabs="customerDetailTabs" />
    </article>

    <div class="at-detail-split-wide">
      <aside class="at-detail-aside">
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('insuredInfoCard')" :show-count="false">
            <template #trailing>
              <div class="flex flex-wrap items-center justify-end gap-2">
                <span class="text-xs font-medium text-slate-500">
                  {{ customerTaxIdDisplay }}
                </span>
                <ActionButton
                  v-if="!profileEditMode"
                  variant="secondary"
                  size="xs"
                  :disabled="customerLoading"
                  @click="startProfileEdit"
                >
                  {{ t("editProfile") }}
                </ActionButton>
                <template v-else>
                  <ActionButton variant="secondary" size="xs" :disabled="customerProfileUpdateResource.loading" @click="cancelProfileEdit">
                    {{ t("cancelEdit") }}
                  </ActionButton>
                  <ActionButton variant="primary" size="xs" :disabled="customerProfileUpdateResource.loading" @click="saveProfile">
                    {{ customerProfileUpdateResource.loading ? t("saving") : t("saveProfile") }}
                  </ActionButton>
                </template>
              </div>
            </template>
          </SectionCardHeader>
          <div v-if="customerLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <template v-else>
          <div
            v-if="profileSaveError && !profileEditMode"
            class="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
          >
            {{ profileSaveError }}
          </div>
          <div
            v-if="profileSaveMessage && !profileEditMode"
            class="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"
          >
            {{ profileSaveMessage }}
          </div>
          <div v-if="!profileEditMode" class="space-y-3 text-sm">
            <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                {{ t("fullName") }}
              </p>
              <p class="mt-0.5 text-sm font-semibold text-slate-900">
                {{ customer.full_name || "-" }}
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                  {{ t("birthDate") }}
                </p>
                <p class="mt-0.5 text-sm text-slate-800">{{ formatDate(customer.birth_date) }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                  {{ t("taxId") }}
                </p>
                <p class="mt-0.5 text-sm text-slate-800">{{ customerTaxIdDisplay }}</p>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                  {{ t("gender") }}
                </p>
                <p class="mt-0.5 text-sm text-slate-800">{{ genderLabel }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                  {{ t("maritalStatus") }}
                </p>
                <p class="mt-0.5 text-sm text-slate-800">{{ maritalStatusLabel }}</p>
              </div>
            </div>

            <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                {{ t("address") }}
              </p>
              <p class="mt-0.5 whitespace-pre-wrap text-sm text-slate-800">
                {{ customer.address || "-" }}
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                  {{ t("mobilePhone") }}
                </p>
                <p class="mt-0.5 text-sm text-slate-800">{{ customerPhoneDisplay }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                  {{ t("email") }}
                </p>
                <p class="mt-0.5 break-all text-sm text-slate-800">{{ customer.email || "-" }}</p>
              </div>
            </div>

            <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                {{ t("occupation") }}
              </p>
              <p class="mt-0.5 text-sm text-slate-800">{{ customer.occupation || "-" }}</p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                  {{ t("assignedAgent") }}
                </p>
                <p class="mt-0.5 text-sm text-slate-800">{{ customer.assigned_agent || "-" }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                  {{ t("consentStatus") }}
                </p>
                <p class="mt-0.5 text-sm text-slate-800">{{ consentStatusLabel }}</p>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                  {{ t("recordId") }}
                </p>
                <p class="mt-0.5 text-sm text-slate-800">{{ customer.name || name || "-" }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                  {{ t("customerFolder") }}
                </p>
                <p class="mt-0.5 text-sm text-slate-800">{{ customer.customer_folder || "-" }}</p>
              </div>
            </div>
          </div>
          <div v-else class="space-y-3 text-sm">
            <div v-if="profileSaveError" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {{ profileSaveError }}
            </div>
            <div v-else-if="profileSaveMessage" class="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              {{ profileSaveMessage }}
            </div>

            <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{{ t("fullName") }}</label>
              <input v-model.trim="profileForm.full_name" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" type="text" />
              <p v-if="profileFormErrors.full_name" class="mt-1 text-xs font-medium text-rose-700">{{ profileFormErrors.full_name }}</p>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <label class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{{ t("birthDate") }}</label>
                <input v-model="profileForm.birth_date" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" type="date" />
                <p v-if="profileFormErrors.birth_date" class="mt-1 text-xs font-medium text-rose-700">{{ profileFormErrors.birth_date }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{{ t("taxId") }}</p>
                <p class="mt-1 text-sm text-slate-800">{{ customerTaxIdDisplay }}</p>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <label class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{{ t("gender") }}</label>
                <select v-model="profileForm.gender" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option v-for="option in genderOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <label class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{{ t("maritalStatus") }}</label>
                <select v-model="profileForm.marital_status" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option v-for="option in maritalStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </div>
            </div>

            <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{{ t("address") }}</label>
              <textarea v-model.trim="profileForm.address" rows="3" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </div>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{{ t("mobilePhone") }}</p>
                <p class="mt-1 text-sm text-slate-800">{{ customerPhoneDisplay }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <label class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{{ t("email") }}</label>
                <input v-model.trim="profileForm.email" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" type="email" />
                <p v-if="profileFormErrors.email" class="mt-1 text-xs font-medium text-rose-700">{{ profileFormErrors.email }}</p>
              </div>
            </div>

            <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{{ t("occupation") }}</label>
              <input v-model.trim="profileForm.occupation" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" type="text" />
            </div>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{{ t("assignedAgent") }}</p>
                <p class="mt-1 text-sm text-slate-800">{{ customer.assigned_agent || "-" }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <label class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{{ t("consentStatus") }}</label>
                <select v-model="profileForm.consent_status" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                  <option v-for="option in consentStatusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{{ t("recordId") }}</p>
                <p class="mt-1 text-sm text-slate-800">{{ customer.name || name || "-" }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{{ t("customerFolder") }}</p>
                <p class="mt-1 text-sm text-slate-800">{{ customer.customer_folder || "-" }}</p>
              </div>
            </div>
          </div>
          </template>
        </article>

      </aside>

      <div class="space-y-4">
        <article
          v-if="activeCustomerTab === 'overview' || activeCustomerTab === 'operations'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('operationsTitle')" :show-count="false" />
          <div class="mt-3 grid gap-2 sm:grid-cols-2">
            <ActionButton variant="primary" size="sm" @click="openQuickOfferForCustomer">
              {{ t("newOffer") }}
            </ActionButton>
            <ActionButton variant="secondary" size="sm" @click="openCommunicationCenterForCustomer">
              {{ t("communication") }}
            </ActionButton>
            <ActionButton variant="secondary" size="sm" :disabled="!activePolicies.length" @click="activePolicies[0] && openPolicyDetail(activePolicies[0].name)">
              {{ t("openPolicy") }}
            </ActionButton>
            <ActionButton
              v-if="deskActionsEnabled()"
              variant="secondary"
              size="sm"
              @click="openCustomerDesk"
            >
              {{ t("openDesk") }}
            </ActionButton>
          </div>
        </article>

        <article
          v-if="activeCustomerTab === 'overview' || activeCustomerTab === 'portfolio'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('activePoliciesTitle')" :count="activePolicies.length" />
          <div v-if="policyResource.loading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div
            v-else-if="activePolicies.length === 0"
            class="at-empty-block"
          >
            {{ t("noActivePolicy") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2">
            <EntityPreviewCard
              v-for="policy in activePolicies"
              :key="policy.name"
              :title="policy.policy_no || policy.name"
              :subtitle="policy.insurance_company || '-'"
            >
              <template #trailing>
                <StatusBadge type="policy" :status="policy.status" />
              </template>
              <MiniFactList class="mt-2" :items="policyCardFacts(policy)" />
              <template #footer>
                <ActionButton variant="secondary" size="xs" @click="openPolicyDetail(policy.name)">
                  {{ t("openPolicy") }}
                </ActionButton>
              </template>
            </EntityPreviewCard>
          </div>
        </article>

        <article
          v-if="activeCustomerTab === 'overview' || activeCustomerTab === 'portfolio'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('openOffersTitle')" :count="openOffers.length" />
          <div v-if="offerResource.loading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div
            v-else-if="openOffers.length === 0"
            class="at-empty-block"
          >
            {{ t("noOpenOffer") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2">
            <EntityPreviewCard
              v-for="offer in openOffers"
              :key="offer.name"
              :title="offer.name"
              :subtitle="offer.insurance_company || '-'"
            >
              <template #trailing>
                <StatusBadge type="offer" :status="offer.status" />
              </template>
              <MiniFactList class="mt-2" :items="offerCardFacts(offer)" />
            </EntityPreviewCard>
          </div>
        </article>

        <article
          v-if="activeCustomerTab === 'overview' || activeCustomerTab === 'activity'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('timelineTitle')" :count="timelineRows.length" />
          <div v-if="timelineLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div
            v-else-if="timelineRows.length === 0"
            class="at-empty-block"
          >
            {{ t("noTimeline") }}
          </div>
          <ol v-else class="space-y-3">
            <MetaListCard
              v-for="item in timelineRows"
              :key="item.key"
              :title="item.title"
              :description="item.body"
              :meta="item.actor || '-'"
            >
              <template #trailing>
                <div class="flex items-center gap-2">
                  <span class="h-2.5 w-2.5 rounded-full" :class="item.dotClass" />
                  <p class="text-xs text-slate-500">{{ formatDateTime(item.date) }}</p>
                </div>
              </template>
            </MetaListCard>
          </ol>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { createResource } from "frappe-ui";

import { deskActionsEnabled } from "../utils/deskActions";
import ActionButton from "../components/app-shell/ActionButton.vue";
import DetailActionRow from "../components/app-shell/DetailActionRow.vue";
import DetailTabsBar from "../components/app-shell/DetailTabsBar.vue";
import DocHeaderCard from "../components/app-shell/DocHeaderCard.vue";
import DocSummaryGrid from "../components/app-shell/DocSummaryGrid.vue";
import EntityPreviewCard from "../components/app-shell/EntityPreviewCard.vue";
import MetaListCard from "../components/app-shell/MetaListCard.vue";
import MiniFactList from "../components/app-shell/MiniFactList.vue";
import SectionCardHeader from "../components/app-shell/SectionCardHeader.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { sessionState } from "../state/session";
import { buildQuickCreateIntentQuery } from "../utils/quickRouteIntent";

const props = defineProps({
  name: {
    type: String,
    default: "",
  },
});

const router = useRouter();
const activeCustomerTab = ref("overview");

const copy = {
  tr: {
    overview: "Musteri 360",
    openDesk: "Yonetim Ekraninda Ac",
    newOffer: "Yeni Teklif",
    communication: "Iletisim",
    editProfile: "Duzenle",
    cancelEdit: "Vazgec",
    saveProfile: "Kaydet",
    saving: "Kaydediliyor...",
    saveProfileError: "Musteri bilgileri kaydedilemedi. Lutfen tekrar deneyin.",
    saveProfileSuccess: "Musteri bilgileri guncellendi.",
    validationFullNameRequired: "Ad Soyad zorunludur.",
    validationEmailInvalid: "Gecerli bir e-posta girin.",
    validationBirthDateFuture: "Dogum tarihi bugunden ileri olamaz.",
    loading: "Yukleniyor...",
    contactCard: "Musteri Iletisim Karti",
    insuredInfoCard: "Sigortali Bilgileri",
    fullName: "Ad Soyad",
    birthDate: "Dogum Tarihi",
    gender: "Cinsiyet",
    maritalStatus: "Medeni Durumu",
    occupation: "Meslek",
    riskCard: "Risk Ozet",
    taxId: "TC/VKN",
    recordId: "Kayit No",
    phone: "Telefon",
    mobilePhone: "Cep Telefonu",
    email: "E-posta",
    address: "Adres",
    assignedAgent: "Temsilci",
    consentStatus: "Izin Durumu",
    genderUnknown: "Bilinmiyor",
    genderMale: "Erkek",
    genderFemale: "Kadin",
    genderOther: "Diger",
    maritalUnknown: "Bilinmiyor",
    maritalSingle: "Bekar",
    maritalMarried: "Evli",
    maritalDivorced: "Bosanmis",
    maritalWidowed: "Dul",
    consentUnknown: "Bilinmiyor",
    consentGranted: "Onayli",
    consentRevoked: "Iptal",
    customerFolder: "Musteri Klasoru",
    activePolicyCount: "Aktif Police",
    openOfferCount: "Acik Teklif",
    totalRiskLimit: "Toplam Risk Limiti",
    activePoliciesTitle: "Aktif Policeler",
    noActivePolicy: "Aktif police kaydi bulunamadi.",
    endDate: "Bitis",
    openPolicy: "Police Detayi",
    openOffersTitle: "Acik Teklifler",
    noOpenOffer: "Acik teklif bulunamadi.",
    validUntil: "Gecerlilik",
    grossPremium: "Brut Prim",
    operationsTitle: "Operasyonlar",
    tabOverview: "Ozet",
    tabPortfolio: "Portfoy",
    tabActivity: "Aktivite",
    tabOperations: "Operasyonlar",
    timelineTitle: "Iletisim Gecmisi",
    noTimeline: "Zaman tuneli kaydi bulunamadi.",
    typeCommunication: "Arama/Iletisim",
    typeNote: "Not",
    typeLead: "Lead Notu",
  },
  en: {
    overview: "Customer 360",
    openDesk: "Open Desk",
    newOffer: "New Offer",
    communication: "Communication",
    editProfile: "Edit",
    cancelEdit: "Cancel",
    saveProfile: "Save",
    saving: "Saving...",
    saveProfileError: "Failed to save customer profile. Please try again.",
    saveProfileSuccess: "Customer profile updated.",
    validationFullNameRequired: "Full Name is required.",
    validationEmailInvalid: "Enter a valid email address.",
    validationBirthDateFuture: "Birth Date cannot be in the future.",
    loading: "Loading...",
    contactCard: "Customer Contact Card",
    insuredInfoCard: "Insured Details",
    fullName: "Full Name",
    birthDate: "Birth Date",
    gender: "Gender",
    maritalStatus: "Marital Status",
    occupation: "Occupation",
    riskCard: "Risk Summary",
    taxId: "Tax ID",
    recordId: "Record ID",
    phone: "Phone",
    mobilePhone: "Mobile Phone",
    email: "Email",
    address: "Address",
    assignedAgent: "Assigned Agent",
    consentStatus: "Consent Status",
    genderUnknown: "Unknown",
    genderMale: "Male",
    genderFemale: "Female",
    genderOther: "Other",
    maritalUnknown: "Unknown",
    maritalSingle: "Single",
    maritalMarried: "Married",
    maritalDivorced: "Divorced",
    maritalWidowed: "Widowed",
    consentUnknown: "Unknown",
    consentGranted: "Granted",
    consentRevoked: "Revoked",
    customerFolder: "Customer Folder",
    activePolicyCount: "Active Policies",
    openOfferCount: "Open Offers",
    totalRiskLimit: "Total Risk Limit",
    activePoliciesTitle: "Active Policies",
    noActivePolicy: "No active policies found.",
    endDate: "End Date",
    openPolicy: "Policy Detail",
    openOffersTitle: "Open Offers",
    noOpenOffer: "No open offers found.",
    validUntil: "Valid Until",
    grossPremium: "Gross Premium",
    operationsTitle: "Operations",
    tabOverview: "Overview",
    tabPortfolio: "Portfolio",
    tabActivity: "Activity",
    tabOperations: "Operations",
    timelineTitle: "Communication Timeline",
    noTimeline: "No timeline records found.",
    typeCommunication: "Communication",
    typeNote: "Note",
    typeLead: "Lead Note",
  },
};

function t(key) {
  return copy[sessionState.locale]?.[key] || copy.en[key] || key;
}

const customerDetailTabs = computed(() => [
  { value: "overview", label: t("tabOverview") },
  { value: "portfolio", label: t("tabPortfolio") },
  { value: "activity", label: t("tabActivity") },
  { value: "operations", label: t("tabOperations") },
]);

const customerResource = createResource({
  url: "frappe.client.get",
  auto: false,
});
const customerProfileUpdateResource = createResource({
  url: "acentem_takipte.api.dashboard.update_customer_profile",
  auto: false,
});

const policyResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
});

const offerResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
});

const leadHistoryResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
});

const commentResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
});

const communicationResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
});

const customer = computed(() => customerResource.data || {});
const policies = computed(() => policyResource.data || []);
const offers = computed(() => offerResource.data || []);
const leadHistory = computed(() => leadHistoryResource.data || []);
const comments = computed(() => commentResource.data || []);
const communications = computed(() => communicationResource.data || []);
const localeCode = computed(() => (sessionState.locale === "tr" ? "tr-TR" : "en-US"));
const profileEditMode = ref(false);
const profileSaveError = ref("");
const profileSaveMessage = ref("");
let profileFlashTimer = null;
const profileFormErrors = reactive({
  full_name: "",
  birth_date: "",
  email: "",
});
const profileForm = reactive({
  full_name: "",
  birth_date: "",
  gender: "Unknown",
  marital_status: "Unknown",
  occupation: "",
  email: "",
  address: "",
  consent_status: "Unknown",
});

const customerLoading = computed(() => customerResource.loading);
const timelineLoading = computed(
  () => leadHistoryResource.loading || commentResource.loading || communicationResource.loading
);

const activePolicies = computed(() =>
  policies.value.filter((policy) => String(policy.status || "").toUpperCase() !== "IPT")
);
const openOffers = computed(() =>
  offers.value.filter((offer) => !["Rejected", "Converted"].includes(String(offer.status || "")))
);

const totalRiskLimit = computed(() =>
  activePolicies.value.reduce((sum, policy) => sum + Number(policy.gross_premium || 0), 0)
);
const customerHeaderSubtitle = computed(() =>
  [customer.value.email || null, customer.value.phone || customer.value.masked_phone || null]
    .filter(Boolean)
    .join(" / ")
);
const riskSummaryItems = computed(() => [
  {
    key: "activePolicyCount",
    label: t("activePolicyCount"),
    value: String(activePolicies.value.length),
  },
  {
    key: "openOfferCount",
    label: t("openOfferCount"),
    value: String(openOffers.value.length),
  },
  {
    key: "totalRiskLimit",
    label: t("totalRiskLimit"),
    value: formatCurrency(totalRiskLimit.value, "TRY"),
  },
]);
const customerHeaderSummaryItems = computed(() => [
  {
    key: "taxId",
    label: t("taxId"),
    value: customer.value.tax_id || customer.value.masked_tax_id || "-",
  },
  ...riskSummaryItems.value,
]);
const customerTaxIdDisplay = computed(() => customer.value.tax_id || customer.value.masked_tax_id || "-");
const customerPhoneDisplay = computed(() => customer.value.phone || customer.value.masked_phone || "-");
const genderLabel = computed(() => {
  const value = String(customer.value.gender || "Unknown");
  if (value === "Male") return t("genderMale");
  if (value === "Female") return t("genderFemale");
  if (value === "Other") return t("genderOther");
  return t("genderUnknown");
});
const maritalStatusLabel = computed(() => {
  const value = String(customer.value.marital_status || "Unknown");
  if (value === "Single") return t("maritalSingle");
  if (value === "Married") return t("maritalMarried");
  if (value === "Divorced") return t("maritalDivorced");
  if (value === "Widowed") return t("maritalWidowed");
  return t("maritalUnknown");
});
const consentStatusLabel = computed(() => {
  const status = String(customer.value.consent_status || "Unknown");
  if (status === "Granted") return t("consentGranted");
  if (status === "Revoked") return t("consentRevoked");
  return t("consentUnknown");
});
const genderOptions = computed(() => [
  { value: "Unknown", label: t("genderUnknown") },
  { value: "Male", label: t("genderMale") },
  { value: "Female", label: t("genderFemale") },
  { value: "Other", label: t("genderOther") },
]);
const maritalStatusOptions = computed(() => [
  { value: "Unknown", label: t("maritalUnknown") },
  { value: "Single", label: t("maritalSingle") },
  { value: "Married", label: t("maritalMarried") },
  { value: "Divorced", label: t("maritalDivorced") },
  { value: "Widowed", label: t("maritalWidowed") },
]);
const consentStatusOptions = computed(() => [
  { value: "Unknown", label: t("consentUnknown") },
  { value: "Granted", label: t("consentGranted") },
  { value: "Revoked", label: t("consentRevoked") },
]);

const timelineRows = computed(() => {
  const communicationRows = communications.value.map((item) => ({
    key: `communication:${item.name}`,
    date: item.communication_date || item.creation,
    title: t("typeCommunication"),
    body: stripHtml(item.content) || item.subject || "-",
    actor: item.sender || item.owner || "-",
    dotClass: "bg-sky-500",
  }));

  const noteRows = comments.value.map((item) => ({
    key: `comment:${item.name}`,
    date: item.creation,
    title: t("typeNote"),
    body: stripHtml(item.content) || "-",
    actor: item.owner || "-",
    dotClass: "bg-amber-500",
  }));

  const leadRows = leadHistory.value
    .filter((item) => item.notes)
    .map((item) => ({
      key: `lead:${item.name}`,
      date: item.modified || item.creation,
      title: t("typeLead"),
      body: item.notes || "-",
      actor: item.owner || "-",
      dotClass: "bg-emerald-500",
    }));

  return [...communicationRows, ...noteRows, ...leadRows]
    .filter((item) => Boolean(item.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
});

watch(
  () => props.name,
  () => {
    clearProfileFlashTimer();
    clearProfileFormErrors();
    profileEditMode.value = false;
    profileSaveError.value = "";
    profileSaveMessage.value = "";
    loadCustomer360();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  clearProfileFlashTimer();
});

function clearProfileFlashTimer() {
  if (profileFlashTimer) {
    window.clearTimeout(profileFlashTimer);
    profileFlashTimer = null;
  }
}
function clearProfileFormErrors() {
  profileFormErrors.full_name = "";
  profileFormErrors.birth_date = "";
  profileFormErrors.email = "";
}

function validateProfileForm() {
  clearProfileFormErrors();
  let valid = true;
  if (!String(profileForm.full_name || "").trim()) {
    profileFormErrors.full_name = t("validationFullNameRequired");
    valid = false;
  }
  const birth = String(profileForm.birth_date || "").trim();
  if (birth) {
    const birthDate = new Date(birth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(birthDate.getTime()) || birthDate > today) {
      profileFormErrors.birth_date = t("validationBirthDateFuture");
      valid = false;
    }
  }
  const email = String(profileForm.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    profileFormErrors.email = t("validationEmailInvalid");
    valid = false;
  }
  return valid;
}

function scheduleProfileFlashClear() {
  clearProfileFlashTimer();
  profileFlashTimer = window.setTimeout(() => {
    profileSaveError.value = "";
    profileSaveMessage.value = "";
    profileFlashTimer = null;
  }, 3500);
}

function syncProfileFormFromCustomer() {
  profileForm.full_name = String(customer.value.full_name || "");
  profileForm.birth_date = customer.value.birth_date ? String(customer.value.birth_date) : "";
  profileForm.gender = String(customer.value.gender || "Unknown") || "Unknown";
  profileForm.marital_status = String(customer.value.marital_status || "Unknown") || "Unknown";
  profileForm.occupation = String(customer.value.occupation || "");
  profileForm.email = String(customer.value.email || "");
  profileForm.address = String(customer.value.address || "");
  profileForm.consent_status = String(customer.value.consent_status || "Unknown") || "Unknown";
}

function startProfileEdit() {
  clearProfileFlashTimer();
  clearProfileFormErrors();
  syncProfileFormFromCustomer();
  profileSaveError.value = "";
  profileSaveMessage.value = "";
  profileEditMode.value = true;
}

function cancelProfileEdit() {
  clearProfileFlashTimer();
  clearProfileFormErrors();
  profileEditMode.value = false;
  profileSaveError.value = "";
  profileSaveMessage.value = "";
  syncProfileFormFromCustomer();
}

async function saveProfile() {
  if (!props.name) return;
  clearProfileFlashTimer();
  if (!validateProfileForm()) {
    profileSaveError.value = "";
    profileSaveMessage.value = "";
    return;
  }
  profileSaveError.value = "";
  profileSaveMessage.value = "";
  try {
    const result = await customerProfileUpdateResource.submit({
      name: props.name,
      values: {
        full_name: profileForm.full_name,
        birth_date: profileForm.birth_date || null,
        gender: profileForm.gender || "Unknown",
        marital_status: profileForm.marital_status || "Unknown",
        occupation: profileForm.occupation,
        email: profileForm.email,
        address: profileForm.address,
        consent_status: profileForm.consent_status || "Unknown",
      },
    });
    if (result && typeof result === "object") {
      customerResource.setData({
        ...(customer.value || {}),
        ...result,
      });
    }
    profileEditMode.value = false;
    profileSaveMessage.value = t("saveProfileSuccess");
    syncProfileFormFromCustomer();
    scheduleProfileFlashClear();
  } catch (error) {
    profileSaveError.value = parseProfileSaveError(error) || t("saveProfileError");
    scheduleProfileFlashClear();
  }
}

function parseProfileSaveError(error) {
  const serverMessage =
    error?._server_messages ||
    error?.messages?.[0] ||
    error?.response?._server_messages ||
    error?.response?.message ||
    error?.message;
  if (!serverMessage) return "";
  try {
    const parsed = typeof serverMessage === "string" ? JSON.parse(serverMessage) : serverMessage;
    if (Array.isArray(parsed) && parsed.length) {
      return String(parsed[0]).replace(/<[^>]*>/g, "").trim();
    }
  } catch {
    return String(serverMessage).replace(/<[^>]*>/g, "").trim();
  }
  return "";
}

async function loadCustomer360() {
  if (!props.name) return;

  await Promise.allSettled([
    customerResource.reload({
      doctype: "AT Customer",
      name: props.name,
    }),
    policyResource.reload({
      doctype: "AT Policy",
      fields: [
        "name",
        "policy_no",
        "status",
        "currency",
        "start_date",
        "end_date",
        "gross_premium",
        "insurance_company",
      ],
      filters: {
        customer: props.name,
      },
      order_by: "end_date asc",
      limit_page_length: 100,
    }),
    offerResource.reload({
      doctype: "AT Offer",
      fields: [
        "name",
        "status",
        "currency",
        "offer_date",
        "valid_until",
        "gross_premium",
        "insurance_company",
      ],
      filters: {
        customer: props.name,
      },
      order_by: "modified desc",
      limit_page_length: 50,
    }),
    leadHistoryResource.reload({
      doctype: "AT Lead",
      fields: ["name", "status", "notes", "modified", "owner", "creation"],
      filters: {
        customer: props.name,
      },
      order_by: "modified desc",
      limit_page_length: 30,
    }),
    commentResource.reload({
      doctype: "Comment",
      fields: ["name", "creation", "owner", "content"],
      filters: {
        reference_doctype: "AT Customer",
        reference_name: props.name,
      },
      order_by: "creation desc",
      limit_page_length: 30,
    }),
    communicationResource.reload({
      doctype: "Communication",
      fields: ["name", "creation", "owner", "communication_date", "subject", "sender", "content"],
      filters: {
        reference_doctype: "AT Customer",
        reference_name: props.name,
      },
      order_by: "communication_date desc",
      limit_page_length: 30,
    }),
  ]);
  syncProfileFormFromCustomer();
}

function openPolicyDetail(policyName) {
  router.push({ name: "policy-detail", params: { name: policyName } });
}

function openCustomerDesk() {
  if (!props.name) return;
  window.location.href = `/app/at-customer/${encodeURIComponent(props.name)}`;
}
function openQuickOfferForCustomer() {
  if (!props.name) return;
  router.push({
    name: "offer-board",
    query: buildQuickCreateIntentQuery({
      prefills: {
        customer: props.name,
        customer_label: String(customer.value.full_name || props.name),
      },
      returnTo: router.currentRoute.value?.fullPath || "",
    }),
  });
}
function openCommunicationCenterForCustomer() {
  if (!props.name) return;
  router.push({
    name: "communication-center",
    query: {
      customer: props.name,
      customer_label: String(customer.value.full_name || props.name),
    },
  });
}

function policyCardFacts(policy) {
  return [
    {
      key: "endDate",
      label: t("endDate"),
      value: formatDate(policy?.end_date),
      valueClass: "text-xs text-slate-600",
    },
    {
      key: "grossPremium",
      label: t("grossPremium"),
      value: formatCurrency(policy?.gross_premium, policy?.currency || "TRY"),
      valueClass: "text-sm font-semibold text-slate-900",
    },
  ];
}

function offerCardFacts(offer) {
  return [
    {
      key: "validUntil",
      label: t("validUntil"),
      value: formatDate(offer?.valid_until),
      valueClass: "text-xs text-slate-600",
    },
    {
      key: "grossPremium",
      label: t("grossPremium"),
      value: formatCurrency(offer?.gross_premium, offer?.currency || "TRY"),
      valueClass: "text-sm font-semibold text-slate-900",
    },
  ];
}

function stripHtml(value) {
  if (!value) return "";
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(localeCode.value).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(localeCode.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(value, currency) {
  return new Intl.NumberFormat(localeCode.value, {
    style: "currency",
    currency: currency || "TRY",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}
</script>
