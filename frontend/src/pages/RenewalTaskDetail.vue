<template>
  <WorkbenchPageLayout
    :breadcrumb="t('renewals_breadcrumb')"
    :title="t('renewal_detail')"
    :subtitle="detailSubtitle"
  >
    <template #actions>
      <ActionButton variant="secondary" size="sm" @click="goBack">
        {{ t('backList') }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" @click="reload">
        <FeatherIcon name="refresh-cw" class="h-4 w-4" />
        {{ t('refresh') }}
      </ActionButton>
      <ActionButton variant="primary" size="sm" @click="openPolicy">
        <FeatherIcon name="external-link" class="h-4 w-4" />
        {{ t('open_policy') }}
      </ActionButton>
    </template>

    <template #metrics>
      <div v-if="renewal.name" class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SaaSMetricCard
          v-for="cell in heroCells"
          :key="cell.label"
          :label="cell.label"
          :value="cell.value"
          :value-class="cell.variant === 'lg' ? 'text-slate-900 font-bold' : 'text-slate-600'"
        />
      </div>
      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SkeletonLoader v-for="i in 4" :key="i" variant="card" />
      </div>
    </template>

    <SectionPanel :title="t('renewalProcess')">
      <StepBar :steps="renewalSteps" />
    </SectionPanel>

    <div class="detail-body at-detail-split-wide">
      <div class="detail-main space-y-6">
        <SectionPanel :title="t('previousPolicy')">
          <div v-if="!policy" class="card-empty">{{ t('noPolicy') }}</div>
          <FieldGroup v-else :fields="policyFields" :cols="2" :locale="activeLocale" />
        </SectionPanel>

        <SectionPanel :title="t('new_offers')">
          <div v-if="!offers.length" class="card-empty">{{ t('noOffers') }}</div>
          <div v-else class="space-y-3">
            <div
              v-for="offer in offers"
              :key="offer.name"
              class="rounded-xl border border-slate-200 bg-slate-50/50 p-3 transition-all hover:border-brand-200 hover:bg-brand-50/30"
            >
              <div class="flex items-center justify-between gap-2">
                <div>
                  <p class="text-sm font-bold text-slate-900">{{ offer.name }}</p>
                  <p class="text-xs text-slate-500">{{ formatDate(offer.offer_date) }} · {{ formatValue(translateStatus(offer.status)) }}</p>
                </div>
                <ActionButton variant="secondary" size="xs" @click="openOffer(offer.name)">{{ t('openOfferDetail') }}</ActionButton>
              </div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel :title="t('communication_history')">
          <div v-if="!communications.length" class="card-empty">{{ t('noCommunication') }}</div>
          <div v-else class="space-y-4">
            <div v-for="item in communications" :key="item.name" class="flex gap-4">
              <div class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
              <div>
                <p class="text-sm font-bold text-slate-900">{{ item.subject || item.call_outcome || item.channel || '-' }}</p>
                <p class="mt-0.5 text-[11px] text-slate-400 font-medium">{{ formatDate(item.note_at) }} · {{ item.owner || '-' }}</p>
              </div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel :title="t('reminders')">
          <div v-if="!reminders.length" class="card-empty">{{ t('noReminders') }}</div>
          <div v-else class="space-y-2">
            <div v-for="item in reminders" :key="item.label" class="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3">
              <p class="field-label !mb-1">{{ item.label }}</p>
              <p class="text-sm font-bold text-slate-900">{{ item.value }}</p>
            </div>
          </div>
        </SectionPanel>
      </div>

      <aside class="detail-sidebar at-detail-aside space-y-6">
        <StandardCustomerCard
          :title="t('customer_details')"
          :customer="customerCard"
          :saving="false"
          :t="t"
          @view-full="openCustomer"
        />

        <SectionPanel :title="t('statusInfo')">
          <FieldGroup :fields="statusFields" :cols="1" layout="list" :locale="activeLocale" />
        </SectionPanel>

        <SectionPanel :title="t('recordMeta')">
          <FieldGroup :fields="recordFields" :cols="1" layout="list" :locale="activeLocale" />
        </SectionPanel>

        <SectionPanel :title="t('people')">
          <FieldGroup :fields="peopleFields" :cols="1" layout="list" :locale="activeLocale" />
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
import SaaSMetricCard from '@/components/app-shell/SaaSMetricCard.vue';
import ActionButton from '@/components/app-shell/ActionButton.vue';
import StandardCustomerCard from '@/components/app-shell/StandardCustomerCard.vue';
import WorkbenchPageLayout from '@/components/app-shell/WorkbenchPageLayout.vue';
import FieldGroup from '@/components/ui/FieldGroup.vue';
import StepBar from '@/components/ui/StepBar.vue';
import SectionPanel from '../components/app-shell/SectionPanel.vue';
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue';
import { getAppPinia } from '../pinia';
import { RENEWAL_TRANSLATIONS } from '../config/renewal_translations';
import { useAuthStore } from '../stores/auth';
import { translateText } from '../utils/i18n';

const _appPinia = getAppPinia();
const _authStore = useAuthStore(_appPinia);
const activeLocale = computed(() => unref(_authStore.locale) || 'en');

function t(key) {
  const locale = String(unref(activeLocale) || 'tr').toLowerCase().startsWith('tr') ? 'tr' : 'en';
  return RENEWAL_TRANSLATIONS[locale]?.[key] || RENEWAL_TRANSLATIONS.en?.[key] || translateText(key, activeLocale);
}

const props = defineProps({ name: { type: String, required: true } });
const name = computed(() => props.name || '');
const router = useRouter();

const renewalResource = createResource({ url: 'frappe.client.get', auto: false });
const policyResource = createResource({ url: 'frappe.client.get_list', auto: false });
const offersResource = createResource({ url: 'frappe.client.get_list', auto: false });
const communicationsResource = createResource({ url: 'frappe.client.get_list', auto: false });
const customerResource = createResource({ url: 'frappe.client.get_list', auto: false });

const renewal = computed(() => unref(renewalResource.data) || {});
const policy = computed(() => {
  const value = unref(policyResource.data);
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
});
const offers = computed(() => (Array.isArray(unref(offersResource.data)) ? unref(offersResource.data) : []));
const communications = computed(() => (Array.isArray(unref(communicationsResource.data)) ? unref(communicationsResource.data) : []));
const customerProfile = computed(() => {
  const value = unref(customerResource.data);
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
});
const customerCard = computed(() => ({
  full_name: customerProfile.value?.full_name || policy.value?.customer || renewal.value.customer || t('unspecified'),
  customer_type: customerProfile.value?.customer_type || renewal.value.customer_type || 'Individual',
  tax_id: customerProfile.value?.tax_id || renewal.value.customer_tax_id || '',
  birth_date: customerProfile.value?.birth_date || renewal.value.customer_birth_date || '',
  occupation: customerProfile.value?.occupation || renewal.value.customer_occupation || '',
  phone: customerProfile.value?.phone || renewal.value.customer_phone || '',
  email: customerProfile.value?.email || renewal.value.customer_email || '',
}));

const detailSubtitle = computed(() => {
  const parts = [renewal.value.name, renewal.value.policy, t('detailSubtitle')].filter((value) => String(value || '').trim());
  return parts.join(' · ');
});

const heroCells = computed(() => [
  { label: t('lblPolicy'), value: formatValue(renewal.value.policy), variant: 'default' },
  { label: t('lblDue'), value: formatDate(renewal.value.due_date), variant: 'default' },
  { label: t('lblRenewalDate'), value: formatDate(renewal.value.renewal_date), variant: 'lg' },
  { label: t('lblStatus'), value: formatValue(translateStatus(renewal.value.status)), variant: 'accent' },
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
  { label: t('fldPolicyNo'), value: formatValue(policy.value?.policy_no || policy.value?.name || renewal.value.policy) },
  { label: t('fldCustomer'), value: formatValue(customerProfile.value?.full_name || policy.value?.customer || renewal.value.customer) },
  { label: t('fldBranch'), value: formatValue(policy.value?.branch) },
  { label: t('fldEndDate'), value: formatDate(policy.value?.end_date) },
  { label: t('lblStatus'), value: formatValue(translateStatus(policy.value?.status)) },
]);

const reminders = computed(() => {
  const rows = [];
  if (renewal.value.due_date) rows.push({ label: t('fldDueDate'), value: formatDate(renewal.value.due_date) });
  if (renewal.value.renewal_date) rows.push({ label: t('fldRenewalDateLbl'), value: formatDate(renewal.value.renewal_date) });
  if (renewal.value.next_contact_date) rows.push({ label: t('fldNextContact'), value: formatDate(renewal.value.next_contact_date) });
  return rows;
});

const peopleFields = computed(() => [
  { label: t('fldCustomer'), value: formatValue(customerProfile.value?.full_name || policy.value?.customer || renewal.value.customer) },
  { label: t('fldAgent'), value: formatValue(renewal.value.assigned_to) },
]);

const statusFields = computed(() => [
  { label: t('lblStatus'), value: formatValue(translateStatus(renewal.value.status)) },
  { label: t('fldPriority'), value: priorityLabel(renewal.value.priority) },
  { label: t('fldLostReason'), value: formatValue(renewal.value.lost_reason_code) },
]);

const recordFields = computed(() => [
  { label: t('fldCreatedBy'), value: formatValue(renewal.value.owner) },
  { label: t('fldCreated'), value: formatDate(renewal.value.creation) },
  { label: t('fldModifiedBy'), value: formatValue(renewal.value.modified_by) },
  { label: t('fldModified'), value: formatDate(renewal.value.modified) },
]);

function priorityLabel(value) {
  const map = { high: t('priority_high'), medium: t('priority_medium'), low: t('priority_low') };
  return map[String(value || '').toLowerCase()] || t('unspecified');
}

function formatValue(value) {
  const text = String(value ?? '').trim();
  return text || t('unspecified');
}

function translateStatus(value) {
  const statusKey = String(value || '').toLowerCase().replace(/\s+/g, '_');
  return statusKey ? t(`status_${statusKey}`) : t('unspecified');
}

function formatDate(value) {
  if (!value) return t('unspecified');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatValue(value);
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

function openCustomer() {
  const customerName = String(policy.value?.customer || renewal.value.customer || '').trim();
  if (!customerName) return;
  router.push({ name: 'customer-detail', params: { name: customerName } });
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
    await customerResource.reload({
      doctype: 'AT Customer',
      fields: ['name', 'full_name', 'customer_type', 'tax_id', 'birth_date', 'occupation', 'phone', 'email'],
      filters: { name: renewal.value.customer },
      limit_page_length: 1,
    }).catch(() => {
      customerResource.setData([]);
    });

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
    customerResource.setData([]);
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
