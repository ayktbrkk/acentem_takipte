<script setup>
import FieldGroup from "../ui/FieldGroup.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import StatusBadge from "../ui/StatusBadge.vue";

defineProps({
  specialBadges: {
    type: Array,
    default: () => [],
  },
  recordTitle: {
    type: String,
    required: true,
  },
  summaryItems: {
    type: Array,
    default: () => [],
  },
  stateSummaryLabel: {
    type: String,
    default: "",
  },
  noDecisionContextText: {
    type: String,
    default: "",
  },
});
</script>

<template>
  <div class="detail-sidebar space-y-4">
    <SectionPanel :title="stateSummaryLabel">
      <div v-if="specialBadges.length" class="flex flex-wrap gap-2">
        <StatusBadge
          v-for="badge in specialBadges"
          :key="badge.key"
          :domain="badge.type"
          :status="badge.status"
        />
      </div>
      <div v-else class="field-value-muted">{{ noDecisionContextText }}</div>
    </SectionPanel>

    <SectionPanel :title="recordTitle">
      <FieldGroup :fields="summaryItems.slice(0, 4)" :cols="2" />
    </SectionPanel>
  </div>
</template>
