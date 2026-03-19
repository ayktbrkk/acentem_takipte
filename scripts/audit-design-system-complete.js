#!/usr/bin/env node
/**
 * audit-design-system-complete.js
 * Acentem Takipte — Design System Migration Audit Script
 *
 * Usage: node scripts/audit-design-system-complete.js
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

const PAGES_DIR = resolve("frontend/src/pages");
const COMPONENTS_DIR = resolve("frontend/src/components/ui");

const REQUIRED_FOR_LIST = ["page-shell", "detail-topbar", "mini-metric", "FilterBar", "ListTable"];
const REQUIRED_FOR_DETAIL = ["page-shell", "detail-topbar"];
const DEPRECATED = ["DocHeaderCard", "DetailActionRow", "PageToolbar", "WorkbenchFilterToolbar", "DataTableShell"];

const LIST_PAGES = [
  "PolicyList.vue",
  "CustomerList.vue",
  "LeadList.vue",
  "ClaimsBoard.vue",
  "OfferBoard.vue",
  "PaymentsBoard.vue",
  "RenewalsBoard.vue",
  "Reports.vue",
  "ReconciliationWorkbench.vue",
  "CommunicationCenter.vue",
  "AuxWorkbench.vue",
];

const DETAIL_PAGES = [
  "PolicyDetail.vue",
  "CustomerDetail.vue",
  "LeadDetail.vue",
  "ClaimDetail.vue",
  "OfferDetail.vue",
  "PaymentDetail.vue",
  "RenewalTaskDetail.vue",
  "AuxRecordDetail.vue",
  "ImportData.vue",
  "ExportData.vue",
  "Dashboard.vue",
];

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

const c = (color, text) => `${COLORS[color]}${text}${COLORS.reset}`;

function readPage(filename) {
  try {
    return readFileSync(join(PAGES_DIR, filename), "utf8");
  } catch {
    return null;
  }
}

function check(content, token) {
  return content.includes(token);
}

function auditPage(filename, isListPage) {
  const content = readPage(filename);
  if (!content) {
    return { filename, status: "missing", issues: ["File not found"] };
  }

  const required = isListPage ? REQUIRED_FOR_LIST : REQUIRED_FOR_DETAIL;
  const missing = required.filter((token) => !check(content, token));
  const deprecated = DEPRECATED.filter((token) => check(content, token));

  const issues = [
    ...missing.map((t) => `Missing: ${t}`),
    ...deprecated.map((t) => `Deprecated: ${t}`),
  ];

  const status = issues.length === 0 ? "ok" : deprecated.length > 0 ? "critical" : "partial";
  return { filename, status, issues, missing, deprecated };
}

function auditUIComponents() {
  const expected = ["FilterBar.vue", "ListTable.vue", "StatusBadge.vue", "MetricCard.vue"];
  const found = readdirSync(COMPONENTS_DIR).filter((f) => f.endsWith(".vue"));
  const missing = expected.filter((f) => !found.includes(f));
  return { found, missing };
}

// ─── Run Audit ───────────────────────────────────────────────────────────────

console.log(c("bold", "\n🔍 Acentem Takipte — Design System Audit\n"));
console.log(c("dim", `Pages dir : ${PAGES_DIR}`));
console.log(c("dim", `Components: ${COMPONENTS_DIR}\n`));

let totalOk = 0;
let totalPartial = 0;
let totalCritical = 0;
let totalMissing = 0;

function printSection(label, pages, isListPage) {
  console.log(c("cyan", `\n── ${label} ──────────────────────────────`));
  for (const filename of pages) {
    const { status, issues } = auditPage(filename, isListPage);
    const icon = status === "ok" ? "✅" : status === "critical" ? "🔴" : status === "missing" ? "⬜" : "⚠️";
    const name = filename.padEnd(32);
    const statusText =
      status === "ok"
        ? c("green", "PASS")
        : status === "critical"
          ? c("red", "CRITICAL")
          : status === "missing"
            ? c("red", "FILE NOT FOUND")
            : c("yellow", "PARTIAL");

    console.log(`  ${icon} ${name} ${statusText}`);
    if (issues.length) {
      issues.forEach((i) => console.log(c("dim", `       → ${i}`)));
    }

    if (status === "ok") totalOk++;
    else if (status === "critical") totalCritical++;
    else if (status === "missing") totalMissing++;
    else totalPartial++;
  }
}

printSection("LIST PAGES", LIST_PAGES, true);
printSection("DETAIL PAGES", DETAIL_PAGES, false);

// UI Components check
console.log(c("cyan", "\n── UI Components ────────────────────────────"));
const { found, missing: missingComponents } = auditUIComponents();
if (missingComponents.length === 0) {
  console.log(c("green", "  ✅ All required UI components present"));
} else {
  missingComponents.forEach((f) => console.log(c("red", `  ❌ Missing: ${f}`)));
}

// Summary
const total = totalOk + totalPartial + totalCritical + totalMissing;
console.log(c("bold", "\n── SUMMARY ──────────────────────────────────"));
console.log(`  Total pages  : ${total}`);
console.log(c("green", `  ✅ Pass      : ${totalOk}`));
console.log(c("yellow", `  ⚠️  Partial   : ${totalPartial}`));
console.log(c("red", `  🔴 Critical  : ${totalCritical}`));
console.log(c("red", `  ⬜ Not found  : ${totalMissing}`));

const score = Math.round((totalOk / total) * 100);
const scoreColor = score === 100 ? "green" : score >= 80 ? "yellow" : "red";
console.log(c("bold", `\n  Score: ${c(scoreColor, `${score}%`)}${COLORS.bold} (${totalOk}/${total} pages fully migrated)\n`));

if (totalCritical > 0 || totalPartial > 0) {
  process.exit(1);
}
