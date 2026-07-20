import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import QuickCreateLauncher from "./QuickCreateLauncher.vue";

const routerPush = vi.fn();

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
  useRoute: () => ({
    fullPath: "/app/at-dashboard",
  }),
}));

describe("QuickCreateLauncher", () => {
  beforeEach(() => {
    routerPush.mockReset();
  });

  it("emits launch when no route is configured", async () => {
    const wrapper = mount(QuickCreateLauncher, {
      props: {
        label: "Open",
      },
      global: {
        stubs: {
          ActionButton: {
            template: `<button type="button" class="action-button-stub" @click="$emit('click')"><slot /></button>`,
          },
        },
      },
    });

    await wrapper.find(".action-button-stub").trigger("click");

    expect(wrapper.emitted("launch")?.length).toBeGreaterThanOrEqual(1);
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("pushes quick create intent to route when route is configured", async () => {
    const wrapper = mount(QuickCreateLauncher, {
      props: {
        label: "Open",
        routeName: "QuickCreate",
        withReturnTo: true,
        prefills: {
          customer: "CUST-001",
        },
        extras: {
          source: "dashboard",
        },
      },
      global: {
        stubs: {
          ActionButton: {
            template: `<button type="button" class="action-button-stub" @click="$emit('click')"><slot /></button>`,
          },
        },
      },
    });

    await wrapper.find(".action-button-stub").trigger("click");

    expect(routerPush).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "QuickCreate",
      })
    );
  });
});
