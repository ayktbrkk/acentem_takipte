<template>
  <SectionPanel :title="t('claimsTableTitle')" :count="formatCount(total)" panel-class="surface-card rounded-2xl p-5">
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
    <ListPager
      v-if="!errorText"
      class="mt-4"
      :shown="rows.length"
      :total="total"
      :page="page"
      :has-next="hasNextPage"
      :showing-label="showingLabel"
      @previous="$emit('previous-page')"
      @next="$emit('next-page')"
    />
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";
import ActionButton from "../app-shell/ActionButton.vue";
import ListTable from "../ui/ListTable.vue";
import ListPager from "../app-shell/ListPager.vue";

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
  page: {
    type: Number,
    default: 1,
  },
  total: {
    type: Number,
    default: 0,
  },
  hasNextPage: {
    type: Boolean,
    default: false,
  },
  showingLabel: {
    type: String,
    default: "",
  },
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["row-click", "retry", "previous-page", "next-page"]);
</script>
