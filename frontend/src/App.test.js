import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { nextTick, reactive } from "vue";

import App from "./App.vue";
import { useUiStore } from "./stores/ui";

const routeState = reactive({
  fullPath: "/at",
  path: "/at",
  name: "dashboard",
  params: {},
});

vi.mock("vue-router", () => ({
  useRoute: () => routeState,
}));

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
    <div>
      <button
        class="sidebar-stub"
        :data-open="String(mobileOpen)"
        @click="$emit('close')"
      />
      <button class="sidebar-navigate-stub" @click="$emit('navigate')" />
    </div>
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
    routeState.fullPath = "/at";
    routeState.path = "/at";
    routeState.name = "dashboard";
    routeState.params = {};
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

    await wrapper.find(".topbar-stub").trigger("click");
    expect(uiStore.sidebarOpen).toBe(true);

    await wrapper.find(".sidebar-navigate-stub").trigger("click");
    expect(uiStore.sidebarOpen).toBe(false);
  });

  it("closes mobile sidebar on route transitions", async () => {
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

    await wrapper.find(".topbar-stub").trigger("click");
    expect(uiStore.sidebarOpen).toBe(true);

    routeState.fullPath = "/policies/POL-0001";
    routeState.path = "/policies/POL-0001";
    routeState.name = "policy-detail";
    routeState.params = { name: "POL-0001" };
    await nextTick();

    expect(uiStore.sidebarOpen).toBe(false);
  });
});
