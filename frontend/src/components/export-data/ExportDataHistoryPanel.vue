<template>
  <SectionPanel :title="t('step3Title')" panel-class="surface-card rounded-2xl p-5">
    <div v-if="!historyRows.length" class="card-empty">{{ t("historyEmpty") }}</div>
    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr>
            <th class="table-header">{{ t("historyDate") }}</th>
            <th class="table-header">{{ t("historyDataset") }}</th>
            <th class="table-header">{{ t("historyFormat") }}</th>
            <th class="table-header">{{ t("historyFile") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in historyRows" :key="row.id">
            <td class="table-cell">{{ row.date }}</td>
            <td class="table-cell">{{ row.screenLabel }}</td>
            <td class="table-cell">{{ row.format.toUpperCase() }}</td>
            <td class="table-cell">{{ row.filename }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";

defineProps({
  historyRows: {
    type: Array,
    required: true,
  },
  t: {
    type: Function,
    required: true,
  },
});
</script>
