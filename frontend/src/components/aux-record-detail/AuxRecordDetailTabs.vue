<script setup>
import { computed } from "vue";

import DetailTabsBar from "../app-shell/DetailTabsBar.vue";

const props = defineProps({
  activeDetailTab: {
    type: String,
    default: "overview",
  },
  tabs: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["update:activeDetailTab"]);

const tabProxy = computed({
  get: () => props.activeDetailTab,
  set: (value) => emit("update:activeDetailTab", value),
});
</script>

<template>
  <article class="surface-card rounded-2xl p-4">
    <DetailTabsBar v-model="tabProxy" :tabs="tabs" />
  </article>
</template>
