<template>
  <QuickCreateOffer
    v-model="model"
    :locale="activeLocale"
    :title-override="t('quickOfferTitle')"
    :subtitle-override="subtitle"
    :labels="{ cancel: t('cancel'), save: t('createQuickOffer'), saveAndOpen: t('createQuickOfferAndOpen') }"
    :options-map="optionsMap"
    :return-to="returnTo"
    :validate="validate"
    :build-payload="buildPayload"
    :success-handlers="successHandlers"
    @cancel="$emit('cancel')"
    @created="$emit('created', $event)"
  />
</template>

<script setup>
import { computed } from "vue";

import QuickCreateOffer from "../QuickCreateOffer.vue";

const props = defineProps({
  activeLocale: {
    type: String,
    default: "en",
  },
  buildPayload: {
    type: Function,
    required: true,
  },
  returnTo: {
    type: String,
    default: "",
  },
  successHandlers: {
    type: Object,
    default: () => ({}),
  },
  subtitle: {
    type: String,
    default: "",
  },
  t: {
    type: Function,
    required: true,
  },
  validate: {
    type: Function,
    required: true,
  },
  modelValue: {
    type: Boolean,
    default: false,
  },
  optionsMap: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["update:modelValue", "cancel", "created"]);

const model = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});
</script>
