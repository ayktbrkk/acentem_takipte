import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const defaultSummaryPath = path.join(cwd, "test-results", "site-haritasi-summary.json");

function readIntegerFlag(name) {
  const arg = process.argv.find((entry) => entry.startsWith(`${name}=`));
  if (!arg) {
    return null;
  }

  const value = Number.parseInt(arg.slice(name.length + 1), 10);
  return Number.isFinite(value) ? value : null;
}

function resolveThreshold(cliFlag, envName) {
  const cliValue = readIntegerFlag(cliFlag);
  if (cliValue != null) {
    return cliValue;
  }

  const envValue = process.env[envName];
  if (!envValue) {
    return null;
  }

  const parsed = Number.parseInt(envValue, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

const summaryPath = process.argv[2] && !process.argv[2].startsWith("--")
  ? path.resolve(cwd, process.argv[2])
  : defaultSummaryPath;

if (!fs.existsSync(summaryPath)) {
  console.error(`SITE_HARITASI_GATE fail reason=missing_summary path=${summaryPath}`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const visited = summary.visitedPages ?? 0;
const appErrors = summary.appErrorCount ?? 0;
const externalErrors = summary.externalErrorCount ?? 0;
const byType = summary.externalErrorByType ?? {};

const refused = byType.err_connection_refused ?? 0;
const http404 = byType.http_404 ?? 0;
const http417 = byType.http_417 ?? 0;
const otherExternal = byType.other_external ?? 0;

const warnThreshold = resolveThreshold("--external-warn", "SITE_HARITASI_EXTERNAL_WARN");
const maxThreshold = resolveThreshold("--external-max", "SITE_HARITASI_EXTERNAL_MAX");

const kpiLine = [
  "SITE_HARITASI_KPI",
  `visited=${visited}`,
  `app_errors=${appErrors}`,
  `external_errors=${externalErrors}`,
  `refused=${refused}`,
  `http404=${http404}`,
  `http417=${http417}`,
  `other_external=${otherExternal}`,
].join(" ");

const kpiPath = path.join(path.dirname(summaryPath), "site-haritasi-kpi.txt");
fs.writeFileSync(kpiPath, `${kpiLine}\n`, "utf8");
console.log(kpiLine);

if (appErrors > 0) {
  console.error(`SITE_HARITASI_GATE fail reason=app_errors count=${appErrors}`);
  process.exit(1);
}

if (maxThreshold != null && externalErrors > maxThreshold) {
  console.error(`SITE_HARITASI_GATE fail reason=external_errors_threshold count=${externalErrors} threshold=${maxThreshold}`);
  process.exit(1);
}

if (warnThreshold != null && externalErrors > warnThreshold) {
  console.warn(`SITE_HARITASI_GATE warn reason=external_errors_threshold count=${externalErrors} threshold=${warnThreshold}`);
}

console.log("SITE_HARITASI_GATE pass");