import { describe, expect, it } from "vitest";

import { maskIdentifier, maskPhone, maskTaxId } from "./atMasks";

describe("atMasks", () => {
  it("masks tax ids like backend mask_tax_id", () => {
    expect(maskTaxId("29723411122")).toBe("29*******22");
    expect(maskTaxId("")).toBe("");
    expect(maskTaxId("1234")).toBe("****");
  });

  it("masks phone values like backend mask_phone", () => {
    expect(maskPhone("05551234567")).toBe("055******67");
    expect(maskPhone("")).toBe("");
  });

  it("masks sensitive identifiers keeping only a short prefix/suffix", () => {
    expect(maskIdentifier("35DEF456")).toBe("35****56");
    expect(maskIdentifier("TCKN-202020002")).toBe("TC**********02");
    expect(maskIdentifier("")).toBe("");
    expect(maskIdentifier("abc")).toBe("***");
  });
});
