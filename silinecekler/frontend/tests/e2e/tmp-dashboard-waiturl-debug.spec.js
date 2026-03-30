import { test, expect } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

test("dashboard tab wait for url", async ({ page }) => {
  await ensureAuthenticated(page);
  await page.goto("/at/");
  await page.waitForSelector('.at-tab-chip');
  await Promise.all([
    page.waitForURL(/tab=sales/ , { timeout: 3000 }).catch(() => null),
    page.locator('.at-tab-chip').filter({ hasText: 'Satış' }).click(),
  ]);
  await page.waitForTimeout(1000);
  console.log('URL_AFTER', page.url());
  console.log('ACTIVE_AFTER', await page.locator('.at-tab-chip-active').allTextContents());
  await expect(page.locator('.at-tab-chip-active')).toContainText('Satış');
});
