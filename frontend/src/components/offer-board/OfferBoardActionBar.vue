<template>
  <div class="flex flex-wrap items-center gap-2">
    <button class="btn btn-sm" :class="isListView ? 'btn-primary' : 'btn-outline'" type="button" @click="$emit('view-list')">
      {{ t("viewList") }}
    </button>
    <button class="btn btn-sm" :class="!isListView ? 'btn-primary' : 'btn-outline'" type="button" @click="$emit('view-board')">
      {{ t("viewBoard") }}
    </button>
    <button class="btn btn-primary btn-sm" type="button" @click="$emit('new-offer')">+ {{ t("newOffer") }}</button>
    <button class="btn btn-outline btn-sm" type="button" :disabled="offersLoading || offerListLoading" @click="$emit('refresh')">
      {{ t("refresh") }}
    </button>
    <button v-if="isListView" class="btn btn-outline btn-sm" type="button" @click="$emit('focus-search')">
      {{ t("focusFilters") }}
    </button>
    <button class="btn btn-outline btn-sm" type="button" :disabled="offersLoading || offerListLoading" @click="$emit('export-xlsx')">
      {{ t("exportXlsx") }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  isListView: {
    type: Boolean,
    default: false,
  },
  offersLoading: {
    type: Boolean,
    default: false,
  },
  offerListLoading: {
    type: Boolean,
    default: false,
  },
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["view-list", "view-board", "new-offer", "refresh", "focus-search", "export-xlsx"]);
</script>
