import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { usePolicyListQuickPolicy } from "./usePolicyListQuickPolicy";

vi.mock("./usePolicyQuickCreateRuntime", () => ({
  usePolicyQuickCreateRuntime: vi.fn(() => ({
    showQuickPolicyDialog: ref(false),
    quickPolicyDialogKey: ref(0),
    quickPolicyLoading: ref(false),
    quickPolicyError: ref(""),
    quickPolicyFieldErrors: ref({}),
    quickPolicyForm: ref({}),
    policyQuickOptionsMap: ref({}),
    quickPolicyUi: ref({ title: "Quick Policy", eyebrow: "Policy", subtitle: "" }),
    quickCreateCommon: {},
    hasQuickPolicySourceOffer: ref(false),
    openQuickPolicyDialog: vi.fn(),
    cancelQuickPolicyDialog: vi.fn(),
    submitQuickPolicy: vi.fn(),
    onPolicyRelatedCreateRequested: vi.fn(),
  })),
}));

describe("usePolicyListQuickPolicy", () => {
  it("delegates to the shared quick policy runtime", () => {
    const result = usePolicyListQuickPolicy({
      t: (key) => key,
      activeLocale: ref("en"),
      router: { push: vi.fn() },
      route: { query: {} },
      branchStore: {},
      refreshPolicyList: vi.fn(),
      openPolicyDetail: vi.fn(),
    });

    expect(result.quickPolicyUi.value.title).toBe("Quick Policy");
    expect(result.openQuickPolicyDialog).toBeTypeOf("function");
  });
});
