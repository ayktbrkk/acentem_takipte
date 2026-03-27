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
    <div v-else class="space-y-3">
      <slot name="summary" />

      <component :is="listTag" v-if="items.length > 0" :class="listClass">
        <template v-for="(item, index) in items" :key="resolveItemKey(item, index)">
          <slot name="item" :item="item" :index="index" />
        </template>
      </component>

      <div v-else :class="emptyClass">
        <slot name="empty">
          {{ emptyText }}
        </slot>
      </div>

      <PreviewPager
        v-if="showPager && items.length > 0"
        :current-page="pagerCurrentPage"
        :total-pages="pagerTotalPages"
        :show-view-all="pagerShowViewAll"
        :view-all-label="pagerViewAllLabel"
        @change-page="$emit('change-page', $event)"
        @view-all="$emit('view-all')"
      />
    </div>
  </SectionPanel>
</template>

<script setup>
import PreviewPager from "./PreviewPager.vue";
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
  items: { type: Array, default: () => [] },
  itemKey: {
    type: [String, Function],
    default: "name",
  },
  listTag: { type: String, default: "ul" },
  listClass: { type: String, default: "space-y-2" },
  showPager: { type: Boolean, default: true },
  pagerCurrentPage: { type: Number, default: 1 },
  pagerTotalPages: { type: Number, default: 1 },
  pagerShowViewAll: { type: Boolean, default: false },
  pagerViewAllLabel: { type: String, default: "" },
});

defineEmits(["change-page", "view-all"]);

function resolveItemKey(item, index) {
  if (typeof props.itemKey === "function") {
    return props.itemKey(item, index);
  }
  if (item && props.itemKey in item) {
    return item[props.itemKey];
  }
  return index;
}
</script>
