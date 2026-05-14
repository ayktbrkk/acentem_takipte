import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import ListTable from "./ListTable.vue";

vi.mock("frappe-ui", () => ({
  FeatherIcon: {
    props: ["name"],
    template: `<i class="feather-icon-stub">{{ name }}</i>`,
  },
}));

vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({ locale: "en" }),
}));

describe("ListTable extended column types", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });
  const baseProps = {
    columns: [],
    rows: [],
    loading: false,
    emptyMessage: "No data",
  };

  it("renders compound column with primary and secondary text", () => {
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [
          { key: "info", type: "compound", primaryKey: "name", secondaryKey: "email", label: "Info" },
        ],
        rows: [{ name: "John", email: "john@test.com" }],
      },
      global: { stubs: { StatusBadge: true } },
    });
    expect(wrapper.text()).toContain("John");
    expect(wrapper.text()).toContain("john@test.com");
  });

  it("renders status-meta column with badge and error text", () => {
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [
          { key: "status", type: "status-meta", metaKey: "error", domain: "notification_status", label: "Status" },
        ],
        rows: [{ status: "Failed", error: "Connection error" }],
      },
      global: { stubs: { StatusBadge: true } },
    });
    expect(wrapper.text()).toContain("Connection error");
  });

  it("renders attempts column as count/max", () => {
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [
          { key: "attempts", type: "attempts", currentKey: "count", maxKey: "max", label: "Attempts" },
        ],
        rows: [{ count: 2, max: 5 }],
      },
      global: { stubs: { StatusBadge: true } },
    });
    expect(wrapper.text()).toContain("2");
    expect(wrapper.text()).toContain("5");
  });

  it("renders actions-advanced column with action buttons", async () => {
    const clickMock = vi.fn();
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [
          { key: "actions", type: "actions-advanced", actionKey: "_actions", label: "Actions" },
        ],
        rows: [{ _actions: [{ label: "Retry", variant: "secondary", onClick: clickMock }] }],
      },
      global: { stubs: { StatusBadge: true, ActionButton: { template: "<button @click='$attrs.onClick'><slot /></button>" } } },
    });
    const btn = wrapper.find("button");
    expect(btn.text()).toBe("Retry");
    await btn.trigger("click");
    expect(clickMock).toHaveBeenCalled();
  });

  it("renders compound column with badge", () => {
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [
          {
            key: "info",
            type: "compound",
            primaryKey: "recipient",
            secondaryKey: "name",
            badgeKey: "ref_label",
            badgeSecondaryKey: "ref_name",
            label: "Info",
          },
        ],
        rows: [{ recipient: "ali@x.com", name: "REC-001", ref_label: "Policy", ref_name: "POL-001" }],
      },
      global: { stubs: { StatusBadge: true } },
    });
    expect(wrapper.text()).toContain("ali@x.com");
    expect(wrapper.text()).toContain("REC-001");
    expect(wrapper.text()).toContain("Policy");
    expect(wrapper.text()).toContain("POL-001");
  });
});
