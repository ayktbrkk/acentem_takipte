<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="editableSettingCount"
    :record-count-label="t('recordCountLabel')"
  >
    <template #metrics>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SaaSMetricCard :label="t('appDefaultsMetric')" :value="activeLocaleLabel" value-class="text-brand-600" />
        <SaaSMetricCard :label="t('opsDefaultsMetric')" :value="followUpDaysLabel" value-class="text-at-amber" />
        <SaaSMetricCard :label="t('insuranceDefaultsMetric')" :value="insuranceDefaultsLabel" value-class="text-at-green" />
        <SaaSMetricCard :label="t('systemInfoMetric')" :value="siteName" value-class="text-slate-900" />
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

        <SectionPanel :title="t('insuranceDefaultsTitle')" :meta="t('insuranceDefaultsSubtitle')" :show-count="false">
          <div class="grid gap-4 md:grid-cols-2">
            <label class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm block cursor-pointer">
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">{{ t('policyTermLabel') }}</p>
              <select v-model="settings.default_policy_term_days" class="mt-2 input" data-testid="general-policy-term" @change="markDirty">
                <option :value="180">{{ t('policyTermOption180') }}</option>
                <option :value="365">{{ t('policyTermOption365') }}</option>
              </select>
              <p class="mt-2 text-xs text-slate-500">{{ t('policyTermHint') }}</p>
            </label>
            <label class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm block cursor-pointer">
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">{{ t('commissionRateLabel') }}</p>
              <select v-model="settings.default_commission_rate" class="mt-2 input" data-testid="general-commission-rate" @change="markDirty">
                <option :value="0">%0</option>
                <option :value="5">%5</option>
                <option :value="10">%10</option>
                <option :value="15">%15</option>
                <option :value="20">%20</option>
                <option :value="25">%25</option>
                <option :value="30">%30</option>
                <option :value="40">%40</option>
                <option :value="50">%50</option>
              </select>
              <p class="mt-2 text-xs text-slate-500">{{ t('commissionRateHint') }}</p>
            </label>
            <label class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm block cursor-pointer">
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">{{ t('defaultCurrencyLabel') }}</p>
              <select v-model="settings.default_currency" class="mt-2 input" data-testid="general-currency" @change="markDirty">
                <option value="TRY">TRY (₺)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
              <p class="mt-2 text-xs text-slate-500">{{ t('defaultCurrencyHint') }}</p>
            </label>
            <label class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm block cursor-pointer">
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">{{ t('renewalReminderLeadLabel') }}</p>
              <select v-model="settings.renewal_reminder_lead_days" class="mt-2 input" data-testid="general-renewal-lead" @change="markDirty">
                <option :value="0">{{ t('renewalReminderOption0') }}</option>
                <option :value="15">{{ t('renewalReminderOption15') }}</option>
                <option :value="30">{{ t('renewalReminderOption30') }}</option>
                <option :value="45">{{ t('renewalReminderOption45') }}</option>
                <option :value="60">{{ t('renewalReminderOption60') }}</option>
              </select>
              <p class="mt-2 text-xs text-slate-500">{{ t('renewalReminderLeadHint') }}</p>
            </label>
            <label class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm block cursor-pointer md:col-span-2">
              <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">{{ t('kvkkConsentLabel') }}</p>
              <select v-model="settings.kvkk_consent_default" class="mt-2 input" data-testid="general-kvkk-consent" @change="markDirty">
                <option value="Unknown">{{ t('kvkkConsentOptionUnknown') }}</option>
                <option value="Granted">{{ t('kvkkConsentOptionGranted') }}</option>
              </select>
              <p class="mt-2 text-xs text-slate-500">{{ t('kvkkConsentHint') }}</p>
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
  default_policy_term_days: 365,
  default_commission_rate: 10,
  default_currency: "TRY",
  renewal_reminder_lead_days: 30,
  kvkk_consent_default: "Unknown",
};

const authStore = useAuthStore(getAppPinia());
const router = useRouter();
const error = ref("");
const loading = ref(false);
const saving = ref(false);
const isDirty = ref(false);
const toast = reactive({ show: false, message: "", type: "success" });

const originalSettings = ref({ ...DEFAULTS, site_name: "", environment: "production", active_locale: "tr" });
const settings = ref({
  ...DEFAULTS,
  site_name: "at.localhost",
  environment: "staging",
  active_locale: "tr",
});

const activeLocale = computed(() => (String(authStore.locale || "tr").toLowerCase().startsWith("tr") ? "tr" : "en"));

function t(key) {
  return ADMIN_GENERAL_SETTINGS_TRANSLATIONS[activeLocale.value]?.[key] || ADMIN_GENERAL_SETTINGS_TRANSLATIONS.en[key] || key;
}

const hasUnsavedChanges = computed(() => isDirty.value);
const editableSettingCount = computed(() => 9);
const activeLocaleLabel = computed(() => t(`languageOption${activeLocale.value === 'tr' ? 'Tr' : 'En'}`));
const followUpDaysLabel = computed(() => `${settings.value.follow_up_due_soon_days} ${t('days')}`);
const insuranceDefaultsLabel = computed(() => `${settings.value.default_currency} · %${settings.value.default_commission_rate}`);
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
    ...DEFAULTS,
  };
  isDirty.value = true;
}

function buildSavePayload() {
  return {
    default_locale: settings.value.default_locale,
    default_date_format: settings.value.default_date_format,
    follow_up_due_soon_days: settings.value.follow_up_due_soon_days,
    follow_up_preview_limit: settings.value.follow_up_preview_limit,
    default_policy_term_days: settings.value.default_policy_term_days,
    default_commission_rate: settings.value.default_commission_rate,
    default_currency: settings.value.default_currency,
    renewal_reminder_lead_days: settings.value.renewal_reminder_lead_days,
    kvkk_consent_default: settings.value.kvkk_consent_default,
  };
}

function applyLoadedSettings(message) {
  const loaded = {
    default_locale: String(message.default_locale || "tr").toLowerCase().startsWith("en") ? "en" : "tr",
    default_date_format: String(message.default_date_format || "DD.MM.YYYY"),
    follow_up_due_soon_days: Number(message.follow_up_due_soon_days || 7),
    follow_up_preview_limit: Number(message.follow_up_preview_limit || 8),
    default_policy_term_days: Number(message.default_policy_term_days || 365),
    default_commission_rate: Number(message.default_commission_rate || 15),
    default_currency: String(message.default_currency || "TRY").toUpperCase(),
    renewal_reminder_lead_days: Number(message.renewal_reminder_lead_days || 30),
    kvkk_consent_default: String(message.kvkk_consent_default || "Unknown"),
    site_name: String(message.site_name || "at.localhost"),
    environment: String(message.environment || "staging"),
    active_locale: String(message.active_locale || "tr").toLowerCase().startsWith("en") ? "en" : "tr",
  };
  settings.value = { ...loaded };
  originalSettings.value = { ...loaded };
  isDirty.value = false;
}

async function loadSettings() {
  loading.value = true;
  error.value = "";
  try {
    const payload = await frappeRequest({
      url: "/api/method/acentem_takipte.acentem_takipte.api.admin_settings.get_admin_general_settings",
      method: "GET",
    });
    applyLoadedSettings(payload?.message || payload || {});
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
      params: { config: buildSavePayload() },
    });
    applyLoadedSettings(payload?.message || payload || settings.value);
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
