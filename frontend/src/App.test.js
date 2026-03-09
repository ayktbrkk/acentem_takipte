import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import App from "./App.vue";
import { useUiStore } from "./stores/ui";

const SidebarStub = {
  props: ["mobileOpen"],
  emits: ["close", "navigate"],
  template: `
    <button
      class="sidebar-stub"
      :data-open="String(mobileOpen)"
      @click="$emit('close')"
    />
  `,
};

const TopbarStub = {
  emits: ["toggle-sidebar"],
  template: `
    <button
      class="topbar-stub"
      @click="$emit('toggle-sidebar')"
    />
  `,
};

const RouterViewStub = {
  template: `
    <slot
      :Component="{ template: '<div class=&quot;route-component&quot; />' }"
      :route="{ name: 'dashboard', path: '/at', params: {} }"
    />
  `,
};

describe("App shell ui store integration", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("wires topbar toggle and sidebar close to ui store", async () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          Sidebar: SidebarStub,
          Topbar: TopbarStub,
          RouterView: RouterViewStub,
        },
      },
    });

    const uiStore = useUiStore();

    expect(wrapper.find(".sidebar-stub").attributes("data-open")).toBe("false");

    await wrapper.find(".topbar-stub").trigger("click");
    expect(uiStore.sidebarOpen).toBe(true);
    expect(wrapper.find(".sidebar-stub").attributes("data-open")).toBe("true");

    await wrapper.find(".sidebar-stub").trigger("click");
    expect(uiStore.sidebarOpen).toBe(false);
    expect(wrapper.find(".sidebar-stub").attributes("data-open")).toBe("false");
  });
});
