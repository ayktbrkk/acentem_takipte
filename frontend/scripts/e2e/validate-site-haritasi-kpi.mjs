import fs from "node:fs";
import path from "node:path";

function parseIntegerEnv(name) {
  const value = process.env[name];
  if (value == null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIntegerArg(args, name) {
  const prefix = `--${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  if (!found) return null;
  const value = found.slice(prefix.length);
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSummaryPathArg(args) {
  const firstPositional = args.find((arg) => !arg.startsWith("--"));
  return firstPositional || "test-results/site-haritasi-summary.json";
}

function main() {
  const args = process.argv.slice(2);
  const summaryPathArg = parseSummaryPathArg(args);
  const summaryPath = path.resolve(process.cwd(), summaryPathArg);

  if (!fs.existsSync(summaryPath)) {
    console.error(`SITE_HARITASI_GATE fail reason=missing_summary file=${summaryPathArg}`);
    process.exit(1);
  }

  let summary;
  try {
    summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  } catch (error) {
    console.error(`SITE_HARITASI_GATE fail reason=invalid_summary_json file=${summaryPathArg}`);
    console.error(String(error));
    process.exit(1);
  }

  const visited = Number(summary?.visitedPages || 0);
  const appErrors = Number(summary?.appErrorCount || 0);
  const externalErrors = Number(summary?.externalErrorCount || 0);
  const byType = summary?.externalErrorByType || {};
  const refused = Number(byType?.err_connection_refused || 0);
  const http404 = Number(byType?.http_404 || 0);
  const http417 = Number(byType?.http_417 || 0);
  const otherExternal = Number(byType?.other_external || 0);

  const kpiLine =
    `SITE_HARITASI_KPI visited=${visited} app_errors=${appErrors} external_errors=${externalErrors} ` +
    `refused=${refused} http404=${http404} http417=${http417} other_external=${otherExternal}`;

  console.log(kpiLine);

  if (appErrors > 0) {
    console.error(`SITE_HARITASI_GATE fail reason=app_errors count=${appErrors}`);
    process.exit(1);
  }

  const externalMax = parseIntegerArg(args, "external-max") ?? parseIntegerEnv("SITE_HARITASI_EXTERNAL_MAX");
  if (externalMax != null && externalErrors > externalMax) {
    console.error(
      `SITE_HARITASI_GATE fail reason=external_errors_threshold count=${externalErrors} threshold=${externalMax}`
    );
    process.exit(1);
  }

  const externalWarn = parseIntegerArg(args, "external-warn") ?? parseIntegerEnv("SITE_HARITASI_EXTERNAL_WARN");
  if (externalWarn != null && externalErrors > externalWarn) {
    console.warn(
      `SITE_HARITASI_GATE warn reason=external_errors_threshold count=${externalErrors} threshold=${externalWarn}`
    );
  }

  console.log("SITE_HARITASI_GATE pass");
}

main();
