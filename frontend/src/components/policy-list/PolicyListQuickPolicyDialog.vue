<template>
  <Dialog v-model="show" :options="{ title: ui.title, size: 'xl' }">
    <template #body-content>
      <PolicyForm
        :key="dialogKey"
        :model="model"
        :field-errors="fieldErrors"
        :options-map="optionsMap"
        :disabled="loading"
        :loading="loading"
        :has-source-offer="hasSourceOffer"
        :office-branch="officeBranch"
        :error="error"
        :eyebrow="ui.eyebrow"
        :title="ui.title"
        :subtitle="ui.subtitle"
        @cancel="$emit('cancel')"
        @submit="$emit('submit')"
      />
    </template>
  </Dialog>
</template>

<script setup>
import { Dialog } from "frappe-ui";
import PolicyForm from "../PolicyForm.vue";

const show = defineModel("show", { type: Boolean, default: false });

defineProps({
  ui: { type: Object, required: true },
  dialogKey: { type: Number, required: true },
  model: { type: Object, required: true },
  fieldErrors: { type: Object, required: true },
  optionsMap: { type: Object, required: true },
  loading: { type: Boolean, default: false },
  hasSourceOffer: { type: Boolean, default: false },
  officeBranch: { type: String, default: "" },
  error: { type: String, default: "" },
});

defineEmits(["cancel", "submit"]);
</script>
