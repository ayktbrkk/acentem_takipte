<template>
  <section class="page-shell">
    <div class="detail-topbar">
      <div>
        <p class="detail-breadcrumb">Sigorta Operasyonları → Poliçeler</p>
        <h1 class="detail-title">
          {{ policy.policy_no || policy.name || name }}
           <StatusBadge :status="policy.status" domain="policy" />
        </h1>
        <p class="detail-subtitle">{{ `${policy.insurance_company || '-'} / ${policy.branch || '-'}` }}</p>
        <div class="mt-1.5 flex flex-wrap items-center gap-2">
          <button class="copy-tag" type="button" @click="copyIdentity(policy.name, 'recordNo')">
            {{ policy.name || '-' }}
          </button>
          <button class="copy-tag" :disabled="!policy.policy_no" type="button" @click="copyIdentity(policy.policy_no, 'carrierPolicyNo')">
            {{ carrierPolicyDisplayValue }}
          </button>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-sm" type="button" @click="goBack">{{ t("backList") }}</button>
        <button class="btn btn-primary btn-sm" type="button" @click="openQuickOwnershipAssignment">{{ t("newAssignment") }}</button>
      </div>
    </div>

    <HeroStrip :cells="heroCells" />

    <div class="nav-tabs-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['nav-tab', activeTab === tab.key && 'is-active']"
        type="button"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="detail-body">
      <div class="detail-main">
        <template v-if="activeTab === 'summary'">
          <DetailCard :title="t('lifecycleTitle')">
            <template #action>
              <span class="badge badge-blue">v{{ selectedSnapshot?.snapshot_version || '-' }}</span>
            </template>
            <StepBar :steps="lifecycleSteps" class="mb-4" />
            <FieldGroup :fields="lifecycleFields" :cols="4" />
          </DetailCard>

          <DetailCard :title="t('timelineTitle')">
            <template #action>
              <button class="btn btn-sm" type="button" @click="openQuickOwnershipAssignment">{{ t("newAssignment") }}</button>
            </template>
            <div v-if="timelineLoading" class="card-empty">{{ t("loading") }}</div>
            <div v-else-if="timelineItems.length === 0" class="card-empty">{{ t("emptyTimeline") }}</div>
            <div v-else>
              <div v-for="item in timelineItems" :key="item.key" class="timeline-item">
                <span class="tl-dot" :class="item.dotClass || 'tl-dot-active'" />
                <div class="min-w-0 flex-1">
                  <p class="tl-text">{{ item.title }}</p>
                  <p class="text-sm text-gray-500">{{ item.body }}</p>
                  <p class="tl-time">{{ fmtDateTime(item.date) }} · {{ item.actor || '-' }}</p>
                </div>
              </div>
            </div>
          </DetailCard>
        </template>

        <template v-else-if="activeTab === 'premiums'">
          <DetailCard :title="t('premiumTitle')">
            <FieldGroup :fields="premiumFieldGroups" :cols="2" />
          </DetailCard>
          <DetailCard :title="t('payments')">
            <div v-if="paymentLoading" class="card-empty">{{ t("loading") }}</div>
            <div v-else-if="payments.length === 0" class="card-empty">{{ t("emptyPayments") }}</div>
            <div v-else class="space-y-3">
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
                  {{ fmtMoney(p.amount_try || p.amount, p.amount_try ? 'TRY' : p.currency) }}
                </p>
              </MetaListCard>
            </div>
          </DetailCard>
        </template>

        <template v-else-if="activeTab === 'coverages'">
          <DetailCard :title="t('coverageContext')">
            <FieldGroup :fields="coverageFieldGroups" :cols="2" />
          </DetailCard>
          <DetailCard :title="t('productProfileTitle')">
            <FieldGroup :fields="productProfileFieldGroups" :cols="2" />
          </DetailCard>
          <DetailCard :title="t('productReadinessTitle')">
            <FieldGroup :fields="productReadinessFieldGroups" :cols="3" />
          </DetailCard>
        </template>

        <template v-else-if="activeTab === 'endorsements'">
          <DetailCard :title="t('endorsementTitle')">
            <div v-if="endorsementLoading" class="card-empty">{{ t("loading") }}</div>
            <div v-else-if="endorsements.length === 0" class="card-empty">{{ t("emptyEndorsement") }}</div>
            <div v-else class="space-y-3">
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
            </div>
          </DetailCard>
        </template>

        <template v-else>
          <DetailCard :title="t('documents')">
            <template #action>
              <button class="btn btn-sm" type="button" @click="openPolicyDocuments">{{ t("open") }}</button>
            </template>
            <div v-if="fileLoading" class="card-empty">{{ t("loading") }}</div>
            <div v-else-if="files.length === 0" class="card-empty">{{ t("emptyFiles") }}</div>
            <div v-else class="space-y-3">
              <FieldGroup :fields="documentFieldGroups" :cols="3" />
              <MetaListCard v-for="f in files" :key="f.name" :title="f.file_name || f.name" :meta="fmtDateTime(f.creation)">
                <template #trailing>
                  <a class="btn btn-sm" :href="f.file_url || '#'" target="_blank" rel="noreferrer">{{ t("open") }}</a>
                </template>
              </MetaListCard>
            </div>
          </DetailCard>
        </template>
      </div>

      <div class="detail-sidebar space-y-4">
        <DetailCard :title="t('premiumTitle')">
          <div class="grid grid-cols-2 gap-2">
            <div v-for="m in premiumMetrics" :key="m.label" class="mini-metric">
              <p class="mini-metric-label">{{ m.label }}</p>
              <p class="mini-metric-value">{{ m.value }}</p>
            </div>
          </div>
        </DetailCard>

        <DetailCard :title="t('customerTitle')">
          <div v-if="customerLoading" class="field-value-muted">{{ t('loading') }}</div>
          <div v-else-if="customer" class="space-y-3">
            <div class="flex items-center gap-2.5">
              <div class="avatar avatar-md avatar-blue">{{ customerInitials }}</div>
              <div>
                <p class="text-sm font-medium text-gray-900">{{ customer.full_name || customer.name }}</p>
                <p class="text-xs text-gray-400">{{ t('taxId') }}: {{ customer.tax_id || '-' }}</p>
              </div>
            </div>
            <button class="btn btn-full btn-sm" type="button" @click="openCustomer(customer.name)">
              {{ t('customer360') }} →
            </button>
          </div>
          <div v-else class="field-value-muted">{{ t('emptyCustomer') }}</div>
        </DetailCard>

        <DetailCard :title="t('scheduleTitle')">
          <FieldGroup :fields="dateFields" :cols="2" />
        </DetailCard>

        <DetailCard :title="t('assignmentsTitle')">
          <div v-if="assignments.length === 0" class="field-value-muted">{{ t('emptyAssignments') }}</div>
          <div v-else class="space-y-2">
            <MetaListCard
              v-for="assignment in assignments.slice(0, 3)"
              :key="assignment.name"
              :title="assignment.assigned_to || '-'"
              :description="assignment.assignment_role || '-'"
              :meta="assignment.status || '-'"
            />
          </div>
        </DetailCard>
      </div>
    </div>

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
import { computed, onBeforeUnmount, ref, unref, watch } from "vue";
import { useRouter } from "vue-router";
import { createResource } from "frappe-ui";
import { useAuthStore } from "../stores/auth";
import { deskActionsEnabled } from "../utils/deskActions";
import MetaListCard from "../components/app-shell/MetaListCard.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import HeroStrip from "../components/ui/HeroStrip.vue";
import DetailCard from "../components/ui/DetailCard.vue";
import FieldGroup from "../components/ui/FieldGroup.vue";
import StepBar from "../components/ui/StepBar.vue";

const props = defineProps({ name: { type: String, default: "" } });
const router = useRouter();
const authStore = useAuthStore();
const activeLocale = computed(() => unref(authStore.locale) || "en");

const labels = {
  tr: {
    overview: "Poliçe Detayı", openDesk: "Yönetim Ekranında Aç", backList: "Listeye Dön", loading: "Yükleniyor...",
    recordNo: "Kayıt No", carrierPolicyNo: "Şirket Poliçe No",
    copy: "Kopyala", copied: "Kopyalandı", notAssigned: "Henüz atanmadı",
    mobileQuickActionsTitle: "Hızlı İşlemler",
    timelineTitle: "Zaman Tüneli", emptyTimeline: "Bu poliçede zaman tüneli kaydı yok.", lifecycleTitle: "Poliçe Yaşam Döngüsü",
    emptyLifecycle: "Anlık görüntü kaydı yok.", premiumTitle: "Prim Bilgileri", customerTitle: "Müşteri Kartı",
    emptyCustomer: "Müşteri kaydı yok.", taxId: "TC/VKN", phone: "Telefon", address: "Adres", customer360: "Müşteri 360",
    scheduleTitle: "Vade Tarihleri", issue: "Tanzim", start: "Başlangıç", end: "Bitiş", remaining: "Kalan Gün",
    net: "Net Prim", tax: "Vergi", commission: "Komisyon", gross: "Brüt Prim", commissionRate: "Komisyon Oranı", gwpTry: "GWP TRY",
    payments: "Ödemeler", emptyPayments: "Ödeme kaydı yok.", installmentsTitle: "Taksit Planı", emptyInstallments: "Taksit kaydı yok.", assignmentsTitle: "Atamalar", emptyAssignments: "Atama kaydı yok.", activitiesTitle: "Aktiviteler", emptyActivities: "Aktivite kaydı yok.", remindersTitle: "Hatırlatıcılar", emptyReminders: "Hatırlatıcı kaydı yok.", reminderAt: "Hatırlatma", reminderPriority: "Öncelik", markDone: "Tamamla", cancelReminder: "İptal Et", installmentNo: "Taksit", paidOn: "Ödeme Tarihi", coverageContext: "Poliçe Kapsam Bilgileri", snapshotSummary: "Anlık Görüntü Özeti", newAssignment: "Yeni Atama", edit: "Düzenle", delete: "Sil", deleteAssignmentConfirm: "Bu atama kaydı silinsin mi?", startAssignment: "İşleme Al", blockAssignment: "Bloke Et", closeAssignment: "Kapat",
    productProfileTitle: "Ürün Profili",
    productReadinessTitle: "Ürün Hazırlık Durumu",
    company: "Sigorta Şirketi", branch: "Branş", customer: "Müşteri", status: "Durum", currency: "Para Birimi", fxRate: "Kur", fxDate: "Kur Tarihi",
    productFamily: "Ürün Ailesi", insuredSubject: "Sigortalanan Konu", coverageFocus: "Kapsam Odağı",
    readinessScore: "Hazırlik Skoru", completedFields: "Tam Alan", missingFields: "Eksik Alan",
    missingProductFields: "Eksik Ürün Alanlari", noMissingProductField: "Eksik zorunlu alan bulunamadı.", missingFieldStatus: "Eksik",
    endorsementTitle: "Zeyilname Gecmisi", emptyEndorsement: "Zeyilname yok.", documents: "Dokümanlar", emptyFiles: "Dosya yok.",
    totalDocuments: "Toplam Doküman", pdfDocuments: "PDF", imageDocuments: "Görsel", spreadsheetDocuments: "Tablo", otherDocuments: "Diğer", lastUploadedOn: "Son Yükleme",
    notifications: "Bildirim Taslakları", emptyNotifications: "Bildirim yok.", version: "Versiyon", open: "Aç",
    tabSummary: "Özet", tabPremiums: "Prim/Ödeme", tabCoverages: "Teminatlar", tabEndorsements: "Zeyilnameler", tabDocuments: "Dokümanlar",
    typeEndorsement: "Zeyilname", typeCall: "Arama", typeNote: "Not", expired: "Suresi doldu", noDate: "Tarih yok",
  },
  en: {
    overview: "Policy Detail", openDesk: "Open Desk", backList: "Back to List", loading: "Loading...",
    recordNo: "Record No", carrierPolicyNo: "Carrier Policy No",
    copy: "Copy", copied: "Copied", notAssigned: "Not assigned yet",
    mobileQuickActionsTitle: "Quick Actions",
    timelineTitle: "Timeline", emptyTimeline: "No timeline activity.", lifecycleTitle: "Policy Lifecycle",
    emptyLifecycle: "No snapshot records.", premiumTitle: "Premium Details", customerTitle: "Customer Card",
    emptyCustomer: "Customer not found.", taxId: "Tax ID", phone: "Phone", address: "Address", customer360: "Customer 360",
    scheduleTitle: "Schedule", issue: "Issue Date", start: "Start Date", end: "End Date", remaining: "Days Remaining",
    net: "Net Premium", tax: "Tax", commission: "Commission", gross: "Gross Premium", commissionRate: "Commission Rate", gwpTry: "GWP TRY",
    payments: "Payments", emptyPayments: "No payments.", installmentsTitle: "Installment Schedule", emptyInstallments: "No installment records.", assignmentsTitle: "Assignments", emptyAssignments: "No assignments.", activitiesTitle: "Activities", emptyActivities: "No activities found.", remindersTitle: "Reminders", emptyReminders: "No reminders found.", reminderAt: "Reminder At", reminderPriority: "Priority", markDone: "Mark Done", cancelReminder: "Cancel", installmentNo: "Installment", paidOn: "Paid On", coverageContext: "Policy Coverage Context", snapshotSummary: "Snapshot Summary", newAssignment: "New Assignment", edit: "Edit", delete: "Delete", deleteAssignmentConfirm: "Delete this assignment record?", startAssignment: "Start", blockAssignment: "Block", closeAssignment: "Close",
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
const reminderUpdateResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.quick_create.update_quick_aux_record",
  auto: false,
});
const assignmentDeleteResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.quick_create.delete_quick_aux_record",
  auto: false,
});

const resourceValue = (resource, fallback = null) => {
  const value = unref(resource?.data);
  return value == null ? fallback : value;
};
const asArray = (value) => (Array.isArray(value) ? value : []);
const policy = computed(() => resourceValue(policyR, {}));
const customer = computed(() => resourceValue(customerR, null));
const endorsements = computed(() => asArray(resourceValue(endorsementR, [])));
const comments = computed(() => asArray(resourceValue(commentR, [])));
const communications = computed(() => asArray(resourceValue(communicationR, [])));
const snapshots = computed(() => {
  const items = asArray(resourceValue(snapshotR, []));
  return [...items].sort((a, b) => Number(a.snapshot_version || 0) - Number(b.snapshot_version || 0));
});
const policy360Data = computed(() => resourceValue(policy360Resource, {}));
const payments = computed(() => asArray(resourceValue(paymentR, [])));
const paymentInstallments = computed(() => asArray(policy360Data.value?.payment_installments));
const files = computed(() => asArray(resourceValue(fileR, [])));
const notifications = computed(() => asArray(resourceValue(notificationR, [])));
const assignments = computed(() => asArray(policy360Data.value?.assignments));
const activities = computed(() => asArray(policy360Data.value?.activities));
const reminders = computed(() => asArray(policy360Data.value?.reminders));
const productProfile = computed(() => policy360Data.value?.product_profile || {});
const documentProfile = computed(() => policy360Data.value?.document_profile || {});

const locale = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
const timelineLoading = computed(() => Boolean(unref(policy360Resource.loading)));
const snapshotLoading = computed(() => Boolean(unref(policy360Resource.loading)));
const customerLoading = computed(() => Boolean(unref(policy360Resource.loading)));
const endorsementLoading = computed(() => Boolean(unref(policy360Resource.loading)));
const paymentLoading = computed(() => Boolean(unref(policy360Resource.loading)));
const fileLoading = computed(() => Boolean(unref(policy360Resource.loading)));
const notificationLoading = computed(() => Boolean(unref(policy360Resource.loading)));
const policyQuickOptionsMap = computed(() => ({
  customers: asArray(resourceValue(policyQuickCustomerResource, [])).map((row) => ({ value: row.name, label: row.full_name || row.name })),
  policies: asArray(resourceValue(policyQuickPolicyResource, [])).map((row) => ({ value: row.name, label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}` })),
}));
const ownershipAssignmentSuccessHandlers = {
  "ownership-assignments-list": async () => {
    await load();
  },
};
const copiedIdentityKey = ref("");
let copiedIdentityTimer = null;

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
const carrierPolicyDisplayValue = computed(() => policy.value.policy_no || t("notAssigned"));
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
const heroCells = computed(() => [
  { label: t("customer"), value: customer.value?.full_name || policy.value.customer || "-", variant: "default" },
  { label: t("branch"), value: policy.value.branch || "-", variant: "default" },
  { label: t("gross"), value: fmtMoney(policy.value.gross_premium, policy.value.currency), variant: "lg" },
  {
    label: t("remaining"),
    value: remainingLabel.value,
    variant: remainingDays.value != null && remainingDays.value <= 30 ? "warn" : "accent",
    suffix: policy.value.end_date ? `/ ${fmtDate(policy.value.end_date)}` : "",
  },
]);
const lifecycleSteps = computed(() => {
  const items = [
    { label: t("issue"), completed: Boolean(policy.value.issue_date) },
    { label: t("start"), completed: Boolean(policy.value.start_date) },
    { label: t("end"), completed: Boolean(policy.value.end_date) },
    { label: t("status"), completed: Boolean(policy.value.status) },
  ];
  const firstPendingIndex = items.findIndex((item) => !item.completed);
  return items.map((item, index) => ({
    label: item.label,
    state: item.completed ? "done" : index === firstPendingIndex ? "current" : "pending",
  }));
});
const lifecycleFields = computed(() => [
  { label: t("company"), value: policy.value.insurance_company || "-" },
  { label: t("status"), value: policyStatusLabel(policy.value.status) },
  { label: t("currency"), value: policy.value.currency || "TRY" },
  { label: t("fxRate"), value: Number(policy.value.fx_rate || 0).toFixed(4) },
]);
const premiumMetrics = computed(() => [
  { label: t("gross"), value: fmtMoney(policy.value.gross_premium, policy.value.currency) },
  { label: t("net"), value: fmtMoney(policy.value.net_premium, policy.value.currency) },
  { label: t("commission"), value: fmtMoney(policy.value.commission_amount, policy.value.currency) },
  { label: t("gwpTry"), value: fmtMoney(policy.value.gwp_try, "TRY") },
]);
const dateFields = computed(() => [
  { label: t("issue"), value: fmtDate(policy.value.issue_date) },
  { label: t("start"), value: fmtDate(policy.value.start_date) },
  { label: t("end"), value: fmtDate(policy.value.end_date) },
  { label: t("remaining"), value: remainingLabel.value, variant: remainingDays.value != null && remainingDays.value > 0 ? "accent" : "muted" },
]);
const premiumFieldGroups = computed(() =>
  premiumSummaryItems.value.map((item) => ({ label: item.label, value: item.value, variant: item.valueClass === remainingClass.value ? "accent" : "default" }))
);
const coverageFieldGroups = computed(() => coverageSummaryItems.value.map((item) => ({ label: item.label, value: item.value })));
const productProfileFieldGroups = computed(() => productProfileSummaryItems.value.map((item) => ({ label: item.label, value: item.value })));
const productReadinessFieldGroups = computed(() => [
  ...productReadinessSummaryItems.value.map((item) => ({ label: item.label, value: item.value })),
  {
    label: t("missingProductFields"),
    value: productMissingFieldRows.value.length ? productMissingFieldRows.value.map((item) => item.label).join(", ") : t("noMissingProductField"),
    span: 3,
    variant: productMissingFieldRows.value.length ? "accent" : "muted",
  },
]);
const documentFieldGroups = computed(() => documentProfileSummaryItems.value.map((item) => ({ label: item.label, value: item.value })));
const customerInitials = computed(() => {
  const source = String(customer.value?.full_name || customer.value?.name || "").trim();
  if (!source) return "AT";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
});

async function copyIdentity(value, key) {
  const text = String(value || "").trim();
  if (!text) return;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "true");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    copiedIdentityKey.value = key;
    if (copiedIdentityTimer) clearTimeout(copiedIdentityTimer);
    copiedIdentityTimer = window.setTimeout(() => {
      copiedIdentityKey.value = "";
      copiedIdentityTimer = null;
    }, 1500);
  } catch {
    copiedIdentityKey.value = "";
  }
}

onBeforeUnmount(() => {
  if (copiedIdentityTimer) clearTimeout(copiedIdentityTimer);
});
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
const openDeskPolicy = () => props.name && window.location.assign(`/app/at-policy/${encodeURIComponent(props.name)}`);
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
async function deleteOwnershipAssignment(assignment) {
  if (!assignment?.name) return;
  if (!globalThis.confirm?.(t("deleteAssignmentConfirm"))) return;
  await assignmentDeleteResource.submit({
    doctype: "AT Ownership Assignment",
    name: assignment.name,
  });
  await load();
}
const endorsementStatusClass = (s) => (s === "Applied" ? "text-emerald-700" : s === "Cancelled" ? "text-rose-700" : "text-slate-700");

function policyStatusLabel(status) {
  if (activeLocale.value !== "tr") return status || "-";
  if (status === "Active") return "Aktif";
  if (status === "KYT") return "KYT";
  if (status === "IPT" || status === "Cancelled") return "İptal";
  if (status === "Expired") return "Suresi Doldu";
  return status || "-";
}

function paymentStatusLabel(status) {
  if (activeLocale.value !== "tr") return status || "-";
  if (status === "Submitted") return "Gönderildi";
  if (status === "Draft") return "Taslak";
  if (status === "Cancelled") return "İptal";
  if (status === "Paid") return "Odendi";
  return status || "-";
}

function installmentStatusLabel(status) {
  if (activeLocale.value !== "tr") return status || "-";
  if (status === "Scheduled") return "Planlandi";
  if (status === "Overdue") return "Gecikti";
  if (status === "Paid") return "Odendi";
  if (status === "Cancelled") return "İptal";
  return status || "-";
}

function endorsementStatusLabel(status) {
  if (activeLocale.value !== "tr") return status || "-";
  if (status === "Applied") return "Uygulandi";
  if (status === "Pending") return "Beklemede";
  if (status === "Cancelled") return "İptal";
  return status || "-";
}

function notificationStatusLabel(status) {
  if (activeLocale.value !== "tr") return status || "-";
  if (status === "Queued") return "Kuyrukta";
  if (status === "Processing") return "Isleniyor";
  if (status === "Sent") return "Gönderildi";
  if (status === "Failed") return "Başarısız";
  if (status === "Dead") return "Kalıcı Hata";
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

async function updateReminderStatus(reminder, status) {
  if (!reminder?.name) return;
  await reminderUpdateResource.submit({
    doctype: "AT Reminder",
    name: reminder.name,
    data: {
      status,
    },
  });
  await load();
}

async function updateOwnershipAssignmentStatus(assignment, status) {
  if (!assignment?.name) return;
  await reminderUpdateResource.submit({
    doctype: "AT Ownership Assignment",
    name: assignment.name,
    data: {
      status,
    },
  });
  await load();
}

async function markReminderDone(reminder) {
  await updateReminderStatus(reminder, "Done");
}

async function cancelReminder(reminder) {
  await updateReminderStatus(reminder, "Cancelled");
}

async function markAssignmentInProgress(assignment) {
  await updateOwnershipAssignmentStatus(assignment, "In Progress");
}

async function markAssignmentBlocked(assignment) {
  await updateOwnershipAssignmentStatus(assignment, "Blocked");
}

async function markAssignmentDone(assignment) {
  await updateOwnershipAssignmentStatus(assignment, "Done");
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
