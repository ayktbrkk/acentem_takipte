import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import AdminGeneralSettings from "./AdminGeneralSettings.vue";
import { useAuthStore } from "../stores/auth";

const pushMock = vi.fn();
const frappeRequestMock = vi.fn();

vi.mock("frappe-ui", () => ({
  frappeRequest: (...args) => frappeRequestMock(...args),
  FeatherIcon: { props: ["name"], template: `<i class="feather-icon-stub">{{ name }}</i>` },
}));

vi.mock("vue-router", async () => {
  const actual = await vi.importActual("vue-router");
  return {
    ...actual,
    useRouter: () => ({
      push: pushMock,
    }),
  };
});

const loadedSettings = {
  message: {
    default_locale: "en",
    default_date_format: "YYYY-MM-DD",
    follow_up_due_soon_days: 10,
    follow_up_preview_limit: 12,
    default_policy_term_days: 180,
    default_commission_rate: 10,
    default_currency: "EUR",
    renewal_reminder_lead_days: 45,
    kvkk_consent_default: "Granted",
    dashboard_refresh_seconds: 60,
    default_page_size: 50,
    site_name: "at.localhost",
    environment: "staging",
    active_locale: "tr",
  },
};

const savedSettings = {
  message: {
    default_locale: "tr",
    default_date_format: "DD.MM.YYYY",
    follow_up_due_soon_days: 14,
    follow_up_preview_limit: 20,
    default_policy_term_days: 365,
    default_commission_rate: 10,
    default_currency: "TRY",
    renewal_reminder_lead_days: 30,
    kvkk_consent_default: "Unknown",
    site_name: "at.localhost",
    environment: "staging",
    active_locale: "tr",
  },
};

describe("AdminGeneralSettings", () => {
  beforeEach(() => {
    pushMock.mockReset();
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

  it("renders all settings sections and loads data", async () => {
    frappeRequestMock.mockResolvedValueOnce(loadedSettings);

    const wrapper = mount(AdminGeneralSettings, {
      global: {
        stubs: {
          WorkbenchPageLayout: { template: `<div><slot name="metrics" /><slot name="actions" /><slot /></div>` },
          SaaSMetricCard: { props: ["label", "value", "valueClass"], template: `<div>{{ label }} {{ value }}</div>` },
          SectionPanel: { props: ["title", "meta"], template: `<section><h2>{{ title }}</h2><p>{{ meta }}</p><slot /></section>` },
          ActionButton: { emits: ["click"], template: `<button @click="$emit('click')" :disabled="disabled"><slot /></button>` },
          ToastNotification: { props: ["show", "message", "type"], emits: ["close"], template: `<div v-if="show" class="toast-stub">{{ message }}</div>` },
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("Genel Ayarlar");
    expect(wrapper.text()).toContain("Sigorta Varsayılanları");
    expect(wrapper.text()).toContain("Sigorta Operasyon Varsayılanları");
    expect(wrapper.find('[data-testid="general-policy-term"]').element.value).toBe("180");
    expect(wrapper.find('[data-testid="general-commission-rate"]').element.value).toBe("10");
    expect(wrapper.find('[data-testid="general-currency"]').element.value).toBe("EUR");
    expect(wrapper.find('[data-testid="general-renewal-lead"]').element.value).toBe("45");
    expect(wrapper.find('[data-testid="general-kvkk-consent"]').element.value).toBe("Granted");
    expect(wrapper.text()).toContain("EUR");
    expect(wrapper.text()).toContain("%10");
  });

  it("saves settings and shows toast", async () => {
    frappeRequestMock
      .mockResolvedValueOnce(loadedSettings)
      .mockResolvedValueOnce(savedSettings);

    const wrapper = mount(AdminGeneralSettings, {
      global: {
        stubs: {
          WorkbenchPageLayout: { template: `<div><slot name="metrics" /><slot name="actions" /><slot /></div>` },
          SaaSMetricCard: { props: ["label", "value"], template: `<div>{{ label }} {{ value }}</div>` },
          SectionPanel: { props: ["title", "meta"], template: `<section><h2>{{ title }}</h2><p>{{ meta }}</p><slot /></section>` },
          ActionButton: { emits: ["click"], template: `<button @click="$emit('click')" :disabled="disabled"><slot /></button>` },
          ToastNotification: { props: ["show", "message", "type"], emits: ["close"], template: `<div v-if="show" class="toast-stub">{{ message }}</div>` },
        },
      },
    });

    await flushPromises();

    await wrapper.find('[data-testid="general-follow-up-window"]').setValue("14");
    await wrapper.find('[data-testid="general-follow-up-preview-limit"]').setValue("20");
    await wrapper.find('[data-testid="general-policy-term"]').setValue("365");
    await wrapper.find('[data-testid="general-commission-rate"]').setValue("15");
    await wrapper.find('[data-testid="general-currency"]').setValue("TRY");
    await wrapper.find('[data-testid="general-renewal-lead"]').setValue("30");
    await wrapper.find('[data-testid="general-kvkk-consent"]').setValue("Unknown");

    const allButtons = wrapper.findAll("button");
    const saveButton = allButtons[allButtons.length - 1];
    await saveButton.trigger("click");

    expect(frappeRequestMock).toHaveBeenCalled();
    const saveCalls = frappeRequestMock.mock.calls.filter(c => c[0]?.url?.includes("save_admin_general_settings"));
    expect(saveCalls.length).toBeGreaterThan(0);
    if (saveCalls.length > 0) {
      const saveCall = saveCalls[0][0];
      expect(saveCall.url).toContain("save_admin_general_settings_api");
      expect(saveCall.method).toBe("POST");
    }

    await flushPromises();
    expect(wrapper.text()).toContain("başarıyla kaydedildi");
  });

  it("renders tab interface and shows alert channels on tab switch", async () => {
    frappeRequestMock.mockResolvedValue({ message: {} });

    const wrapper = mount(AdminGeneralSettings, {
      global: {
        stubs: {
          WorkbenchPageLayout: { template: `<div><slot name="metrics" /><slot name="actions" /><slot /></div>` },
          SaaSMetricCard: { props: ["label", "value"], template: `<div>{{ label }} {{ value }}</div>` },
          SectionPanel: { props: ["title", "meta"], template: `<section><h2>{{ title }}</h2><p>{{ meta }}</p><slot /></section>` },
          ActionButton: { emits: ["click"], template: `<button @click="$emit('click')"><slot /></button>` },
          ToastNotification: { props: ["show", "message"], template: `<div v-if="show">{{ message }}</div>` },
          ReportsAlertChannelsSection: { props: ["t", "config", "canManageAlertChannels"], template: `<div class="alert-section-stub">Alert Channels</div>` },
        },
      },
    });

    await flushPromises();
    expect(wrapper.text()).toContain("Genel Ayarlar");
    expect(wrapper.text()).toContain("Bildirim Kanalları");

    const tabs = wrapper.findAll(".nav-tab");
    expect(tabs).toHaveLength(2);

    await tabs[1].trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("Alert Channels");
  });

  it("resets to defaults after making changes", async () => {
    frappeRequestMock.mockResolvedValueOnce(loadedSettings);

    const wrapper = mount(AdminGeneralSettings, {
      global: {
        stubs: {
          WorkbenchPageLayout: { template: `<div><slot name="metrics" /><slot name="actions" /><slot /></div>` },
          SaaSMetricCard: { props: ["label", "value"], template: `<div>{{ label }} {{ value }}</div>` },
          SectionPanel: { props: ["title", "meta"], template: `<section><h2>{{ title }}</h2><p>{{ meta }}</p><slot /></section>` },
          ActionButton: { emits: ["click"], template: `<button @click="$emit('click')" :disabled="disabled"><slot /></button>` },
          ToastNotification: { props: ["show", "message"], template: `<div v-if="show">{{ message }}</div>` },
        },
      },
    });

    await flushPromises();
    expect(wrapper.find('[data-testid="general-policy-term"]').element.value).toBe("180");

    await wrapper.find('[data-testid="general-currency"]').setValue("TRY");
    await wrapper.findAll("button")[0].trigger("click");
    await flushPromises();

    expect(wrapper.find('[data-testid="general-policy-term"]').element.value).toBe("365");
    expect(wrapper.find('[data-testid="general-commission-rate"]').element.value).toBe("10");
    expect(wrapper.find('[data-testid="general-renewal-lead"]').element.value).toBe("30");
    expect(wrapper.find('[data-testid="general-kvkk-consent"]').element.value).toBe("Unknown");
  });
});
