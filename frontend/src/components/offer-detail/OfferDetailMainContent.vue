<template>
  <div class="detail-main space-y-4">
    <SectionPanel :title="t('coverageTitle')">
      <template #trailing>
        <button class="btn btn-sm" type="button" @click="editOffer">{{ t("edit") }}</button>
      </template>

      <div v-if="loading" class="card-empty">{{ t('loading') }}</div>
      <div v-else-if="!coverages.length" class="card-empty">{{ t("emptyCoverages") }}</div>
      <table v-else class="min-w-full">
        <thead class="bg-gray-50">
          <tr>
            <th class="table-header">{{ t("coverageColumn") }}</th>
            <th class="table-header text-right">{{ t("limitColumn") }}</th>
            <th class="table-header text-right">{{ t("premiumColumn") }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="coverage in coverages" :key="coverage.name || coverage.coverage_name">
            <td class="table-cell">{{ coverage.coverage_name || coverage.item_name || '-' }}</td>
            <td class="table-cell text-right font-medium">{{ fmtMoney(coverage.limit || coverage.coverage_limit, offer.currency || 'TRY') }}</td>
            <td class="table-cell text-right">{{ fmtMoney(coverage.premium || coverage.amount, offer.currency || 'TRY') }}</td>
          </tr>
        </tbody>
      </table>
    </SectionPanel>

    <SectionPanel :title="t('documentsTitle')">
      <template #trailing>
        <button class="btn btn-sm" type="button" @click="editOffer">{{ t("edit") }}</button>
      </template>

      <div v-if="loading" class="card-empty">{{ t('loading') }}</div>
      <div v-else-if="!documents.length" class="card-empty">{{ t("emptyDocuments") }}</div>
      <div v-else class="divide-y divide-gray-100">
        <div v-for="doc in documents" :key="doc.name || doc.file_url || doc.file_name" class="flex items-center justify-between py-2.5">
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-900">{{ doc.file_name || doc.label || doc.name }}</span>
          </div>
          <button class="btn btn-sm" type="button" @click="openDocument(doc)">{{ t("downloadDocument") }}</button>
        </div>
      </div>
    </SectionPanel>

    <SectionPanel :title="t('activitiesTitle')">
      <div v-if="loading" class="card-empty">{{ t('loading') }}</div>
      <div v-else-if="!activities.length" class="card-empty">{{ t("emptyActivities") }}</div>
      <div v-else>
        <div v-for="activity in activities" :key="activity.name || activity.key" class="timeline-item">
          <div :class="['tl-dot', activity.is_important && 'tl-dot-active']" />
          <div>
            <p class="tl-text">{{ activity.description || activity.title || '-' }}</p>
            <p class="tl-time">{{ fmtDate(activity.creation || activity.at) }} · {{ activity.owner || activity.actor || '-' }}</p>
          </div>
        </div>
      </div>
    </SectionPanel>
  </div>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";

defineProps({
  t: { type: Function, required: true },
  offer: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  coverages: { type: Array, default: () => [] },
  documents: { type: Array, default: () => [] },
  activities: { type: Array, default: () => [] },
  fmtMoney: { type: Function, required: true },
  fmtDate: { type: Function, required: true },
  openDocument: { type: Function, required: true },
  editOffer: { type: Function, required: true },
});
</script>
