<template>
  <SectionPanel
    :title="title"
    :count="count"
    :meta="meta"
    :show-count="showCount"
    :panel-class="panelClass"
  >
    <slot name="intro" />
    <div v-if="loading" class="text-sm text-slate-500">
      {{ loadingText }}
    </div>
    <div v-else-if="showEmpty && isEmpty" :class="emptyClass">
      <slot name="empty">
        {{ emptyText }}
      </slot>
    </div>
    <div v-else :class="bodyClass">
      <slot />
    </div>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "./SectionPanel.vue";

const props = defineProps({
  title: { type: String, default: "" },
  count: { type: [String, Number], default: "" },
  meta: { type: String, default: "" },
  showCount: { type: Boolean, default: true },
  panelClass: { type: String, default: "surface-card rounded-2xl p-5" },
  loading: { type: Boolean, default: false },
  loadingText: { type: String, default: "" },
  emptyText: { type: String, default: "" },
  emptyClass: { type: String, default: "at-empty-block" },
  bodyClass: { type: String, default: "space-y-3" },
  showEmpty: { type: Boolean, default: true },
  isEmpty: { type: Boolean, default: false },
});

</script>
