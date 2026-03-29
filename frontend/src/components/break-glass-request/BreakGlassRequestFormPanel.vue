<template>
  <SectionPanel :title="t('requestPanelTitle')" panel-class="surface-card rounded-2xl p-5">
    <form class="space-y-4" @submit.prevent="$emit('submit')">
      <div class="grid gap-3 md:grid-cols-2">
        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("accessType") }}</span>
          <select v-model="form.accessType" class="input" required>
            <option v-for="option in accessTypeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="flex flex-col gap-1">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("referenceDoctype") }}</span>
          <input v-model.trim="form.referenceDoctype" class="input" type="text" :placeholder="t('referenceDoctypePlaceholder')" />
        </label>

        <label class="flex flex-col gap-1 md:col-span-2">
          <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("referenceName") }}</span>
          <input v-model.trim="form.referenceName" class="input" type="text" :placeholder="t('referenceNamePlaceholder')" />
        </label>
      </div>

      <label class="flex flex-col gap-1">
        <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t("justification") }}</span>
        <textarea
          v-model.trim="form.justification"
          class="input min-h-[130px]"
          :placeholder="t('justificationPlaceholder')"
          minlength="20"
          required
        />
        <span class="text-xs text-slate-500">
          {{ t("justificationHint") }}
          {{ form.justification.length }}/20
        </span>
      </label>

      <article v-if="submitError" class="qc-error-banner" role="alert" aria-live="polite">
        <p class="qc-error-banner__text">{{ submitError }}</p>
      </article>

      <article
        v-if="submitResult"
        class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        role="status"
        aria-live="polite"
      >
        <p class="font-semibold">{{ t("submitSuccessTitle") }}</p>
        <p class="mt-1">{{ submitResult }}</p>
      </article>

      <div class="flex flex-wrap items-center gap-2">
        <button class="btn btn-primary btn-sm" type="submit" :disabled="submitting">
          {{ submitting ? t("submitting") : t("submit") }}
        </button>
        <button class="btn btn-outline btn-sm" type="button" :disabled="submitting" @click="$emit('reset')">
          {{ t("clear") }}
        </button>
      </div>
    </form>
  </SectionPanel>
</template>

<script setup>
import SectionPanel from "../app-shell/SectionPanel.vue";

defineProps({
  form: {
    type: Object,
    required: true,
  },
  accessTypeOptions: {
    type: Array,
    required: true,
  },
  submitError: {
    type: String,
    default: "",
  },
  submitResult: {
    type: String,
    default: "",
  },
  submitting: {
    type: Boolean,
    default: false,
  },
  t: {
    type: Function,
    required: true,
  },
});

defineEmits(["submit", "reset"]);
</script>
