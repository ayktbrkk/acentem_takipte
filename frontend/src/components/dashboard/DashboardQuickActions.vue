<template>
  <SectionPanel :title="t('quickActions')" :show-count="false">
    <div class="space-y-2">
      <ActionPreviewCard
        v-for="action in actions"
        :key="action.key"
        :title="action.label"
        :description="action.description"
        @click="openPage(action.to)"
      />
    </div>
  </SectionPanel>
</template>

<script setup>
import ActionPreviewCard from "../app-shell/ActionPreviewCard.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";

defineProps({
  actions: { type: Array, required: true },
  openPage: { type: Function, required: true },
  t: { type: Function, required: true },
});
</script>
