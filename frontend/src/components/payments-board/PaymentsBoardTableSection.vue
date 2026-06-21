<template>
  <article class="surface-card p-5">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-slate-900">{{ t("payment_list") }}</h3>
        <p class="text-xs text-slate-500">{{ t("showing") }} {{ payments.length }}</p>
      </div>
    </div>

    <div v-if="loading" class="mt-4 space-y-3">
      <SkeletonLoader v-for="i in 5" :key="i" variant="text" />
    </div>
    <article v-else-if="errorText" class="qc-error-banner mt-4">
      <div class="flex items-start gap-3">
        <FeatherIcon name="alert-circle" class="h-5 w-5 text-amber-600 mt-0.5" />
        <div>
          <p class="qc-error-banner__text font-bold">{{ t("loadErrorTitle") }}</p>
          <p class="qc-error-banner__text mt-0.5">{{ errorText }}</p>
          <ActionButton class="mt-3" variant="secondary" size="sm" @click="$emit('retry')">
            {{ t("refresh") }}
          </ActionButton>
        </div>
      </div>
    </article>
    <div v-else-if="payments.length === 0" class="mt-4">
      <div class="at-empty-state py-12">
        <div class="card-empty-icon mx-auto">
          <FeatherIcon name="search" class="h-8 w-8 text-slate-300" />
        </div>
        <h4 class="mt-4 text-sm font-bold text-slate-900">{{ t('emptyTitle') }}</h4>
        <p class="mt-1 text-xs text-slate-500">{{ t('empty') }}</p>
      </div>
    </div>
    <div v-else class="mt-4 space-y-4">
      <ListTable
        :columns="paymentListColumns"
        :rows="paymentsWithActions"
        :locale="locale"
        :loading="false"
        :empty-message="t('empty')"
        @row-click="$emit('row-click', $event)"
      />
      <ListPager
        :shown="paymentsWithActions.length"
        :total="total"
        :page="page"
        :has-next="hasNextPage"
        :showing-label="t('showingRecords')"
        @previous="$emit('previous-page')"
        @next="$emit('next-page')"
      />
    </div>
  </article>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui";
import ActionButton from "../app-shell/ActionButton.vue";
import ListTable from "../ui/ListTable.vue";
import ListPager from "../app-shell/ListPager.vue";
import SkeletonLoader from "../ui/SkeletonLoader.vue";

defineProps({
  payments: {
    type: Array,
    required: true,
  },
  paymentListColumns: {
    type: Array,
    required: true,
  },
  paymentsWithActions: {
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
  locale: {
    type: String,
    default: "en",
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
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["row-click", "retry", "previous-page", "next-page"]);
</script>
