<template>
  <SectionPanel :title="t('claimsTableTitle')" :count="formatCount(rows.length)" panel-class="surface-card rounded-2xl p-5">
    <div
      v-if="errorText"
      class="mb-4 rounded-xl border border-at-red/20 bg-at-red/5 px-4 py-3 text-sm text-at-red shadow-sm"
      role="alert"
    >
      <p>{{ errorText }}</p>
      <ActionButton v-if="showRetry" class="mt-3" variant="secondary" size="sm" @click="$emit('retry')">
        {{ t("refresh") }}
      </ActionButton>
    </div>
    <ListTable
      :columns="claimsTableColumns"
      :rows="rows"
      :locale="locale"
      :loading="loading"
      :empty-message="t('empty')"
      @row-click="$emit('row-click', $event)"
    />
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import ActionButton from "../app-shell/ActionButton.vue";
import ListTable from "../ui/ListTable.vue";

defineProps({
  claimsTableColumns: {
    type: Array,
    required: true,
  },
  rows: {
    type: Array,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  errorText: {
    type: String,
    default: "",
  },
  showRetry: {
    type: Boolean,
    default: true,
  },
  locale: {
    type: String,
    default: "en",
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

defineEmits(["row-click", "retry"]);
</script>
