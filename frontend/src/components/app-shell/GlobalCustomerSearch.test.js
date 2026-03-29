import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import GlobalCustomerSearch from "./GlobalCustomerSearch.vue";

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

const MaskedDataNoticeStub = {
  emits: ["request-access", "dismiss"],
  template: `
    <div class="masked-notice-stub">
      <button class="request-access-btn" @click="$emit('request-access')">request</button>
      <button class="dismiss-btn" @click="$emit('dismiss')">dismiss</button>
    </div>
  `,
};

const AccessRequestFormStub = {
  emits: ["submitted", "closed"],
  template: `
    <div class="access-request-form-stub">
      <button class="submit-btn" @click="$emit('submitted', 'access')">submit</button>
      <button class="close-btn" @click="$emit('closed')">close</button>
    </div>
  `,
};

describe("GlobalCustomerSearch", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("searches customer and emits selection", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          exists: true,
          is_masked: false,
          access_request_allowed: false,
          customer: {
            name: "CUST-001",
            full_name: "Acme Corp",
            tax_id: "1234567890",
            phone: "555 111",
            email: "info@acme.test",
            office_branch: "Istanbul",
          },
        },
      }),
    });

    const wrapper = mount(GlobalCustomerSearch, {
      props: {
        officeBranch: "Istanbul",
      },
      global: {
        stubs: {
          MaskedDataNotice: MaskedDataNoticeStub,
          AccessRequestForm: AccessRequestFormStub,
        },
      },
    });

    await wrapper.find("input").setValue("1234567890");
    await wrapper.find("button.btn-primary").trigger("click");
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/method/search_customer_by_identity",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(wrapper.emitted("customer-selected")?.[0]?.[0]).toEqual(
      expect.objectContaining({
        name: "CUST-001",
        full_name: "Acme Corp",
      })
    );
    expect(wrapper.text()).toContain("Acme Corp");
  });

  it("opens access request form for masked customers", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          exists: true,
          is_masked: true,
          access_request_allowed: true,
          customer: {
            name: "CUST-002",
            full_name: "Masked Customer",
            tax_id: "1234567891",
            phone: "",
            email: "",
            office_branch: "Ankara",
          },
        },
      }),
    });

    const wrapper = mount(GlobalCustomerSearch, {
      global: {
        stubs: {
          MaskedDataNotice: MaskedDataNoticeStub,
          AccessRequestForm: AccessRequestFormStub,
        },
      },
    });

    await wrapper.find("input").setValue("1234567891");
    await wrapper.find("button.btn-primary").trigger("click");
    await Promise.resolve();
    await Promise.resolve();

    await wrapper.find(".request-access-btn").trigger("click");
    await Promise.resolve();

    expect(wrapper.find(".access-request-form-stub").exists()).toBe(true);
  });
});
