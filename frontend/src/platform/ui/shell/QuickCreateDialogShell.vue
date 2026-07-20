<template>
  <div class="at-quick-create-shell">
    <div class="at-quick-create-shell__accent" aria-hidden="true"></div>
    <div class="at-quick-create-shell__body">
      <header v-if="(showEyebrow && eyebrow) || (showSubtitle && subtitle)" class="mb-6 px-1">
        <div class="flex flex-col gap-1">
          <p v-if="showEyebrow && eyebrow" class="qc-accent-label">
            {{ eyebrow }}
          </p>
          <p v-if="showSubtitle && subtitle" class="text-lg font-bold text-slate-900">{{ subtitle }}</p>
        </div>
      </header>
      <slot />

      <div v-if="error" class="qc-error-banner" role="alert" aria-live="polite">
        <p class="qc-error-banner__text">{{ error }}</p>
      </div>
    </div>

    <div v-if="showFooter" class="at-quick-create-shell__footer">
      <ActionButton
        class="justify-center"
        variant="secondary"
        size="sm"
        type="button"
        :disabled="loading"
        @click="$emit('cancel')"
      >
        {{ labels.cancel || fallbackLabels.cancel }}
      </ActionButton>
      <ActionButton
        class="justify-center"
        :variant="showSaveAndOpen ? 'secondary' : 'primary'"
        size="sm"
        type="button"
        :disabled="loading || saveDisabled"
        @click="$emit('save')"
      >
        {{ labels.save || fallbackLabels.save }}
      </ActionButton>
      <ActionButton
        v-if="showSaveAndOpen"
        class="justify-center"
        variant="primary"
        size="sm"
        type="button"
        :disabled="loading || saveAndOpenDisabled"
        @click="$emit('saveAndOpen')"
      >
        {{ labels.saveAndOpen || fallbackLabels.saveAndOpen }}
      </ActionButton>
    </div>
  </div>
</template>

<script setup>
import ActionButton from "./ActionButton.vue";
import { useAuthStore } from "../../stores/auth";
import { useQuickCreateDialogShell } from "../../composables/useQuickCreateDialogShell";

const authStore = useAuthStore();

const props = defineProps({
  error: { type: String, default: "" },
  eyebrow: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  locale: { type: String, default: "" },
  labels: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  saveDisabled: { type: Boolean, default: false },
  saveAndOpenDisabled: { type: Boolean, default: false },
  showFooter: { type: Boolean, default: true },
  showSaveAndOpen: { type: Boolean, default: true },
  showEyebrow: { type: Boolean, default: true },
  showSubtitle: { type: Boolean, default: true },
});

defineEmits(["cancel", "save", "saveAndOpen"]);

const { fallbackLabels } = useQuickCreateDialogShell(props, authStore);
</script>
