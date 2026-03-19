<template>
  <section class="page-shell space-y-4">
    <div class="detail-topbar">
      <div>
        <p class="detail-breadcrumb">Yenilemeler</p>
        <h1 class="detail-title">
          {{ renewal.name || name }}
          <StatusBadge domain="renewal" :status="renewal.status || 'Open'" />
        </h1>
        <div class="mt-1.5 flex items-center gap-2">
          <span class="copy-tag">{{ renewal.policy || '-' }}</span>
          <span
            v-if="renewal.priority"
            :class="[
              'badge',
              renewal.priority === 'high' && 'badge-red',
              renewal.priority === 'medium' && 'badge-amber',
              renewal.priority === 'low' && 'badge-gray',
            ]"
          >
            {{ priorityLabel(renewal.priority) }}
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn btn-outline btn-sm" type="button" @click="goBack">Listeye Dön</button>
        <button class="btn btn-primary btn-sm" type="button" @click="openPolicy">Poliçeyi Aç</button>
      </div>
    </div>

    <HeroStrip :cells="heroCells" />

    <SectionPanel title="Yenileme Süreci" panel-class="surface-card rounded-2xl p-5">
      <StepBar :steps="renewalSteps" />
    </SectionPanel>

    <div class="detail-body">
      <div class="detail-main space-y-4">
        <SectionPanel title="Eski Poliçe Bilgileri" panel-class="surface-card rounded-2xl p-5">
          <div v-if="!policy" class="card-empty">Poliçe bilgisi bulunamadı.</div>
          <FieldGroup v-else :fields="policyFields" :cols="2" />
        </SectionPanel>

        <SectionPanel title="Yeni Teklifler" panel-class="surface-card rounded-2xl p-5">
          <div v-if="!offers.length" class="card-empty">Bu poliçe için teklif bulunamadı.</div>
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
                <button class="btn btn-sm" type="button" @click="openOffer(offer.name)">Detay</button>
              </div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Müşteri İletişim Geçmişi" panel-class="surface-card rounded-2xl p-5">
          <div v-if="!communications.length" class="card-empty">İletişim kaydı bulunamadı.</div>
          <div v-else>
            <div v-for="item in communications" :key="item.name" class="timeline-item">
              <div class="tl-dot" />
              <div>
                <p class="tl-text">{{ item.subject || item.channel || '-' }}</p>
                <p class="tl-time">{{ formatDate(item.creation) }} · {{ item.owner || '-' }}</p>
              </div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Hatırlatıcılar" panel-class="surface-card rounded-2xl p-5">
          <div v-if="!reminders.length" class="card-empty">Hatırlatıcı kaydı bulunamadı.</div>
          <div v-else class="space-y-2">
            <div v-for="item in reminders" :key="item.label" class="rounded-md bg-gray-50 px-3 py-2">
              <p class="text-sm font-medium text-gray-900">{{ item.label }}</p>
              <p class="text-xs text-gray-500">{{ item.value }}</p>
            </div>
          </div>
        </SectionPanel>
      </div>

      <aside class="detail-sidebar space-y-4">
        <SectionPanel title="İlgili Kişiler" panel-class="surface-card rounded-2xl p-5">
          <FieldGroup :fields="peopleFields" :cols="1" />
        </SectionPanel>

        <SectionPanel title="Durum Bilgisi" panel-class="surface-card rounded-2xl p-5">
          <FieldGroup :fields="statusFields" :cols="1" />
        </SectionPanel>

        <SectionPanel title="Kayıt Meta" panel-class="surface-card rounded-2xl p-5">
          <FieldGroup :fields="recordFields" :cols="1" />
        </SectionPanel>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, unref } from 'vue';
import { createResource } from 'frappe-ui';
import { useRouter } from 'vue-router';

import StatusBadge from '@/components/ui/StatusBadge.vue';
import HeroStrip from '@/components/ui/HeroStrip.vue';
import FieldGroup from '@/components/ui/FieldGroup.vue';
import StepBar from '@/components/ui/StepBar.vue';
import SectionPanel from '../components/app-shell/SectionPanel.vue';

const props = defineProps({ name: { type: String, required: true } });
const name = computed(() => props.name || '');
const router = useRouter();

const renewalResource = createResource({ url: 'frappe.client.get', auto: false });
const policyResource = createResource({ url: 'frappe.client.get', auto: false });
const offersResource = createResource({ url: 'frappe.client.get_list', auto: false });
const communicationsResource = createResource({ url: 'frappe.client.get_list', auto: false });

const renewal = computed(() => unref(renewalResource.data) || {});
const policy = computed(() => unref(policyResource.data) || null);
const offers = computed(() => (Array.isArray(unref(offersResource.data)) ? unref(offersResource.data) : []));
const communications = computed(() => (Array.isArray(unref(communicationsResource.data)) ? unref(communicationsResource.data) : []));

const heroCells = computed(() => [
  { label: 'Poliçe', value: renewal.value.policy || '-', variant: 'default' },
  { label: 'Vade', value: formatDate(renewal.value.due_date), variant: 'default' },
  { label: 'Yenileme Tarihi', value: formatDate(renewal.value.renewal_date), variant: 'lg' },
  { label: 'Durum', value: renewal.value.status || '-', variant: 'accent' },
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
  { label: 'Bildirim', state: getStepStatus('notified') },
  { label: 'Teklif', state: getStepStatus('offer_sent') },
  { label: 'Karar', state: getStepStatus('decision') },
  { label: 'Poliçe', state: getStepStatus('renewed') },
]);

const policyFields = computed(() => [
  { label: 'Poliçe No', value: policy.value?.policy_no || policy.value?.name || renewal.value.policy || '-' },
  { label: 'Müşteri', value: policy.value?.customer || '-' },
  { label: 'Branş', value: policy.value?.branch || '-' },
  { label: 'Bitiş', value: formatDate(policy.value?.end_date) },
  { label: 'Durum', value: policy.value?.status || '-' },
]);

const reminders = computed(() => {
  const rows = [];
  if (renewal.value.due_date) rows.push({ label: 'Son Tarih', value: formatDate(renewal.value.due_date) });
  if (renewal.value.renewal_date) rows.push({ label: 'Yenileme Tarihi', value: formatDate(renewal.value.renewal_date) });
  if (renewal.value.next_contact_date) rows.push({ label: 'Sonraki İletişim', value: formatDate(renewal.value.next_contact_date) });
  return rows;
});

const peopleFields = computed(() => [
  { label: 'Müşteri', value: policy.value?.customer || '-' },
  { label: 'Temsilci', value: renewal.value.assigned_to || '-' },
]);

const statusFields = computed(() => [
  { label: 'Durum', value: renewal.value.status || '-' },
  { label: 'Öncelik', value: priorityLabel(renewal.value.priority) },
  { label: 'Kayıp Nedeni', value: renewal.value.lost_reason_code || '-' },
]);

const recordFields = computed(() => [
  { label: 'Oluşturan', value: renewal.value.owner || '-' },
  { label: 'Oluşturma', value: formatDate(renewal.value.creation) },
  { label: 'Güncelleyen', value: renewal.value.modified_by || '-' },
  { label: 'Güncelleme', value: formatDate(renewal.value.modified) },
]);

function priorityLabel(value) {
  const map = { high: 'Yüksek', medium: 'Orta', low: 'Düşük' };
  return map[String(value || '').toLowerCase()] || '-';
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
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
      policyResource.reload({ doctype: 'AT Policy', name: renewal.value.policy }),
      offersResource.reload({
        doctype: 'AT Offer',
        fields: ['name', 'status', 'offer_date'],
        filters: { policy: renewal.value.policy },
        order_by: 'modified desc',
        limit_page_length: 20,
      }),
    ]);
  }

  await communicationsResource.reload({
    doctype: 'AT Communication Log',
    fields: ['name', 'subject', 'channel', 'creation', 'owner'],
    filters: [['reference_name', '=', name.value]],
    order_by: 'creation desc',
    limit_page_length: 20,
  }).catch(() => {
    communicationsResource.setData([]);
  });
}

onMounted(reload);
</script>
