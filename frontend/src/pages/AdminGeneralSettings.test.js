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

  it("renders settings cards, loads data, and saves changes with toast", async () => {
    frappeRequestMock
      .mockResolvedValueOnce({
        message: {
          default_locale: "en",
          default_date_format: "YYYY-MM-DD",
          follow_up_due_soon_days: 10,
          follow_up_preview_limit: 12,
          site_name: "at.localhost",
          environment: "staging",
          active_locale: "tr",
        },
      })
      .mockResolvedValueOnce({
        message: {
          default_locale: "tr",
          default_date_format: "DD.MM.YYYY",
          follow_up_due_soon_days: 14,
          follow_up_preview_limit: 20,
          site_name: "at.localhost",
          environment: "staging",
          active_locale: "tr",
        },
      });

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
    expect(wrapper.text()).toContain("Uygulama Varsayılanları");
    expect(wrapper.text()).toContain("Operasyon Varsayılanları");
    expect(wrapper.text()).toContain("Sistem Bilgisi");
    expect(wrapper.find('[data-testid="general-default-locale"]').element.value).toBe("en");
    expect(wrapper.find('[data-testid="general-follow-up-window"]').element.value).toBe("10");
    expect(wrapper.find('[data-testid="general-follow-up-preview-limit"]').element.value).toBe("12");
    expect(wrapper.text()).toContain("Turkce");
    expect(wrapper.text()).toContain("10");

    await wrapper.find('[data-testid="general-default-locale"]').setValue("tr");
    await wrapper.find('[data-testid="general-follow-up-window"]').setValue("14");
    await wrapper.find('[data-testid="general-follow-up-preview-limit"]').setValue("20");
    await wrapper.findAll("button")[2].trigger("click");

    expect(frappeRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/method/acentem_takipte.acentem_takipte.api.admin_settings.save_admin_general_settings_api",
        method: "POST",
        params: expect.objectContaining({
          config: expect.objectContaining({
            follow_up_due_soon_days: 14,
            follow_up_preview_limit: 20,
          }),
        }),
      }),
    );

    await flushPromises();
    expect(wrapper.text()).toContain("başarıyla kaydedildi");
  });

  it("navigates to alert channel settings", async () => {
    frappeRequestMock.mockResolvedValueOnce({
      message: {
        default_locale: "tr",
        default_date_format: "DD.MM.YYYY",
        follow_up_due_soon_days: 7,
        follow_up_preview_limit: 8,
        site_name: "at.localhost",
        environment: "staging",
        active_locale: "tr",
      },
    });

    const wrapper = mount(AdminGeneralSettings, {
      global: {
        stubs: {
          WorkbenchPageLayout: { template: `<div><slot name="metrics" /><slot name="actions" /><slot /></div>` },
          SaaSMetricCard: { props: ["label", "value"], template: `<div>{{ label }} {{ value }}</div>` },
          SectionPanel: { props: ["title", "meta"], template: `<section><h2>{{ title }}</h2><p>{{ meta }}</p><slot /></section>` },
          ActionButton: { emits: ["click"], template: `<button @click="$emit('click')"><slot /></button>` },
          ToastNotification: { props: ["show", "message"], template: `<div v-if="show">{{ message }}</div>` },
        },
      },
    });

    await flushPromises();

    await wrapper.findAll("button")[1].trigger("click");
    expect(pushMock).toHaveBeenCalledWith({ name: "admin-alert-channels" });
  });

  it("resets settings to defaults", async () => {
    frappeRequestMock.mockResolvedValueOnce({
      message: {
        default_locale: "tr",
        default_date_format: "DD.MM.YYYY",
        follow_up_due_soon_days: 14,
        follow_up_preview_limit: 20,
        site_name: "at.localhost",
        environment: "staging",
        active_locale: "tr",
      },
    });

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
    expect(wrapper.find('[data-testid="general-follow-up-window"]').element.value).toBe("14");

    await wrapper.find('[data-testid="general-default-locale"]').setValue("en");
    await wrapper.findAll("button")[0].trigger("click");
    await flushPromises();

    expect(wrapper.find('[data-testid="general-follow-up-window"]').element.value).toBe("7");
    expect(wrapper.find('[data-testid="general-follow-up-preview-limit"]').element.value).toBe("8");
  });
});
