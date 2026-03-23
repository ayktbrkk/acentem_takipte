<template>
  <section class="page-shell space-y-4">
    <div class="detail-topbar">
      <div>
        <p class="detail-breadcrumb">{{ t("breadcrumb") }}</p>
        <h1 class="detail-title">
          {{ customer.full_name || name }}
          <StatusBadge domain="customer" :status="customerStatus" />
        </h1>
        <p v-if="customerHeaderSubtitle" class="detail-subtitle">
          {{ customerHeaderSubtitle }}
        </p>
        <div class="mt-1.5 flex flex-wrap items-center gap-2">
          <span class="copy-tag">{{ customer.name || name || "-" }}</span>
          <span v-if="customerTaxIdDisplay !== '-'" class="copy-tag">
            {{ customerTaxIdLabel }}: {{ customerTaxIdDisplay }}
          </span>
          <span class="copy-tag">{{ customerTypeLabel }}</span>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <ActionButton variant="secondary" size="sm" @click="router.push('/customers')">
          {{ t("backList") }}
        </ActionButton>
        <ActionButton variant="secondary" size="sm" @click="openCommunicationCenterForCustomer">
          {{ t("communication") }}
        </ActionButton>
        <ActionButton variant="primary" size="sm" @click="openQuickOfferForCustomer">
          {{ t("newOffer") }}
        </ActionButton>
      </div>
    </div>

    <HeroStrip :cells="heroCells" />

    <div class="nav-tabs-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="['nav-tab', activeTab === tab.key && 'is-active']"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span v-if="tab.count" class="ml-1 badge badge-blue">
          {{ tab.count }}
        </span>
      </button>
    </div>

    <SectionPanel class="md:hidden" :title="t('mobileQuickActionsTitle')">
      <div class="mt-1 grid grid-cols-2 gap-2">
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
      </div>
    </SectionPanel>

    <div class="detail-body at-detail-split-wide">
      <aside class="detail-sidebar at-detail-aside">
        <SectionPanel :title="t('customerSnapshotTitle')" :meta="customerHeaderSubtitle || t('customerSnapshotHint')">
          <FieldGroup :fields="customerHeaderSummaryItems" :cols="2" />
        </SectionPanel>

        <SectionPanel :title="t('customerProfileTitle')" :meta="customerPhoneDisplay">
          <template #trailing>
            <div class="flex flex-wrap items-center justify-end gap-2">
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

          <div v-if="customerLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <template v-else>
            <div v-if="profileSaveError && !profileEditMode" class="mb-3 qc-error-banner" role="alert" aria-live="polite">
              <p class="qc-error-banner__text">{{ profileSaveError }}</p>
            </div>
            <div v-if="profileSaveMessage && !profileEditMode" class="mb-3 qc-success-banner" aria-live="polite">
              <p class="qc-success-banner__text">{{ profileSaveMessage }}</p>
            </div>

            <div v-if="!profileEditMode" class="space-y-3">
              <FieldGroup :fields="profileViewFields" :cols="2" />
            </div>

            <div v-else class="space-y-3">
              <div v-if="profileSaveError" class="qc-error-banner" role="alert" aria-live="polite">
                <p class="qc-error-banner__text">{{ profileSaveError }}</p>
              </div>
              <div v-else-if="profileSaveMessage" class="qc-success-banner" aria-live="polite">
                <p class="qc-success-banner__text">{{ profileSaveMessage }}</p>
              </div>

              <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <template v-for="field in profileEditFields" :key="field.key">
                  <div
                    v-if="field.type !== 'hidden'"
                    :class="field.span ? 'sm:col-span-2' : ''"
                    class="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <label class="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                      {{ field.label }}
                    </label>
                    <p v-if="field.type === 'static'" class="mt-1 text-sm text-slate-800">
                      {{ field.value }}
                    </p>
                    <textarea
                      v-else-if="field.type === 'textarea'"
                      :value="profileForm[field.model]"
                      :rows="field.rows || 3"
                      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      @input="setProfileField(field.model, $event.target.value)"
                    />
                    <select
                      v-else-if="field.type === 'select'"
                      :value="profileForm[field.model]"
                      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      :disabled="field.disabled"
                      @change="setProfileField(field.model, $event.target.value)"
                    >
                      <option v-for="option in field.options" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                    <input
                      v-else
                      :value="profileForm[field.model]"
                      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      :disabled="field.disabled"
                      :type="field.type"
                      @input="setProfileField(field.model, $event.target.value)"
                    />
                    <p v-if="field.model && profileFormErrors[field.model]" class="mt-1 qc-inline-error">
                      {{ profileFormErrors[field.model] }}
                    </p>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </SectionPanel>

      </aside>

      <div class="detail-main space-y-4">
        <SectionPanel
          v-if="activeCustomerTab === 'overview'"
          :title="t('overviewSummaryTitle')"
          :meta="t('overviewSummaryHint')"
        >
          <div class="grid gap-3">
            <MetaListCard
              v-for="card in overviewSummaryCards"
              :key="card.key"
              clickable
              :title="card.title"
              :subtitle="card.subtitle"
              @click="activeTab = card.tab"
            >
              <template #trailing>
                <span class="badge badge-blue">{{ card.count }}</span>
              </template>
              <div class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <div
                  v-for="fact in card.facts"
                  :key="fact.key"
                  class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2"
                >
                  <p class="text-[11px] uppercase tracking-wide text-slate-400">
                    {{ fact.label }}
                  </p>
                  <p class="text-sm font-semibold text-slate-800">
                    {{ fact.value }}
                  </p>
                </div>
              </div>
            </MetaListCard>
          </div>
        </SectionPanel>

        <SectionPanel
          v-if="activeCustomerTab === 'overview'"
          :title="t('insightSummaryTitle')"
        >
          <div class="space-y-3">
            <FieldGroup :fields="insightSummaryFields" :cols="4" />
            <FieldGroup :fields="insightContextFields" :cols="2" />
          </div>
        </SectionPanel>

        <SectionPanel
          v-if="activeCustomerTab === 'operations'"
          :title="t('operationsTitle')"
        >
          <div class="mt-1 grid gap-2 sm:grid-cols-2">
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
        </SectionPanel>

        <SectionPanel
          v-if="activeCustomerTab === 'activity'"
          :title="t('activitiesTitle')"
        >
          <template #trailing>
            <span class="badge badge-blue">{{ activityRows.length }}</span>
          </template>
          <div v-if="customerLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="activityRows.length === 0" class="at-empty-block">
            {{ t("noActivity") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2">
            <MetaListCard
              v-for="activity in activityRows"
              :key="activity.name"
              :title="activity.activity_title || activity.activity_type || activity.name"
              :subtitle="activity.activity_type || '-'"
            >
              <template #trailing>
                <StatusBadge domain="activity" :status="activity.status || 'Draft'" />
              </template>
              <MiniFactList class="mt-2" :items="activityCardFacts(activity)" />
            </MetaListCard>
          </div>
        </SectionPanel>

        <SectionPanel
          v-if="activeCustomerTab === 'activity'"
          :title="t('remindersTitle')"
        >
          <template #trailing>
            <span class="badge badge-blue">{{ reminderRows.length }}</span>
          </template>
          <div v-if="customerLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="reminderRows.length === 0" class="at-empty-block">
            {{ t("noReminder") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2">
            <MetaListCard
              v-for="reminder in reminderRows"
              :key="reminder.name"
              :title="reminder.reminder_title || reminder.name"
              :subtitle="reminder.status || '-'"
            >
              <template #trailing>
                <div class="flex flex-wrap items-center justify-end gap-2">
                  <StatusBadge domain="reminder" :status="reminder.status || 'Draft'" />
                  <ActionButton
                    v-if="reminder.status !== 'Done'"
                    variant="secondary"
                    size="xs"
                    @click="markReminderDone(reminder)"
                  >
                    {{ t("markDone") }}
                  </ActionButton>
                  <ActionButton
                    v-if="reminder.status !== 'Cancelled'"
                    variant="secondary"
                    size="xs"
                    @click="cancelReminder(reminder)"
                  >
                    {{ t("cancelReminder") }}
                  </ActionButton>
                </div>
              </template>
              <MiniFactList class="mt-2" :items="reminderCardFacts(reminder)" />
            </MetaListCard>
          </div>
        </SectionPanel>

        <SectionPanel
          v-if="activeCustomerTab === 'portfolio'"
          :title="t('activePoliciesTitle')"
        >
          <template #trailing>
            <span class="badge badge-blue">{{ activePolicies.length }}</span>
          </template>
          <div v-if="customerLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div
            v-else-if="activePolicies.length === 0"
            class="at-empty-block"
          >
            {{ t("noActivePolicy") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2">
            <MetaListCard
              v-for="policy in activePolicies"
              :key="policy.name"
              :title="policy.policy_no || policy.name"
              :subtitle="policy.insurance_company || '-'"
            >
              <template #trailing>
                <StatusBadge domain="policy" :status="normalizeStatus(policy.status)" />
              </template>
              <MiniFactList class="mt-2" :items="policyCardFacts(policy)" />
              <template #footer>
                <ActionButton variant="secondary" size="xs" @click="openPolicyDetail(policy.name)">
                  {{ t("openPolicy") }}
                </ActionButton>
              </template>
            </MetaListCard>
          </div>
        </SectionPanel>

        <SectionPanel
          v-if="activeCustomerTab === 'portfolio'"
          :title="t('openOffersTitle')"
        >
          <template #trailing>
            <span class="badge badge-blue">{{ openOffers.length }}</span>
          </template>
          <div v-if="customerLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div
            v-else-if="openOffers.length === 0"
            class="at-empty-block"
          >
            {{ t("noOpenOffer") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2 [&>*:nth-child(n+3)]:hidden md:[&>*:nth-child(n+3)]:block">
            <MetaListCard
              v-for="offer in openOffers"
              :key="offer.name"
              :title="offer.name"
              :subtitle="offer.insurance_company || '-'"
            >
              <template #trailing>
                <StatusBadge domain="offer" :status="normalizeStatus(offer.status)" />
              </template>
              <MiniFactList class="mt-2" :items="offerCardFacts(offer)" />
            </MetaListCard>
          </div>
        </SectionPanel>

        <SectionPanel
          v-if="activeCustomerTab === 'portfolio'"
          :title="t('paymentSummaryTitle')"
        >
          <template #trailing>
            <span class="badge badge-blue">{{ paymentPreviewRows.length }}</span>
          </template>
          <div v-if="customerLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="paymentPreviewRows.length === 0" class="at-empty-block">
            {{ t("noPaymentHistory") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2 [&>*:nth-child(n+3)]:hidden md:[&>*:nth-child(n+3)]:block">
            <MetaListCard
              v-for="payment in paymentPreviewRows"
              :key="payment.name"
              :title="payment.payment_no || payment.name"
              :subtitle="payment.policy || '-'"
            >
              <template #trailing>
                <StatusBadge domain="payment" :status="payment.status || 'Draft'" />
              </template>
              <MiniFactList class="mt-2" :items="paymentCardFacts(payment)" />
            </MetaListCard>
          </div>
        </SectionPanel>

        <SectionPanel
          v-if="activeCustomerTab === 'portfolio'"
          :title="t('claimsTitle')"
        >
          <template #trailing>
            <span class="badge badge-blue">{{ claimPreviewRows.length }}</span>
          </template>
          <div v-if="customerLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="claimPreviewRows.length === 0" class="at-empty-block">
            {{ t("noClaims") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2">
            <MetaListCard
              v-for="claim in claimPreviewRows"
              :key="claim.name"
              :title="claim.name"
              :subtitle="claim.policy || '-'"
            >
              <template #trailing>
                <StatusBadge domain="claim" :status="claim.claim_status || 'Draft'" />
              </template>
              <MiniFactList class="mt-2" :items="claimCardFacts(claim)" />
            </MetaListCard>
          </div>
        </SectionPanel>

        <SectionPanel
          v-if="activeCustomerTab === 'portfolio'"
          :title="t('renewalsTitle')"
        >
          <template #trailing>
            <span class="badge badge-blue">{{ renewalPreviewRows.length }}</span>
          </template>
          <div v-if="customerLoading" class="text-sm text-slate-500">{{ t("loading") }}</div>
          <div v-else-if="renewalPreviewRows.length === 0" class="at-empty-block">
            {{ t("noUpcomingRenewal") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2">
            <MetaListCard
              v-for="renewal in renewalPreviewRows"
              :key="renewal.name"
              :title="renewal.policy || renewal.name"
              :subtitle="renewal.competitor_name || '-'"
            >
              <template #trailing>
                <StatusBadge domain="renewal" :status="renewal.status || 'Draft'" />
              </template>
              <MiniFactList class="mt-2" :items="renewalCardFacts(renewal)" />
            </MetaListCard>
          </div>
        </SectionPanel>

        <SectionPanel
          v-if="activeCustomerTab === 'portfolio'"
          :title="t('insightSummaryTitle')"
        >
          <div class="space-y-3">
            <FieldGroup :fields="insightSummaryFields" :cols="4" />
            <FieldGroup :fields="insightContextFields" :cols="2" />
          </div>
        </SectionPanel>

        <SectionPanel
          v-if="activeCustomerTab === 'operations'"
          :title="t('assignmentsTitle')"
        >
          <template #trailing>
            <span class="badge badge-blue">{{ ownershipAssignmentRows.length }}</span>
          </template>
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
                  <ActionButton
                    v-if="assignment.status !== 'In Progress'"
                    variant="secondary"
                    size="xs"
                    @click.stop="markAssignmentInProgress(assignment)"
                  >
                    {{ t("startAssignment") }}
                  </ActionButton>
                  <ActionButton
                    v-if="assignment.status !== 'Blocked'"
                    variant="secondary"
                    size="xs"
                    @click.stop="markAssignmentBlocked(assignment)"
                  >
                    {{ t("blockAssignment") }}
                  </ActionButton>
                  <ActionButton
                    v-if="assignment.status !== 'Done'"
                    variant="secondary"
                    size="xs"
                    @click.stop="markAssignmentDone(assignment)"
                  >
                    {{ t("closeAssignment") }}
                  </ActionButton>
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
        </SectionPanel>

        <SectionPanel
          v-if="activeCustomerTab === 'portfolio'"
          :title="t('crossSellTitle')"
        >
          <template #trailing>
            <span class="badge badge-blue">{{ crossSellOpportunityRows.length }}</span>
          </template>
          <div v-if="crossSellOpportunityRows.length === 0" class="at-empty-block">
            {{ t("noCrossSellOpportunity") }}
          </div>
          <div v-else class="space-y-3">
            <FieldGroup :fields="crossSellSummaryFields" :cols="2" />
            <FieldGroup :fields="crossSellOpportunityFields" :cols="3" />
          </div>
        </SectionPanel>

        <SectionPanel
          v-if="activeCustomerTab === 'operations'"
          :title="t('relatedCustomersTitle')"
        >
          <template #trailing>
            <span class="badge badge-blue">{{ relatedCustomerRows.length }}</span>
          </template>
          <div v-if="relatedCustomerRows.length === 0" class="at-empty-block">
            {{ t("noRelatedCustomer") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2">
            <MetaListCard
              v-for="relation in relatedCustomerRows"
              :key="relation.name"
              :title="relation.related_customer_name || relation.related_customer"
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
        </SectionPanel>

        <SectionPanel
          v-if="activeCustomerTab === 'operations'"
          :title="t('documentsTitle')"
        >
          <template #trailing>
            <span class="badge badge-blue">{{ customerDocumentProfile.total_files || 0 }}</span>
          </template>
          <div class="space-y-3">
            <FieldGroup :fields="documentSummaryFields" :cols="3" />
          </div>
        </SectionPanel>

        <SectionPanel
          v-if="activeCustomerTab === 'operations'"
          :title="t('insuredAssetsTitle')"
        >
          <template #trailing>
            <span class="badge badge-blue">{{ insuredAssetRows.length }}</span>
          </template>
          <div v-if="insuredAssetRows.length === 0" class="at-empty-block">
            {{ t("noInsuredAsset") }}
          </div>
          <div v-else class="grid gap-3 md:grid-cols-2">
            <MetaListCard
              v-for="asset in insuredAssetRows"
              :key="asset.policy"
              :title="asset.asset_label || asset.policy_no || asset.policy"
              :subtitle="asset.insurance_company || '-'"
            >
              <template #trailing>
                <StatusBadge domain="policy" :status="asset.status || 'Draft'" />
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
            </MetaListCard>
          </div>
        </SectionPanel>

        <SectionPanel
          v-if="activeCustomerTab === 'activity'"
          :title="t('communicationSummaryTitle')"
        >
          <template #trailing>
            <span class="badge badge-blue">{{ communicationChannelRows.length }}</span>
          </template>
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
        </SectionPanel>

        <SectionPanel
          v-if="activeCustomerTab === 'activity'"
          :title="t('timelineTitle')"
        >
          <template #trailing>
            <span class="badge badge-blue">{{ timelineRows.length }}</span>
          </template>
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
        </SectionPanel>
      </div>
    </div>
    <QuickCreateManagedDialog
      v-model="showCustomerRelationDialog"
      config-key="customer_relation"
      :locale="activeLocale"
      :eyebrow="customerRelationEyebrow"
      :options-map="customer360QuickOptionsMap"
      :before-open="prepareCustomerRelationDialog"
      :success-handlers="customer360QuickSuccessHandlers"
    />

    <QuickCreateManagedDialog
      v-model="showInsuredAssetDialog"
      config-key="insured_asset"
      :locale="activeLocale"
      :eyebrow="insuredAssetEyebrow"
      :options-map="customer360QuickOptionsMap"
      :before-open="prepareInsuredAssetDialog"
      :success-handlers="customer360QuickSuccessHandlers"
    />

    <QuickCreateManagedDialog
      v-model="showCustomerRelationEditDialog"
      config-key="customer_relation_edit"
      :locale="activeLocale"
      :eyebrow="customerRelationEditEyebrow"
      :options-map="customer360QuickOptionsMap"
      :before-open="prepareCustomerRelationEditDialog"
      :success-handlers="customer360QuickSuccessHandlers"
    />

    <QuickCreateManagedDialog
      v-model="showInsuredAssetEditDialog"
      config-key="insured_asset_edit"
      :locale="activeLocale"
      :eyebrow="insuredAssetEditEyebrow"
      :options-map="customer360QuickOptionsMap"
      :before-open="prepareInsuredAssetEditDialog"
      :success-handlers="customer360QuickSuccessHandlers"
    />

    <QuickCreateManagedDialog
      v-model="showOwnershipAssignmentDialog"
      config-key="ownership_assignment"
      :locale="activeLocale"
      :eyebrow="ownershipAssignmentEyebrow"
      :options-map="customer360QuickOptionsMap"
      :before-open="prepareOwnershipAssignmentDialog"
      :success-handlers="customer360QuickSuccessHandlers"
    />

    <QuickCreateManagedDialog
      v-model="showOwnershipAssignmentEditDialog"
      config-key="ownership_assignment_edit"
      :locale="activeLocale"
      :eyebrow="ownershipAssignmentEditEyebrow"
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
import MetaListCard from "../components/app-shell/MetaListCard.vue";
import MiniFactList from "../components/app-shell/MiniFactList.vue";
import QuickCreateManagedDialog from "../components/app-shell/QuickCreateManagedDialog.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import FieldGroup from "../components/ui/FieldGroup.vue";
import HeroStrip from "../components/ui/HeroStrip.vue";
import StatusBadge from "../components/ui/StatusBadge.vue";
import { buildQuickCreateIntentQuery } from "../utils/quickRouteIntent";
import { getLocalizedText, getQuickCreateConfig } from "../config/quickCreateRegistry";

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
const customerRelationEyebrow = computed(() => getLocalizedText(getQuickCreateConfig("customer_relation")?.title, activeLocale.value) || (activeLocale.value === "tr" ? "Yeni İlişki" : "New Relation"));
const insuredAssetEyebrow = computed(() => getLocalizedText(getQuickCreateConfig("insured_asset")?.title, activeLocale.value) || (activeLocale.value === "tr" ? "Yeni Varlık" : "New Asset"));
const customerRelationEditEyebrow = computed(() => getLocalizedText(getQuickCreateConfig("customer_relation_edit")?.title, activeLocale.value) || (activeLocale.value === "tr" ? "İlişkiyi Düzenle" : "Edit Relation"));
const insuredAssetEditEyebrow = computed(() => getLocalizedText(getQuickCreateConfig("insured_asset_edit")?.title, activeLocale.value) || (activeLocale.value === "tr" ? "Varlığı Düzenle" : "Edit Asset"));
const ownershipAssignmentEyebrow = computed(() => getLocalizedText(getQuickCreateConfig("ownership_assignment")?.title, activeLocale.value) || (activeLocale.value === "tr" ? "Yeni Atama" : "New Assignment"));
const ownershipAssignmentEditEyebrow = computed(() => getLocalizedText(getQuickCreateConfig("ownership_assignment_edit")?.title, activeLocale.value) || (activeLocale.value === "tr" ? "Atamayı Düzenle" : "Edit Assignment"));

const copy = {
  tr: {
    breadcrumb: "Operasyonlar / Müşteriler",
    overview: "Müşteri Detayı",
    backList: "Listeye Dön",
    openDesk: "Yönetim Ekranını Aç",
    newOffer: "Yeni Teklif",
    communication: "İletişim",
    newRelation: "Yeni İlişki",
    newAsset: "Yeni Varlık",
    newAssignment: "Yeni Atama",
    edit: "Düzenle",
    delete: "Sil",
    deleteRelationConfirm: "Bu ilişki kaydı silinsin mi?",
    deleteAssetConfirm: "Bu varlık kaydı silinsin mi?",
    deleteAssignmentConfirm: "Bu atama kaydı silinsin mi?",
    editProfile: "Düzenle",
    cancelEdit: "İptal",
    saveProfile: "Kaydet",
    saving: "Kaydediliyor...",
    saveProfileError: "Müşteri bilgileri kaydedilemedi. Lütfen tekrar deneyin.",
    saveProfileSuccess: "Müşteri bilgileri güncellendi.",
    validationFullNameRequired: "Ad Soyad zorunludur.",
    validationEmailInvalid: "Geçerli bir e-posta girin.",
    validationBirthDateFuture: "Doğum tarihi bugünden ileri olamaz.",
    loading: "Yükleniyor...",
    fullName: "Ad Soyad",
    birthDate: "Doğum Tarihi",
    gender: "Cinsiyet",
    maritalStatus: "Medeni Durumu",
    occupation: "Meslek",
    riskCard: "Risk Özeti",
    taxId: "Kimlik / Vergi No",
    nationalId: "TC Kimlik No",
    taxNumber: "Vergi No",
    customerType: "Müşteri Tipi",
    customerTypeIndividual: "Bireysel",
    customerTypeCorporate: "Kurumsal",
    recordId: "Kayıt No",
    phone: "Telefon",
    mobilePhone: "Cep Telefonu",
    email: "E-posta",
    address: "Adres",
    assignedAgent: "Temsilci",
    consentStatus: "İzin Durumu",
    customerSnapshotTitle: "Müşteri Özeti",
    customerSnapshotHint: "İletişim ve portföy sinyalleri",
    customerProfileTitle: "Müşteri Profili",
    overviewSummaryTitle: "Özet Panosu",
    overviewSummaryHint: "En önemli sinyaller ve kısa yollar",
    portfolioOverviewTitle: "Portföy Özeti",
    paymentOverviewTitle: "Ödeme Özeti",
    activityOverviewTitle: "Aktivite Özeti",
    operationsOverviewTitle: "Operasyon Özeti",
    portfolioOverviewActiveLabel: "Aktif",
    portfolioOverviewOfferLabel: "Teklif",
    portfolioOverviewRenewalLabel: "Yenileme",
    portfolioOverviewClaimLabel: "Hasar",
    paymentOverviewCountLabel: "Tahsilat",
    paymentOverviewOverdueLabel: "Geciken Taksit",
    paymentOverviewOverdueAmountLabel: "Gecikme Tutarı",
    activityOverviewCountLabel: "Aktivite",
    activityOverviewReminderLabel: "Hatırlatıcı",
    activityOverviewChannelLabel: "Kanal",
    operationsOverviewRelationLabel: "Kişi",
    operationsOverviewAssetLabel: "Varlık",
    operationsOverviewAssignmentLabel: "Atama",
    operationsOverviewDocumentLabel: "Doküman",
    genderUnknown: "Bilinmiyor",
    genderMale: "Erkek",
    genderFemale: "Kadın",
    genderOther: "Diğer",
    maritalUnknown: "Bilinmiyor",
    maritalSingle: "Bekar",
    maritalMarried: "Evli",
    maritalDivorced: "Boşanmış",
    maritalWidowed: "Dul",
    consentUnknown: "Bilinmiyor",
    consentGranted: "Onaylı",
    consentRevoked: "İptal",
    customerFolder: "Müşteri Klasörü",
    activePolicyCount: "Aktif Poliçe",
    openOfferCount: "Açık Teklif",
    totalRiskLimit: "Toplam Risk Limiti",
    segment: "Segment",
    score: "Skor",
    customerValueScore: "Müşteri değer puanı",
    claimRisk: "Hasar Riski",
    claimRiskHint: "Açık risk seviyesi",
    segmentScore: "Portföy segmenti",
    valueBand: "Değer Bandı",
    valueBandHint: "Portföy prim seviyesine göre değer sınıfı",
    portfolioStrengths: "Güçlü Sinyaller",
    portfolioRisks: "Risk Sinyalleri",
    strengthSignalsHint: "Müşteri portföyünü güçlendiren faktörler",
    riskSignalsHint: "Takip gerektiren risk baskıları",
    noStrengthSignal: "Belirgin pozitif sinyal bulunamadı.",
    noRiskSignal: "Belirgin risk sinyali bulunamadı.",
    snapshotDate: "Snapshot Tarihi",
    sourceVersion: "Kaynak Sürümü",
    segmentSnapshotHint: "Segment görünümü son hesaplanan güne aittir",
    segmentSourceVersionHint: "Skor kuralı sürümü",
    valueBandHighValue: "Yüksek Değer",
    valueBandMidValue: "Orta Değer",
    valueBandStandard: "Standart",
    insightSignalMultiPolicy: "Çoklu aktif poliçe portföyü",
    insightSignalActivePortfolio: "Aktif poliçe portföyü",
    insightSignalHighPremium: "Yüksek premium katkısı",
    insightSignalMediumPremium: "Orta premium katkısı",
    insightSignalCleanClaims: "Temiz hasar görünümü",
    insightSignalRenewalPipeline: "Yaklaşan yenileme fırsatı",
    insightRiskClaimPressure: "Hasar baskısı yüksek",
    insightRiskCollectionRisk: "Tahsilat riski yüksek",
    insightRiskOverduePayment: "Geciken tahsilat var",
    insightRiskCancellationHistory: "İptal geçmişi dikkat gerektiriyor",
    activePoliciesTitle: "Aktif Poliçeler",
    noActivePolicy: "Aktif poliçe kaydı bulunamadı.",
    paymentSummaryTitle: "Ödeme Özeti",
    noPaymentHistory: "Ödeme kaydı bulunamadı.",
    paymentDate: "Ödeme Tarihi",
    overdueInstallments: "Geciken Taksit",
    claimsTitle: "Hasarlar",
    noClaims: "Hasar kaydı bulunamadı.",
    reportedDate: "Bildirim Tarihi",
    claimAmount: "Hasar Tutarı",
    renewalsTitle: "Yaklaşan Yenilemeler",
    noUpcomingRenewal: "Yaklaşan yenileme bulunamadı.",
    dueDate: "Vade",
    lostReason: "Kayıp Sebebi",
    communicationSummaryTitle: "İletişim Kanal Özeti",
    noCommunicationSummary: "İletişim özeti bulunamadı.",
    communicationChannelCount: "Kanal toplam kaydı",
    insightSummaryTitle: "Müşteri İçgörüleri",
    crossSellTitle: "Çapraz Satış Fırsatları",
    noCrossSellOpportunity: "Ek çapraz satış fırsatı bulunamadı.",
    crossSellOpportunityHint: "Eksik ürün/branş fırsatı",
    crossSellOpportunityMeta: "Aksiyon önerisi",
    crossSellOpportunityCount: "Fırsat Sayısı",
    crossSellOpportunityBranches: "Önerilen Branşlar",
    relatedCustomersTitle: "İlişkili Kişiler",
    noRelatedCustomer: "İlişkili kişi kaydı bulunamadı.",
    sameHousehold: "Aynı hane",
    insuredAssetsTitle: "Sigortalanan Varlıklar",
    assignmentsTitle: "Atamalar",
    activitiesTitle: "Aktiviteler",
    remindersTitle: "Hatırlatıcılar",
    noAssignment: "Atama kaydı yok.",
    noActivity: "Aktivite kaydı yok.",
    noReminder: "Hatırlatıcı kaydı yok.",
    reminderAt: "Hatırlatma",
    reminderPriority: "Öncelik",
    markDone: "Tamamla",
    cancelReminder: "İptal",
    startAssignment: "İşleme Al",
    blockAssignment: "Bloke Et",
    closeAssignment: "Kapat",
    noInsuredAsset: "Sigortalanan varlık bulunamadı.",
    assetType: "Varlık Turu",
    assetIdentifier: "Varlık Kimliği",
    policyBranch: "Branş",
    endDate: "Bitiş",
    openPolicy: "Poliçeyi Aç",
    openOffersTitle: "Açık Teklifler",
    noOpenOffer: "Açık teklif bulunamadı.",
    validUntil: "Geçerlilik",
    grossPremium: "Brüt Prim",
    operationsTitle: "Operasyonlar",
    documents: "Dokümanlar",
    documentsTitle: "Doküman Özeti",
    totalDocuments: "Toplam Doküman",
    pdfDocuments: "PDF",
    imageDocuments: "Görsel",
    spreadsheetDocuments: "Tablo",
    otherDocuments: "Diğer",
    lastUpload: "Son Yükleme",
    mobileQuickActionsTitle: "Hızlı İşlemler",
    tabOverview: "Özet",
    tabPortfolio: "Portföy",
    tabActivity: "Aktivite",
    tabOperations: "Operasyonlar",
    timelineTitle: "İletişim Geçmişi",
    noTimeline: "Zaman tüneli kaydı bulunamadı.",
    typeCommunication: "Arama/İletişim",
    typeNote: "Not",
    typeLead: "Lead Notu",
  },
  en: {
    breadcrumb: "Operations / Customers",
    overview: "Customer Details",
    backList: "Back to List",
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
    fullName: "Full Name",
    birthDate: "Birth Date",
    gender: "Gender",
    maritalStatus: "Marital Status",
    occupation: "Occupation",
    riskCard: "Risk Summary",
    taxId: "Identity / Tax Number",
    nationalId: "National ID Number",
    taxNumber: "Tax Number",
    customerType: "Customer Type",
    customerTypeIndividual: "Individual",
    customerTypeCorporate: "Corporate",
    recordId: "Record ID",
    phone: "Phone",
    mobilePhone: "Mobile Phone",
    email: "Email",
    address: "Address",
    assignedAgent: "Assigned Agent",
    consentStatus: "Consent Status",
    customerSnapshotTitle: "Customer Snapshot",
    customerSnapshotHint: "Contact and portfolio signals",
    customerProfileTitle: "Customer Profile",
    overviewSummaryTitle: "Overview Dashboard",
    overviewSummaryHint: "Top signals and quick paths",
    portfolioOverviewTitle: "Portfolio Summary",
    paymentOverviewTitle: "Payment Summary",
    activityOverviewTitle: "Activity Summary",
    operationsOverviewTitle: "Operations Summary",
    portfolioOverviewActiveLabel: "Active",
    portfolioOverviewOfferLabel: "Offer",
    portfolioOverviewRenewalLabel: "Renewal",
    portfolioOverviewClaimLabel: "Claim",
    paymentOverviewCountLabel: "Payments",
    paymentOverviewOverdueLabel: "Overdue Installment",
    paymentOverviewOverdueAmountLabel: "Overdue Amount",
    activityOverviewCountLabel: "Activity",
    activityOverviewReminderLabel: "Reminder",
    activityOverviewChannelLabel: "Channel",
    operationsOverviewRelationLabel: "Contact",
    operationsOverviewAssetLabel: "Asset",
    operationsOverviewAssignmentLabel: "Assignment",
    operationsOverviewDocumentLabel: "Document",
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
    crossSellOpportunityCount: "Opportunity Count",
    crossSellOpportunityBranches: "Suggested Branches",
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
    markDone: "Mark Done",
    cancelReminder: "Cancel",
    startAssignment: "Start",
    blockAssignment: "Block",
    closeAssignment: "Close",
    noInsuredAsset: "No insured asset found.",
    assetType: "Asset Type",
    assetIdentifier: "Asset Identifier",
    policyBranch: "Branch",
    endDate: "End Date",
    openPolicy: "Open Policy",
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
  url: "acentem_takipte.api.dashboard.get_customer_360_payload",
  auto: false,
});
const customerProfileUpdateResource = createResource({
  url: "acentem_takipte.api.dashboard.update_customer_profile",
  auto: false,
});
const customerRelationDeleteResource = createResource({
  url: "acentem_takipte.api.quick_create.delete_quick_aux_record",
  auto: false,
});
const insuredAssetDeleteResource = createResource({
  url: "acentem_takipte.api.quick_create.delete_quick_aux_record",
  auto: false,
});
const reminderUpdateResource = createResource({
  url: "acentem_takipte.api.quick_create.update_quick_aux_record",
  auto: false,
});

const customer360Payload = computed(() => unref(customer360Resource.data) || {});
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

const customerLoading = computed(() => Boolean(unref(customer360Resource.loading)));
const timelineLoading = computed(() => Boolean(unref(customer360Resource.loading)));

const customerStatus = computed(() => (Number(customer.value.enabled) === 1 ? "active" : "cancel"));

const heroCells = computed(() => [
  {
    label: t("customerType"),
    value: customerTypeLabel.value,
    variant: "default",
  },
  {
    label: t("valueBand"),
    value: valueBandLabel.value || "-",
    variant: "default",
  },
  {
    label: t("activePolicyCount"),
    value: String(activePolicies.value?.length || 0),
    variant: "accent",
  },
  {
    label: t("totalRiskLimit"),
    value: formatCurrency(totalRiskLimit.value),
    variant: "lg",
  },
]);

const tabs = computed(() => [
  { key: "overview", label: t("tabOverview") },
  { key: "portfolio", label: t("tabPortfolio"), count: activePolicies.value?.length },
  { key: "activity", label: t("tabActivity"), count: activityRows.value?.length },
  { key: "operations", label: t("tabOperations"), count: ownershipAssignmentRows.value?.length },
]);

const activeTab = computed({
  get: () => activeCustomerTab.value,
  set: (value) => {
    activeCustomerTab.value = value;
  },
});

function initials(nameValue = "") {
  return String(nameValue)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function normalizeStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["active", "open", "waiting", "draft", "cancel"].includes(normalized)) {
    return normalized;
  }
  if (normalized === "ipt" || normalized === "cancelled" || normalized === "canceled") {
    return "cancel";
  }
  return normalized || "draft";
}
const auxQuickCustomerResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
});
const auxQuickPolicyResource = createResource({
  url: "frappe.client.get_list",
  auto: false,
});

function resourceValue(resource, fallback) {
  const value = unref(resource?.data);
  return value == null ? fallback : value;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

const activePolicies = computed(() =>
  policies.value.filter((policy) => String(policy.status || "").toUpperCase() !== "IPT")
);
const openOffers = computed(() =>
  offers.value.filter((offer) => !["Rejected", "Converted"].includes(String(offer.status || "")))
);
const paymentPreviewRows = computed(() => payments.value.slice(0, 6));
const paymentOverdueInstallmentCount = computed(() => Number(customer360Summary.value.overdue_installment_count || 0));
const paymentOverdueInstallmentAmount = computed(() => Number(customer360Summary.value.overdue_installment_amount || 0));
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
  customers: asArray(resourceValue(auxQuickCustomerResource, [])).map((row) => ({
    value: row.name,
    label: row.full_name || row.name,
  })),
  policies: asArray(resourceValue(auxQuickPolicyResource, [])).map((row) => ({
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
    key: "customerType",
    label: t("customerType"),
    value: customerTypeLabel.value,
  },
  ...riskSummaryItems.value,
]);
const overviewSummaryCards = computed(() => {
  const firstPolicy = activePolicies.value[0];
  const firstPayment = paymentPreviewRows.value[0];
  const firstActivity = activityRows.value[0];
  const firstRelation = relatedCustomerRows.value[0];
  const firstAsset = insuredAssetRows.value[0];
  const firstAssignment = ownershipAssignmentRows.value[0];
  const totalOperations =
    relatedCustomerRows.value.length +
    insuredAssetRows.value.length +
    ownershipAssignmentRows.value.length +
    Number(customerDocumentProfile.value.total_files || 0);

  return [
    {
      key: "portfolio",
      tab: "portfolio",
      title: t("portfolioOverviewTitle"),
      subtitle: firstPolicy
        ? [firstPolicy.policy_no || firstPolicy.name, firstPolicy.branch].filter(Boolean).join(" / ")
        : t("noActivePolicy"),
      count: String(activePolicies.value.length || 0),
      facts: [
        { key: "activePolicyCount", label: t("portfolioOverviewActiveLabel"), value: String(activePolicies.value.length || 0) },
        { key: "openOfferCount", label: t("portfolioOverviewOfferLabel"), value: String(openOffers.value.length || 0) },
        { key: "renewals", label: t("portfolioOverviewRenewalLabel"), value: String(renewals.value.length || 0) },
        { key: "claims", label: t("portfolioOverviewClaimLabel"), value: String(claims.value.length || 0) },
      ],
    },
    {
      key: "payment",
      tab: "portfolio",
      title: t("paymentOverviewTitle"),
      subtitle: firstPayment
        ? [formatDate(firstPayment.payment_date), formatCurrency(firstPayment.amount_try, "TRY")].filter(Boolean).join(" / ")
        : t("noPaymentHistory"),
      count: String(payments.value.length || 0),
      facts: [
        { key: "paymentRows", label: t("paymentOverviewCountLabel"), value: String(payments.value.length || 0) },
        {
          key: "overdueInstallments",
          label: t("paymentOverviewOverdueLabel"),
          value: String(paymentOverdueInstallmentCount.value),
        },
        {
          key: "overdueAmount",
          label: t("paymentOverviewOverdueAmountLabel"),
          value: formatCurrency(paymentOverdueInstallmentAmount.value, "TRY"),
        },
      ],
    },
    {
      key: "activity",
      tab: "activity",
      title: t("activityOverviewTitle"),
      subtitle: firstActivity
        ? [firstActivity.activity_title || firstActivity.activity_type || firstActivity.name, formatDateTime(firstActivity.activity_at)].filter(Boolean).join(" / ")
        : t("noActivity"),
      count: String(
        asArray(customer360Payload.value?.operations?.activities || []).length +
          asArray(customer360Payload.value?.operations?.reminders || []).length
      ),
      facts: [
        { key: "activities", label: t("activityOverviewCountLabel"), value: String(activityRows.value.length || 0) },
        { key: "reminders", label: t("activityOverviewReminderLabel"), value: String(reminderRows.value.length || 0) },
        { key: "channels", label: t("activityOverviewChannelLabel"), value: String(communicationChannelRows.value.length || 0) },
      ],
    },
    {
      key: "operations",
      tab: "operations",
      title: t("operationsOverviewTitle"),
      subtitle: firstRelation
        ? [firstRelation.customer_name || firstRelation.related_customer || firstRelation.name, firstAsset?.asset_identifier || firstAssignment?.assigned_to].filter(Boolean).join(" / ")
        : t("noRelatedCustomer"),
      count: String(totalOperations),
      facts: [
        { key: "relations", label: t("operationsOverviewRelationLabel"), value: String(relatedCustomerRows.value.length || 0) },
        { key: "assets", label: t("operationsOverviewAssetLabel"), value: String(insuredAssetRows.value.length || 0) },
        { key: "assignments", label: t("operationsOverviewAssignmentLabel"), value: String(ownershipAssignmentRows.value.length || 0) },
        { key: "documents", label: t("operationsOverviewDocumentLabel"), value: String(customerDocumentProfile.value.total_files || 0) },
      ],
    },
  ];
});
const insightSummaryFields = computed(() => [
  {
    key: "segment",
    label: t("segmentScore"),
    value: customer360Insights.value.segment || "-",
    variant: "default",
  },
  {
    key: "score",
    label: t("score"),
    value: String(customer360Insights.value.score ?? "-"),
    variant: "lg",
  },
  {
    key: "claimRisk",
    label: t("claimRisk"),
    value: customer360Insights.value.claim_risk || "-",
    variant: "default",
  },
  {
    key: "valueBand",
    label: t("valueBand"),
    value: valueBandLabel.value || "-",
    variant: "accent",
  },
]);
const insightContextFields = computed(() => [
  {
    key: "strengths",
    label: t("portfolioStrengths"),
    variant: "badges",
    badges: insightStrengthRows.value.length
      ? insightStrengthRows.value.map((label) => ({ label, color: "green" }))
      : [{ label: t("noStrengthSignal"), color: "gray" }],
  },
  {
    key: "risks",
    label: t("portfolioRisks"),
    variant: "badges",
    badges: insightRiskRows.value.length
      ? insightRiskRows.value.map((label) => ({ label, color: "red" }))
      : [{ label: t("noRiskSignal"), color: "gray" }],
  },
  {
    key: "snapshotDate",
    label: t("snapshotDate"),
    value: formatDate(customer360Insights.value.snapshot_date),
    variant: "default",
  },
  {
    key: "sourceVersion",
    label: t("sourceVersion"),
    value: customer360Insights.value.source_version || "-",
    variant: "default",
  },
]);
const crossSellSummaryFields = computed(() => [
  {
    key: "opportunityCount",
    label: t("crossSellOpportunityCount"),
    value: String(crossSellOpportunityRows.value.length || 0),
    variant: "lg",
  },
  {
    key: "portfolioBranches",
    label: t("crossSellOpportunityBranches"),
    variant: "badges",
    badges: crossSellOpportunityRows.value.length
      ? crossSellOpportunityRows.value.map((item) => ({
          label: String(item.label || item.branch || "-"),
          color: "blue",
        }))
      : [{ label: t("noCrossSellOpportunity"), color: "gray" }],
  },
]);
const crossSellOpportunityFields = computed(() =>
  crossSellOpportunityRows.value.map((item, index) => ({
    key: `${item.branch || item.label || "branch"}:${index}`,
    label: String(item.label || item.branch || "-"),
    value: t("crossSellOpportunityMeta"),
    variant: "default",
  }))
);
const documentSummaryFields = computed(() => [
  {
    key: "totalDocuments",
    label: t("totalDocuments"),
    value: String(customerDocumentProfile.value.total_files || 0),
    variant: "lg",
  },
  {
    key: "pdfDocuments",
    label: t("pdfDocuments"),
    value: String(customerDocumentProfile.value.pdf_count || 0),
    variant: "default",
  },
  {
    key: "imageDocuments",
    label: t("imageDocuments"),
    value: String(customerDocumentProfile.value.image_count || 0),
    variant: "default",
  },
  {
    key: "spreadsheetDocuments",
    label: t("spreadsheetDocuments"),
    value: String(customerDocumentProfile.value.spreadsheet_count || 0),
    variant: "default",
  },
  {
    key: "otherDocuments",
    label: t("otherDocuments"),
    value: String(customerDocumentProfile.value.other_count || 0),
    variant: "default",
  },
  {
    key: "lastUpload",
    label: t("lastUpload"),
    value: formatDate(customerDocumentProfile.value.last_uploaded_on),
    variant: "default",
  },
]);
const customerTypeValue = computed(() => normalizeCustomerType(customer.value.customer_type, customer.value.tax_id));
const isCorporateCustomer = computed(() => customerTypeValue.value === "Corporate");
const customerTypeLabel = computed(() =>
  isCorporateCustomer.value ? t("customerTypeCorporate") : t("customerTypeIndividual")
);
const customerTaxIdLabel = computed(() => (isCorporateCustomer.value ? t("taxNumber") : t("nationalId")));
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
const profileViewFields = computed(() => [
  { key: "full_name", label: t("fullName"), value: customer.value.full_name || "-", variant: "lg", span: 2 },
  { key: "birth_date", label: t("birthDate"), value: isCorporateCustomer.value ? "-" : formatDate(customer.value.birth_date), variant: "default" },
  { key: "gender", label: t("gender"), value: isCorporateCustomer.value ? "-" : genderLabel.value, variant: "default" },
  { key: "marital_status", label: t("maritalStatus"), value: isCorporateCustomer.value ? "-" : maritalStatusLabel.value, variant: "default" },
  { key: "address", label: t("address"), value: customer.value.address || "-", variant: "muted", span: 2 },
  { key: "mobile_phone", label: t("mobilePhone"), value: customerPhoneDisplay.value, variant: "default" },
  { key: "email", label: t("email"), value: customer.value.email || "-", variant: "default" },
  { key: "occupation", label: t("occupation"), value: isCorporateCustomer.value ? "-" : customer.value.occupation || "-", variant: "default" },
  { key: "assigned_agent", label: t("assignedAgent"), value: customer.value.assigned_agent || "-", variant: "default" },
  { key: "consent_status", label: t("consentStatus"), value: consentStatusLabel.value, variant: "default" },
  { key: "customer_folder", label: t("customerFolder"), value: customer.value.customer_folder || "-", variant: "default" },
]);
const profileEditFields = computed(() => [
  { key: "full_name", label: t("fullName"), model: "full_name", type: "text", span: 2 },
  { key: "birth_date", label: t("birthDate"), model: "birth_date", type: "date", disabled: isCorporateCustomer.value },
  { key: "gender", label: t("gender"), model: "gender", type: "select", options: genderOptions.value, disabled: isCorporateCustomer.value },
  { key: "marital_status", label: t("maritalStatus"), model: "marital_status", type: "select", options: maritalStatusOptions.value, disabled: isCorporateCustomer.value },
  { key: "address", label: t("address"), model: "address", type: "textarea", span: 2, rows: 3 },
  { key: "mobile_phone", label: t("mobilePhone"), type: "static", value: customerPhoneDisplay.value },
  { key: "email", label: t("email"), model: "email", type: "email" },
  { key: "occupation", label: t("occupation"), model: "occupation", type: "text", disabled: isCorporateCustomer.value },
  { key: "assigned_agent", label: t("assignedAgent"), type: "static", value: customer.value.assigned_agent || "-" },
  { key: "consent_status", label: t("consentStatus"), model: "consent_status", type: "select", options: consentStatusOptions.value },
  { key: "customer_folder", label: t("customerFolder"), type: "static", value: customer.value.customer_folder || "-" },
]);

function normalizeIdentityNumber(value) {
  return String(value || "").replace(/\D+/g, "");
}

function normalizeCustomerType(value, identityNumber = "") {
  const normalized = String(value || "").trim();
  if (normalized === "Individual" || normalized === "Corporate") return normalized;
  return normalizeIdentityNumber(identityNumber).length === 10 ? "Corporate" : "Individual";
}

function setProfileField(fieldName, value) {
  if (!fieldName) return;
  profileForm[fieldName] = String(value ?? "").trim();
}

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
  if (!isCorporateCustomer.value && birth) {
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
  profileForm.birth_date = isCorporateCustomer.value ? "" : customer.value.birth_date ? String(customer.value.birth_date) : "";
  profileForm.gender = isCorporateCustomer.value ? "Unknown" : String(customer.value.gender || "Unknown") || "Unknown";
  profileForm.marital_status = isCorporateCustomer.value ? "Unknown" : String(customer.value.marital_status || "Unknown") || "Unknown";
  profileForm.occupation = isCorporateCustomer.value ? "" : String(customer.value.occupation || "");
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
        birth_date: isCorporateCustomer.value ? null : profileForm.birth_date || null,
        gender: isCorporateCustomer.value ? "Unknown" : profileForm.gender || "Unknown",
        marital_status: isCorporateCustomer.value ? "Unknown" : profileForm.marital_status || "Unknown",
        occupation: isCorporateCustomer.value ? null : profileForm.occupation,
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
  window.location.assign(`/app/at-customer/${encodeURIComponent(props.name)}`);
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
      return_to: router.currentRoute.value?.fullPath || "",
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

async function updateReminderStatus(reminder, status) {
  if (!reminder?.name) return;
  await reminderUpdateResource.submit({
    doctype: "AT Reminder",
    name: reminder.name,
    data: {
      status,
    },
  });
  await loadCustomer360();
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
  await loadCustomer360();
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
      valueClass: overdueInstallmentCount > 0 ? "text-sm font-semibold text-amber-700" : "text-sm text-slate-700",
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
