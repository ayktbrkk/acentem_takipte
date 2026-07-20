import { describe, expect, it, vi } from "vitest";

vi.mock("frappe-ui", () => ({
  createResource: () => ({
    data: null,
    loading: false,
    error: null,
    reload: vi.fn(),
    submit: vi.fn(),
    setData: vi.fn(),
  }),
}));

import {
  canConvertLead,
  leadAgeDays,
  leadConversionMissingFields,
  leadConversionState,
  leadStaleLabel,
  leadStaleState,
  mapLeadStatusTone,
  mapLeadStaleTone,
  parseLeadActionError,
} from "./useLeadDetailRuntime";

describe("useLeadDetailRuntime helpers", () => {
  it("detects stale state bands", () => {
    const now = new Date().toISOString();
    expect(leadAgeDays(now)).toBe(0);
    expect(leadStaleState({ modified: now })).toBe("Fresh");
  });

  it("labels stale states by locale", () => {
    expect(leadStaleLabel("Fresh", "tr")).toBe("Güncel");
    expect(leadStaleLabel("FollowUp", "en")).toBe("Follow Up");
  });

  it("identifies convertible leads", () => {
    expect(
      canConvertLead({
        status: "Open",
        customer: "C-1",
        sales_entity: "SE-1",
        insurance_company: "IC-1",
        branch: "B-1",
        estimated_gross_premium: 1200,
      })
    ).toBe(true);
    expect(canConvertLead({ status: "Closed", customer: "C-1" })).toBe(false);
  });

  it("derives conversion state", () => {
    expect(leadConversionState({ converted_policy: "POL-1" })).toBe("Policy");
    expect(leadConversionState({ converted_offer: "OFF-1" })).toBe("Offer");
    expect(leadConversionState({ status: "Closed" })).toBe("Closed");
  });

  it("lists missing conversion fields", () => {
    expect(
      leadConversionMissingFields(
        {
          customer: "",
          sales_entity: "",
          insurance_company: "",
          branch: "",
          estimated_gross_premium: 0,
        },
        (key) => key
      )
    ).toContain("customer");
  });

  it("maps status tones", () => {
    expect(mapLeadStatusTone("Open")).toBe("waiting");
    expect(mapLeadStatusTone("Converted")).toBe("active");
    expect(mapLeadStaleTone("Stale")).toBe("waiting");
  });

  it("parses action errors", () => {
    expect(parseLeadActionError({ message: "boom" })).toBe("boom");
    expect(parseLeadActionError({ response: { message: "<p>broken</p>" } })).toBe("broken");
  });
});
