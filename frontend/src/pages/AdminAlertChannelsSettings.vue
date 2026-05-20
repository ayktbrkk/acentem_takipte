<template>
  <WorkbenchPageLayout
    :breadcrumb="t('breadcrumb')"
    :title="t('title')"
    :subtitle="t('subtitle')"
    :record-count="configuredChannelCount"
    :record-count-label="t('recordCountLabel')"
  >
    <template #metrics>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SaaSMetricCard :label="t('slackStatus')" :value="slackStatusValue" :value-class="slackStatusClass" />
        <SaaSMetricCard :label="t('telegramStatus')" :value="telegramStatusValue" :value-class="telegramStatusClass" />
      </div>
    </template>

    <ReportsAlertChannelsSection
      :t="t"
      :can-manage-alert-channels="canManageAlertChannels"
      :config="alertChannelConfig"
      :alert-channels-loading="alertChannelsLoading"
      :alert-channels-saving="alertChannelsSaving"
      :alert-channels-testing="alertChannelsTesting"
      @save="saveAlertChannelSettings"
      @test="testAlertChannels"
    />

    <p v-if="error" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {{ error }}
    </p>
  </WorkbenchPageLayout>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { frappeRequest } from "frappe-ui";

import WorkbenchPageLayout from "../components/app-shell/WorkbenchPageLayout.vue";
import SaaSMetricCard from "../components/app-shell/SaaSMetricCard.vue";
import ReportsAlertChannelsSection from "../components/reports/ReportsAlertChannelsSection.vue";
import { REPORTS_TRANSLATIONS } from "../config/reports_translations";
import { ADMIN_ALERT_CHANNELS_TRANSLATIONS } from "../config/admin_alert_channels_translations";
import { getAppPinia } from "../pinia";
import { useAuthStore } from "../stores/auth";

const TRANSLATIONS = {
  tr: { ...REPORTS_TRANSLATIONS.tr, ...ADMIN_ALERT_CHANNELS_TRANSLATIONS.tr },
  en: { ...REPORTS_TRANSLATIONS.en, ...ADMIN_ALERT_CHANNELS_TRANSLATIONS.en },
};

const authStore = useAuthStore(getAppPinia());

const alertChannelConfig = ref({
  slack_webhook_url: "",
  telegram_bot_token: "",
  telegram_chat_id: "",
  slack_configured: false,
  telegram_configured: false,
  slack_webhook_mask: "",
  telegram_bot_token_mask: "",
});
const alertChannelsLoading = ref(false);
const alertChannelsSaving = ref(false);
const alertChannelsTesting = ref(false);
const error = ref("");

const canManageAlertChannels = computed(() => Boolean(authStore.isDeskUser));
const activeLocale = computed(() => (String(authStore.locale || "tr").toLowerCase().startsWith("tr") ? "tr" : "en"));

function t(key) {
  return TRANSLATIONS[activeLocale.value]?.[key] || TRANSLATIONS.en[key] || key;
}

const configuredChannelCount = computed(() => {
  let count = 0;
  if (alertChannelConfig.value.slack_configured) count += 1;
  if (alertChannelConfig.value.telegram_configured) count += 1;
  return count;
});

const slackStatusValue = computed(() => (alertChannelConfig.value.slack_configured ? t("connected") : t("notConfigured")));
const telegramStatusValue = computed(() => (alertChannelConfig.value.telegram_configured ? t("connected") : t("notConfigured")));
const slackStatusClass = computed(() => (alertChannelConfig.value.slack_configured ? "text-at-green" : "text-at-amber"));
const telegramStatusClass = computed(() => (alertChannelConfig.value.telegram_configured ? "text-at-green" : "text-at-amber"));

async function loadAlertChannelSettings() {
  if (!canManageAlertChannels.value) return;

  alertChannelsLoading.value = true;
  error.value = "";
  try {
    const payload = await frappeRequest({
      url: "/api/method/acentem_takipte.acentem_takipte.api.reports.get_ops_alert_channel_settings",
      method: "GET",
    });
    const message = payload?.message || payload || {};
    alertChannelConfig.value = {
      slack_webhook_url: "",
      telegram_bot_token: "",
      telegram_chat_id: String(message.telegram_chat_id || ""),
      slack_configured: Boolean(message.slack_configured),
      telegram_configured: Boolean(message.telegram_configured),
      slack_webhook_mask: String(message.slack_webhook_mask || ""),
      telegram_bot_token_mask: String(message.telegram_bot_token_mask || ""),
    };
  } catch (err) {
    error.value = String(err?.message || err || t("loadError"));
  } finally {
    alertChannelsLoading.value = false;
  }
}

async function saveAlertChannelSettings(config) {
  alertChannelsSaving.value = true;
  error.value = "";
  try {
    const payload = await frappeRequest({
      url: "/api/method/acentem_takipte.acentem_takipte.api.reports.save_ops_alert_channel_settings_api",
      method: "POST",
      params: { config },
    });
    const message = payload?.message || payload || {};
    alertChannelConfig.value = {
      slack_webhook_url: "",
      telegram_bot_token: "",
      telegram_chat_id: String(message.telegram_chat_id || ""),
      slack_configured: Boolean(message.slack_configured),
      telegram_configured: Boolean(message.telegram_configured),
      slack_webhook_mask: String(message.slack_webhook_mask || ""),
      telegram_bot_token_mask: String(message.telegram_bot_token_mask || ""),
    };
  } catch (err) {
    error.value = String(err?.message || err || t("saveError"));
  } finally {
    alertChannelsSaving.value = false;
  }
}

async function testAlertChannels(config) {
  alertChannelsTesting.value = true;
  error.value = "";
  try {
    await frappeRequest({
      url: "/api/method/acentem_takipte.acentem_takipte.api.reports.send_ops_alert_channel_test_api",
      method: "POST",
      params: { config },
    });
  } catch (err) {
    error.value = String(err?.message || err || t("testError"));
  } finally {
    alertChannelsTesting.value = false;
  }
}

onMounted(() => {
  void loadAlertChannelSettings();
});
</script>
