import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

import AccessRequestForm from "./AccessRequestForm.vue";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

describe("AccessRequestForm", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("submits request and emits close after success", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ message: { name: "REQ-001" } }),
    });

    const wrapper = mount(AccessRequestForm, {
      props: {
        customerName: "CUST-001",
        customerDisplayName: "Acme Corp",
      },
    });

    await wrapper.find("textarea").setValue("Need access for renewal review");
    await nextTick();
    await wrapper.find("form").trigger("submit");
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/method/create_customer_access_request",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(wrapper.emitted("submitted")?.[0]).toEqual(["access"]);

    await vi.advanceTimersByTimeAsync(2000);
    expect(wrapper.emitted("closed")).toHaveLength(1);
  });

  it("shows error when request fails", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Access denied" }),
    });

    const wrapper = mount(AccessRequestForm, {
      props: {
        customerName: "CUST-001",
        customerDisplayName: "Acme Corp",
      },
    });

    await wrapper.find("textarea").setValue("Need access for renewal review");
    await nextTick();
    await wrapper.find("form").trigger("submit");
    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.text()).toContain("Access denied");
    expect(wrapper.emitted("submitted")).toBeFalsy();
  });
});
