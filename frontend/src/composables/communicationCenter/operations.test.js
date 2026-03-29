import { describe, expect, it, vi, beforeEach } from "vitest";
import { ref } from "vue";

import { useCommunicationCenterOperations } from "./operations";

function makeResource(submitResult = {}) {
  return {
    submit: vi.fn(async () => submitResult),
  };
}

describe("useCommunicationCenterOperations", () => {
  let reloadSnapshot;
  let resources;
  const t = (key) => key;

  beforeEach(() => {
    reloadSnapshot = vi.fn(async () => {});
    resources = {
      runCycleResource: makeResource(),
      retryOutboxResource: makeResource(),
      sendDraftResource: makeResource(),
      auxMutationResource: makeResource(),
      segmentPreviewResource: makeResource({ rows: [{ name: "SEG-001" }] }),
      campaignRunResource: makeResource({ rows: [{ name: "CMP-001" }] }),
    };
  });

  it("runs dispatch cycle and reloads snapshot", async () => {
    const operations = useCommunicationCenterOperations({
      filters: { limit: 50, referenceName: "REF-001" },
      reloadSnapshot,
      resources,
      t,
    });

    await operations.runDispatchCycle();

    expect(resources.runCycleResource.submit).toHaveBeenCalledWith({ limit: 50, include_failed: 1 });
    expect(reloadSnapshot).toHaveBeenCalledTimes(1);
    expect(operations.dispatching.value).toBe(false);
    expect(operations.operationError.value).toBe("");
  });

  it("loads segment preview and campaign execution results", async () => {
    const operations = useCommunicationCenterOperations({
      filters: { limit: 50, referenceName: "REF-001" },
      reloadSnapshot,
      resources,
      t,
    });

    operations.segmentPreviewSegment.value = "SEG-001";
    operations.campaignRunSelection.value = "CMP-001";

    await operations.loadSegmentPreview();
    await operations.runCampaignExecution();

    expect(resources.segmentPreviewResource.submit).toHaveBeenCalledWith({
      segment_name: "SEG-001",
      limit: 20,
    });
    expect(resources.campaignRunResource.submit).toHaveBeenCalledWith({
      campaign_name: "CMP-001",
      limit: 200,
    });
    expect(operations.segmentPreviewPayload.value).toEqual({ rows: [{ name: "SEG-001" }] });
    expect(operations.campaignRunResult.value).toEqual({ rows: [{ name: "CMP-001" }] });
    expect(reloadSnapshot).toHaveBeenCalledTimes(1);
  });
});
