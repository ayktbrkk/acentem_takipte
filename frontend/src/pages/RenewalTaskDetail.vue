<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="renewal.name || name"
    :subtitle="renewal.policy"
  >
    <template #actions>
      <ActionButton variant="secondary" size="sm" @click="goBack">
        {{ t('backList') }}
      </ActionButton>
      <ActionButton variant="primary" size="sm" @click="openPolicy">
        <FeatherIcon name="external-link" class="h-4 w-4" />
        {{ t('openPolicy') }}
      </ActionButton>
    </template>

    <template #metrics>
      <div v-if="renewal.name" class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SaaSMetricCard
          v-for="cell in heroCells"
          :key="cell.label"
          :label="cell.label"
          :value="cell.value"
          :value-class="cell.variant === 'lg' ? 'text-gray-900 font-bold' : 'text-gray-600'"
        />
      </div>
      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
      </div>
    </template>

    <SectionPanel :title="t('renewalProcess')" panel-class="surface-card rounded-2xl p-5">
      <StepBar :steps="renewalSteps" />
    </SectionPanel>

    <div class="detail-body">
      <div class="detail-main space-y-4">
        <SectionPanel :title="t('previousPolicy')" panel-class="surface-card rounded-2xl p-5">
          <div v-if="!policy" class="card-empty">{{ t('noPolicy') }}</div>
          <FieldGroup v-else :fields="policyFields" :cols="2" />
        </SectionPanel>

        <SectionPanel :title="t('newOffers')" panel-class="surface-card rounded-2xl p-5">
          <div v-if="!offers.length" class="card-empty">{{ t('noOffers') }}</div>
          <div v-else class="space-y-3">
            <div
              v-for="offer in offers"
              :key="offer.name"
              class="rounded-lg border border-gray-200 p-3"
            >
              <div class="flex items-center justify-between gap-2">
                <div>
                  <p class="text-sm font-medium text-gray-900">{{ offer.name }}</p>
                  <p class="text-xs text-gray-500">{{ formatDate(offer.offer_date) }} · {{ offer.status || '-' }}</p>
                </div>
                <button class="btn btn-sm" type="button" @click="openOffer(offer.name)">{{ t('openOfferDetail') }}</button>
              </div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel :title="t('communicationHistory')" panel-class="surface-card rounded-2xl p-5">
          <div v-if="!communications.length" class="card-empty">{{ t('noCommunication') }}</div>
          <div v-else>
            <div v-for="item in communications" :key="item.name" class="timeline-item">
              <div class="tl-dot" />
              <div>
                <p class="tl-text">{{ item.subject || item.call_outcome || item.channel || '-' }}</p>
                <p class="tl-time">{{ formatDate(item.note_at) }} · {{ item.owner || '-' }}</p>
              </div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel :title="t('reminders')" panel-class="surface-card rounded-2xl p-5">
          <div v-if="!reminders.length" class="card-empty">{{ t('noReminders') }}</div>
          <div v-else class="space-y-2">
            <div v-for="item in reminders" :key="item.label" class="rounded-md bg-gray-50 px-3 py-2">
              <p class="text-sm font-medium text-gray-900">{{ item.label }}</p>
              <p class="text-xs text-gray-500">{{ item.value }}</p>
            </div>
          </div>
        </SectionPanel>
      </div>

      <aside class="detail-sidebar space-y-4">
        <SectionPanel :title="t('people')" panel-class="surface-card rounded-2xl p-5">
          <FieldGroup :fields="peopleFields" :cols="1" />
        </SectionPanel>

        <SectionPanel :title="t('statusInfo')" panel-class="surface-card rounded-2xl p-5">
          <FieldGroup :fields="statusFields" :cols="1" />
        </SectionPanel>

        <SectionPanel :title="t('recordMeta')" panel-class="surface-card rounded-2xl p-5">
          <FieldGroup :fields="recordFields" :cols="1" />
        </SectionPanel>
      </aside>
    </div>
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, onMounted, unref } from 'vue';
import { createResource } from 'frappe-ui';
import { useRouter } from 'vue-router';

import { FeatherIcon } from 'frappe-ui';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import SaaSMetricCard from '@/components/app-shell/SaaSMetricCard.vue';
import ActionButton from '@/components/app-shell/ActionButton.vue';
import WorkbenchPageLayout from '@/components/app-shell/WorkbenchPageLayout.vue';
import FieldGroup from '@/components/ui/FieldGroup.vue';
import StepBar from '@/components/ui/StepBar.vue';
import SectionPanel from '../components/app-shell/SectionPanel.vue';
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue';
import { getAppPinia } from '../pinia';
import { useAuthStore } from '../stores/auth';
import { translateText } from '../utils/i18n';

const _appPinia = getAppPinia();
const _authStore = useAuthStore(_appPinia);
const activeLocale = computed(() => unref(_authStore.locale) || 'en');

function t(key) {
  return translateText(key, activeLocale);
}

const props = defineProps({ name: { type: String, required: true } });
const name = computed(() => props.name || '');
const router = useRouter();

const renewalResource = createResource({ url: 'frappe.client.get', auto: false });
const policyResource = createResource({ url: 'frappe.client.get_list', auto: false });
const offersResource = createResource({ url: 'frappe.client.get_list', auto: false });
const communicationsResource = createResource({ url: 'frappe.client.get_list', auto: false });

const renewal = computed(() => unref(renewalResource.data) || {});
const policy = computed(() => {
  const value = unref(policyResource.data);
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
});
const offers = computed(() => (Array.isArray(unref(offersResource.data)) ? unref(offersResource.data) : []));
const communications = computed(() => (Array.isArray(unref(communicationsResource.data)) ? unref(communicationsResource.data) : []));

const heroCells = computed(() => [
  { label: t('lblPolicy'), value: renewal.value.policy || '-', variant: 'default' },
  { label: t('lblDue'), value: formatDate(renewal.value.due_date), variant: 'default' },
  { label: t('lblRenewalDate'), value: formatDate(renewal.value.renewal_date), variant: 'lg' },
  { label: t('lblStatus'), value: renewal.value.status || '-', variant: 'accent' },
]);

function getStepStatus(key) {
  const status = String(renewal.value.status || '').toLowerCase();
  const idx = {
    notified: 0,
    offer_sent: 1,
    decision: 2,
    renewed: 3,
  }[key];

  const statusIndex = status.includes('done') || status.includes('renewed')
    ? 3
    : status.includes('decision') || status.includes('approved')
      ? 2
      : status.includes('progress') || status.includes('offer')
        ? 1
        : 0;

  if (idx < statusIndex) return 'done';
  if (idx === statusIndex) return 'current';
  return 'pending';
}

const renewalSteps = computed(() => [
  { label: t('stepNotified'), state: getStepStatus('notified') },
  { label: t('stepOfferSent'), state: getStepStatus('offer_sent') },
  { label: t('stepDecision'), state: getStepStatus('decision') },
  { label: t('stepRenewed'), state: getStepStatus('renewed') },
]);

const policyFields = computed(() => [
  { label: t('fldPolicyNo'), value: policy.value?.policy_no || policy.value?.name || renewal.value.policy || '-' },
  { label: t('fldCustomer'), value: policy.value?.customer || '-' },
  { label: t('fldBranch'), value: policy.value?.branch || '-' },
  { label: t('fldEndDate'), value: formatDate(policy.value?.end_date) },
  { label: t('lblStatus'), value: policy.value?.status || '-' },
]);

const reminders = computed(() => {
  const rows = [];
  if (renewal.value.due_date) rows.push({ label: t('fldDueDate'), value: formatDate(renewal.value.due_date) });
  if (renewal.value.renewal_date) rows.push({ label: t('fldRenewalDateLbl'), value: formatDate(renewal.value.renewal_date) });
  if (renewal.value.next_contact_date) rows.push({ label: t('fldNextContact'), value: formatDate(renewal.value.next_contact_date) });
  return rows;
});

const peopleFields = computed(() => [
  { label: t('fldCustomer'), value: policy.value?.customer || '-' },
  { label: t('fldAgent'), value: renewal.value.assigned_to || '-' },
]);

const statusFields = computed(() => [
  { label: t('lblStatus'), value: renewal.value.status || '-' },
  { label: t('fldPriority'), value: priorityLabel(renewal.value.priority) },
  { label: t('fldLostReason'), value: renewal.value.lost_reason_code || '-' },
]);

const recordFields = computed(() => [
  { label: t('fldCreatedBy'), value: renewal.value.owner || '-' },
  { label: t('fldCreated'), value: formatDate(renewal.value.creation) },
  { label: t('fldModifiedBy'), value: renewal.value.modified_by || '-' },
  { label: t('fldModified'), value: formatDate(renewal.value.modified) },
]);

function priorityLabel(value) {
  const map = { high: t('priorityHigh'), medium: t('priorityMedium'), low: t('priorityLow') };
  return map[String(value || '').toLowerCase()] || '-';
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const locale = activeLocale.value === 'tr' ? 'tr-TR' : 'en-US';
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function openOffer(offerName) {
  if (!offerName) return;
  router.push({ name: 'offer-detail', params: { name: offerName } });
}

function openPolicy() {
  if (!renewal.value.policy) return;
  router.push({ name: 'policy-detail', params: { name: renewal.value.policy } });
}

function goBack() {
  router.push({ name: 'renewals-board' });
}

async function reload() {
  if (!name.value) return;
  await renewalResource.reload({ doctype: 'AT Renewal Task', name: name.value });

  if (renewal.value.policy) {
    await Promise.allSettled([
      policyResource.reload({
        doctype: 'AT Policy',
        fields: ['name', 'policy_no', 'customer', 'branch', 'end_date', 'status'],
        filters: { name: renewal.value.policy },
        limit_page_length: 1,
      }),
    ]);
  }

  if (renewal.value.customer) {
    await offersResource.reload({
      doctype: 'AT Offer',
      fields: ['name', 'status', 'offer_date'],
      filters: { customer: renewal.value.customer },
      order_by: 'modified desc',
      limit_page_length: 20,
    }).catch(() => {
      offersResource.setData([]);
    });
  } else {
    offersResource.setData([]);
  }

  if (renewal.value.policy || renewal.value.customer) {
    await communicationsResource.reload({
      doctype: 'AT Call Note',
      fields: ['name', 'call_outcome', 'channel', 'note_at', 'owner'],
      filters: renewal.value.policy
        ? { policy: renewal.value.policy }
        : { customer: renewal.value.customer },
      order_by: 'note_at desc',
      limit_page_length: 20,
    }).catch(() => {
      communicationsResource.setData([]);
    });
  } else {
    communicationsResource.setData([]);
  }
}

onMounted(reload);
</script>
