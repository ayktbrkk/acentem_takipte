import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref } from "vue";

import QuickCreateManagedDialog from "./QuickCreateManagedDialog.vue";

const routerPush = vi.fn();
const submitMock = vi.fn();
const runSuccessTargetsMock = vi.fn(async () => {});

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: routerPush,
  }),
}));

vi.mock("frappe-ui", () => ({
  Dialog: {
    props: ["modelValue"],
    template: `<div class="dialog-stub"><slot name="body-content" /></div>`,
  },
  createResource: () => ({
    data: ref({}),
    loading: ref(false),
    error: ref(null),
    params: {},
    setData: vi.fn(),
    reload: vi.fn(async () => ({})),
    submit: submitMock,
  }),
}));

vi.mock("../../utils/quickCreateSuccess", () => ({
  runQuickCreateSuccessTargets: runSuccessTargetsMock,
}));

const QuickCreateDialogShellStub = {
  props: ["error"],
  emits: ["cancel", "save", "save-and-open"],
  template: `
    <div class="quick-create-shell-stub">
      <div class="error-text">{{ error }}</div>
      <button class="save-btn" @click="$emit('save')">save</button>
      <button class="save-open-btn" @click="$emit('save-and-open')">save-open</button>
      <slot />
    </div>
  `,
};

const QuickCreateFormRendererStub = {
  template: `<div class="quick-create-form-stub"></div>`,
};

describe("QuickCreateManagedDialog", () => {
  beforeEach(() => {
    routerPush.mockReset();
    submitMock.mockReset();
    runSuccessTargetsMock.mockClear();
  });

  it("submits edit payload and runs success targets", async () => {
    submitMock.mockResolvedValue({ record: "REL-001" });

    const wrapper = mount(QuickCreateManagedDialog, {
      props: {
        modelValue: true,
        configKey: "customer_relation_edit",
        locale: "tr",
        successHandlers: {
          aux_detail: vi.fn(async () => {}),
        },
        beforeOpen: async ({ resetForm }) => {
          resetForm({
            doctype: "AT Customer Relation",
            name: "REL-001",
            customer: "CUST-001",
            related_customer: "CUST-002",
            relation_type: "Spouse",
            is_household: true,
            notes: "Aynı hane",
          });
        },
      },
      global: {
        stubs: {
          QuickCreateDialogShell: QuickCreateDialogShellStub,
          QuickCreateFormRenderer: QuickCreateFormRendererStub,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    await wrapper.find(".save-btn").trigger("click");
    await Promise.resolve();
    await Promise.resolve();

    expect(submitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        doctype: "AT Customer Relation",
        name: "REL-001",
        customer: "CUST-001",
        related_customer: "CUST-002",
        relation_type: "Spouse",
        is_household: true,
        notes: "Aynı hane",
      })
    );
    expect(runSuccessTargetsMock).toHaveBeenCalledWith(
      ["aux_detail"],
      expect.objectContaining({ aux_detail: expect.any(Function) })
    );
    expect(wrapper.emitted("created")?.[0]?.[0]).toEqual(
      expect.objectContaining({
        recordName: "REL-001",
        openAfter: false,
        configKey: "customer_relation_edit",
      })
    );
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([false]);
  });

  it("emits error and shows message when submit fails", async () => {
    submitMock.mockRejectedValue(new Error("Server validation failed"));

    const wrapper = mount(QuickCreateManagedDialog, {
      props: {
        modelValue: true,
        configKey: "insured_asset_edit",
        locale: "tr",
        beforeOpen: async ({ resetForm }) => {
          resetForm({
            doctype: "AT Insured Asset",
            name: "AST-001",
            customer: "CUST-001",
            asset_type: "Vehicle",
            asset_label: "34 ABC 123",
          });
        },
      },
      global: {
        stubs: {
          QuickCreateDialogShell: QuickCreateDialogShellStub,
          QuickCreateFormRenderer: QuickCreateFormRendererStub,
        },
      },
    });

    await Promise.resolve();
    await Promise.resolve();

    await wrapper.find(".save-btn").trigger("click");
    await Promise.resolve();
    await Promise.resolve();

    expect(wrapper.emitted("error")).toHaveLength(1);
    expect(wrapper.find(".error-text").text()).toContain("Server validation failed");
    expect(wrapper.emitted("created")).toBeFalsy();
  });
});
