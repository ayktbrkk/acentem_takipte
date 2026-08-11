import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function summarizeReport(file) {
  const fullPath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(fullPath)) return { exists: false };
  const report = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  const stats = report?.stats || {};
  const expected = stats.expected || 0;
  const unexpected = stats.unexpected || 0;
  const skipped = stats.skipped || 0;
  const flaky = stats.flaky || 0;
  const timedOut = stats.timedOut || 0;
  return {
    exists: true,
    expected,
    unexpected,
    skipped,
    flaky,
    timedOut,
    total: expected + unexpected + skipped + flaky + timedOut,
  };
}

export function classify({ platformFile, businessFile, businessExit = 0, profile = "f4-smoke" }) {
  const platform = summarizeReport(platformFile);
  const business = summarizeReport(businessFile);

  const platformMissing = !platform.exists;
  const platformPass = !platformMissing && platform.unexpected === 0 && platform.timedOut === 0;

  const businessAllSkipped =
    business.exists && business.expected === 0 && business.skipped > 0 && business.unexpected === 0;
  const businessPass = business.exists && business.unexpected === 0 && business.timedOut === 0;

  const lines = [];
  lines.push("## Desk-Free Smoke Coverage");
  lines.push("");
  lines.push(`- platform_smoke: ${platformMissing ? "REPORT_MISSING" : platformPass ? "PASS" : "FAIL"}`);
  if (profile === "platform") {
    lines.push("- business_smoke: NOT_RUN_BY_PROFILE (platform-only profile)");
  } else if (!business.exists) {
    lines.push(`- business_smoke: REPORT_MISSING (report missing, exit ${businessExit})`);
  } else if (businessAllSkipped) {
    lines.push("- business_smoke: NOT_RUN_DATASET_EMPTY");
    lines.push("- business coverage reason: DATASET_NOT_AVAILABLE");
  } else if (businessPass) {
    lines.push("- business_smoke: PASS");
  } else {
    lines.push("- business_smoke: FAIL");
  }

  let overall;
  let exitCode;
  if (platformMissing || !platformPass) {
    overall = "FAIL";
    exitCode = 1;
  } else if (profile === "platform") {
    overall = "PASS";
    exitCode = 0;
  } else if (!business.exists || (!businessPass && !businessAllSkipped)) {
    overall = "FAIL";
    exitCode = 1;
  } else if (businessAllSkipped) {
    overall = "PASS_WITH_DATA_COVERAGE_GAP";
    exitCode = 0;
  } else {
    overall = "PASS";
    exitCode = 0;
  }

  lines.push(`- overall_smoke: ${overall}`);
  lines.push("- business dataset is never reported as passed when it was skipped.");
  return { lines, overall, exitCode };
}

export function main() {
  const [platformFile, businessFile, businessExitRaw, profileRaw] = process.argv.slice(2);
  const { lines, exitCode } = classify({
    platformFile,
    businessFile,
    businessExit: Number(businessExitRaw || 0),
    profile: profileRaw || "f4-smoke",
  });
  for (const line of lines) console.log(line);
  process.exit(exitCode);
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  main();
}
