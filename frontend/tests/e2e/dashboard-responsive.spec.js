import { expect, test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 768, height: 900 },
  { width: 375, height: 812 },
];

test.describe("Dashboard responsive + AT Document route smoke", () => {
  for (const viewport of VIEWPORTS) {
    test(`dashboard renders without horizontal overflow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      test.setTimeout(120000);
      await page.setViewportSize(viewport);
      await ensureAuthenticated(page);

      const consoleErrors = [];
      const pageErrors = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
      });
      page.on("pageerror", (err) => pageErrors.push(String(err).slice(0, 300)));

      await page.goto("/at/", { waitUntil: "commit" });
      await page.waitForTimeout(2500);

      // No horizontal overflow on the document.
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.scrollWidth, `scrollWidth ${overflow.scrollWidth} vs clientWidth ${overflow.clientWidth}`).toBeLessThanOrEqual(overflow.clientWidth);

      // Dashboard hero heading visible.
      await expect(page.getByRole("heading", { name: /Kontrol Merkezi|Dashboard|Pano/i }).first()).toBeVisible({ timeout: 15000 });

      // Tab navigation reachable.
      await expect(page.getByRole("tab", { name: /Operasyon|Operations/i }).first()).toBeVisible({ timeout: 15000 });

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }

  test("legacy /at/at-documents redirects to /at/documents preserving query", async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await ensureAuthenticated(page);

    await page.goto("/at/at-documents?reference_doctype=AT+Policy&page=2", { waitUntil: "commit" });
    await page.waitForURL(/\/at\/documents/, { timeout: 30000 });
    await page.waitForTimeout(1000);

    expect(page.url()).toContain("/at/documents");
    expect(page.url()).not.toContain("/at/at-documents");
    expect(page.url()).toContain("reference_doctype=AT");
    expect(page.url()).toContain("Policy");
    expect(page.url()).toContain("page=2");
  });

  test("legacy /at/at-documents/upload redirects to /at/documents/upload", async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await ensureAuthenticated(page);

    await page.goto("/at/at-documents/upload", { waitUntil: "commit" });
    await page.waitForURL(/\/at\/documents\/upload/, { timeout: 30000 });
    await page.waitForTimeout(1000);

    expect(page.url()).toContain("/at/documents/upload");
  });

  test("new /at/documents route opens directly and /at/files stays distinct", async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await ensureAuthenticated(page);

    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
    });
    page.on("pageerror", (err) => pageErrors.push(String(err).slice(0, 300)));

    await page.goto("/at/documents", { waitUntil: "commit" });
    await page.waitForTimeout(2500);
    expect(page.url()).toContain("/at/documents");
    // No redirect back to legacy path.
    expect(page.url()).not.toContain("/at/at-documents");
    await expect(page.getByRole("heading", { name: /Doküman|Document/i }).first()).toBeVisible({ timeout: 15000 });

    await page.goto("/at/files", { waitUntil: "commit" });
    await page.waitForTimeout(2500);
    expect(page.url()).toContain("/at/files");
    await expect(page.getByRole("heading", { name: /Dosya|File/i }).first()).toBeVisible({ timeout: 15000 });

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test("dashboard tabs switch and hero CTA visible on mobile", async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 375, height: 812 });
    await ensureAuthenticated(page);

    await page.goto("/at/", { waitUntil: "commit" });
    await page.waitForTimeout(2500);

    // Sales tab reachable and activates.
    const salesTab = page.getByRole("tab", { name: /Satış|Sales/i }).first();
    await salesTab.click();
    await page.waitForTimeout(1200);
    await expect(page.getByRole("heading", { name: /Satış Panosu|Sales Dashboard/i }).first()).toBeVisible({ timeout: 15000 });

    // Back to operations.
    await page.getByRole("tab", { name: /Operasyon|Operations/i }).first().click();
    await page.waitForTimeout(800);

    // Hero primary CTA "Yeni Fırsat Ekle" fully inside viewport.
    const cta = page.getByRole("button", { name: /Yeni Fırsat Ekle|Add New Lead/i }).first();
    await expect(cta).toBeVisible({ timeout: 15000 });
    const box = await cta.boundingBox();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(375);
  });
});
