<template>
  <div class="fixed inset-0 flex items-center justify-center z-50">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/40" @click="$emit('closed')" />

    <!-- Modal -->
    <div class="relative w-full max-w-md rounded-lg bg-white shadow-xl">
      <!-- Header -->
      <div class="border-b border-slate-200 px-6 py-4">
        <h2 class="text-lg font-semibold text-slate-900">{{ t('title') }}</h2>
        <p class="mt-1 text-sm text-slate-600">
          {{ t('for') }} <span class="font-medium">{{ customerDisplayName }}</span>
        </p>
      </div>

      <!-- Form -->
      <form @submit.prevent="submitAccessRequest" class="space-y-4 px-6 py-4">
        <!-- Request Kind Selection -->
        <div>
          <label class="mb-2 block text-sm font-semibold text-slate-700">
            {{ t('requestType') }} <span class="text-red-500">*</span>
          </label>
          <div class="space-y-2">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="formData.request_kind"
                type="radio"
                value="access"
                class="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              <span class="text-sm text-slate-700">
                <span class="font-medium">{{ t('viewAccessLabel') }}</span>
                <span class="block text-xs text-slate-500">{{ t('viewAccessDesc') }}</span>
              </span>
            </label>

            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="formData.request_kind"
                type="radio"
                value="transfer"
                class="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              <span class="text-sm text-slate-700">
                <span class="font-medium">{{ t('transferLabel') }}</span>
                <span class="block text-xs text-slate-500">{{ t('transferDesc') }}</span>
              </span>
            </label>

            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="formData.request_kind"
                type="radio"
                value="share"
                class="h-4 w-4 rounded border-slate-300 text-brand-600"
              />
              <span class="text-sm text-slate-700">
                <span class="font-medium">{{ t('shareLabel') }}</span>
                <span class="block text-xs text-slate-500">{{ t('shareDesc') }}</span>
              </span>
            </label>
          </div>
        </div>

        <!-- Justification -->
        <div>
          <label for="justification" class="mb-2 block text-sm font-semibold text-slate-700">
            {{ t('justification') }} <span class="text-red-500">*</span>
          </label>
          <textarea
            id="justification"
            v-model="formData.justification"
            rows="4"
            :placeholder="t('justificationPlaceholder')"
            class="input w-full"
            :disabled="isSubmitting"
          />
          <div class="mt-1 flex items-center justify-between">
            <p v-if="formError" class="text-sm text-red-600">{{ formError }}</p>
            <p class="text-xs text-slate-500">{{ formData.justification.length }}/500</p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2 border-t border-slate-200 pt-4">
          <button
            type="button"
            class="btn btn-outline flex-1"
            :disabled="isSubmitting"
            @click="$emit('closed')"
          >
            {{ t('cancel') }}
          </button>
          <button
            type="submit"
            class="btn btn-primary flex-1"
            :disabled="isSubmitting || !isFormValid"
          >
            {{ isSubmitting ? t('submitting') : t('submit') }}
          </button>
        </div>

        <!-- Success Message -->
        <div v-if="showSuccess" class="rounded-lg border border-green-200 bg-green-50 p-3">
          <p class="text-sm font-medium text-green-900">{{ t('successTitle') }}</p>
          <p class="mt-1 text-xs text-green-700">{{ t('successDesc') }}</p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from "vue";
import { useAccessRequestForm } from "../../composables/useAccessRequestForm";
import { getAppPinia } from "../../pinia";
import { useAuthStore } from "../../stores/auth";

interface Props {
  customerName: string;
  customerDisplayName?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  submitted: [requestKind: string];
  closed: [];
}>();

const authStore = useAuthStore(getAppPinia());
const activeLocale = computed(() => unref(authStore.locale) || "en");

const copy = {
  tr: {
    title: "Müşteri Erişim Talebi",
    for: "için",
    requestType: "Talep Türü",
    viewAccessLabel: "Görüntüleme Erişimi",
    viewAccessDesc: "Müşteri bilgilerine geçici salt okunur erişim",
    transferLabel: "Sahiplik Devri",
    transferDesc: "Bu müşteriyi satış entitinize atayın",
    shareLabel: "Erişim Paylaşımı",
    shareDesc: "Bir ekip üyesine okuma erişimi verin",
    justification: "İş Gerekçesi",
    justificationPlaceholder: "Bu müşteriye neden erişmeniz gerektiğini açıklayın. En az 10 karakter.",
    cancel: "İptal",
    submitting: "Gönderiliyor...",
    submit: "Talep Gönder",
    successTitle: "✓ Talep başarıyla gönderildi!",
    successDesc: "Erişim talebiniz kaydedildi ve incelenecek.",
  },
  en: {
    title: "Request Customer Access",
    for: "for",
    requestType: "Request Type",
    viewAccessLabel: "View Access",
    viewAccessDesc: "Temporary read-only access to customer details",
    transferLabel: "Transfer Ownership",
    transferDesc: "Assign this customer to your sales entity",
    shareLabel: "Share Access",
    shareDesc: "Grant read access to a team member",
    justification: "Business Justification",
    justificationPlaceholder: "Explain why you need access to this customer. Minimum 10 characters.",
    cancel: "Cancel",
    submitting: "Submitting...",
    submit: "Submit Request",
    successTitle: "✓ Request submitted successfully!",
    successDesc: "Your access request has been logged and will be reviewed.",
  },
};

function t(key: string) {
  return copy[activeLocale.value as keyof typeof copy]?.[key as keyof typeof copy.en] || copy.en[key as keyof typeof copy.en] || key;
}

const {
  formData,
  isSubmitting,
  formError,
  showSuccess,
  isFormValid,
  submitAccessRequest,
} = useAccessRequestForm(props, emit);
</script>

<style scoped>
.input {
  @apply rounded-lg border border-slate-300 px-3 py-2 text-sm;
}

.input:disabled {
  @apply bg-slate-100 text-slate-500 cursor-not-allowed;
}

.btn {
  @apply rounded-lg font-medium transition-colors;
}

.btn-primary {
  @apply bg-brand-600 text-white hover:bg-brand-700;
}

.btn-outline {
  @apply border border-slate-300 text-slate-700 hover:bg-slate-50;
}

.btn:disabled {
  @apply cursor-not-allowed opacity-60;
}
</style>
