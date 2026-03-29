// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";

vi.mock("../pinia", () => ({
  getAppPinia: () => ({}),
}));

const authStore = {
  locale: "tr",
  applyContext: vi.fn(),
};

vi.mock("../stores/auth", () => ({
  useAuthStore: () => authStore,
}));

vi.mock("../components/ui/StepBar.vue", () => ({
  default: {
    template: "<div class='step-bar-stub' />",
  },
}));

vi.mock("./policy-form/PolicyFormCustomerStep.vue", () => ({
  default: {
    template: "<div class='customer-step-stub' />",
  },
}));

vi.mock("./policy-form/PolicyFormPolicyStep.vue", () => ({
  default: {
    template: "<div class='policy-step-stub' />",
  },
}));

vi.mock("./policy-form/PolicyFormCoverageStep.vue", () => ({
  default: {
    template: "<div class='coverage-step-stub' />",
  },
}));

vi.mock("./policy-form/PolicyFormReviewStep.vue", () => ({
  default: {
    template: "<div class='review-step-stub' />",
  },
}));

import PolicyForm from "./PolicyForm.vue";

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const genericStub = {
  template: "<div><slot /></div>",
};

describe("PolicyForm", () => {
  beforeEach(() => {
    authStore.locale = "tr";
    authStore.applyContext.mockClear();
  });

  it("advances through steps and reaches the review action", async () => {
    const model = {
      source_offer: "OFF-0001",
      customer: "",
      customer_full_name: "",
      customer_type: "Individual",
      customer_tax_id: "",
      customer_birth_date: "",
      customer_phone: "",
      customer_email: "",
      createCustomerMode: false,
      sales_entity: "SE-1",
      insurance_company: "INS-1",
      branch: "BR-1",
      policy_no: "POL-1",
      status: "Active",
      currency: "TRY",
      issue_date: "2026-03-01",
      start_date: "2026-03-01",
      end_date: "2026-12-31",
      gross_premium: 1000,
      net_premium: 800,
      tax_amount: 200,
      commission_amount: 100,
      notes: "Test note",
    };

    const wrapper = mount(PolicyForm, {
      props: {
        model,
        fieldErrors: {},
        optionsMap: { customers: [] },
        hasSourceOffer: true,
      },
      global: {
        stubs: {
          StepBar: genericStub,
          SectionPanel: genericStub,
          QuickCustomerPicker: genericStub,
          QuickCreateFormRenderer: genericStub,
          PolicyFormCustomerStep: genericStub,
          PolicyFormPolicyStep: genericStub,
          PolicyFormCoverageStep: genericStub,
          PolicyFormReviewStep: genericStub,
        },
      },
    });

    await flushPromises();

    expect(wrapper.text()).toContain("Yeni Poliçe");
    expect(wrapper.text()).toContain("İleri");

    const nextButton = () => wrapper.findAll("button").find((button) => button.text() === "İleri");

    await nextButton().trigger("click");
    await flushPromises();
    await nextButton().trigger("click");
    await flushPromises();
    await nextButton().trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain("Kaydet");
  });
});
