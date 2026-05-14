import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import ATSelect from "./ATSelect.vue";

describe("ATSelect", () => {
  it("renders placeholder when no value selected", () => {
    const wrapper = mount(ATSelect, {
      props: {
        options: [{ value: "opt1", label: "Option 1" }],
        placeholder: "Seçiniz",
        "onUpdate:modelValue": () => {},
      },
    });
    const select = wrapper.find("select");
    const placeholderOption = select.find("option[value='']");
    expect(placeholderOption.exists()).toBe(true);
    expect(placeholderOption.text()).toBe("Seçiniz");
  });

  it("renders options with correct labels", () => {
    const wrapper = mount(ATSelect, {
      props: {
        options: [
          { value: "opt1", label: "Option 1" },
          { value: "opt2", label: "Option 2" },
        ],
        "onUpdate:modelValue": () => {},
      },
    });
    const allOptions = wrapper.findAll("option");
    expect(allOptions).toHaveLength(2);
    expect(allOptions[0].text()).toBe("Option 1");
  });

  it("emits update:modelValue on change", async () => {
    const updateMock = vi.fn();
    const wrapper = mount(ATSelect, {
      props: {
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
        "onUpdate:modelValue": updateMock,
      },
    });
    const select = wrapper.find("select");
    await select.setValue("b");
    expect(updateMock).toHaveBeenCalledWith("b");
  });

  it("displays the selected modelValue", () => {
    const wrapper = mount(ATSelect, {
      props: {
        modelValue: "opt1",
        options: [{ value: "opt1", label: "Option 1" }],
        "onUpdate:modelValue": () => {},
      },
    });
    expect(wrapper.find("select").element.value).toBe("opt1");
  });
});
