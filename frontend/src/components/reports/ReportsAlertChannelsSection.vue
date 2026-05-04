<template>
  <SectionPanel
    v-if="canManageAlertChannels"
    :title="t('alertChannelsTitle')"
    :meta="t('alertChannelsSubtitle')"
    :count="configuredCount"
  >
    <div class="grid gap-4 md:grid-cols-2">
      <label class="space-y-2 text-sm text-slate-700">
        <span class="font-medium text-slate-900">{{ t("slackWebhookLabel") }}</span>
        <input
          v-model="localConfig.slack_webhook_url"
          class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
          type="password"
          autocomplete="off"
          data-testid="alert-slack-webhook"
          :placeholder="t('slackWebhookPlaceholder')"
        >
        <span class="text-xs" :class="localConfig.slack_configured ? 'text-emerald-600' : 'text-slate-500'">
          {{ localConfig.slack_configured ? t("slackConnected") : t("slackNotConfigured") }}
        </span>
      </label>

      <label class="space-y-2 text-sm text-slate-700">
        <span class="font-medium text-slate-900">{{ t("telegramBotTokenLabel") }}</span>
        <input
          v-model="localConfig.telegram_bot_token"
          class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
          type="password"
          autocomplete="off"
          data-testid="alert-telegram-token"
          :placeholder="t('telegramBotTokenPlaceholder')"
        >
      </label>

      <label class="space-y-2 text-sm text-slate-700 md:col-span-2">
        <span class="font-medium text-slate-900">{{ t("telegramChatIdLabel") }}</span>
        <input
          v-model="localConfig.telegram_chat_id"
          class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
          type="text"
          autocomplete="off"
          data-testid="alert-telegram-chat-id"
          :placeholder="t('telegramChatIdPlaceholder')"
        >
        <span class="text-xs" :class="localConfig.telegram_configured ? 'text-emerald-600' : 'text-slate-500'">
          {{ localConfig.telegram_configured ? t("telegramConnected") : t("telegramNotConfigured") }}
        </span>
      </label>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
      <p class="text-xs text-slate-500">{{ t("alertChannelsHint") }}</p>
      <button
        type="button"
        class="btn btn-sm"
        :disabled="alertChannelsSaving"
        data-testid="alert-settings-save"
        @click="$emit('save', buildPayload())"
      >
        {{ alertChannelsSaving ? t("alertChannelsSaving") : t("alertChannelsSave") }}
      </button>
      <button
        type="button"
        class="btn btn-sm btn-secondary"
        :disabled="alertChannelsTesting || alertChannelsLoading"
        data-testid="alert-settings-test"
        @click="$emit('test', buildPayload())"
      >
        {{ alertChannelsTesting ? t("alertChannelsTesting") : t("alertChannelsTest") }}
      </button>
    </div>
  </SectionPanel>
</template>

<script setup>
import { computed, reactive, watch } from "vue";

import SectionPanel from "../app-shell/SectionPanel.vue";

const props = defineProps({
  t: {
    type: Function,
    required: true,
  },
  canManageAlertChannels: {
    type: Boolean,
    default: false,
  },
  config: {
    type: Object,
    default: () => ({}),
  },
  alertChannelsLoading: {
    type: Boolean,
    default: false,
  },
  alertChannelsSaving: {
    type: Boolean,
    default: false,
  },
  alertChannelsTesting: {
    type: Boolean,
    default: false,
  },
});

defineEmits(["save", "test"]);

const localConfig = reactive({
  slack_webhook_url: "",
  telegram_bot_token: "",
  telegram_chat_id: "",
  slack_configured: false,
  telegram_configured: false,
});

watch(
  () => props.config,
  (nextConfig) => {
    localConfig.slack_webhook_url = String(nextConfig?.slack_webhook_url || "");
    localConfig.telegram_bot_token = String(nextConfig?.telegram_bot_token || "");
    localConfig.telegram_chat_id = String(nextConfig?.telegram_chat_id || "");
    localConfig.slack_configured = Boolean(nextConfig?.slack_configured || localConfig.slack_webhook_url);
    localConfig.telegram_configured = Boolean(
      nextConfig?.telegram_configured || (localConfig.telegram_bot_token && localConfig.telegram_chat_id)
    );
  },
  { immediate: true, deep: true },
);

const configuredCount = computed(() => {
  let count = 0;
  if (localConfig.slack_configured || localConfig.slack_webhook_url) count += 1;
  if (localConfig.telegram_configured || (localConfig.telegram_bot_token && localConfig.telegram_chat_id)) count += 1;
  return count;
});

function buildPayload() {
  return {
    slack_webhook_url: String(localConfig.slack_webhook_url || "").trim(),
    telegram_bot_token: String(localConfig.telegram_bot_token || "").trim(),
    telegram_chat_id: String(localConfig.telegram_chat_id || "").trim(),
  };
}
</script>