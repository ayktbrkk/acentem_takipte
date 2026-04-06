// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import BreakGlassRequest from "./BreakGlassRequest.vue";
import { useAuthStore } from "../stores/auth";

const frappeRequest = vi.fn();

vi.mock("frappe-ui", () => ({
  frappeRequest: (...args) => frappeRequest(...args),
}));

const genericStub = {
  template: "<div><slot /><slot name='actions' /><slot name='trailing' /></div>",
};

describe("BreakGlassRequest page", () => {
  beforeEach(() => {
    frappeRequest.mockReset();
    setActivePinia(createPinia());

    const authStore = useAuthStore();
    authStore.applyContext({
      user: "agent@example.com",
      full_name: "Agent",
      roles: ["Agent"],
      preferred_home: "/at",
      interface_mode: "spa",
      locale: "tr",
    });
  });

  it("submits break-glass request payload", async () => {
    frappeRequest.mockResolvedValueOnce({
      message: {
        ok: true,
        message: "Request queued",
      },
    });

    const wrapper = mount(BreakGlassRequest, {
      global: {
        stubs: {
          WorkbenchPageLayout: genericStub,
          SectionPanel: genericStub,
        },
      },
    });

    await wrapper.find("textarea").setValue("Yuksek onemli musteri kaydinda acil degisiklik gerekiyor.");
    await wrapper.find("form").trigger("submit.prevent");

    expect(frappeRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/method/acentem_takipte.acentem_takipte.api.break_glass.create_request",
      }),
    );
    expect(wrapper.text()).toContain("Request queued");
  });

  it("validates access using break-glass API", async () => {
    frappeRequest.mockResolvedValueOnce({
      message: {
        is_valid: false,
        message: "No active grant",
      },
    });

    const wrapper = mount(BreakGlassRequest, {
      global: {
        stubs: {
          WorkbenchPageLayout: genericStub,
          SectionPanel: genericStub,
        },
      },
    });

    const validateButton = wrapper.findAll("button").find((button) => button.text().includes("Erişimi Doğrula"));
    await validateButton.trigger("click");

    expect(frappeRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/method/acentem_takipte.acentem_takipte.api.break_glass.validate_access",
      }),
    );
    expect(wrapper.text()).toContain("No active grant");
  });
});
