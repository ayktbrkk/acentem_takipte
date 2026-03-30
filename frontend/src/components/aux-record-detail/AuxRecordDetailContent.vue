<script setup>
import { computed } from "vue";

import ActionButton from "../app-shell/ActionButton.vue";
import MetaListCard from "../app-shell/MetaListCard.vue";
import FieldGroup from "../ui/FieldGroup.vue";
import AuxRecordDetailTabs from "./AuxRecordDetailTabs.vue";
import AuxRecordDetailSectionGroup from "./AuxRecordDetailSectionGroup.vue";

const props = defineProps({
  activeDetailTab: {
    type: String,
    default: "overview",
  },
  detailTabs: {
    type: Array,
    default: () => [],
  },
  visibleGroups: {
    type: Array,
    default: () => [],
  },
  relatedRecordCards: {
    type: Array,
    default: () => [],
  },
  activityItems: {
    type: Array,
    default: () => [],
  },
  visibleTextBlocks: {
    type: Array,
    default: () => [],
  },
  groupTitle: {
    type: Function,
    default: (value) => String(value || ""),
  },
  groupItems: {
    type: Function,
    default: (fields) => fields || [],
  },
  fieldLabel: {
    type: Function,
    default: (field) => String(field || ""),
  },
  t: {
    type: Function,
    required: true,
  },
});

const emit = defineEmits(["update:activeDetailTab"]);

const tabProxy = computed({
  get: () => props.activeDetailTab,
  set: (value) => emit("update:activeDetailTab", value),
});
</script>

<template>
  <div class="detail-main space-y-4">
    <AuxRecordDetailTabs v-model:activeDetailTab="tabProxy" :tabs="detailTabs" />

    <AuxRecordDetailSectionGroup
      v-for="group in visibleGroups"
      :key="group.key"
      :title="group.title || groupTitle(group.key)"
    >
      <FieldGroup :fields="group.items || groupItems(group.fields)" :cols="group.cols || 2" />
    </AuxRecordDetailSectionGroup>

    <AuxRecordDetailSectionGroup v-if="activeDetailTab === 'related'" :title="t('relatedTitle')">
      <div v-if="relatedRecordCards.length" class="grid gap-3 lg:grid-cols-2">
        <MetaListCard
          v-for="item in relatedRecordCards"
          :key="item.key"
          :title="item.title"
          :subtitle="item.subtitle"
          :description="item.description"
          :meta="item.meta"
        >
          <template #trailing>
            <ActionButton v-if="item.open" variant="link" size="xs" @click="item.open()">{{ t("panel") }}</ActionButton>
          </template>
        </MetaListCard>
      </div>
      <div v-else class="at-empty-block">{{ t("noRelatedRecords") }}</div>
    </AuxRecordDetailSectionGroup>

    <AuxRecordDetailSectionGroup v-if="activeDetailTab === 'activity'" :title="t('activityTitle')">
      <div v-if="activityItems.length" class="space-y-3">
        <MetaListCard
          v-for="item in activityItems"
          :key="item.key"
          :title="item.title"
          :description="item.description"
          :meta="item.meta"
        />
      </div>
      <div v-else class="at-empty-block">{{ t("noActivity") }}</div>
    </AuxRecordDetailSectionGroup>

    <div v-if="visibleTextBlocks.length" class="grid gap-4 lg:grid-cols-2">
      <AuxRecordDetailSectionGroup
        v-for="block in visibleTextBlocks"
        :key="block.key || block.field"
        :title="block.title || fieldLabel(block.field)"
        :class="block.fullWidth ? 'lg:col-span-2' : ''"
      >
        <pre class="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{{ block.value }}</pre>
      </AuxRecordDetailSectionGroup>
    </div>
  </div>
</template>
