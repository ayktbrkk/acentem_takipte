import { describe, expect, it, vi, beforeEach } from "vitest";

const createResource = vi.fn((config) => ({
  ...config,
  reload: vi.fn(async () => ({})),
  submit: vi.fn(async () => ({})),
}));

vi.mock("frappe-ui", () => ({
  createResource: (...args) => createResource(...args),
}));

import { useCommunicationCenterResources } from "./resources";

describe("useCommunicationCenterResources", () => {
  beforeEach(() => {
    createResource.mockClear();
  });

  it("creates the expected resources with branch-scoped quick filters", () => {
    const branchStore = { requestBranch: "IST" };
    const filters = {
      customer: "CUST-001",
      status: "Queued",
      channel: "SMS",
      referenceDoctype: "AT Policy",
      referenceName: "POL-001",
      limit: 25,
    };

    const resources = useCommunicationCenterResources({ branchStore, filters });

    expect(createResource).toHaveBeenCalledTimes(13);
    expect(resources.snapshotResource.params).toMatchObject({
      customer: "CUST-001",
      office_branch: "IST",
      limit: 25,
    });
    expect(resources.communicationQuickCustomerResource.params.filters).toEqual({ office_branch: "IST" });
    expect(resources.communicationQuickPolicyResource.params.filters).toEqual({ office_branch: "IST" });
    expect(resources.communicationQuickCampaignResource.params.limit_page_length).toBe(500);
  });
});
