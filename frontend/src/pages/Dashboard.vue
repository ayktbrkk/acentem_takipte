<template>
  <section class="space-y-6">
    <header class="dashboard-hero rounded-2xl p-6 text-white shadow-lg shadow-slate-900/20">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div class="space-y-2">
          <p class="at-hero-tag">
            {{ t("heroTag") }}
          </p>
          <h2 class="at-hero-title">
            {{ dashboardHeroTitle }}
          </h2>
          <p class="at-hero-subtitle">
            {{ dashboardHeroSubtitle }}
          </p>
          <p class="at-hero-meta">
            {{ t("rangeLabel") }}: {{ visibleRange }}
          </p>
        </div>

        <ActionToolbarGroup>
          <FilterChipButton
            v-for="days in rangeOptions"
            :key="days"
            theme="hero"
            :active="selectedRange === days"
            @click="applyRange(days)"
          >
            {{ rangeLabel(days) }}
          </FilterChipButton>

          <ActionButton
            variant="secondary"
            size="sm"
            class="!border-white/30 !bg-white/10 !text-white hover:!bg-white/20"
            @click="reloadData"
          >
            {{ t("refresh") }}
          </ActionButton>
          <ActionButton
            v-if="showNewLeadAction"
            variant="secondary"
            size="sm"
            class="!border-white/30 !bg-white !text-slate-900 hover:!bg-slate-100"
            @click="showLeadDialog = true"
          >
            {{ t("newLead") }}
          </ActionButton>
        </ActionToolbarGroup>
      </div>
    </header>

    <div class="surface-card rounded-2xl p-2">
      <div class="flex gap-2 overflow-x-auto whitespace-nowrap px-1 py-1">
        <button
          v-for="tab in dashboardTabs"
          :key="tab.key"
          class="at-tab-chip shrink-0"
          :class="activeDashboardTab === tab.key ? 'at-tab-chip-active' : 'at-tab-chip-idle'"
          type="button"
          @click="setDashboardTab(tab.key)"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <div
      v-if="dashboardAccessMessage"
      class="rounded-xl border px-4 py-3 text-sm"
      :class="
        dashboardAccessMessageKind === 'permission'
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-amber-200 bg-amber-50 text-amber-800'
      "
    >
      {{ dashboardAccessMessage }}
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

    <div v-if="showAnalyticsRow" class="grid gap-4 xl:grid-cols-3">
      <article class="surface-card rounded-2xl p-5">
        <SectionCardHeader :title="t('leadPipeline')" :show-count="false">
          <template #trailing>
            <span class="text-xs font-medium text-slate-500">{{ t("liveData") }}</span>
          </template>
        </SectionCardHeader>
        <div v-if="dashboardLoading" class="text-sm text-slate-500">
          {{ t("loading") }}
        </div>
        <div v-else class="space-y-4">
          <ProgressMetricRow
            v-for="item in leadStatusSummary"
            :key="item.key"
            :label="item.label"
            :value="formatNumber(item.value)"
            :ratio="item.ratio"
            :bar-class="item.colorClass"
          />
        </div>
      </article>

      <article class="surface-card rounded-2xl p-5">
        <SectionCardHeader :title="t('offerStatusOverviewTitle')" :show-count="false">
          <template #trailing>
            <span class="text-xs font-medium text-slate-500">{{ t("liveData") }}</span>
          </template>
        </SectionCardHeader>
        <div v-if="dashboardLoading" class="text-sm text-slate-500">
          {{ t("loading") }}
        </div>
        <div v-else-if="salesOfferStatusSummary.length === 0" class="at-empty-block text-sm">
          {{ t("noOfferStatus") }}
        </div>
        <div v-else class="space-y-4">
          <ProgressMetricRow
            v-for="item in salesOfferStatusSummary"
            :key="item.key"
            :label="item.label"
            :value="formatNumber(item.value)"
            :ratio="item.ratio"
            :bar-class="item.colorClass"
          />
        </div>
      </article>

      <article class="surface-card rounded-2xl p-5">
        <SectionCardHeader :title="t('commissionTrend')" :show-count="false">
          <template #trailing>
            <span class="text-xs text-slate-500">{{ t("lastMonths") }}</span>
          </template>
        </SectionCardHeader>
        <div
          v-if="commissionTrend.length === 0"
          class="at-empty-block text-center"
        >
          {{ t("noTrendData") }}
        </div>
        <div v-else class="space-y-3">
          <TrendMetricRow
            v-for="entry in commissionTrend"
            :key="entry.month_key"
            :label="formatMonthKey(entry.month_key)"
            :value="formatCurrency(entry.total_commission)"
            :ratio="trendRatio(entry.total_commission)"
          />
        </div>
      </article>
    </div>

    <div v-if="isDailyTab" class="grid gap-4 xl:grid-cols-3">
      <div class="space-y-4 xl:col-span-2">
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('followUpSlaTitle')" :count="formatNumber(followUpItems.length)" />
          <p class="mb-3 text-xs text-slate-500">{{ t("followUpSlaHint") }}</p>
          <div v-if="followUpLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else class="space-y-3">
            <div class="grid grid-cols-3 gap-2">
              <div class="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-rose-600">{{ t("followUpOverdue") }}</p>
                <p class="mt-1 text-lg font-semibold text-rose-700">{{ formatNumber(followUpSummary.overdue) }}</p>
              </div>
              <div class="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-amber-700">{{ t("followUpToday") }}</p>
                <p class="mt-1 text-lg font-semibold text-amber-800">{{ formatNumber(followUpSummary.due_today) }}</p>
              </div>
              <div class="rounded-xl border border-sky-200 bg-sky-50 p-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{{ t("followUpSoon") }}</p>
                <p class="mt-1 text-lg font-semibold text-sky-800">{{ formatNumber(followUpSummary.due_soon) }}</p>
              </div>
            </div>
            <ul v-if="followUpItems.length > 0" class="space-y-2">
              <MetaListCard
                v-for="item in followUpItems"
                :key="`${item.source_type}-${item.source_name}`"
                :title="followUpTitle(item)"
                :description="followUpDescription(item)"
                description-class="mt-2 text-xs font-semibold text-slate-600"
              >
                <template #trailing>
                  <div class="flex items-center gap-2">
                    <span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
                      {{ followUpTypeLabel(item.source_type) }}
                    </span>
                    <ActionButton variant="ghost" size="sm" @click="openFollowUpItem(item)">
                      {{ t("openItem") }}
                    </ActionButton>
                  </div>
                </template>
                <MiniFactList :items="followUpFacts(item)" />
              </MetaListCard>
            </ul>
            <div v-else class="at-empty-block text-sm">{{ t("noFollowUpItems") }}</div>
            <div class="flex flex-wrap gap-2 pt-2">
              <ActionButton variant="secondary" size="sm" @click="openPage('/claims')">
                {{ t("followUpClaimsAction") }}
              </ActionButton>
              <ActionButton variant="secondary" size="sm" @click="openPage('/renewals')">
                {{ t("followUpRenewalsAction") }}
              </ActionButton>
              <ActionButton variant="secondary" size="sm" @click="openPage('/communication')">
                {{ t("followUpCommunicationAction") }}
              </ActionButton>
            </div>
          </div>
        </article>

        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('renewalAlertTitle')" :count="displayRenewalAlertItems.length" />
          <p class="mb-3 text-xs text-slate-500">{{ t("renewalAlertHint") }}</p>
          <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <ul v-else-if="displayRenewalAlertItems.length > 0" class="space-y-2">
            <MetaListCard
              v-for="task in displayRenewalAlertItems"
              :key="task.name"
              :title="task.policy || '-'"
              :description="formatDaysToDue(task.due_date)"
              description-class="mt-2 text-xs font-semibold text-amber-700"
            >
              <template #trailing>
                <StatusBadge v-if="task.status" type="renewal" :status="task.status" />
              </template>
              <MiniFactList :items="renewalAlertFacts(task)" />
            </MetaListCard>
          </ul>
          <div v-else class="at-empty-block text-sm">{{ t("noRenewalAlert") }}</div>
        </article>

        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('actionOfferQueueTitle')" :count="formatNumber(dailyActionOffers.length)" />
          <p class="mb-3 text-xs text-slate-500">{{ t("actionOfferQueueHint") }}</p>
          <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="dailyActionOffers.length === 0" class="at-empty-block">{{ t("noActionOfferQueue") }}</div>
          <ul v-else class="space-y-3">
            <EntityPreviewCard
              v-for="offer in dailyActionOffers"
              :key="offer.name"
              :title="offer.name"
            >
              <template #trailing>
                <StatusBadge type="offer" :status="offer.status" />
              </template>
              <MiniFactList :items="recentOfferFacts(offer)" />
              <p class="mt-1 text-xs text-slate-600">{{ formatCurrencyBy(offer.gross_premium, offer.currency || "TRY") }}</p>
            </EntityPreviewCard>
          </ul>
        </article>
      </div>

      <div class="space-y-4">
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('recentPolicies')" :count="formatNumber(displayRecentPolicies.length)" />
          <div v-if="dashboardLoading" class="text-sm text-slate-500">
            {{ t("loading") }}
          </div>
          <div v-else-if="displayRecentPolicies.length === 0" class="at-empty-block">
            {{ t("noPolicy") }}
          </div>
          <ul v-else class="space-y-3">
            <EntityPreviewCard
              v-for="policy in displayRecentPolicies"
              :key="policy.name"
              :title="policy.policy_no || policy.name"
            >
              <template #trailing>
                <StatusBadge type="policy" :status="policy.status" />
              </template>
              <MiniFactList :items="recentPolicyFacts(policy)" />
              <p class="mt-1 text-xs text-slate-600">
                {{ formatCurrencyBy(policy.gross_premium, policy.currency || "TRY") }}
                /
                {{ formatCurrencyBy(policy.commission_amount || policy.commission, policy.currency || "TRY") }}
              </p>
            </EntityPreviewCard>
          </ul>
        </article>

        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('topCompanies')" :count="formatNumber(displayTopCompanies.length)" />
          <div v-if="dashboardLoading" class="text-sm text-slate-500">
            {{ t("loading") }}
          </div>
          <div v-else-if="displayTopCompanies.length === 0" class="at-empty-block">
            {{ t("noTopCompanies") }}
          </div>
          <ul v-else class="space-y-3">
            <MetaListCard
              v-for="company in displayTopCompanies"
              :key="company.insurance_company"
              :title="company.company_name || '-'"
            >
              <MiniFactList :items="topCompanyFacts(company)" />
            </MetaListCard>
          </ul>
        </article>

        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('quickActions')" :show-count="false" />
          <div class="space-y-2">
            <ActionPreviewCard
              v-for="action in visibleQuickActions"
              :key="action.key"
              :title="action.label"
              :description="action.description"
              @click="openPage(action.to)"
            />
          </div>
        </article>
      </div>
    </div>

    <div v-if="isCollectionsTab" class="grid gap-4 xl:grid-cols-3">
      <article class="surface-card rounded-2xl p-5 xl:col-span-2">
        <SectionCardHeader :title="t('recentPaymentsPreview')" :count="formatNumber(collectionPayments.length)" />
        <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
        <div v-else-if="collectionPayments.length === 0" class="at-empty-block">{{ t("noPaymentPreview") }}</div>
        <ul v-else class="space-y-3">
          <EntityPreviewCard
            v-for="payment in collectionPayments"
            :key="payment.name"
            :title="payment.payment_no || payment.name"
          >
            <template #trailing>
              <StatusBadge type="payment_direction" :status="payment.payment_direction" />
            </template>
            <MiniFactList :items="dashboardPaymentFacts(payment)" />
            <p class="mt-1 text-xs text-slate-600">{{ formatCurrency(payment.amount_try) }}</p>
          </EntityPreviewCard>
        </ul>
      </article>

      <div class="space-y-4">
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('reconciliationPreview')" :count="formatNumber(reconciliationPreviewRows.length)" />
          <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="reconciliationPreviewRows.length === 0" class="at-empty-block">{{ t("noReconciliationPreview") }}</div>
          <div v-else class="space-y-3">
            <div class="grid grid-cols-2 gap-2">
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t("mismatchRows") }}</p>
                <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatNumber(reconciliationPreviewMetrics.open || 0) }}</p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ t("openDifference") }}</p>
                <p class="mt-1 text-lg font-semibold text-slate-900">{{ formatCurrency(reconciliationPreviewOpenDifference) }}</p>
              </div>
            </div>
            <ul class="space-y-2">
              <MetaListCard
                v-for="row in reconciliationPreviewRows.slice(0, 4)"
                :key="row.name"
                :title="`${row.source_doctype || '-'} / ${row.source_name || '-'}`"
              >
                <template #trailing>
                  <StatusBadge type="reconciliation" :status="row.status" />
                </template>
                <MiniFactList :items="dashboardReconciliationFacts(row)" />
              </MetaListCard>
            </ul>
          </div>
        </article>
      </div>
    </div>

    <div v-if="isRenewalsTab" class="grid gap-4 xl:grid-cols-3">
      <div class="space-y-4 xl:col-span-2">

        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('renewalQueue')" :count="formatNumber(displayRenewalTasks.length)" />
          <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="displayRenewalTasks.length === 0" class="at-empty-block">{{ t("noRenewal") }}</div>
          <ul v-else class="space-y-3">
            <MetaListCard
              v-for="task in displayRenewalTasks"
              :key="task.name"
              :title="task.policy || '-'"
            >
              <template #trailing>
                <StatusBadge v-if="task.status" type="renewal" :status="task.status" />
              </template>
              <MiniFactList :items="renewalTaskFactsDetailed(task)" />
            </MetaListCard>
          </ul>
        </article>
      </div>

      <div class="space-y-4">
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('renewalStatusOverviewTitle')" :show-count="false" />
          <div v-if="dashboardLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="renewalStatusSummary.length === 0" class="at-empty-block">{{ t("noRenewalStatus") }}</div>
          <div v-else class="space-y-3">
            <ProgressMetricRow
              v-for="item in renewalStatusSummary"
              :key="item.key"
              :label="item.label"
              :value="formatNumber(item.value)"
              :ratio="item.ratio"
              :bar-class="item.colorClass"
            />
          </div>
        </article>
      </div>
    </div>

    <div v-if="isSalesTab" class="grid gap-4 xl:grid-cols-3">
      <div class="space-y-4 xl:col-span-2">
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('recentLeads')" :count="formatNumber(displayRecentLeads.length)">
          </SectionCardHeader>

          <div v-if="dashboardLoading" class="text-sm text-slate-500">
            {{ t("loading") }}
          </div>
          <div
            v-else-if="displayRecentLeads.length === 0"
            class="at-empty-block text-center"
          >
            {{ t("noLead") }}
          </div>
          <ul v-else class="space-y-3">
            <EntityPreviewCard
              v-for="lead in displayRecentLeads"
              :key="lead.name"
              :title="[lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.name"
            >
              <template #trailing>
                <StatusBadge type="lead" :status="lead.status" />
              </template>
              <MiniFactList :items="recentLeadFacts(lead)" />
              <p class="mt-2 max-h-10 overflow-hidden text-sm text-slate-700">{{ lead.notes || t("noNote") }}</p>
            </EntityPreviewCard>
          </ul>
        </article>
      </div>

      <div class="space-y-4">
        <article class="surface-card rounded-2xl p-5">
          <SectionCardHeader :title="t('offerPipeline')" :show-count="false">
            <template #trailing>
              <span class="text-xs text-slate-500">{{ t("readyOffers") }}: {{ formatNumber(displayReadyOfferCount) }}</span>
            </template>
          </SectionCardHeader>
          <div v-if="dashboardLoading" class="text-sm text-slate-500">
            {{ t("loading") }}
          </div>
          <div v-else-if="displayRecentOffers.length === 0" class="at-empty-block">
            {{ t("noOffer") }}
          </div>
          <ul v-else class="space-y-3">
            <EntityPreviewCard
              v-for="offer in displayRecentOffers"
              :key="offer.name"
              :title="offer.name"
            >
              <template #trailing>
                <StatusBadge type="offer" :status="offer.status" />
              </template>
              <MiniFactList :items="recentOfferFacts(offer)" />
              <p class="mt-1 text-xs text-slate-600">{{ formatCurrencyBy(offer.gross_premium, offer.currency || "TRY") }}</p>
              <p v-if="offer.converted_policy" class="mt-1 text-xs font-semibold text-emerald-600">
                {{ t("converted") }}: {{ offer.converted_policy }}
              </p>
            </EntityPreviewCard>
          </ul>
        </article>
      </div>
    </div>



    <Dialog v-model="showLeadDialog" :options="{ title: t('newLead'), size: 'xl' }">
      <template #body-content>
        <div class="grid gap-3 p-4">
          <input
            v-model="newLead.first_name"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            :placeholder="t('firstName')"
            type="text"
          />
          <input
            v-model="newLead.last_name"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            :placeholder="t('lastName')"
            type="text"
          />
          <input
            v-model="newLead.email"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            :placeholder="t('email')"
            type="email"
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
        <ActionButton variant="secondary" size="sm" @click="showLeadDialog = false">
          {{ t("cancel") }}
        </ActionButton>
        <ActionButton
          variant="primary"
          size="sm"
          class="!bg-brand-700 hover:!bg-brand-600"
          :disabled="isSubmitting || !newLead.first_name"
          @click="createLead"
        >
          {{ t("save") }}
        </ActionButton>
      </template>
    </Dialog>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, unref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Dialog, createResource } from "frappe-ui";

import { useAuthStore } from "../stores/auth";
import { useBranchStore } from "../stores/branch";
import { useDashboardStore } from "../stores/dashboard";
import ActionButton from "../components/app-shell/ActionButton.vue";
import ActionPreviewCard from "../components/app-shell/ActionPreviewCard.vue";
import ActionToolbarGroup from "../components/app-shell/ActionToolbarGroup.vue";
import FilterChipButton from "../components/app-shell/FilterChipButton.vue";
import ProgressMetricRow from "../components/app-shell/ProgressMetricRow.vue";
import TrendMetricRow from "../components/app-shell/TrendMetricRow.vue";
import EntityPreviewCard from "../components/app-shell/EntityPreviewCard.vue";
import MetaListCard from "../components/app-shell/MetaListCard.vue";
import MiniFactList from "../components/app-shell/MiniFactList.vue";
import SectionCardHeader from "../components/app-shell/SectionCardHeader.vue";
import DashboardStatCard from "../components/DashboardStatCard.vue";
import StatusBadge from "../components/StatusBadge.vue";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const branchStore = useBranchStore();
const dashboardStore = useDashboardStore();

const copy = {
  tr: {
    heroTag: "Sigorta Kontrol Merkezi",
    heroTitle: "Sigorta Operasyon Panosu",
    heroSubtitle: "Frappe CRM yapisina benzer panelde fırsat, police, hasar ve odeme akislarini canli takip edin.",
    heroTitleDaily: "Operasyon Panosu",
    heroSubtitleDaily: "Operasyon oncelikleri, bekleyen isler ve kritik kuyruklar icin canli operasyon gorunumu.",
    heroTitleSales: "Satis Panosu",
    heroSubtitleSales: "Fırsat, teklif ve police uretimini satis odaginda izleyin.",
    heroTitleCollections: "Tahsilat Panosu",
    heroSubtitleCollections: "Tahsilat, odeme ve mutabakat akislarini tek ekranda yonetin.",
    heroTitleRenewals: "Yenileme Panosu",
    heroSubtitleRenewals: "Yaklasan bitisler ve yenileme gorevlerini onceliklendirin.",
    tabDaily: "Operasyon",
    tabSales: "Satis",
    tabCollections: "Tahsilat",
    tabRenewals: "Yenileme",
    rangeLabel: "Tarih araligi",
    refresh: "Yenile",
    newLead: "Yeni Fırsat Ekle",
    leadPipeline: "Fırsat Sureci",
    offerStatusOverviewTitle: "Teklif Durum Dagilimi",
    liveData: "Canli veri",
    loading: "Yukleniyor...",
    commissionTrend: "Aylik Komisyon Trendi",
    lastMonths: "Son aylar",
    noTrendData: "Trend verisi bulunamadi.",
    noOfferStatus: "Teklif durum verisi bulunamadi.",
    recentLeads: "Guncel Fırsat Kartlari",
    cardView: "Kart Gorunumu",
    noLead: "Fırsat kaydi bulunamadi.",
    estPremium: "Tahmini Brut Prim",
    noNote: "Not yok.",
    renewalQueue: "Yenileme Kuyrugu",
    noRenewal: "Bekleyen yenileme gorevi yok.",
    actionOfferQueueTitle: "Aksiyon Bekleyen Teklifler",
    actionOfferQueueHint: "Gonderildi / kabul edildi ve policeye donusmesi beklenen teklifler",
    noActionOfferQueue: "Aksiyon bekleyen teklif bulunmuyor.",
    dueDate: "Son tarih",
    renewalDate: "Yenileme tarihi",
    status: "Durum",
    renewalAlertTitle: "Yakin Yenileme Alarmlari",
    renewalAlertHint: "30 gun icinde sona erecek policeler",
    noRenewalAlert: "Bugun kritik yenileme bulunmuyor.",
    trendAgainstPrevious: "onceki doneme gore",
    trendAgainstPreviousPeriod: "onceki ayni sureye gore",
    trendAgainstPreviousMonth: "gecen aya gore",
    trendAgainstPreviousYear: "gecen yila gore",
    trendAgainstCustomPeriod: "karsilastirma donemine gore",
    quickActions: "Hizli Aksiyonlar",
    firstName: "Ad",
    lastName: "Soyad",
    customer: "Musteri",
    email: "E-posta",
    estPremiumInput: "Tahmini brut prim",
    note: "Not",
    cancel: "Vazgec",
    save: "Kaydet",
    draft: "Taslak",
    open: "Acik",
    replied: "Gorusuldu",
    closed: "Kapandi",
    kpiGwp: "Toplam GWP (TRY)",
    kpiCommission: "Toplam Komisyon",
    kpiPolicy: "Toplam Police",
    kpiRenewal: "Bekleyen Yenileme",
    kpiRenewalRetention: "Yenileme Tutma Orani",
    kpiCollect: "Tahsilat (TRY)",
    kpiPayout: "Odeme (TRY)",
    kpiClaim: "Acik Hasar",
    kpiReadyOffers: "Hazir Teklif",
    kpiReconciliationOpen: "Acik Mutabakat",
    kpiReconciliationOpen: "Acik Mutabakat",
    kpiAvgRate: "Ort. Komisyon Orani",
    todaySnapshot: "Bugunluk gorunum",
    renewalRetentionHint: "Yenilenen / kaybedilen kapanislar",
    monthlySnapshot: "Secili aralik",
    ratioSnapshot: "Oransal performans",
    quickPolicy: "Police Yonetimi",
    quickPolicyDesc: "Policeleri listele ve versiyonlari izle",
    quickOffer: "Teklif Panosu",
    quickOfferDesc: "Teklifleri police surecine hazirla",
    quickClaim: "Hasar Masasi",
    quickClaimDesc: "Hasar dosyalarini ve odemeleri yonet",
    quickPayment: "Odeme Operasyonlari",
    quickPaymentDesc: "Tahsilat ve payout hareketlerini takip et",
    quickRenewal: "Yenileme Panosu",
    quickRenewalDesc: "Bitise 30 gun kalan policeleri denetle",
    quickCommunication: "Iletisim Merkezi",
    quickCommunicationDesc: "Bildirim kuyrugunu ve gonderimleri yonet",
    quickReconciliation: "Mutabakat",
    quickReconciliationDesc: "Muhasebe farklarini eslestir ve kapat",
    recentPaymentsPreview: "Son Tahsilat / Odeme Hareketleri",
    noPaymentPreview: "Tahsilat veya odeme kaydi bulunamadi.",
    reconciliationPreview: "Acik Mutabakat Farklari",
    noReconciliationPreview: "Acik mutabakat kaydi bulunamadi.",
    mismatchRows: "Acik Kayit",
    openDifference: "Toplam Fark",
    paymentDate: "Tarih",
    paymentDirection: "Yon",
    policyLabel: "Police",
    reconciliationType: "Uyumsuzluk",
    difference: "Fark",
    renewalStatusOverviewTitle: "Yenileme Durum Ozeti",
    noRenewalStatus: "Durum ozeti olusturulacak yenileme kaydi yok.",
    dashboardPermissionDenied: "Bu pano verisini gormek icin yetkiniz yok.",
    dashboardScopeNoAssignments: "Size atanmis musteri bulunmadigi icin pano verisi gosterilemiyor.",
    dashboardScopeRestrictedEmpty: "Mevcut veri kapsaminda pano verisi bulunamadi.",
    statusInProgress: "Devam Ediyor",
    statusCompleted: "Tamamlandi",
    statusCancelled: "Iptal",
    statusSent: "Gonderildi",
    statusAccepted: "Kabul Edildi",
    statusRejected: "Reddedildi",
    policyMix: "Police Durum Dagilimi",
    noPolicyMix: "Police durum verisi bulunamadi.",
    statusActive: "Aktif",
    statusKyt: "KYT",
    statusIpt: "IPT",
    topCompanies: "Top Sigorta Sirketleri",
    noTopCompanies: "Sirket bazli uretim verisi bulunamadi.",
    followUpSlaTitle: "Takip SLA",
    followUpSlaHint: "Acil ve yaklasan takip yukunu tek blokta izleyin.",
    followUpOverdue: "Geciken",
    followUpToday: "Bugun",
    followUpSoon: "7 Gun",
    noFollowUpItems: "Takip gerektiren kayit yok.",
    followUpTypeClaim: "Hasar",
    followUpTypeRenewal: "Yenileme",
    followUpTypeAssignment: "Atama",
    followUpTypeCallNote: "Arama Notu",
    followUpDeltaOverdue: "Gecikme",
    followUpDeltaToday: "Bugun",
    followUpDeltaDays: "gun",
    followUpDate: "Takip",
    followUpAssignee: "Sorumlu",
    openItem: "Ac",
    followUpClaimsAction: "Hasar Masasi",
    followUpRenewalsAction: "Yenileme Panosu",
    followUpCommunicationAction: "Iletisim Merkezi",
    policyCount: "Police Adedi",
    grossProduction: "Brut Uretim",
    recentPolicies: "Son Policeler",
    noPolicy: "Police kaydi bulunamadi.",
    issueDate: "Tanzim",
    offerPipeline: "Teklif Sureci",
    readyOffers: "Hazir Teklifler",
    noOffer: "Teklif kaydi bulunamadi.",
    validUntil: "Gecerlilik",
    converted: "Donustu",
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
    cardView: "Card View",
    noLead: "No lead record found.",
    estPremium: "Estimated Gross Premium",
    noNote: "No notes.",
    renewalQueue: "Renewal Queue",
    noRenewal: "No pending renewal tasks.",
    actionOfferQueueTitle: "Offers Requiring Action",
    actionOfferQueueHint: "Sent / accepted offers waiting for policy conversion",
    noActionOfferQueue: "No offers waiting for action.",
    dueDate: "Due date",
    renewalDate: "Renewal date",
    status: "Status",
    renewalAlertTitle: "Upcoming Renewal Alerts",
    renewalAlertHint: "Policies ending within 30 days",
    noRenewalAlert: "No critical renewal alert for today.",
    trendAgainstPrevious: "vs previous period",
    trendAgainstPreviousPeriod: "vs previous period",
    trendAgainstPreviousMonth: "vs previous month",
    trendAgainstPreviousYear: "vs previous year",
    trendAgainstCustomPeriod: "vs comparison period",
    quickActions: "Quick Actions",
    firstName: "First Name",
    lastName: "Last Name",
    customer: "Customer",
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
    kpiCollect: "Collections (TRY)",
    kpiPayout: "Payouts (TRY)",
    kpiClaim: "Open Claims",
    kpiReadyOffers: "Ready Offers",
    kpiReconciliationOpen: "Open Reconciliation",
    kpiReconciliationOpen: "Open Reconciliation",
    kpiAvgRate: "Avg Commission Rate",
    todaySnapshot: "Current snapshot",
    renewalRetentionHint: "Renewed / lost closed outcomes",
    monthlySnapshot: "Selected range",
    ratioSnapshot: "Rate performance",
    quickPolicy: "Policy Management",
    quickPolicyDesc: "List policies and monitor versions",
    quickOffer: "Offer Board",
    quickOfferDesc: "Prepare offers for policy conversion",
    quickClaim: "Claim Desk",
    quickClaimDesc: "Manage claim files and payouts",
    quickPayment: "Payment Ops",
    quickPaymentDesc: "Track collections and payouts",
    quickRenewal: "Renewal Board",
    quickRenewalDesc: "Review policies ending in 30 days",
    quickCommunication: "Communication Center",
    quickCommunicationDesc: "Manage notification queue and deliveries",
    quickReconciliation: "Reconciliation",
    quickReconciliationDesc: "Match and close accounting differences",
    recentPaymentsPreview: "Recent Collection / Payout Activity",
    noPaymentPreview: "No collection or payout records found.",
    reconciliationPreview: "Open Reconciliation Differences",
    noReconciliationPreview: "No open reconciliation items found.",
    mismatchRows: "Open Rows",
    openDifference: "Open Difference",
    paymentDate: "Date",
    paymentDirection: "Direction",
    policyLabel: "Policy",
    reconciliationType: "Mismatch",
    difference: "Difference",
    renewalStatusOverviewTitle: "Renewal Status Summary",
    noRenewalStatus: "No renewal rows available for a status summary.",
    dashboardPermissionDenied: "You do not have permission to access dashboard data.",
    dashboardScopeNoAssignments: "No customers are assigned to you, so dashboard data is not available.",
    dashboardScopeRestrictedEmpty: "No dashboard data is available for your current scope.",
    statusInProgress: "In Progress",
    statusCompleted: "Done",
    statusCancelled: "Cancelled",
    statusSent: "Sent",
    statusAccepted: "Accepted",
    statusRejected: "Rejected",
    policyMix: "Policy Status Mix",
    noPolicyMix: "No policy status data found.",
    statusActive: "Active",
    statusKyt: "KYT",
    statusIpt: "IPT",
    topCompanies: "Top Insurance Companies",
    noTopCompanies: "No company production data found.",
    followUpSlaTitle: "Follow-up SLA",
    followUpSlaHint: "Track urgent and upcoming follow-up workload in one block.",
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
    followUpClaimsAction: "Claims Desk",
    followUpRenewalsAction: "Renewals Board",
    followUpCommunicationAction: "Communication Center",
    policyCount: "Policy Count",
    grossProduction: "Gross Production",
    recentPolicies: "Recent Policies",
    noPolicy: "No policy records found.",
    issueDate: "Issue Date",
    offerPipeline: "Offer Pipeline",
    readyOffers: "Ready Offers",
    noOffer: "No offer records found.",
    validUntil: "Valid Until",
    converted: "Converted",
  },
};

function t(key) {
  const localeValue = unref(authStore.locale) || "en";
  return copy[localeValue]?.[key] || copy.en[key] || key;
}

const DASHBOARD_TABS = ["daily", "sales", "collections", "renewals"];

function normalizeDashboardTab(value) {
  const candidate = String(value || "").toLowerCase();
  if (!candidate || candidate === "overview" || candidate === "operations") return "daily";
  return DASHBOARD_TABS.includes(candidate) ? candidate : "daily";
}

const rangeOptions = [1, 7, 30, 90];
const selectedRange = computed({
  get: () => dashboardStore.state.range || 30,
  set: (value) => dashboardStore.setRange(value),
});
const showLeadDialog = ref(false);
const isSubmitting = ref(false);
const DASHBOARD_RELOAD_DEBOUNCE_MS = 300;
let dashboardReloadTimer = null;

const newLead = reactive({
  first_name: "",
  last_name: "",
  email: "",
  estimated_gross_premium: "",
  notes: "",
});

const kpiResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_dashboard_kpis",
  params: buildKpiParams(),
  auto: false,
});

const followUpResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_follow_up_sla_payload",
  params: withOfficeBranchFilter({ filters: {} }),
  auto: true,
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

const paymentPreviewResource = createResource({
  url: "frappe.client.get_list",
  params: {
    doctype: "AT Payment",
    fields: [
      "name",
      "payment_no",
      "payment_direction",
      "payment_date",
      "amount_try",
      "customer",
      "policy",
    ],
    order_by: "modified desc",
    limit_page_length: 8,
  },
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
  params: buildTabPayloadParams("daily"),
  auto: true,
});

const createLeadResource = createResource({
  url: "frappe.client.insert",
});

const localeCode = computed(() => (unref(authStore.locale) === "tr" ? "tr-TR" : "en-US"));
const dashboardTabPayload = computed(() => dashboardStore.state.tabPayload || {});
const dashboardTabCards = computed(() => dashboardTabPayload.value.cards || {});
const dashboardTabCompareCards = computed(() => dashboardTabPayload.value.compare_cards || {});
const dashboardTabMetrics = computed(() => dashboardTabPayload.value.metrics || {});
const dashboardTabSeries = computed(() => dashboardTabPayload.value.series || {});
const dashboardTabPreviews = computed(() => dashboardTabPayload.value.previews || {});
const leads = computed(() => dashboardTabPreviews.value.leads || leadListResource.data || []);
const renewalTasks = computed(() => dashboardTabPreviews.value.renewal_tasks || renewalTaskResource.data || []);
const activeRenewalTasks = computed(() =>
  renewalTasks.value.filter((task) => ["Open", "In Progress"].includes(String(task?.status || "")))
);
const recentPolicies = computed(() => dashboardTabPreviews.value.policies || policyListResource.data || []);
const recentOffers = computed(() => dashboardTabPreviews.value.offers || offerListResource.data || []);
const collectionPayments = computed(() => dashboardTabPreviews.value.payments || paymentPreviewResource.data || []);
const reconciliationPreviewData = computed(() => reconciliationPreviewResource.data || {});
const reconciliationPreviewRows = computed(() => dashboardTabPreviews.value.reconciliation_rows || reconciliationPreviewData.value.rows || []);
const reconciliationPreviewMetrics = computed(() => ({
  ...(reconciliationPreviewData.value.metrics || {}),
  ...(dashboardTabMetrics.value?.reconciliation_open_count != null
    ? { open: Number(dashboardTabMetrics.value.reconciliation_open_count || 0) }
    : {}),
}));
const dashboardData = computed(() => dashboardStore.state.kpiPayload || {});
const dashboardComparison = computed(() => dashboardStore.comparison || {});
const dashboardMeta = computed(() => {
  return dashboardStore.meta || {};
});
const dashboardAccessScope = computed(() => String(dashboardMeta.value?.access_scope || ""));
const dashboardAccessReason = computed(() => String(dashboardMeta.value?.scope_reason || ""));
const dashboardCards = computed(() =>
  Object.keys(dashboardTabCards.value || {}).length ? dashboardTabCards.value : (dashboardData.value.cards || {})
);
const previousDashboardCards = computed(() => dashboardStore.previousCards || {});
const dashboardComparisonTrendHint = computed(() => {
  const mode = String(dashboardComparison.value?.mode || "").toLowerCase();
  if (mode === "previous_period") return t("trendAgainstPreviousPeriod");
  if (mode === "previous_month") return t("trendAgainstPreviousMonth");
  if (mode === "previous_year") return t("trendAgainstPreviousYear");
  if (mode === "custom") return t("trendAgainstCustomPeriod");
  return t("trendAgainstPrevious");
});
const commissionTrend = computed(() => dashboardTabSeries.value.commission_trend || dashboardData.value.commission_trend || []);
const policyStatusRows = computed(() => dashboardData.value.policy_status || []);
const topCompanies = computed(() => dashboardTabSeries.value.top_companies || dashboardData.value.top_companies || []);
const dashboardLoadingRaw = computed(
  () => Boolean((isDailyTab.value ? kpiResource.loading : false) || dashboardTabPayloadResource.loading)
);
const followUpLoading = computed(() => Boolean(followUpResource.loading));
const dashboardLoading = computed(() => dashboardStore.state.loading);
const dashboardPermissionError = computed(() => {
  const candidates = [dashboardTabPayloadResource.error, isDailyTab.value ? kpiResource.error : null];
  return candidates.find((error) => isPermissionDeniedError(error)) || null;
});
const dashboardScopeMessage = computed(() => {
  if (dashboardLoadingRaw.value || dashboardPermissionError.value) return "";
  if (dashboardAccessScope.value !== "empty") return "";
  if (dashboardAccessReason.value === "agent_unassigned") return t("dashboardScopeNoAssignments");
  return t("dashboardScopeRestrictedEmpty");
});
const dashboardAccessMessage = computed(() => {
  if (dashboardPermissionError.value) return t("dashboardPermissionDenied");
  return dashboardScopeMessage.value;
});
const dashboardAccessMessageKind = computed(() => (dashboardPermissionError.value ? "permission" : "scope"));

const readyOfferCount = computed(() => {
  if (dashboardTabMetrics.value?.ready_offer_count != null) {
    return Number(dashboardTabMetrics.value.ready_offer_count || 0);
  }
  return recentOffers.value.filter((offer) => ["Sent", "Accepted"].includes(offer.status) && !offer.converted_policy).length;
});
const activeDashboardTab = computed(() => normalizeDashboardTab(route.query?.tab || dashboardStore.state.activeTab));
const isDailyTab = computed(() => activeDashboardTab.value === "daily");
const isSalesTab = computed(() => activeDashboardTab.value === "sales");
const isCollectionsTab = computed(() => activeDashboardTab.value === "collections");
const isRenewalsTab = computed(() => activeDashboardTab.value === "renewals");
const showNewLeadAction = computed(() => !isCollectionsTab.value && !isRenewalsTab.value);
const showRenewalAlertsTopRow = computed(() => isDailyTab.value || isRenewalsTab.value);
const showAnalyticsRow = computed(() => isSalesTab.value);
const showPoliciesOffersRow = computed(() => isSalesTab.value);

const dashboardTabs = computed(() => [
  { key: "daily", label: t("tabDaily") },
  { key: "sales", label: t("tabSales") },
  { key: "collections", label: t("tabCollections") },
  { key: "renewals", label: t("tabRenewals") },
]);

const dashboardHeroTitle = computed(() => {
  if (isDailyTab.value) return t("heroTitleDaily");
  if (isSalesTab.value) return t("heroTitleSales");
  if (isCollectionsTab.value) return t("heroTitleCollections");
  if (isRenewalsTab.value) return t("heroTitleRenewals");
  return t("heroTitleDaily");
});

const dashboardHeroSubtitle = computed(() => {
  if (isDailyTab.value) return t("heroSubtitleDaily");
  if (isSalesTab.value) return t("heroSubtitleSales");
  if (isCollectionsTab.value) return t("heroSubtitleCollections");
  if (isRenewalsTab.value) return t("heroSubtitleRenewals");
  return t("heroSubtitleDaily");
});

const renewalAlertItems = computed(() =>
  activeRenewalTasks.value
    .slice()
    .sort((a, b) => new Date(a.due_date || a.renewal_date || 0).getTime() - new Date(b.due_date || b.renewal_date || 0).getTime())
    .slice(0, 5)
);
const displayRenewalAlertItems = computed(() => renewalAlertItems.value.slice(0, 5));
const displayRenewalTasks = computed(() => activeRenewalTasks.value.slice(0, 8));
const displayRecentLeads = computed(() => leads.value);
const displayTopCompanies = computed(() => topCompanies.value.slice(0, 4));
const displayRecentPolicies = computed(() => recentPolicies.value.slice(0, 4));
const displayRecentOffers = computed(() => recentOffers.value);
const displayReadyOfferCount = computed(
  () => displayRecentOffers.value.filter((offer) => ["Sent", "Accepted"].includes(offer.status) && !offer.converted_policy).length
);
const reconciliationPreviewOpenDifference = computed(() => {
  if (dashboardTabMetrics.value?.reconciliation_open_difference_try != null) {
    return Number(dashboardTabMetrics.value.reconciliation_open_difference_try || 0);
  }
  return reconciliationPreviewRows.value.reduce((sum, row) => sum + Number(row?.difference_try || 0), 0);
});
const dailyActionOffers = computed(() =>
  (dashboardTabPreviews.value.action_offers || recentOffers.value)
    .filter((offer) => ["Sent", "Accepted"].includes(String(offer?.status || "")) && !offer.converted_policy)
    .slice(0, 5)
);

const renewalBucketCounts = computed(() => dashboardStore.renewalBucketCounts || { overdue: 0, due7: 0, due30: 0 });
const renewalRetentionSummary = computed(
  () => dashboardStore.renewalRetentionSummary || { renewed: 0, lost: 0, cancelled: 0, rate: 0 }
);
const followUpPayload = computed(() => followUpResource.data || {});
const followUpSummary = computed(() => followUpPayload.value.summary || { total: 0, overdue: 0, due_today: 0, due_soon: 0 });
const followUpItems = computed(() => (Array.isArray(followUpPayload.value.items) ? followUpPayload.value.items : []));

const visibleRange = computed(() => {
  const range = getDateRange(selectedRange.value);
  return `${formatDate(range.from)} - ${formatDate(range.to)}`;
});

const quickStatCards = computed(() => [
  buildQuickStatCard({
    key: "quick-policy",
    title: t("kpiPolicy"),
    value: formatNumber(dashboardCards.value.total_policies),
    current: dashboardCards.value.total_policies,
    previous: previousDashboardCards.value.total_policies,
    icon: "shield",
  }),
  buildQuickStatCard({
    key: "quick-gwp",
    title: t("kpiGwp"),
    value: formatCurrency(dashboardCards.value.total_gwp_try),
    current: dashboardCards.value.total_gwp_try,
    previous: previousDashboardCards.value.total_gwp_try,
    icon: "bar-chart-2",
  }),
  buildQuickStatCard({
    key: "quick-commission",
    title: t("kpiCommission"),
    value: formatCurrency(dashboardCards.value.total_commission),
    current: dashboardCards.value.total_commission,
    previous: previousDashboardCards.value.total_commission,
    icon: "percent",
  }),
  buildQuickStatCard({
    key: "quick-renewal",
    title: t("kpiRenewal"),
    value: formatNumber(dashboardCards.value.pending_renewals),
    current: dashboardCards.value.pending_renewals,
    previous: previousDashboardCards.value.pending_renewals,
    icon: "alert-triangle",
    reverseTrend: true,
  }),
]);

function buildStaticQuickStatCard({ key, title, value, icon, hint = t("todaySnapshot") }) {
  return {
    key,
    title,
    value,
    trendText: "",
    trendClass: "text-slate-500",
    trendHint: hint,
    icon,
  };
}

const collectionQuickStatCards = computed(() => [
  buildQuickStatCard({
    key: "quick-collect",
    title: t("kpiCollect"),
    value: formatCurrency(dashboardCards.value.collected_try),
    current: dashboardCards.value.collected_try,
    previous: previousDashboardCards.value.collected_try,
    icon: "arrow-down-circle",
  }),
  buildQuickStatCard({
    key: "quick-payout",
    title: t("kpiPayout"),
    value: formatCurrency(dashboardCards.value.payout_try),
    current: dashboardCards.value.payout_try,
    previous: previousDashboardCards.value.payout_try,
    icon: "arrow-up-circle",
    reverseTrend: true,
  }),
  buildQuickStatCard({
    key: "quick-net",
    title: t("openDifference"),
    value: formatCurrency((dashboardCards.value.collected_try || 0) - (dashboardCards.value.payout_try || 0)),
    current: Number(dashboardCards.value.collected_try || 0) - Number(dashboardCards.value.payout_try || 0),
    previous: Number(previousDashboardCards.value.collected_try || 0) - Number(previousDashboardCards.value.payout_try || 0),
    icon: "activity",
  }),
  buildStaticQuickStatCard({
    key: "quick-reco-open",
    title: t("kpiReconciliationOpen"),
    value: formatNumber(reconciliationPreviewMetrics.value.open || 0),
    icon: "git-merge",
  }),
]);

const renewalQuickStatCards = computed(() => [
  quickStatCards.value.find((card) => card.key === "quick-renewal"),
  buildStaticQuickStatCard({
    key: "quick-renewal-retention",
    title: t("kpiRenewalRetention"),
    value: formatPercent(renewalRetentionSummary.value.rate),
    icon: "repeat",
    hint: `${t("renewalRetentionHint")} - ${formatNumber(renewalRetentionSummary.value.renewed)} / ${formatNumber(renewalRetentionSummary.value.lost)}`,
  }),
  buildStaticQuickStatCard({
    key: "quick-renewal-overdue",
    title: t("kpiRenewalOverdue"),
    value: formatNumber(renewalBucketCounts.value.overdue),
    icon: "alert-octagon",
  }),
  buildStaticQuickStatCard({
    key: "quick-renewal-due7",
    title: t("kpiRenewalDue7"),
    value: formatNumber(renewalBucketCounts.value.due7),
    icon: "clock",
  }),
  buildStaticQuickStatCard({
    key: "quick-renewal-due30",
    title: t("kpiRenewalDue30"),
    value: formatNumber(renewalBucketCounts.value.due30),
    icon: "calendar",
  }),
].filter(Boolean));

const visibleQuickStatCards = computed(() => {
  if (isCollectionsTab.value) return collectionQuickStatCards.value;
  if (isRenewalsTab.value) return renewalQuickStatCards.value;
  if (isDailyTab.value) return quickStatCards.value;
  if (isSalesTab.value) return quickStatCards.value.slice(0, 3);
  return quickStatCards.value;
});

const leadStatusSummary = computed(() => {
  const source = dashboardTabSeries.value.lead_status || dashboardData.value.lead_status || [];
  const map = {};
  for (const row of source) {
    map[row.status] = Number(row.total || 0);
  }

  const total = Object.values(map).reduce((sum, value) => sum + value, 0) || 1;

  return [
    { key: "Draft", label: t("draft"), value: map.Draft || 0, colorClass: "bg-amber-500" },
    { key: "Open", label: t("open"), value: map.Open || 0, colorClass: "bg-sky-500" },
    { key: "Replied", label: t("replied"), value: map.Replied || 0, colorClass: "bg-emerald-500" },
    { key: "Closed", label: t("closed"), value: map.Closed || 0, colorClass: "bg-slate-500" },
  ].map((entry) => ({
    ...entry,
    ratio: entry.value ? Math.max(6, Math.round((entry.value / total) * 100)) : 0,
  }));
});

const salesOfferStatusSummary = computed(() => {
  const rows = Array.isArray(dashboardTabSeries.value?.offer_status) ? dashboardTabSeries.value.offer_status : [];
  const totalsByStatus = {};
  for (const row of rows) {
    totalsByStatus[String(row?.status || "")] = Number(row?.total || 0);
  }
  const total = Object.values(totalsByStatus).reduce((sum, value) => sum + Number(value || 0), 0) || 1;
  const colorMap = {
    Draft: "bg-amber-500",
    Sent: "bg-sky-500",
    Accepted: "bg-emerald-500",
    Rejected: "bg-rose-500",
    Converted: "bg-indigo-500",
  };
  const labelMap = {
    Draft: t("draft"),
    Sent: t("statusSent"),
    Accepted: t("statusAccepted"),
    Rejected: t("statusRejected"),
    Converted: t("converted"),
  };
  const order = ["Draft", "Sent", "Accepted", "Converted", "Rejected"];
  return order
    .map((status) => ({
      key: status,
      label: labelMap[status] || status,
      value: Number(totalsByStatus[status] || 0),
      colorClass: colorMap[status] || "bg-slate-400",
    }))
    .filter((row) => row.value > 0)
    .map((row) => ({
      ...row,
      ratio: row.value ? Math.max(6, Math.round((row.value / total) * 100)) : 0,
    }));
});

const policyStatusSummary = computed(() => {
  const map = {};
  for (const row of policyStatusRows.value) {
    map[row.status] = {
      total: Number(row.total || 0),
      gwp: Number(row.total_gwp_try || 0),
    };
  }

  const total = Object.values(map).reduce((sum, item) => sum + item.total, 0) || 1;

  return [
    {
      key: "Active",
      label: t("statusActive"),
      value: map.Active?.total || 0,
      gwp: map.Active?.gwp || 0,
      colorClass: "bg-emerald-500",
    },
    {
      key: "KYT",
      label: t("statusKyt"),
      value: map.KYT?.total || 0,
      gwp: map.KYT?.gwp || 0,
      colorClass: "bg-sky-500",
    },
    {
      key: "IPT",
      label: t("statusIpt"),
      value: map.IPT?.total || 0,
      gwp: map.IPT?.gwp || 0,
      colorClass: "bg-rose-400",
    },
  ].map((entry) => ({
    ...entry,
    ratio: entry.value ? Math.max(6, Math.round((entry.value / total) * 100)) : 0,
  }));
});

const maxTrendValue = computed(() => {
  const values = commissionTrend.value.map((entry) => Number(entry.total_commission || 0));
  return Math.max(1, ...values);
});

const renewalStatusSummary = computed(() => {
  const serverRows = Array.isArray(dashboardTabSeries.value?.renewal_status) ? dashboardTabSeries.value.renewal_status : null;
  if (serverRows) {
    const counts = {
      Open: 0,
      "In Progress": 0,
      Done: 0,
      Cancelled: 0,
    };
    for (const row of serverRows) {
      const rawKey = String(row?.status || "");
      const key = rawKey === "Completed" ? "Done" : rawKey;
      if (key in counts) counts[key] = Number(row?.total || 0);
    }
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1;
    return [
      { key: "Open", label: t("open"), value: counts.Open, colorClass: "bg-amber-500" },
      { key: "In Progress", label: t("statusInProgress"), value: counts["In Progress"], colorClass: "bg-sky-500" },
      { key: "Done", label: t("statusCompleted"), value: counts.Done, colorClass: "bg-emerald-500" },
      { key: "Cancelled", label: t("statusCancelled"), value: counts.Cancelled, colorClass: "bg-rose-400" },
    ]
      .filter((row) => row.value > 0 || isRenewalsTab.value)
      .map((row) => ({
        ...row,
        ratio: row.value ? Math.max(6, Math.round((row.value / total) * 100)) : 0,
      }));
  }
  const counts = {
    Open: 0,
    "In Progress": 0,
    Done: 0,
    Cancelled: 0,
  };
  for (const task of renewalTasks.value) {
    const rawStatus = String(task?.status || "");
    const status = rawStatus === "Completed" ? "Done" : rawStatus;
    if (status in counts) counts[status] += 1;
  }
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1;
  return [
    { key: "Open", label: t("open"), value: counts.Open, colorClass: "bg-amber-500" },
    { key: "In Progress", label: t("statusInProgress"), value: counts["In Progress"], colorClass: "bg-sky-500" },
    { key: "Done", label: t("statusCompleted"), value: counts.Done, colorClass: "bg-emerald-500" },
    { key: "Cancelled", label: t("statusCancelled"), value: counts.Cancelled, colorClass: "bg-rose-400" },
  ]
    .filter((row) => row.value > 0 || isRenewalsTab.value)
    .map((row) => ({
      ...row,
      ratio: row.value ? Math.max(6, Math.round((row.value / total) * 100)) : 0,
    }));
});

const quickActions = computed(() => [
  {
    key: "offers",
    label: t("quickOffer"),
    description: t("quickOfferDesc"),
    to: "/offers",
  },
  {
    key: "policies",
    label: t("quickPolicy"),
    description: t("quickPolicyDesc"),
    to: "/policies",
  },
  {
    key: "claims",
    label: t("quickClaim"),
    description: t("quickClaimDesc"),
    to: "/claims",
  },
  {
    key: "payments",
    label: t("quickPayment"),
    description: t("quickPaymentDesc"),
    to: "/payments",
  },
  {
    key: "renewals",
    label: t("quickRenewal"),
    description: t("quickRenewalDesc"),
    to: "/renewals",
  },
  {
    key: "communication",
    label: t("quickCommunication"),
    description: t("quickCommunicationDesc"),
    to: "/communication",
  },
  {
    key: "reconciliation",
    label: t("quickReconciliation"),
    description: t("quickReconciliationDesc"),
    to: "/reconciliation",
  },
]);

const visibleQuickActions = computed(() => {
  const actionMap = new Map(quickActions.value.map((action) => [action.key, action]));
  const pick = (keys) => keys.map((key) => actionMap.get(key)).filter(Boolean);
  if (isSalesTab.value) return pick(["offers", "policies", "communication"]);
  if (isCollectionsTab.value) return pick(["payments", "reconciliation", "communication"]);
  if (isRenewalsTab.value) return pick(["renewals", "offers", "policies", "communication"]);
  if (isDailyTab.value) return pick(["offers", "renewals", "claims", "payments", "communication"]);
  return pick(["offers", "renewals", "claims", "payments", "communication"]);
});

function buildKpiParams() {
  const range = getDateRange(selectedRange.value);
  return withOfficeBranchFilter({
    filters: {
      from_date: formatDate(range.from),
      to_date: formatDate(range.to),
      period_comparison: "previous_period",
      months: 6,
    },
  });
}

function buildTabPayloadParams(tabKey = activeDashboardTab.value) {
  const normalizedTab = normalizeDashboardTab(tabKey);
  const currentRange = getDateRange(selectedRange.value);
  const previousRange = getPreviousDateRange(selectedRange.value);
  return withOfficeBranchFilter({
    tab: normalizedTab,
    filters: {
      from_date: formatDate(currentRange.from),
      to_date: formatDate(currentRange.to),
      compare_from_date: formatDate(previousRange.from),
      compare_to_date: formatDate(previousRange.to),
      months: 6,
    },
  });
}

function withOfficeBranchFilter(params) {
  const officeBranch = branchStore.requestBranch;
  if (!officeBranch) {
    return params;
  }
  const next = { ...(params || {}) };
  const filters = { ...(next.filters || {}) };
  filters.office_branch = officeBranch;
  next.filters = filters;
  return next;
}

function getDateRange(days) {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - days);
  return { from, to };
}

function getPreviousDateRange(days) {
  const current = getDateRange(days);
  const to = new Date(current.from);
  to.setDate(to.getDate() - 1);
  const from = new Date(to);
  from.setDate(to.getDate() - days);
  return { from, to };
}

function buildQuickStatCard({ key, title, value, current, previous, icon, reverseTrend = false, trendHint }) {
  const trend = buildTrend(current, previous, reverseTrend);
  return {
    key,
    title,
    value,
    trendText: trend.text,
    trendClass: trend.className,
    trendHint: trendHint || dashboardComparisonTrendHint.value,
    icon,
  };
}

function buildTrend(currentValue, previousValue, reverseTrend = false) {
  const current = Number(currentValue || 0);
  const previous = Number(previousValue || 0);
  if (!previous && !current) {
    return { text: "0%", className: "text-slate-500" };
  }
  if (!previous && current) {
    return {
      text: "+100%",
      className: reverseTrend ? "text-rose-600" : "text-emerald-600",
    };
  }

  const rawPercent = ((current - previous) / Math.abs(previous)) * 100;
  const rounded = Math.round(rawPercent * 10) / 10;
  const positive = reverseTrend ? rounded <= 0 : rounded >= 0;
  const sign = rounded > 0 ? "+" : "";
  return {
    text: `${sign}${new Intl.NumberFormat(localeCode.value, { maximumFractionDigits: 1 }).format(rounded)}%`,
    className: positive ? "text-emerald-600" : "text-rose-600",
  };
}

function formatDate(dateValue) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMonthKey(monthKey) {
  if (!monthKey) return "-";
  const [year, month] = monthKey.split("-");
  if (!year || !month) return monthKey;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat(localeCode.value, { month: "short", year: "2-digit" }).format(date);
}

function formatNumber(value) {
  return new Intl.NumberFormat(localeCode.value).format(Number(value || 0));
}

function formatCurrency(value) {
  return formatCurrencyBy(value, "TRY");
}

function formatCurrencyBy(value, currency) {
  return new Intl.NumberFormat(localeCode.value, {
    style: "currency",
    currency: currency || "TRY",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function topCompanyFacts(company) {
  return [
    {
      key: "policyCount",
      label: t("policyCount"),
      value: formatNumber(company?.policy_count),
      valueClass: "text-xs text-slate-500",
    },
    {
      key: "grossProduction",
      label: t("grossProduction"),
      value: formatCurrency(company?.total_gwp_try),
      valueClass: "text-xs text-slate-500",
    },
  ];
}

function renewalTaskFacts(task) {
  return [
    {
      key: "dueDate",
      label: t("dueDate"),
      value: formatDate(task?.due_date),
      valueClass: "text-xs text-slate-500",
    },
  ];
}

function renewalTaskFactsDetailed(task) {
  return [
    {
      key: "dueDate",
      label: t("dueDate"),
      value: formatDate(task?.due_date),
      valueClass: "text-xs text-slate-500",
    },
    {
      key: "renewalDate",
      label: t("renewalDate"),
      value: formatDate(task?.renewal_date),
      valueClass: "text-xs text-slate-500",
    },
  ];
}

function renewalAlertFacts(task) {
  return [
    { label: t("dueDate"), value: formatDate(task.due_date) },
    { label: t("renewalDate"), value: formatDate(task.renewal_date) },
  ];
}

function dashboardPaymentFacts(payment) {
  return [
    {
      key: "paymentDate",
      label: t("paymentDate"),
      value: formatDate(payment?.payment_date),
      valueClass: "text-xs text-slate-500",
    },
    {
      key: "customer",
      label: t("customer"),
      value: payment?.customer || "-",
      valueClass: "text-xs text-slate-500",
    },
    {
      key: "policy",
      label: t("policyLabel"),
      value: payment?.policy || "-",
      valueClass: "text-xs text-slate-500",
    },
  ];
}

function dashboardReconciliationFacts(row) {
  return [
    {
      key: "type",
      label: t("reconciliationType"),
      value: row?.mismatch_type || "-",
      valueClass: "text-xs text-slate-500",
    },
    {
      key: "difference",
      label: t("difference"),
      value: formatCurrency(row?.difference_try || 0),
      valueClass: "text-xs text-slate-500",
    },
  ];
}

function followUpTypeLabel(type) {
  if (type === "claim") return t("followUpTypeClaim");
  if (type === "renewal") return t("followUpTypeRenewal");
  if (type === "assignment") return t("followUpTypeAssignment");
  if (type === "call_note") return t("followUpTypeCallNote");
  return type || "-";
}

function followUpTitle(item) {
  return item?.source_name || "-";
}

function followUpDescription(item) {
  const delta = Number(item?.days_delta ?? 0);
  if (delta < 0) return `${t("followUpDeltaOverdue")} ${Math.abs(delta)} ${t("followUpDeltaDays")}`;
  if (delta === 0) return t("followUpDeltaToday");
  return `${delta} ${t("followUpDeltaDays")}`;
}

function followUpFacts(item) {
  return [
    { label: t("customer"), value: item?.customer || "-" },
    { label: t("status"), value: item?.status || "-" },
    { label: t("followUpDate"), value: formatDate(item?.follow_up_on) },
    ...(item?.assigned_to ? [{ label: t("followUpAssignee"), value: item.assigned_to }] : []),
  ];
}

function openFollowUpItem(item) {
  const sourceType = String(item?.source_type || "");
  const sourceName = String(item?.source_name || "");
  if (!sourceName) {
    return;
  }
  if (sourceType === "claim") {
    router.push({ name: "claims", query: { claim: sourceName } });
    return;
  }
  if (sourceType === "renewal") {
    router.push({ name: "renewals", query: { task: sourceName } });
    return;
  }
  if (sourceType === "assignment" || sourceType === "call_note") {
    router.push({
      path: "/communication",
      query: {
        reference_doctype: sourceType === "assignment" ? "AT Ownership Assignment" : "AT Call Note",
        reference_name: sourceName,
      },
    });
    return;
  }
}

function recentLeadFacts(lead) {
  return [
    { label: t("email"), value: lead.email || "-" },
    {
      label: t("estPremium"),
      value: formatCurrency(lead.estimated_gross_premium || 0),
    },
  ];
}

function recentPolicyFacts(policy) {
  return [
    {
      key: "customer",
      label: t("customer"),
      value: policy?.customer || "-",
      valueClass: "text-xs text-slate-500",
    },
    {
      key: "issueDate",
      label: t("issueDate"),
      value: policy?.issue_date || "-",
      valueClass: "text-xs text-slate-500",
    },
  ];
}

function recentOfferFacts(offer) {
  return [
    {
      key: "customer",
      label: t("customer"),
      value: offer?.customer || "-",
      valueClass: "text-xs text-slate-500",
    },
    {
      key: "validUntil",
      label: t("validUntil"),
      value: offer?.valid_until || "-",
      valueClass: "text-xs text-slate-500",
    },
  ];
}

function formatPercent(value) {
  return `${new Intl.NumberFormat(localeCode.value, { maximumFractionDigits: 2 }).format(Number(value || 0))}%`;
}

function formatDaysToDue(dateValue) {
  if (!dateValue) return "-";
  const days = daysUntil(dateValue);
  if (days == null) return "-";
  if (days < 0) return `+${Math.abs(days)}d`;
  return `${days}d`;
}

function daysUntil(dateValue) {
  if (!dateValue) return null;
  const due = new Date(dateValue);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function trendRatio(value) {
  const numericValue = Number(value || 0);
  if (numericValue <= 0) return 0;
  return Math.max(4, Math.round((numericValue / maxTrendValue.value) * 100));
}

function rangeLabel(days) {
  return `${days}d`;
}

function setDashboardTab(tabKey) {
  const nextTab = normalizeDashboardTab(tabKey);
  const nextQuery = { ...route.query };
  if (nextTab === "daily") {
    delete nextQuery.tab;
  } else {
    nextQuery.tab = nextTab;
  }
  router.replace({ name: "dashboard", query: nextQuery });
}

function triggerDashboardReload({ includeKpis = true, immediate = false } = {}) {
  const runReload = () => {
    dashboardReloadTimer = null;
    dashboardTabPayloadResource.params = buildTabPayloadParams();
    dashboardTabPayloadResource.reload();
    followUpResource.params = withOfficeBranchFilter({ filters: {} });
    followUpResource.reload();
    if (includeKpis) {
      kpiResource.params = buildKpiParams();
      kpiResource.reload();
    }
  };

  if (immediate) {
    if (dashboardReloadTimer) {
      window.clearTimeout(dashboardReloadTimer);
      dashboardReloadTimer = null;
    }
    runReload();
    return;
  }

  if (dashboardReloadTimer) {
    window.clearTimeout(dashboardReloadTimer);
  }
  dashboardReloadTimer = window.setTimeout(runReload, DASHBOARD_RELOAD_DEBOUNCE_MS);
}

function applyRange(days) {
  selectedRange.value = days;
  triggerDashboardReload();
}

function resetLeadForm() {
  newLead.first_name = "";
  newLead.last_name = "";
  newLead.email = "";
  newLead.estimated_gross_premium = "";
  newLead.notes = "";
}

async function createLead() {
  try {
    isSubmitting.value = true;
    await createLeadResource.submit({
      doc: {
        doctype: "AT Lead",
        first_name: newLead.first_name,
        last_name: newLead.last_name,
        email: newLead.email,
        estimated_gross_premium: Number(newLead.estimated_gross_premium || 0),
        notes: newLead.notes,
        status: "Open",
      },
    });
    showLeadDialog.value = false;
    resetLeadForm();
    triggerDashboardReload({ immediate: true });
  } finally {
    isSubmitting.value = false;
  }
}

function openPage(path) {
  router.push(path);
}

function reloadData() {
  triggerDashboardReload({ immediate: true });
}

function isPermissionDeniedError(error) {
  const status = Number(
    error?.statusCode ??
      error?.status ??
      error?.httpStatus ??
      error?.response?.status ??
      0
  );
  const text = String(error?.message || error?.messages?.join(" ") || error?.exc_type || "").toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    text.includes("permission") ||
    text.includes("not permitted") ||
    text.includes("not authorized")
  );
}

watch(
  () => kpiResource.data,
  (payload) => {
    dashboardStore.setKpiPayload(payload || {});
  },
  { immediate: true }
);

watch(
  () => dashboardTabPayloadResource.data,
  (payload) => {
    dashboardStore.setTabPayload(payload || {});
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

onBeforeUnmount(() => {
  if (dashboardReloadTimer) {
    window.clearTimeout(dashboardReloadTimer);
    dashboardReloadTimer = null;
  }
});
</script>

