<template>
  <SectionPanel :title="t('claimsTableTitle')" :count="formatCount(rows.length)" panel-class="surface-card rounded-2xl p-5">
    <ListTable :columns="claimsTableColumns" :rows="rows" :locale="locale" :loading="loading" :empty-message="t('empty')" @row-click="$emit('row-click', $event)" />
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import ListTable from "../ui/ListTable.vue";

defineProps({
  claimsTableColumns: {
    type: Array,
    required: true,
  },
  rows: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  locale: {
    type: String,
    default: "en",
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

defineEmits(["row-click"]);
</script>
