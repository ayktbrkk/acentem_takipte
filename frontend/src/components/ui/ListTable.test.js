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
  it("renders using custom format function when provided", () => {
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [
          { key: "name", label: "Name", format: (val) => val.toUpperCase() },
        ],
        rows: [{ name: "hello" }],
      },
      global: { stubs: { StatusBadge: true } },
    });
    expect(wrapper.text()).toContain("HELLO");
  });

  it("renders raw value when no type and no format", () => {
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [{ key: "foo", label: "Foo" }],
        rows: [{ foo: "bar" }],
      },
      global: { stubs: { StatusBadge: true } },
    });
    expect(wrapper.text()).toContain("bar");
  });

  it("renders named cell slot content when provided", () => {
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [{ key: "status", label: "Status" }],
        rows: [{ status: "Done" }],
      },
      slots: {
        "cell(status)": "<span class='slot-status'>Tamamlandı</span>",
      },
      global: { stubs: { StatusBadge: true } },
    });
    expect(wrapper.find(".slot-status").exists()).toBe(true);
    expect(wrapper.text()).toContain("Tamamlandı");
    expect(wrapper.text()).not.toContain("Done");
  });

  it("renders dash for null value when no type and no format", () => {
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [{ key: "foo", label: "Foo" }],
        rows: [{ foo: null }],
      },
      global: { stubs: { StatusBadge: true } },
    });
    expect(wrapper.text()).toContain("-");
  });

  it("filters columns when visibleColumns prop is provided", () => {
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [
          { key: "a", label: "A" },
          { key: "b", label: "B" },
          { key: "c", label: "C" },
        ],
        visibleColumns: ["a", "c"],
        rows: [{ a: "1", b: "2", c: "3" }],
      },
      global: { stubs: { StatusBadge: true } },
    });
    expect(wrapper.text()).toContain("1");
    expect(wrapper.text()).not.toContain("2");
    expect(wrapper.text()).toContain("3");
  });

  it("sorts rows internally when sortColumn is not provided and column is sortable", async () => {
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [
          { key: "name", label: "Name", sortable: true },
        ],
        rows: [{ name: "beta" }, { name: "alpha" }, { name: "gamma" }],
      },
      global: { stubs: { StatusBadge: true } },
    });
    const cells = wrapper.findAll("td");
    expect(cells[0].text()).toBe("beta");
    await wrapper.find("th button").trigger("click");
    const cellsAsc = wrapper.findAll("td");
    expect(cellsAsc[0].text()).toBe("alpha");
    await wrapper.find("th button").trigger("click");
    const cellsDesc = wrapper.findAll("td");
    expect(cellsDesc[0].text()).toBe("gamma");
  });

  it("emits sort events in controlled mode when sortColumn prop is set", async () => {
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [
          { key: "name", label: "Name", sortable: true },
        ],
        rows: [{ name: "beta" }, { name: "alpha" }],
        sortColumn: "name",
        sortDirection: "",
      },
      global: { stubs: { StatusBadge: true } },
    });
    await wrapper.find("th button").trigger("click");
    expect(wrapper.emitted("update:sortDirection")[0]).toEqual(["asc"]);
    await wrapper.setProps({ sortDirection: "asc" });
    await wrapper.find("th button").trigger("click");
    expect(wrapper.emitted("update:sortDirection")[1]).toEqual(["desc"]);
  });

  it("shows sort indicator when column is sorted", () => {
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [
          { key: "name", label: "Name", sortable: true },
        ],
        rows: [{ name: "alpha" }],
        sortColumn: "name",
        sortDirection: "asc",
      },
      global: { stubs: { StatusBadge: true } },
    });
    expect(wrapper.find("th").text()).toContain("▲");
  });

  it("renders group header rows with merged colspan", () => {
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [
          { key: "name", label: "Name" },
          { key: "value", label: "Value" },
        ],
        rows: [
          { _isGroupHeader: true, _groupTitle: "Group: A (2)", value: 100 },
          { name: "a1", value: 50 },
          { name: "a2", value: 50 },
          { _isGroupHeader: true, _groupTitle: "Group: B (1)", value: 200 },
          { name: "b1", value: 200 },
        ],
      },
      global: { stubs: { StatusBadge: true } },
    });
    expect(wrapper.text()).toContain("Group: A (2)");
    expect(wrapper.text()).toContain("Group: B (1)");
    expect(wrapper.text()).toContain("a1");
    expect(wrapper.text()).toContain("b1");
  });

  it("shows preview button when showPreview is true", async () => {
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [{ key: "name", label: "Name" }],
        rows: [{ name: "test", id: "1" }],
        showPreview: true,
      },
      global: { stubs: { StatusBadge: true } },
    });
    expect(wrapper.find('svg').exists()).toBe(true);
  });

  it("emits preview-click when preview button clicked", async () => {
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [{ key: "name", label: "Name" }],
        rows: [{ name: "test", id: "1" }],
        showPreview: true,
      },
      global: { stubs: { StatusBadge: true } },
    });
    await wrapper.find('button[title="Preview"]').trigger("click");
    expect(wrapper.emitted("preview-click")).toBeTruthy();
    expect(wrapper.emitted("preview-click")[0][0]).toEqual({ name: "test", id: "1" });
  });

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

  it("renders basic actions column with shared action buttons", async () => {
    const clickMock = vi.fn();
    const wrapper = mount(ListTable, {
      props: {
        ...baseProps,
        columns: [{ key: "actions", type: "actions", label: "Actions" }],
        rows: [{ _actions: [{ label: "Open", variant: "outline", onClick: clickMock }] }],
      },
      global: { stubs: { StatusBadge: true } },
    });

    const btn = wrapper.find("button");
    expect(btn.text()).toBe("Open");
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
