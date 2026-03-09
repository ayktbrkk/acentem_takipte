<template>
  <section class="space-y-4">
    <DocHeaderCard
      :eyebrow="t('overview')"
      :title="policy.policy_no || policy.name || name"
      :subtitle="`${policy.insurance_company || '-'} / ${policy.branch || '-'}`"
    >
      <template #actions>
        <DetailActionRow>
          <StatusBadge type="policy" :status="policy.status" />
          <ActionButton v-if="deskActionsEnabled()" variant="secondary" size="sm" @click="openDeskPolicy">{{ t("openDesk") }}</ActionButton>
          <ActionButton variant="secondary" size="sm" @click="goBack">{{ t("backList") }}</ActionButton>
        </DetailActionRow>
      </template>
      <DocSummaryGrid :items="headerSummaryItems" />
    </DocHeaderCard>

    <article class="surface-card rounded-2xl p-4">
      <DetailTabsBar
        :model-value="activeTab"
        :tabs="tabs.map((tab) => ({ value: tab.key, label: tab.label }))"
        @update:model-value="activeTab = $event"
      />
    </article>

    <article class="surface-card rounded-2xl p-4 md:hidden">
      <SectionCardHeader :title="t('mobileQuickActionsTitle')" :show-count="false" />
      <div class="mt-3 grid grid-cols-2 gap-2">
        <ActionButton variant="secondary" size="sm" @click="goBack">{{ t("backList") }}</ActionButton>
        <ActionButton variant="secondary" size="sm" @click="customer?.name && openCustomer(customer.name)">{{ t("customer360") }}</ActionButton>
        <ActionButton variant="primary" size="sm" @click="openQuickOwnershipAssignment">{{ t("newAssignment") }}</ActionButton>
        <ActionButton variant="secondary" size="sm" @click="openPolicyDocuments">{{ t("documents") }}</ActionButton>
        <ActionButton v-if="deskActionsEnabled()" variant="secondary" size="sm" @click="openDeskPolicy">{{ t("openDesk") }}</ActionButton>
      </div>
    </article>

    <template v-if="activeTab === 'summary'">
      <article class="surface-card rounded-2xl p-5">
        <SectionCardHeader :title="t('lifecycleTitle')" :count="snapshots.length" />
        <div v-if="snapshotLoading" class="at-empty-block">{{ t("loading") }}</div>
        <div v-else-if="snapshots.length === 0" class="at-empty-block">{{ t("emptyLifecycle") }}</div>
        <div v-else class="space-y-3">
          <div class="overflow-x-auto pb-1">
            <div class="inline-flex min-w-full items-center gap-2">
              <template v-for="(snapshot, index) in snapshots" :key="snapshot.name">
                <button
                  class="at-tab-chip"
                  :class="selectedSnapshot?.name === snapshot.name ? 'at-tab-chip-active' : 'at-tab-chip-idle'"
                  type="button"
                  @click="selectedSnapshotName = snapshot.name"
                >
                  v{{ snapshot.snapshot_version }} / {{ snapshot.snapshot_type }}
                </button>
                <span v-if="index < snapshots.length - 1" class="h-[2px] w-6 rounded bg-slate-300" />
              </template>
            </div>
          </div>
          <div v-if="snapshotPreview" class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <DocSummaryGrid :items="snapshotPreviewSummaryItems" />
          </div>
        </div>
      </article>

      <div class="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('timelineTitle')" :count="timelineItems.length" />
          <div v-if="timelineLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="timelineItems.length === 0" class="at-empty-block">{{ t("emptyTimeline") }}</div>
          <ol v-else class="space-y-3">
            <MetaListCard
              v-for="item in timelineItems"
              :key="item.key"
              :title="item.title"
              :description="item.body"
              :meta="item.actor || '-'"
            >
              <template #trailing>
                <div class="flex items-center gap-2">
                  <span class="h-2.5 w-2.5 rounded-full" :class="item.dotClass" />
                  <p class="text-xs text-slate-500">{{ fmtDateTime(item.date) }}</p>
                </div>
              </template>
            </MetaListCard>
          </ol>
        </article>

        <div class="space-y-4">
          <article class="surface-card rounded-2xl p-5">
            <SectionCardHeader :title="t('premiumTitle')" :show-count="false" />
            <DocSummaryGrid :items="premiumSummaryItems" />
          </article>

          <article class="surface-card rounded-2xl p-5">
            <SectionCardHeader :title="t('customerTitle')" :show-count="false" />
            <div v-if="customerLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
            <div v-else-if="customer" class="space-y-2 text-sm">
              <p class="font-semibold text-slate-900">{{ customer.full_name || customer.name }}</p>
              <p class="text-slate-600">{{ t("taxId") }}: {{ customer.tax_id || "-" }}</p>
              <p class="text-slate-600">{{ t("phone") }}: {{ customer.phone || "-" }}</p>
              <p class="text-slate-600">{{ t("address") }}: {{ customer.address || "-" }}</p>
              <ActionButton class="mt-2" variant="secondary" size="xs" @click="openCustomer(customer.name)">
                {{ t("customer360") }}
              </ActionButton>
            </div>
          <div v-else class="text-sm text-slate-500">{{ t("emptyCustomer") }}</div>
          </article>

          <article class="surface-card rounded-2xl p-5">
            <SectionCardHeader :title="t('scheduleTitle')" :show-count="false" />
            <DocSummaryGrid :items="scheduleSummaryItems" />
          </article>
          <article class="surface-card rounded-2xl p-5">
            <SectionCardHeader :title="t('assignmentsTitle')" :count="assignments.length" />
            <div class="mb-3 flex justify-end">
              <ActionButton variant="secondary" size="xs" @click="openQuickOwnershipAssignment">{{ t("newAssignment") }}</ActionButton>
            </div>
            <div v-if="policy360Resource.loading" class="text-sm text-slate-500">{{ t("loading") }}</div>
            <div v-else-if="assignments.length === 0" class="at-empty-block">{{ t("emptyAssignments") }}</div>
            <ul v-else class="space-y-2 text-sm">
              <MetaListCard
                v-for="assignment in assignments"
                :key="assignment.name"
                :title="assignment.assigned_to || '-'"
                :description="assignment.assignment_role || '-'"
                :meta="assignment.priority || '-'"
              >
                <template #trailing>
                  <div class="flex items-center gap-2">
                    <p class="text-xs text-slate-500">{{ assignment.status || '-' }}</p>
                    <ActionButton variant="secondary" size="xs" @click.stop="openEditOwnershipAssignment(assignment)">{{ t("edit") }}</ActionButton>
                  </div>
                </template>
              </MetaListCard>
            </ul>
          </article>
        </div>
      </div>
    </template>

    <template v-else-if="activeTab === 'premiums'">
      <div class="grid gap-4 xl:grid-cols-3">
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('premiumTitle')" :show-count="false" />
          <DocSummaryGrid :items="premiumPrimarySummaryItems" />
        </article>
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('payments')" :count="payments.length" />
          <div v-if="paymentLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="payments.length === 0" class="at-empty-block">{{ t("emptyPayments") }}</div>
          <ul v-else class="space-y-2 text-sm">
            <MetaListCard
              v-for="p in payments"
              :key="p.name"
              :title="p.payment_no || p.name"
              :description="`${p.payment_direction || '-'} / ${p.payment_purpose || '-'}`"
              :meta="fmtDate(p.payment_date)"
            >
              <template #trailing>
                <p class="text-xs text-slate-500">{{ paymentStatusLabel(p.status) }}</p>
              </template>
              <p class="mt-2 font-semibold text-slate-900">
                {{ fmtMoney(p.amount_try || p.amount, p.amount_try ? "TRY" : p.currency) }}
              </p>
            </MetaListCard>
          </ul>
        </article>
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('installmentsTitle')" :count="paymentInstallments.length" />
          <div v-if="paymentLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="paymentInstallments.length === 0" class="at-empty-block">{{ t("emptyInstallments") }}</div>
          <ul v-else class="space-y-2 text-sm [&>*:nth-child(n+4)]:hidden md:[&>*:nth-child(n+4)]:block">
            <MetaListCard
              v-for="installment in paymentInstallmentPreviewRows"
              :key="installment.name"
              :title="installment.title"
              :description="installment.description"
              :meta="installment.meta"
            >
              <template #trailing>
                <p class="text-xs text-slate-500">{{ installment.statusLabel }}</p>
              </template>
              <p class="mt-2 font-semibold text-slate-900">
                {{ installment.amountLabel }}
              </p>
            </MetaListCard>
          </ul>
        </article>
      </div>
    </template>

    <template v-else-if="activeTab === 'coverages'">
      <div class="grid gap-4 lg:grid-cols-2">
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('coverageContext')" :show-count="false" />
          <DocSummaryGrid :items="coverageSummaryItems" />
        </article>
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('productProfileTitle')" :show-count="false" />
          <DocSummaryGrid :items="productProfileSummaryItems" />
        </article>
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('productReadinessTitle')" :show-count="false" />
          <DocSummaryGrid :items="productReadinessSummaryItems" />
          <div class="mt-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("missingProductFields") }}</p>
            <div v-if="productMissingFieldRows.length === 0" class="at-empty-block mt-2">{{ t("noMissingProductField") }}</div>
            <ul v-else class="mt-2 space-y-2 text-sm">
              <MetaListCard
                v-for="item in productMissingFieldRows"
                :key="item.key"
                :title="item.label"
                :meta="t('missingFieldStatus')"
              />
            </ul>
          </div>
        </article>
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('snapshotSummary')" :show-count="false" />
          <DocSummaryGrid v-if="snapshotPreview" :items="snapshotSummaryItems" />
          <div v-else class="at-empty-block">{{ t("emptyLifecycle") }}</div>
        </article>
      </div>
    </template>

    <template v-else-if="activeTab === 'endorsements'">
      <div class="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('endorsementTitle')" :count="endorsements.length" />
          <div v-if="endorsementLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="endorsements.length === 0" class="at-empty-block">{{ t("emptyEndorsement") }}</div>
          <ul v-else class="space-y-2 text-sm [&>*:nth-child(n+4)]:hidden md:[&>*:nth-child(n+4)]:block">
            <MetaListCard
              v-for="e in endorsements"
              :key="e.name"
              :title="e.endorsement_type || '-'"
              :subtitle="fmtDate(e.endorsement_date)"
              :description="e.notes || '-'"
              :meta="`${t('version')}: v${e.snapshot_version || '-'}`"
            >
              <template #trailing>
                <p class="text-xs font-semibold" :class="endorsementStatusClass(e.status)">
                  {{ endorsementStatusLabel(e.status) }}
                </p>
              </template>
            </MetaListCard>
          </ul>
        </article>
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('lifecycleTitle')" :show-count="false" />
          <div v-if="snapshots.length === 0" class="at-empty-block">{{ t("emptyLifecycle") }}</div>
          <ol v-else class="space-y-3 text-sm">
            <MetaListCard
              v-for="s in snapshots"
              :key="s.name"
              :title="`v${s.snapshot_version || '-'}`"
              :subtitle="fmtDateTime(s.captured_on)"
              :meta="s.captured_by || '-'"
            >
              <template #trailing>
                <p class="text-xs text-slate-500">{{ s.snapshot_type }}</p>
              </template>
            </MetaListCard>
          </ol>
        </article>
      </div>
    </template>

    <template v-else>
      <div class="grid gap-4 lg:grid-cols-2">
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('documents')" :count="files.length">
            <template #trailing>
              <ActionButton variant="secondary" size="xs" @click="openPolicyDocuments">{{ t("open") }}</ActionButton>
            </template>
          </SectionCardHeader>
          <div v-if="fileLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="files.length === 0" class="at-empty-block">{{ t("emptyFiles") }}</div>
          <div v-else class="space-y-3">
            <DocSummaryGrid :items="documentProfileSummaryItems" />
            <ul class="space-y-2 text-sm [&>*:nth-child(n+4)]:hidden md:[&>*:nth-child(n+4)]:block">
              <MetaListCard
                v-for="f in files"
                :key="f.name"
                :title="f.file_name || f.name"
                :meta="fmtDateTime(f.creation)"
              >
                <template #trailing>
                  <a class="at-btn-sm shrink-0" :href="f.file_url || '#'" target="_blank" rel="noreferrer">{{ t("open") }}</a>
                </template>
              </MetaListCard>
            </ul>
          </div>
        </article>
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('notifications')" :count="notifications.length" />
          <div v-if="notificationLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="notifications.length === 0" class="at-empty-block">{{ t("emptyNotifications") }}</div>
          <ul v-else class="space-y-2 text-sm">
            <MetaListCard
              v-for="n in notifications"
              :key="n.name"
              :title="`${n.channel || '-'} / ${n.language || '-'}`"
              :description="n.subject || n.body || '-'"
              description-class="mt-2 line-clamp-2 text-slate-700"
              :meta="fmtDateTime(n.creation)"
            >
              <template #trailing>
                <p class="text-xs text-slate-500">{{ notificationStatusLabel(n.status) }}</p>
              </template>
            </MetaListCard>
          </ul>
        </article>
      </div>
    </template>
    <QuickCreateManagedDialog
      v-model="showOwnershipAssignmentDialog"
      config-key="ownership_assignment"
      :locale="activeLocale"
      :options-map="policyQuickOptionsMap"
      :before-open="prepareOwnershipAssignmentDialog"
      :success-handlers="ownershipAssignmentSuccessHandlers"
    />
    <QuickCreateManagedDialog
      v-model="showOwnershipAssignmentEditDialog"
      config-key="ownership_assignment_edit"
      :locale="activeLocale"
      :options-map="policyQuickOptionsMap"
      :before-open="prepareOwnershipAssignmentEditDialog"
      :success-handlers="ownershipAssignmentSuccessHandlers"
    />
  </section>
</template>

<script setup>
import { computed, ref, unref, watch } from "vue";
import { useRouter } from "vue-router";
import { createResource } from "frappe-ui";
import { useAuthStore } from "../stores/auth";
import { deskActionsEnabled } from "../utils/deskActions";
import StatusBadge from "../components/StatusBadge.vue";
import ActionButton from "../components/app-shell/ActionButton.vue";
import DetailActionRow from "../components/app-shell/DetailActionRow.vue";
import DetailTabsBar from "../components/app-shell/DetailTabsBar.vue";
import DocHeaderCard from "../components/app-shell/DocHeaderCard.vue";
import DocSummaryGrid from "../components/app-shell/DocSummaryGrid.vue";
import MetaListCard from "../components/app-shell/MetaListCard.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import SectionCardHeader from "../components/app-shell/SectionCardHeader.vue";

const props = defineProps({ name: { type: String, default: "" } });
const router = useRouter();
const authStore = useAuthStore();
const activeLocale = computed(() => unref(authStore.locale) || "en");

const labels = {
  tr: {
    overview: "Police Detayi", openDesk: "Yonetim Ekraninda Ac", backList: "Listeye Don", loading: "Yukleniyor...",
    mobileQuickActionsTitle: "Hizli Islemler",
    timelineTitle: "Zaman Tuneli", emptyTimeline: "Bu policede zaman tuneli kaydi yok.", lifecycleTitle: "Police Yasam Dongusu",
    emptyLifecycle: "Anlik goruntu kaydi yok.", premiumTitle: "Prim Bilgileri", customerTitle: "Musteri Karti",
    emptyCustomer: "Musteri kaydi yok.", taxId: "TC/VKN", phone: "Telefon", address: "Adres", customer360: "Musteri 360",
    scheduleTitle: "Vade Tarihleri", issue: "Tanzim", start: "Baslangic", end: "Bitis", remaining: "Kalan Gun",
    net: "Net Prim", tax: "Vergi", commission: "Komisyon", gross: "Brut Prim", commissionRate: "Komisyon Orani", gwpTry: "GWP TRY",
    payments: "Odemeler", emptyPayments: "Odeme kaydi yok.", installmentsTitle: "Taksit Plani", emptyInstallments: "Taksit kaydi yok.", assignmentsTitle: "Atamalar", emptyAssignments: "Atama kaydi yok.", installmentNo: "Taksit", paidOn: "Odeme Tarihi", coverageContext: "Police Kapsam Bilgileri", snapshotSummary: "Anlik Goruntu Ozeti", newAssignment: "Yeni Atama", edit: "Duzenle",
    productProfileTitle: "Urun Profili",
    productReadinessTitle: "Urun Hazirlik Durumu",
    company: "Sigorta Sirketi", branch: "Brans", customer: "Musteri", status: "Durum", currency: "Para Birimi", fxRate: "Kur", fxDate: "Kur Tarihi",
    productFamily: "Urun Ailesi", insuredSubject: "Sigortalanan Konu", coverageFocus: "Kapsam Odagi",
    readinessScore: "Hazirlik Skoru", completedFields: "Tam Alan", missingFields: "Eksik Alan",
    missingProductFields: "Eksik Urun Alanlari", noMissingProductField: "Eksik zorunlu alan bulunamadi.", missingFieldStatus: "Eksik",
    endorsementTitle: "Zeyilname Gecmisi", emptyEndorsement: "Zeyilname yok.", documents: "Dokumanlar", emptyFiles: "Dosya yok.",
    totalDocuments: "Toplam Dokuman", pdfDocuments: "PDF", imageDocuments: "Gorsel", spreadsheetDocuments: "Tablo", otherDocuments: "Diger", lastUploadedOn: "Son Yukleme",
    notifications: "Bildirim Taslaklari", emptyNotifications: "Bildirim yok.", version: "Versiyon", open: "Ac",
    tabSummary: "Ozet", tabPremiums: "Prim/Odeme", tabCoverages: "Teminatlar", tabEndorsements: "Zeyilnameler", tabDocuments: "Dokumanlar",
    typeEndorsement: "Zeyilname", typeCall: "Arama", typeNote: "Not", expired: "Suresi doldu", noDate: "Tarih yok",
  },
  en: {
    overview: "Policy Detail", openDesk: "Open Desk", backList: "Back to List", loading: "Loading...",
    mobileQuickActionsTitle: "Quick Actions",
    timelineTitle: "Timeline", emptyTimeline: "No timeline activity.", lifecycleTitle: "Policy Lifecycle",
    emptyLifecycle: "No snapshot records.", premiumTitle: "Premium Details", customerTitle: "Customer Card",
    emptyCustomer: "Customer not found.", taxId: "Tax ID", phone: "Phone", address: "Address", customer360: "Customer 360",
    scheduleTitle: "Schedule", issue: "Issue Date", start: "Start Date", end: "End Date", remaining: "Days Remaining",
    net: "Net Premium", tax: "Tax", commission: "Commission", gross: "Gross Premium", commissionRate: "Commission Rate", gwpTry: "GWP TRY",
    payments: "Payments", emptyPayments: "No payments.", installmentsTitle: "Installment Schedule", emptyInstallments: "No installment records.", assignmentsTitle: "Assignments", emptyAssignments: "No assignments.", installmentNo: "Installment", paidOn: "Paid On", coverageContext: "Policy Coverage Context", snapshotSummary: "Snapshot Summary", newAssignment: "New Assignment", edit: "Edit",
    productProfileTitle: "Product Profile",
    productReadinessTitle: "Product Readiness",
    company: "Insurance Company", branch: "Branch", customer: "Customer", status: "Status", currency: "Currency", fxRate: "FX Rate", fxDate: "FX Date",
    productFamily: "Product Family", insuredSubject: "Insured Subject", coverageFocus: "Coverage Focus",
    readinessScore: "Readiness Score", completedFields: "Completed Fields", missingFields: "Missing Fields",
    missingProductFields: "Missing Product Fields", noMissingProductField: "No missing required field found.", missingFieldStatus: "Missing",
    endorsementTitle: "Endorsement History", emptyEndorsement: "No endorsements.", documents: "Documents", emptyFiles: "No files.",
    totalDocuments: "Total Documents", pdfDocuments: "PDF", imageDocuments: "Images", spreadsheetDocuments: "Spreadsheets", otherDocuments: "Other", lastUploadedOn: "Last Upload",
    notifications: "Notification Drafts", emptyNotifications: "No notifications.", version: "Version", open: "Open",
    tabSummary: "Summary", tabPremiums: "Premiums/Payments", tabCoverages: "Coverages", tabEndorsements: "Endorsements", tabDocuments: "Documents",
    typeEndorsement: "Endorsement", typeCall: "Call", typeNote: "Note", expired: "Expired", noDate: "No date",
  },
};
const t = (k) => labels[activeLocale.value]?.[k] || labels.en[k] || k;

const tabs = computed(() => [
  { key: "summary", label: t("tabSummary") },
  { key: "premiums", label: t("tabPremiums") },
  { key: "coverages", label: t("tabCoverages") },
  { key: "endorsements", label: t("tabEndorsements") },
  { key: "documents", label: t("tabDocuments") },
]);
const activeTab = ref("summary");
const selectedSnapshotName = ref("");
const showOwnershipAssignmentDialog = ref(false);
const showOwnershipAssignmentEditDialog = ref(false);
const editingOwnershipAssignment = ref(null);

const policy360Resource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_policy_360_payload",
  auto: false,
});
const policyR = createResource({ url: "frappe.client.get", auto: false });
const customerR = createResource({ url: "frappe.client.get", auto: false });
const endorsementR = createResource({ url: "frappe.client.get_list", auto: false });
const commentR = createResource({ url: "frappe.client.get_list", auto: false });
const communicationR = createResource({ url: "frappe.client.get_list", auto: false });
const snapshotR = createResource({ url: "frappe.client.get_list", auto: false });
const paymentR = createResource({ url: "frappe.client.get_list", auto: false });
const fileR = createResource({ url: "frappe.client.get_list", auto: false });
const notificationR = createResource({ url: "frappe.client.get_list", auto: false });
const policyQuickCustomerResource = createResource({ url: "frappe.client.get_list", auto: false });
const policyQuickPolicyResource = createResource({ url: "frappe.client.get_list", auto: false });

const policy = computed(() => policyR.data || {});
const customer = computed(() => customerR.data || null);
const endorsements = computed(() => endorsementR.data || []);
const comments = computed(() => commentR.data || []);
const communications = computed(() => communicationR.data || []);
const snapshots = computed(() => [...(snapshotR.data || [])].sort((a, b) => Number(a.snapshot_version || 0) - Number(b.snapshot_version || 0)));
const payments = computed(() => paymentR.data || []);
const paymentInstallments = computed(() => policy360Resource.data?.payment_installments || []);
const files = computed(() => fileR.data || []);
const notifications = computed(() => notificationR.data || []);
const assignments = computed(() => policy360Resource.data?.assignments || []);
const productProfile = computed(() => policy360Resource.data?.product_profile || {});
const documentProfile = computed(() => policy360Resource.data?.document_profile || {});

const locale = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
const timelineLoading = computed(() => policy360Resource.loading);
const snapshotLoading = computed(() => policy360Resource.loading);
const customerLoading = computed(() => policy360Resource.loading);
const endorsementLoading = computed(() => policy360Resource.loading);
const paymentLoading = computed(() => policy360Resource.loading);
const fileLoading = computed(() => policy360Resource.loading);
const notificationLoading = computed(() => policy360Resource.loading);
const policyQuickOptionsMap = computed(() => ({
  customers: (policyQuickCustomerResource.data || []).map((row) => ({ value: row.name, label: row.full_name || row.name })),
  policies: (policyQuickPolicyResource.data || []).map((row) => ({ value: row.name, label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}` })),
}));
const ownershipAssignmentSuccessHandlers = {
  "ownership-assignments-list": async () => {
    await load();
  },
};

const selectedSnapshot = computed(() => {
  if (!snapshots.value.length) return null;
  if (!selectedSnapshotName.value) return snapshots.value[snapshots.value.length - 1];
  return snapshots.value.find((s) => s.name === selectedSnapshotName.value) || snapshots.value[snapshots.value.length - 1];
});
const snapshotPreview = computed(() => {
  if (!selectedSnapshot.value?.snapshot_json) return null;
  try {
    const data = JSON.parse(selectedSnapshot.value.snapshot_json);
    return {
      gross: Number(data.gross_premium || 0),
      commission: Number(data.commission_amount || data.commission || 0),
      currency: data.currency || policy.value.currency || "TRY",
      start: data.start_date || null,
      end: data.end_date || null,
    };
  } catch {
    return null;
  }
});
const timelineItems = computed(() => {
  const e = endorsements.value.map((r) => ({
    key: `e:${r.name}`, date: r.applied_on || r.endorsement_date || r.creation,
    title: `${t("typeEndorsement")} - ${r.endorsement_type || "-"}`,
    body: r.notes || `${r.status || "-"} | ${r.snapshot_version || "-"}`,
    actor: r.applied_by || r.owner || "-", dotClass: "bg-emerald-500",
  }));
  const c = communications.value.map((r) => ({
    key: `c:${r.name}`, date: r.communication_date || r.creation,
    title: `${t("typeCall")} - ${r.subject || r.communication_type || "-"}`,
    body: stripHtml(r.content) || "-", actor: r.sender || r.owner || "-", dotClass: "bg-sky-500",
  }));
  const n = comments.value.map((r) => ({
    key: `n:${r.name}`, date: r.creation,
    title: `${t("typeNote")} - ${r.comment_type || "-"}`,
    body: stripHtml(r.content) || "-", actor: r.owner || "-", dotClass: "bg-amber-500",
  }));
  return [...e, ...c, ...n].filter((r) => Boolean(r.date)).sort((a, b) => new Date(b.date) - new Date(a.date));
});

const remainingDays = computed(() => {
  if (!policy.value.end_date) return null;
  const end = new Date(policy.value.end_date); const now = new Date();
  end.setHours(0, 0, 0, 0); now.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - now.getTime()) / 86400000);
});
const remainingLabel = computed(() => (remainingDays.value == null ? t("noDate") : remainingDays.value < 0 ? t("expired") : String(remainingDays.value)));
const remainingClass = computed(() => (remainingDays.value == null ? "text-slate-500" : remainingDays.value < 0 ? "text-rose-600" : remainingDays.value <= 30 ? "text-amber-600" : "text-emerald-600"));
const headerSummaryItems = computed(() => [
  {
    key: "status",
    label: t("status"),
    value: policyStatusLabel(policy.value.status),
  },
  {
    key: "customer",
    label: t("customer"),
    value: customer.value?.full_name || policy.value.customer || "-",
  },
  {
    key: "gross",
    label: t("gross"),
    value: fmtMoney(policy.value.gross_premium, policy.value.currency),
  },
  {
    key: "remaining",
    label: t("remaining"),
    value: remainingLabel.value,
    valueClass: remainingClass.value,
    meta: fmtDate(policy.value.end_date),
  },
]);
const premiumSummaryItems = computed(() => [
  {
    key: "net",
    label: t("net"),
    value: fmtMoney(policy.value.net_premium, policy.value.currency),
  },
  {
    key: "tax",
    label: t("tax"),
    value: fmtMoney(policy.value.tax_amount, policy.value.currency),
  },
  {
    key: "commission",
    label: t("commission"),
    value: fmtMoney(policy.value.commission_amount, policy.value.currency),
  },
  {
    key: "gross",
    label: t("gross"),
    value: fmtMoney(policy.value.gross_premium, policy.value.currency),
  },
  {
    key: "commissionRate",
    label: t("commissionRate"),
    value: fmtPct(policy.value.commission_rate),
  },
  {
    key: "gwpTry",
    label: t("gwpTry"),
    value: fmtMoney(policy.value.gwp_try, "TRY"),
  },
]);
const premiumPrimarySummaryItems = computed(() => [
  {
    key: "net",
    label: t("net"),
    value: fmtMoney(policy.value.net_premium, policy.value.currency),
  },
  {
    key: "tax",
    label: t("tax"),
    value: fmtMoney(policy.value.tax_amount, policy.value.currency),
  },
  {
    key: "commission",
    label: t("commission"),
    value: fmtMoney(policy.value.commission_amount, policy.value.currency),
  },
  {
    key: "gross",
    label: t("gross"),
    value: fmtMoney(policy.value.gross_premium, policy.value.currency),
  },
]);
const scheduleSummaryItems = computed(() => [
  {
    key: "issue",
    label: t("issue"),
    value: fmtDate(policy.value.issue_date),
  },
  {
    key: "start",
    label: t("start"),
    value: fmtDate(policy.value.start_date),
  },
  {
    key: "end",
    label: t("end"),
    value: fmtDate(policy.value.end_date),
  },
  {
    key: "remaining",
    label: t("remaining"),
    value: remainingLabel.value,
    valueClass: remainingClass.value,
  },
]);
const coverageSummaryItems = computed(() => [
  {
    key: "company",
    label: t("company"),
    value: policy.value.insurance_company || "-",
  },
  {
    key: "branch",
    label: t("branch"),
    value: policy.value.branch || "-",
  },
  {
    key: "status",
    label: t("status"),
    value: policyStatusLabel(policy.value.status),
  },
  {
    key: "currency",
    label: t("currency"),
    value: policy.value.currency || "TRY",
  },
  {
    key: "fxRate",
    label: t("fxRate"),
    value: Number(policy.value.fx_rate || 0).toFixed(4),
  },
  {
    key: "fxDate",
    label: t("fxDate"),
    value: fmtDate(policy.value.fx_date),
  },
]);
const paymentInstallmentPreviewRows = computed(() =>
  paymentInstallments.value.slice(0, 6).map((row) => ({
    name: row.name,
    title: `${t("installmentNo")} ${row.installment_no || "-"}/${row.installment_count || "-"}`,
    description: row.payment || "-",
    meta: fmtDate(row.due_date),
    statusLabel: installmentStatusLabel(row.status),
    amountLabel: fmtMoney(row.amount_try || row.amount, row.amount_try ? "TRY" : row.currency),
  }))
);
const productProfileSummaryItems = computed(() => [
  {
    key: "productFamily",
    label: t("productFamily"),
    value: productProfile.value.product_family || "-",
  },
  {
    key: "insuredSubject",
    label: t("insuredSubject"),
    value: productProfile.value.insured_subject || "-",
  },
  {
    key: "coverageFocus",
    label: t("coverageFocus"),
    value: productProfile.value.coverage_focus || productProfile.value.branch_label || "-",
  },
  {
    key: "policyStatus",
    label: t("status"),
    value: policyStatusLabel(productProfile.value.policy_status || policy.value.status),
  },
]);
const productReadinessSummaryItems = computed(() => [
  {
    key: "readiness",
    label: t("readinessScore"),
    value: fmtPct(productProfile.value.readiness_score),
  },
  {
    key: "completed",
    label: t("completedFields"),
    value: String(productProfile.value.completed_field_count ?? 0),
  },
  {
    key: "missing",
    label: t("missingFields"),
    value: String(productProfile.value.missing_field_count ?? 0),
  },
]);
const documentProfileSummaryItems = computed(() => [
  {
    key: "totalDocuments",
    label: t("totalDocuments"),
    value: String(documentProfile.value.total_files ?? files.value.length ?? 0),
  },
  {
    key: "pdfDocuments",
    label: t("pdfDocuments"),
    value: String(documentProfile.value.pdf_count ?? 0),
  },
  {
    key: "imageDocuments",
    label: t("imageDocuments"),
    value: String(documentProfile.value.image_count ?? 0),
  },
  {
    key: "spreadsheetDocuments",
    label: t("spreadsheetDocuments"),
    value: String(documentProfile.value.spreadsheet_count ?? 0),
  },
  {
    key: "otherDocuments",
    label: t("otherDocuments"),
    value: String(documentProfile.value.other_count ?? 0),
  },
  {
    key: "lastUploadedOn",
    label: t("lastUploadedOn"),
    value: documentProfile.value.last_uploaded_on ? fmtDateTime(documentProfile.value.last_uploaded_on) : t("noDate"),
  },
]);
const productMissingFieldRows = computed(() => productProfile.value.missing_fields || []);
const snapshotSummaryItems = computed(() => [
  {
    key: "version",
    label: t("version"),
    value: `v${selectedSnapshot.value?.snapshot_version || "-"}`,
  },
  {
    key: "start",
    label: t("start"),
    value: fmtDate(snapshotPreview.value?.start),
  },
  {
    key: "end",
    label: t("end"),
    value: fmtDate(snapshotPreview.value?.end),
  },
  {
    key: "gross",
    label: t("gross"),
    value: fmtMoney(snapshotPreview.value?.gross, snapshotPreview.value?.currency),
  },
]);
const snapshotPreviewSummaryItems = computed(() => [
  {
    key: "gross",
    label: t("gross"),
    value: fmtMoney(snapshotPreview.value?.gross, snapshotPreview.value?.currency),
  },
  {
    key: "commission",
    label: t("commission"),
    value: fmtMoney(snapshotPreview.value?.commission, snapshotPreview.value?.currency),
  },
  {
    key: "start",
    label: t("start"),
    value: fmtDate(snapshotPreview.value?.start),
  },
  {
    key: "end",
    label: t("end"),
    value: fmtDate(snapshotPreview.value?.end),
  },
]);

watch(() => props.name, () => { activeTab.value = "summary"; void load(); }, { immediate: true });

async function load() {
  if (!props.name) return;
  try {
    const payload = await policy360Resource.reload({ name: props.name });
    const data = payload || {};
    policyR.setData(data.policy || {});
    customerR.setData(data.customer || null);
    endorsementR.setData(data.endorsements || []);
    commentR.setData(data.comments || []);
    communicationR.setData(data.communications || []);
    snapshotR.setData(data.snapshots || []);
    paymentR.setData(data.payments || []);
    fileR.setData(data.files || []);
    notificationR.setData(data.notifications || []);
  } catch {
    policyR.setData({});
    customerR.setData(null);
    endorsementR.setData([]);
    commentR.setData([]);
    communicationR.setData([]);
    snapshotR.setData([]);
    paymentR.setData([]);
    fileR.setData([]);
    notificationR.setData([]);
    return;
  }
  selectedSnapshotName.value = snapshots.value[snapshots.value.length - 1]?.name || "";
}

const goBack = () => router.push({ name: "policy-list" });
const openDeskPolicy = () => props.name && (window.location.href = `/app/at-policy/${encodeURIComponent(props.name)}`);
const openCustomer = (name) => name && router.push({ name: "customer-detail", params: { name } });
const openPolicyDocuments = () =>
  props.name &&
  router.push({
    name: "files-list",
    query: {
      attached_to_doctype: "AT Policy",
      attached_to_name: props.name,
    },
  });
const openQuickOwnershipAssignment = () => { showOwnershipAssignmentDialog.value = true; };
const openEditOwnershipAssignment = (assignment) => {
  editingOwnershipAssignment.value = assignment || null;
  showOwnershipAssignmentEditDialog.value = true;
};
const endorsementStatusClass = (s) => (s === "Applied" ? "text-emerald-700" : s === "Cancelled" ? "text-rose-700" : "text-slate-700");

function policyStatusLabel(status) {
  if (activeLocale.value !== "tr") return status || "-";
  if (status === "Active") return "Aktif";
  if (status === "KYT") return "KYT";
  if (status === "IPT" || status === "Cancelled") return "Iptal";
  if (status === "Expired") return "Suresi Doldu";
  return status || "-";
}

function paymentStatusLabel(status) {
  if (activeLocale.value !== "tr") return status || "-";
  if (status === "Submitted") return "Gonderildi";
  if (status === "Draft") return "Taslak";
  if (status === "Cancelled") return "Iptal";
  if (status === "Paid") return "Odendi";
  return status || "-";
}

function installmentStatusLabel(status) {
  if (activeLocale.value !== "tr") return status || "-";
  if (status === "Scheduled") return "Planlandi";
  if (status === "Overdue") return "Gecikti";
  if (status === "Paid") return "Odendi";
  if (status === "Cancelled") return "Iptal";
  return status || "-";
}

function endorsementStatusLabel(status) {
  if (activeLocale.value !== "tr") return status || "-";
  if (status === "Applied") return "Uygulandi";
  if (status === "Pending") return "Beklemede";
  if (status === "Cancelled") return "Iptal";
  return status || "-";
}

function notificationStatusLabel(status) {
  if (activeLocale.value !== "tr") return status || "-";
  if (status === "Queued") return "Kuyrukta";
  if (status === "Processing") return "Isleniyor";
  if (status === "Sent") return "Gonderildi";
  if (status === "Failed") return "Basarisiz";
  if (status === "Dead") return "Kalici Hata";
  if (status === "Draft") return "Taslak";
  return status || "-";
}

const fmtDate = (v) => (v ? new Intl.DateTimeFormat(locale.value).format(new Date(v)) : "-");
const fmtDateTime = (v) => (v ? new Intl.DateTimeFormat(locale.value, { dateStyle: "medium", timeStyle: "short" }).format(new Date(v)) : "-");
const fmtMoney = (v, c) => new Intl.NumberFormat(locale.value, { style: "currency", currency: c || "TRY", maximumFractionDigits: 2 }).format(Number(v || 0));
const fmtPct = (v) => `${new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }).format(Number(v || 0))}%`;
const stripHtml = (v) => (v ? String(v).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() : "");

async function ensurePolicyQuickOptionSources() {
  await Promise.allSettled([
    policyQuickCustomerResource.reload({
      doctype: "AT Customer",
      fields: ["name", "full_name"],
      filters: customer.value?.name ? { name: customer.value.name } : {},
      limit_page_length: 50,
    }),
    policyQuickPolicyResource.reload({
      doctype: "AT Policy",
      fields: ["name", "policy_no", "customer"],
      filters: props.name ? { name: props.name } : {},
      limit_page_length: 50,
    }),
  ]);
}

async function prepareOwnershipAssignmentDialog({ form }) {
  await ensurePolicyQuickOptionSources();
  if (!form.source_doctype) form.source_doctype = "AT Policy";
  if (!form.source_name) form.source_name = props.name || "";
  if (!form.policy) form.policy = props.name || "";
  if (!form.customer) form.customer = customer.value?.name || policy.value.customer || "";
}

async function prepareOwnershipAssignmentEditDialog({ resetForm }) {
  await ensurePolicyQuickOptionSources();
  const assignment = editingOwnershipAssignment.value || {};
  resetForm({
    doctype: "AT Ownership Assignment",
    name: assignment.name || "",
    source_doctype: assignment.source_doctype || "AT Policy",
    source_name: assignment.source_name || props.name || "",
    customer: assignment.customer || customer.value?.name || policy.value.customer || "",
    policy: assignment.policy || props.name || "",
    assigned_to: assignment.assigned_to || "",
    assignment_role: assignment.assignment_role || "Owner",
    status: assignment.status || "Open",
    priority: assignment.priority || "Normal",
    due_date: assignment.due_date || "",
    notes: assignment.notes || "",
  });
}
</script>
