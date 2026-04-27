<template>
  <ATQuickEntryModal
    v-model="show"
    :error="error"
    :title="translateText('quick_customer', locale)"
    :subtitle="translateText('quick_customer_subtitle', locale)"
    :loading="loading"
    :disabled="loading || disabled"
    :locale="locale"
    :show-save-and-open="true"
    @cancel="emit('cancel')"
    @save="emit('save', false)"
    @save-and-open="emit('save', true)"
  >
    <div class="space-y-6 py-2">
      <!-- Section: Identity -->
      <section class="at-card-premium">
        <header class="flex items-center gap-3 mb-6">
          <span class="at-label shrink-0 text-brand-600">{{ translateText('identity_information', locale) }}</span>
          <div class="h-px flex-1 bg-slate-100"></div>
        </header>
        
        <QuickCreateFormRenderer
          :fields="identityFields"
          :model="model"
          :field-errors="fieldErrors"
          :disabled="disabled || loading"
          :options-map="optionsMap"
          :locale="locale"
          @submit="emit('save', false)"
        />
      </section>

      <!-- Section: Contact -->
      <section class="at-card-premium">
        <header class="flex items-center gap-3 mb-6">
          <span class="at-label shrink-0 text-brand-600">{{ translateText('contact_details', locale) }}</span>
          <div class="h-px flex-1 bg-slate-100"></div>
        </header>

        <QuickCreateFormRenderer
          :fields="contactFields"
          :model="model"
          :field-errors="fieldErrors"
          :disabled="disabled || loading"
          :options-map="optionsMap"
          :locale="locale"
          @submit="emit('save', false)"
        />
      </section>

      <!-- Section: Professional & Demographic -->
      <section class="at-card-premium">
        <header class="flex items-center gap-3 mb-6">
          <span class="at-label shrink-0 text-brand-600">{{ translateText('demographic_details', locale) }}</span>
          <div class="h-px flex-1 bg-slate-100"></div>
        </header>

        <QuickCreateFormRenderer
          :fields="otherFields"
          :model="model"
          :field-errors="fieldErrors"
          :disabled="disabled || loading"
          :options-map="optionsMap"
          :locale="locale"
          @submit="emit('save', false)"
        />
      </section>
    </div>
  </ATQuickEntryModal>
</template>

<script setup>
import { computed, ref } from "vue";
import ATQuickEntryModal from "./app-shell/ATQuickEntryModal.vue";
import QuickCreateFormRenderer from "./app-shell/QuickCreateFormRenderer.vue";
import { translateText } from "../utils/i18n";

const props = defineProps({
  model: { type: Object, required: true },
  fieldErrors: { type: Object, default: () => ({}) },
  optionsMap: { type: Object, default: () => ({}) },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  error: { type: String, default: "" },
  eyebrow: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  locale: { type: String, default: "tr" },
  labels: { type: Object, default: () => ({}) },
  fields: { type: Array, required: true },
});

const emit = defineEmits(["cancel", "save"]);

const show = ref(true);

const identityFields = computed(() => 
  props.fields.filter(f => ['full_name', 'tax_id', 'birth_date'].includes(f.name))
);

const contactFields = computed(() => 
  props.fields.filter(f => ['phone', 'email', 'address'].includes(f.name))
);

const otherFields = computed(() => 
  props.fields.filter(f => ['gender', 'marital_status', 'consent_status', 'assigned_agent', 'occupation'].includes(f.name))
);
</script>
