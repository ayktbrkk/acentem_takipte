import { expect, test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

const ROUTES = [
  { key: "accounting-entries", path: "/at/accounting-entries" },
  { key: "reconciliation-items", path: "/at/reconciliation-items" },
  { key: "access-logs", path: "/at/access-logs" },
  { key: "commissions", path: "/at/commissions" },
];

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 900 },
  { width: 375, height: 812 },
];

// Raw translation keys / technical enums that must never render verbatim.
const FORBIDDEN_TEXTS = [
  "importResultLockedWarning",
  "importResultSkippedLocked",
  "skipped_locked_label",
  "statement_import_locked_warning",
  "MismatchedDuplicate", // raw match status enum
];

test.describe("release audit route matrix", () => {
  for (const route of ROUTES) {
    for (const viewport of VIEWPORTS) {
      test(`${route.key} @ ${viewport.width}x${viewport.height}`, async ({ page }) => {
        test.setTimeout(120000);
        await ensureAuthenticated(page);
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        const consoleErrors = [];
        const pageErrors = [];
        const failedRequests = [];
        page.on("console", (msg) => {
          if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
        });
        page.on("pageerror", (err) => pageErrors.push(String(err).slice(0, 300)));
        page.on("requestfailed", (req) => {
          if (["xhr", "fetch"].includes(req.resourceType())) {
            failedRequests.push(`${req.resourceType()} ${req.url().slice(-80)}`);
          }
        });

        await page.goto(route.path, { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(new RegExp(`${route.path}(\\?|/|$)`), { timeout: 30000 });
        await expect(page.locator("#app, .page-shell, .at-shell-main").first()).toBeVisible({
          timeout: 30000,
        });
        await page.waitForTimeout(1500);

        const bodyText = await page.locator("body").innerText();
        for (const forbidden of FORBIDDEN_TEXTS) {
          expect(bodyText, `raw key ${forbidden} visible`).not.toContain(forbidden);
        }

        // No horizontal overflow beyond a small tolerance for scrollbars.
        const overflow = await page.evaluate(() => {
          const el = document.scrollingElement || document.documentElement;
          return el.scrollWidth - el.clientWidth;
        });
        expect(overflow, `horizontal overflow ${overflow}px`).toBeLessThanOrEqual(4);

        const criticalFailures = failedRequests.filter(
          (f) => !/favicon|\.png|\.svg|\.woff2?|undefined/.test(f)
        );
        expect(criticalFailures, `critical request failures`).toEqual([]);
        expect(consoleErrors, `console errors`).toEqual([]);
        expect(pageErrors, `page errors`).toEqual([]);
      });
    }
  }
});
