<template>
  <SectionPanel
    v-if="canManageAlertChannels"
    :title="t('alertChannelsTitle')"
    :meta="t('alertChannelsSubtitle')"
    :count="configuredCount"
  >
    <div class="grid gap-4 lg:grid-cols-2">
      <SectionPanel
        :title="t('slackChannelTitle')"
        :meta="t('slackChannelSubtitle')"
        :show-count="false"
        panel-class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <template #trailing>
          <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            :class="localConfig.slack_configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
          >
            {{ localConfig.slack_configured ? t("channelConfigured") : t("channelNeedsSetup") }}
          </span>
        </template>

        <div class="space-y-4">
          <div class="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <p class="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">{{ t("channelStatusLabel") }}</p>
            <p class="mt-1 text-sm font-semibold" :class="localConfig.slack_configured ? 'text-emerald-700' : 'text-amber-700'">
              {{ localConfig.slack_configured ? t("slackConnected") : t("slackNotConfigured") }}
            </p>
          </div>

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
          </label>
        </div>
      </SectionPanel>

      <SectionPanel
        :title="t('telegramChannelTitle')"
        :meta="t('telegramChannelSubtitle')"
        :show-count="false"
        panel-class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <template #trailing>
          <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            :class="localConfig.telegram_configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
          >
            {{ localConfig.telegram_configured ? t("channelConfigured") : t("channelNeedsSetup") }}
          </span>
        </template>

        <div class="space-y-4">
          <div class="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
            <p class="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">{{ t("channelStatusLabel") }}</p>
            <p class="mt-1 text-sm font-semibold" :class="localConfig.telegram_configured ? 'text-emerald-700' : 'text-amber-700'">
              {{ localConfig.telegram_configured ? t("telegramConnected") : t("telegramNotConfigured") }}
            </p>
          </div>

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

          <label class="space-y-2 text-sm text-slate-700">
            <span class="font-medium text-slate-900">{{ t("telegramChatIdLabel") }}</span>
            <input
              v-model="localConfig.telegram_chat_id"
              class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
              type="text"
              autocomplete="off"
              data-testid="alert-telegram-chat-id"
              :placeholder="t('telegramChatIdPlaceholder')"
            >
          </label>
        </div>
      </SectionPanel>
    </div>

    <div class="mt-5 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <p class="text-sm font-semibold text-slate-900">{{ t("alertChannelsActionsTitle") }}</p>
      <p class="mt-1 text-xs text-slate-500">{{ t("alertChannelsActionsHint") }}</p>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <ActionButton
          variant="primary"
          size="sm"
          :disabled="alertChannelsSaving"
          data-testid="alert-settings-save"
          @click="$emit('save', buildPayload())"
        >
          {{ alertChannelsSaving ? t("alertChannelsSaving") : t("alertChannelsSave") }}
        </ActionButton>
        <ActionButton
          variant="secondary"
          size="sm"
          :disabled="alertChannelsTesting || alertChannelsLoading"
          data-testid="alert-settings-test"
          @click="$emit('test', buildPayload())"
        >
          {{ alertChannelsTesting ? t("alertChannelsTesting") : t("alertChannelsTest") }}
        </ActionButton>
        <p class="text-xs text-slate-500">{{ t("alertChannelsHint") }}</p>
      </div>
    </div>
  </SectionPanel>
</template>

<script setup>
import { computed, reactive, watch } from "vue";

import ActionButton from "../app-shell/ActionButton.vue";
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