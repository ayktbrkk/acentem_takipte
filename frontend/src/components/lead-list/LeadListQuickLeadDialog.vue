<template>
  <LeadForm
    v-if="showQuickLeadDialog"
    :model="quickLeadForm"
    :field-errors="quickLeadFieldErrors"
    :options-map="leadQuickOptionsMap"
    :disabled="quickLeadLoading"
    :loading="quickLeadLoading"
    :error="quickLeadError"
    :eyebrow="quickLeadUi.eyebrow"
    :subtitle="quickLeadUi.subtitle"
    :locale="activeLocale"
    :office-branch="officeBranch"
    :labels="quickCreateCommon"
    :fields="leadQuickFormFields"
    @cancel="$emit('cancel')"
    @save="$emit('save', $event)"
  />
</template>

<script setup>
import LeadForm from "../LeadForm.vue";

const props = defineProps({
  showQuickLeadDialog: {
    type: Boolean,
    default: false,
  },
  quickLeadUi: {
    type: Object,
    required: true,
  },
  quickLeadError: {
    type: String,
    default: "",
  },
  quickCreateCommon: {
    type: Object,
    required: true,
  },
  quickLeadLoading: {
    type: Boolean,
    default: false,
  },
  quickLeadForm: {
    type: Object,
    required: true,
  },
  quickLeadFieldErrors: {
    type: Object,
    required: true,
  },
  activeLocale: {
    type: String,
    required: true,
  },
  officeBranch: {
    type: String,
    default: "",
  },
  leadQuickFormFields: {
    type: Array,
    required: true,
  },
  leadQuickOptionsMap: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["update:showQuickLeadDialog", "cancel", "save", "request-related-create"]);
</script>
