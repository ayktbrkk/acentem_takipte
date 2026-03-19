<template>
  <article :class="panelClass">
    <SectionCardHeader :title="title" :count="count" :meta="meta" :show-count="showCount">
      <template v-if="$slots.trailing" #trailing>
        <slot name="trailing" />
      </template>
    </SectionCardHeader>
    <slot />
  </article>
</template>

<script setup>
import SectionCardHeader from "./SectionCardHeader.vue";

defineProps({
  title: { type: String, default: "" },
  count: { type: [String, Number], default: "" },
  meta: { type: String, default: "" },
  showCount: { type: Boolean, default: true },
  panelClass: { type: String, default: "surface-card rounded-2xl p-5" },
});
</script>
