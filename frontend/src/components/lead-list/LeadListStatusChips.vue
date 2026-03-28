<template>
  <SectionPanel :title="t('statusFiltersTitle')" :count="leadVisibleStatusOptions.length" panel-class="surface-card rounded-2xl p-3">
    <div class="flex flex-wrap gap-2">
      <button
        v-for="option in leadVisibleStatusOptions"
        :key="option.value || 'all'"
        class="btn btn-sm"
        :class="statusValue === option.value ? 'btn-primary' : 'btn-outline'"
        type="button"
        @click="$emit('apply-status', option.value)"
      >
        {{ option.label }}
        <span class="badge badge-gray">{{ formatCount(option.count) }}</span>
      </button>
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";

defineProps({
  leadVisibleStatusOptions: {
    type: Array,
    required: true,
  },
  statusValue: {
    type: String,
    default: "",
  },
  formatCount: {
    type: Function,
    required: true,
  },
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["apply-status"]);
</script>
