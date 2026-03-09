import { describe, expect, it } from "vitest";

import { OFFICE_BRANCH_QUERY_KEY } from "./index";

describe("router branch query contract", () => {
  it("uses office_branch as the active branch query key", () => {
    expect(OFFICE_BRANCH_QUERY_KEY).toBe("office_branch");
  });
});
