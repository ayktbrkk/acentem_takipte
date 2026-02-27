<template>
  <td :class="['at-table-cell', cellClass]">
    <slot />
  </td>
</template>

<script setup>
defineProps({
  cellClass: {
    type: [String, Array, Object],
    default: "",
  },
});
</script>
