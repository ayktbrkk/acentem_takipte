<template>
  <SectionPanel :title="t('step2Title')">
    <div class="grid gap-4 md:grid-cols-3">
      <div v-if="!isCustomerScreen" class="form-field">
        <label class="form-label" :for="startDateId">{{ t("startDateLabel") }}</label>
        <input :id="startDateId" v-model="form.startDate" class="form-input" type="date" />
      </div>

      <div v-if="!isCustomerScreen" class="form-field">
        <label class="form-label" :for="endDateId">{{ t("endDateLabel") }}</label>
        <input :id="endDateId" v-model="form.endDate" class="form-input" type="date" />
      </div>

      <div class="form-field" :class="{ 'md:col-span-3': isCustomerScreen }">
        <label class="form-label" :for="statusId">{{ statusFieldLabel }}</label>
        <select :id="statusId" v-model="form.status" class="form-input">
          <option value="">{{ t("allStatuses") }}</option>
          <template v-if="isCustomerScreen">
            <option value="Granted">{{ t("consentGranted") }}</option>
            <option value="Revoked">{{ t("consentRevoked") }}</option>
            <option value="Unknown">{{ t("consentUnknown") }}</option>
          </template>
          <template v-else-if="isPolicyScreen">
            <option value="Active">{{ t("statusActive") }}</option>
            <option value="KYT">{{ t("statusKyt") }}</option>
            <option value="IPT">{{ t("statusIpt") }}</option>
          </template>
          <template v-else-if="isOfferScreen">
            <option value="Draft">{{ t("statusDraft") }}</option>
            <option value="Sent">{{ t("statusSent") }}</option>
            <option value="Accepted">{{ t("statusAccepted") }}</option>
            <option value="Converted">{{ t("statusConverted") }}</option>
            <option value="Rejected">{{ t("statusRejected") }}</option>
          </template>
          <template v-else-if="isClaimScreen">
            <option value="Draft">{{ t("statusDraft") }}</option>
            <option value="Open">{{ t("statusOpen") }}</option>
            <option value="Under Review">{{ t("statusUnderReview") }}</option>
            <option value="Approved">{{ t("statusApproved") }}</option>
            <option value="Rejected">{{ t("statusRejected") }}</option>
            <option value="Paid">{{ t("statusPaid") }}</option>
            <option value="Closed">{{ t("statusClosed") }}</option>
          </template>
          <template v-else-if="isPaymentScreen">
            <option value="Draft">{{ t("statusDraft") }}</option>
            <option value="Paid">{{ t("statusPaid") }}</option>
            <option value="Cancelled">{{ t("statusCancelled") }}</option>
          </template>
          <template v-else-if="isRenewalScreen">
            <option value="Open">{{ t("statusOpen") }}</option>
            <option value="In Progress">{{ t("statusInProgress") }}</option>
            <option value="Done">{{ t("statusDone") }}</option>
            <option value="Cancelled">{{ t("statusCancelled") }}</option>
          </template>
          <template v-else>
            <option value="Draft">{{ t("statusDraft") }}</option>
            <option value="Active">{{ t("statusActive") }}</option>
            <option value="Open">{{ t("statusOpen") }}</option>
            <option value="Closed">{{ t("statusClosed") }}</option>
          </template>
        </select>
      </div>
    </div>
  </SectionPanel>
</template>

<script setup>
import { computed, useId } from "vue";

import SectionPanel from "../app-shell/SectionPanel.vue";

const props = defineProps({
  form: {
    type: Object,
    required: true,
  },
  screen: {
    type: String,
    default: "",
  },
  t: {
    type: Function,
    required: true,
  },
});

const startDateId = useId();
const endDateId = useId();
const statusId = useId();

const isCustomerScreen = computed(() => props.screen === "customer_list");
const isPolicyScreen = computed(() => ["policy_list", "dashboard"].includes(String(props.screen || "")));
const isOfferScreen = computed(() => props.screen === "offer_list");
const isClaimScreen = computed(() => props.screen === "claims_board");
const isPaymentScreen = computed(() => props.screen === "payments_board");
const isRenewalScreen = computed(() => props.screen === "renewals_board");
const statusFieldLabel = computed(() => (isCustomerScreen.value ? props.t("consentLabel") : props.t("statusLabel")));
</script>
