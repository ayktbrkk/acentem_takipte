import { test } from "@playwright/test";
import { ensureAuthenticated } from "./helpers/auth.js";

test("dashboard tab click debug live", async ({ page }) => {
  await ensureAuthenticated(page);
  await page.goto("/at/");
  await page.waitForSelector('.at-tab-chip');
  const chipsBefore = await page.locator('.at-tab-chip').allTextContents();
  console.log('CHIPS_BEFORE', JSON.stringify(chipsBefore));
  await page.locator('.at-tab-chip').filter({ hasText: 'Satış' }).click();
  await page.waitForTimeout(1000);
  const chipsAfter = await page.locator('.at-tab-chip').allTextContents();
  const url = page.url();
  const active = await page.locator('.at-tab-chip-active').allTextContents();
  console.log('CHIPS_AFTER', JSON.stringify(chipsAfter));
  console.log('ACTIVE', JSON.stringify(active));
  console.log('URL', url);
});
