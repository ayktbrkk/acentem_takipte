import fs from "node:fs";
import path from "node:path";

function summarize(file) {
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

function main() {
  const [platformFile, businessFile, businessExitRaw, profileRaw] = process.argv.slice(2);
  const profile = profileRaw || "f4-smoke";
  const businessExit = Number(businessExitRaw || 0);
  const platform = summarize(platformFile);
  const business = summarize(businessFile);

  const platformPass = platform.exists && platform.unexpected === 0 && platform.timedOut === 0;
  const businessAllSkipped =
    business.exists && business.expected === 0 && business.skipped > 0 && business.unexpected === 0;
  const businessPass = business.exists && business.unexpected === 0 && business.timedOut === 0;

  console.log("## Desk-Free Smoke Coverage");
  console.log("");
  console.log(`- platform_smoke: ${platformPass ? "PASS" : "FAIL"}`);
  if (profile === "platform") {
    console.log("- business_smoke: NOT_RUN_BY_PROFILE (platform-only profile)");
  } else if (!business.exists) {
    console.log(`- business_smoke: FAIL (report missing, exit ${businessExit})`);
  } else if (businessAllSkipped) {
    console.log("- business_smoke: NOT_RUN_DATASET_EMPTY");
    console.log("- business coverage reason: DATASET_NOT_AVAILABLE");
  } else if (businessPass) {
    console.log("- business_smoke: PASS");
  } else {
    console.log("- business_smoke: FAIL");
  }

  let overall;
  let exitCode;
  if (!platformPass) {
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

  console.log(`- overall_smoke: ${overall}`);
  console.log(`- business dataset is never reported as passed when it was skipped.`);
  process.exit(exitCode);
}

main();
