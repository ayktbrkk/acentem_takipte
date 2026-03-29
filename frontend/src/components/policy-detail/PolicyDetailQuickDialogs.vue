<template>
  <QuickCreateManagedDialog
    v-model="ownershipAssignmentDialogModel"
    config-key="ownership_assignment"
    :locale="activeLocale"
    :eyebrow="ownershipAssignmentEyebrow"
    :options-map="policyQuickOptionsMap"
    :before-open="prepareOwnershipAssignmentDialog"
    :success-handlers="ownershipAssignmentSuccessHandlers"
  />
  <QuickCreateManagedDialog
    v-model="ownershipAssignmentEditDialogModel"
    config-key="ownership_assignment_edit"
    :locale="activeLocale"
    :eyebrow="ownershipAssignmentEditEyebrow"
    :options-map="policyQuickOptionsMap"
    :before-open="prepareOwnershipAssignmentEditDialog"
    :success-handlers="ownershipAssignmentSuccessHandlers"
  />
</template>

<script setup>
import { computed } from "vue";
import QuickCreateManagedDialog from "../app-shell/QuickCreateManagedDialog.vue";

const props = defineProps({
  activeLocale: { type: String, required: true },
  ownershipAssignmentEyebrow: { type: String, required: true },
  ownershipAssignmentEditEyebrow: { type: String, required: true },
  policyQuickOptionsMap: { type: Object, required: true },
  prepareOwnershipAssignmentDialog: { type: Function, required: true },
  prepareOwnershipAssignmentEditDialog: { type: Function, required: true },
  ownershipAssignmentSuccessHandlers: { type: Object, required: true },
  showOwnershipAssignmentDialog: { type: Boolean, required: true },
  showOwnershipAssignmentEditDialog: { type: Boolean, required: true },
});

const emit = defineEmits(["update:showOwnershipAssignmentDialog", "update:showOwnershipAssignmentEditDialog"]);

const ownershipAssignmentDialogModel = computed({
  get: () => props.showOwnershipAssignmentDialog,
  set: (value) => emit("update:showOwnershipAssignmentDialog", value),
});

const ownershipAssignmentEditDialogModel = computed({
  get: () => props.showOwnershipAssignmentEditDialog,
  set: (value) => emit("update:showOwnershipAssignmentEditDialog", value),
});
</script>
