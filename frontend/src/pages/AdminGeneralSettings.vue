<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="editableSettingCount"
    :record-count-label="t('recordCountLabel')"
  >
    <template #metrics>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SaaSMetricCard :label="t('appDefaultsMetric')" :value="activeLocaleLabel" value-class="text-brand-600" />
        <SaaSMetricCard :label="t('opsDefaultsMetric')" :value="followUpDaysLabel" value-class="text-at-amber" />
        <SaaSMetricCard :label="t('systemInfoMetric')" :value="siteName" value-class="text-at-green" />
      </div>
    </template>

    <template #actions>
      <ActionButton variant="secondary" size="sm" :disabled="!hasUnsavedChanges" @click="resetToDefaults">
        {{ t('resetToDefaults') }}
      </ActionButton>
      <ActionButton variant="secondary" size="sm" @click="goToAlertChannels">
        {{ t('openAlertChannelsButton') }}
      </ActionButton>
    </template>

    <div class="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <div class="space-y-4">
        <SectionPanel :title="t('appDefaultsTitle')" :meta="t('appDefaultsSubtitle')" :show-count="false">
          <div class="grid gap-4 md:grid-cols-2">
            <label class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm block cursor-pointer">
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">{{ t('defaultLanguageLabel') }}</p>
              <select v-model="settings.default_locale" class="mt-2 input" data-testid="general-default-locale" @change="markDirty">
                <option value="tr">{{ t('languageOptionTr') }}</option>
                <option value="en">{{ t('languageOptionEn') }}</option>
              </select>
            </label>
            <label class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm block cursor-pointer">
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">{{ t('dateFormatLabel') }}</p>
              <select v-model="settings.default_date_format" class="mt-2 input" data-testid="general-date-format" @change="markDirty">
                <option value="DD.MM.YYYY">DD.MM.YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </label>
          </div>
        </SectionPanel>

        <SectionPanel :title="t('opsDefaultsTitle')" :meta="t('opsDefaultsSubtitle')" :show-count="false">
          <div class="grid gap-4 md:grid-cols-2">
            <label class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm block cursor-pointer">
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">{{ t('followUpWindowLabel') }}</p>
              <select v-model="settings.follow_up_due_soon_days" class="mt-2 input" data-testid="general-follow-up-window" @change="markDirty">
                <option :value="3">{{ t('followUpWindowOption3') }}</option>
                <option :value="5">{{ t('followUpWindowOption5') }}</option>
                <option :value="7">{{ t('followUpWindowOption7') }}</option>
                <option :value="10">{{ t('followUpWindowOption10') }}</option>
                <option :value="14">{{ t('followUpWindowOption14') }}</option>
              </select>
              <p class="mt-2 text-xs text-slate-500">{{ t('followUpWindowHint') }}</p>
            </label>
            <label class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm block cursor-pointer">
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">{{ t('followUpPreviewLimitLabel') }}</p>
              <select v-model="settings.follow_up_preview_limit" class="mt-2 input" data-testid="general-follow-up-preview-limit" @change="markDirty">
                <option :value="5">5</option>
                <option :value="8">8</option>
                <option :value="12">12</option>
                <option :value="20">20</option>
              </select>
              <p class="mt-2 text-xs text-slate-500">{{ t('followUpPreviewLimitHint') }}</p>
            </label>
          </div>
        </SectionPanel>
      </div>

      <div class="space-y-4">
        <SectionPanel :title="t('systemInfoTitle')" :meta="t('systemInfoSubtitle')" :show-count="false">
          <div class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <span class="text-xs text-slate-400">{{ t('siteNameLabel') }}</span>
              <span class="text-sm font-semibold text-slate-900">{{ siteName }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-xs text-slate-400">{{ t('environmentLabel') }}</span>
              <span class="text-sm font-semibold text-slate-900">{{ environment }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-xs text-slate-400">{{ t('activeLocaleLabel') }}</span>
              <span class="text-sm font-semibold text-slate-900">{{ activeLocaleDisplay }}</span>
            </div>
            <div v-if="hasUnsavedChanges" class="flex items-center justify-between gap-3">
              <span class="text-xs text-at-amber">{{ t('unsavedChanges') }}</span>
              <span class="rounded-full bg-at-amber/10 px-2 py-0.5 text-[10px] font-bold text-at-amber">{{ t('pending') }}</span>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel :title="t('actionsTitle')" :meta="t('actionsSubtitle')" :show-count="false">
          <div class="flex flex-wrap gap-3">
            <ActionButton variant="primary" size="sm" :disabled="loading || saving || !hasUnsavedChanges" @click="saveSettings">
              <FeatherIcon v-if="saving" name="loader" class="h-4 w-4 animate-spin mr-1" />
              {{ saving ? t('savingButton') : t('saveButton') }}
            </ActionButton>
          </div>
        </SectionPanel>
      </div>
    </div>

    <p v-if="error" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {{ error }}
    </p>

    <div class="fixed right-6 top-24 z-[100] w-full max-w-sm pointer-events-none">
      <ToastNotification
        :show="toast.show"
        :message="toast.message"
        :type="toast.type"
        @close="toast.show = false"
      />
    </div>
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { frappeRequest, FeatherIcon } from "frappe-ui";
import { useRouter } from "vue-router";

import ActionButton from "../components/app-shell/ActionButton.vue";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import SectionPanel from "../components/app-shell/SectionPanel.vue";
import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import ToastNotification from "../components/ui/ToastNotification.vue";
import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";
import { ADMIN_GENERAL_SETTINGS_TRANSLATIONS } from "../config/admin_general_settings_translations";

const DEFAULTS = {
  default_locale: "tr",
  default_date_format: "DD.MM.YYYY",
  follow_up_due_soon_days: 7,
  follow_up_preview_limit: 8,
};

const authStore = useAuthStore(getAppPinia());
const router = useRouter();
const error = ref("");
const loading = ref(false);
const saving = ref(false);
const isDirty = ref(false);
const toast = reactive({ show: false, message: "", type: "success" });

const originalSettings = ref({ ...DEFAULTS, site_name: "", environment: "production", active_locale: "tr" });
const settings = ref({ ...DEFAULTS, site_name: "at.localhost", environment: "staging", active_locale: "tr" });

const activeLocale = computed(() => (String(authStore.locale || "tr").toLowerCase().startsWith("tr") ? "tr" : "en"));

function t(key) {
  return ADMIN_GENERAL_SETTINGS_TRANSLATIONS[activeLocale.value]?.[key] || ADMIN_GENERAL_SETTINGS_TRANSLATIONS.en[key] || key;
}

const hasUnsavedChanges = computed(() => isDirty.value);
const editableSettingCount = computed(() => 4);
const activeLocaleLabel = computed(() => t(`languageOption${activeLocale.value === 'tr' ? 'Tr' : 'En'}`));
const followUpDaysLabel = computed(() => `${settings.value.follow_up_due_soon_days} ${t('days')}`);
const activeLocaleDisplay = computed(() => (settings.value.active_locale === "tr" ? t("languageOptionTr") : t("languageOptionEn")));
const siteName = computed(() => settings.value.site_name);
const environment = computed(() => settings.value.environment);

function markDirty() {
  isDirty.value = true;
}

function showToast(message, type = "success") {
  toast.message = message;
  toast.type = type;
  toast.show = true;
  setTimeout(() => { toast.show = false; }, 4000);
}

function resetToDefaults() {
  settings.value = {
    ...settings.value,
    default_locale: DEFAULTS.default_locale,
    default_date_format: DEFAULTS.default_date_format,
    follow_up_due_soon_days: DEFAULTS.follow_up_due_soon_days,
    follow_up_preview_limit: DEFAULTS.follow_up_preview_limit,
  };
  isDirty.value = true;
}

async function loadSettings() {
  loading.value = true;
  error.value = "";
  try {
    const payload = await frappeRequest({
      url: "/api/method/acentem_takipte.acentem_takipte.api.admin_settings.get_admin_general_settings",
      method: "GET",
    });
    const message = payload?.message || payload || {};
    const loaded = {
      default_locale: String(message.default_locale || "tr").toLowerCase().startsWith("en") ? "en" : "tr",
      default_date_format: String(message.default_date_format || "DD.MM.YYYY"),
      follow_up_due_soon_days: Number(message.follow_up_due_soon_days || 7),
      follow_up_preview_limit: Number(message.follow_up_preview_limit || 8),
      site_name: String(message.site_name || "at.localhost"),
      environment: String(message.environment || "staging"),
      active_locale: String(message.active_locale || "tr").toLowerCase().startsWith("en") ? "en" : "tr",
    };
    settings.value = { ...loaded };
    originalSettings.value = { ...loaded };
    isDirty.value = false;
  } catch (err) {
    error.value = String(err?.message || err || t("loadingError"));
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  saving.value = true;
  error.value = "";
  try {
    const payload = await frappeRequest({
      url: "/api/method/acentem_takipte.acentem_takipte.api.admin_settings.save_admin_general_settings_api",
      method: "POST",
      params: {
        config: {
          default_locale: settings.value.default_locale,
          default_date_format: settings.value.default_date_format,
          follow_up_due_soon_days: settings.value.follow_up_due_soon_days,
          follow_up_preview_limit: settings.value.follow_up_preview_limit,
        },
      },
    });
    const message = payload?.message || payload || {};
    const saved = {
      default_locale: String(message.default_locale || settings.value.default_locale).toLowerCase().startsWith("en") ? "en" : "tr",
      default_date_format: String(message.default_date_format || settings.value.default_date_format),
      follow_up_due_soon_days: Number(message.follow_up_due_soon_days || settings.value.follow_up_due_soon_days),
      follow_up_preview_limit: Number(message.follow_up_preview_limit || settings.value.follow_up_preview_limit),
      site_name: String(message.site_name || settings.value.site_name),
      environment: String(message.environment || settings.value.environment),
      active_locale: String(message.active_locale || settings.value.active_locale).toLowerCase().startsWith("en") ? "en" : "tr",
    };
    settings.value = { ...saved };
    originalSettings.value = { ...saved };
    isDirty.value = false;
    showToast(t('saveSuccess'), "success");
  } catch (err) {
    error.value = String(err?.message || err || t("savingError"));
    showToast(t('savingError'), "error");
  } finally {
    saving.value = false;
  }
}

function goToAlertChannels() {
  void router.push({ name: "admin-alert-channels" });
}

onMounted(() => {
  void loadSettings();
});
</script>
