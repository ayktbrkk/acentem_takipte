<template>
  <WorkbenchPageLayout
    :breadcrumb="`Partners > Customer Search`"
    title="Global Customer Search"
    subtitle="Search and request access to customers across branches"
  >
    <template #actions>
      <button class="btn btn-outline btn-sm" @click="resetSearch">
        {{ hasSearched ? "Clear Search" : "?" }}
      </button>
    </template>

    <div class="space-y-6">
      <!-- Help Card -->
      <div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 class="font-semibold text-blue-900">💡 How to Use</h3>
        <ul class="mt-2 space-y-1 text-sm text-blue-800">
          <li>• Search for customers by Tax ID (10-11 digits) or Customer ID</li>
          <li>• Some information may be masked based on your permissions</li>
          <li>• Submit an access request to view sensitive customer details</li>
          <li>• Track your requests in the history section below</li>
        </ul>
      </div>

      <!-- Global Search Component -->
      <GlobalCustomerSearch
        @customer-selected="onCustomerSelected"
      />

      <!-- Request History Section -->
      <div v-if="showRequestHistory" class="space-y-3">
        <h2 class="text-lg font-semibold text-slate-900">Recent Access Requests</h2>
        <div
          v-if="accessRequestHistory.length === 0"
          class="rounded-lg border-2 border-dashed border-slate-300 p-6 text-center"
        >
          <p class="text-sm text-slate-600">No access requests yet</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="request in accessRequestHistory"
            :key="request.id"
            class="rounded-lg border border-slate-200 bg-white p-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-slate-900">{{ request.customer_name }}</p>
                <p class="text-xs text-slate-600">
                  {{ request.request_kind | titleCase }} • {{ formatDate(request.created) }}
                </p>
              </div>
              <span
                class="rounded-full px-2 py-1 text-xs font-semibold"
                :class="{
                  'bg-yellow-100 text-yellow-800': request.status === 'Pending',
                  'bg-green-100 text-green-800': request.status === 'Approved',
                  'bg-red-100 text-red-800': request.status === 'Rejected',
                }"
              >
                {{ request.status }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </WorkbenchPageLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import GlobalCustomerSearch from "../components/app-shell/GlobalCustomerSearch.vue";

interface AccessRequest {
  id: string;
  customer_name: string;
  request_kind: "access" | "transfer" | "share";
  status: "Pending" | "Approved" | "Rejected";
  created: string;
}

const hasSearched = ref(false);
const accessRequestHistory = ref<AccessRequest[]>([]);
const showRequestHistory = ref(false);

const onCustomerSelected = (customer: any) => {
  hasSearched.value = true;
};

const resetSearch = () => {
  hasSearched.value = false;
};

const formatDate = (dateStr: string): string => {
  try {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

// Load request history on mount
onMounted(async () => {
  try {
    const response = await fetch("/api/resource/AT Access Log?filters=[[\"action\",\"=\",\"Create\"]]&fields=[\"name\",\"reference_name\",\"action_summary\",\"docstatus\",\"created\"]&limit_page_length=10", {
      headers: {
        "X-Frappe-CSRF-Token": (window as any).frappe?.csrf_token || "",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.data) {
        accessRequestHistory.value = data.data
          .filter((log: any) => log.action_summary?.includes("REQUEST"))
          .map((log: any) => ({
            id: log.name,
            customer_name: log.reference_name || "Unknown",
            request_kind: log.action_summary?.includes("ACCESS")
              ? "access"
              : log.action_summary?.includes("TRANSFER")
              ? "transfer"
              : "share",
            status: "Pending", // Would be set based on actual approval workflow
            created: log.created,
          }));
        showRequestHistory.value = accessRequestHistory.value.length > 0;
      }
    }
  } catch (error) {
    console.error("Failed to load access request history:", error);
  }
});
</script>

<style scoped>
.btn {
  @apply rounded-lg font-medium transition-colors;
}

.btn-outline {
  @apply border border-slate-300 text-slate-700 hover:bg-slate-50;
}

.btn-sm {
  @apply px-3 py-2 text-sm;
}
</style>
