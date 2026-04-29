<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="requestCountLabel"
    :record-count-label="t('record_count')"
  >
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <SectionPanel :title="t('new_request')">
          <BreakGlassRequestFormPanel
            :form="form"
            :access-type-options="accessTypeOptions"
            :submit-error="submitError"
            :submit-result="submitResult"
            :submitting="submitting"
            :t="t"
            @submit="submitRequest"
            @reset="resetForm"
          />
        </SectionPanel>
      </div>

      <div class="space-y-6">
        <SectionPanel :title="t('active_check')">
          <BreakGlassRequestValidationPanel
            :validation="validation"
            :access-type-options="accessTypeOptions"
            :validation-message="validationMessage"
            :validation-ok="validationOk"
            :validating="validating"
            :t="t"
            @validate="validateAccess"
          />
        </SectionPanel>
      </div>
    </div>
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, unref } from "vue";
import { useAuthStore } from "../stores/auth";
import { useBreakGlassRequest } from "../composables/useBreakGlassRequest";
import { BREAK_GLASS_TRANSLATIONS } from "../config/break_glass_translations";
import { translateText } from "../utils/i18n";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import BreakGlassRequestFormPanel from "../components/break-glass-request/BreakGlassRequestFormPanel.vue";
import BreakGlassRequestValidationPanel from "../components/break-glass-request/BreakGlassRequestValidationPanel.vue";

const authStore = useAuthStore();
const activeLocale = computed(() => (String(unref(authStore.locale) || "tr").toLowerCase().startsWith("tr") ? "tr" : "en"));

function t(key) {
  return BREAK_GLASS_TRANSLATIONS[activeLocale.value]?.[key]
    || BREAK_GLASS_TRANSLATIONS.en?.[key]
    || translateText(key, activeLocale.value);
}

const runtime = useBreakGlassRequest({ t });
const {
  accessTypeOptions,
  form,
  validation,
  requestCountLabel,
  submitting,
  validating,
  submitError,
  submitResult,
  validationMessage,
  validationOk,
  submitRequest,
  resetForm,
  validateAccess,
} = runtime;
</script>
