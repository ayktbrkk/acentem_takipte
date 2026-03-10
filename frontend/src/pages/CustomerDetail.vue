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

    <article class="surface-card rounded-2xl p-4 md:hidden">
      <SectionCardHeader :title="t('mobileQuickActionsTitle')" :show-count="false" />
      <div class="mt-3 grid grid-cols-2 gap-2">
        <ActionButton variant="primary" size="sm" @click="openQuickOfferForCustomer">
          {{ t("newOffer") }}
        </ActionButton>
        <ActionButton variant="secondary" size="sm" @click="openCommunicationCenterForCustomer">
          {{ t("communication") }}
        </ActionButton>
        <ActionButton variant="secondary" size="sm" @click="openCustomerDocuments">
          {{ t("documents") }}
        </ActionButton>
        <ActionButton variant="secondary" size="sm" @click="openQuickCustomerRelation">
          {{ t("newRelation") }}
        </ActionButton>
        <ActionButton variant="secondary" size="sm" @click="openQuickOwnershipAssignment">
          {{ t("newAssignment") }}
        </ActionButton>
      </div>
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
            <ActionButton variant="secondary" size="sm" @click="openCustomerDocuments">
              {{ t("documents") }}
            </ActionButton>
            <ActionButton variant="secondary" size="sm" :disabled="!activePolicies.length" @click="activePolicies[0] && openPolicyDetail(activePolicies[0].name)">
              {{ t("openPolicy") }}
            </ActionButton>
            <ActionButton variant="secondary" size="sm" @click="openCustomerRelations">
              {{ t("relatedCustomersTitle") }}
            </ActionButton>
            <ActionButton variant="secondary" size="sm" @click="openInsuredAssets">
              {{ t("insuredAssetsTitle") }}
            </ActionButton>
            <ActionButton variant="secondary" size="sm" @click="openQuickCustomerRelation">
              {{ t("newRelation") }}
            </ActionButton>
            <ActionButton variant="secondary" size="sm" @click="openQuickInsuredAsset">
              {{ t("newAsset") }}
            </ActionButton>
            <ActionButton variant="secondary" size="sm" @click="openQuickOwnershipAssignment">
              {{ t("newAssignment") }}
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
          v-if="activeCustomerTab === 'overview' || activeCustomerTab === 'activity'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('activitiesTitle')" :count="activityRows.length" />
          <div v-if="customerLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="activityRows.length === 0" class="at-empty-block">
            {{ t("noActivity") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2">
            <EntityPreviewCard
              v-for="activity in activityRows"
              :key="activity.name"
              :title="activity.activity_title || activity.activity_type || activity.name"
              :subtitle="activity.activity_type || '-'"
            >
              <template #trailing>
                <StatusBadge type="generic" :status="activity.status" />
              </template>
              <MiniFactList class="mt-2" :items="activityCardFacts(activity)" />
            </EntityPreviewCard>
          </div>
        </article>

        <article
          v-if="activeCustomerTab === 'overview' || activeCustomerTab === 'activity'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('remindersTitle')" :count="reminderRows.length" />
          <div v-if="customerLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="reminderRows.length === 0" class="at-empty-block">
            {{ t("noReminder") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2">
            <EntityPreviewCard
              v-for="reminder in reminderRows"
              :key="reminder.name"
              :title="reminder.reminder_title || reminder.name"
              :subtitle="reminder.status || '-'"
            >
              <template #trailing>
                <StatusBadge type="generic" :status="reminder.status" />
              </template>
              <MiniFactList class="mt-2" :items="reminderCardFacts(reminder)" />
            </EntityPreviewCard>
          </div>
        </article>

        <article
          v-if="activeCustomerTab === 'overview' || activeCustomerTab === 'portfolio'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('activePoliciesTitle')" :count="activePolicies.length" />
          <div v-if="customerLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
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
          <div v-if="customerLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div
            v-else-if="openOffers.length === 0"
            class="at-empty-block"
          >
            {{ t("noOpenOffer") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2 [&>*:nth-child(n+3)]:hidden md:[&>*:nth-child(n+3)]:block">
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
          v-if="activeCustomerTab === 'overview' || activeCustomerTab === 'portfolio'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('paymentSummaryTitle')" :count="paymentPreviewRows.length" />
          <div v-if="customerLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="paymentPreviewRows.length === 0" class="at-empty-block">
            {{ t("noPaymentHistory") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2 [&>*:nth-child(n+3)]:hidden md:[&>*:nth-child(n+3)]:block">
            <EntityPreviewCard
              v-for="payment in paymentPreviewRows"
              :key="payment.name"
              :title="payment.payment_no || payment.name"
              :subtitle="payment.policy || '-'"
            >
              <template #trailing>
                <StatusBadge type="payment" :status="payment.status" />
              </template>
              <MiniFactList class="mt-2" :items="paymentCardFacts(payment)" />
            </EntityPreviewCard>
          </div>
        </article>

        <article
          v-if="activeCustomerTab === 'overview' || activeCustomerTab === 'portfolio'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('claimsTitle')" :count="claimPreviewRows.length" />
          <div v-if="customerLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="claimPreviewRows.length === 0" class="at-empty-block">
            {{ t("noClaims") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2">
            <EntityPreviewCard
              v-for="claim in claimPreviewRows"
              :key="claim.name"
              :title="claim.name"
              :subtitle="claim.policy || '-'"
            >
              <template #trailing>
                <StatusBadge type="claim" :status="claim.claim_status" />
              </template>
              <MiniFactList class="mt-2" :items="claimCardFacts(claim)" />
            </EntityPreviewCard>
          </div>
        </article>

        <article
          v-if="activeCustomerTab === 'overview' || activeCustomerTab === 'operations'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('renewalsTitle')" :count="renewalPreviewRows.length" />
          <div v-if="customerLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="renewalPreviewRows.length === 0" class="at-empty-block">
            {{ t("noUpcomingRenewal") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2">
            <EntityPreviewCard
              v-for="renewal in renewalPreviewRows"
              :key="renewal.name"
              :title="renewal.policy || renewal.name"
              :subtitle="renewal.competitor_name || '-'"
            >
              <template #trailing>
                <StatusBadge type="renewal" :status="renewal.status" />
              </template>
              <MiniFactList class="mt-2" :items="renewalCardFacts(renewal)" />
            </EntityPreviewCard>
          </div>
        </article>

        <article
          v-if="activeCustomerTab === 'overview' || activeCustomerTab === 'operations'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('insightSummaryTitle')" :show-count="false" />
          <div class="grid gap-3 md:grid-cols-3">
            <MetaListCard
              :title="t('segment')"
              :description="t('segmentScore')"
              :meta="customer360Insights.segment || '-'"
            />
            <MetaListCard
              :title="t('score')"
              :description="t('customerValueScore')"
              :meta="String(customer360Insights.score ?? '-')"
            />
            <MetaListCard
              :title="t('claimRisk')"
              :description="t('claimRiskHint')"
              :meta="customer360Insights.claim_risk || '-'"
            />
            <MetaListCard
              :title="t('valueBand')"
              :description="t('valueBandHint')"
              :meta="valueBandLabel"
            />
          </div>
          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <MetaListCard
              :title="t('portfolioStrengths')"
              :description="t('strengthSignalsHint')"
              :meta="insightStrengthRows.join(' / ') || t('noStrengthSignal')"
            />
            <MetaListCard
              :title="t('portfolioRisks')"
              :description="t('riskSignalsHint')"
              :meta="insightRiskRows.join(' / ') || t('noRiskSignal')"
            />
          </div>
          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <MetaListCard
              :title="t('snapshotDate')"
              :description="t('segmentSnapshotHint')"
              :meta="formatDate(customer360Insights.snapshot_date)"
            />
            <MetaListCard
              :title="t('sourceVersion')"
              :description="t('segmentSourceVersionHint')"
              :meta="customer360Insights.source_version || '-'"
            />
          </div>
        </article>

        <article
          v-if="activeCustomerTab === 'overview' || activeCustomerTab === 'operations'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('assignmentsTitle')" :count="ownershipAssignmentRows.length" />
          <div v-if="ownershipAssignmentRows.length === 0" class="at-empty-block">
            {{ t("noAssignment") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2">
            <MetaListCard
              v-for="assignment in ownershipAssignmentRows"
              :key="assignment.name"
              :title="assignment.assigned_to || '-'"
              :description="assignment.assignment_role || '-'"
              :meta="assignment.priority || '-'"
            >
              <template #trailing>
                <div class="flex items-center gap-2">
                  <ActionButton variant="secondary" size="xs" @click.stop="openEditOwnershipAssignment(assignment)">
                    {{ t("edit") }}
                  </ActionButton>
                  <ActionButton variant="secondary" size="xs" @click.stop="deleteOwnershipAssignment(assignment)">
                    {{ t("delete") }}
                  </ActionButton>
                </div>
              </template>
              <p class="mt-2 text-xs text-slate-500">{{ assignmentSummaryLabel(assignment) }}</p>
            </MetaListCard>
          </div>
        </article>

        <article
          v-if="activeCustomerTab === 'overview' || activeCustomerTab === 'operations'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('crossSellTitle')" :count="crossSellOpportunityRows.length" />
          <div v-if="crossSellOpportunityRows.length === 0" class="at-empty-block">
            {{ t("noCrossSellOpportunity") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2">
            <MetaListCard
              v-for="item in crossSellOpportunityRows"
              :key="item.branch"
              :title="item.branch"
              :description="t('crossSellOpportunityHint')"
              :meta="t('crossSellOpportunityMeta')"
            />
          </div>
        </article>

        <article
          v-if="activeCustomerTab === 'overview' || activeCustomerTab === 'operations'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('relatedCustomersTitle')" :count="relatedCustomerRows.length" />
          <div v-if="relatedCustomerRows.length === 0" class="at-empty-block">
            {{ t("noRelatedCustomer") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2">
            <MetaListCard
              v-for="relation in relatedCustomerRows"
              :key="relation.name"
              :title="relation.related_customer"
              :description="relation.relation_type || '-'"
              :meta="relation.is_household ? t('sameHousehold') : '-'"
            >
                <template #trailing>
                  <div class="flex items-center gap-2">
                    <ActionButton variant="secondary" size="xs" @click.stop="openEditCustomerRelation(relation)">
                      {{ t("edit") }}
                    </ActionButton>
                    <ActionButton variant="secondary" size="xs" @click.stop="deleteCustomerRelation(relation)">
                      {{ t("delete") }}
                    </ActionButton>
                  </div>
                </template>
              </MetaListCard>
          </div>
        </article>

        <article
          v-if="activeCustomerTab === 'overview' || activeCustomerTab === 'operations'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('documentsTitle')" :show-count="false" />
          <div class="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetaListCard :label="t('totalDocuments')" :value="String(customerDocumentProfile.total_files || 0)" />
            <MetaListCard :label="t('pdfDocuments')" :value="String(customerDocumentProfile.pdf_count || 0)" />
            <MetaListCard :label="t('imageDocuments')" :value="String(customerDocumentProfile.image_count || 0)" />
            <MetaListCard :label="t('spreadsheetDocuments')" :value="String(customerDocumentProfile.spreadsheet_count || 0)" />
            <MetaListCard :label="t('otherDocuments')" :value="String(customerDocumentProfile.other_count || 0)" />
            <MetaListCard :label="t('lastUpload')" :value="formatDate(customerDocumentProfile.last_uploaded_on)" />
          </div>
        </article>

        <article
          v-if="activeCustomerTab === 'overview' || activeCustomerTab === 'portfolio'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('insuredAssetsTitle')" :count="insuredAssetRows.length" />
          <div v-if="insuredAssetRows.length === 0" class="at-empty-block">
            {{ t("noInsuredAsset") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2">
            <EntityPreviewCard
              v-for="asset in insuredAssetRows"
              :key="asset.policy"
              :title="asset.policy_no || asset.policy"
              :subtitle="asset.insurance_company || '-'"
              >
                <template #trailing>
                  <StatusBadge type="policy" :status="asset.status" />
                </template>
                <MiniFactList class="mt-2" :items="insuredAssetFacts(asset)" />
                <template #footer>
                  <div class="flex items-center gap-2">
                    <ActionButton variant="secondary" size="xs" @click="openEditInsuredAsset(asset)">
                      {{ t("edit") }}
                    </ActionButton>
                    <ActionButton variant="secondary" size="xs" @click="deleteInsuredAsset(asset)">
                      {{ t("delete") }}
                    </ActionButton>
                  </div>
                </template>
              </EntityPreviewCard>
            </div>
          </article>

        <article
          v-if="activeCustomerTab === 'overview' || activeCustomerTab === 'activity'"
          class="surface-card rounded-2xl p-5"
        >
          <SectionCardHeader :title="t('communicationSummaryTitle')" :count="communicationChannelRows.length" />
          <div v-if="customerLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="communicationChannelRows.length === 0" class="at-empty-block">
            {{ t("noCommunicationSummary") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2">
            <MetaListCard
              v-for="channel in communicationChannelRows"
              :key="channel.channel"
              :title="channel.channel"
              :description="t('communicationChannelCount')"
              :meta="String(channel.total)"
            />
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
    <QuickCreateManagedDialog
      v-model="showCustomerRelationDialog"
      config-key="customer_relation"
      :locale="activeLocale"
      :options-map="customer360QuickOptionsMap"
      :before-open="prepareCustomerRelationDialog"
      :success-handlers="customer360QuickSuccessHandlers"
    />

    <QuickCreateManagedDialog
      v-model="showInsuredAssetDialog"
      config-key="insured_asset"
      :locale="activeLocale"
      :options-map="customer360QuickOptionsMap"
      :before-open="prepareInsuredAssetDialog"
      :success-handlers="customer360QuickSuccessHandlers"
    />

    <QuickCreateManagedDialog
      v-model="showCustomerRelationEditDialog"
      config-key="customer_relation_edit"
      :locale="activeLocale"
      :options-map="customer360QuickOptionsMap"
      :before-open="prepareCustomerRelationEditDialog"
      :success-handlers="customer360QuickSuccessHandlers"
    />

    <QuickCreateManagedDialog
      v-model="showInsuredAssetEditDialog"
      config-key="insured_asset_edit"
      :locale="activeLocale"
      :options-map="customer360QuickOptionsMap"
      :before-open="prepareInsuredAssetEditDialog"
      :success-handlers="customer360QuickSuccessHandlers"
    />

    <QuickCreateManagedDialog
      v-model="showOwnershipAssignmentDialog"
      config-key="ownership_assignment"
      :locale="activeLocale"
      :options-map="customer360QuickOptionsMap"
      :before-open="prepareOwnershipAssignmentDialog"
      :success-handlers="customer360QuickSuccessHandlers"
    />

    <QuickCreateManagedDialog
      v-model="showOwnershipAssignmentEditDialog"
      config-key="ownership_assignment_edit"
      :locale="activeLocale"
      :options-map="customer360QuickOptionsMap"
      :before-open="prepareOwnershipAssignmentEditDialog"
      :success-handlers="customer360QuickSuccessHandlers"
    />
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref, unref, watch } from "vue";
import { useRouter } from "vue-router";
import { createResource } from "frappe-ui";

import { deskActionsEnabled } from "../utils/deskActions";
import { useAuthStore } from "../stores/auth";
import ActionButton from "../components/app-shell/ActionButton.vue";
import DetailActionRow from "../components/app-shell/DetailActionRow.vue";
import DetailTabsBar from "../components/app-shell/DetailTabsBar.vue";
import DocHeaderCard from "../components/app-shell/DocHeaderCard.vue";
import DocSummaryGrid from "../components/app-shell/DocSummaryGrid.vue";
import EntityPreviewCard from "../components/app-shell/EntityPreviewCard.vue";
import MetaListCard from "../components/app-shell/MetaListCard.vue";
import MiniFactList from "../components/app-shell/MiniFactList.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import SectionCardHeader from "../components/app-shell/SectionCardHeader.vue";
import StatusBadge from "../components/StatusBadge.vue";
import { buildQuickCreateIntentQuery } from "../utils/quickRouteIntent";

const props = defineProps({
  name: {
    type: String,
    default: "",
  },
});

const router = useRouter();
const authStore = useAuthStore();
const activeLocale = computed(() => unref(authStore.locale) || "en");
const activeCustomerTab = ref("overview");

const copy = {
  tr: {
    overview: "Musteri 360",
    openDesk: "Yonetim Ekraninda Ac",
    newOffer: "Yeni Teklif",
    communication: "Iletisim",
    newRelation: "Yeni Iliski",
    newAsset: "Yeni Varlik",
    newAssignment: "Yeni Atama",
    edit: "Duzenle",
    delete: "Sil",
    deleteRelationConfirm: "Bu iliski kaydi silinsin mi?",
    deleteAssetConfirm: "Bu varlik kaydi silinsin mi?",
    deleteAssignmentConfirm: "Bu atama kaydi silinsin mi?",
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
    segment: "Segment",
    score: "Skor",
    customerValueScore: "Musteri deger puani",
    claimRisk: "Hasar Riski",
    claimRiskHint: "Acil risk seviyesi",
    segmentScore: "Portfoy segmenti",
    valueBand: "Deger Bandı",
    valueBandHint: "Portfoy prim seviyesine gore deger sinifi",
    portfolioStrengths: "Guclu Sinyaller",
    portfolioRisks: "Risk Sinyalleri",
    strengthSignalsHint: "Musteri portfoyunu guclendiren faktorler",
    riskSignalsHint: "Takip gerektiren risk baskilari",
    noStrengthSignal: "Belirgin pozitif sinyal bulunamadi.",
    noRiskSignal: "Belirgin risk sinyali bulunamadi.",
    snapshotDate: "Snapshot Tarihi",
    sourceVersion: "Kaynak Surumu",
    segmentSnapshotHint: "Segment gorunumu son hesaplanan gune aittir",
    segmentSourceVersionHint: "Skor kurali surumu",
    valueBandHighValue: "Yuksek Deger",
    valueBandMidValue: "Orta Deger",
    valueBandStandard: "Standart",
    insightSignalMultiPolicy: "Coklu aktif police portfoyu",
    insightSignalActivePortfolio: "Aktif police portfoyu",
    insightSignalHighPremium: "Yuksek premium katkisi",
    insightSignalMediumPremium: "Orta premium katkisi",
    insightSignalCleanClaims: "Temiz hasar gorunumu",
    insightSignalRenewalPipeline: "Yaklasan yenileme firsati",
    insightRiskClaimPressure: "Hasar baskisi yuksek",
    insightRiskCollectionRisk: "Tahsilat riski yuksek",
    insightRiskOverduePayment: "Geciken tahsilat var",
    insightRiskCancellationHistory: "Iptal gecmisi dikkat gerektiriyor",
    activePoliciesTitle: "Aktif Policeler",
    noActivePolicy: "Aktif police kaydi bulunamadi.",
    paymentSummaryTitle: "Odeme Ozeti",
    noPaymentHistory: "Odeme kaydi bulunamadi.",
    paymentDate: "Odeme Tarihi",
    overdueInstallments: "Geciken Taksit",
    claimsTitle: "Hasarlar",
    noClaims: "Hasar kaydi bulunamadi.",
    reportedDate: "Bildirim Tarihi",
    claimAmount: "Hasar Tutari",
    renewalsTitle: "Yaklasan Yenilemeler",
    noUpcomingRenewal: "Yaklasan yenileme bulunamadi.",
    dueDate: "Vade",
    lostReason: "Kayip Sebebi",
    communicationSummaryTitle: "Iletisim Kanal Ozeti",
    noCommunicationSummary: "Iletisim ozeti bulunamadi.",
    communicationChannelCount: "Kanal toplam kaydi",
    insightSummaryTitle: "Musteri Icgoruleri",
    crossSellTitle: "Capraz Satis Firsatlari",
    noCrossSellOpportunity: "Ek capraz satis firsati bulunamadi.",
    crossSellOpportunityHint: "Eksik urun/branş firsati",
    crossSellOpportunityMeta: "Aksiyon onerisi",
    relatedCustomersTitle: "Iliskili Kisiler",
    noRelatedCustomer: "Iliskili kisi kaydi bulunamadi.",
    sameHousehold: "Ayni hane",
    insuredAssetsTitle: "Sigortalanan Varliklar",
    assignmentsTitle: "Atamalar",
    activitiesTitle: "Aktiviteler",
    remindersTitle: "Hatirlaticilar",
    noAssignment: "Atama kaydi yok.",
    noActivity: "Aktivite kaydi yok.",
    noReminder: "Hatirlatici kaydi yok.",
    reminderAt: "Hatirlatma",
    reminderPriority: "Oncelik",
    noInsuredAsset: "Sigortalanan varlik bulunamadi.",
    assetType: "Varlik Turu",
    assetIdentifier: "Varlik Kimligi",
    policyBranch: "Brans",
    endDate: "Bitis",
    openPolicy: "Police Detayi",
    openOffersTitle: "Acik Teklifler",
    noOpenOffer: "Acik teklif bulunamadi.",
    validUntil: "Gecerlilik",
    grossPremium: "Brut Prim",
    operationsTitle: "Operasyonlar",
    documents: "Dokumanlar",
    documentsTitle: "Dokuman Ozeti",
    totalDocuments: "Toplam Dokuman",
    pdfDocuments: "PDF",
    imageDocuments: "Gorsel",
    spreadsheetDocuments: "Tablo",
    otherDocuments: "Diger",
    lastUpload: "Son Yukleme",
    mobileQuickActionsTitle: "Hizli Islemler",
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
    newRelation: "New Relation",
    newAsset: "New Asset",
    newAssignment: "New Assignment",
    edit: "Edit",
    delete: "Delete",
    deleteRelationConfirm: "Delete this relation record?",
    deleteAssetConfirm: "Delete this asset record?",
    deleteAssignmentConfirm: "Delete this assignment record?",
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
    segment: "Segment",
    score: "Score",
    customerValueScore: "Customer value score",
    claimRisk: "Claim Risk",
    claimRiskHint: "Current risk level",
    segmentScore: "Portfolio segment",
    valueBand: "Value Band",
    valueBandHint: "Value tier based on portfolio premium level",
    portfolioStrengths: "Strength Signals",
    portfolioRisks: "Risk Signals",
    strengthSignalsHint: "Factors that strengthen the customer portfolio",
    riskSignalsHint: "Risk pressure points that need follow-up",
    noStrengthSignal: "No major positive signal found.",
    noRiskSignal: "No major risk signal found.",
    snapshotDate: "Snapshot Date",
    sourceVersion: "Source Version",
    segmentSnapshotHint: "Segment view reflects the latest calculated business date",
    segmentSourceVersionHint: "Scoring rule version",
    valueBandHighValue: "High Value",
    valueBandMidValue: "Mid Value",
    valueBandStandard: "Standard",
    insightSignalMultiPolicy: "Multiple active policies",
    insightSignalActivePortfolio: "Active policy portfolio",
    insightSignalHighPremium: "High premium contribution",
    insightSignalMediumPremium: "Medium premium contribution",
    insightSignalCleanClaims: "Clean claims outlook",
    insightSignalRenewalPipeline: "Upcoming renewal opportunity",
    insightRiskClaimPressure: "High claim pressure",
    insightRiskCollectionRisk: "High collection risk",
    insightRiskOverduePayment: "Overdue collection exists",
    insightRiskCancellationHistory: "Cancellation history needs attention",
    activePoliciesTitle: "Active Policies",
    noActivePolicy: "No active policies found.",
    paymentSummaryTitle: "Payment Summary",
    noPaymentHistory: "No payment records found.",
    paymentDate: "Payment Date",
    overdueInstallments: "Overdue Installments",
    claimsTitle: "Claims",
    noClaims: "No claims found.",
    reportedDate: "Reported Date",
    claimAmount: "Claim Amount",
    renewalsTitle: "Upcoming Renewals",
    noUpcomingRenewal: "No upcoming renewals found.",
    dueDate: "Due Date",
    lostReason: "Lost Reason",
    communicationSummaryTitle: "Communication Channel Summary",
    noCommunicationSummary: "No communication summary found.",
    communicationChannelCount: "Channel record count",
    insightSummaryTitle: "Customer Insights",
    crossSellTitle: "Cross-Sell Opportunities",
    noCrossSellOpportunity: "No additional cross-sell opportunity found.",
    crossSellOpportunityHint: "Missing product/branch opportunity",
    crossSellOpportunityMeta: "Recommended action",
    relatedCustomersTitle: "Related Customers",
    noRelatedCustomer: "No related customer records found.",
    sameHousehold: "Same household",
    insuredAssetsTitle: "Insured Assets",
    assignmentsTitle: "Assignments",
    activitiesTitle: "Activities",
    remindersTitle: "Reminders",
    noAssignment: "No assignments found.",
    noActivity: "No activities found.",
    noReminder: "No reminders found.",
    reminderAt: "Reminder At",
    reminderPriority: "Priority",
    noInsuredAsset: "No insured asset found.",
    assetType: "Asset Type",
    assetIdentifier: "Asset Identifier",
    policyBranch: "Branch",
    endDate: "End Date",
    openPolicy: "Policy Detail",
    openOffersTitle: "Open Offers",
    noOpenOffer: "No open offers found.",
    validUntil: "Valid Until",
    grossPremium: "Gross Premium",
    operationsTitle: "Operations",
    documents: "Documents",
    documentsTitle: "Document Summary",
    totalDocuments: "Total Documents",
    pdfDocuments: "PDF",
    imageDocuments: "Images",
    spreadsheetDocuments: "Spreadsheets",
    otherDocuments: "Other",
    lastUpload: "Last Upload",
    mobileQuickActionsTitle: "Quick Actions",
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
  return copy[activeLocale.value]?.[key] || copy.en[key] || key;
}

const customerDetailTabs = computed(() => [
  { value: "overview", label: t("tabOverview") },
  { value: "portfolio", label: t("tabPortfolio") },
  { value: "activity", label: t("tabActivity") },
  { value: "operations", label: t("tabOperations") },
]);

const customer360Resource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.get_customer_360_payload",
  auto: false,
});
const customerProfileUpdateResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.dashboard.update_customer_profile",
  auto: false,
});
const customerRelationDeleteResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.quick_create.delete_quick_aux_record",
  auto: false,
});
const insuredAssetDeleteResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.quick_create.delete_quick_aux_record",
  auto: false,
});

const customer360Payload = computed(() => customer360Resource.data || {});
const customer = computed(() => customer360Payload.value.customer || {});
const customer360Summary = computed(() => customer360Payload.value.summary || {});
const customer360Portfolio = computed(() => customer360Payload.value.portfolio || {});
const customer360Communication = computed(() => customer360Payload.value.communication || {});
const customer360Insights = computed(() => customer360Payload.value.insights || {});
const customer360CrossSell = computed(() => customer360Payload.value.cross_sell || {});
const customer360Documents = computed(() => customer360Payload.value.documents || {});
const customerDocumentProfile = computed(() => customer360Documents.value.document_profile || {});
const policies = computed(() => customer360Portfolio.value.policies || []);
const offers = computed(() => customer360Portfolio.value.offers || []);
const payments = computed(() => customer360Portfolio.value.payments || []);
const paymentInstallments = computed(() => customer360Portfolio.value.payment_installments || []);
const claims = computed(() => customer360Portfolio.value.claims || []);
const renewals = computed(() => customer360Portfolio.value.renewals || []);
const localeCode = computed(() => (activeLocale.value === "tr" ? "tr-TR" : "en-US"));
const profileEditMode = ref(false);
const profileSaveError = ref("");
const profileSaveMessage = ref("");
const showCustomerRelationDialog = ref(false);
const showInsuredAssetDialog = ref(false);
const showCustomerRelationEditDialog = ref(false);
const showInsuredAssetEditDialog = ref(false);
const showOwnershipAssignmentDialog = ref(false);
const showOwnershipAssignmentEditDialog = ref(false);
const editingCustomerRelation = ref(null);
const editingInsuredAsset = ref(null);
const editingOwnershipAssignment = ref(null);
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

const customerLoading = computed(() => customer360Resource.loading);
const timelineLoading = computed(() => customer360Resource.loading);
const auxQuickCustomerResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
});
const auxQuickPolicyResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
});

const activePolicies = computed(() =>
  policies.value.filter((policy) => String(policy.status || "").toUpperCase() !== "IPT")
);
const openOffers = computed(() =>
  offers.value.filter((offer) => !["Rejected", "Converted"].includes(String(offer.status || "")))
);
const paymentPreviewRows = computed(() => payments.value.slice(0, 6));
const paymentInstallmentsByPayment = computed(() => {
  const map = new Map();
  for (const row of paymentInstallments.value) {
    const paymentName = String(row?.payment || "").trim();
    if (!paymentName) continue;
    const existing = map.get(paymentName) || [];
    existing.push(row);
    map.set(paymentName, existing);
  }
  return map;
});
const claimPreviewRows = computed(() => claims.value.slice(0, 6));
const renewalPreviewRows = computed(() => renewals.value.slice(0, 6));
const communicationChannelRows = computed(() => customer360Communication.value.channel_summary || []);
const insuredAssetRows = computed(() => customer360CrossSell.value.insured_assets || []);
const crossSellOpportunityRows = computed(() => customer360CrossSell.value.opportunity_branches || []);
const relatedCustomerRows = computed(() => customer360CrossSell.value.related_customers || []);
const ownershipAssignmentRows = computed(() => customer360Payload.value.operations?.assignments || []);
const valueBandLabel = computed(() => describeValueBand(customer360Insights.value.value_band));
const insightStrengthRows = computed(() =>
  (customer360Insights.value.strengths || []).map((item) => describeInsightSignal(item)).filter(Boolean)
);
const insightRiskRows = computed(() =>
  (customer360Insights.value.risks || []).map((item) => describeInsightSignal(item)).filter(Boolean)
);
const customer360QuickOptionsMap = computed(() => ({
  customers: (auxQuickCustomerResource.data || []).map((row) => ({
    value: row.name,
    label: row.full_name || row.name,
  })),
  policies: (auxQuickPolicyResource.data || []).map((row) => ({
    value: row.name,
    label: `${row.policy_no || row.name}${row.customer ? ` - ${row.customer}` : ""}`,
  })),
}));
const customer360QuickSuccessHandlers = {
  "customer-relations-list": async () => {
    await loadCustomer360();
  },
  "insured-assets-list": async () => {
    await loadCustomer360();
  },
  "ownership-assignments-list": async () => {
    await loadCustomer360();
  },
};

const totalRiskLimit = computed(() =>
  Number(customer360Summary.value.total_premium || 0)
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
    value: String(customer360Summary.value.active_policy_count || activePolicies.value.length || 0),
  },
  {
    key: "openOfferCount",
    label: t("openOfferCount"),
    value: String(customer360Summary.value.open_offer_count || openOffers.value.length || 0),
  },
  {
    key: "segment",
    label: t("segment"),
    value: customer360Insights.value.segment || "-",
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

const timelineRows = computed(() =>
  (customer360Communication.value.timeline || [])
    .map((item, index) => ({
      key: `${item.type || "timeline"}:${item.payload?.name || index}`,
      date: item.timestamp,
      title: timelineTypeLabel(item.type),
      body: stripHtml(item.meta) || stripHtml(item.title) || "-",
      actor: item.payload?.comment_by || item.payload?.sender || "-",
      dotClass: item.type === "comment" ? "bg-amber-500" : "bg-sky-500",
    }))
    .filter((item) => Boolean(item.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
);
const activityRows = computed(() => (customer360Payload.value?.operations?.activities || []).slice(0, 6));
const reminderRows = computed(() => (customer360Payload.value?.operations?.reminders || []).slice(0, 6));

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
      customer360Resource.setData({
        ...(customer360Payload.value || {}),
        customer: {
          ...(customer.value || {}),
          ...result,
        },
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

  await customer360Resource.reload({
    name: props.name,
  });
  syncProfileFormFromCustomer();
}

function timelineTypeLabel(type) {
  if (type === "comment") return t("typeNote");
  if (type === "lead") return t("typeLead");
  return t("typeCommunication");
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

function openCustomerDocuments() {
  if (!props.name) return;
  router.push({
    name: "files-list",
    query: {
      attached_to_doctype: "AT Customer",
      attached_to_name: props.name,
    },
  });
}

function openCustomerRelations() {
  if (!props.name) return;
  router.push({
    name: "customer-relations-list",
    query: { customer: props.name },
  });
}

function openInsuredAssets() {
  if (!props.name) return;
  router.push({
    name: "insured-assets-list",
    query: { customer: props.name },
  });
}

function openQuickCustomerRelation() {
  showCustomerRelationDialog.value = true;
}

function openQuickInsuredAsset() {
  showInsuredAssetDialog.value = true;
}

function openQuickOwnershipAssignment() {
  showOwnershipAssignmentDialog.value = true;
}

function openEditCustomerRelation(relation) {
  editingCustomerRelation.value = relation || null;
  showCustomerRelationEditDialog.value = true;
}

function openEditInsuredAsset(asset) {
  editingInsuredAsset.value = asset || null;
  showInsuredAssetEditDialog.value = true;
}

function openEditOwnershipAssignment(assignment) {
  editingOwnershipAssignment.value = assignment || null;
  showOwnershipAssignmentEditDialog.value = true;
}


async function deleteCustomerRelation(relation) {
  if (!relation?.name) return;
  if (!globalThis.confirm?.(t("deleteRelationConfirm"))) return;
  await customerRelationDeleteResource.submit({
    doctype: "AT Customer Relation",
    name: relation.name,
  });
  await loadCustomer360();
}


async function deleteInsuredAsset(asset) {
  if (!asset?.name) return;
  if (!globalThis.confirm?.(t("deleteAssetConfirm"))) return;
  await insuredAssetDeleteResource.submit({
    doctype: "AT Insured Asset",
    name: asset.name,
  });
  await loadCustomer360();
}

async function deleteOwnershipAssignment(assignment) {
  if (!assignment?.name) return;
  if (!globalThis.confirm?.(t("deleteAssignmentConfirm"))) return;
  await insuredAssetDeleteResource.submit({
    doctype: "AT Ownership Assignment",
    name: assignment.name,
  });
  await loadCustomer360();
}

async function ensureCustomer360QuickOptionSources() {
  await Promise.allSettled([
    auxQuickCustomerResource.reload({
      doctype: "AT Customer",
      fields: ["name", "full_name"],
      order_by: "modified desc",
      limit_page_length: 200,
    }),
    auxQuickPolicyResource.reload({
      doctype: "AT Policy",
      fields: ["name", "policy_no", "customer"],
      filters: props.name ? { customer: props.name } : {},
      order_by: "modified desc",
      limit_page_length: 200,
    }),
  ]);
}

async function prepareCustomerRelationDialog({ form }) {
  await ensureCustomer360QuickOptionSources();
  if (!form.customer) form.customer = props.name || "";
}

async function prepareInsuredAssetDialog({ form }) {
  await ensureCustomer360QuickOptionSources();
  if (!form.customer) form.customer = props.name || "";
  if (!form.policy && activePolicies.value[0]?.name) form.policy = activePolicies.value[0].name;
}

async function prepareOwnershipAssignmentDialog({ form }) {
  await ensureCustomer360QuickOptionSources();
  if (!form.source_doctype) form.source_doctype = "AT Customer";
  if (!form.source_name) form.source_name = props.name || "";
  if (!form.customer) form.customer = props.name || "";
}

async function prepareCustomerRelationEditDialog({ resetForm }) {
  await ensureCustomer360QuickOptionSources();
  const relation = editingCustomerRelation.value || {};
  resetForm({
    doctype: "AT Customer Relation",
    name: relation.name || "",
    customer: relation.customer || props.name || "",
    related_customer: relation.related_customer || "",
    relation_type: relation.relation_type || "Other",
    is_household: Boolean(relation.is_household),
    notes: relation.notes || "",
  });
}

async function prepareInsuredAssetEditDialog({ resetForm }) {
  await ensureCustomer360QuickOptionSources();
  const asset = editingInsuredAsset.value || {};
  resetForm({
    doctype: "AT Insured Asset",
    name: asset.name || "",
    customer: asset.customer || props.name || "",
    policy: asset.policy || "",
    asset_type: asset.asset_type || "Other",
    asset_label: asset.asset_label || asset.policy_no || asset.policy || "",
    asset_identifier: asset.asset_identifier || asset.insurance_company || "",
    notes: asset.notes || "",
  });
}

async function prepareOwnershipAssignmentEditDialog({ resetForm }) {
  await ensureCustomer360QuickOptionSources();
  const assignment = editingOwnershipAssignment.value || {};
  resetForm({
    doctype: "AT Ownership Assignment",
    name: assignment.name || "",
    source_doctype: assignment.source_doctype || "AT Customer",
    source_name: assignment.source_name || props.name || "",
    customer: assignment.customer || props.name || "",
    policy: assignment.policy || "",
    assigned_to: assignment.assigned_to || "",
    assignment_role: assignment.assignment_role || "Owner",
    status: assignment.status || "Open",
    priority: assignment.priority || "Normal",
    due_date: assignment.due_date || "",
    notes: assignment.notes || "",
  });
}

function assignmentSummaryLabel(assignment) {
  return [assignment.status || "-", assignment.due_date || "-"].filter(Boolean).join(" / ");
}

function activityCardFacts(activity) {
  return [
    {
      key: "activityAt",
      label: t("date"),
      value: formatDateTime(activity?.activity_at),
      valueClass: "text-xs text-slate-600",
    },
    {
      key: "assignedTo",
      label: t("assignedTo"),
      value: activity?.assigned_to || "-",
      valueClass: "text-sm text-slate-800",
    },
    {
      key: "source",
      label: t("source"),
      value: [activity?.source_doctype, activity?.source_name].filter(Boolean).join(" / ") || "-",
      valueClass: "text-sm text-slate-800",
    },
  ];
}

function reminderCardFacts(reminder) {
  return [
    {
      key: "remindAt",
      label: t("reminderAt"),
      value: formatDateTime(reminder?.remind_at),
      valueClass: "text-xs text-slate-600",
    },
    {
      key: "priority",
      label: t("reminderPriority"),
      value: reminder?.priority || "-",
      valueClass: "text-xs text-slate-700",
    },
    {
      key: "assignedTo",
      label: t("assignedTo"),
      value: reminder?.assigned_to || "-",
      valueClass: "text-xs text-slate-700",
    },
    {
      key: "source",
      label: t("recordId"),
      value: reminder?.source_name || reminder?.policy || reminder?.claim || "-",
      valueClass: "text-xs text-slate-700",
    },
  ];
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

function describeValueBand(value) {
  if (value === "High Value") return t("valueBandHighValue");
  if (value === "Mid Value") return t("valueBandMidValue");
  return t("valueBandStandard");
}

function describeInsightSignal(value) {
  if (value === "multi_policy") return t("insightSignalMultiPolicy");
  if (value === "active_portfolio") return t("insightSignalActivePortfolio");
  if (value === "high_premium") return t("insightSignalHighPremium");
  if (value === "medium_premium") return t("insightSignalMediumPremium");
  if (value === "clean_claims") return t("insightSignalCleanClaims");
  if (value === "renewal_pipeline") return t("insightSignalRenewalPipeline");
  if (value === "claim_pressure") return t("insightRiskClaimPressure");
  if (value === "collection_risk") return t("insightRiskCollectionRisk");
  if (value === "overdue_payment") return t("insightRiskOverduePayment");
  if (value === "cancellation_history") return t("insightRiskCancellationHistory");
  return value || "";
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

function paymentCardFacts(payment) {
  const relatedInstallments = paymentInstallmentsByPayment.value.get(payment?.name) || [];
  const overdueInstallmentCount = relatedInstallments.filter((row) => String(row?.status || "") === "Overdue").length;
  return [
    {
      key: "paymentDate",
      label: t("paymentDate"),
      value: formatDate(payment?.payment_date),
      valueClass: "text-xs text-slate-600",
    },
    {
      key: "amount",
      label: t("grossPremium"),
      value: formatCurrency(payment?.amount_try, "TRY"),
      valueClass: "text-sm font-semibold text-slate-900",
    },
    {
      key: "overdueInstallments",
      label: t("overdueInstallments"),
      value: String(overdueInstallmentCount),
      valueClass: overdueInstallmentCount > 0 ? "text-sm font-semibold text-rose-700" : "text-sm text-slate-700",
    },
  ];
}

function claimCardFacts(claim) {
  return [
    {
      key: "reportedDate",
      label: t("reportedDate"),
      value: formatDate(claim?.reported_date),
      valueClass: "text-xs text-slate-600",
    },
    {
      key: "claimAmount",
      label: t("claimAmount"),
      value: formatCurrency(claim?.claim_amount, "TRY"),
      valueClass: "text-sm font-semibold text-slate-900",
    },
  ];
}

function renewalCardFacts(renewal) {
  return [
    {
      key: "dueDate",
      label: t("dueDate"),
      value: formatDate(renewal?.due_date || renewal?.renewal_date),
      valueClass: "text-xs text-slate-600",
    },
    {
      key: "lostReason",
      label: t("lostReason"),
      value: renewal?.lost_reason_code || "-",
      valueClass: "text-sm text-slate-800",
    },
  ];
}

function insuredAssetFacts(asset) {
  return [
    {
      key: "assetType",
      label: t("assetType"),
      value: asset?.asset_type || asset?.branch || "-",
      valueClass: "text-xs text-slate-600",
    },
    {
      key: "assetIdentifier",
      label: t("assetIdentifier"),
      value: asset?.asset_identifier || asset?.policy || "-",
      valueClass: "text-sm text-slate-800",
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
