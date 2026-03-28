<template>
  <Dialog v-model="showProxy" :options="{ title, size: 'xl' }">
    <template #body-content>
      <PolicyForm
        :key="dialogKey"
        :model="model"
        :field-errors="fieldErrors"
        :options-map="optionsMap"
        :disabled="disabled"
        :loading="loading"
        :has-source-offer="hasSourceOffer"
        :office-branch="officeBranch"
        :error="error"
        :eyebrow="eyebrow"
        :title="title"
        :subtitle="subtitle"
        @cancel="emit('cancel')"
        @submit="emit('submit')"
      />
    </template>
  </Dialog>
</template>

<script setup>
import { computed } from "vue";
import { Dialog } from "frappe-ui";

import PolicyForm from "../PolicyForm.vue";

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  dialogKey: {
    type: [String, Number],
    default: "",
  },
  model: {
    type: Object,
    required: true,
  },
  fieldErrors: {
    type: Object,
    default: () => ({}),
  },
  optionsMap: {
    type: Object,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  hasSourceOffer: {
    type: Boolean,
    default: false,
  },
  officeBranch: {
    type: String,
    default: "",
  },
  error: {
    type: String,
    default: "",
  },
  eyebrow: {
    type: String,
    default: "",
  },
  title: {
    type: String,
    default: "",
  },
  subtitle: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:show", "cancel", "submit"]);

const showProxy = computed({
  get: () => props.show,
  set: (value) => emit("update:show", value),
});
</script>
