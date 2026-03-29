<template>
  <div class="detail-topbar">
    <div>
      <p class="detail-breadcrumb">{{ t("breadcrumb") }}</p>
      <h1 class="detail-title">
        {{ policy.policy_no || policy.name || name }}
        <StatusBadge v-if="policy.status" :status="policy.status" domain="policy" />
      </h1>
      <p class="detail-subtitle">{{ `${policy.insurance_company || '-'} / ${policy.branch || '-'}` }}</p>
      <div class="mt-1.5 flex flex-wrap items-center gap-2">
        <button class="copy-tag" type="button" @click="copyIdentity(policy.name, 'recordNo')">
          {{ policy.name || '-' }}
        </button>
        <button class="copy-tag" :disabled="!policy.policy_no" type="button" @click="copyIdentity(policy.policy_no, 'carrierPolicyNo')">
          {{ carrierPolicyDisplayValue }}
        </button>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <ActionButton variant="secondary" size="sm" type="button" @click="goBack">
        {{ t("backList") }}
      </ActionButton>
      <ActionButton variant="primary" size="sm" type="button" @click="openQuickOwnershipAssignment">
        {{ t("newAssignment") }}
      </ActionButton>
    </div>
  </div>
</template>

<script setup>
import ActionButton from "../app-shell/ActionButton.vue";
import StatusBadge from "../ui/StatusBadge.vue";

defineProps({
  name: { type: String, default: "" },
  policy: { type: Object, required: true },
  carrierPolicyDisplayValue: { type: String, required: true },
  copyIdentity: { type: Function, required: true },
  goBack: { type: Function, required: true },
  openQuickOwnershipAssignment: { type: Function, required: true },
  t: { type: Function, required: true },
});
</script>
