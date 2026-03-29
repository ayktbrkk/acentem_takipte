import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";

import QuickCreateFormRenderer from "./QuickCreateFormRenderer.vue";

describe("QuickCreateFormRenderer", () => {
  it("renders localized labels and emits submit on enter", async () => {
    const wrapper = mount(QuickCreateFormRenderer, {
      props: {
        fields: [
          {
            name: "full_name",
            type: "text",
            label: { tr: "Tam Ad", en: "Full Name" },
            placeholder: { tr: "Adınızı yazın", en: "Enter your name" },
            required: true,
          },
        ],
        model: {
          full_name: "",
        },
        locale: "tr",
      },
    });

    expect(wrapper.text()).toContain("Tam Ad");
    expect(wrapper.text()).toContain("*");

    const input = wrapper.get('input[type="text"]');
    await input.setValue("Aykut");
    await input.trigger("keyup", { key: "Enter" });

    expect(wrapper.emitted("submit")).toHaveLength(1);
  });
});
