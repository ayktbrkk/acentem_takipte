import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

import OfferForm from "./OfferForm.vue";
import PolicyForm from "./PolicyForm.vue";
import LeadForm from "./LeadForm.vue";
import CustomerForm from "./CustomerForm.vue";

vi.mock("../config/quickCreateRegistry", () => ({
  getQuickCreateConfig: (key) => ({
    fields:
      key === "offer"
        ? [{ name: "sales_entity" }, { name: "notes" }]
        : key === "policy"
          ? [{ name: "insurance_company" }, { name: "notes" }]
          : [],
  }),
}));

vi.mock("../utils/i18n", () => ({
  translateText: (key) => key,
}));

vi.mock("./app-shell/QuickCreateFormRenderer.vue", () => ({
  default: { name: "QuickCreateFormRenderer", template: "<div />" },
}));

vi.mock("./app-shell/QuickCustomerPicker.vue", () => ({
  default: { name: "QuickCustomerPicker", template: "<div />" },
}));

vi.mock("./app-shell/ATQuickEntryModal.vue", () => ({
  default: {
    name: "ATQuickEntryModal",
    props: ["modelValue"],
    emits: ["update:modelValue", "cancel", "save", "save-and-open"],
    template: `
      <div>
        <button type="button" data-testid="close" @click="$emit('update:modelValue', false)">close</button>
        <slot />
      </div>
    `,
  },
}));

const simpleStubs = {
  QuickCreateFormRenderer: { template: "<div />" },
  QuickCustomerPicker: { template: "<div />" },
};

function mountOfferForm() {
  return mount(OfferForm, {
    props: {
      model: {},
      fieldErrors: {},
      optionsMap: {},
    },
    global: { stubs: simpleStubs },
  });
}

function mountPolicyForm() {
  return mount(PolicyForm, {
    props: {
      model: {},
      fieldErrors: {},
      optionsMap: {},
    },
    global: { stubs: simpleStubs },
  });
}

function mountLeadForm() {
  return mount(LeadForm, {
    props: {
      model: {},
      fieldErrors: {},
      optionsMap: {},
      fields: [],
      activeLocale: "tr",
    },
    global: { stubs: simpleStubs },
  });
}

function mountCustomerForm() {
  return mount(CustomerForm, {
    props: {
      model: {},
      fieldErrors: {},
      optionsMap: {},
      fields: [],
    },
    global: { stubs: simpleStubs },
  });
}

describe("quick entry modal close propagation", () => {
  it("propagates close from OfferForm", async () => {
    const wrapper = mountOfferForm();
    await wrapper.get('[data-testid="close"]').trigger("click");
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });

  it("propagates close from PolicyForm", async () => {
    const wrapper = mountPolicyForm();
    await wrapper.get('[data-testid="close"]').trigger("click");
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });

  it("propagates close from LeadForm", async () => {
    const wrapper = mountLeadForm();
    await wrapper.get('[data-testid="close"]').trigger("click");
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });

  it("propagates close from CustomerForm", async () => {
    const wrapper = mountCustomerForm();
    await wrapper.get('[data-testid="close"]').trigger("click");
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });
});
