import fs from "node:fs";
import path from "node:path";

function walkSuites(suites = [], acc = { tests: 0, passed: 0, failed: 0, skipped: 0, flaky: 0, timedOut: 0 }) {
  for (const suite of suites) {
    if (Array.isArray(suite.specs)) {
      for (const spec of suite.specs) {
        for (const test of spec.tests || []) {
          acc.tests += 1;
          const results = test.results || [];
          const statuses = new Set(results.map((r) => r.status).filter(Boolean));
          if (statuses.has("failed")) acc.failed += 1;
          else if (statuses.has("timedOut")) acc.timedOut += 1;
          else if (statuses.has("skipped")) acc.skipped += 1;
          else if (statuses.has("flaky")) acc.flaky += 1;
          else if (statuses.has("passed")) acc.passed += 1;
        }
      }
    }
    if (Array.isArray(suite.suites)) {
      walkSuites(suite.suites, acc);
    }
  }
  return acc;
}

function getDurationMs(report) {
  if (report?.stats?.duration != null) return report.stats.duration;
  const started = report?.stats?.startTime ? Date.parse(report.stats.startTime) : NaN;
  const ended = report?.stats?.endTime ? Date.parse(report.stats.endTime) : NaN;
  if (!Number.isNaN(started) && !Number.isNaN(ended)) return Math.max(0, ended - started);
  return null;
}

function formatDuration(ms) {
  if (ms == null) return "n/a";
  if (ms < 1000) return `${ms} ms`;
  const sec = Math.round(ms / 100) / 10;
  return `${sec}s`;
}

function main() {
  const file = process.argv[2] || "test-results/f4-report.json";
  const fullPath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(fullPath)) {
    console.log(`- Playwright JSON report not found: \`${file}\``);
    process.exit(0);
  }

  const raw = fs.readFileSync(fullPath, "utf8");
  const report = JSON.parse(raw);

  let counts = {
    tests: report?.stats?.expected ?? 0,
    passed: report?.stats?.expected ?? 0,
    failed: report?.stats?.unexpected ?? 0,
    skipped: report?.stats?.skipped ?? 0,
    flaky: report?.stats?.flaky ?? 0,
    timedOut: report?.stats?.timedOut ?? 0,
  };

  // Fallback if reporter shape differs.
  if (!report?.stats || (!counts.tests && Array.isArray(report?.suites))) {
    counts = walkSuites(report?.suites || []);
  } else {
    counts.tests =
      (report.stats.expected || 0) +
      (report.stats.unexpected || 0) +
      (report.stats.skipped || 0) +
      (report.stats.flaky || 0) +
      (report.stats.timedOut || 0);
    counts.passed = report.stats.expected || 0;
    counts.failed = report.stats.unexpected || 0;
    counts.skipped = report.stats.skipped || 0;
    counts.flaky = report.stats.flaky || 0;
    counts.timedOut = report.stats.timedOut || 0;
  }

  const duration = formatDuration(getDurationMs(report));

  console.log("## Playwright Smoke Summary");
  console.log("");
  console.log(`- Tests: \`${counts.tests}\``);
  console.log(`- Passed: \`${counts.passed}\``);
  console.log(`- Failed: \`${counts.failed}\``);
  console.log(`- Flaky: \`${counts.flaky}\``);
  console.log(`- Skipped: \`${counts.skipped}\``);
  console.log(`- Timed out: \`${counts.timedOut}\``);
  console.log(`- Duration: \`${duration}\``);
}

main();

