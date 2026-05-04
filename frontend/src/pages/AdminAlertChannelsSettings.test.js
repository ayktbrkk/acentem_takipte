import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import AdminAlertChannelsSettings from "./AdminAlertChannelsSettings.vue";
import { useAuthStore } from "../stores/auth";

const frappeRequestMock = vi.fn();

vi.mock("frappe-ui", () => ({
  frappeRequest: (...args) => frappeRequestMock(...args),
}));

async function settle() {
  await flushPromises();
}

describe("AdminAlertChannelsSettings", () => {
  beforeEach(() => {
    frappeRequestMock.mockReset();
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    authStore.applyContext({
      user: "admin@example.com",
      userId: "admin@example.com",
      full_name: "Admin",
      roles: ["System Manager"],
      preferred_home: "/app",
      interface_mode: "desk",
      locale: "tr",
      capabilities: {},
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads settings and triggers save/test actions", async () => {
    frappeRequestMock
      .mockResolvedValueOnce({
        message: {
          slack_webhook_url: "https://hooks.slack.test/services/demo",
          telegram_bot_token: "bot-token",
          telegram_chat_id: "6391020707",
          slack_configured: true,
          telegram_configured: true,
        },
      })
      .mockResolvedValueOnce({ message: { slack_configured: true, telegram_configured: true } })
      .mockResolvedValueOnce({ message: { ok: true, channels: ["slack", "telegram"] } });

    const wrapper = mount(AdminAlertChannelsSettings, {
      global: {
        stubs: {
          WorkbenchPageLayout: { template: `<div><slot name="metrics" /><slot /></div>` },
          SaaSMetricCard: { props: ["label", "value"], template: `<div>{{ label }} {{ value }}</div>` },
          SectionPanel: { props: ["title", "meta", "count"], template: `<section><h2>{{ title }}</h2><p>{{ meta }}</p><span>{{ count }}</span><slot /></section>` },
        },
      },
    });

    await settle();

    expect(frappeRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/method/acentem_takipte.acentem_takipte.api.reports.get_ops_alert_channel_settings",
        method: "GET",
      }),
    );
    expect(wrapper.text()).toContain("Slack Durumu");
    expect(wrapper.text()).toContain("Bağlı");
    expect(wrapper.text()).toContain("Uyarı Kanalları");
    expect(wrapper.text()).toContain("Slack Webhook URL");

    await wrapper.find('[data-testid="alert-settings-save"]').trigger("click");
    expect(frappeRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/method/acentem_takipte.acentem_takipte.api.reports.save_ops_alert_channel_settings_api",
        method: "POST",
      }),
    );

    await wrapper.find('[data-testid="alert-settings-test"]').trigger("click");
    expect(frappeRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/method/acentem_takipte.acentem_takipte.api.reports.send_ops_alert_channel_test_api",
        method: "POST",
      }),
    );
  });
});