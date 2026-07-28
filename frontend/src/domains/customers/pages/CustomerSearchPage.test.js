import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

import CustomerSearchPage from "./CustomerSearchPage.vue";

vi.mock("frappe-ui", () => ({
  FeatherIcon: {
    props: ["name"],
    template: `<i class="feather-icon-stub">{{ name }}</i>`,
  },
  Dialog: {
    template: `<div class="dialog-stub"><slot name="body-content" /><slot name="actions" /></div>`,
  },
  createResource: () => ({
    data: { value: null },
    loading: { value: false },
    error: { value: null },
    params: {},
    reload: vi.fn(async () => null),
    submit: vi.fn(async () => ({})),
  }),
  frappeRequest: vi.fn(async () => ({})),
}));

const fetchMock = vi.fn();

vi.stubGlobal("fetch", fetchMock);

const WorkbenchPageLayoutStub = {
  template: `
    <div class="workbench-layout-stub">
      <div class="actions"><slot name="actions" /></div>
      <slot />
    </div>
  `,
};

const GlobalCustomerSearchStub = {
  emits: ["customer-selected"],
  template: `<button class="search-hit-btn" @click="$emit('customer-selected', { name: 'CUST-001' })">hit</button>`,
};

const ListTableStub = {
  props: ["rows"],
  template: `<div class="list-table-stub"><div v-for="row in rows" :key="row.id">{{ row.customer_name }}</div></div>`,
};

describe("CustomerSearchPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("loads access history and resets search state", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            name: "LOG-001",
            reference_name: "CUST-001",
            action_summary: "REQUEST ACCESS",
            viewed_on: "2026-03-29 10:00:00",
          },
        ],
      }),
    });

    const wrapper = mount(CustomerSearchPage, {
      global: {
        stubs: {
          WorkbenchPageLayout: WorkbenchPageLayoutStub,
          GlobalCustomerSearch: GlobalCustomerSearchStub,
          ListTable: ListTableStub,
          StatusBadge: true,
        },
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();

    expect(wrapper.text()).toContain("Recent Access Requests");
    expect(wrapper.text()).toContain("CUST-001");

    await wrapper.find(".search-hit-btn").trigger("click");
    await nextTick();

    expect(wrapper.text()).toContain("Clear Search");

    await wrapper.find(".actions button").trigger("click");
    await nextTick();

    expect(wrapper.text()).toContain("Search");
  });
});
