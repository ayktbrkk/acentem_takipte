<template>
  <QuickCreateClaim
    v-model="quickClaimOpen"
    :locale="activeLocale"
    :options-map="claimQuickOptionsMap"
    :before-open="prepareQuickClaimDialog"
    :success-handlers="quickClaimSuccessHandlers"
  />
  <QuickCreateManagedDialog
    v-model="ownershipAssignmentOpen"
    config-key="ownership_assignment"
    :locale="activeLocale"
    :options-map="claimQuickOptionsMap"
    :eyebrow="ownershipAssignmentEyebrow"
    :show-save-and-open="false"
    :before-open="prepareOwnershipAssignmentDialog"
    :success-handlers="ownershipAssignmentSuccessHandlers"
  />
</template>

<script setup>
import { computed } from "vue";

import QuickCreateClaim from "../QuickCreateClaim.vue";
import QuickCreateManagedDialog from "../app-shell/QuickCreateManagedDialog.vue";

const props = defineProps({
  showQuickClaimDialog: {
    type: Boolean,
    default: false,
  },
  showOwnershipAssignmentDialog: {
    type: Boolean,
    default: false,
  },
  activeLocale: {
    type: String,
    required: true,
  },
  claimQuickOptionsMap: {
    type: Object,
    required: true,
  },
  ownershipAssignmentEyebrow: {
    type: String,
    required: true,
  },
  prepareQuickClaimDialog: {
    type: Function,
    required: true,
  },
  quickClaimSuccessHandlers: {
    type: Object,
    required: true,
  },
  prepareOwnershipAssignmentDialog: {
    type: Function,
    required: true,
  },
  ownershipAssignmentSuccessHandlers: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits([
  "update:showQuickClaimDialog",
  "update:showOwnershipAssignmentDialog",
]);

const quickClaimOpen = computed({
  get: () => props.showQuickClaimDialog,
  set: (value) => emit("update:showQuickClaimDialog", value),
});

const ownershipAssignmentOpen = computed({
  get: () => props.showOwnershipAssignmentDialog,
  set: (value) => emit("update:showOwnershipAssignmentDialog", value),
});
</script>
