<template>
  <Dialog v-model="showDialogProxy" :options="{ title: quickLeadUi.title, size: 'xl' }">
    <template #body-content>
      <QuickCreateDialogShell
        :error="quickLeadError"
        :eyebrow="quickLeadUi.eyebrow"
        :subtitle="quickLeadUi.subtitle"
        :labels="quickCreateCommon"
        :loading="quickLeadLoading"
        @cancel="$emit('cancel')"
        @save="$emit('save', false)"
        @save-and-open="$emit('save', true)"
      >
        <QuickCustomerPicker
          :model="quickLeadForm"
          :field-errors="quickLeadFieldErrors"
          :disabled="quickLeadLoading"
          :locale="activeLocale"
          :office-branch="officeBranch"
          :customer-label="{ tr: 'Müşteri / Ad Soyad', en: 'Customer / Full Name' }"
        />
        <QuickCreateFormRenderer
          :fields="leadQuickFormFields"
          :model="quickLeadForm"
          :field-errors="quickLeadFieldErrors"
          :disabled="quickLeadLoading"
          :locale="activeLocale"
          :options-map="leadQuickOptionsMap"
          @submit="$emit('save', false)"
          @request-related-create="$emit('request-related-create', $event)"
        />
      </QuickCreateDialogShell>
    </template>
  </Dialog>
</template>

<script setup>
import { computed } from "vue";
import { Dialog } from "frappe-ui";

import QuickCustomerPicker from "../app-shell/QuickCustomerPicker.vue";
import QuickCreateDialogShell from "../app-shell/QuickCreateDialogShell.vue";
import QuickCreateFormRenderer from "../app-shell/QuickCreateFormRenderer.vue";

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

const showDialogProxy = computed({
  get: () => props.showQuickLeadDialog,
  set: (value) => emit("update:showQuickLeadDialog", value),
});
</script>
