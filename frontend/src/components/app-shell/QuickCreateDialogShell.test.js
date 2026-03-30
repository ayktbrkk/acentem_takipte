import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import QuickCreateDialogShell from "./QuickCreateDialogShell.vue";
import { useAuthStore } from "../../stores/auth";

describe("QuickCreateDialogShell", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const authStore = useAuthStore();
    authStore.applyContext({
      locale: "tr",
    });
  });

  it("renders fallback Turkish labels and save button class", () => {
    const wrapper = mount(QuickCreateDialogShell, {
      props: {
        loading: false,
        labels: {},
      },
      slots: {
        default: "<div class='shell-slot'>body</div>",
      },
    });

    expect(wrapper.text()).toContain("İptal");
    expect(wrapper.text()).toContain("Kaydet");
    expect(wrapper.text()).toContain("Kaydet ve Aç");
    expect(wrapper.findAll("button")[1].classes()).toContain("border-brand-700");
  });

  it("emits save and cancel actions", async () => {
    const wrapper = mount(QuickCreateDialogShell, {
      props: {
        loading: false,
        labels: {
          cancel: "Abort",
        },
        showSaveAndOpen: false,
      },
    });

    await wrapper.findAll("button")[0].trigger("click");
    await wrapper.findAll("button")[1].trigger("click");

    expect(wrapper.emitted("cancel")).toHaveLength(1);
    expect(wrapper.emitted("save")).toHaveLength(1);
  });
});
