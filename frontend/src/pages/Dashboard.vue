<template>
  <section class="page-shell space-y-6">
    <DashboardHeader
      :active-dashboard-tab="activeDashboardTab"
      :dashboard-tabs="dashboardTabs"
      :hero-subtitle="dashboardHeroSubtitle"
      :hero-tag="t('heroTag')"
      :hero-title="dashboardHeroTitle"
      :new-lead-label="t('newLead')"
      :range-label="rangeLabel"
      :range-label-text="t('rangeLabel')"
      :range-options="rangeOptions"
      :refresh-label="t('refresh')"
      :selected-range="selectedRange"
      :show-new-lead-action="showNewLeadAction"
      :visible-range="visibleRange"
      @apply-range="applyRange"
      @new-lead="openLeadDialog"
      @reload="reloadData"
      @set-dashboard-tab="setDashboardTab"
    />

    <div
      v-if="dashboardAccessMessage"
      :class="dashboardAccessMessageKind === 'permission' ? 'qc-error-banner' : 'qc-warning-banner'"
      role="alert"
      aria-live="polite"
    >
      <p :class="dashboardAccessMessageKind === 'permission' ? 'qc-error-banner__text' : 'qc-warning-banner__text'">
        {{ dashboardAccessMessage }}
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardStatCard
        v-for="card in visibleQuickStatCards"
        :key="card.key"
        :title="card.title"
        :value="card.value"
        :trend-text="card.trendText"
        :trend-class="card.trendClass"
        :trend-hint="card.trendHint"
        :icon="card.icon"
      />
    </div>

    <DashboardAnalyticsRow
      :commission-trend="commissionTrend"
      :dashboard-loading="dashboardLoading"
      :format-currency="formatCurrency"
      :format-month-key="formatMonthKey"
      :format-number="formatNumber"
      :lead-status-summary="leadStatusSummary"
      :sales-offer-status-summary="salesOfferStatusSummary"
      :show-analytics-row="showAnalyticsRow"
      :t="t"
      :trend-ratio="trendRatio"
    />

    <DashboardDailyTab
      :activity-facts="activityFacts"
      :dashboard-loading="dashboardLoading"
      :display-recent-policies="displayRecentPolicies"
      :display-renewal-alert-items="displayRenewalAlertItems"
      :follow-up-description="followUpDescription"
      :follow-up-facts="followUpFacts"
      :follow-up-loading="followUpLoading"
      :follow-up-summary="followUpSummary"
      :follow-up-title="followUpTitle"
      :format-currency-by="formatCurrencyBy"
      :format-days-to-due="formatDaysToDue"
      :format-number="formatNumber"
      :is-daily-tab="isDailyTab"
      :my-activities-loading="myActivitiesLoading"
      :my-task-summary="myTaskSummary"
      :my-tasks-loading="myTasksLoading"
      :open-activity-item="openActivityItem"
      :open-claim-item="openClaimItem"
      :open-claims-preview-rows="openClaimsPreviewRows"
      :open-follow-up-item="openFollowUpItem"
      :open-page="openPage"
      :open-policy-item="openPolicyItem"
      :open-preview-list="openPreviewList"
      :open-renewal-task-item="openRenewalTaskItem"
      :open-task-item="openTaskItem"
      :paged-preview-items="pagedPreviewItems"
      :prioritized-follow-up-items="prioritizedFollowUpItems"
      :priority-task-items="priorityTaskItems"
      :preview-page-count="previewPageCount"
      :preview-resolved-page="previewResolvedPage"
      :recent-activity-items="recentActivityItems"
      :recent-policy-facts="recentPolicyFacts"
      :renewal-alert-facts="renewalAlertFacts"
      :set-preview-page="setPreviewPage"
      :should-show-view-all="shouldShowViewAll"
      :claim-facts="claimFacts"
      :task-facts="taskFacts"
      :t="t"
      :visible-quick-actions="visibleQuickActions"
    />

    <DashboardCollectionsTab
      :collection-payment-direction-summary="collectionPaymentDirectionSummary"
      :collection-payment-status-summary="collectionPaymentStatusSummary"
      :collection-risk-facts="collectionRiskFacts"
      :collection-risk-rows="collectionRiskRows"
      :dashboard-loading="dashboardLoading"
      :dashboard-payment-facts="dashboardPaymentFacts"
      :dashboard-reconciliation-facts="dashboardReconciliationFacts"
      :due-today-collection-payments="dueTodayCollectionPayments"
      :format-currency="formatCurrency"
      :format-number="formatNumber"
      :is-collections-tab="isCollectionsTab"
      :open-collection-risk-item="openCollectionRiskItem"
      :open-payment-item="openPaymentItem"
      :open-preview-list="openPreviewList"
      :open-reconciliation-item="openReconciliationItem"
      :overdue-collection-payments="overdueCollectionPayments"
      :paged-preview-items="pagedPreviewItems"
      :preview-page-count="previewPageCount"
      :preview-resolved-page="previewResolvedPage"
      :reconciliation-preview-metrics="reconciliationPreviewMetrics"
      :reconciliation-preview-open-difference="reconciliationPreviewOpenDifference"
      :reconciliation-preview-rows="reconciliationPreviewRows"
      :set-preview-page="setPreviewPage"
      :should-show-view-all="shouldShowViewAll"
      :t="t"
    />

    <DashboardRenewalsTab
      :dashboard-loading="dashboardLoading"
      :display-renewal-tasks="displayRenewalTasks"
      :format-currency-by="formatCurrencyBy"
      :format-number="formatNumber"
      :is-renewals-tab="isRenewalsTab"
      :open-policy-item="openPolicyItem"
      :open-preview-list="openPreviewList"
      :open-renewal-task-item="openRenewalTaskItem"
      :paged-preview-items="pagedPreviewItems"
      :preview-page-count="previewPageCount"
      :preview-resolved-page="previewResolvedPage"
      :recent-policy-facts="recentPolicyFacts"
      :renewal-linked-policies="renewalLinkedPolicies"
      :renewal-outcome-summary="renewalOutcomeSummary"
      :renewal-retention-rate="renewalRetentionRate"
      :renewal-status-summary="renewalStatusSummary"
      :renewal-task-facts-detailed="renewalTaskFactsDetailed"
      :offer-waiting-renewals="offerWaitingRenewals"
      :set-preview-page="setPreviewPage"
      :should-show-view-all="shouldShowViewAll"
      :t="t"
    />

    <DashboardSalesTab
      :converted-sales-offers="convertedSalesOffers"
      :dashboard-loading="dashboardLoading"
      :display-recent-leads="displayRecentLeads"
      :display-recent-policies="displayRecentPolicies"
      :format-currency-by="formatCurrencyBy"
      :format-number="formatNumber"
      :is-sales-tab="isSalesTab"
      :my-reminders-loading="myRemindersLoading"
      :my-tasks-loading="myTasksLoading"
      :open-converted-policy-item="openConvertedPolicyItem"
      :open-lead-item="openLeadItem"
      :open-offer-item="openOfferItem"
      :open-policy-item="openPolicyItem"
      :open-preview-list="openPreviewList"
      :open-sales-action-item="openSalesActionItem"
      :open-sales-action-list="openSalesActionList"
      :paged-preview-items="pagedPreviewItems"
      :preview-page-count="previewPageCount"
      :preview-resolved-page="previewResolvedPage"
      :recent-lead-facts="recentLeadFacts"
      :recent-offer-facts="recentOfferFacts"
      :recent-policy-facts="recentPolicyFacts"
      :sales-action-description="salesActionDescription"
      :sales-action-facts="salesActionFacts"
      :sales-action-title="salesActionTitle"
      :sales-candidate-actions="salesCandidateActions"
      :sales-pipeline-offers="salesPipelineOffers"
      :set-preview-page="setPreviewPage"
      :should-show-view-all="shouldShowViewAll"
      :t="t"
    />



    <Dialog
      v-model="showLeadDialog"
      :options="{ title: quickLeadDialogTitle, size: 'xl' }"
    >
      <template #body-content>
        <div class="grid gap-3 p-4">
          <div v-if="leadDialogError" class="qc-error-banner" role="alert" aria-live="polite">
            <p class="qc-error-banner__text">{{ leadDialogError }}</p>
          </div>
          <QuickCustomerPicker
            :model="newLead"
            :field-errors="leadDialogFieldErrors"
            :disabled="isSubmitting"
            :locale="activeLocale"
            :office-branch="branchStore.requestBranch || ''"
            :customer-label="{ tr: 'Müşteri / Ad Soyad', en: 'Customer / Full Name' }"
          />
          <input
            v-model="newLead.estimated_gross_premium"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            :placeholder="t('estPremiumInput')"
            min="0"
            step="0.01"
            type="number"
          />
          <textarea
            v-model="newLead.notes"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            :placeholder="t('note')"
            rows="3"
          />
        </div>
      </template>
      <template #actions>
        <ActionButton variant="secondary" size="sm" @click="resetLeadForm(); showLeadDialog = false">
          {{ t("cancel") }}
        </ActionButton>
        <ActionButton
          variant="primary"
          size="sm"
          class="!bg-brand-700 hover:!bg-brand-600"
          :disabled="isSubmitting"
          @click="createLead"
        >
          {{ t("save") }}
        </ActionButton>
      </template>
    </Dialog>
  </section>
</template>

<script setup>
import { computed, ref, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Dialog, createResource } from "frappe-ui";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useDashboardStore } from "../stores/dashboard";
import ActionButton from "../components/app-shell/ActionButton.vue";
import ActionToolbarGroup from "../components/app-shell/ActionToolbarGroup.vue";
import FilterChipButton from "../components/app-shell/FilterChipButton.vue";
import ProgressMetricRow from "../components/app-shell/ProgressMetricRow.vue";
import TrendMetricRow from "../components/app-shell/TrendMetricRow.vue";
import EntityPreviewCard from "../components/app-shell/EntityPreviewCard.vue";
import MetaListCard from "../components/app-shell/MetaListCard.vue";
import MiniFactList from "../components/app-shell/MiniFactList.vue";
import DashboardHeader from "../components/dashboard/DashboardHeader.vue";
import DashboardAnalyticsRow from "../components/dashboard/DashboardAnalyticsRow.vue";
import DashboardDailyTab from "../components/dashboard/DashboardDailyTab.vue";
import DashboardCollectionsTab from "../components/dashboard/DashboardCollectionsTab.vue";
import DashboardRenewalsTab from "../components/dashboard/DashboardRenewalsTab.vue";
import DashboardSalesTab from "../components/dashboard/DashboardSalesTab.vue";
import DashboardQuickActions from "../components/dashboard/DashboardQuickActions.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import PreviewPager from "../components/app-shell/PreviewPager.vue";
import DashboardStatCard from "../components/DashboardStatCard.vue";
import QuickCustomerPicker from "../components/app-shell/QuickCustomerPicker.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import { getQuickCreateConfig, getLocalizedText } from "../config/quickCreateRegistry";
import { useDashboardPresentation } from "../composables/useDashboardPresentation";
import { useDashboardFormatters } from "../composables/useDashboardFormatters";
import { useDashboardFacts } from "../composables/useDashboardFacts";
import { useDashboardSales } from "../composables/useDashboardSales";
import { useDashboardSummary } from "../composables/useDashboardSummary";
import { useDashboardOrchestration } from "../composables/useDashboardOrchestration";
import { useDashboardItemActions } from "../composables/useDashboardItemActions";
import { useDashboardLeadDialog } from "../composables/useDashboardLeadDialog";
import { useDashboardLeadSubmission } from "../composables/useDashboardLeadSubmission";
import { useDashboardLeadState } from "../composables/useDashboardLeadState";
import { useDashboardPreviewData } from "../composables/useDashboardPreviewData";
import { useDashboardPreviewPager } from "../composables/useDashboardPreviewPager";
import { useDashboardStatus } from "../composables/useDashboardStatus";
import { useDashboardTabHelpers } from "../composables/useDashboardTabHelpers";
import { useDashboardVisibleRange } from "../composables/useDashboardVisibleRange";
import {
  asArray,
  buildInitialClaimListParams,
  buildInitialKpiParams,
  buildInitialTabPayloadParams,
  isPermissionDeniedError,
  normalizeResourcePayload,
  withDashboardOfficeBranchFilter,
} from "../utils/dashboardHelpers";
import { isValidTckn, normalizeCustomerType, normalizeIdentityNumber } from "../utils/customerIdentity";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const branchStore = useBranchStore();
const dashboardStore = useDashboardStore();
const activeLocale = computed(() => unref(authStore.locale) || "en");
const quickLeadConfig = getQuickCreateConfig("lead");
const quickLeadDialogTitle = computed(() => getLocalizedText(quickLeadConfig?.title, activeLocale.value));
const copy = {
  tr: {
    heroTag: "Sigorta Kontrol Merkezi",
    heroTitle: "Sigorta Operasyon Panosu",
    heroSubtitle: "Frappe CRM yapısına benzer panelde fırsat, poliçe, hasar ve ödeme akışlarını canlı takip edin.",
    heroTitleDaily: "Operasyon Panosu",
    heroSubtitleDaily: "Operasyon öncelikleri, bekleyen işler ve kritik kuyruklar için canlı operasyon görünümü.",
    heroTitleSales: "Satış Panosu",
    heroSubtitleSales: "Fırsat, teklif ve poliçe üretimini satış odağında izleyin.",
    heroTitleCollections: "Tahsilat Panosu",
    heroSubtitleCollections: "Tahsilat, ödeme ve mutabakat akışlarını tek ekranda yönetin.",
    heroTitleRenewals: "Yenileme Panosu",
    heroSubtitleRenewals: "Yaklaşan bitişler ve yenileme görevlerini önceliklendirin.",
    tabDaily: "Operasyon",
    tabSales: "Satış",
    tabCollections: "Tahsilat",
    tabRenewals: "Yenileme",
    rangeLabel: "Tarih aralığı",
    refresh: "Yenile",
    newLead: "Yeni Fırsat Ekle",
    leadPipeline: "Fırsat Süreci",
    offerStatusOverviewTitle: "Teklif Durum Dağılımı",
    liveData: "Canlı veri",
    loading: "Yükleniyor...",
    commissionTrend: "Aylık Komisyon Trendi",
    lastMonths: "Son aylar",
    noTrendData: "Trend verisi bulunamadı.",
    noOfferStatus: "Teklif durum verisi bulunamadı.",
    recentLeads: "Güncel Fırsat Kartları",
    salesCandidateActionTitle: "Müşteri Aday Aksiyonu",
    salesCandidateActionHint: "Fırsat ve teklif kaynaklı açık görevleri ile hatırlatıcıları tek listede izleyin.",
    noSalesCandidateAction: "Fırsat veya teklif kaynaklı açık aksiyon bulunamadı.",
    salesActionTask: "Görev",
    salesActionReminder: "Hatırlatıcı",
    salesActionLead: "Fırsat",
    salesActionOffer: "Teklif",
    recentActivitiesTitle: "Son Aktiviteler",
    recentActivitiesEmpty: "Henüz aktivite kaydı yok.",
    openClaimsTitle: "Açık Hasarlar",
    noOpenClaims: "Açık hasar kaydı bulunamadı.",
    monthlyPremiumTrendTitle: "Aylık Prim Trendi",
    branchDistributionTitle: "Branş Dağılımı",
    policySuffix: " poliçe",
    todayTasksTitle: "Bugün Yapılacaklar",
    todayTasksEmpty: "Bugün için görev yok.",
    upcomingRenewalsTitle: "Yaklaşan Yenilemeler",
    upcomingRenewalsEmpty: "30 gün içinde yenileme yok.",
    cardView: "Kart Görünümü",
    noLead: "Fırsat kaydı bulunamadı.",
    estPremium: "Tahmini Brüt Prim",
    noNote: "Not yok.",
    renewalQueue: "Yenileme Takip Listesi",
    noRenewal: "Bekleyen yenileme görevi yok.",
    actionOfferQueueTitle: "Aksiyon Bekleyen Teklifler",
    actionOfferQueueHint: "Gönderildi / kabul edildi ve poliçeye dönüşmesi beklenen teklifler",
    noActionOfferQueue: "Aksiyon bekleyen teklif bulunmuyor.",
    dueDate: "Son tarih",
    renewalDate: "Yenileme tarihi",
    status: "Durum",
    renewalAlertTitle: "Yakın Yenileme Uyarıları",
    renewalAlertHint: "Önümüzdeki 30 gün içinde sona erecek poliçeleri izleyin.",
    noRenewalAlert: "Bugün kritik yenileme bulunmuyor.",
    trendAgainstPrevious: "önceki döneme göre",
    trendAgainstPreviousPeriod: "önceki aynı süreye göre",
    trendAgainstPreviousMonth: "geçen aya göre",
    trendAgainstPreviousYear: "geçen yıla göre",
    trendAgainstCustomPeriod: "karşılaştırma dönemine göre",
    quickActions: "Hızlı İşlemler",
    quickPolicyAction: "Yeni Poliçe",
    quickOfferAction: "Yeni Teklif",
    quickCustomerAction: "Yeni Müşteri",
    quickClaimAction: "Hasar Bildirimi",
    firstName: "Ad",
    lastName: "Soyad",
    phone: "Telefon",
    customer: "Müşteri",
    customerType: "Müşteri Tipi",
    customerTypeIndividual: "Bireysel",
    customerTypeCorporate: "Kurumsal",
    tcknLabel: "TC Kimlik No",
    taxNumberLabel: "Vergi No",
    email: "E-posta",
    estPremiumInput: "Tahmini brut prim",
    note: "Not",
    cancel: "İptal",
    save: "Kaydet",
    draft: "Taslak",
    open: "Açık",
    replied: "Görüşüldü",
    closed: "Kapandı",
    kpiGwp: "Toplam GWP (TRY)",
    kpiCommission: "Toplam Komisyon",
    kpiPolicy: "Toplam Poliçe",
    kpiRenewal: "Bekleyen Yenileme",
    kpiRenewalRetention: "Yenileme Tutma Oranı",
    kpiRenewalOfferWaiting: "Teklif Bekleyen Yenileme",
    kpiCollect: "Tahsilat (TRY)",
    kpiPayout: "Ödeme (TRY)",
    kpiClaim: "Açık Hasar",
    kpiReadyOffers: "Hazır Teklif",
    kpiReconciliationOpen: "Açık Mutabakat",
    kpiCollectionDueTodayCount: "Bugün Vadesi Gelen Tahsilat",
    kpiCollectionDueTodayAmount: "Bugün Tahsilat Tutarı",
    kpiCollectionOverdueCount: "Gecikmiş Tahsilat",
    kpiCollectionOverdueAmount: "Gecikmiş Tutar",
    kpiAvgRate: "Ort. Komisyon Oranı",
    kpiFollowUpOverdue: "Geciken Takip",
    kpiFollowUpToday: "Bugün Takip",
    kpiTaskOverdue: "Geciken Görev",
    kpiTaskToday: "Bugün Görev",
    kpiAcceptedOffers: "Kabul Edilen Teklif",
    kpiConvertedOffers: "Poliçeye Dönüşen Teklif",
    renewalRetentionHint: "Yenilenen / kaybedilen kapanışlar",
    monthlySnapshot: "Seçili aralik",
    ratioSnapshot: "Oransal performans",
    quickPolicy: "Poliçe Yönetimi",
    quickPolicyDesc: "Poliçeleri listele ve versiyonlari izle",
    quickOffer: "Teklif Panosu",
    quickOfferDesc: "Teklifleri poliçe sürecine hazırla",
    quickClaim: "Hasar Panosu",
    quickClaimDesc: "Hasar dosyalarını ve ödemeleri yönet",
    quickPayment: "Ödeme Operasyonları",
    quickPaymentDesc: "Tahsilat ve payout hareketlerini takip et",
    quickRenewal: "Yenileme Panosu",
    quickRenewalDesc: "Bitişe 30 gün kalan poliçeleri denetle",
    quickCommunication: "İletişim Merkezi",
    quickCommunicationDesc: "Bildirim kuyruğunu ve gönderimleri yönet",
    quickReconciliation: "Mutabakat",
    quickReconciliationDesc: "Muhasebe farklarını eşleştir ve kapat",
    recentPaymentsPreview: "Son Tahsilat / Ödeme Hareketleri",
    noPaymentPreview: "Tahsilat veya ödeme kaydı bulunamadı.",
    todayCollectionsTitle: "Bugün Vadesi Gelen Tahsilatlar",
    noTodayCollections: "Bugün vadesi gelen tahsilat kaydı bulunamadı.",
    overdueCollectionsTitle: "Gecikmiş Tahsilatlar",
    noOverdueCollections: "Gecikmiş tahsilat kaydı bulunamadı.",
    collectionsPerformanceTitle: "Tahsilat Performansı",
    collectionsPerformanceHint: "Ödeme durumları ve tahsilat yönlerine göre dağılımı canlı izleyin.",
    noCollectionPerformance: "Tahsilat performans özeti için veri bulunamadı.",
    paymentStatusBreakdownTitle: "Duruma Göre Ödemeler",
    paymentDirectionBreakdownTitle: "Yöne Göre Ödemeler",
    paymentPaidAmount: "Ödenen Tutar",
    collectionsRiskTitle: "Riskli Müşteriler / Poliçeler",
    collectionsRiskHint: "Gecikmiş ve vadesi yaklaşan ödemelerden en riskli kayıtları önceliklendirin.",
    noCollectionsRisk: "Riskli müşteri veya poliçe kaydı bulunamadı.",
    riskScore: "Risk Skoru",
    overdueCount: "Gecikmiş",
    dueTodayCount: "Bugün Vade",
    riskOverdueAmount: "Gecikmiş Tutar",
    riskLevelHigh: "Yüksek Risk",
    riskLevelMedium: "Orta Risk",
    riskLevelLow: "Düşük Risk",
    reconciliationPreview: "Açık Mutabakat Farkları",
    noReconciliationPreview: "Açık mutabakat kaydı bulunamadı.",
    mismatchRows: "Açık Kayıt",
    openDifference: "Toplam Fark",
    paymentDate: "Tarih",
    paymentDirection: "Yön",
    policyLabel: "Poliçe",
    reconciliationType: "Uyumsuzluk",
    difference: "Fark",
    offerWaitingRenewalsTitle: "Teklif Bekleyen Yenilemeler",
    noOfferWaitingRenewals: "Teklif bekleyen yenileme kaydı bulunamadı.",
    renewalStatusOverviewTitle: "Yenileme Durum Özeti",
    noRenewalStatus: "Durum özeti oluşturulacak yenileme kaydı yok.",
    renewalOutcomeTitle: "Dönüşüm / Ödeme Sonucu",
    renewalOutcomeHint: "Yenilenen, kaybedilen ve iptal edilen sonuçları toplu izleyin.",
    noRenewalOutcome: "Sonuç özeti için kapanmış yenileme kaydı bulunamadı.",
    outcomeRenewed: "Yenilenen",
    outcomeLost: "Kaybedilen",
    outcomeCancelled: "İptal",
    linkedPoliciesTitle: "Bağlı Poliçeler",
    noLinkedPolicies: "Yenilemeyle bağlı poliçe kaydı bulunamadı.",
    dashboardPermissionDenied: "Bu pano verisini görmek için yetkiniz yok.",
    dashboardScopeNoAssignments: "Size atanmış müşteri bulunmadığı için pano verisi gösterilemiyor.",
    dashboardScopeRestrictedEmpty: "Mevcut veri kapsaminda pano verisi bulunamadı.",
    statusInProgress: "Devam Ediyor",
    statusCompleted: "Tamamlandı",
    statusCancelled: "İptal",
    statusPaid: "Ödendi",
    statusSent: "Gönderildi",
    statusAccepted: "Kabul Edildi",
    statusRejected: "Reddedildi",
    paymentDirectionInbound: "Tahsilat",
    paymentDirectionOutbound: "Ödeme",
    validationTaxNumberLength: "Vergi numarası 10 haneli olmalıdır.",
    validationTcLength: "TC kimlik numarası 11 haneli olmalıdır.",
    validationTcInvalid: "Geçerli bir TC kimlik numarası girin.",
    policyMix: "Poliçe Durum Dağılımı",
    noPolicyMix: "Poliçe durum verisi bulunamadı.",
    statusActive: "Aktif",
    statusKyt: "KYT",
    statusIpt: "IPT",
    topCompanies: "Öne Çıkan Sigorta Şirketleri",
    noTopCompanies: "Şirket bazlı üretim verisi bulunamadı.",
    followUpSlaHint: "Geciken, bugün yapılması gereken ve yaklaşan takip kayıtlarını tek listede izleyin.",
    followUpOverdue: "Geciken",
    followUpToday: "Bugün",
    followUpSoon: "7 Gün",
    noFollowUpItems: "Takip gerektiren kayıt yok.",
    followUpTypeClaim: "Hasar",
    followUpTypeRenewal: "Yenileme",
    followUpTypeAssignment: "Atama",
    followUpTypeCallNote: "Arama Notu",
    followUpDeltaOverdue: "Gecikme",
    followUpDeltaToday: "Bugün",
    followUpDeltaDays: "gün",
    followUpDate: "Takip",
    followUpAssignee: "Sorumlu",
    openItem: "Aç",
    viewAllItems: "Tümünü Gör",
    followUpClaimsAction: "Hasar Panosu",
    followUpRenewalsAction: "Yenileme Panosu",
    followUpCommunicationAction: "İletişim Merkezi",
    myTasksTitle: "Benim Görevlerim",
    myTasksHint: "Atanmış görevleri bugün ve gelecek hafta için izleyin.",
    noMyTasks: "Atanmış görev yok.",
    myRemindersTitle: "Benim Hatırlatıcılarim",
    myRemindersHint: "Zaman bazlı takip hatırlatıcılarını izleyin.",
    noMyReminders: "Açık hatırlatıcı bulunmuyor.",
    myActivitiesTitle: "Benim Aktivitelerim",
    myActivitiesHint: "Kaydedilen son aktiviteleri takip edin.",
    noMyActivities: "Kaydedilmis aktivite yok.",
    activityLogged: "Kayıtli",
    activityShared: "Paylaşıldı",
    activityArchived: "Arşiv",
    activityType: "Aktivite Tipi",
    activityAt: "Aktivite Tarihi",
    openActivitiesAction: "Aktivite Listesi",
    taskOverdue: "Geciken",
    taskToday: "Bugün",
    taskSoon: "7 Gün",
    reminderOverdue: "Geciken",
    reminderToday: "Bugün",
    reminderSoon: "7 Gün",
    taskType: "Tip",
    taskAssignee: "Atanan",
    startTaskAction: "Takibe Al",
    blockTaskAction: "Bloke Et",
    completeTaskAction: "Tamamla",
    cancelTaskAction: "İptal",
    openTasksAction: "Görev Listesi",
    openRemindersAction: "Hatırlatıcı Listesi",
    policyCount: "Poliçe Adedi",
    grossProduction: "Brüt Üretim",
    recentPolicies: "Son Poliçeler",
    kpiRenewalOverdue: "Geciken Yenilemeler",
    kpiRenewalDue7: "7 Gün İçinde Yenilenecekler",
    kpiRenewalDue30: "30 Gün İçinde Yenilenecekler",
    noPolicy: "Poliçe kaydı bulunamadı.",
    issueDate: "Tanzim",
    offerPipeline: "Teklif Süreci",
    salesPipelineHint: "Taslak, gönderilmiş ve kabul aşamasındaki teklifleri satış kuyruğu olarak izleyin.",
    readyOffers: "Hazır Teklifler",
    noOffer: "Teklif kaydı bulunamadı.",
    convertedOffersTitle: "Dönüşen Teklifler",
    noConvertedOffers: "Poliçeye dönüşen teklif kaydı bulunamadı.",
    openPolicyAction: "Poliçeyi Aç",
    validUntil: "Geçerlilik",
    converted: "Dönüştü",
    leadPipeline: "Fırsat Süreci",
    kpiGwp: "Toplam Brüt Prim",
    kpiCollect: "Toplam Tahsilat",
    kpiPayout: "Toplam Ödeme",
    todaySnapshot: "Güncel görünüm",
    followUpSlaTitle: "Öncelikli Takipler",
  },
  en: {
    heroTag: "Insurance Control Center",
    heroTitle: "Insurance Operations Dashboard",
    heroSubtitle: "Track lead, policy, claim and payment flows in a Frappe CRM style control panel.",
    heroTitleDaily: "Operations Dashboard",
    heroSubtitleDaily: "An operations view focused on daily priorities and action queues.",
    heroTitleSales: "Sales Dashboard",
    heroSubtitleSales: "Monitor lead, offer and policy production with a sales focus.",
    heroTitleCollections: "Collections Dashboard",
    heroSubtitleCollections: "Manage collections, payouts and reconciliation flows in one place.",
    heroTitleRenewals: "Renewals Dashboard",
    heroSubtitleRenewals: "Prioritize upcoming expiries and renewal tasks.",
    tabDaily: "Operations",
    tabSales: "Sales",
    tabCollections: "Collections",
    tabRenewals: "Renewals",
    rangeLabel: "Date range",
    refresh: "Refresh",
    newLead: "Add New Lead",
    leadPipeline: "Lead Pipeline",
    offerStatusOverviewTitle: "Offer Status Distribution",
    liveData: "Live data",
    loading: "Loading...",
    commissionTrend: "Monthly Commission Trend",
    lastMonths: "Last months",
    noTrendData: "No trend data found.",
    noOfferStatus: "No offer status data found.",
    recentLeads: "Recent Lead Cards",
    salesCandidateActionTitle: "Prospect Action Queue",
    salesCandidateActionHint: "Review open tasks and reminders tied to leads and offers in one list.",
    noSalesCandidateAction: "No open lead or offer actions were found.",
    salesActionTask: "Task",
    salesActionReminder: "Reminder",
    salesActionLead: "Lead",
    salesActionOffer: "Offer",
    recentActivitiesTitle: "Recent Activities",
    recentActivitiesEmpty: "No activity records yet.",
    openClaimsTitle: "Open Claims",
    noOpenClaims: "No open claim records found.",
    monthlyPremiumTrendTitle: "Monthly Premium Trend",
    branchDistributionTitle: "Branch Distribution",
    policySuffix: " policies",
    todayTasksTitle: "Today's Tasks",
    todayTasksEmpty: "No tasks for today.",
    upcomingRenewalsTitle: "Upcoming Renewals",
    upcomingRenewalsEmpty: "No renewals due within 30 days.",
    cardView: "Card View",
    noLead: "No lead record found.",
    estPremium: "Estimated Gross Premium",
    noNote: "No notes.",
    renewalQueue: "Renewal Follow-up List",
    noRenewal: "No pending renewal tasks.",
    actionOfferQueueTitle: "Offers Requiring Action",
    actionOfferQueueHint: "Sent / accepted offers waiting for policy conversion",
    noActionOfferQueue: "No offers waiting for action.",
    dueDate: "Due date",
    renewalDate: "Renewal date",
    status: "Status",
    renewalAlertTitle: "Upcoming Renewal Alerts",
    renewalAlertHint: "Review policies that will expire within the next 30 days.",
    noRenewalAlert: "No critical renewal alert for today.",
    trendAgainstPrevious: "vs previous period",
    trendAgainstPreviousPeriod: "vs previous period",
    trendAgainstPreviousMonth: "vs previous month",
    trendAgainstPreviousYear: "vs previous year",
    trendAgainstCustomPeriod: "vs comparison period",
    quickActions: "Quick Actions",
    quickPolicyAction: "New Policy",
    quickOfferAction: "New Offer",
    quickCustomerAction: "New Customer",
    quickClaimAction: "Report Claim",
    firstName: "First Name",
    lastName: "Last Name",
    phone: "Phone",
    customer: "Customer",
    customerType: "Customer Type",
    customerTypeIndividual: "Individual",
    customerTypeCorporate: "Corporate",
    tcknLabel: "T.R. Identity Number",
    taxNumberLabel: "Tax Number",
    email: "Email",
    estPremiumInput: "Estimated gross premium",
    note: "Notes",
    cancel: "Cancel",
    save: "Save",
    draft: "Draft",
    open: "Open",
    replied: "Replied",
    closed: "Closed",
    kpiGwp: "Total GWP (TRY)",
    kpiCommission: "Total Commission",
    kpiPolicy: "Total Policies",
    kpiRenewal: "Pending Renewals",
    kpiRenewalRetention: "Renewal Retention Rate",
    kpiRenewalOfferWaiting: "Renewals Waiting For Offer",
    kpiCollect: "Collections (TRY)",
    kpiPayout: "Payouts (TRY)",
    kpiClaim: "Open Claims",
    kpiReadyOffers: "Ready Offers",
    kpiReconciliationOpen: "Open Reconciliation",
    kpiCollectionDueTodayCount: "Due Today Collections",
    kpiCollectionDueTodayAmount: "Due Today Amount",
    kpiCollectionOverdueCount: "Overdue Collections",
    kpiCollectionOverdueAmount: "Overdue Amount",
    kpiAvgRate: "Avg Commission Rate",
    kpiFollowUpOverdue: "Overdue Follow-ups",
    kpiFollowUpToday: "Follow-ups Due Today",
    kpiTaskOverdue: "Overdue Tasks",
    kpiTaskToday: "Tasks Due Today",
    kpiAcceptedOffers: "Accepted Offers",
    kpiConvertedOffers: "Converted Offers",
    todaySnapshot: "Current snapshot",
    renewalRetentionHint: "Renewed / lost closed outcomes",
    monthlySnapshot: "Selected range",
    ratioSnapshot: "Rate performance",
    quickPolicy: "Policy Management",
    quickPolicyDesc: "List policies and monitor versions",
    quickOffer: "Offer Board",
    quickOfferDesc: "Prepare offers for policy conversion",
    quickClaim: "Claims Board",
    quickClaimDesc: "Manage claim files and payouts",
    quickPayment: "Payment Operations",
    quickPaymentDesc: "Track collections and payouts",
    quickRenewal: "Renewal Board",
    quickRenewalDesc: "Review policies ending in 30 days",
    quickCommunication: "Communication Center",
    quickCommunicationDesc: "Manage notification queue and deliveries",
    quickReconciliation: "Reconciliation",
    quickReconciliationDesc: "Match and close accounting differences",
    recentPaymentsPreview: "Recent Collection / Payout Activity",
    noPaymentPreview: "No collection or payout records found.",
    todayCollectionsTitle: "Collections Due Today",
    noTodayCollections: "No collections are due today.",
    overdueCollectionsTitle: "Overdue Collections",
    noOverdueCollections: "No overdue collections found.",
    collectionsPerformanceTitle: "Collection Performance",
    collectionsPerformanceHint: "Track the live breakdown by payment status and direction.",
    noCollectionPerformance: "No data found for the collection performance summary.",
    paymentStatusBreakdownTitle: "Payments By Status",
    paymentDirectionBreakdownTitle: "Payments By Direction",
    paymentPaidAmount: "Paid Amount",
    collectionsRiskTitle: "Risky Customers / Policies",
    collectionsRiskHint: "Prioritize the riskiest records from overdue and due-today payments.",
    noCollectionsRisk: "No risky customer or policy records were found.",
    riskScore: "Risk Score",
    overdueCount: "Overdue",
    dueTodayCount: "Due Today",
    riskOverdueAmount: "Overdue Amount",
    riskLevelHigh: "High Risk",
    riskLevelMedium: "Medium Risk",
    riskLevelLow: "Low Risk",
    reconciliationPreview: "Open Reconciliation Differences",
    noReconciliationPreview: "No open reconciliation items found.",
    mismatchRows: "Open Rows",
    openDifference: "Open Difference",
    paymentDate: "Date",
    paymentDirection: "Direction",
    policyLabel: "Policy",
    reconciliationType: "Mismatch",
    difference: "Difference",
    offerWaitingRenewalsTitle: "Renewals Waiting For Offer",
    noOfferWaitingRenewals: "No renewals are waiting for an offer.",
    renewalStatusOverviewTitle: "Renewal Status Summary",
    noRenewalStatus: "No renewal rows available for a status summary.",
    renewalOutcomeTitle: "Conversion / Payment Outcome",
    renewalOutcomeHint: "Track renewed, lost, and cancelled outcomes in one summary.",
    noRenewalOutcome: "No closed renewal outcomes are available for summary.",
    outcomeRenewed: "Renewed",
    outcomeLost: "Lost",
    outcomeCancelled: "Cancelled",
    linkedPoliciesTitle: "Linked Policies",
    noLinkedPolicies: "No policies linked to renewals were found.",
    dashboardPermissionDenied: "You do not have permission to access dashboard data.",
    dashboardScopeNoAssignments: "No customers are assigned to you, so dashboard data is not available.",
    dashboardScopeRestrictedEmpty: "No dashboard data is available for your current scope.",
    statusInProgress: "In Progress",
    statusCompleted: "Done",
    statusCancelled: "Cancelled",
    statusPaid: "Paid",
    statusSent: "Sent",
    statusAccepted: "Accepted",
    statusRejected: "Rejected",
    paymentDirectionInbound: "Inbound",
    paymentDirectionOutbound: "Outbound",
    validationTaxNumberLength: "Tax number must be 10 digits.",
    validationTcLength: "T.R. identity number must be 11 digits.",
    validationTcInvalid: "Enter a valid T.R. identity number.",
    policyMix: "Policy Status Mix",
    noPolicyMix: "No policy status data found.",
    statusActive: "Active",
    statusKyt: "KYT",
    statusIpt: "IPT",
    topCompanies: "Top Insurance Companies",
    noTopCompanies: "No company production data found.",
    followUpSlaHint: "Review overdue, due today, and upcoming follow-up records in one list.",
    followUpOverdue: "Overdue",
    followUpToday: "Today",
    followUpSoon: "7 Days",
    noFollowUpItems: "No items requiring follow-up.",
    followUpTypeClaim: "Claim",
    followUpTypeRenewal: "Renewal",
    followUpTypeAssignment: "Assignment",
    followUpTypeCallNote: "Call Note",
    followUpDeltaOverdue: "Overdue",
    followUpDeltaToday: "Today",
    followUpDeltaDays: "days",
    followUpDate: "Follow-up",
    followUpAssignee: "Assignee",
    openItem: "Open",
    viewAllItems: "View All",
    followUpClaimsAction: "Claims Board",
    followUpRenewalsAction: "Renewals Board",
    followUpCommunicationAction: "Communication Center",
    myTasksTitle: "My Tasks",
    myTasksHint: "Track assigned tasks for today and the coming week.",
    noMyTasks: "No assigned tasks.",
    myRemindersTitle: "My Reminders",
    myRemindersHint: "Track time-based follow-up reminders.",
    noMyReminders: "No open reminders found.",
    myActivitiesTitle: "My Activities",
    myActivitiesHint: "Track recently logged activities.",
    noMyActivities: "No logged activities.",
    activityLogged: "Logged",
    activityShared: "Shared",
    activityArchived: "Archived",
    activityType: "Activity Type",
    activityAt: "Activity Date",
    openActivitiesAction: "Activity List",
    taskOverdue: "Overdue",
    taskToday: "Today",
    taskSoon: "7 Days",
    reminderOverdue: "Overdue",
    reminderToday: "Today",
    reminderSoon: "7 Days",
    taskType: "Type",
    taskAssignee: "Assignee",
    startTaskAction: "Start",
    blockTaskAction: "Block",
    completeTaskAction: "Mark Done",
    cancelTaskAction: "Cancel",
    openTasksAction: "Task List",
    openRemindersAction: "Reminder List",
    policyCount: "Policy Count",
    grossProduction: "Gross Production",
    recentPolicies: "Recent Policies",
    kpiRenewalOverdue: "Overdue Renewals",
    kpiRenewalDue7: "Renewals Due in 7 Days",
    kpiRenewalDue30: "Renewals Due in 30 Days",
    noPolicy: "No policy records found.",
    issueDate: "Issue Date",
    offerPipeline: "Offer Pipeline",
    salesPipelineHint: "Track draft, sent and accepted offers as the active sales queue.",
    readyOffers: "Ready Offers",
    noOffer: "No offer records found.",
    convertedOffersTitle: "Converted Offers",
    noConvertedOffers: "No converted offers found.",
    openPolicyAction: "Open Policy",
    validUntil: "Valid Until",
    converted: "Converted",
    kpiGwp: "Total Gross Premium",
    kpiCollect: "Total Collections",
    kpiPayout: "Total Payouts",
    followUpSlaTitle: "Priority Follow-ups",
  },
};

function t(key) {
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const rangeOptions = [1, 7, 15, 30];
const selectedRange = computed({
  get: () => dashboardStore.state.range || 30,
  set: (value) => dashboardStore.setRange(value),
});
const {
  showLeadDialog,
  isSubmitting,
  leadDialogError,
  leadDialogFieldErrors,
  newLead,
} = useDashboardLeadState();

const kpiResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_dashboard_kpis",
  params: buildInitialKpiParams(branchStore, selectedRange),
  auto: false,
});

const followUpResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_follow_up_sla_payload",
  params: withDashboardOfficeBranchFilter(branchStore, { filters: {} }),
  auto: true,
});

const myTasksResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_my_tasks_payload",
  params: withDashboardOfficeBranchFilter(branchStore, { filters: {} }),
  auto: true,
});
const myActivitiesResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_my_activities_payload",
  params: withDashboardOfficeBranchFilter(branchStore, { filters: {} }),
  auto: true,
});
const myRemindersResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_my_reminders_payload",
  params: withDashboardOfficeBranchFilter(branchStore, { filters: {} }),
  auto: true,
});

const myTaskMutationResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.quick_create.update_quick_aux_record",
  auto: false,
});

const leadListResource = createResource({
  url: "frappe.client.get_list",
  params: {
    doctype: "AT Lead",
    fields: [
      "name",
      "first_name",
      "last_name",
      "email",
      "status",
      "estimated_gross_premium",
      "notes",
    ],
    order_by: "modified desc",
    limit_page_length: 8,
  },
  auto: false,
});

const renewalTaskResource = createResource({
  url: "frappe.client.get_list",
  params: {
    doctype: "AT Renewal Task",
    fields: ["name", "policy", "status", "due_date", "renewal_date"],
    order_by: "due_date asc",
    limit_page_length: 40,
  },
  auto: false,
});

const policyListResource = createResource({
  url: "frappe.client.get_list",
  params: {
    doctype: "AT Policy",
    fields: [
      "name",
      "policy_no",
      "customer",
      "status",
      "currency",
      "issue_date",
      "gross_premium",
      "commission_amount",
      "commission",
    ],
    order_by: "modified desc",
    limit_page_length: 6,
  },
  auto: false,
});

const offerListResource = createResource({
  url: "frappe.client.get_list",
  params: {
    doctype: "AT Offer",
    fields: [
      "name",
      "customer",
      "status",
      "currency",
      "valid_until",
      "gross_premium",
      "converted_policy",
    ],
    order_by: "modified desc",
    limit_page_length: 8,
  },
  auto: false,
});

const claimListResource = createResource({
  url: "frappe.client.get_list",
  params: buildInitialClaimListParams(branchStore),
  auto: true,
});

const reconciliationPreviewResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.accounting.get_reconciliation_workbench",
  params: {
    status: "Open",
    mismatch_type: null,
    limit: 8,
  },
  auto: true,
});

const dashboardTabPayloadResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_dashboard_tab_payload",
  params: buildInitialTabPayloadParams(branchStore, selectedRange, "daily"),
  auto: true,
});

const createLeadResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.quick_create.create_quick_lead",
});

const localeCode = computed(() => (unref(authStore.locale) === "tr" ? "tr-TR" : "en-US"));
const dashboardTabPayload = computed(() => dashboardStore.state.tabPayload || {});
const dashboardTabCards = computed(() => dashboardTabPayload.value.cards || {});
const dashboardTabCompareCards = computed(() => dashboardTabPayload.value.compare_cards || {});
const dashboardTabMetrics = computed(() => dashboardTabPayload.value.metrics || {});
const dashboardTabSeries = computed(() => dashboardTabPayload.value.series || {});
const dashboardTabPreviews = computed(() => dashboardTabPayload.value.previews || {});
const leads = computed(() => asArray(dashboardTabPreviews.value.leads).length ? asArray(dashboardTabPreviews.value.leads) : asArray(leadListResource.data));
const renewalTasks = computed(() =>
  asArray(dashboardTabPreviews.value.renewal_tasks).length
    ? asArray(dashboardTabPreviews.value.renewal_tasks)
    : asArray(renewalTaskResource.data)
);
const activeRenewalTasks = computed(() =>
  renewalTasks.value.filter((task) => ["Open", "In Progress"].includes(String(task?.status || "")))
);
const recentPolicies = computed(() =>
  asArray(dashboardTabPreviews.value.policies).length
    ? asArray(dashboardTabPreviews.value.policies)
    : asArray(policyListResource.data)
);
const recentOffers = computed(() =>
  asArray(dashboardTabPreviews.value.offers).length
    ? asArray(dashboardTabPreviews.value.offers)
    : asArray(offerListResource.data)
);

const {
  acceptedOfferCount,
  commissionTrend,
  convertedOfferCount,
  dashboardAccessReason,
  dashboardAccessScope,
  dashboardCards,
  dashboardComparisonTrendHint,
  dashboardData,
  maxTrendValue,
  policyStatusRows,
  previousDashboardCards,
  topCompanies,
} = useDashboardSummary({
  branchStore,
  dashboardStore,
  dashboardTabCards,
  dashboardTabMetrics,
  dashboardTabSeries,
  t,
});

const {
  activeDashboardTab,
  dashboardAccessMessage,
  dashboardAccessMessageKind,
  dashboardLoading,
  dashboardLoadingRaw,
  dashboardPermissionError,
  dashboardScopeMessage,
  followUpLoading,
  isCollectionsTab,
  isDailyTab,
  isRenewalsTab,
  isSalesTab,
  myActivitiesLoading,
  myRemindersLoading,
  myTasksLoading,
  readyOfferCount,
} = useDashboardStatus({
  dashboardAccessReason,
  dashboardAccessScope,
  dashboardTabMetrics,
  dashboardTabPayloadResource,
  dashboardStore,
  followUpResource,
  isPermissionDeniedError,
  kpiResource,
  myActivitiesResource,
  myRemindersResource,
  myTasksResource,
  recentOffers,
  route,
  selectedRange,
  t,
});

const {
  dashboardHeroSubtitle,
  dashboardHeroTitle,
  dashboardTabs,
  showAnalyticsRow,
  showNewLeadAction,
  showPoliciesOffersRow,
  showRenewalAlertsTopRow,
  visibleQuickActions,
} = useDashboardPresentation({
  t,
  isDailyTab,
  isSalesTab,
  isCollectionsTab,
  isRenewalsTab,
});

const {
  applyRange,
  buildKpiParams,
  buildTabPayloadParams,
  openPage,
  openPreviewList,
  reloadData,
  setDashboardTab,
  triggerDashboardReload,
} = useDashboardOrchestration({
  activeDashboardTab,
  branchStore,
  buildClaimListParams: buildInitialClaimListParams,
  claimListResource,
  dashboardTabPayloadResource,
  followUpResource,
  kpiResource,
  myActivitiesResource,
  myRemindersResource,
  myTasksResource,
  route,
  router,
  selectedRange,
});

const {
  pagedPreviewItems,
  previewPageCount,
  previewResolvedPage,
  setPreviewPage,
  shouldShowViewAll,
} = useDashboardPreviewPager();

const {
  dueTodayCollectionAmount,
  dueTodayCollectionCount,
  dueTodayCollectionPayments,
  offerWaitingRenewalCount,
  offerWaitingRenewals,
  openClaimsPreviewRows,
  overdueCollectionAmount,
  overdueCollectionCount,
  overdueCollectionPayments,
  reconciliationPreviewMetrics,
  reconciliationPreviewOpenDifference,
  reconciliationPreviewRows,
  } = useDashboardPreviewData({
  claimListResource,
  dashboardTabMetrics,
  dashboardTabPreviews,
  reconciliationPreviewResource,
});

const {
  canBlockTask,
  canCancelReminder,
  canCancelTask,
  canCompleteReminder,
  canCompleteTask,
  canStartTask,
  cancelReminder,
  cancelTask,
  completeReminder,
  completeTask,
  openActivityItem,
  openClaimItem,
  openCollectionRiskItem,
  openFollowUpItem,
  openPaymentItem,
  openPolicyItem,
  openReconciliationItem,
  openRenewalTaskItem,
  openTaskItem,
} = useDashboardItemActions({
  myTaskMutationResource,
  openPreviewList,
  router,
  triggerDashboardReload,
});

const { openLeadDialog, resetLeadForm } = useDashboardLeadDialog({
  leadDialogError,
  leadDialogFieldErrors,
  newLead,
  showLeadDialog,
});

const { createLead } = useDashboardLeadSubmission({
  activeLocale,
  createLeadResource,
  isSubmitting,
  leadDialogError,
  leadDialogFieldErrors,
  newLead,
  normalizeCustomerType,
  normalizeIdentityNumber,
  resetLeadForm,
  showLeadDialog,
  triggerDashboardReload,
  t,
  isValidTckn,
});

const renewalBucketCounts = computed(() => dashboardStore.renewalBucketCounts || { overdue: 0, due7: 0, due30: 0 });

const {
  buildQuickStatCard,
  compareDateDesc,
  compareDueDateAsc,
  formatCurrency,
  formatCurrencyBy,
  formatDate,
  formatDaysToDue,
  formatMonthKey,
  formatNumber,
  rangeLabel,
  trendRatio,
} = useDashboardFormatters({
  dashboardComparisonTrendHint,
  localeCode,
  maxTrendValue,
});

const visibleRange = useDashboardVisibleRange({
  formatDate,
  selectedRange,
});

const {
  displayRenewalAlertItems,
  displayRenewalTasks,
  followUpSummary,
  myReminderItems,
  myTaskItems,
  myTaskSummary,
  prioritizedFollowUpItems,
  priorityTaskItems,
  recentActivityItems,
  renewalAlertItems,
  renewalLinkedPolicies,
} = useDashboardTabHelpers({
  activeRenewalTasks,
  compareDateDesc,
  compareDueDateAsc,
  followUpResource,
  myActivitiesResource,
  myRemindersResource,
  myTasksResource,
  displayRecentPolicies: recentPolicies,
});

const {
  convertedSalesOffers,
  displayRecentLeads,
  displayRecentPolicies,
  leadStatusSummary,
  openConvertedPolicyItem,
  openLeadItem,
  openOfferItem,
  openSalesActionItem,
  openSalesActionList,
  recentLeadFacts,
  recentOfferFacts,
  recentPolicyFacts,
  salesActionDescription,
  salesActionFacts,
  salesActionTitle,
  salesCandidateActions,
  salesOfferStatusSummary,
  salesPipelineOffers,
} = useDashboardSales({
  dashboardData,
  dashboardTabSeries,
  formatCurrency,
  formatDate,
  leads,
  myReminderItems,
  myTaskItems,
  openPreviewList,
  openTaskItem,
  recentOffers,
  recentPolicies,
  router,
  t,
});

const {
  activityFacts,
  claimFacts,
  collectionPaymentDirectionSummary,
  collectionPaymentStatusSummary,
  collectionRiskFacts,
  collectionRiskRows,
  dashboardPaymentFacts,
  dashboardReconciliationFacts,
  followUpDescription,
  followUpFacts,
  followUpTitle,
  policyStatusSummary,
  renewalAlertFacts,
  renewalOutcomeSummary,
  renewalRetentionRate,
  renewalStatusSummary,
  renewalTaskFactsDetailed,
  taskFacts,
  visibleQuickStatCards,
} = useDashboardFacts({
  acceptedOfferCount,
  buildQuickStatCard,
  dashboardCards,
  dashboardTabSeries,
  dueTodayCollectionAmount,
  dueTodayCollectionCount,
  formatCurrency,
  formatDate,
  formatNumber,
  overdueCollectionAmount,
  overdueCollectionCount,
  overdueCollectionPayments,
  dueTodayCollectionPayments,
  followUpSummary,
  isCollectionsTab,
  isDailyTab,
  isRenewalsTab,
  isSalesTab,
  myTaskSummary,
  offerWaitingRenewalCount,
  previousDashboardCards,
  readyOfferCount,
  renewalBucketCounts,
  renewalTasks,
  t,
  policyStatusRows,
  convertedOfferCount,
});

watch(
  () => unref(kpiResource.data),
  (payload) => {
    dashboardStore.setKpiPayload(normalizeResourcePayload(payload));
  },
  { immediate: true }
);

watch(
  () => unref(dashboardTabPayloadResource.data),
  (payload) => {
    dashboardStore.setTabPayload(normalizeResourcePayload(payload));
  },
  { immediate: true }
);

watch(
  dashboardLoadingRaw,
  (value) => {
    dashboardStore.setLoading(value);
  },
  { immediate: true }
);

watch(
  activeDashboardTab,
  (value) => {
    dashboardStore.setActiveTab(value);
    triggerDashboardReload({ includeKpis: false });
  },
  { immediate: true }
);

watch(
  () => branchStore.selected,
  () => {
    triggerDashboardReload();
  }
);
</script>

