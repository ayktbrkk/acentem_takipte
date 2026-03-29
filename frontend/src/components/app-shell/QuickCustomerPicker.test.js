import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";

import QuickCustomerPicker from "./QuickCustomerPicker.vue";

const state = vi.hoisted(() => ({
  lastResource: null,
  reloadMock: vi.fn(async () => ({})),
}));

vi.mock("frappe-ui", () => ({
  createResource: () => {
    const resource = {
      data: ref([]),
      loading: ref(false),
      error: ref(null),
      setData(value) {
        resource.data.value = value;
      },
      reload: state.reloadMock,
    };
    state.lastResource = resource;
    return resource;
  },
}));

describe("QuickCustomerPicker", () => {
  beforeEach(() => {
    state.reloadMock.mockReset();
    state.lastResource = null;
  });

  it("shows customer suggestions and emits create-mode state", async () => {
    const model = {
      customer: "",
      queryText: "",
      customerOption: null,
      createCustomerMode: false,
      customer_type: "Individual",
      tax_id: "",
      birth_date: "",
      phone: "",
      email: "",
    };

    const wrapper = mount(QuickCustomerPicker, {
      props: {
        model,
        locale: "tr",
        officeBranch: "HQ",
      },
    });

    await wrapper.get("input.input").setValue("Ay");
    await new Promise((resolve) => setTimeout(resolve, 250));

    state.lastResource.setData([
      { name: "CUST-001", full_name: "Aykut Ltd", tax_id: "11111111111" },
    ]);
    await wrapper.vm.$nextTick();

    await wrapper.get("button.inline-flex").trigger("click");
    await wrapper.vm.$nextTick();

    expect(model.createCustomerMode).toBe(true);
    expect(wrapper.text()).toContain("Müşteri Tipi");
    expect(wrapper.text()).toContain("TC Kimlik No");
  });
});
