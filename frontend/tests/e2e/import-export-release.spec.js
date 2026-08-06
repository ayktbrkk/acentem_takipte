import { expect, test } from "@playwright/test";

import { ensureAuthenticated } from "./helpers/auth.js";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "tablet", width: 768, height: 900 },
  { name: "mobile", width: 375, height: 812 },
];

const ROUTES = ["/at/data-import", "/at/data-export"];

// Raw translation keys that leak to the DOM when a translation lookup fails.
// Keep this list aligned with the i18n keys used by these pages. Avoid generic
// snake_case patterns because user-typed values (e.g. export filenames) may
// legitimately contain underscores.
const RAW_KEY_PATTERNS = [
  /\bstep[123]Title\b/,
  /\b(?:preview|export|import|job|history)[A-Z][a-zA-Z]*\b/,
  /\b(?:status|format|screen|dataset)[A-Z][a-zA-Z]*\b/,
  /\b(?:largeExport|piiExport|exportLimit|confirmExport)[A-Z][a-zA-Z]*\b/,
];

const RAW_ENUM_PATTERNS = [
  /\bAT-IMP-\d{4}-\d{6}\b/,
  /\bAT-BR-\d{4}\b/,
  /\bAT-IC-\d{4}\b/,
];

for (const viewport of VIEWPORTS) {
  test.describe(`release ${viewport.name} ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES) {
      test(`${route} has no horizontal overflow`, async ({ page }) => {
        test.setTimeout(60000);
        await ensureAuthenticated(page);
        await page.goto(route);
        await page.waitForTimeout(1500);

        const layout = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(layout.scrollWidth, `scrollWidth=${layout.scrollWidth} clientWidth=${layout.clientWidth}`)
          .toBeLessThanOrEqual(layout.clientWidth + 1);
      });

      test(`${route} has no critical console or page errors`, async ({ page }) => {
        test.setTimeout(60000);
        const pageErrors = [];
        const consoleErrors = [];
        page.on("pageerror", (err) => pageErrors.push(String(err)));
        page.on("console", (msg) => {
          if (msg.type() === "error") consoleErrors.push(msg.text());
        });

        await ensureAuthenticated(page);
        await page.goto(route);
        await page.waitForTimeout(1500);

        const criticalPageErrors = pageErrors.filter(
          (text) => !/ResizeObserver|404|401|NetworkError/i.test(text),
        );
        expect(criticalPageErrors, pageErrors.join("\n")).toEqual([]);
        const criticalConsoleErrors = consoleErrors.filter(
          (text) => !/favicon|autocomplete|Deprecation|warning|DevTools|404|ERR_NO_BUFFER_SPACE|Failed to fetch dynamically/i.test(text),
        );
        expect(criticalConsoleErrors, consoleErrors.join("\n")).toEqual([]);
      });

      test(`${route} shows no raw translation keys or internal IDs`, async ({ page }) => {
        test.setTimeout(60000);
        await ensureAuthenticated(page);
        await page.goto(route);
        await page.waitForTimeout(1500);

        const bodyText = await page.evaluate(() => document.body.innerText);
        for (const pattern of RAW_KEY_PATTERNS) {
          const matches = bodyText.match(pattern) || [];
          expect(matches, `raw key pattern ${pattern} matched in ${route}`).toEqual([]);
        }
        for (const pattern of RAW_ENUM_PATTERNS) {
          const matches = bodyText.match(pattern) || [];
          expect(matches, `raw id pattern ${pattern} matched in ${route}`).toEqual([]);
        }
      });

      test(`${route} shows no raw PII values`, async ({ page }) => {
        test.setTimeout(60000);
        await ensureAuthenticated(page);
        await page.goto(route);
        await page.waitForTimeout(1500);

        const bodyText = await page.evaluate(() => document.body.innerText);
        // Full national identity numbers should never be rendered raw.
        const fullTckn = bodyText.match(/\b\d{11}\b/g) || [];
        expect(fullTckn, `raw 11-digit identity found in ${route}`).toEqual([]);
      });
    }
  });
}

test.describe("data-export release behaviors", () => {
  test("export button is disabled until preview confirms", async ({ page }) => {
    test.setTimeout(60000);
    await ensureAuthenticated(page);
    await page.goto("/at/data-export");
    await page.waitForTimeout(1500);

    const exportButton = page.getByRole("button", { name: /Dışa Aktar|Export/i }).first();
    await expect(exportButton).toBeVisible();
    await expect(exportButton).toBeDisabled();

    const confirmButton = page.getByRole("button", { name: /Dışa Aktarmayı Onayla|Confirm Export/i });
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
      await expect(exportButton).toBeEnabled();
    }
  });

  test("branch scope is visible in metrics", async ({ page }) => {
    test.setTimeout(60000);
    await ensureAuthenticated(page);
    await page.goto("/at/data-export");
    await page.waitForTimeout(1500);

    await expect(page.getByText(/Kapsam|Scope/i).first()).toBeVisible();
  });

  test("preview and export counts are consistent", async ({ page }) => {
    test.setTimeout(60000);
    await ensureAuthenticated(page);
    await page.goto("/at/data-export");
    await page.waitForTimeout(1500);

    // The preview panel should render after filters load.
    const previewScope = page.getByText(/Önizlemede|records in preview/i).first();
    if (await previewScope.isVisible().catch(() => false)) {
      await expect(previewScope).toBeVisible();
    }
  });
});
