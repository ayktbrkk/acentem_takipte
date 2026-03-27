<template>
  <div class="flex flex-wrap items-center gap-2">
    <button class="btn btn-sm" :class="isListView ? 'btn-primary' : 'btn-outline'" type="button" @click="$emit('view-list')">
      {{ labels.viewList }}
    </button>
    <button class="btn btn-sm" :class="!isListView ? 'btn-primary' : 'btn-outline'" type="button" @click="$emit('view-board')">
      {{ labels.viewBoard }}
    </button>
    <button class="btn btn-primary btn-sm" type="button" @click="$emit('new-offer')">+ {{ labels.newOffer }}</button>
    <button class="btn btn-outline btn-sm" type="button" :disabled="loading" @click="$emit('refresh')">
      {{ labels.refresh }}
    </button>
    <button v-if="isListView" class="btn btn-outline btn-sm" type="button" @click="$emit('focus-filters')">
      {{ labels.focusFilters }}
    </button>
    <button class="btn btn-outline btn-sm" type="button" :disabled="loading" @click="$emit('export-xlsx')">
      {{ labels.exportXlsx }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  isListView: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  labels: {
    type: Object,
    default: () => ({
      viewList: "",
      viewBoard: "",
      newOffer: "",
      refresh: "",
      focusFilters: "",
      exportXlsx: "",
    }),
  },
});

defineEmits(["view-list", "view-board", "new-offer", "refresh", "focus-filters", "export-xlsx"]);
</script>
