import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import App from "./App.vue";
import { useUiStore } from "./stores/ui";

vi.mock("./components/Sidebar.vue", () => ({
  default: {
    props: ["mobileOpen"],
    emits: ["close", "navigate"],
    template: `<button class="sidebar-stub" :data-open="String(mobileOpen)" @click="$emit('close')" />`,
  },
}));

vi.mock("./components/Topbar.vue", () => ({
  default: {
    emits: ["toggle-sidebar"],
    template: `<button class="topbar-stub" @click="$emit('toggle-sidebar')" />`,
  },
}));

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
