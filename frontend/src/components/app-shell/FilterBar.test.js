import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import FilterBar from "./FilterBar.vue";

describe("FilterBar", () => {
  it("toggles advanced filters and emits state", async () => {
    const wrapper = mount(FilterBar, {
      props: {
        activeCount: 2,
        activeCountLabel: "active",
      },
      slots: {
        default: "<div class='default-slot'>base</div>",
        advanced: "<div class='advanced-slot'>advanced</div>",
        actions: "<div class='actions-slot'>actions</div>",
      },
    });

    expect(wrapper.text()).toContain("2 active");
    expect(wrapper.find(".advanced-slot").exists()).toBe(false);

    await wrapper.findAll("button[type='button']")[1].trigger("click");

    expect(wrapper.emitted("advanced-toggle")?.[0]).toEqual([true]);
    expect(wrapper.find(".advanced-slot").exists()).toBe(true);
  });

  it("toggles mobile filters label when advanced slot exists", async () => {
    const wrapper = mount(FilterBar, {
      slots: {
        advanced: "<div class='advanced-slot'>advanced</div>",
      },
    });

    expect(wrapper.text()).toContain("Filtreler");

    await wrapper.find("button[type='button']").trigger("click");
    expect(wrapper.text()).toContain("Filtreleri Gizle");
  });

  it("never applies the bare hidden class to the filter grid", async () => {
    // Regression: frappe-ui defines .hidden { display:none !important },
    // which would keep the desktop filter grid permanently hidden when it
    // also carries lg:grid. The grid must use responsive max-lg variants.
    const wrapper = mount(FilterBar, {
      props: {
        activeCount: 0,
      },
      slots: {
        default: "<div class='default-slot'>base</div>",
        advanced: "<div class='advanced-slot'>advanced</div>",
      },
    });

    const grid = wrapper.find(".at-filter-grid");
    const classes = grid.classes();
    expect(classes).not.toContain("hidden");
    expect(classes).toContain("lg:grid");
    expect(classes).toContain("max-lg:hidden");

    const button = wrapper.find("button[type='button']");
    await button.trigger("click");
    const classesOpen = grid.classes();
    expect(classesOpen).not.toContain("hidden");
    expect(classesOpen).toContain("max-lg:grid");
  });
});
