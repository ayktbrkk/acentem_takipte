<template>
  <div class="at-quick-create-shell">
    <div class="at-quick-create-shell__accent" aria-hidden="true"></div>
    <div class="at-quick-create-shell__body">
      <header v-if="(showEyebrow && eyebrow) || (showSubtitle && subtitle)" class="at-quick-create-shell__intro">
        <div class="at-quick-create-shell__meta">
          <p v-if="showEyebrow && eyebrow" class="qc-accent-label">
            {{ eyebrow }}
          </p>
          <p v-if="showSubtitle && subtitle" class="at-quick-create-shell__subtitle">{{ subtitle }}</p>
        </div>
      </header>
      <slot />

      <div v-if="error" class="qc-error-banner" role="alert" aria-live="polite">
        <p class="qc-error-banner__text">{{ error }}</p>
      </div>
    </div>

    <div v-if="showFooter" class="at-quick-create-shell__footer">
      <button
        class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-60"
        type="button"
        :disabled="loading"
        @click="$emit('cancel')"
      >
        {{ labels.cancel || fallbackLabels.cancel }}
      </button>
      <button
        :class="saveButtonClass"
        type="button"
        :disabled="loading || saveDisabled"
        @click="$emit('save')"
      >
        {{ labels.save || fallbackLabels.save }}
      </button>
      <button
        v-if="showSaveAndOpen"
        class="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        type="button"
        :disabled="loading || saveAndOpenDisabled"
        @click="$emit('saveAndOpen')"
      >
        {{ labels.saveAndOpen || fallbackLabels.saveAndOpen }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useAuthStore } from "../../stores/auth";

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

const resolvedLocale = computed(() => props.locale || authStore.locale || "tr");
const fallbackLabels = computed(() =>
  resolvedLocale.value === "tr"
    ? { cancel: "İptal", save: "Kaydet", saveAndOpen: "Kaydet ve Aç" }
    : { cancel: "Cancel", save: "Save", saveAndOpen: "Save & Open" },
);
const saveButtonClass = computed(() => {
  if (props.showSaveAndOpen) {
    return "rounded-lg border border-brand-700 px-4 py-2 text-sm font-semibold text-brand-700 disabled:opacity-60";
  }
  return "rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60";
});
</script>
