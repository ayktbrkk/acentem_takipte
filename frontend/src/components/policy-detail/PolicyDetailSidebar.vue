<template>
  <div class="detail-sidebar space-y-4">
    <SectionPanel :title="t('premiumTitle')">
      <div class="grid grid-cols-2 gap-2">
        <div v-for="m in premiumMetrics" :key="m.label" class="mini-metric">
          <p class="mini-metric-label">{{ m.label }}</p>
          <p class="mini-metric-value">{{ m.value }}</p>
        </div>
      </div>
    </SectionPanel>

    <SectionPanel :title="t('customerTitle')">
      <div v-if="customerLoading" class="field-value-muted">{{ t('loading') }}</div>
      <div v-else-if="customer" class="space-y-3">
        <div class="flex items-center gap-2.5">
          <div class="avatar avatar-md avatar-blue">{{ customerInitials }}</div>
          <div>
            <p class="text-sm font-medium text-gray-900">{{ customer.full_name || customer.name }}</p>
            <p class="text-xs text-gray-400">{{ t('taxId') }}: {{ customer.tax_id || '-' }}</p>
          </div>
        </div>
        <button class="btn btn-full btn-sm" type="button" @click="openCustomer(customer.name)">
          {{ t('customer360') }} →
        </button>
      </div>
      <div v-else class="field-value-muted">{{ t('emptyCustomer') }}</div>
    </SectionPanel>

    <SectionPanel :title="t('scheduleTitle')">
      <FieldGroup :fields="dateFields" :cols="2" />
    </SectionPanel>

    <SectionPanel :title="t('assignmentsTitle')">
      <div v-if="assignments.length === 0" class="field-value-muted">{{ t('emptyAssignments') }}</div>
      <div v-else class="space-y-2">
        <MetaListCard
          v-for="assignment in assignments.slice(0, 3)"
          :key="assignment.name"
          :title="assignment.assigned_to || '-'"
          :description="assignment.assignment_role || '-'"
          :meta="assignment.status || '-'"
        />
      </div>
    </SectionPanel>
  </div>
</template>

<script setup>
import MetaListCard from "../app-shell/MetaListCard.vue";
import SectionPanel from "../app-shell/SectionPanel.vue";
import FieldGroup from "../ui/FieldGroup.vue";

defineProps({
  t: { type: Function, required: true },
  premiumMetrics: { type: Array, required: true },
  customerLoading: { type: Boolean, required: true },
  customer: { type: Object, default: null },
  customerInitials: { type: String, required: true },
  openCustomer: { type: Function, required: true },
  dateFields: { type: Array, required: true },
  assignments: { type: Array, required: true },
});
</script>
