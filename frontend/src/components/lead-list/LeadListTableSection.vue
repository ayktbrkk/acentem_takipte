<template>
  <SectionPanel :title="t('leadTableTitle')" :count="formatCount(pagination.total)" panel-class="surface-card rounded-2xl p-5">
    <div v-if="loadErrorText" class="qc-error-banner mb-4">
      <p class="qc-error-banner__text font-semibold">{{ t("loadErrorTitle") }}</p>
      <p class="qc-error-banner__text mt-1">{{ loadErrorText }}</p>
    </div>
    <div v-else-if="actionErrorText" class="qc-error-banner mb-4">
      <p class="qc-error-banner__text">{{ actionErrorText }}</p>
    </div>
    <div v-else-if="actionSuccessText && !lastConvertedOfferName" class="qc-success-banner mb-4">
      <p class="qc-success-banner__text">{{ actionSuccessText }}</p>
    </div>
    <div v-if="lastConvertedOfferName" class="qc-success-banner mb-4 flex flex-wrap items-center gap-2">
      <p class="qc-success-banner__text">{{ t('convertLeadSuccess') }}</p>
      <ActionButton variant="link" size="xs" @click="$emit('open-offer', lastConvertedOfferName)">{{ t('openOffer') }}</ActionButton>
    </div>

    <ListTable
      :columns="leadListColumns"
      :rows="leadListRows"
      :locale="locale"
      :loading="isInitialLoading"
      :empty-message="t('emptyDescription')"
      @row-click="$emit('row-click', $event)"
    />

    <div class="mt-4 flex items-center justify-between">
      <p class="text-xs text-gray-400">{{ leadListRows.length }} / {{ pagination.total }} {{ t("showingRecords") }}</p>
      <div class="flex items-center gap-1">
        <button class="btn btn-sm" :disabled="pagination.page <= 1 || leadListLoading" @click="$emit('previous')">←</button>
        <span class="px-2 text-xs text-gray-600">{{ pagination.page }}</span>
        <button class="btn btn-sm" :disabled="!hasNextPage || leadListLoading" @click="$emit('next')">→</button>
      </div>
    </div>
  </SectionPanel>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import ListTable from "../ui/ListTable.vue";

defineProps({
  leadListColumns: {
    type: Array,
    required: true,
  },
  leadListRows: {
    type: Array,
    required: true,
  },
  pagination: {
    type: Object,
    required: true,
  },
  isInitialLoading: {
    type: Boolean,
    default: false,
  },
  leadListLoading: {
    type: Boolean,
    default: false,
  },
  locale: {
    type: String,
    default: "en",
  },
  hasNextPage: {
    type: Boolean,
    default: false,
  },
  loadErrorText: {
    type: String,
    default: "",
  },
  actionErrorText: {
    type: String,
    default: "",
  },
  actionSuccessText: {
    type: String,
    default: "",
  },
  lastConvertedOfferName: {
    type: String,
    default: "",
  },
  formatCount: {
    type: Function,
    required: true,
  },
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["row-click", "previous", "next", "open-offer"]);
</script>
