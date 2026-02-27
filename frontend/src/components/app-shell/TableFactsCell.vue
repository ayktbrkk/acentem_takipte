<template>
  <DataTableCell :cell-class="cellClass">
    <MiniFactList :items="items" :class="factsClass" />
  </DataTableCell>
</template>

<script setup>
import DataTableCell from "./DataTableCell.vue";
import MiniFactList from "./MiniFactList.vue";

defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  cellClass: {
    type: [String, Array, Object],
    default: "",
  },
  factsClass: {
    type: [String, Array, Object],
    default: "",
  },
});
</script>
