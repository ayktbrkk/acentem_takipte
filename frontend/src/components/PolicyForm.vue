<template>
  <QuickCreateDialogShell
    :error="error"
    :eyebrow="eyebrow"
    :subtitle="subtitle"
    :show-eyebrow="Boolean(eyebrow)"
    :show-subtitle="Boolean(subtitle)"
    :loading="loading"
    :save-disabled="loading || disabled"
    :show-save-and-open="false"
    :labels="{ cancel: 'İptal', save: loading ? 'Kaydediliyor...' : 'Kaydet' }"
    @cancel="emit('cancel')"
    @save="emit('submit')"
  >
    <QuickCreateFormRenderer
      :fields="fields"
      :model="model"
      :field-errors="fieldErrors"
      :disabled="disabled || loading"
      :options-map="optionsMap"
    />
  </QuickCreateDialogShell>
</template>

<script setup>
import { computed } from "vue";
import QuickCreateDialogShell from "./app-shell/QuickCreateDialogShell.vue";
import QuickCreateFormRenderer from "./app-shell/QuickCreateFormRenderer.vue";
import { getQuickCreateConfig } from "../config/quickCreateRegistry";

const props = defineProps({
  model: { type: Object, required: true },
  fieldErrors: { type: Object, default: () => ({}) },
  optionsMap: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  hasSourceOffer: { type: Boolean, default: false },
  officeBranch: { type: String, default: "" },
  error: { type: String, default: "" },
  eyebrow: { type: String, default: "" },
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
});

const emit = defineEmits(["cancel", "submit"]);

const config = getQuickCreateConfig("policy");
const allFields = computed(() => config?.fields || []);

const CUSTOMER_INTERNAL_FIELDS = [
  "customer",
  "customer_full_name",
  "customer_type",
  "customer_tax_id",
  "customer_phone",
  "customer_email",
];

const fields = computed(() =>
  allFields.value.filter((field) => !CUSTOMER_INTERNAL_FIELDS.includes(field.name))
);
</script>
