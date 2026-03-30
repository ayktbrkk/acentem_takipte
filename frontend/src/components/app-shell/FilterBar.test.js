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
});
