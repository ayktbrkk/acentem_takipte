// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import BreakGlassApprovals from "./BreakGlassApprovals.vue";
import { useAuthStore } from "../stores/auth";

const frappeRequest = vi.fn();

vi.mock("frappe-ui", () => ({
  frappeRequest: (...args) => frappeRequest(...args),
}));

const genericStub = {
  template: "<div><slot /><slot name='actions' /><slot name='trailing' /></div>",
};

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("BreakGlassApprovals page", () => {
  beforeEach(() => {
    frappeRequest.mockReset();
    setActivePinia(createPinia());

    const authStore = useAuthStore();
    authStore.applyContext({
      user: "manager@example.com",
      full_name: "Manager",
      roles: ["System Manager"],
      preferred_home: "/at",
      interface_mode: "spa",
      locale: "tr",
    });
  });

  it("loads pending requests on mount", async () => {
    frappeRequest.mockResolvedValueOnce({
      message: [
        {
          name: "BGR-0001",
          user: "agent@example.com",
          access_type: "customer_data",
          reference: "AT Customer:CUS-0001",
          created_at: "2026-03-25 10:00:00",
          justification: "Acil durum",
        },
      ],
    });

    const wrapper = mount(BreakGlassApprovals, {
      global: {
        stubs: {
          WorkbenchPageLayout: genericStub,
          SectionPanel: genericStub,
          EmptyState: true,
        },
      },
    });

    await flushPromises();

    expect(frappeRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/method/acentem_takipte.acentem_takipte.api.break_glass.list_pending",
      }),
    );
    expect(wrapper.text()).toContain("BGR-0001");
  });

  it("approves a pending request", async () => {
    frappeRequest
      .mockResolvedValueOnce({
        message: [
          {
            name: "BGR-0002",
            user: "agent@example.com",
            access_type: "customer_data",
            reference: "AT Customer:CUS-0002",
            created_at: "2026-03-25 10:00:00",
            justification: "Acil durum",
          },
        ],
      })
      .mockResolvedValueOnce({
        message: {
          ok: true,
          message: "Approved",
        },
      })
      .mockResolvedValueOnce({ message: [] });

    const wrapper = mount(BreakGlassApprovals, {
      global: {
        stubs: {
          WorkbenchPageLayout: genericStub,
          SectionPanel: genericStub,
          EmptyState: true,
        },
      },
    });

    await flushPromises();

    const approveButton = wrapper.findAll("button").find((button) => button.text().includes("Onayla"));
    await approveButton.trigger("click");
    await flushPromises();

    expect(frappeRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/method/acentem_takipte.acentem_takipte.api.break_glass.approve_request",
      }),
    );
    expect(wrapper.text()).toContain("Approved");
  });
});
