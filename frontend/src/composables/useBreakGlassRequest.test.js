import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import { useBreakGlassRequest } from "./useBreakGlassRequest";

const frappeRequest = vi.fn();

vi.mock("frappe-ui", () => ({
  frappeRequest: (...args) => frappeRequest(...args),
}));

describe("useBreakGlassRequest", () => {
  it("submits requests and validates access", async () => {
    frappeRequest.mockResolvedValueOnce({
      message: {
        ok: true,
        message: "Request queued",
      },
    });
    frappeRequest.mockResolvedValueOnce({
      message: {
        is_valid: false,
        message: "No active grant",
      },
    });

    const runtime = useBreakGlassRequest({
      t: (key) =>
        ({
          requiredJustification: "Need more detail",
          unknownError: "Unexpected error",
          defaultSuccess: "Queued",
          customerData: "Customer Data",
          customerFinancials: "Customer Financials",
          systemAdmin: "System Admin",
          reportingOverride: "Reporting Override",
        })[key] || key,
    });

    runtime.form.justification = "Yuksek onemli musteri kaydinda acil degisiklik gerekiyor.";
    await runtime.submitRequest();
    await nextTick();

    expect(runtime.requestCountLabel.value).toBe("1");
    expect(runtime.submitResult.value).toBe("Request queued");
    expect(runtime.submitError.value).toBe("");

    runtime.validation.referenceDoctype = "AT Policy";
    await runtime.validateAccess();
    await nextTick();

    expect(runtime.validationOk.value).toBe(false);
    expect(runtime.validationMessage.value).toBe("No active grant");
    expect(frappeRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/method/acentem_takipte.acentem_takipte.api.break_glass.create_request",
      }),
    );
    expect(frappeRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/api/method/acentem_takipte.acentem_takipte.api.break_glass.validate_access",
      }),
    );
  });
});
