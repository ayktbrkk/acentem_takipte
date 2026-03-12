<template>
  <div class="at-quick-create-shell">
    <div class="at-quick-create-shell__body">
      <p v-if="subtitle" class="text-xs text-slate-500">{{ subtitle }}</p>
      <slot />

      <div v-if="error" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
        <p class="text-sm text-rose-700">{{ error }}</p>
      </div>
    </div>

    <div
      v-if="showFooter"
      class="at-quick-create-shell__footer"
    >
      <button
        class="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-60"
        type="button"
        :disabled="loading"
        @click="$emit('cancel')"
      >
        {{ labels.cancel || "Vazgeç" }}
      </button>
      <button
        class="rounded-lg border border-brand-700 px-4 py-2 text-sm font-semibold text-brand-700 disabled:opacity-60"
        type="button"
        :disabled="loading || saveDisabled"
        @click="$emit('save')"
      >
        {{ labels.save || "Kaydet" }}
      </button>
      <button
        v-if="showSaveAndOpen"
        class="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        type="button"
        :disabled="loading || saveAndOpenDisabled"
        @click="$emit('saveAndOpen')"
      >
        {{ labels.saveAndOpen || "Kaydet ve Ac" }}
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  error: { type: String, default: "" },
  subtitle: { type: String, default: "" },
  labels: {
    type: Object,
    default: () => ({ cancel: "Vazgeç", save: "Kaydet", saveAndOpen: "Kaydet ve Aç" }),
  },
  loading: { type: Boolean, default: false },
  saveDisabled: { type: Boolean, default: false },
  saveAndOpenDisabled: { type: Boolean, default: false },
  showFooter: { type: Boolean, default: true },
  showSaveAndOpen: { type: Boolean, default: true },
});

defineEmits(["cancel", "save", "saveAndOpen"]);
</script>
