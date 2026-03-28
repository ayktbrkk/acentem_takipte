import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { usePolicyListActions } from "./usePolicyListActions";

describe("usePolicyListActions", () => {
  it("navigates to policy detail and formats facts", () => {
    const push = vi.fn();
    const actions = usePolicyListActions({
      router: { push },
      localeCode: ref("en-US"),
      t: (key) => key,
    });

    actions.openPolicyDetail("POL-123");
    expect(push).toHaveBeenCalledWith({ name: "policy-detail", params: { name: "POL-123" } });
    expect(actions.policyIdentityFacts({ name: "POL-001", policy_no: "TR-001" })).toHaveLength(2);
    expect(actions.policyDetailsFacts({ customer: "Aykut", insurance_company: "Acme", end_date: "2099-01-01" })).toHaveLength(3);
    expect(actions.policyPremiumFacts({ gross_premium: 1000, commission_amount: 100, gwp_try: 1000 })).toHaveLength(3);
    expect(actions.formatCount(12345)).toContain("12");
  });
});
