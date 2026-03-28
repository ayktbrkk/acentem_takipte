<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";

defineProps({
  title: {
    type: String,
    default: "",
  },
});
</script>

<template>
  <SectionPanel :title="title">
    <slot />
  </SectionPanel>
</template>
