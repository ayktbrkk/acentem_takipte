<template>
  <div class="fixed inset-0 flex items-center justify-center z-50">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/40" @click="$emit('closed')" />

    <!-- Modal -->
    <div class="relative w-full max-w-md rounded-lg bg-white shadow-xl">
      <!-- Header -->
      <div class="border-b border-slate-200 px-6 py-4">
        <h2 class="text-lg font-semibold text-slate-900">Request Customer Access</h2>
        <p class="mt-1 text-sm text-slate-600">
          for <span class="font-medium">{{ customerDisplayName }}</span>
        </p>
      </div>

      <!-- Form -->
      <form @submit.prevent="submitAccessRequest" class="space-y-4 px-6 py-4">
        <!-- Request Kind Selection -->
        <div>
          <label class="mb-2 block text-sm font-semibold text-slate-700">
            Request Type <span class="text-red-500">*</span>
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
                <span class="font-medium">View Access</span>
                <span class="block text-xs text-slate-500">Temporary read-only access to customer details</span>
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
                <span class="font-medium">Transfer Ownership</span>
                <span class="block text-xs text-slate-500">Assign this customer to your sales entity</span>
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
                <span class="font-medium">Share Access</span>
                <span class="block text-xs text-slate-500">Grant read access to a team member</span>
              </span>
            </label>
          </div>
        </div>

        <!-- Justification -->
        <div>
          <label for="justification" class="mb-2 block text-sm font-semibold text-slate-700">
            Business Justification <span class="text-red-500">*</span>
          </label>
          <textarea
            id="justification"
            v-model="formData.justification"
            rows="4"
            placeholder="Explain why you need access to this customer. Minimum 10 characters."
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
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary flex-1"
            :disabled="isSubmitting || !isFormValid"
          >
            {{ isSubmitting ? "Submitting..." : "Submit Request" }}
          </button>
        </div>

        <!-- Success Message -->
        <div v-if="showSuccess" class="rounded-lg border border-green-200 bg-green-50 p-3">
          <p class="text-sm font-medium text-green-900">✓ Request submitted successfully!</p>
          <p class="mt-1 text-xs text-green-700">Your access request has been logged and will be reviewed.</p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

interface Props {
  customerName: string;
  customerDisplayName?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  submitted: [requestKind: string];
  closed: [];
}>();

const formData = ref({
  request_kind: "access",
  justification: "",
});

const isSubmitting = ref(false);
const formError = ref("");
const showSuccess = ref(false);

const isFormValid = computed(() => {
  return (
    formData.value.request_kind &&
    formData.value.justification.length >= 10 &&
    formData.value.justification.length <= 500
  );
});

const submitAccessRequest = async () => {
  if (!isFormValid.value) return;

  isSubmitting.value = true;
  formError.value = "";

  try {
    const response = await fetch("/api/method/create_customer_access_request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Frappe-CSRF-Token": (window as any).frappe?.csrf_token || "",
      },
      body: JSON.stringify({
        customer_name: props.customerName,
        justification: formData.value.justification,
        request_kind: formData.value.request_kind,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      formError.value = errorData.message || "Failed to submit request. Please try again.";
      return;
    }

    showSuccess.value = true;
    emit("submitted", formData.value.request_kind);

    // Close modal after 2 seconds
    setTimeout(() => {
      emit("closed");
    }, 2000);
  } catch (error) {
    formError.value = `Error submitting request: ${error instanceof Error ? error.message : "Unknown error"}`;
  } finally {
    isSubmitting.value = false;
  }
};
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
