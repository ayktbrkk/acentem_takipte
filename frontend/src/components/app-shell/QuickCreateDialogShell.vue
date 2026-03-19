<template>
  <div class="at-quick-create-shell">
    <div class="at-quick-create-shell__body">
      <p v-if="subtitle" class="text-xs text-slate-500">{{ subtitle }}</p>
      <slot />

      <div v-if="error" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
        <p class="text-sm text-rose-700">{{ error }}</p>
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
        class="rounded-lg border border-brand-700 px-4 py-2 text-sm font-semibold text-brand-700 disabled:opacity-60"
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
  subtitle: { type: String, default: "" },
  locale: { type: String, default: "" },
  labels: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false },
  saveDisabled: { type: Boolean, default: false },
  saveAndOpenDisabled: { type: Boolean, default: false },
  showFooter: { type: Boolean, default: true },
  showSaveAndOpen: { type: Boolean, default: true },
});

defineEmits(["cancel", "save", "saveAndOpen"]);

const resolvedLocale = computed(() => props.locale || authStore.locale || "tr");
const fallbackLabels = computed(() =>
  resolvedLocale.value === "tr"
    ? { cancel: "Vazgeç", save: "Kaydet", saveAndOpen: "Kaydet ve Aç" }
    : { cancel: "Cancel", save: "Save", saveAndOpen: "Save & Open" },
);
</script>
