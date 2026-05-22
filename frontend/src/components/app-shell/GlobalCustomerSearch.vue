<template>
  <div class="space-y-4">
    <!-- Search Header -->
    <div class="rounded-lg bg-slate-50 p-4">
      <h3 class="text-base font-semibold text-slate-900 mb-3">{{ resolvedTitle }}</h3>
      <p class="text-sm text-slate-600 mb-4">{{ resolvedDescription }}</p>

      <div class="flex gap-2">
        <input
          v-model="searchIdentity"
          type="text"
          inputmode="numeric"
          :placeholder="t('searchInputPlaceholder')"
          class="input flex-grow"
          :disabled="isSearching"
          @keyup.enter="performSearch"
        />
        <ActionButton
          class="search-submit-btn justify-center"
          variant="primary"
          size="sm"
          :disabled="isSearching || searchIdentity.trim().length === 0"
          @click="performSearch"
        >
          {{ isSearching ? t("searching") : t("search") }}
        </ActionButton>
      </div>

      <p v-if="searchError" class="mt-2 text-sm text-red-600">{{ searchError }}</p>
    </div>

    <!-- Empty State -->
    <div v-if="!hasSearched" class="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center">
      <p class="text-sm text-slate-600">{{ t("emptySearchPrompt") }}</p>
    </div>

    <!-- Search Results -->
    <template v-else>
      <!-- Customer Not Found -->
      <div v-if="!searchResult?.exists" class="rounded-lg border border-red-200 bg-red-50 p-4">
        <p class="text-sm font-medium text-red-900">{{ t("notFoundTitle") }}</p>
        <p class="mt-1 text-xs text-red-700">{{ t("notFoundHint") }}</p>
      </div>

      <!-- Customer Found -->
      <template v-else>
        <!-- Masked Data Notice -->
        <MaskedDataNotice
          v-if="hasMaskedNotice"
          :title="t('maskedTitle')"
          :description="searchResult.access_request_allowed ? t('maskedHintRequest') : t('maskedHintContact')"
          :show-request-action="searchResult.access_request_allowed"
          @request-access="openAccessRequestForm"
          @dismiss="dismissMaskedNotice"
        />

        <!-- Customer Details Card -->
        <div class="rounded-lg border border-slate-200 bg-white p-4">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("customerName") }}</p>
              <p class="mt-1 text-sm font-medium text-slate-900">
                {{ searchResult.customer.full_name || searchResult.customer.name }}
              </p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("taxId") }}</p>
              <p class="mt-1 text-sm font-medium text-slate-900">{{ searchResult.customer.tax_id }}</p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("phone") }}</p>
              <p class="mt-1 text-sm text-slate-700">
                {{ searchResult.customer.phone || "—" }}
              </p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("email") }}</p>
              <p class="mt-1 text-sm text-slate-700">
                {{ searchResult.customer.email || "—" }}
              </p>
            </div>
            <div v-if="searchResult.customer.office_branch" class="md:col-span-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("officeBranch") }}</p>
              <p class="mt-1 text-sm text-slate-700">{{ searchResult.customer.office_branch }}</p>
            </div>
          </div>

          <div class="mt-4 flex gap-2 border-t border-slate-200 pt-4">
            <ActionButton class="justify-center" variant="primary" size="sm" @click="openCustomerDetail">
              {{ t("viewFullProfile") }}
            </ActionButton>
            <ActionButton
              v-if="searchResult.access_request_allowed && searchResult.is_masked"
              class="justify-center"
              variant="secondary"
              size="sm"
              @click="openAccessRequestForm"
            >
              {{ t("requestAccess") }}
            </ActionButton>
          </div>
        </div>
      </template>
    </template>

    <!-- Access Request Modal -->
    <AccessRequestForm
      v-if="showAccessForm"
      :customer-name="searchResult?.customer?.name || ''"
      :customer-display-name="searchResult?.customer?.full_name || searchResult?.customer?.name || ''"
      @submitted="onAccessRequestSubmitted"
      @closed="showAccessForm = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

import ActionButton from "./ActionButton.vue";
import MaskedDataNotice from "./MaskedDataNotice.vue";
import AccessRequestForm from "./AccessRequestForm.vue";
import { useGlobalCustomerSearch } from "../../composables/useGlobalCustomerSearch";
import { getAppPinia } from "../../pinia";
import { useAuthStore } from "../../stores/auth";
import { translateText } from "../../utils/i18n";

interface SearchResult {
  exists: boolean;
  is_masked: boolean;
  mask_reason: string | null;
  access_request_allowed: boolean;
  customer: {
    name: string;
    full_name: string;
    tax_id: string;
    phone: string;
    email: string;
    office_branch: string;
  } | null;
}

interface Props {
  title?: string;
  description?: string;
  officeBranch?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "",
  description: "",
});

const emit = defineEmits<{
  "customer-selected": [customer: SearchResult["customer"]];
}>();

const authStore = useAuthStore(getAppPinia());

function t(key: string) {
  return translateText(key, authStore.locale);
}

const resolvedTitle = computed(() => props.title || t("global_search_title"));
const resolvedDescription = computed(() => props.description || t("global_search_subtitle"));

const {
  searchIdentity,
  isSearching,
  hasSearched,
  searchError,
  searchResult,
  showAccessForm,
  hasMaskedNotice,
  performSearch,
  openAccessRequestForm,
  onAccessRequestSubmitted,
  dismissMaskedNotice,
  openCustomerDetail,
} = useGlobalCustomerSearch(props, emit, t);
</script>

<style scoped>
.input {
  @apply rounded-lg border border-slate-300 px-3 py-2 text-sm;
}

.input:disabled {
  @apply bg-slate-100 text-slate-500 cursor-not-allowed;
}
</style>
