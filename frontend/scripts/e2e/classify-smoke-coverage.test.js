import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { classify } from "./classify-smoke-coverage.mjs";

function writeTempReport(stats) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "smoke-classify-"));
  const file = path.join(dir, "report.json");
  fs.writeFileSync(file, JSON.stringify({ stats }));
  return file;
}

function passStats(expected = 8) {
  return { expected, unexpected: 0, skipped: 0, flaky: 0, timedOut: 0 };
}

function skippedStats(skipped = 8) {
  return { expected: 0, unexpected: 0, skipped, flaky: 0, timedOut: 0 };
}

function failStats(unexpected = 1) {
  return { expected: 7, unexpected, skipped: 0, flaky: 0, timedOut: 0 };
}

describe("classify-smoke-coverage", () => {
  it("platform pass + business pass => overall PASS, exit 0", () => {
    const result = classify({
      platformFile: writeTempReport(passStats()),
      businessFile: writeTempReport(passStats()),
      businessExit: 0,
      profile: "f4-smoke",
    });
    expect(result.overall).toBe("PASS");
    expect(result.exitCode).toBe(0);
  });

  it("platform pass + business all skipped => PASS_WITH_DATA_COVERAGE_GAP, exit 0", () => {
    const result = classify({
      platformFile: writeTempReport(passStats()),
      businessFile: writeTempReport(skippedStats()),
      businessExit: 0,
      profile: "f4-smoke",
    });
    expect(result.lines.join("\n")).toContain("business_smoke: NOT_RUN_DATASET_EMPTY");
    expect(result.overall).toBe("PASS_WITH_DATA_COVERAGE_GAP");
    expect(result.exitCode).toBe(0);
  });

  it("platform pass + business fail => overall FAIL, exit 1", () => {
    const result = classify({
      platformFile: writeTempReport(passStats()),
      businessFile: writeTempReport(failStats()),
      businessExit: 1,
      profile: "f4-smoke",
    });
    expect(result.lines.join("\n")).toContain("business_smoke: FAIL");
    expect(result.overall).toBe("FAIL");
    expect(result.exitCode).toBe(1);
  });

  it("platform fail => overall FAIL, exit 1", () => {
    const result = classify({
      platformFile: writeTempReport(failStats()),
      businessFile: writeTempReport(passStats()),
      businessExit: 0,
      profile: "f4-smoke",
    });
    expect(result.lines.join("\n")).toContain("platform_smoke: FAIL");
    expect(result.overall).toBe("FAIL");
    expect(result.exitCode).toBe(1);
  });

  it("platform-only profile => overall PASS, exit 0 even without business report", () => {
    const result = classify({
      platformFile: writeTempReport(passStats()),
      businessFile: "/nonexistent/business/report.json",
      businessExit: 0,
      profile: "platform",
    });
    expect(result.lines.join("\n")).toContain("business_smoke: NOT_RUN_BY_PROFILE");
    expect(result.overall).toBe("PASS");
    expect(result.exitCode).toBe(0);
  });

  it("platform report missing => REPORT_MISSING, overall FAIL, exit 1", () => {
    const result = classify({
      platformFile: "/nonexistent/platform/report.json",
      businessFile: writeTempReport(passStats()),
      businessExit: 0,
      profile: "f4-smoke",
    });
    expect(result.lines.join("\n")).toContain("platform_smoke: REPORT_MISSING");
    expect(result.overall).toBe("FAIL");
    expect(result.exitCode).toBe(1);
  });

  it("business report missing => REPORT_MISSING, overall FAIL, exit 1", () => {
    const result = classify({
      platformFile: writeTempReport(passStats()),
      businessFile: "/nonexistent/business/report.json",
      businessExit: 0,
      profile: "f4-smoke",
    });
    expect(result.lines.join("\n")).toContain("business_smoke: REPORT_MISSING");
    expect(result.overall).toBe("FAIL");
    expect(result.exitCode).toBe(1);
  });
});
